from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

BANNED_KEYWORDS = {
    'pizzagate',
    'pedogate',
    'pedophile',
    'epstein',
    'podesta',
}

def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    return [str(value).strip()]


def recipe_allows(doc: Dict) -> bool:
    text_parts: List[str] = []
    for key in ('title', 'cookbook_title', 'description'):
        value = doc.get(key)
        if isinstance(value, str):
            text_parts.append(value.lower())
    metadata = doc.get('metadata') or {}
    if isinstance(metadata, dict):
        title = metadata.get('cookbook_title')
        if isinstance(title, str):
            text_parts.append(title.lower())
    text = ' '.join(text_parts)
    return not any(keyword in text for keyword in BANNED_KEYWORDS)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    data_path = repo_root / 'data' / 'recipes.jsonl'
    app_root = repo_root.parents[1]
    cookbook_public = app_root / 'public' / 'cookbook'
    cookbook_public.mkdir(parents=True, exist_ok=True)

    items: List[Dict] = []
    recipes_with_content = 0
    sources = set()
    states = set()
    institutions = set()

    banned_count = 0
    total_records = 0

    with data_path.open('r', encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            total_records += 1
            doc = json.loads(line)
            if not recipe_allows(doc):
                banned_count += 1
                continue
            sources.add(doc.get('source'))
            location = doc.get('location') or {}
            state = location.get('state')
            if state:
                states.add(state)
            institution = doc.get('institution')
            if institution:
                institutions.add(institution)

            has_content = bool(doc.get('ingredients') or doc.get('instructions'))
            if has_content:
                recipes_with_content += 1

            summary = {
                'id': doc['id'],
                'recipeTitle': doc.get('title'),
                'cookbookTitle': doc.get('cookbook_title')
                or doc.get('metadata', {}).get('cookbook_title')
                or doc.get('metadata', {}).get('source_identifier'),
                'year': doc.get('year') or doc.get('date'),
                'source': doc.get('source'),
                'institution': institution,
                'state': state,
                'county': location.get('county'),
                'hasDigital': bool(doc.get('iiif_manifest') or doc.get('digital_url') or ensure_list(doc.get('digital_urls'))),
                'ingredientsCount': len(ensure_list(doc.get('ingredients'))),
                'instructionsPreview': ensure_list(doc.get('instructions'))[:3],
                'detail': {
                    'ingredients': ensure_list(doc.get('ingredients')),
                    'instructions': ensure_list(doc.get('instructions')),
                    'description': doc.get('description'),
                    'subjects': ensure_list(doc.get('subjects') or doc.get('subject')),
                    'creators': ensure_list(doc.get('creators') or doc.get('creator') or doc.get('authors') or doc.get('author')),
                    'publisher': doc.get('publisher'),
                    'year': doc.get('year') or doc.get('date'),
                    'location': location,
                    'institution': institution,
                    'iiif_manifest': doc.get('iiif_manifest'),
                    'digital_url': doc.get('digital_url'),
                    'digital_urls': ensure_list(doc.get('digital_urls')),
                    'image_preview': doc.get('image_preview'),
                    'metadata': doc.get('metadata') or {},
                },
            }
            items.append(summary)

    index_payload = {
        'generated': datetime.utcnow().isoformat() + 'Z',
        'counts': {
            'documents': len(items),
            'recipes': recipes_with_content,
            'sources': sorted(s for s in sources if s),
            'states': sorted(states),
            'institutions': sorted(institutions),
        },
        'items': items,
    }

    index_path = cookbook_public / 'index.json'
    with index_path.open('w', encoding='utf-8') as index_handle:
        json.dump(index_payload, index_handle, ensure_ascii=False)

    print(f'Wrote {len(items)} recipes to {index_path}')
    print(f'Skipped {banned_count} banned records out of {total_records}')


if __name__ == '__main__':
    main()
