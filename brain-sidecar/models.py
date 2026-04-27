"""
Pydantic extraction models — typed schemas for Instructor structured output.

Design principles:
- Capture more than needed now; fields are nullable so they never block extraction
- Every extracted fact carries provenance (source_span) for human review
- Confidence is self-reported by the model with rationale
- Bi-temporal: valid_date (when true in world) vs extraction_date (when we learned it)
- Entity resolution happens at write time against existing DB entities
"""

from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Shared primitives ─────────────────────────────────────────────────────────

class MonetaryAmount(BaseModel):
    dollars: float
    currency: str = 'USD'
    raw_text: str | None = Field(None, description="Original text that contained the amount, e.g. '$2,790.30'")


class ContactInfo(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None


class TemporalRef(BaseModel):
    """A date or date range mentioned in the text."""
    iso_date: str | None = Field(None, description="ISO 8601 date if determinable, e.g. 2026-04-15")
    raw_text: str = Field(description="Original text, e.g. 'next Monday', 'week ending March 7'")
    is_approximate: bool = False


# ── Email classification ──────────────────────────────────────────────────────

EmailCategory = Literal[
    'vendor_order',          # you placed an order with a supplier
    'vendor_invoice',        # supplier sent you an invoice
    'vendor_quote',          # supplier sent a price quote
    'vendor_delivery',       # delivery confirmation from supplier
    'vendor_payment',        # payment to/from a vendor
    'customer_inquiry',      # customer asking about menu/catering/availability
    'customer_order',        # customer placed an order with you
    'customer_payment',      # payment received from customer
    'menu_proposal',         # you or someone sent a menu proposal
    'catering_inquiry',      # catering request or proposal
    'internal_ops',          # internal operational note
    'noise',                 # marketing, saas receipts, newsletters, irrelevant
]

DirectionType = Literal['inbound', 'outbound', 'unknown']


# ── Dish / Menu models ────────────────────────────────────────────────────────

class DietaryTag(BaseModel):
    tag: Literal['vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free',
                 'halal', 'kosher', 'raw', 'paleo', 'contains_shellfish',
                 'contains_nuts', 'spicy', 'low_carb', 'high_protein']
    inferred: bool = Field(False, description="True if inferred from description, not stated explicitly")


class DishExtraction(BaseModel):
    name: str = Field(description="Dish name as written")
    description: str | None = Field(None, description="Full description as written")
    ingredients_mentioned: list[str] = Field(
        default_factory=list,
        description="Ingredient names explicitly mentioned"
    )
    dietary_tags: list[DietaryTag] = Field(default_factory=list)
    price: MonetaryAmount | None = None
    portion_size: str | None = Field(None, description="e.g. 'serves 2', '8oz', 'family style'")
    course: Literal['appetizer', 'soup', 'salad', 'main', 'side', 'dessert', 'beverage', 'unknown'] = 'unknown'
    source_span: str | None = Field(None, description="Exact text from email that describes this dish")
    confidence: float = Field(0.8, ge=0.1, le=1.0)


class MenuExtraction(BaseModel):
    """A menu found in an email — could be a proposal, weekly menu, catering offer, etc."""
    menu_name: str | None = Field(None, description="Menu title if stated, e.g. 'Week of April 22 Menu'")
    menu_type: Literal['weekly', 'catering', 'event', 'seasonal', 'tasting', 'unknown'] = 'unknown'
    valid_date: TemporalRef | None = Field(None, description="When this menu is/was valid")
    serves: str | None = Field(None, description="e.g. '35 guests', 'family of 4'")
    price_per_person: MonetaryAmount | None = None
    total_price: MonetaryAmount | None = None
    dishes: list[DishExtraction] = Field(default_factory=list)
    notes: str | None = Field(None, description="Any special notes, restrictions, or context")
    source_span: str | None = Field(None, description="The block of text in the email that is the menu")
    confidence: float = Field(0.8, ge=0.1, le=1.0)


# ── Vendor / order signals ────────────────────────────────────────────────────

class LineItem(BaseModel):
    description: str
    quantity: float | None = None
    unit: str | None = Field(None, description="e.g. 'lb', 'case', 'bunch', 'each'")
    unit_price: MonetaryAmount | None = None
    line_total: MonetaryAmount | None = None
    ingredient_name: str | None = Field(None, description="Normalized ingredient name if this is a food item")


class VendorSignal(BaseModel):
    """A single actionable signal about a vendor relationship."""
    vendor_name: str = Field(description="Canonical vendor/supplier name")
    signal_type: Literal[
        'order_placed',
        'order_confirmed',
        'invoice_received',
        'invoice_overdue',
        'price_quote',
        'delivery_confirmed',
        'delivery_failed',
        'payment_sent',
        'payment_received',
        'payment_overdue',
        'contract_signed',
        'relationship_started',
        'relationship_ended',
    ]
    direction: DirectionType = Field(
        description="inbound=vendor→you, outbound=you→vendor"
    )
    invoice_number: str | None = None
    order_number: str | None = None
    amount: MonetaryAmount | None = None
    amount_outstanding: MonetaryAmount | None = None
    line_items: list[LineItem] = Field(default_factory=list)
    date: TemporalRef | None = Field(None, description="Transaction date")
    due_date: TemporalRef | None = None
    delivery_date: TemporalRef | None = None
    contact: ContactInfo | None = None
    notes: str | None = None
    source_span: str | None = Field(None, description="Relevant excerpt from email body")
    confidence: float = Field(0.75, ge=0.1, le=1.0)
    rationale: str = Field(description="One sentence: why you extracted this signal")


class CustomerSignal(BaseModel):
    """A signal about a customer interaction."""
    customer_name: str | None = None
    customer_email: str | None = None
    signal_type: Literal[
        'inquiry',
        'order_placed',
        'order_confirmed',
        'payment_received',
        'refund_requested',
        'feedback_given',
        'cancellation',
    ]
    event_date: TemporalRef | None = None
    guest_count: int | None = None
    event_type: str | None = Field(None, description="e.g. 'wedding', 'birthday', 'corporate lunch'")
    amount: MonetaryAmount | None = None
    notes: str | None = None
    source_span: str | None = None
    confidence: float = Field(0.75, ge=0.1, le=1.0)
    rationale: str


# ── Full email thread extraction ──────────────────────────────────────────────

class EmailThreadExtraction(BaseModel):
    """
    Complete structured extraction from one email thread.
    All list fields default to empty — extract only what's clearly present.
    """
    category: EmailCategory
    direction: DirectionType
    is_relevant: bool = Field(
        description="True if thread contains anything actionable for the food business knowledge graph"
    )
    summary: str = Field(description="One sentence: what this thread is about")

    # Participants
    sender_name: str | None = None
    sender_email: str | None = None
    recipient_names: list[str] = Field(default_factory=list)

    # Signals
    vendor_signals: list[VendorSignal] = Field(default_factory=list)
    customer_signals: list[CustomerSignal] = Field(default_factory=list)
    menus: list[MenuExtraction] = Field(default_factory=list)

    # Loose structured fields for things that don't fit a signal
    ingredients_mentioned: list[str] = Field(
        default_factory=list,
        description="Ingredient names mentioned anywhere in the thread"
    )
    entities_mentioned: list[str] = Field(
        default_factory=list,
        description="Any other named entities (venues, events, certifications, etc.)"
    )

    # Overall extraction quality
    extraction_confidence: float = Field(0.8, ge=0.1, le=1.0)
    needs_human_review: bool = Field(
        False,
        description="True if ambiguous, contradictory, or contains medical/legal/financial decisions"
    )
    review_reason: str | None = None


# ── Square payment extraction ─────────────────────────────────────────────────

class SquarePaymentSignal(BaseModel):
    vendor_name: str | None = Field(None, description="Vendor name if this is a vendor payment")
    customer_name: str | None = Field(None, description="Customer name if this is a customer payment")
    payment_type: Literal['vendor_payment', 'customer_payment', 'unknown']
    item_description: str | None = None
    confidence: float = Field(0.8, ge=0.1, le=0.95)
    rationale: str


# ── Inbox item triage ─────────────────────────────────────────────────────────

class InboxTriageDecision(BaseModel):
    action: Literal['new_entity', 'append_entity', 'new_task', 'trash', 'needs_human']
    entity_type: str | None = None
    entity_name: str | None = None
    note: str | None = None
    task_title: str | None = None
    confidence: float = Field(0.75, ge=0.1, le=0.95)
    rationale: str

    def validate_action(self) -> list[str]:
        errors = []
        if self.action == 'new_entity' and not self.entity_name:
            errors.append("entity_name required for new_entity")
        if self.action == 'new_task' and not self.task_title:
            errors.append("task_title required for new_task")
        return errors


# ── Vendor relationship extraction (from invoice/email body) ──────────────────

class VendorRelationship(BaseModel):
    vendor_name: str
    ingredient_name: str
    unit: str | None = None
    price_per_unit: float | None = None
    confidence: float = Field(0.7, ge=0.1, le=0.95)
    rationale: str


class VendorRelationshipExtraction(BaseModel):
    relationships: list[VendorRelationship] = Field(default_factory=list)
