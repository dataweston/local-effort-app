"""
Extraction engine — Instructor + Claude for structured output.

Key improvements over v1:
- Full email body fetch via Gmail API (not just snippets)
- Context-aware prompts: known entities injected so model resolves, not duplicates
- Hard ignore-list: SaaS receipts, marketing, irrelevant senders filtered before LLM call
- Richer schema: menus, dishes, line items, invoice numbers, outbound detection, thread arc
- Async batch execution for speed (asyncio + concurrent.futures)
- Thread arc extraction: sequences quote→order→invoice→payment across messages
"""

import os
import re
import base64
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

import anthropic
import instructor
from models import (
    EmailThreadExtraction,
    SquarePaymentSignal,
    InboxTriageDecision,
    VendorRelationshipExtraction,
)

# ── Ignore list — never call LLM on these ────────────────────────────────────

IGNORE_SENDER_DOMAINS = {
    'intuit.com', 'quickbooks.intuit.com', 'turbotax.intuit.com',
    'uber.com', 'ubereats.com', 'doordash.com',
    'amazon.com', 'amazon.co', 'amazonaws.com',
    'brooksrunning.com', 'nike.com', 'adidas.com',
    'squarespace.com', 'godaddy.com', 'namecheap.com',
    'mailchimp.com', 'constantcontact.com', 'klaviyo.com',
    'weddingpro.com', 'theknot.com', 'zola.com',
    'linkedin.com', 'facebook.com', 'instagram.com',
    'google.com', 'googleads.com', 'youtube.com',
    'dropbox.com', 'notion.so', 'slack.com',
    'stripe.com', 'paypal.com', 'venmo.com',
    'bank.com', 'wellsfargo.com', 'chase.com', 'bankofamerica.com',
    'azurestandard.com',  # not a local food vendor in context
}

IGNORE_SUBJECT_PATTERNS = [
    r'unsubscribe', r'newsletter', r'marketing', r'promotional',
    r'verify your email', r'confirm your email', r'welcome to',
    r'your \w+ account', r'reset your password', r'two.factor',
    r'subscription (confirmed|renewed|receipt|payment)',
    r'tax (deadline|reminder|season)',
    r'account (statement|summary|update)',
    r'\bsale\b.*\b(ends|off|discount)\b',
]

_IGNORE_SUBJECT_RE = re.compile('|'.join(IGNORE_SUBJECT_PATTERNS), re.I)


def should_ignore(sender_email: str, subject: str) -> tuple[bool, str]:
    """Return (should_ignore, reason)."""
    domain = sender_email.split('@')[-1].lower().strip('>')
    if domain in IGNORE_SENDER_DOMAINS:
        return True, f'ignored domain: {domain}'
    if _IGNORE_SUBJECT_RE.search(subject or ''):
        return True, f'ignored subject pattern'
    return False, ''


# ── Gmail body fetch ──────────────────────────────────────────────────────────
# httplib2 (used by google-api-python-client) is NOT thread-safe.
# Each worker thread gets its own client via threading.local().

import threading
_thread_local = threading.local()


_creds_lock = threading.Lock()
_shared_creds = None  # one Credentials object refreshed in-place by googleapis


def _load_credentials():
    """Load credentials from token file, refreshing if expired. Thread-safe."""
    import json as _json
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    global _shared_creds

    token_path = Path(__file__).parent.parent / '.gmail-tokens.json'

    with _creds_lock:
        raw = _json.loads(token_path.read_text())
        client_id = (raw.get('client_id') or os.environ.get('GMAIL_CLIENT_ID', '')).strip('"\'')
        client_secret = (raw.get('client_secret') or os.environ.get('GMAIL_CLIENT_SECRET', '')).strip('"\'')

        if _shared_creds is None:
            _shared_creds = Credentials(
                token=raw.get('access_token') or raw.get('token'),
                refresh_token=raw.get('refresh_token'),
                token_uri=raw.get('token_uri', 'https://oauth2.googleapis.com/token'),
                client_id=client_id,
                client_secret=client_secret,
            )

        if not _shared_creds.valid and _shared_creds.refresh_token:
            _shared_creds.refresh(Request())
            updated = {**raw, 'access_token': _shared_creds.token, 'token': _shared_creds.token}
            token_path.write_text(_json.dumps(updated))
            print('[extractor] Gmail token refreshed')

        return _shared_creds


def get_gmail_client():
    """Return a thread-local Gmail API client, rebuilding if token is expired."""
    from googleapiclient.discovery import build
    from google.auth.exceptions import TransportError

    try:
        creds = _load_credentials()
        # Always rebuild if stale — cheap operation, ensures fresh token
        if not getattr(_thread_local, 'gmail', None) or not creds.valid:
            _thread_local.gmail = build('gmail', 'v1', credentials=creds, cache_discovery=False)
    except Exception as e:
        print(f'[extractor] Gmail client unavailable: {e}')
        _thread_local.gmail = None
    return _thread_local.gmail


def _decode_part(part: dict) -> str:
    data = part.get('body', {}).get('data', '')
    if not data:
        return ''
    try:
        return base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='replace')
    except Exception:
        return ''


def _extract_text_from_parts(parts: list) -> str:
    """Recursively extract plain text from message parts."""
    text = ''
    for part in parts:
        mime = part.get('mimeType', '')
        if mime == 'text/plain':
            text += _decode_part(part)
        elif mime.startswith('multipart/'):
            text += _extract_text_from_parts(part.get('parts', []))
    return text


def fetch_thread_body(thread_id: str, max_chars: int = 6000) -> str:
    """
    Fetch the full plaintext body of a Gmail thread.
    Returns concatenated text of all messages, newest-first, up to max_chars.
    Falls back to empty string if Gmail client unavailable.
    """
    gmail = get_gmail_client()
    if not gmail:
        return ''
    try:
        result = gmail.users().threads().get(
            userId='me',
            id=thread_id,
            format='full',
        ).execute(num_retries=1)

        messages = result.get('messages', [])
        # Newest message first — most recent state of the thread
        messages = list(reversed(messages))

        chunks = []
        total = 0
        for i, msg in enumerate(messages):
            payload = msg.get('payload', {})
            parts = payload.get('parts', [])
            if parts:
                text = _extract_text_from_parts(parts)
            else:
                text = _decode_part(payload)

            text = text.strip()
            if not text:
                continue

            header = f'--- Message {i+1} of {len(messages)} ---\n'
            chunk = header + text[:max_chars - total - len(header)]
            chunks.append(chunk)
            total += len(chunk)
            if total >= max_chars:
                break

        return '\n\n'.join(chunks)
    except Exception as e:
        print(f'[extractor] body fetch failed for {thread_id}: {e}')
        return ''


# ── Anthropic / Instructor client ─────────────────────────────────────────────

_instructor_client = None


def get_client() -> instructor.Instructor:
    global _instructor_client
    if _instructor_client is None:
        raw = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
        _instructor_client = instructor.from_anthropic(raw)
    return _instructor_client


MODEL = 'claude-haiku-4-5-20251001'


# ── Entity context loader ─────────────────────────────────────────────────────

_entity_context_cache: str | None = None


def load_entity_context() -> str:
    """
    Load known entities from DB and format as a context string for prompts.
    Cached per process run.
    """
    global _entity_context_cache
    if _entity_context_cache is not None:
        return _entity_context_cache

    try:
        from db import query
        rows = query("""
            SELECT "entityType", name FROM "BrainEntity"
            WHERE "tombstonedAt" IS NULL
            ORDER BY "entityType", name
            LIMIT 500
        """)
        by_type: dict[str, list[str]] = {}
        for r in rows:
            by_type.setdefault(r['entityType'], []).append(r['name'])

        lines = ['Known entities in the knowledge graph:']
        for etype, names in sorted(by_type.items()):
            lines.append(f'  {etype}s: {", ".join(names[:40])}')

        _entity_context_cache = '\n'.join(lines)
    except Exception as e:
        print(f'[extractor] entity context load failed: {e}')
        _entity_context_cache = 'No existing entities available.'

    return _entity_context_cache


def invalidate_entity_cache():
    global _entity_context_cache
    _entity_context_cache = None


# ── Email extraction ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are extracting structured knowledge from emails for a small food business called Local Effort Food, run by Weston Smith (dataweston@gmail.com, yum@localeffortfood.com).

The business:
- Sources ingredients from local farms and specialty vendors
- Runs weekly meal subscription service for households
- Does catering events (dinners, weddings, corporate)
- Operates a pizza concept (Local Effort Pizza)
- Is based in Minnesota

{entity_context}

RULES:
1. Use exact vendor/entity names from the known entities list when you recognize them. Do not create variations.
2. IGNORE: SaaS receipts (QuickBooks, Intuit, Stripe, etc.), marketing emails, newsletters, social media, non-food e-commerce.
3. Detect direction: if Weston/yum@localeffortfood.com is the SENDER, it's outbound. If they're the RECIPIENT, it's inbound.
4. For menus: extract every dish you can find. Menus often appear as lists with dish names and descriptions. They may be in catering proposals, weekly meal emails, or event planning threads.
5. For vendor signals: capture invoice numbers, order numbers, amounts, line items, and dates precisely as written.
6. Source spans: include the exact text excerpt that supports each extracted fact.
7. If uncertain, lower confidence and set needs_human_review=True rather than guessing.
"""


def extract_email_thread(
    thread_id: str,
    subject: str,
    sender: str,
    recipients: str,
    snippet: str,
    body: str = '',
    participants: list[str] | None = None,
) -> EmailThreadExtraction:
    """Full extraction from an email thread with body."""
    entity_context = load_entity_context()
    system = SYSTEM_PROMPT.format(entity_context=entity_context)

    # Build the content block — prioritize body over snippet
    content_text = body if body.strip() else snippet
    participants_str = ', '.join(participants or [])

    user_prompt = f"""Extract all structured information from this email thread.

Subject: {subject}
From: {sender}
To/CC: {recipients}
Participants: {participants_str}

Email content:
{content_text[:5000]}
"""

    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=2048,
        system=system,
        messages=[{'role': 'user', 'content': user_prompt}],
        response_model=EmailThreadExtraction,
    )


# ── Parallel extraction ───────────────────────────────────────────────────────

def fetch_bodies_sequential(
    threads: list[dict],
    timeout_per_fetch: int = 15,
) -> dict[str, str]:
    """
    Fetch Gmail bodies one at a time with a per-request timeout.
    Returns dict of thread_id → body text.
    Sequential avoids SSL connection sharing issues across threads.
    """
    import signal

    def _timeout_handler(signum, frame):
        raise TimeoutError('body fetch timed out')

    bodies = {}
    for i, row in enumerate(threads):
        thread_id = row['payload'].get('threadId') or row.get('sourceId', '')
        if not thread_id:
            continue
        # Proactively refresh token every 50 fetches so it never expires mid-run
        if i > 0 and i % 50 == 0:
            try:
                _load_credentials()
                _thread_local.gmail = None  # force client rebuild with fresh token
            except Exception as e:
                print(f'[extractor] token refresh warning: {e}')
        try:
            body = fetch_thread_body(thread_id)
            bodies[thread_id] = body
        except Exception as e:
            print(f'[extractor] body fetch failed {thread_id}: {e}')
            bodies[thread_id] = ''
        if (i + 1) % 100 == 0:
            print(f'[extractor] fetched {i+1}/{len(threads)} bodies...')
    return bodies


def extract_threads_parallel(
    threads: list[dict],
    max_workers: int = 4,
    fetch_bodies: bool = True,
    dry_run: bool = False,
    thread_timeout: int = 60,
) -> list[tuple[dict, EmailThreadExtraction | None, str | None]]:
    """
    Two-phase extraction:
      1. Fetch all bodies sequentially (avoids SSL/threading issues with httplib2)
      2. Run LLM extraction in parallel on the collected text

    Returns list of (thread_row, extraction_result, error_message).
    """
    # Phase 1: fetch bodies sequentially
    bodies: dict[str, str] = {}
    if fetch_bodies:
        print(f'[extractor] fetching bodies for {len(threads)} threads...')
        bodies = fetch_bodies_sequential(threads)

    def process_one(row: dict) -> tuple[dict, EmailThreadExtraction | None, str | None]:
        payload = row['payload']
        thread_id = payload.get('threadId') or row.get('sourceId', '')
        subject = payload.get('subject', '')
        sender = payload.get('from', '')
        recipients = payload.get('to', '')
        snippet = payload.get('snippet', '')
        participants = payload.get('participants', [])

        ignore, reason = should_ignore(sender, subject)
        if ignore:
            return row, None, f'ignored:{reason}'

        body = bodies.get(thread_id, '') if fetch_bodies else ''

        if dry_run:
            print(f'[DRY] {subject[:60]} | body={len(body)}chars')
            return row, None, 'dry_run'

        try:
            result = extract_email_thread(
                thread_id=thread_id,
                subject=subject,
                sender=sender,
                recipients=recipients,
                snippet=snippet,
                body=body,
                participants=participants,
            )
            return row, result, None
        except Exception as e:
            return row, None, str(e)

    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(process_one, row): row for row in threads}
        done = 0
        for future in as_completed(futures, timeout=None):
            row = futures[future]
            try:
                results.append(future.result(timeout=thread_timeout))
            except Exception as e:
                thread_id = row.get('payload', {}).get('threadId', '?')
                print(f'[extractor] thread {thread_id} timed out or errored: {e}')
                results.append((row, None, f'timeout:{e}'))
            done += 1
            if done % 50 == 0:
                print(f'[extractor] {done}/{len(futures)} threads processed...')

    return results


# ── Square payment extraction ─────────────────────────────────────────────────

def extract_square_payment(note: str, amount_cents: int) -> SquarePaymentSignal:
    amount_str = f'${amount_cents / 100:.2f}'
    prompt = f"""Classify this Square payment for a small food business (Local Effort Food).

Amount: {amount_str}
Note/description: {note or '(no note)'}

Determine: vendor payment (you paid a supplier), customer payment (customer paid you), or unknown.
Extract vendor or customer name if clearly present.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=512,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=SquarePaymentSignal,
    )


# ── Inbox triage ──────────────────────────────────────────────────────────────

def triage_inbox_item(raw_content: str, source: str) -> InboxTriageDecision:
    entity_context = load_entity_context()
    prompt = f"""You are triaging captured notes for Local Effort Food's knowledge graph.

{entity_context}

Source: {source}
Content: {raw_content}

Choose the best action:
- new_entity: create a new Vendor, Customer, Ingredient, Menu, Dish, or other entity
- append_entity: this is a note about an existing entity (match by name above)
- new_task: this is a to-do item or action item
- trash: noise, duplicate, or irrelevant
- needs_human: ambiguous — requires founder judgment

Be conservative: prefer needs_human over a wrong action.
Medical, legal, and financial decisions must be needs_human.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=512,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=InboxTriageDecision,
    )


# ── Vendor relationship extraction ────────────────────────────────────────────

def extract_vendor_relationships(text: str) -> VendorRelationshipExtraction:
    prompt = f"""Extract vendor→ingredient supply relationships from this food business document.

Text: {text[:2000]}

For each relationship extract: vendor name, ingredient name, unit, price per unit if mentioned.
Only extract what is explicitly stated.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=VendorRelationshipExtraction,
    )
