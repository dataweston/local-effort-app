"""
Heuristic recipe parser from plain text.

Exports `parse_recipes_from_text(text)` returning a list of
{ 'title', 'ingredients', 'instructions', 'page' }.

Heuristics:
- Title: lines in Title Case or ALL CAPS not starting with measurement tokens.
- Ingredients: lines starting with measurement tokens (e.g., 1 cup, 2 tbsp, ¾ tsp) or bullet markers.
- Instructions: paragraphs following ingredients until next title or EOF.
"""
from __future__ import annotations

import re
from typing import Dict, List


MEASURE_TOKENS = [
    r"cup(s)?", r"tsp", r"teaspoon(s)?", r"tbsp", r"tablespoon(s)?",
    r"oz", r"ounce(s)?", r"lb(s)?", r"pound(s)?", r"g", r"kg", r"ml", r"l",
]
MEASURE_RE = re.compile(rf"^(\d+[\d/\s\.,]*|[¼-¾½⅓⅔⅛⅜⅝⅞]+)\s*({'|'.join(MEASURE_TOKENS)})(\b|\s)", re.IGNORECASE)
BULLET_RE = re.compile(r"^[-*•]\s+")
TITLE_RE = re.compile(
    r"""
    ^[A-Z][A-Za-z0-9 '&-]+$     # Title Case line
    |                           # or
    ^[A-Z0-9 '&-]{4,}$          # ALL CAPS line with at least 4 chars
    """,
    re.VERBOSE,
)


def is_title(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if MEASURE_RE.search(s) or BULLET_RE.search(s):
        return False
    # Avoid lines that end with a colon typical for headings wrongly captured
    if s.endswith(":"):
        return True
    return bool(TITLE_RE.match(s))


def is_ingredient(line: str) -> bool:
    s = line.strip()
    return bool(MEASURE_RE.search(s) or BULLET_RE.search(s))


def parse_recipes_from_text(text: str) -> List[Dict[str, List[str] | str | int]]:
    lines = [l.rstrip() for l in text.splitlines()]
    results: List[Dict[str, List[str] | str | int]] = []
    cur_title: str | None = None
    cur_ing: List[str] = []
    cur_instr: List[str] = []
    page = 1

    def flush():
        nonlocal cur_title, cur_ing, cur_instr
        if cur_title and (cur_ing or cur_instr):
            results.append({
                "title": cur_title.strip(),
                "ingredients": [x.strip() for x in cur_ing if x.strip()],
                "instructions": [x.strip() for x in cur_instr if x.strip()],
                "page": page,
            })
        cur_title, cur_ing, cur_instr = None, [], []

    mode: str | None = None  # 'ingredients' or 'instructions'

    for raw in lines:
        line = raw.strip("\ufeff ")
        if not line:
            if mode == 'instructions' and cur_instr and cur_instr[-1] != "":
                cur_instr.append("")
            continue
        if line.lower().startswith("page "):
            try:
                page = int(re.findall(r"\d+", line)[0])
            except Exception:
                pass
            continue

        if is_title(line):
            flush()
            cur_title = line.rstrip(":")
            mode = 'ingredients'
            continue

        if is_ingredient(line):
            mode = 'ingredients'
            cur_ing.append(line)
            continue

        # Default to instructions once we have ingredients or title
        if cur_title:
            mode = 'instructions'
            cur_instr.append(line)

    flush()
    return results
