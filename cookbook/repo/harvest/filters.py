from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List

from .terms import flatten_terms, load_terms


@dataclass
class FilterResult:
    score: int
    details: Dict[str, Any]


class HarvestFilter:
    """Score harvested records and decide whether to keep them."""

    def __init__(self, min_score: int = 3) -> None:
        terms = load_terms()
        allow = terms.get("allow", {})
        locations = allow.get("locations", {})
        primary_states = flatten_terms(locations.get("states", []))
        secondary_states = flatten_terms(locations.get("states_tier2", []))
        primary_state_abbr = flatten_terms(locations.get("state_abbreviations", []))
        secondary_state_abbr = flatten_terms(locations.get("state_abbreviations_tier2", []))

        self.primary_states = [t.lower() for t in primary_states]
        self.secondary_states = [t.lower() for t in secondary_states]
        self.primary_state_abbr = [t.lower() for t in primary_state_abbr]
        self.secondary_state_abbr = [t.lower() for t in secondary_state_abbr]
        self.states = list(dict.fromkeys(self.primary_states + self.secondary_states))
        self.state_abbr = list(dict.fromkeys(self.primary_state_abbr + self.secondary_state_abbr))
        self.counties = [t.lower() for t in flatten_terms(locations.get("counties", []))]
        self.cities = [t.lower() for t in flatten_terms(locations.get("cities", []))]
        self.regions = [t.lower() for t in flatten_terms(locations.get("regions", []))]
        community_terms = flatten_terms(allow.get("community", []), allow.get("institutions", []))
        self.community_terms = [t.lower() for t in community_terms]
        deny = terms.get("deny", {})
        self.negative_terms = [t.lower() for t in flatten_terms(deny.get("keywords", []))]
        self.min_score = min_score

    def evaluate(self, record: Dict[str, Any]) -> FilterResult:
        texts = self._extract_text(record)
        text_blob = " \n ".join(texts).lower()

        matched_states_primary = self._match_terms(text_blob, self.primary_states)
        matched_states_secondary = self._match_terms(text_blob, self.secondary_states)
        matched_state_abbr_primary = self._match_terms(text_blob, self.primary_state_abbr)
        matched_state_abbr_secondary = self._match_terms(text_blob, self.secondary_state_abbr)
        matched_states = list(dict.fromkeys(matched_states_primary + matched_states_secondary))
        matched_state_abbr = list(dict.fromkeys(matched_state_abbr_primary + matched_state_abbr_secondary))
        matched_counties = self._match_terms(text_blob, self.counties)
        matched_cities = self._match_terms(text_blob, self.cities)
        matched_regions = self._match_terms(text_blob, self.regions)
        matched_community = self._match_terms(text_blob, self.community_terms)
        negatives = self._match_terms(text_blob, self.negative_terms)

        has_digital_assets = self._has_digital_assets(record)

        score = 0
        if matched_states_primary or matched_state_abbr_primary:
            score += 2
        if matched_states_secondary or matched_state_abbr_secondary:
            score += 1
        if matched_counties:
            score += 3
        if matched_cities:
            score += 1
        if matched_regions:
            score += 1
        if matched_community:
            score += 1
        if has_digital_assets:
            score += 2
        if negatives:
            score -= 2
        reasons: List[str] = []
        if negatives:
            reasons.append("contains_excluded_terms")
        if not has_digital_assets:
            reasons.append("missing_digital_assets")
        if not (matched_states or matched_state_abbr or matched_counties or matched_cities or matched_regions):
            reasons.append("no_midwest_signal")

        details = {
            "matched_locations": {
                "states": matched_states,
                "states_primary": matched_states_primary,
                "states_secondary": matched_states_secondary,
                "state_abbreviations": matched_state_abbr,
                "state_abbreviations_primary": matched_state_abbr_primary,
                "state_abbreviations_secondary": matched_state_abbr_secondary,
                "counties": matched_counties,
                "cities": matched_cities,
                "regions": matched_regions,
            },
            "matched_community": matched_community,
            "negative_terms": negatives,
            "has_digital_assets": has_digital_assets,
            "reasons": reasons,
        }
        return FilterResult(score=score, details=details)

    def accepts(self, record: Dict[str, Any]) -> FilterResult:
        result = self.evaluate(record)
        if result.score < self.min_score:
            logging.debug("Rejecting record score=%s reasons=%s", result.score, result.details.get("reasons"))
        return result

    def _extract_text(self, record: Dict[str, Any]) -> List[str]:
        fields: List[Any] = []
        for key in ("title", "description", "subject", "creator", "publisher", "provider", "spatial", "location"):
            value = record.get(key)
            if value is not None:
                fields.append(value)
        for key in ("metadata", "data"):
            meta = record.get(key)
            if meta:
                fields.append(meta)
        texts: List[str] = []
        for field in fields:
            texts.extend(self._flatten(field))
        return texts

    def _flatten(self, value: Any) -> List[str]:
        results: List[str] = []
        if isinstance(value, str):
            results.append(value)
        elif isinstance(value, (int, float)):
            results.append(str(value))
        elif isinstance(value, dict):
            for v in value.values():
                results.extend(self._flatten(v))
        elif isinstance(value, list):
            for item in value:
                results.extend(self._flatten(item))
        return [r for r in results if isinstance(r, str) and r.strip()]

    def _match_terms(self, text_blob: str, terms: Iterable[str]) -> List[str]:
        matches = []
        for term in terms:
            if term and term in text_blob:
                matches.append(term)
        return matches

    def _has_digital_assets(self, record: Dict[str, Any]) -> bool:
        if isinstance(record.get("iiif_manifest"), str) and record["iiif_manifest"].strip():
            return True
        for key in ("pdf_url", "digital_url"):
            value = record.get(key)
            if isinstance(value, str) and value.strip():
                return True
        metadata = record.get("metadata") or {}
        if isinstance(metadata, dict):
            files = metadata.get("files")
            if isinstance(files, list):
                for f in files:
                    if not isinstance(f, dict):
                        continue
                    fmt = str(f.get("format", "")).lower()
                    name = str(f.get("name", "")).lower()
                    if "pdf" in fmt or name.endswith(".pdf"):
                        return True
        data = record.get("data") or {}
        if isinstance(data, dict):
            for key in ("object", "isShownAt"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return True
            has_view = data.get("hasView")
            if isinstance(has_view, list):
                for view in has_view:
                    if isinstance(view, dict):
                        url = view.get("@id") or view.get("id")
                        if isinstance(url, str) and url.strip():
                            return True
        if isinstance(record.get("isShownAt"), str) and record["isShownAt"].strip():
            return True
        return False


_default_filter = HarvestFilter()


def get_filter() -> HarvestFilter:
    return _default_filter


def apply_curation(record: Dict[str, Any], result: FilterResult) -> None:
    details = result.details
    location = record.setdefault("location", {})
    matched_locations = details.get("matched_locations", {})
    states = matched_locations.get("states") or matched_locations.get("state_abbreviations") or []
    counties = matched_locations.get("counties") or []
    cities = matched_locations.get("cities") or []
    if states and "state" not in location:
        location["state"] = states[0].title()
    if counties and "county" not in location:
        location["county"] = counties[0].title()
    if cities and "city" not in location:
        location["city"] = cities[0].title()

    record.setdefault("curation", {})
    record["curation"].update(
        {
            "score": result.score,
            "has_digital_assets": details.get("has_digital_assets"),
            "matched_community": [term.title() for term in details.get("matched_community", [])],
        }
    )
    record["curation_notes"] = build_curation_notes(result)


def build_curation_notes(result: FilterResult) -> str:
    details = result.details
    parts: List[str] = []
    locations = details.get("matched_locations", {})
    counties = [loc.title() for loc in locations.get("counties", [])]
    states = [loc.title() for loc in locations.get("states", [])]
    if counties:
        parts.append(f"County match: {', '.join(counties)}")
    if states:
        parts.append(f"State match: {', '.join(states)}")
    community = details.get("matched_community") or []
    if community:
        parts.append("Community markers: " + ", ".join(term.title() for term in community))
    if details.get("has_digital_assets"):
        parts.append("Digitized scan available")
    if not parts:
        parts.append("Curator review recommended")
    return "; ".join(parts)





