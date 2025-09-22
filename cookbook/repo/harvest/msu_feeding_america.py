"""
MSU Feeding America harvester.

Scrapes the collection landing page to identify item identifiers, then pulls
IIIF manifests for each item and saves normalized JSON records with the shared
harvest filter metadata applied.
"""
from __future__ import annotations

import argparse
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests

from .filters import apply_curation, get_filter

COLLECTION_URL = "https://d.lib.msu.edu/search"
MANIFEST_TEMPLATE = "https://d.lib.msu.edu/fa/{item_id}/manifest"
ITEM_URL_TEMPLATE = "https://d.lib.msu.edu/fa/{item_id}"
COLLECTION_QUERY = (
    "fq=RELS_EXT_isMemberOfCollection_uri_s%3Ainfo%5C%3Afedora/fa%5C%3Aroot"
    "&sort=title%20asc&per_page=100&page=1"
)
ITEM_PATTERN = re.compile(r"href=\"/fa/(\d+)\"")


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def fetch_item_ids(session: requests.Session) -> List[str]:
    url = f"{COLLECTION_URL}?{COLLECTION_QUERY}"
    logging.debug("Fetching Feeding America index %s", url)
    response = session.get(url, timeout=60)
    response.raise_for_status()
    matches = ITEM_PATTERN.findall(response.text)
    unique_ids = sorted(set(matches), key=lambda x: int(x))
    logging.info("Found %s Feeding America item ids", len(unique_ids))
    return unique_ids


def fetch_manifest(session: requests.Session, item_id: str) -> Dict[str, Any]:
    manifest_url = MANIFEST_TEMPLATE.format(item_id=item_id)
    response = session.get(manifest_url, timeout=60)
    response.raise_for_status()
    manifest = response.json()
    manifest["id"] = manifest_url
    return manifest


def _metadata_lookup(entries: Iterable[Dict[str, Any]], label: str) -> List[str]:
    results: List[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        entry_label = entry.get("label")
        if isinstance(entry_label, dict):
            entry_label = " ".join(sum(entry_label.values(), []))
        if entry_label and label.lower() in str(entry_label).lower():
            value = entry.get("value")
            if isinstance(value, dict):
                values = sum(value.values(), [])
            elif isinstance(value, list):
                values = value
            else:
                values = [value]
            for v in values:
                if isinstance(v, str) and v.strip():
                    results.append(v.strip())
    return results


def normalize(manifest: Dict[str, Any], item_id: str) -> Dict[str, Any]:
    metadata_entries = manifest.get("metadata") or []
    title = manifest.get("label")
    if isinstance(title, dict):
        title_values = sum(title.values(), [])
        title = title_values[0] if title_values else None

    description_values = _metadata_lookup(metadata_entries, "Description")
    subject_values = _metadata_lookup(metadata_entries, "Subject")
    place_values = _metadata_lookup(metadata_entries, "Place")
    contributor_values = _metadata_lookup(metadata_entries, "Creator")

    preview = None
    try:
        first_canvas = (manifest.get("items") or [])[0]
        first_annotation_page = (first_canvas.get("items") or [])[0]
        first_annotation = (first_annotation_page.get("items") or [])[0]
        body = first_annotation.get("body") or {}
        preview = body.get("id")
    except (IndexError, AttributeError):
        preview = None

    location_data: Dict[str, Any] = {}
    if place_values:
        location_data["places"] = place_values

    norm: Dict[str, Any] = {
        "source": "feeding_america",
        "identifier": f"msu_fa_{item_id}",
        "title": title,
        "description": "\n\n".join(description_values) if description_values else None,
        "subject": subject_values,
        "location": location_data,
        "institution": "Michigan State University Libraries",
        "contributors": contributor_values,
        "iiif_manifest": manifest.get("id"),
        "digital_url": ITEM_URL_TEMPLATE.format(item_id=item_id),
        "metadata": manifest,
    }
    if preview:
        norm["image_preview"] = preview
    return norm


def harvest(output_dir: Path) -> None:
    ensure_dir(output_dir)
    session = requests.Session()
    harvest_filter = get_filter()
    written = 0

    item_ids = fetch_item_ids(session)
    for item_id in item_ids:
        manifest = fetch_manifest(session, item_id)
        record = normalize(manifest, item_id)
        result = harvest_filter.accepts(record)
        if result.score < harvest_filter.min_score:
            logging.info(
                "Rejected %s score=%s reasons=%s",
                record["identifier"],
                result.score,
                result.details.get("reasons"),
            )
            continue
        apply_curation(record, result)
        target = output_dir / f"{record['identifier']}.json"
        if target.exists():
            logging.debug("exists skipping %s", record["identifier"])
            continue
        with open(target, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        written += 1
    logging.info("done. wrote=%s files", written)


def main() -> None:
    ap = argparse.ArgumentParser(description="MSU Feeding America harvester")
    ap.add_argument("--out", default="./data/feeding_america")
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    harvest(Path(args.out))


if __name__ == "__main__":
    main()
