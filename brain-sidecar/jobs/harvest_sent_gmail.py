"""
Job: harvest_sent_gmail

Deterministic Gmail sent-mail harvest for the brain graph.

This deliberately does not use Anthropic, OpenAI, or Instructor. It pulls every
thread matching `in:sent after:<date>`, writes immutable provenance ledger events,
and creates conservative graph structure from headers plus body text.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import os
import re
import socket
import sys
import time
from datetime import datetime, timezone, timedelta
from email.utils import getaddresses, parsedate_to_datetime
from pathlib import Path
from collections import Counter, defaultdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

from db import execute, query
from ledger import find_or_create_entity, write_assertion, write_ledger_event

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")


SELF_EMAILS = {"dataweston@gmail.com", "yum@localeffortfood.com"}
SELF_NAME = "Weston Smith"
SOURCE = "gmail_sent_harvest"

PERSONAL_DOMAINS = {
    "gmail.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "hotmail.com",
    "outlook.com",
    "yahoo.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
}

NOISE_DOMAINS = {
    "intuit.com",
    "quickbooks.intuit.com",
    "turbotax.intuit.com",
    "google.com",
    "googlemail.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "amazon.com",
    "stripe.com",
    "paypal.com",
    "squarespace.com",
    "godaddy.com",
    "mailchimp.com",
    "constantcontact.com",
    "klaviyo.com",
}

VENDOR_WORDS = {
    "invoice",
    "quote",
    "estimate",
    "supplier",
    "vendor",
    "wholesale",
    "delivery",
    "delivered",
    "order pickup",
    "purchase order",
    "payment due",
}

CUSTOMER_WORDS = {
    "catering",
    "wedding",
    "birthday",
    "dinner",
    "event",
    "meal",
    "menu",
    "pizza",
    "order",
    "subscription",
    "delivery",
    "guest",
    "headcount",
    "proposal",
}

OFFER_KEYWORDS = [
    ("Wedding Catering", ["wedding", "reception"]),
    ("Corporate Lunch", ["corporate", "office lunch", "team lunch"]),
    ("Private Dinner - Seated", ["private dinner", "seated dinner"]),
    ("Private Dinner - Buffet", ["buffet"]),
    ("Pizza Pop-Up", ["pizza", "pop-up", "popup"]),
    ("Weekly Meal Box", ["weekly meal", "meal box", "subscription"]),
    ("Wholesale Bread Supply", ["wholesale", "bread"]),
]

OCCASION_KEYWORDS = [
    ("Wedding Reception", ["wedding", "reception"]),
    ("Birthday Dinner", ["birthday"]),
    ("Corporate Team Lunch", ["corporate lunch", "team lunch", "office lunch"]),
    ("Holiday Gathering", ["holiday", "christmas", "thanksgiving"]),
    ("Anniversary Celebration", ["anniversary"]),
    ("Seasonal Pop-Up", ["pop-up", "popup"]),
]

AMOUNT_RE = re.compile(r"\$\s?\d[\d,]*(?:\.\d{2})?")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)")
DATE_RE = re.compile(
    r"\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|"
    r"dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?\b",
    re.I,
)
GUEST_RE = re.compile(r"\b(\d{1,4})\s*(?:guests?|people|ppl|attendees|headcount)\b", re.I)
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

FOOD_WORDS = {
    "salad",
    "soup",
    "chicken",
    "beef",
    "pork",
    "fish",
    "salmon",
    "shrimp",
    "pasta",
    "rice",
    "potato",
    "bread",
    "sourdough",
    "pizza",
    "sauce",
    "roast",
    "braised",
    "grilled",
    "smoked",
    "vegetable",
    "greens",
    "beans",
    "lentil",
    "mushroom",
    "tomato",
    "cheese",
    "dessert",
    "cake",
    "cookie",
    "tart",
    "pie",
    "vinaigrette",
    "herb",
    "aioli",
    "pickled",
    "fermented",
    "seasonal",
}

WORDING_TRIGGERS = [
    "happy to",
    "would love to",
    "let me know",
    "feel free",
    "thanks so much",
    "thank you",
    "looking forward",
    "excited",
    "wanted to",
    "following up",
    "circling back",
    "does that work",
    "sounds good",
    "that should work",
    "I can",
    "we can",
    "I'll",
    "we'll",
    "attached",
]


def _load_credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    token_path = Path(__file__).parent.parent.parent / ".gmail-tokens.json"
    raw = json.loads(token_path.read_text())
    creds = Credentials(
        token=raw.get("access_token") or raw.get("token"),
        refresh_token=raw.get("refresh_token"),
        token_uri=raw.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=(raw.get("client_id") or os.environ.get("GMAIL_CLIENT_ID", "")).strip("\"'"),
        client_secret=(raw.get("client_secret") or os.environ.get("GMAIL_CLIENT_SECRET", "")).strip("\"'"),
    )
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        raw = {**raw, "access_token": creds.token, "token": creds.token}
        token_path.write_text(json.dumps(raw))
        print("[harvest_sent_gmail] Gmail token refreshed")
    return creds


def get_gmail_client():
    from googleapiclient.discovery import build

    return build("gmail", "v1", credentials=_load_credentials(), cache_discovery=False)


def _decode_part(part: dict[str, Any]) -> str:
    data = part.get("body", {}).get("data") or ""
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    except Exception:
        return ""


def _strip_html(text: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p\s*>", "\n", text)
    text = re.sub(r"(?is)<.*?>", " ", text)
    text = html.unescape(text)
    return re.sub(r"[ \t]+", " ", text)


def _text_from_payload(payload: dict[str, Any]) -> str:
    parts = payload.get("parts") or []
    plain = []
    html_parts = []
    stack = list(parts) if parts else [payload]
    while stack:
        part = stack.pop(0)
        mime = part.get("mimeType", "")
        if mime == "text/plain":
            plain.append(_decode_part(part))
        elif mime == "text/html":
            html_parts.append(_strip_html(_decode_part(part)))
        elif mime.startswith("multipart/"):
            stack.extend(part.get("parts") or [])
    return "\n".join(t for t in plain if t.strip()) or "\n".join(t for t in html_parts if t.strip())


def _headers(message: dict[str, Any]) -> dict[str, str]:
    return {
        h.get("name", "").lower(): h.get("value", "")
        for h in (message.get("payload", {}).get("headers") or [])
    }


def _emails_from_header(value: str) -> set[str]:
    return {email.lower().strip() for _, email in getaddresses([value or ""]) if email}


def _parse_date(value: str | None) -> datetime:
    if value:
        try:
            dt = parsedate_to_datetime(value)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _clean_name(name: str, email: str) -> str:
    name = (name or "").strip().strip("\"'")
    if name and "@" not in name:
        return re.sub(r"\s+", " ", name)
    local = email.split("@", 1)[0].replace(".", " ").replace("_", " ").replace("-", " ")
    return local.title() if local else email


def _participants(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    people: dict[str, dict[str, str]] = {}
    for msg in messages:
        headers = _headers(msg)
        for field in ("from", "to", "cc", "bcc"):
            for name, email_addr in getaddresses([headers.get(field, "")]):
                email_addr = (email_addr or "").lower().strip()
                if not email_addr:
                    continue
                people[email_addr] = {
                    "name": _clean_name(name, email_addr),
                    "email": email_addr,
                    "domain": email_addr.split("@")[-1],
                }
    return list(people.values())


def _normalize_body(text: str, max_chars: int = 16000) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()[:max_chars]


def fetch_thread(gmail, thread_id: str) -> dict[str, Any]:
    result = gmail.users().threads().get(userId="me", id=thread_id, format="full").execute(num_retries=2)
    messages = result.get("messages") or []
    bodies = []
    sent_bodies = []
    for index, msg in enumerate(messages, start=1):
        headers = _headers(msg)
        body = _normalize_body(_text_from_payload(msg.get("payload", {})), max_chars=6000)
        if body:
            bodies.append(f"--- Message {index} of {len(messages)} ---\n{body}")
            from_emails = _emails_from_header(headers.get("from", ""))
            if from_emails.intersection(SELF_EMAILS) or "SENT" in (msg.get("labelIds") or []):
                sent_bodies.append(body)

    first_headers = _headers(messages[0]) if messages else {}
    last_headers = _headers(messages[-1]) if messages else {}
    return {
        "threadId": thread_id,
        "gmailLink": f"https://mail.google.com/mail/u/0/#sent/{thread_id}",
        "subject": first_headers.get("subject") or "(no subject)",
        "from": first_headers.get("from") or "",
        "to": first_headers.get("to") or "",
        "cc": first_headers.get("cc") or "",
        "date": first_headers.get("date") or "",
        "lastDate": last_headers.get("date") or first_headers.get("date") or "",
        "messageCount": len(messages),
        "participants": _participants(messages),
        "snippet": result.get("snippet") or "",
        "body": _normalize_body("\n\n".join(bodies), max_chars=24000),
        "sentBody": _normalize_body("\n\n".join(sent_bodies), max_chars=24000),
        "labelIds": sorted({label for m in messages for label in (m.get("labelIds") or [])}),
    }


def list_sent_thread_ids(
    gmail,
    days_back: int,
    max_threads: int | None = None,
    after_date: str | None = None,
) -> list[str]:
    after = after_date or f"{datetime.now() - timedelta(days=days_back):%Y/%m/%d}"
    q = f"in:sent after:{after}"
    thread_ids: list[str] = []
    page_token = None
    print(f"[harvest_sent_gmail] Gmail query: {q}")
    while True:
        remaining = 500 if max_threads is None else max(0, min(500, max_threads - len(thread_ids)))
        if remaining == 0:
            break
        res = gmail.users().threads().list(
            userId="me",
            q=q,
            maxResults=remaining,
            **({"pageToken": page_token} if page_token else {}),
        ).execute(num_retries=2)
        thread_ids.extend([t["id"] for t in (res.get("threads") or []) if t.get("id")])
        print(f"[harvest_sent_gmail] listed {len(thread_ids)} threads...", flush=True)
        page_token = res.get("nextPageToken")
        if not page_token:
            break
    return list(dict.fromkeys(thread_ids))


def _existing_source_ids(event_type: str, source: str, source_ids: list[str]) -> set[str]:
    if not source_ids:
        return set()
    found: set[str] = set()
    chunk_size = 500
    for i in range(0, len(source_ids), chunk_size):
        chunk = source_ids[i : i + chunk_size]
        placeholders = ",".join(["%s"] * len(chunk))
        rows = query(
            f"""
            SELECT "sourceId" FROM "LedgerEvent"
            WHERE "eventType" = %s AND source = %s AND "sourceId" IN ({placeholders})
            """,
            (event_type, source, *chunk),
        )
        found.update(r["sourceId"] for r in rows)
    return found


def _ledger_event_id(event_type: str, source: str, source_id: str) -> str | None:
    rows = query(
        """
        SELECT id FROM "LedgerEvent"
        WHERE "eventType" = %s AND source = %s AND "sourceId" = %s
        ORDER BY "createdAt" DESC
        LIMIT 1
        """,
        (event_type, source, source_id),
    )
    return rows[0]["id"] if rows else None


def _add_alias(entity_id: str, alias: str, source: str = SOURCE):
    alias = (alias or "").strip()
    if not alias:
        return
    try:
        execute(
            """
            INSERT INTO "BrainEntityAlias" (id, "entityId", alias, source, "createdAt")
            VALUES (gen_random_uuid(), %s, %s, %s, NOW())
            ON CONFLICT ("entityId", alias) DO NOTHING
            """,
            (entity_id, alias, source),
        )
    except Exception:
        # gen_random_uuid is available in current migrations; fall back if a
        # branch database lacks pgcrypto.
        import uuid

        execute(
            """
            INSERT INTO "BrainEntityAlias" (id, "entityId", alias, source, "createdAt")
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT ("entityId", alias) DO NOTHING
            """,
            (str(uuid.uuid4()), entity_id, alias, source),
        )


def _domain_is_noise(domain: str) -> bool:
    return domain in NOISE_DOMAINS or any(domain.endswith("." + d) for d in NOISE_DOMAINS)


def classify_thread(thread: dict[str, Any]) -> dict[str, Any]:
    text = f"{thread['subject']}\n{thread['snippet']}\n{thread['body']}".lower()
    domains = {p["domain"] for p in thread["participants"] if p["email"] not in SELF_EMAILS}
    vendor_score = sum(1 for w in VENDOR_WORDS if w in text)
    customer_score = sum(1 for w in CUSTOMER_WORDS if w in text)
    if domains and all(_domain_is_noise(d) for d in domains):
        category = "noise"
    elif vendor_score >= 2 and vendor_score > customer_score:
        category = "vendor_ops"
    elif customer_score >= 1:
        category = "customer_or_revenue"
    elif vendor_score >= 1:
        category = "vendor_ops"
    else:
        category = "relationship"

    offers = [name for name, words in OFFER_KEYWORDS if any(w in text for w in words)]
    occasions = [name for name, words in OCCASION_KEYWORDS if any(w in text for w in words)]
    return {
        "category": category,
        "offers": offers,
        "occasions": occasions,
        "amounts": sorted(set(AMOUNT_RE.findall(thread["body"]))),
        "dates": sorted(set(DATE_RE.findall(thread["body"]))),
        "phones": sorted(set(PHONE_RE.findall(thread["body"]))),
        "guestCounts": sorted({int(m.group(1)) for m in GUEST_RE.finditer(thread["body"])}),
        "wording": extract_wording(thread.get("sentBody") or ""),
        "menus": extract_menus(thread),
    }


def _meaningful_lines(text: str) -> list[str]:
    lines = []
    for line in text.splitlines():
        line = re.sub(r"^[>\-*•\d.)\s]+", "", line.strip())
        line = re.sub(r"\s+", " ", line)
        if not line:
            continue
        if line.lower().startswith(("on ", "from:", "to:", "sent from my", "unsubscribe")):
            continue
        lines.append(line)
    return lines


def _normalize_phrase(sentence: str) -> str:
    sentence = re.sub(r"\s+", " ", sentence.strip())
    sentence = re.sub(r"\b\d{1,2}[:/]\d{1,2}(?:/\d{2,4})?\b", "{date}", sentence)
    sentence = re.sub(r"\$\s?\d[\d,]*(?:\.\d{2})?", "{amount}", sentence)
    sentence = PHONE_RE.sub("{phone}", sentence)
    return sentence[:240]


def extract_wording(sent_text: str) -> dict[str, Any]:
    lines = _meaningful_lines(sent_text)
    openings = []
    closings = []
    for line in lines[:12]:
        if len(line) <= 160 and not _is_dish_line(line):
            openings.append(line)
        if len(openings) >= 3:
            break

    for line in lines[-16:]:
        low = line.lower()
        if any(token in low for token in ("thank", "best", "cheers", "let me know", "looking forward", "weston")):
            if len(line) <= 180:
                closings.append(line)

    sentences = []
    for raw in SENTENCE_RE.split(re.sub(r"\n+", " ", sent_text)):
        sentence = _normalize_phrase(raw)
        low = sentence.lower()
        word_count = len(sentence.split())
        if 5 <= word_count <= 34 and any(trigger.lower() in low for trigger in WORDING_TRIGGERS):
            sentences.append(sentence)

    return {
        "openings": list(dict.fromkeys(openings[:5])),
        "closings": list(dict.fromkeys(closings[-8:])),
        "phraseCandidates": list(dict.fromkeys(sentences[:25])),
    }


def _is_dish_line(line: str) -> bool:
    low = line.lower()
    if len(line) < 4 or len(line) > 180:
        return False
    if low.startswith(("hi ", "hello", "hey ", "thanks", "thank you", "best,", "cheers", "weston", "let me know")):
        return False
    if "http" in low or "@" in low:
        return False
    has_food = any(word in low for word in FOOD_WORDS)
    has_price = bool(AMOUNT_RE.search(line))
    has_menu_punct = bool(re.search(r"\s[-–—:]\s", line))
    titleish = len(line.split()) <= 12 and line[:1].isupper()
    return has_food or has_price or (has_menu_punct and titleish)


def _parse_dish_line(line: str) -> dict[str, Any]:
    source = line.strip()
    cleaned = re.sub(r"^[\-*•\d.)\s]+", "", source).strip()
    price_match = AMOUNT_RE.search(cleaned)
    price = price_match.group(0) if price_match else None
    if price:
        cleaned = cleaned.replace(price, "").strip(" -–—:")
    parts = re.split(r"\s[-–—:]\s", cleaned, maxsplit=1)
    name = parts[0].strip(" .")
    description = parts[1].strip() if len(parts) > 1 else None
    if len(name.split()) > 10 and not description:
        words = name.split()
        name = " ".join(words[:7]).strip(" ,")
        description = " ".join(words[7:]).strip() or None
    return {"name": name[:120], "description": description, "price": price, "sourceSpan": source}


def extract_menus(thread: dict[str, Any]) -> list[dict[str, Any]]:
    text = thread.get("sentBody") or thread.get("body") or ""
    lines = _meaningful_lines(text)
    if not lines:
        return []

    blocks: list[tuple[str, list[str]]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        low = line.lower()
        if "menu" in low or "proposal" in low:
            block = []
            for candidate in lines[i + 1 : i + 45]:
                if candidate.lower().startswith(("thanks", "thank you", "best,", "cheers", "weston")):
                    break
                if _is_dish_line(candidate):
                    block.append(candidate)
            if len(block) >= 2:
                blocks.append((line[:120], block))
                i += len(block)
        i += 1

    current: list[str] = []
    for line in lines:
        if _is_dish_line(line):
            current.append(line)
        else:
            if len(current) >= 3:
                blocks.append((thread["subject"][:120], current))
            current = []
    if len(current) >= 3:
        blocks.append((thread["subject"][:120], current))

    menus = []
    seen_blocks = set()
    for name, block in blocks:
        dishes = []
        seen_dishes = set()
        for dish_line in block:
            dish = _parse_dish_line(dish_line)
            key = dish["name"].lower()
            if len(key) < 3 or key in seen_dishes:
                continue
            seen_dishes.add(key)
            dishes.append(dish)
        if len(dishes) < 2:
            continue
        block_key = "|".join(d["name"].lower() for d in dishes[:10])
        if block_key in seen_blocks:
            continue
        seen_blocks.add(block_key)
        menus.append({
            "menuName": name or f"Menu from {thread['subject'][:80]}",
            "sourceSpan": "\n".join(block[:30])[:2400],
            "dishes": dishes[:60],
        })
    return menus[:5]


def _source_span(thread: dict[str, Any], max_len: int = 900) -> str:
    text = thread["body"] or thread["snippet"] or thread["subject"]
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    useful = [
        l for l in lines
        if any(w in l.lower() for w in ("menu", "order", "invoice", "wedding", "dinner", "event", "guest", "$", "delivery"))
    ]
    return "\n".join(useful[:8])[:max_len] or "\n".join(lines[:8])[:max_len]


def _person_type_for(participant: dict[str, str], classification: dict[str, Any]) -> str:
    domain = participant["domain"]
    if classification["category"] == "vendor_ops" and domain not in PERSONAL_DOMAINS:
        return "Vendor"
    if classification["category"] == "customer_or_revenue":
        return "Customer"
    return "Person"


def _write_email_thread_event(thread: dict[str, Any], classification: dict[str, Any], dry_run: bool) -> str | None:
    body_digest = hashlib.sha256(thread["body"].encode("utf-8", errors="ignore")).hexdigest()
    payload = {
        "threadId": thread["threadId"],
        "subject": thread["subject"],
        "from": thread["from"],
        "to": thread["to"],
        "cc": thread["cc"],
        "messageCount": thread["messageCount"],
        "participants": thread["participants"],
        "snippet": thread["snippet"],
        "gmailLink": thread["gmailLink"],
        "labelIds": thread["labelIds"],
        "bodyDigest": body_digest,
        "bodyChars": len(thread["body"]),
        "bodyPreview": thread["body"][:1800],
        "sentBodyChars": len(thread.get("sentBody") or ""),
        "sentBodyPreview": (thread.get("sentBody") or "")[:1800],
        "classification": classification,
    }
    if dry_run:
        return None
    return write_ledger_event(
        event_type="extraction.gmail_sent_deterministic",
        source=SOURCE,
        source_id=thread["threadId"],
        occurred_at=_parse_date(thread.get("lastDate") or thread.get("date")),
        payload=payload,
    )


def _write_existing_email_thread_if_missing(thread: dict[str, Any], dry_run: bool) -> int:
    existing = query(
        """
        SELECT id FROM "LedgerEvent"
        WHERE "eventType" = 'email.thread' AND source = 'gmail' AND "sourceId" = %s
        LIMIT 1
        """,
        (thread["threadId"],),
    )
    if existing:
        return 0
    if dry_run:
        return 1
    write_ledger_event(
        event_type="email.thread",
        source="gmail",
        source_id=thread["threadId"],
        actor_type="system",
        occurred_at=_parse_date(thread.get("date")),
        payload={
            "threadId": thread["threadId"],
            "subject": thread["subject"],
            "from": thread["from"],
            "to": thread["to"],
            "messageCount": thread["messageCount"],
            "participants": thread["participants"],
            "snippet": thread["snippet"],
            "gmailLink": thread["gmailLink"],
            "sentHarvested": True,
        },
    )
    return 1


def _write_graph(thread: dict[str, Any], classification: dict[str, Any], ledger_id: str | None, dry_run: bool) -> dict[str, int]:
    counts = {"entities": 0, "aliases": 0, "assertions": 0, "menus": 0, "dishes": 0, "wording_notes": 0}
    if dry_run or not ledger_id:
        return counts

    founder_id, founder_created = find_or_create_entity("Person", SELF_NAME)
    counts["entities"] += int(founder_created)
    for email_addr in SELF_EMAILS:
        _add_alias(founder_id, email_addr)

    span = _source_span(thread)
    metadata_base = {
        "source": SOURCE,
        "threadId": thread["threadId"],
        "gmailLink": thread["gmailLink"],
        "subject": thread["subject"],
        "category": classification["category"],
        "messageCount": thread["messageCount"],
        "amounts": classification["amounts"][:20],
        "dates": classification["dates"][:20],
        "phones": classification["phones"][:10],
        "guestCounts": classification["guestCounts"],
        "sourceSpan": span,
    }

    external_entities: list[str] = []
    for participant in thread["participants"]:
        if participant["email"] in SELF_EMAILS:
            continue
        if _domain_is_noise(participant["domain"]):
            continue
        entity_type = _person_type_for(participant, classification)
        entity_id, created = find_or_create_entity(entity_type, participant["name"])
        counts["entities"] += int(created)
        _add_alias(entity_id, participant["email"])
        counts["aliases"] += 1
        external_entities.append(entity_id)

        write_assertion(
            src_id=founder_id,
            dst_id=entity_id,
            rel_type="EMAILED",
            ledger_event_id=ledger_id,
            confidence=0.92,
            metadata={
                **metadata_base,
                "direction": "outbound",
                "participantEmail": participant["email"],
                "participantDomain": participant["domain"],
            },
            valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
            provisional=True,
            created_by=SOURCE,
        )
        counts["assertions"] += 1

    for offer_name in classification["offers"]:
        offer_id, created = find_or_create_entity("Offer", offer_name)
        counts["entities"] += int(created)
        for entity_id in external_entities:
            write_assertion(
                src_id=entity_id,
                dst_id=offer_id,
                rel_type="DISCUSSED_OFFER",
                ledger_event_id=ledger_id,
                confidence=0.72,
                metadata=metadata_base,
                valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
                provisional=True,
                created_by=SOURCE,
            )
            counts["assertions"] += 1

    for occasion_name in classification["occasions"]:
        occasion_id, created = find_or_create_entity("Occasion", occasion_name)
        counts["entities"] += int(created)
        for entity_id in external_entities:
            write_assertion(
                src_id=entity_id,
                dst_id=occasion_id,
                rel_type="MENTIONED_OCCASION",
                ledger_event_id=ledger_id,
                confidence=0.72,
                metadata=metadata_base,
                valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
                provisional=True,
                created_by=SOURCE,
            )
            counts["assertions"] += 1

    if classification["amounts"] or classification["dates"] or classification["guestCounts"]:
        note_name = f"Sent thread: {thread['subject'][:90]}"
        note_id, created = find_or_create_entity("Note", note_name)
        counts["entities"] += int(created)
        for entity_id in external_entities or [founder_id]:
            write_assertion(
                src_id=note_id,
                dst_id=entity_id,
                rel_type="EVIDENCES",
                ledger_event_id=ledger_id,
                confidence=0.78,
                metadata=metadata_base,
                valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
                provisional=True,
                created_by=SOURCE,
            )
            counts["assertions"] += 1

    wording = classification.get("wording") or {}
    phrase_candidates = wording.get("phraseCandidates") or []
    if phrase_candidates or wording.get("openings") or wording.get("closings"):
        note_name = f"Outbound wording sample: {thread['subject'][:80]}"
        note_id, created = find_or_create_entity("Note", note_name)
        counts["entities"] += int(created)
        write_assertion(
            src_id=founder_id,
            dst_id=note_id,
            rel_type="USES_WORDING",
            ledger_event_id=ledger_id,
            confidence=0.9,
            metadata={
                **metadata_base,
                "openings": wording.get("openings", []),
                "closings": wording.get("closings", []),
                "phraseCandidates": phrase_candidates,
            },
            valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
            provisional=True,
            created_by=SOURCE,
        )
        counts["assertions"] += 1
        counts["wording_notes"] += 1

    for menu in classification.get("menus") or []:
        menu_name = menu.get("menuName") or f"Menu from {thread['subject'][:80]}"
        menu_id, created = find_or_create_entity("Menu", menu_name)
        counts["entities"] += int(created)
        counts["menus"] += int(created)
        write_assertion(
            src_id=menu_id,
            dst_id=menu_id,
            rel_type="MENU_SNAPSHOT",
            ledger_event_id=ledger_id,
            confidence=0.74,
            metadata={
                **metadata_base,
                "sourceSpan": menu.get("sourceSpan"),
                "dishCount": len(menu.get("dishes") or []),
            },
            valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
            provisional=True,
            created_by=SOURCE,
        )
        counts["assertions"] += 1
        for dish in menu.get("dishes") or []:
            dish_name = dish.get("name")
            if not dish_name:
                continue
            dish_id, dish_created = find_or_create_entity("Dish", dish_name)
            counts["entities"] += int(dish_created)
            counts["dishes"] += int(dish_created)
            write_assertion(
                src_id=dish_id,
                dst_id=menu_id,
                rel_type="APPEARS_ON",
                ledger_event_id=ledger_id,
                confidence=0.72,
                metadata={
                    **metadata_base,
                    "description": dish.get("description"),
                    "price": dish.get("price"),
                    "sourceSpan": dish.get("sourceSpan"),
                },
                valid_from=_parse_date(thread.get("lastDate") or thread.get("date")),
                provisional=True,
                created_by=SOURCE,
            )
            counts["assertions"] += 1

    return counts


def _write_wording_patterns(
    phrase_counter: Counter[str],
    phrase_examples: dict[str, list[str]],
    after_key: str,
    dry_run: bool,
) -> int:
    common = [(phrase, count) for phrase, count in phrase_counter.most_common(80) if count >= 2]
    if dry_run or not common:
        return 0
    source_id = f"{SOURCE}_wording_patterns_{after_key.replace('/', '-')}"
    if _ledger_event_id("extraction.gmail_sent_wording_patterns", SOURCE, source_id):
        return 0
    ledger_id = write_ledger_event(
        event_type="extraction.gmail_sent_wording_patterns",
        source=SOURCE,
        source_id=source_id,
        payload={
            "after": after_key,
            "patterns": [
                {"phrase": phrase, "count": count, "examples": phrase_examples.get(phrase, [])[:5]}
                for phrase, count in common
            ],
        },
    )
    founder_id, _ = find_or_create_entity("Person", SELF_NAME)
    written = 0
    for phrase, count in common:
        pattern_id, _ = find_or_create_entity("Pattern", f"Customer service phrasing: {phrase[:90]}")
        write_assertion(
            src_id=founder_id,
            dst_id=pattern_id,
            rel_type="USES_WORDING_PATTERN",
            ledger_event_id=ledger_id,
            confidence=min(0.95, 0.55 + count / 20),
            metadata={"phrase": phrase, "count": count, "examples": phrase_examples.get(phrase, [])[:5]},
            provisional=True,
            created_by=SOURCE,
        )
        written += 1
    return written


def run(
    days_back: int = 730,
    limit: int | None = None,
    max_new: int | None = None,
    dry_run: bool = False,
    after_date: str | None = None,
    socket_timeout: int = 45,
) -> dict[str, Any]:
    socket.setdefaulttimeout(socket_timeout)
    gmail = get_gmail_client()
    thread_ids = list_sent_thread_ids(
        gmail,
        days_back=days_back,
        max_threads=limit,
        after_date=after_date,
    )
    already_harvested = _existing_source_ids("extraction.gmail_sent_deterministic", SOURCE, thread_ids)

    to_process = [tid for tid in thread_ids if tid not in already_harvested]
    if max_new is not None:
        to_process = to_process[:max_new]

    print(
        f"[harvest_sent_gmail] sent threads={len(thread_ids)} "
        f"already_harvested={len(already_harvested)} to_process={len(to_process)} "
        f"max_new={max_new} socket_timeout={socket_timeout}",
        flush=True,
    )

    processed = skipped = errors = email_events_created = 0
    entities = aliases = assertions = 0
    category_counts: dict[str, int] = {}
    phrase_counter: Counter[str] = Counter()
    phrase_examples: dict[str, list[str]] = defaultdict(list)
    menus = dishes = wording_notes = 0

    skipped = len(already_harvested)
    for index, thread_id in enumerate(to_process, start=1):
        try:
            print(f"[harvest_sent_gmail] [{index}/{len(to_process)}] fetching {thread_id}", flush=True)
            thread = fetch_thread(gmail, thread_id)
            classification = classify_thread(thread)
            for phrase in (classification.get("wording") or {}).get("phraseCandidates", []):
                phrase_counter[phrase] += 1
                if len(phrase_examples[phrase]) < 5:
                    phrase_examples[phrase].append(thread["subject"])
            category_counts[classification["category"]] = category_counts.get(classification["category"], 0) + 1
            email_events_created += _write_existing_email_thread_if_missing(thread, dry_run=dry_run)
            ledger_id = _write_email_thread_event(thread, classification, dry_run=dry_run)
            counts = _write_graph(thread, classification, ledger_id, dry_run=dry_run)
            entities += counts["entities"]
            aliases += counts["aliases"]
            assertions += counts["assertions"]
            menus += counts["menus"]
            dishes += counts["dishes"]
            wording_notes += counts["wording_notes"]
            processed += 1
            print(
                f"[harvest_sent_gmail] [{index}/{len(to_process)}] wrote "
                f"subject={thread['subject'][:70]!r} "
                f"menus={len(classification.get('menus') or [])} "
                f"dishes={sum(len(m.get('dishes') or []) for m in classification.get('menus') or [])} "
                f"phrases={len((classification.get('wording') or {}).get('phraseCandidates') or [])}",
                flush=True,
            )
            time.sleep(0.05)
        except Exception as exc:
            errors += 1
            print(f"[harvest_sent_gmail] thread error {thread_id}: {exc}", flush=True)

    after_key = after_date or f"{datetime.now() - timedelta(days=days_back):%Y/%m/%d}"
    wording_patterns = _write_wording_patterns(phrase_counter, phrase_examples, after_key, dry_run)

    result = {
        "sent_threads": len(thread_ids),
        "processed": processed,
        "skipped": skipped,
        "errors": errors,
        "email_thread_events_created": email_events_created,
        "entities_created": entities,
        "aliases_attempted": aliases,
        "assertions_written": assertions,
        "menus_created": menus,
        "dishes_created": dishes,
        "wording_notes_created": wording_notes,
        "wording_patterns_written": wording_patterns,
        "category_counts": category_counts,
        "dry_run": dry_run,
    }
    print(f"[harvest_sent_gmail] complete: {json.dumps(result, default=str)}")
    return result


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    days_back = 730
    limit = None
    after_date = None
    max_new = None
    socket_timeout = 45
    for i, arg in enumerate(sys.argv):
        if arg == "--days-back" and i + 1 < len(sys.argv):
            days_back = int(sys.argv[i + 1])
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        if arg == "--after" and i + 1 < len(sys.argv):
            after_date = sys.argv[i + 1]
        if arg == "--max-new" and i + 1 < len(sys.argv):
            max_new = int(sys.argv[i + 1])
        if arg == "--socket-timeout" and i + 1 < len(sys.argv):
            socket_timeout = int(sys.argv[i + 1])
    run(
        days_back=days_back,
        limit=limit,
        max_new=max_new,
        dry_run=dry_run,
        after_date=after_date,
        socket_timeout=socket_timeout,
    )
