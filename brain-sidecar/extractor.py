"""
Instructor-typed extraction engine.
Wraps the Anthropic client with instructor for structured output.
"""

import os
import anthropic
import instructor
from models import (
    EmailThreadExtraction,
    SquarePaymentSignal,
    InboxTriageDecision,
    VendorRelationshipExtraction,
)

_client = None


def get_client() -> instructor.Instructor:
    global _client
    if _client is None:
        raw = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
        _client = instructor.from_anthropic(raw)
    return _client


MODEL = 'claude-haiku-4-5-20251001'  # fast + cheap for extraction jobs


# ── Email extraction ──────────────────────────────────────────────────────────

def extract_email_signals(subject: str, from_addr: str, snippet: str) -> EmailThreadExtraction:
    """Extract vendor/customer signals from an email thread."""
    prompt = f"""You are extracting operational signals from a food business email thread.

Subject: {subject}
From: {from_addr}
Snippet: {snippet}

Extract any vendor orders, invoices, price quotes, delivery confirmations, or payment signals.
Only extract signals that are clearly present — do not invent details.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=EmailThreadExtraction,
    )


# ── Square payment extraction ─────────────────────────────────────────────────

def extract_square_payment(note: str, amount_cents: int) -> SquarePaymentSignal:
    """Extract structured signal from a Square payment note field."""
    amount_str = f'${amount_cents / 100:.2f}'
    prompt = f"""Classify this Square payment for a food business.

Amount: {amount_str}
Note/description: {note or '(no note)'}

Determine if this is a vendor payment, customer payment, or unknown.
Extract vendor or customer name if present.
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
    """Decide how to triage a pending BrainInboxItem."""
    prompt = f"""You are triaging captured notes for a small food business knowledge graph.

Source: {source}
Content: {raw_content}

Decide the best action:
- new_entity: create a new Vendor, Customer, Ingredient, or other entity
- append_entity: this is a note about an existing entity
- new_task: this is a to-do item
- trash: noise, duplicate, or irrelevant
- needs_human: ambiguous — requires founder judgment

Be conservative: prefer needs_human over a wrong action.
Medical constraints, legal matters, and financial decisions must be needs_human.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=512,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=InboxTriageDecision,
    )


# ── Vendor→ingredient relationship extraction ─────────────────────────────────

def extract_vendor_relationships(text: str) -> VendorRelationshipExtraction:
    """Extract vendor supply relationships and pricing from free text (e.g. invoice, email)."""
    prompt = f"""Extract vendor→ingredient supply relationships from this food business document.

Text: {text[:2000]}

For each relationship, extract:
- vendor name (supplier)
- ingredient name
- unit (lb, oz, case, bunch, etc.) if mentioned
- price per unit if mentioned

Only extract what is explicitly stated.
"""
    client = get_client()
    return client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}],
        response_model=VendorRelationshipExtraction,
    )
