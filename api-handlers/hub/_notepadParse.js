/**
 * Shared notepad-section parser for the Hub house-style notepads.
 *
 * The kitchen's notepads use a consistent convention: `#section#` (or markdown
 * `#`/`##`/`###`) headings, with `- ` / `* ` bullet lines beneath. This mirrors
 * the parsing already inlined in home-notepad.js and `noteToSheet` (HubPage.jsx);
 * it's factored out here so the master-menu parser and the house-notepad
 * canonicalizer share one definition of "what is a section and its items".
 */

// Parse a notepad body into ordered sections with their item lines.
// Returns [{ section: string, items: string[] }]. Lines before the first heading
// are grouped under an empty-string section so nothing is silently dropped.
function sectionsFromNotepad(body) {
  const order = [];
  const map = new Map();
  const ensure = (name) => {
    if (!map.has(name)) {
      map.set(name, []);
      order.push(name);
    }
    return map.get(name);
  };

  let current = '';
  for (const rawLine of String(body || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const wrapped = line.match(/^#(.+)#$/); // #in season#
    const heading = line.match(/^#{1,3}\s+(.+)$/); // ## In season
    const headingText = wrapped ? wrapped[1] : heading ? heading[1] : null;
    if (headingText != null) {
      current = headingText.trim();
      ensure(current);
      continue;
    }
    const item = line.replace(/^[-*]\s+/, '').trim(); // strip bullet marker
    if (item) ensure(current).push(item);
  }

  return order
    .map((name) => ({ section: name, items: map.get(name) }))
    .filter((entry) => entry.items.length > 0);
}

// Convenience: the item lines under one named section (case-insensitive match).
function linesUnderSection(body, sectionName) {
  const target = String(sectionName || '').toLowerCase().trim();
  const found = sectionsFromNotepad(body).find(
    (entry) => entry.section.toLowerCase().trim() === target,
  );
  return found ? found.items : [];
}

module.exports = { sectionsFromNotepad, linesUnderSection };
