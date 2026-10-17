import { describe, it, expect } from 'vitest';
import registry from '../shared/home-bulletin-links.json';
import {
  parseInline, resolveBulletin, validateBulletin, suggestLinks, applySuggestions, safeHref, dropState,
} from '../shared/home-bulletin.mjs';
import { PUBLIC_ROUTES } from '../src/config/routes';

const PRODUCTION_TEXT = `## oct 16 2026

**firehouse is live** - all season long, book a beautifully rebuilt firehouse for your private events.
**frozen pizza drop** - we're accepting orders through october 28. fill your freezers now.
**chefs**- we're not hiring, per se, but we're recruiting. come join the cooperative.`;

const at = (iso) => Date.parse(iso);
const drop = { opensAt: '2026-10-13T00:00:00-05:00', closesAt: '2026-10-28T23:59:59-05:00', fulfillment: 'Week of November 2, 2026' };
const facts = { pizza: drop };

const flatten = (nodes) => nodes.flatMap((node) => (node.children ? [node, ...flatten(node.children)] : [node]));

describe('link registry', () => {
  it('only points at routes that are still public', () => {
    const publicPaths = new Set(PUBLIC_ROUTES.map((route) => route.path));
    expect(registry.links.filter((entry) => !publicPaths.has(entry.url)).map((entry) => entry.url)).toEqual([]);
  });

  it('gives no alias to two entries', () => {
    const aliases = registry.links.flatMap((entry) => entry.aliases.map((alias) => alias.toLowerCase()));
    expect(new Set(aliases).size).toBe(aliases.length);
  });
});

describe('parseInline', () => {
  const links = (text) => flatten(parseInline(text)).filter((node) => node.type === 'link');

  it('links a page path and an https URL, and opens neither unsafe scheme', () => {
    expect(links('[Book](/firehouse)')[0]).toMatchObject({ href: '/firehouse', internal: true });
    expect(links('[Menu](https://example.com/menu)')[0]).toMatchObject({ href: 'https://example.com/menu', internal: false });
    expect(links('[x](javascript:alert(1))')).toEqual([]);
    expect(links('[x](http://example.com)')).toEqual([]);
    expect(links('[x](//evil.example)')).toEqual([]);
  });

  it('keeps a link whole when its text or URL contains underscores or asterisks', () => {
    expect(links('snake_case [Menu](https://example.com/a_b_c) other_word')).toHaveLength(1);
    expect(links('[*Menu*](/firehouse)')).toHaveLength(1);
  });

  it('keeps parentheses inside a URL', () => {
    expect(links('[Foo](https://en.wikipedia.org/wiki/Foo_(bar))')[0].href).toBe('https://en.wikipedia.org/wiki/Foo_(bar)');
  });

  it('accepts mailto and tel', () => {
    expect(safeHref('mailto:yum@localeffortfood.com')).toBe('mailto:yum@localeffortfood.com');
    expect(safeHref('tel:+16125550123')).toBe('tel:+16125550123');
  });

  it('leaves an unfilled placeholder as visible text', () => {
    expect(links('[link text](https://)')).toEqual([]);
  });
});

describe('drop state and live values', () => {
  it('evaluates the window in absolute time, closing at the instant', () => {
    expect(dropState(drop, at('2026-10-12T12:00:00-05:00'))).toBe('upcoming');
    expect(dropState(drop, at('2026-10-20T12:00:00-05:00'))).toBe('open');
    expect(dropState(drop, at('2026-10-29T00:00:00-05:00'))).toBe('closed');
    expect(dropState({}, at('2026-10-20T12:00:00-05:00'))).toBe('closed');
  });

  it('writes the closing day in Chicago time, not UTC', () => {
    // 23:59:59 CDT on Oct 28 is already Oct 29 in UTC.
    const out = resolveBulletin('orders through {{pizza.closes}}', facts, at('2026-10-20T12:00:00-05:00'));
    expect(out.markdown).toBe('orders through october 28');
  });

  it('hides a line outside its state and says why', () => {
    const text = '{{when pizza.open}}**frozen pizza drop** closes {{pizza.closes}}\nalways here';
    const open = resolveBulletin(text, facts, at('2026-10-20T12:00:00-05:00'));
    expect(open.markdown).toBe('**frozen pizza drop** closes october 28\nalways here');
    const closed = resolveBulletin(text, facts, at('2026-11-01T12:00:00-05:00'));
    expect(closed.markdown).toBe('always here');
    expect(closed.notes[0]).toMatchObject({ line: 1 });
  });

  it('hides a line whose value is missing instead of printing a raw token', () => {
    const out = resolveBulletin('ready {{pizza.fulfillment}}\nkept', { pizza: { ...drop, fulfillment: '' } }, at('2026-10-20T12:00:00-05:00'));
    expect(out.markdown).toBe('kept');
  });

  it('collapses the blank lines a hidden line leaves behind', () => {
    const out = resolveBulletin('# top\n\n{{when pizza.closed}}gone\n\nbottom', facts, at('2026-10-20T12:00:00-05:00'));
    expect(out.markdown).toBe('# top\n\nbottom');
  });
});

describe('validateBulletin', () => {
  it('accepts registry pages, dynamic slugs and https links', () => {
    expect(validateBulletin('[a](/firehouse) [b](/blog/some-post-1) [c](https://example.com)', registry)).toEqual([]);
  });

  it('rejects a retired page, an unknown path, an unfilled link and an unknown live value', () => {
    const problems = validateBulletin('[a](/about)\n[b](/nope)\n[c](https://)\n{{pizza.price}}', registry);
    expect(problems.map((problem) => problem.line)).toEqual([1, 2, 3, 4]);
  });

  it('does not treat code samples as links or tokens', () => {
    expect(validateBulletin('`[a](/about)` and `{{x}}`', registry)).toEqual([]);
  });
});

describe('suggestLinks on the production bulletin', () => {
  const suggestions = suggestLinks(PRODUCTION_TEXT, registry);

  it('links each bold lead-in to its page', () => {
    expect(suggestions.map((s) => [s.text, s.url])).toEqual([
      ['firehouse is live', '/firehouse'],
      ['frozen pizza drop', '/pizza-on-smith'],
      ['chefs', '/chef-cooperative'],
    ]);
  });

  it('produces markdown the server accepts and the renderer turns into links', () => {
    const linked = applySuggestions(PRODUCTION_TEXT, suggestions);
    expect(linked).toContain('**[firehouse is live](/firehouse)**'.replace('**[', '**[').replace(']**', ']**'));
    expect(validateBulletin(linked, registry)).toEqual([]);
    const hrefs = flatten(parseInline(linked.split('\n')[2])).filter((n) => n.type === 'link').map((n) => n.href);
    expect(hrefs).toEqual(['/firehouse']);
  });

  it('never links text that is already linked, in code, or inside a URL', () => {
    const text = '[firehouse](/firehouse) and `chefs` and https://example.com/firehouse';
    expect(suggestLinks(text, registry)).toEqual([]);
  });

  it('is stable: applying suggestions leaves nothing more to suggest', () => {
    expect(suggestLinks(applySuggestions(PRODUCTION_TEXT, suggestions), registry)).toEqual([]);
  });
});
