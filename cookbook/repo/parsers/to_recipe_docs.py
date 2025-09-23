from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional

from .recipe_extractor import parse_recipes_from_text
from .schema import RecipeDoc, ensure_list, ensure_str

logger = logging.getLogger(__name__)


def _derive_cookbook_title(obj: Dict[str, Any]) -> Optional[str]:
    candidates: List[str] = []
    metadata = obj.get("metadata") or {}
    inner_meta = metadata.get("metadata") if isinstance(metadata, dict) else {}
    fields: List[Any] = [
        obj.get("cookbook_title"),
        obj.get("cookbookTitle"),
        obj.get("title"),
    ]
    if isinstance(metadata, dict):
        fields.extend([
            metadata.get("cookbook_title"),
            metadata.get("title"),
            metadata.get("source_title"),
        ])
    if isinstance(inner_meta, dict):
        fields.extend([
            inner_meta.get("cookbook_title"),
            inner_meta.get("title"),
        ])
    for value in fields:
        text = ensure_str(value)
        if text and text not in candidates:
            candidates.append(text)
    for candidate in candidates:
        if candidate:
            return candidate
    return None


def iter_harvested_files(root: Path) -> Iterator[Path]:
    for fp in root.rglob("*.json"):
        yield fp


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("skip %s: %s", path, exc)
        return None


def _normalize_location(raw: Any) -> Dict[str, str]:
    if isinstance(raw, dict):
        return {str(k).lower(): ensure_str(v) or "" for k, v in raw.items() if ensure_str(v)}
    return {}


def _collect_creators(obj: Dict[str, Any]) -> List[str]:
    fields = ["creators", "creator", "authors", "author", "contributors", "contributor"]
    results: List[str] = []
    for field in fields:
        value = obj.get(field)
        results.extend(ensure_list(value))
    meta = obj.get("metadata", {})
    if isinstance(meta, dict):
        meta_info = meta.get("metadata")
        if isinstance(meta_info, dict):
            for field in fields:
                if field in meta_info:
                    results.extend(ensure_list(meta_info.get(field)))
    seen: set[str] = set()
    unique: List[str] = []
    for item in results:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _collect_subjects(obj: Dict[str, Any]) -> List[str]:
    subjects = ensure_list(obj.get("subject"))
    meta = obj.get("metadata", {})
    if isinstance(meta, dict):
        info = meta.get("metadata")
        if isinstance(info, dict):
            subjects.extend(ensure_list(info.get("subject")))
    seen: set[str] = set()
    result: List[str] = []
    for item in subjects:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _collect_digital_urls(obj: Dict[str, Any]) -> List[str]:
    candidates: List[Any] = []
    for key in [
        "digital_url",
        "digital_urls",
        "digitalUrl",
        "url",
        "urls",
        "identifier_access",
        "identifier-access",
        "external_url",
        "links",
    ]:
        value = obj.get(key)
        if value:
            candidates.append(value)
    meta = obj.get("metadata", {})
    if isinstance(meta, dict):
        info = meta.get("metadata")
        if isinstance(info, dict):
            for key in ["identifier-access", "identifier_access", "url"]:
                value = info.get(key)
                if value:
                    candidates.append(value)
        resources = meta.get("resources")
        if isinstance(resources, list):
            for item in resources:
                value = item.get("url") if isinstance(item, dict) else None
                if value:
                    candidates.append(value)
    urls: List[str] = []
    seen: set[str] = set()
    for item in candidates:
        for url in ensure_list(item):
            if url and url not in seen:
                seen.add(url)
                urls.append(url)
    return urls


def _collect_image(obj: Dict[str, Any]) -> Optional[str]:
    for key in ["image_preview", "preview", "thumbnail", "image_url"]:
        value = obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, list) and value:
            for item in value:
                if isinstance(item, str) and item.strip():
                    return item.strip()
    meta = obj.get("metadata", {})
    if isinstance(meta, dict):
        image_url = meta.get("image_url")
        if isinstance(image_url, list) and image_url:
            return ensure_list(image_url)[0]
        if isinstance(image_url, str):
            value = image_url.strip()
            if value:
                return value
        thumb = meta.get("thumbnail")
        if isinstance(thumb, str) and thumb.strip():
            return thumb.strip()
    return None


def _base_metadata(obj: Dict[str, Any], path: Path) -> Dict[str, Any]:
    meta: Dict[str, Any] = {
        "source_identifier": obj.get("identifier") or obj.get("id"),
        "source_file": str(path),
    }
    for key in ["description", "subject", "creator", "publisher", "year", "date"]:
        value = obj.get(key)
        if value:
            meta[key] = value
    return meta


def _join_description(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return ensure_str(value)
    if isinstance(value, list):
        joined = "\n\n".join(v for v in ensure_list(value))
        return joined or None
    return None


def _parse_text_blocks(texts: Iterable[str]) -> List[Dict[str, Any]]:
    text_blob = "\n\n".join(t.strip() for t in texts if isinstance(t, str) and t.strip())
    if not text_blob:
        return []
    return parse_recipes_from_text(text_blob)


def _texts_from_feeding_america(obj: Dict[str, Any]) -> List[str]:
    manifest = obj.get("metadata") or {}
    if not isinstance(manifest, dict):
        return []
    pages: List[str] = []
    for canvas in manifest.get("items", []) or []:
        page_lines: List[str] = []
        for page in canvas.get("annotations", []) or []:
            for ann in page.get("items", []) or []:
                body = ann.get("body") if isinstance(ann, dict) else None
                if isinstance(body, dict):
                    val = body.get("value")
                    if isinstance(val, str) and val.strip():
                        page_lines.append(val)
                elif isinstance(body, list):
                    for entry in body:
                        if isinstance(entry, dict):
                            val = entry.get("value")
                            if isinstance(val, str) and val.strip():
                                page_lines.append(val)
        if page_lines:
            pages.append("\n".join(page_lines))
    return pages


def _texts_from_internet_archive(obj: Dict[str, Any]) -> List[str]:
    texts: List[str] = []
    texts.extend(ensure_list(obj.get("description")))
    meta = obj.get("metadata", {})
    if isinstance(meta, dict):
        info = meta.get("metadata")
        if isinstance(info, dict):
            for key in ["description", "tableofcontents", "contents", "notes"]:
                texts.extend(ensure_list(info.get(key)))
    return texts


def _texts_from_loc(obj: Dict[str, Any]) -> List[str]:
    texts: List[str] = []
    texts.extend(ensure_list(obj.get("description")))
    meta = obj.get("metadata") or {}
    if isinstance(meta, dict):
        for key in ["description", "notes", "transcription", "extract", "content"]:
            texts.extend(ensure_list(meta.get(key)))
        resources = meta.get("resources")
        if isinstance(resources, list):
            for resource in resources:
                if not isinstance(resource, dict):
                    continue
                for key in ["text", "description", "title", "transcription", "snippet"]:
                    texts.extend(ensure_list(resource.get(key)))
                files = resource.get("files")
                if isinstance(files, list):
                    for file_entry in files:
                        if isinstance(file_entry, dict):
                            texts.extend(ensure_list(file_entry.get("text")))
    return texts


def _texts_generic(obj: Dict[str, Any]) -> List[str]:
    texts: List[str] = []
    for key in ["description", "text", "value", "notes"]:
        texts.extend(ensure_list(obj.get(key)))
    return texts


def _build_docs(obj: Dict[str, Any], path: Path, recipes: List[Dict[str, Any]]) -> Iterator[Dict[str, Any]]:
    identifier = ensure_str(obj.get("identifier") or obj.get("id")) or path.stem
    source = ensure_str(obj.get("source")) or "unknown"
    cookbook_title = _derive_cookbook_title(obj)
    description = _join_description(obj.get("description"))
    subjects = _collect_subjects(obj)
    creators = _collect_creators(obj)
    publisher = ensure_str(obj.get("publisher"))
    date = ensure_str(obj.get("date"))
    year = ensure_str(obj.get("year")) or (date if date and date.isdigit() else None)
    location = _normalize_location(obj.get("location"))
    institution = ensure_str(obj.get("institution"))
    iiif_manifest = ensure_str(obj.get("iiif_manifest"))
    digital_urls = _collect_digital_urls(obj)
    primary_digital = ensure_str(obj.get("digital_url"))
    if primary_digital:
        ordered_urls = [primary_digital] + [url for url in digital_urls if url != primary_digital]
    else:
        ordered_urls = digital_urls
        primary_digital = ordered_urls[0] if ordered_urls else None
    digital_urls = ordered_urls
    digital_url = primary_digital
    image_preview = _collect_image(obj)
    metadata = _base_metadata(obj, path)
    if cookbook_title:
        metadata.setdefault('cookbook_title', cookbook_title)

    for idx, recipe in enumerate(recipes, start=1):
        title = ensure_str(recipe.get("title")) or ensure_str(obj.get("title")) or identifier
        ingredients = ensure_list(recipe.get("ingredients"))
        instructions = ensure_list(recipe.get("instructions"))
        if not ingredients and not instructions:
            continue
        meta = {**metadata, "recipe_index": idx}
        page = recipe.get("page")
        if page:
            meta["page"] = page
        doc = RecipeDoc(
            id=f"{identifier}#recipe-{idx}",
            source=source,
            title=title,
            cookbook_title=cookbook_title,
            ingredients=ingredients,
            instructions=instructions,
            description=description,
            subjects=subjects,
            creators=creators,
            publisher=publisher,
            date=date,
            year=year,
            location=location,
            institution=institution,
            iiif_manifest=iiif_manifest,
            digital_url=digital_url,
            digital_urls=digital_urls,
            image_preview=image_preview,
            metadata=meta,
        )
        yield doc.to_dict()


def recipes_from_obj(obj: Dict[str, Any], path: Path) -> Iterable[Dict[str, Any]]:
    source = obj.get("source")
    if source == "feeding_america":
        texts = _texts_from_feeding_america(obj)
    elif source == "internet_archive":
        texts = _texts_from_internet_archive(obj)
    elif source == "library_of_congress":
        texts = _texts_from_loc(obj)
    else:
        texts = _texts_generic(obj)
    recipes = _parse_text_blocks(texts)
    if not recipes:
        return []
    return _build_docs(obj, path, recipes)


def to_recipe_docs(data_root: Path) -> Iterator[Dict[str, Any]]:
    for fp in iter_harvested_files(data_root):
        obj = _load_json(fp)
        if not obj:
            continue
        for doc in recipes_from_obj(obj, fp):
            yield doc


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='./data')
    ap.add_argument('--out', default='./data/recipes.jsonl')
    args = ap.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open('w', encoding='utf-8') as handle:
        for doc in to_recipe_docs(Path(args.data)):
            handle.write(json.dumps(doc, ensure_ascii=False))
            handle.write("\n")
