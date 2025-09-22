from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RecipeDoc:
    """Canonical recipe document shared by harvest parsers."""

    id: str
    source: str
    title: str
    ingredients: List[str] = field(default_factory=list)
    instructions: List[str] = field(default_factory=list)
    description: Optional[str] = None
    subjects: List[str] = field(default_factory=list)
    creators: List[str] = field(default_factory=list)
    publisher: Optional[str] = None
    date: Optional[str] = None
    year: Optional[str] = None
    location: Dict[str, str] = field(default_factory=dict)
    institution: Optional[str] = None
    iiif_manifest: Optional[str] = None
    digital_url: Optional[str] = None
    digital_urls: List[str] = field(default_factory=list)
    image_preview: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a dict without empty optional fields."""
        data: Dict[str, Any] = {
            "id": self.id,
            "source": self.source,
            "title": self.title,
            "ingredients": [v for v in self.ingredients if v],
            "instructions": [v for v in self.instructions if v],
        }
        optional: Dict[str, Any] = {
            "description": self.description,
            "subjects": [v for v in self.subjects if v],
            "digital_url": self.digital_url,
            "creators": [v for v in self.creators if v],
            "publisher": self.publisher,
            "date": self.date,
            "year": self.year,
            "location": {k: v for k, v in self.location.items() if v},
            "institution": self.institution,
            "iiif_manifest": self.iiif_manifest,
            "digital_url": self.digital_url,
            "digital_urls": [v for v in self.digital_urls if v],
            "image_preview": self.image_preview,
            "metadata": self.metadata,
        }
        for key, value in optional.items():
            if value:
                data[key] = value
        return data


def ensure_list(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value).strip()]


def ensure_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None




