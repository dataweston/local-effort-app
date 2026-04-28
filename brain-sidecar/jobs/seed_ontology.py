"""
Job: seed_ontology

Relationship names seeded here should stay in sync with
backend/api/brain/relationshipDictionary.js.

Seeds the foundational strategic entity classes that the gmail extractor
and other jobs can then connect assertions to. No LLM required — these
are facts we know about the business.

Entity classes created:
  BusinessLine    — the distinct business models Local Effort operates
  Offer           — named, saleable packages/services
  Occasion        — buying triggers / contexts
  Channel         — how customers find and buy
  CustomerSegment — distinct demand groups
  ProcessStep     — key operational steps
  Constraint      — hard limits on scale/capacity
  NarrativeTheme  — brand/content pillars
  Metric          — tracked business metrics

Assertions created:
  BusinessLine → GENERATES_REVENUE_FOR → BusinessLine (hierarchies)
  Offer        → SERVES_SEGMENT        → CustomerSegment
  Offer        → TRIGGERED_BY_OCCASION → Occasion
  Offer        → CONSTRAINED_BY        → Constraint
  Offer        → HAS_MARGIN_DRIVER     → Asset/ProcessStep
  Dish         → APPEARS_ON            → Offer (links existing dishes)
  Channel      → SERVES_SEGMENT        → CustomerSegment
  NarrativeTheme → CREATES_CONTENT_ANGLE → Offer

Re-running is idempotent via already_processed checks.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.chdir(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('.env'))

from datetime import datetime, timezone
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

DRY_RUN = '--dry-run' in sys.argv
SOURCE = 'seed_ontology'


def _write(src_type, src_name, rel_type, dst_type, dst_name, confidence=0.95, provisional=False, metadata=None):
    source_id = f'{SOURCE}_{src_type}_{src_name}_{rel_type}_{dst_type}_{dst_name}'.replace(' ', '_').lower()[:120]
    if already_processed(SOURCE, source_id):
        return 0
    if DRY_RUN:
        print(f'  [DRY] {src_type}:{src_name} --{rel_type}--> {dst_type}:{dst_name}')
        return 0
    src_id, _ = find_or_create_entity(src_type, src_name)
    dst_id, _ = find_or_create_entity(dst_type, dst_name)
    ledger_id = write_ledger_event(
        event_type='ontology.seed',
        source=SOURCE,
        source_id=source_id,
        payload={'src': src_name, 'rel': rel_type, 'dst': dst_name},
    )
    write_assertion(
        src_id=src_id,
        dst_id=dst_id,
        rel_type=rel_type,
        ledger_event_id=ledger_id,
        confidence=confidence,
        metadata=metadata or {},
        provisional=provisional,
    )
    return 1


def _entity(entity_type, name, properties=None):
    source_id = f'{SOURCE}_entity_{entity_type}_{name}'.replace(' ', '_').lower()[:120]
    if already_processed(SOURCE, source_id):
        return find_or_create_entity(entity_type, name)[0]
    if DRY_RUN:
        print(f'  [DRY] CREATE {entity_type}: {name}')
        return None
    entity_id, created = find_or_create_entity(entity_type, name)
    if created and properties:
        from db import execute
        import json
        execute(
            'UPDATE "BrainEntity" SET properties = %s::jsonb WHERE id = %s',
            (json.dumps(properties), entity_id)
        )
    write_ledger_event(
        event_type='ontology.seed',
        source=SOURCE,
        source_id=source_id,
        payload={'entityType': entity_type, 'name': name},
    )
    return entity_id


def run(dry_run: bool = False) -> dict:
    global DRY_RUN
    if dry_run:
        DRY_RUN = True

    print(f'[seed_ontology] dry_run={DRY_RUN}')
    written = 0

    # ── Business Lines ────────────────────────────────────────────────────────
    print('\n[seed_ontology] Business Lines')
    business_lines = [
        ('Weekly Meal Subscription', {'description': 'Weekly prepared meal service for households', 'cadence': 'weekly', 'format': 'subscription'}),
        ('Private Dinners & Events', {'description': 'Bespoke catering for private parties, weddings, corporate events', 'format': 'project'}),
        ('Local Effort Pizza', {'description': 'Pizza pop-ups and pizza-specific events', 'format': 'pop-up'}),
        ('Wholesale & Bread', {'description': 'Wholesale bread and prepared goods supply to retail/restaurants', 'format': 'wholesale'}),
        ('Farmers Market', {'description': 'Direct-to-consumer sales at farmers markets', 'format': 'market'}),
    ]
    for name, props in business_lines:
        _entity('BusinessLine', name, props)

    # ── Offers ────────────────────────────────────────────────────────────────
    print('\n[seed_ontology] Offers')
    offers = [
        ('Weekly Meal Box', {'description': 'Weekly prepared meals for 2-4 people, subscription or one-time', 'priceSignal': '$150-300/week', 'repeatability': 'high'}),
        ('Private Dinner — Seated', {'description': 'Full-service plated dinner at client location', 'priceSignal': '$100-200/person', 'repeatability': 'medium'}),
        ('Private Dinner — Buffet', {'description': 'Buffet-style catering for larger gatherings', 'priceSignal': '$75-125/person', 'repeatability': 'medium'}),
        ('Wedding Catering', {'description': 'Full wedding food and beverage service', 'priceSignal': '$5000-20000', 'repeatability': 'low'}),
        ('Corporate Lunch', {'description': 'Office lunch catering for teams', 'priceSignal': '$25-50/person', 'repeatability': 'high'}),
        ('Pizza Pop-Up', {'description': 'Wood-fired or home-oven pizza event', 'priceSignal': '$15-25/person', 'repeatability': 'high'}),
        ('Wholesale Bread Supply', {'description': 'Weekly bread supply to retail accounts', 'priceSignal': 'wholesale', 'repeatability': 'high'}),
        ('Custom Menu Development', {'description': 'Bespoke menu design for events or retail', 'repeatability': 'low'}),
    ]
    for name, props in offers:
        _entity('Offer', name, props)

    # ── Customer Segments ─────────────────────────────────────────────────────
    print('\n[seed_ontology] Customer Segments')
    segments = [
        ('Busy Families', {'description': 'Households wanting quality meals without cooking time', 'repeatPotential': 'high', 'priceToleranceSignal': 'medium-high'}),
        ('Event Hosts', {'description': 'Private individuals hosting dinners, celebrations, weddings', 'repeatPotential': 'medium', 'priceToleranceSignal': 'high'}),
        ('Corporate Accounts', {'description': 'Offices and companies booking recurring team meals', 'repeatPotential': 'high', 'priceToleranceSignal': 'medium'}),
        ('Wholesale Buyers', {'description': 'Cafes, restaurants, retail stores buying bread/goods wholesale', 'repeatPotential': 'high', 'priceToleranceSignal': 'low-medium'}),
        ('Farmers Market Shoppers', {'description': 'Direct consumers at markets, often first touchpoint', 'repeatPotential': 'medium', 'priceToleranceSignal': 'medium'}),
        ('Wedding Couples', {'description': 'Engaged couples planning wedding catering', 'repeatPotential': 'low', 'priceToleranceSignal': 'high'}),
    ]
    for name, props in segments:
        _entity('CustomerSegment', name, props)

    # ── Occasions ─────────────────────────────────────────────────────────────
    print('\n[seed_ontology] Occasions')
    occasions = [
        ('Birthday Dinner', {}),
        ('Wedding Reception', {}),
        ('Corporate Team Lunch', {}),
        ('Holiday Gathering', {}),
        ('Weekly Family Dinner', {}),
        ('Anniversary Celebration', {}),
        ('Client Entertainment', {}),
        ('Farmers Market Weekend', {}),
        ('Seasonal Pop-Up', {}),
    ]
    for name, props in occasions:
        _entity('Occasion', name, props)

    # ── Channels ─────────────────────────────────────────────────────────────
    print('\n[seed_ontology] Channels')
    channels = [
        ('Word of Mouth & Referrals', {'description': 'Primary acquisition channel — existing customers refer', 'costSignal': 'zero', 'quality': 'highest'}),
        ('Instagram', {'description': 'Visual content driving awareness and DMs', 'costSignal': 'time', 'quality': 'high'}),
        ('Email List (Brevo)', {'description': 'Weekly newsletter and offer announcements', 'costSignal': 'low', 'quality': 'high'}),
        ('Farmers Market', {'description': 'Direct in-person sales and relationship building', 'costSignal': 'medium', 'quality': 'high'}),
        ('Wedding Platforms', {'description': 'WeddingPro, TheKnot — wedding vendor discovery', 'costSignal': 'medium', 'quality': 'medium'}),
        ('Direct Outreach', {'description': 'Cold and warm outreach to businesses and wholesalers', 'costSignal': 'time', 'quality': 'medium'}),
    ]
    for name, props in channels:
        _entity('Channel', name, props)

    # ── Process Steps ─────────────────────────────────────────────────────────
    print('\n[seed_ontology] Process Steps')
    process_steps = [
        ('Menu Planning', {'description': 'Weekly or event-specific menu design', 'bottleneckRisk': 'medium'}),
        ('Ingredient Sourcing', {'description': 'Ordering from CPW, Eastside, and local farms', 'bottleneckRisk': 'high'}),
        ('Mise en Place', {'description': 'Prep work before cooking service', 'bottleneckRisk': 'medium'}),
        ('Cooking & Production', {'description': 'Active cooking — primary labor constraint', 'bottleneckRisk': 'high'}),
        ('Packaging & Labeling', {'description': 'Portioning and packaging finished meals', 'bottleneckRisk': 'medium'}),
        ('Delivery & Logistics', {'description': 'Customer delivery, market transport', 'bottleneckRisk': 'high'}),
        ('Customer Communication', {'description': 'Order intake, confirmations, dietary tracking', 'bottleneckRisk': 'medium'}),
        ('Billing & Invoicing', {'description': 'Square, manual invoicing, payment collection', 'bottleneckRisk': 'low'}),
    ]
    for name, props in process_steps:
        _entity('ProcessStep', name, props)

    # ── Constraints ───────────────────────────────────────────────────────────
    print('\n[seed_ontology] Constraints')
    constraints = [
        ('Oven Capacity', {'description': 'Limited oven space caps simultaneous production volume', 'severity': 4}),
        ('Labor Hours', {'description': 'Single operator (Weston) is primary production constraint', 'severity': 5}),
        ('Delivery Radius', {'description': 'Twin Cities metro — distance limits delivery feasibility', 'severity': 3}),
        ('Shelf Life', {'description': 'Prepared food shelf life limits advance production', 'severity': 4}),
        ('Refrigeration Capacity', {'description': 'Storage limits how far ahead meals can be prepped', 'severity': 3}),
        ('Customization Creep', {'description': 'Per-customer dietary accommodations multiply complexity', 'severity': 4}),
        ('Seasonal Ingredient Availability', {'description': 'Local sourcing creates menu seasonality constraints', 'severity': 2}),
    ]
    for name, props in constraints:
        _entity('Constraint', name, props)

    # ── Narrative Themes ──────────────────────────────────────────────────────
    print('\n[seed_ontology] Narrative Themes')
    themes = [
        ('Local Sourcing', {'description': 'Relationships with Minnesota farms and producers as differentiation'}),
        ('Craft & Seasonality', {'description': 'Menu changes with what is fresh and excellent right now'}),
        ('Hospitality & Repeat Nourishment', {'description': 'The weekly rhythm of feeding people well builds trust over time'}),
        ('Founder Transparency', {'description': 'Weston visible in the work — this is someone cooking for you, not a company'}),
        ('Food as Community', {'description': 'Tables, gatherings, shared meals as the product, not just food'}),
    ]
    for name, props in themes:
        _entity('NarrativeTheme', name, props)

    # ── Key Metrics ───────────────────────────────────────────────────────────
    print('\n[seed_ontology] Metrics')
    metrics = [
        ('Gross Margin per Meal Box', {'description': 'Revenue minus COGS per weekly box', 'target': '>50%'}),
        ('Labor Hours per Event', {'description': 'Total prep + service hours per catering job', 'target': '<12h for standard dinner'}),
        ('Customer Retention Rate', {'description': 'Percentage of meal box subscribers reordering month-over-month', 'target': '>80%'}),
        ('Average Order Value', {'description': 'Mean transaction size across all business lines'}),
        ('Orders per Week', {'description': 'Total active weekly meal subscriptions at any point'}),
        ('Ingredient Cost Ratio', {'description': 'COGS as percentage of revenue', 'target': '<35%'}),
    ]
    for name, props in metrics:
        _entity('Metric', name, props)

    # ── Assertions: Offer → Segment ───────────────────────────────────────────
    print('\n[seed_ontology] Offer → Segment assertions')
    offer_segment = [
        ('Weekly Meal Box',          'SERVES_SEGMENT', 'Busy Families'),
        ('Weekly Meal Box',          'SERVES_SEGMENT', 'Corporate Accounts'),
        ('Private Dinner — Seated',  'SERVES_SEGMENT', 'Event Hosts'),
        ('Private Dinner — Buffet',  'SERVES_SEGMENT', 'Event Hosts'),
        ('Wedding Catering',         'SERVES_SEGMENT', 'Wedding Couples'),
        ('Corporate Lunch',          'SERVES_SEGMENT', 'Corporate Accounts'),
        ('Pizza Pop-Up',             'SERVES_SEGMENT', 'Event Hosts'),
        ('Pizza Pop-Up',             'SERVES_SEGMENT', 'Farmers Market Shoppers'),
        ('Wholesale Bread Supply',   'SERVES_SEGMENT', 'Wholesale Buyers'),
    ]
    for src, rel, dst in offer_segment:
        written += _write('Offer', src, rel, 'CustomerSegment', dst)

    # ── Assertions: Offer → Occasion ─────────────────────────────────────────
    print('\n[seed_ontology] Offer → Occasion assertions')
    offer_occasion = [
        ('Private Dinner — Seated', 'TRIGGERED_BY_OCCASION', 'Birthday Dinner'),
        ('Private Dinner — Seated', 'TRIGGERED_BY_OCCASION', 'Anniversary Celebration'),
        ('Private Dinner — Seated', 'TRIGGERED_BY_OCCASION', 'Client Entertainment'),
        ('Wedding Catering',        'TRIGGERED_BY_OCCASION', 'Wedding Reception'),
        ('Corporate Lunch',         'TRIGGERED_BY_OCCASION', 'Corporate Team Lunch'),
        ('Pizza Pop-Up',            'TRIGGERED_BY_OCCASION', 'Seasonal Pop-Up'),
        ('Pizza Pop-Up',            'TRIGGERED_BY_OCCASION', 'Holiday Gathering'),
        ('Weekly Meal Box',         'TRIGGERED_BY_OCCASION', 'Weekly Family Dinner'),
    ]
    for src, rel, dst in offer_occasion:
        written += _write('Offer', src, rel, 'Occasion', dst)

    # ── Assertions: Offer → Constraint ───────────────────────────────────────
    print('\n[seed_ontology] Offer → Constraint assertions')
    offer_constraint = [
        ('Private Dinner — Seated', 'CONSTRAINED_BY', 'Labor Hours'),
        ('Private Dinner — Seated', 'CONSTRAINED_BY', 'Customization Creep'),
        ('Wedding Catering',        'CONSTRAINED_BY', 'Labor Hours'),
        ('Wedding Catering',        'CONSTRAINED_BY', 'Delivery Radius'),
        ('Weekly Meal Box',         'CONSTRAINED_BY', 'Refrigeration Capacity'),
        ('Weekly Meal Box',         'CONSTRAINED_BY', 'Shelf Life'),
        ('Weekly Meal Box',         'CONSTRAINED_BY', 'Customization Creep'),
        ('Pizza Pop-Up',            'CONSTRAINED_BY', 'Oven Capacity'),
        ('Wholesale Bread Supply',  'CONSTRAINED_BY', 'Oven Capacity'),
        ('Wholesale Bread Supply',  'CONSTRAINED_BY', 'Labor Hours'),
    ]
    for src, rel, dst in offer_constraint:
        written += _write('Offer', src, rel, 'Constraint', dst)

    # ── Assertions: Offer → BusinessLine ─────────────────────────────────────
    print('\n[seed_ontology] Offer → BusinessLine assertions')
    offer_bl = [
        ('Weekly Meal Box',          'GENERATES_REVENUE_FOR', 'Weekly Meal Subscription'),
        ('Private Dinner — Seated',  'GENERATES_REVENUE_FOR', 'Private Dinners & Events'),
        ('Private Dinner — Buffet',  'GENERATES_REVENUE_FOR', 'Private Dinners & Events'),
        ('Wedding Catering',         'GENERATES_REVENUE_FOR', 'Private Dinners & Events'),
        ('Corporate Lunch',          'GENERATES_REVENUE_FOR', 'Private Dinners & Events'),
        ('Pizza Pop-Up',             'GENERATES_REVENUE_FOR', 'Local Effort Pizza'),
        ('Wholesale Bread Supply',   'GENERATES_REVENUE_FOR', 'Wholesale & Bread'),
    ]
    for src, rel, dst in offer_bl:
        written += _write('Offer', src, rel, 'BusinessLine', dst)

    # ── Assertions: Channel → Segment ────────────────────────────────────────
    print('\n[seed_ontology] Channel → Segment assertions')
    channel_segment = [
        ('Word of Mouth & Referrals', 'SERVES_SEGMENT', 'Busy Families'),
        ('Word of Mouth & Referrals', 'SERVES_SEGMENT', 'Event Hosts'),
        ('Instagram',                 'SERVES_SEGMENT', 'Farmers Market Shoppers'),
        ('Instagram',                 'SERVES_SEGMENT', 'Event Hosts'),
        ('Email List (Brevo)',         'SERVES_SEGMENT', 'Busy Families'),
        ('Farmers Market',            'SERVES_SEGMENT', 'Farmers Market Shoppers'),
        ('Wedding Platforms',         'SERVES_SEGMENT', 'Wedding Couples'),
        ('Direct Outreach',           'SERVES_SEGMENT', 'Corporate Accounts'),
        ('Direct Outreach',           'SERVES_SEGMENT', 'Wholesale Buyers'),
    ]
    for src, rel, dst in channel_segment:
        written += _write('Channel', src, rel, 'CustomerSegment', dst)

    # ── Assertions: NarrativeTheme → Offer ───────────────────────────────────
    print('\n[seed_ontology] NarrativeTheme → Offer assertions')
    theme_offer = [
        ('Local Sourcing',              'CREATES_CONTENT_ANGLE', 'Weekly Meal Box'),
        ('Local Sourcing',              'CREATES_CONTENT_ANGLE', 'Wholesale Bread Supply'),
        ('Craft & Seasonality',         'CREATES_CONTENT_ANGLE', 'Weekly Meal Box'),
        ('Craft & Seasonality',         'CREATES_CONTENT_ANGLE', 'Private Dinner — Seated'),
        ('Hospitality & Repeat Nourishment', 'CREATES_CONTENT_ANGLE', 'Weekly Meal Box'),
        ('Founder Transparency',        'CREATES_CONTENT_ANGLE', 'Weekly Meal Box'),
        ('Food as Community',           'CREATES_CONTENT_ANGLE', 'Private Dinner — Seated'),
        ('Food as Community',           'CREATES_CONTENT_ANGLE', 'Pizza Pop-Up'),
    ]
    for src, rel, dst in theme_offer:
        written += _write('NarrativeTheme', src, rel, 'Offer', dst)

    # ── Assertions: ProcessStep → Constraint ─────────────────────────────────
    print('\n[seed_ontology] ProcessStep → Constraint assertions')
    step_constraint = [
        ('Cooking & Production',    'CONSTRAINED_BY', 'Oven Capacity'),
        ('Cooking & Production',    'CONSTRAINED_BY', 'Labor Hours'),
        ('Delivery & Logistics',    'CONSTRAINED_BY', 'Delivery Radius'),
        ('Ingredient Sourcing',     'CONSTRAINED_BY', 'Seasonal Ingredient Availability'),
        ('Customer Communication',  'CONSTRAINED_BY', 'Customization Creep'),
        ('Packaging & Labeling',    'CONSTRAINED_BY', 'Labor Hours'),
    ]
    for src, rel, dst in step_constraint:
        written += _write('ProcessStep', src, rel, 'Constraint', dst)

    print(f'\n[seed_ontology] done. wrote {written} assertions.')
    return {'assertions_written': written}


if __name__ == '__main__':
    import json
    result = run(dry_run='--dry-run' in sys.argv)
    print(json.dumps(result, indent=2))
