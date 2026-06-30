"""
Job: extract_brevo

Extracts email marketing data from Brevo (formerly Sendinblue):
  - Contacts (176) → Customer entities with subscription metadata
  - Sent email campaigns (12) → Note entities capturing campaign name/subject/date

Assertions written:
  - Customer → SUBSCRIBED_TO → Channel "Brevo Email List"  (opted into the list)
  - Note     → ABOUT          (campaign metadata: subject, send date, recipients)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_BASE    = 'https://api.brevo.com/v3'


def _brevo_get(path: str, params: dict | None = None) -> dict:
    url = f"{BREVO_BASE}/{path}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'api-key': BREVO_API_KEY,
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _fetch_all_contacts() -> list[dict]:
    """Paginate through all contacts (max 1000 per page)."""
    contacts = []
    limit = 500
    offset = 0
    while True:
        data = _brevo_get('contacts', {'limit': limit, 'offset': offset})
        batch = data.get('contacts') or []
        contacts.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return contacts


def _fetch_all_campaigns() -> list[dict]:
    """Fetch sent email campaigns (max 100 per page per Brevo API)."""
    campaigns = []
    limit = 100
    offset = 0
    while True:
        data = _brevo_get('emailCampaigns', {
            'limit': limit,
            'offset': offset,
            'type': 'classic',
            'status': 'sent',
        })
        batch = data.get('campaigns') or []
        campaigns.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return campaigns


def run(dry_run: bool = False) -> dict:
    customers_written = 0
    campaigns_written = 0
    assertions_written = 0
    errors = []

    # ── Contacts → Customer entities ──────────────────────────────────────────
    try:
        contacts = _fetch_all_contacts()
    except Exception as e:
        errors.append(f'contacts fetch error: {e}')
        contacts = []

    print(f'[extract_brevo] {len(contacts)} contacts found')

    # Single Channel entity the whole list subscribes to. List subscription is
    # NOT feedback — emit SUBSCRIBED_TO -> Channel, never GAVE_FEEDBACK self-loop.
    channel_id = None
    if not dry_run and contacts:
        channel_id, _ = find_or_create_entity('Channel', 'Brevo Email List')

    for contact in contacts:
        brevo_id   = contact.get('id')
        email      = (contact.get('email') or '').strip().lower()
        attrs      = contact.get('attributes') or {}
        first_name = (attrs.get('FIRSTNAME') or '').strip()
        last_name  = (attrs.get('LASTNAME') or '').strip()
        created_at = contact.get('createdAt') or ''
        blacklisted = contact.get('emailBlacklisted', False)

        if not email:
            continue

        # Derive display name
        full_name = f'{first_name} {last_name}'.strip() or email

        source_id = f'brevo_contact_{brevo_id}'
        if already_processed('extract_brevo', source_id):
            continue

        if dry_run:
            status = 'UNSUB' if blacklisted else 'active'
            print(f'[DRY] Contact: {full_name!r} <{email}> — {status}')
            continue

        occurred_at = None
        if created_at:
            try:
                occurred_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.brevo',
            source='extract_brevo',
            source_id=source_id,
            payload={
                'brevoId': brevo_id,
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'blacklisted': blacklisted,
                'createdAt': created_at,
            },
            occurred_at=occurred_at,
        )

        customer_id, customer_created = find_or_create_entity('Customer', full_name)
        if customer_created:
            customers_written += 1
            print(f'  [customer] {full_name} <{email}>')

        # Record their email-list opt-in as SUBSCRIBED_TO -> Channel.
        # (Previously mis-recorded as a GAVE_FEEDBACK self-loop, which conflated
        # list membership with real feedback; migrated 2026-06-29.)
        write_assertion(
            src_id=customer_id, dst_id=channel_id,
            rel_type='SUBSCRIBED_TO',
            ledger_event_id=ledger_id,
            confidence=0.9,
            metadata={
                'source': 'brevo',
                'channel': 'email_list',
                'email': email,
                'subscribed': not blacklisted,
                'subscribedAt': created_at,
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

    # ── Campaigns → Note entities ─────────────────────────────────────────────
    try:
        campaigns = _fetch_all_campaigns()
    except Exception as e:
        errors.append(f'campaigns fetch error: {e}')
        campaigns = []

    print(f'[extract_brevo] {len(campaigns)} sent campaigns found')

    for campaign in campaigns:
        campaign_id   = campaign.get('id')
        name          = (campaign.get('name') or '').strip()
        subject       = (campaign.get('subject') or '').strip()
        scheduled_at  = campaign.get('scheduledAt') or ''
        recipients    = campaign.get('recipients') or {}
        lists_count   = len(recipients.get('lists', [])) if isinstance(recipients, dict) else 0

        if not name:
            continue

        source_id = f'brevo_campaign_{campaign_id}'
        if already_processed('extract_brevo', source_id):
            continue

        if dry_run:
            print(f'[DRY] Campaign: {name!r} — {subject!r} — {scheduled_at[:10] if scheduled_at else "?"}')
            continue

        occurred_at = None
        if scheduled_at:
            try:
                occurred_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.brevo',
            source='extract_brevo',
            source_id=source_id,
            payload={
                'campaignId': campaign_id,
                'name': name,
                'subject': subject,
                'scheduledAt': scheduled_at,
            },
            occurred_at=occurred_at,
        )

        note_name = f'Email: {name}'
        note_id, note_created = find_or_create_entity('Note', note_name)
        if note_created:
            campaigns_written += 1
            print(f'  [note] {note_name}')

        write_assertion(
            src_id=note_id, dst_id=note_id,
            rel_type='ABOUT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'brevo',
                'channel': 'email_campaign',
                'campaignId': campaign_id,
                'subject': subject,
                'sentAt': scheduled_at,
                'category': 'email_marketing',
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

    return {
        'customers_written': customers_written,
        'campaigns_written': campaigns_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
