/**
 * Weekly Meal Prep menu parser — understands the format Weston actually writes.
 *
 * The Weekly Meal Prep notepad has PERMANENT category headings:
 *
 *     Dinners
 *     Lunches
 *     Breakfasts
 *     Kids
 *     Snacks
 *
 * Under each heading, a dish is written as:
 *   1. a NAME line  — the main component (e.g. "Zabuton Roast", "BBQ Chicken")
 *   2. zero or more DESCRIPTION lines — sides + a few ingredients, in prose
 *      (e.g. "pot roast style with new red potatoes and green bean casserole.")
 *
 * So this is NOT a bullet list. The parser's job is to tell a new dish NAME line
 * apart from a continuation DESCRIPTION line, and group descriptions under their
 * dish. The dish's MEAL CATEGORY is the heading it sits under.
 *
 * Output: [{ meal, name, description, raw }] in document order.
 *   meal        — 'dinner' | 'lunch' | 'breakfast' | 'kids' | 'snacks'
 *   name        — the main-component dish name (line 1)
 *   description — the joined description/side lines (may be '')
 *   raw         — name + description, as written
 *
 * Design notes / heuristics (iterate here as real menus reveal edge cases):
 *  - Headings match with or without a trailing ':' and tolerate the older
 *    '#dinners#' / '## Dinners' styles, so old notes still parse.
 *  - A line is a DESCRIPTION (continuation) when it looks like prose rather than a
 *    dish title: it starts lowercase, OR opens with a connective/side word
 *    ("served", "with", "over", "on", "in", "topped", "and"), OR is long and
 *    comma/period-heavy. Otherwise it's a new dish NAME.
 *  - A markdown-ish '- ' / '* ' bullet always starts a new dish name (the marker
 *    is stripped), so a bulleted menu also works.
 */

// The permanent headings, in display order. Each maps to a canonical meal key.
const MENU_HEADINGS = [
  { meal: 'dinner', label: 'Dinners', re: /^dinners?$/i },
  { meal: 'lunch', label: 'Lunches', re: /^lunch(es)?$/i },
  { meal: 'breakfast', label: 'Breakfasts', re: /^breakfasts?$/i },
  { meal: 'kids', label: 'Kids', re: /^kids?(\s+meals?)?$/i },
  { meal: 'snacks', label: 'Snacks', re: /^snacks?$/i },
];

// The canonical, permanent notepad scaffold seeded into a blank week.
const MENU_TEMPLATE = MENU_HEADINGS.map((h) => `${h.label}\n`).join('\n');

// Words that, when a line STARTS with them, mark it as a description/side
// continuation rather than a new dish name.
const CONTINUATION_OPENERS = new Set([
  'served', 'with', 'w/', 'over', 'on', 'in', 'topped', 'and', 'plus', 'side',
  'sides', 'comes', 'includes', 'including', 'accompanied', 'alongside', 'a', 'an',
  'the', 'our', 'house', 'fresh', 'add',
]);

// Strip a heading marker from a line and return the bare heading text, or null
// when the line is not a heading. Accepts "Dinners", "Dinners:", "#dinners#",
// "## Dinners", "# Dinners:".
function headingText(line) {
  const wrapped = line.match(/^#([^#]+)#$/); // #dinners#
  const hashed = line.match(/^#{1,6}\s*(.+?)\s*$/); // ## Dinners  / # Dinners:
  let text = wrapped ? wrapped[1] : hashed ? hashed[1] : line;
  text = text.replace(/:\s*$/, '').trim(); // drop a trailing colon
  return text;
}

// Map a heading string to a meal key, or null if it isn't one of ours.
function mealForHeading(text) {
  const clean = String(text || '').replace(/:\s*$/, '').trim();
  const hit = MENU_HEADINGS.find((h) => h.re.test(clean));
  return hit ? hit.meal : null;
}

// True when a non-heading line reads like a continuation/description rather than
// a new dish name.
function looksLikeDescription(line) {
  const t = line.trim();
  if (!t) return false;
  // Bulleted lines are always new dish names.
  if (/^[-*]\s+/.test(t)) return false;
  const firstChar = t[0];
  // Starts lowercase → prose continuation (dish names are capitalized).
  if (firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase()) return true;
  const firstWord = t.split(/\s+/)[0].toLowerCase().replace(/[^a-z/]/g, '');
  if (CONTINUATION_OPENERS.has(firstWord)) return true;
  return false;
}

/**
 * Parse a Weekly Meal Prep notepad body into dishes.
 * @returns {Array<{ meal, name, description, raw }>}
 */
function parseMealMenu(body) {
  const dishes = [];
  let currentMeal = null;
  let currentDish = null;

  const flush = () => {
    if (currentDish) {
      currentDish.description = currentDish.descLines.join(' ').replace(/\s+/g, ' ').trim();
      currentDish.raw = [currentDish.name, currentDish.description].filter(Boolean).join(' — ');
      delete currentDish.descLines;
      dishes.push(currentDish);
      currentDish = null;
    }
  };

  for (const rawLine of String(body || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Heading? (only those that map to a known meal switch the category; an
    // unknown heading like "# Menu — June 28/29" ends the current dish but does
    // not start collecting under a meal.)
    const asHeading = headingText(line);
    const meal = mealForHeading(asHeading);
    const isAnyHeading = /^#/.test(line) || /:\s*$/.test(line) || MENU_HEADINGS.some((h) => h.re.test(asHeading));
    if (meal) {
      flush();
      currentMeal = meal;
      continue;
    }
    if (isAnyHeading && !meal && /^#/.test(line)) {
      // Non-meal markdown heading (e.g. an old "# Menu — …" title): reset.
      flush();
      currentMeal = null;
      continue;
    }

    // Lines before/outside any meal heading are ignored for the menu.
    if (!currentMeal) continue;

    if (currentDish && looksLikeDescription(line)) {
      currentDish.descLines.push(line.replace(/^[-*]\s+/, ''));
    } else {
      // New dish name.
      flush();
      currentDish = { meal: currentMeal, name: line.replace(/^[-*]\s+/, '').trim(), descLines: [] };
    }
  }
  flush();

  return dishes;
}

module.exports = {
  parseMealMenu,
  mealForHeading,
  headingText,
  looksLikeDescription,
  MENU_HEADINGS,
  MENU_TEMPLATE,
};
