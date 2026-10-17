// Rules for the home page bulletin, shared by the page renderer, the admin
// editor and PUT /api/home-bulletin so all three agree on what a link, a live
// token and an allowed target are. Plain ESM with no imports: Vite loads it in
// the browser and the Express routes load it with import().
//
// The bulletin is Markdown with two additions that read the CMS-owned Pizza on
// Smith ordering window (the `facts` object served by GET /api/home-bulletin):
//   {{pizza.opens}}  {{pizza.closes}}  {{pizza.fulfillment}}
//   {{when pizza.open}} / {{when pizza.upcoming}} / {{when pizza.closed}}
//     at the start of a line: show that line only in that state.
// Dates are evaluated and shown in America/Chicago, never UTC.

export const BULLETIN_TIME_ZONE = 'America/Chicago';
export const BULLETIN_MAX_LENGTH = 12000;

const DROP_STATES = ['open', 'upcoming', 'closed'];
const DROP_FACTS = ['opens', 'closes', 'fulfillment'];

const LINK_SOURCE = String.raw`\[([^\]\n]+)\]\(((?:[^\s()]|\([^\s()]*\))+)\)`;
const INLINE_SOURCE = [
  LINK_SOURCE,
  String.raw`\*\*(.+?)\*\*`,
  String.raw`__(.+?)__`,
  String.raw`\x60([^\x60\n]+)\x60`,
  String.raw`\*([^*\s](?:[^*]*[^*\s])?)\*`,
  String.raw`_([^_\s](?:[^_]*[^_\s])?)_`,
].join('|');
const TOKEN_SOURCE = String.raw`\{\{\s*([^{}]*?)\s*\}\}`;
const WHEN_LINE = /^\s*\{\{\s*when\s+([a-z]+)\.([a-z]+)\s*\}\}[ \t]?/i;

const isWordChar = (char) => char !== undefined && /\w/.test(char);

// ---- Link targets -------------------------------------------------------

// The only targets the bulletin will render as links: https URLs, mailto:,
// tel:, and site paths. `javascript:`, `http:` and protocol-relative `//host`
// are never links.
export function safeHref(target) {
  const url = String(target || '').trim();
  if (/^https:\/\/[^\s/?#]+[^\s]*$/i.test(url)) return url;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(url)) return url;
  if (/^tel:\+?[0-9().-]{7,}$/i.test(url)) return url;
  if (/^\/(?![/\\])[^\s\\]*$/.test(url)) return url;
  return null;
}

export const isInternalHref = (href) => href.startsWith('/');

// The server only accepts site paths that exist in the registry (which a test
// ties to PUBLIC_ROUTES), plus slugged posts and products under its dynamic
// prefixes. External https, mailto and tel targets are not restricted.
export function isAllowedTarget(target, registry) {
  const href = safeHref(target);
  if (!href) return false;
  if (!isInternalHref(href)) return true;
  const path = href.split(/[?#]/)[0].replace(/(.)\/$/, '$1');
  if ((registry?.links || []).some((entry) => entry.url === path)) return true;
  return (registry?.dynamicPrefixes || []).some((prefix) => path.startsWith(prefix) && /^[a-z0-9-]+$/i.test(path.slice(prefix.length)));
}

// ---- Inline and block parsing ------------------------------------------

export function parseInline(text) {
  const source = String(text);
  const pattern = new RegExp(INLINE_SOURCE, 'g');
  const nodes = [];
  let last = 0;
  let match;
  const pushText = (end) => { if (end > last) nodes.push({ type: 'text', text: source.slice(last, end) }); };
  while ((match = pattern.exec(source)) !== null) {
    const [raw, linkText, linkTarget, strongStars, strongUnder, code, emStars, emUnder] = match;
    const end = match.index + raw.length;
    // Snake_case and file__names are not emphasis; skip this opener only.
    if ((emUnder !== undefined || strongUnder !== undefined) && (isWordChar(source[match.index - 1]) || isWordChar(source[end]))) {
      pattern.lastIndex = match.index + 1;
      continue;
    }
    if (linkText !== undefined) {
      const href = safeHref(linkTarget);
      if (!href) continue; // leave the raw [text](target) visible so the author sees it
      pushText(match.index);
      nodes.push({ type: 'link', href, internal: isInternalHref(href), children: parseInline(linkText) });
    } else if (code !== undefined) {
      pushText(match.index);
      nodes.push({ type: 'code', text: code });
    } else {
      pushText(match.index);
      const strong = strongStars ?? strongUnder;
      nodes.push(strong !== undefined
        ? { type: 'strong', children: parseInline(strong) }
        : { type: 'em', children: parseInline(emStars ?? emUnder) });
    }
    last = end;
  }
  pushText(source.length);
  return nodes;
}

export function parseBulletin(markdown) {
  return String(markdown || '').split('\n').map((line) => {
    if (!line.trim()) return { type: 'spacer' };
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) return { type: 'heading', level: heading[1].length + 1, children: parseInline(heading[2]) };
    if (/^\s*[-*+]\s+/.test(line)) return { type: 'list', children: parseInline(line.replace(/^\s*[-*+]\s+/, '')) };
    if (/^\s*>\s?/.test(line)) return { type: 'quote', children: parseInline(line.replace(/^\s*>\s?/, '')) };
    return { type: 'paragraph', children: parseInline(line) };
  });
}

// ---- Live facts ---------------------------------------------------------

const parseMoment = (value) => {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const formatDay = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: BULLETIN_TIME_ZONE, month: 'long', day: 'numeric' }).format(ms).toLowerCase();

// Same rule as the server's pizzaDropStatus: a drop without a valid window is closed.
export function dropState(drop, now = Date.now()) {
  const opensAt = parseMoment(drop?.opensAt);
  const closesAt = parseMoment(drop?.closesAt);
  if (opensAt === null || closesAt === null) return 'closed';
  if (now < opensAt) return 'upcoming';
  if (now >= closesAt) return 'closed';
  return 'open';
}

function lookupFact(name, facts) {
  const [group, key] = name.split('.');
  const drop = facts?.[group];
  if (group !== 'pizza' || !DROP_FACTS.includes(key) || !drop) return null;
  if (key === 'fulfillment') return drop.fulfillment || null;
  const ms = parseMoment(key === 'opens' ? drop.opensAt : drop.closesAt);
  return ms === null ? null : formatDay(ms);
}

// Replaces live tokens and drops lines that should not show right now.
// `notes` says why a line is hidden so the editor can explain a vanished line.
export function resolveBulletin(markdown, facts, now = Date.now()) {
  const notes = [];
  const kept = [];
  String(markdown || '').split('\n').forEach((original, index) => {
    const lineNumber = index + 1;
    let line = original;
    const when = line.match(WHEN_LINE);
    if (when) {
      const [, group, state] = when;
      if (group.toLowerCase() !== 'pizza' || !DROP_STATES.includes(state.toLowerCase())) {
        notes.push({ line: lineNumber, reason: `Unknown condition "${when[0].trim()}".` });
        return;
      }
      if (!facts?.pizza) {
        notes.push({ line: lineNumber, reason: 'Hidden: the Pizza on Smith window is not available.' });
        return;
      }
      const current = dropState(facts.pizza, now);
      if (current !== state.toLowerCase()) {
        notes.push({ line: lineNumber, reason: `Hidden: shows only while Pizza on Smith ordering is ${state.toLowerCase()}; it is ${current} now.` });
        return;
      }
      line = line.slice(when[0].length);
    }
    let unresolved = null;
    line = line.replace(new RegExp(TOKEN_SOURCE, 'g'), (raw, name) => {
      const value = lookupFact(name.trim(), facts);
      if (value === null) { unresolved = unresolved || raw; return raw; }
      return value;
    });
    if (unresolved) {
      notes.push({ line: lineNumber, reason: `Hidden: ${unresolved} has no value in the CMS.` });
      return;
    }
    kept.push(line);
  });
  // Hiding a line must not leave stacked blank lines or blank edges.
  const lines = kept.filter((line, i) => line.trim() || (i > 0 && kept[i - 1].trim()));
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return { markdown: lines.join('\n'), notes };
}

// ---- Validation (used by PUT /api/home-bulletin and the editor) ---------

const maskCode = (text) => text.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

export function validateBulletin(markdown, registry) {
  const text = String(markdown || '');
  const problems = [];
  if (text.length > BULLETIN_MAX_LENGTH) problems.push({ line: 1, message: `The bulletin is longer than ${BULLETIN_MAX_LENGTH} characters.` });
  const scan = maskCode(text);
  for (const match of scan.matchAll(new RegExp(TOKEN_SOURCE, 'g'))) {
    const body = match[1].trim().toLowerCase();
    const known = DROP_FACTS.some((key) => body === `pizza.${key}`)
      || DROP_STATES.some((state) => body === `when pizza.${state}`);
    if (!known) problems.push({ line: lineOf(text, match.index), message: `Unknown live value ${match[0]}.` });
  }
  for (const match of scan.matchAll(/\[([^\]\n]+)\]\(([^)\n]*)\)/g)) {
    if (!isAllowedTarget(match[2], registry)) {
      problems.push({ line: lineOf(text, match.index), message: `"${match[1]}" links to ${match[2] || 'nothing'}, which is not a page on this site or an https link.` });
    }
  }
  return problems.sort((a, b) => a.line - b.line);
}

// ---- Auto-link suggestions ---------------------------------------------

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Blank out everything that must never receive a new link, keeping offsets.
function maskProtected(text) {
  const blank = (span) => span.replace(/[^\n]/g, ' ');
  return text
    .replace(/`[^`\n]*`/g, blank)
    .replace(new RegExp(LINK_SOURCE, 'g'), blank)
    .replace(new RegExp(TOKEN_SOURCE, 'g'), blank)
    .replace(/https?:\/\/\S+|mailto:\S+/gi, blank);
}

// Finds one link per registry entry. A hit inside a **bold** label links the
// whole label (the bulletin's pattern is a bold lead-in per item); otherwise
// the matched phrase is linked. Longest alias wins, then earliest.
export function suggestLinks(markdown, registry) {
  const text = String(markdown || '');
  const masked = maskProtected(text);
  const boldSpans = [...masked.matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => ({ start: m.index + 2, end: m.index + m[0].length - 2 }));
  const chosen = [];
  const alreadyLinked = new Set([...text.matchAll(new RegExp(LINK_SOURCE, 'g'))].map((m) => m[2].split(/[?#]/)[0]));
  for (const entry of registry?.links || []) {
    if (alreadyLinked.has(entry.url)) continue;
    const hits = [];
    for (const alias of entry.aliases || []) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi');
      for (const match of masked.matchAll(pattern)) {
        const bold = boldSpans.find((span) => match.index >= span.start && match.index + alias.length <= span.end);
        let start = match.index;
        let end = match.index + alias.length;
        if (bold && !/[[\]]/.test(text.slice(bold.start, bold.end))) ({ start, end } = bold);
        hits.push({ start, end, bold: Boolean(bold), aliasLength: alias.length });
      }
    }
    hits.sort((a, b) => Number(b.bold) - Number(a.bold) || b.aliasLength - a.aliasLength || a.start - b.start);
    const hit = hits.find((candidate) => !/[[\]]/.test(text.slice(candidate.start, candidate.end))
      && !chosen.some((other) => candidate.start < other.end && other.start < candidate.end));
    if (hit) chosen.push({ entryId: entry.id, label: entry.label, url: entry.url, start: hit.start, end: hit.end, text: text.slice(hit.start, hit.end) });
  }
  return chosen.sort((a, b) => a.start - b.start).map((suggestion, index) => ({ ...suggestion, id: `${suggestion.entryId}-${index}` }));
}

export function applySuggestions(markdown, suggestions) {
  let text = String(markdown || '');
  [...suggestions].sort((a, b) => b.start - a.start).forEach((suggestion) => {
    text = `${text.slice(0, suggestion.start)}[${suggestion.text}](${suggestion.url})${text.slice(suggestion.end)}`;
  });
  return text;
}
