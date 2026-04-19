"""
Pydantic extraction models — typed schemas for Instructor structured output.
Each model maps to one or more BrainAssertion rel types.
"""

from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field


# ── Email thread extraction ───────────────────────────────────────────────────

class EmailVendorSignal(BaseModel):
    """Signals extracted from a single email thread."""

    vendor_name: str = Field(description="Canonical vendor/supplier name mentioned")
    signal_type: Literal['order_placed', 'invoice_received', 'price_quote', 'delivery_confirmed', 'payment_due']
    amount_dollars: float | None = Field(None, description="Dollar amount if mentioned")
    item_description: str | None = Field(None, description="What was ordered or invoiced")
    date_mentioned: str | None = Field(None, description="ISO date mentioned in thread, e.g. 2026-04-15")
    confidence: float = Field(0.7, ge=0.1, le=0.95, description="Extraction confidence")
    rationale: str = Field(description="One sentence explaining why you extracted this")


class EmailThreadExtraction(BaseModel):
    """All signals extracted from one email thread."""
    signals: list[EmailVendorSignal] = Field(default_factory=list)
    is_relevant: bool = Field(description="True if thread contains actionable vendor/customer signals")
    summary: str = Field(description="One sentence summary of what this thread is about")


# ── Square payment extraction ─────────────────────────────────────────────────

class SquarePaymentSignal(BaseModel):
    """Structured extraction from a Square payment's note/description field."""
    vendor_name: str | None = Field(None, description="Vendor name if this is a vendor payment")
    customer_name: str | None = Field(None, description="Customer name if this is a customer payment")
    payment_type: Literal['vendor_payment', 'customer_payment', 'unknown']
    item_description: str | None = Field(None, description="What was purchased")
    confidence: float = Field(0.8, ge=0.1, le=0.95)
    rationale: str


# ── Inbox item triage extraction ──────────────────────────────────────────────

class InboxTriageDecision(BaseModel):
    """Triage decision for a pending BrainInboxItem."""

    action: Literal['new_entity', 'append_entity', 'new_task', 'trash', 'needs_human']
    entity_type: str | None = Field(None, description="For new_entity: Vendor, Customer, Ingredient, etc.")
    entity_name: str | None = Field(None, description="For new_entity: canonical name")
    note: str | None = Field(None, description="For append_entity: note content to attach")
    task_title: str | None = Field(None, description="For new_task: task title")
    confidence: float = Field(0.75, ge=0.1, le=0.95)
    rationale: str = Field(description="Why you chose this action")

    def validate_action(self) -> list[str]:
        errors = []
        if self.action == 'new_entity' and not self.entity_name:
            errors.append("entity_name required for new_entity")
        if self.action == 'new_task' and not self.task_title:
            errors.append("task_title required for new_task")
        return errors


# ── Vendor relationship extraction ───────────────────────────────────────────

class VendorRelationship(BaseModel):
    """A single vendor→ingredient supply relationship inferred from text."""
    vendor_name: str
    ingredient_name: str
    unit: str | None = None
    price_per_unit: float | None = None
    confidence: float = Field(0.7, ge=0.1, le=0.95)
    rationale: str


class VendorRelationshipExtraction(BaseModel):
    relationships: list[VendorRelationship] = Field(default_factory=list)
