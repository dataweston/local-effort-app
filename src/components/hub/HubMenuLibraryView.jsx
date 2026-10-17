import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from './hubShared';
import vocab from '../../config/menuVocabulary.json';
import MenuSheet, { sortSections } from './MenuSheet';
import MenuComposer from './MenuComposer';
import '../../styles/hub-menu-library.css';

const label = (list, id) => list.find((x) => x.id === id)?.label || id;
const FACET_DEFS = [
  { key: 'courses', title: 'Course', list: vocab.courses },
  { key: 'proteins', title: 'Protein', list: vocab.proteins },
  { key: 'diets', title: 'Diet', list: vocab.diets },
  { key: 'seasons', title: 'Season', list: vocab.seasons },
  { key: 'programs', title: 'Program', list: vocab.programs },
];
// Archive titles end with " — <client>"; the sheet must never print the client.
function sheetTitle(menu) {
  if (menu.kind !== 'archive' || !menu.clientLabel) return menu.title;
  const tail = ` — ${menu.clientLabel}`;
  return menu.title.endsWith(tail) ? menu.title.slice(0, -tail.length) : menu.title;
}

const GROUPS = [
  { id: 'course', title: 'Course', key: 'courses', list: vocab.courses },
  { id: 'protein', title: 'Protein', key: 'proteins', list: vocab.proteins },
  { id: 'season', title: 'Season', key: 'seasons', list: vocab.seasons },
  { id: 'program', title: 'Program', key: 'programs', list: vocab.programs },
  { id: 'none', title: 'A to Z' },
];

function matchesQuery(d, q) {
  if (!q) return true;
  const hay = `${d.title} ${d.description || ''} ${(d.components || []).join(' ')} ${(d.cuisines || []).join(' ')}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function useCatalog(accessToken) {
  const [state, setState] = useState({ loading: true, error: '', dishes: [], preferences: {}, role: 'client' });
  const load = useCallback(async () => {
    try {
      const data = await api('/api/hub/menu-library', accessToken);
      setState({ loading: false, error: '', dishes: data.dishes, preferences: data.preferences || {}, role: data.role });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [accessToken]);
  useEffect(() => { load(); }, [load]);
  return [state, load, setState];
}

function FacetRail({ dishes, filters, setFilters, role }) {
  const defs = role === 'client' ? FACET_DEFS.filter((f) => f.key !== 'programs') : FACET_DEFS;
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 700);
  const active = Object.values(filters).reduce((n, v) => n + (v?.length || 0), 0);
  const toggle = (key, id) => setFilters((f) => {
    const cur = new Set(f[key] || []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    return { ...f, [key]: [...cur] };
  });
  return (
    <details className="ml-rail" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Filters{active ? ` (${active} on)` : ''}</summary>
      <div>
      {defs.map((def) => {
        const opts = def.list.filter((opt) => dishes.some((d) => (d[def.key] || []).includes(opt.id)) || (filters[def.key] || []).includes(opt.id));
        if (!opts.length) return null;
        return (
          <fieldset key={def.key}>
            <legend>{def.title}</legend>
            {opts.map((opt) => {
              const n = dishes.filter((d) => (d[def.key] || []).includes(opt.id)).length;
              return (
                <label key={opt.id} className="ml-check">
                  <input type="checkbox" checked={(filters[def.key] || []).includes(opt.id)} onChange={() => toggle(def.key, opt.id)} />
                  <span>{opt.label}</span>
                  <b>{n}</b>
                </label>
              );
            })}
          </fieldset>
        );
      })}
      {role !== 'client' && (
        <fieldset>
          <legend>Visibility</legend>
          {vocab.visibility.map((opt) => {
            const n = dishes.filter((d) => d.visibility === opt.id).length;
            return (
              <label key={opt.id} className="ml-check">
                <input type="checkbox" checked={(filters.visibility || []).includes(opt.id)} onChange={() => toggle('visibility', opt.id)} />
                <span>{opt.label}</span>
                <b>{n}</b>
              </label>
            );
          })}
        </fieldset>
      )}
      </div>
    </details>
  );
}

function TagEditor({ name, list, value, onChange, disabled }) {
  return (
    <div className="ml-tags" role="group" aria-label={name}>
      {list.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" disabled={disabled} aria-pressed={on}
            className={on ? 'is-on' : ''}
            onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DishDetail({ accessToken, slug, role, preference, onPreference, onSelect, onChanged, onUseInMenu }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const priv = role === 'privileged';
  const staff = role !== 'client';

  const load = useCallback(async () => {
    try {
      const r = await api(`/api/hub/menu-library?view=dish&id=${encodeURIComponent(slug)}`, accessToken);
      setData(r); setDescription(r.dish.description || ''); setError('');
    } catch (err) { setError(err.message); }
  }, [accessToken, slug]);
  useEffect(() => { setData(null); load(); }, [load]);

  const patch = async (changes) => {
    setBusy(true);
    try {
      const r = await api('/api/hub/menu-library', accessToken, { method: 'PATCH', body: JSON.stringify({ id: data.dish.id, ...changes }) });
      setData((d) => ({ ...d, ...r })); setDescription(r.dish.description || ''); setError('');
      onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (error && !data) return <p className="ml-error">{error}</p>;
  if (!data) return <p className="ml-empty">Loading dish…</p>;
  const d = data.dish;
  const inferredNew = (d.dietsInferred || []).filter((x) => !(d.diets || []).includes(x));
  const timeline = data.timeline || [];
  const byYear = timeline.reduce((acc, t) => { const y = t.year || 'Undated'; (acc[y] = acc[y] || []).push(t); return acc; }, {});

  return (
    <section className="ml-detail" aria-label={d.title}>
      <header>
        <h2>{d.title}</h2>
        <div className="ml-actions">
          <button type="button" className={preference === 'favorite' ? 'is-on' : ''} onClick={() => onPreference(d.id, preference === 'favorite' ? 'none' : 'favorite')}>Favorite</button>
          <button type="button" className={preference === 'avoid' ? 'is-on' : ''} onClick={() => onPreference(d.id, preference === 'avoid' ? 'none' : 'avoid')}>Avoid</button>
          {priv && <button type="button" onClick={() => onUseInMenu(d)}>Add to new menu</button>}
        </div>
      </header>
      {error && <p className="ml-error">{error}</p>}

      {priv ? (
        <div className="ml-edit">
          <label>Description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="button" disabled={busy || description === (d.description || '')} onClick={() => patch({ description })}>Save description</button>
        </div>
      ) : d.description ? <p className="ml-desc">{d.description}</p> : null}

      <dl className="ml-facts">
        {FACET_DEFS.map((def) => (
          <div key={def.key}>
            <dt>{def.title}</dt>
            <dd>
              {priv && def.key !== 'diets'
                ? <TagEditor name={def.title} list={def.list} value={d[def.key] || []} disabled={busy} onChange={(v) => patch({ [def.key]: v })} />
                : priv
                ? <TagEditor name="Diet (confirmed)" list={def.list} value={d.diets || []} disabled={busy} onChange={(v) => patch({ diets: v })} />
                : (d[def.key] || []).map((v) => label(def.list, v)).join(', ') || 'None recorded'}
            </dd>
          </div>
        ))}
        {staff && inferredNew.length > 0 && (
          <div>
            <dt>Suggested diets</dt>
            <dd>
              <span className="ml-note">{inferredNew.map((x) => label(vocab.diets, x)).join(', ')} (guessed from the recipe name, not confirmed)</span>
              {priv && <button type="button" disabled={busy} onClick={() => patch({ confirmInferredDiets: true })}>Confirm suggested diets</button>}
            </dd>
          </div>
        )}
        {priv && (
          <div>
            <dt>Who sees it</dt>
            <dd>
              <select value={d.visibility} disabled={busy} onChange={(e) => patch({ libraryVisibility: e.target.value })}>
                {vocab.visibility.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              <span className="ml-note">Public dishes appear on /dishes after the next build. Allergen statements are never published.</span>
            </dd>
          </div>
        )}
      </dl>

      {staff && (
        <>
          <h3>Where it has been served</h3>
          {timeline.length === 0 ? <p className="ml-empty">Not on any recorded menu.</p> : Object.keys(byYear).sort().reverse().map((y) => (
            <div key={y} className="ml-year">
              <h4>{y}</h4>
              <ul className="ml-ledger">
                {byYear[y].map((t, i) => (
                  <li key={`${t.menuId}-${i}`}>
                    <span className="ml-wording">{t.wording}</span>
                    <span className="ml-meta">{label(vocab.programs, t.program)}{t.month ? ` · ${t.month}` : ''}</span>
                    {priv && (
                      <span className="ml-source">
                        {t.clientLabel && t.clientLabel !== 'unknown' ? `${t.clientLabel} · ` : ''}
                        {t.threadId && <a href={`https://mail.google.com/mail/u/0/#all/${t.threadId}`} target="_blank" rel="noreferrer">Open email</a>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(data.variants || []).length > 0 && (
            <>
              <h3>Related versions</h3>
              <ul className="ml-ledger">
                {data.variants.map((v) => <li key={v.id}><button type="button" className="ml-link" onClick={() => onSelect(v.slug)}>{v.title}</button></li>)}
              </ul>
            </>
          )}
          {(data.pairings || []).length > 0 && (
            <>
              <h3>Often served with</h3>
              <ul className="ml-ledger">
                {data.pairings.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="ml-link" onClick={() => onSelect(p.slug)}>{p.title}</button>
                    <span className="ml-meta">{p.together} menus</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function DishBrowser({ accessToken, catalog, reload, setCatalog, onUseInMenu }) {
  const { dishes, preferences, role } = catalog;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [groupBy, setGroupBy] = useState('course');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (selected && window.innerWidth <= 1100) document.querySelector('.ml-browse .ml-pane')?.scrollIntoView({ block: 'start' });
  }, [selected]);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((d) => matchesQuery(d, q));
  }, [dishes, query]);

  const visible = useMemo(() => matched.filter((d) => {
    for (const def of FACET_DEFS) {
      const f = filters[def.key] || [];
      if (f.length && !f.some((id) => (d[def.key] || []).includes(id))) return false;
    }
    const v = filters.visibility || [];
    if (v.length && !v.includes(d.visibility)) return false;
    return true;
  }), [matched, filters]);

  const groups = useMemo(() => {
    const g = GROUPS.find((x) => x.id === groupBy);
    if (!g.key) return [{ id: 'all', title: '', dishes: visible }];
    const out = g.list.map((o) => ({ id: o.id, title: o.label, dishes: visible.filter((d) => (d[g.key] || [])[0] === o.id) }));
    out.push({ id: 'none', title: 'Not sorted yet', dishes: visible.filter((d) => !(d[g.key] || []).length) });
    return out.filter((x) => x.dishes.length);
  }, [visible, groupBy]);

  const setPreference = async (dishId, kind) => {
    try {
      await api('/api/hub/menu-library', accessToken, { method: 'POST', body: JSON.stringify({ action: 'preference', dishId, kind }) });
      setCatalog((s) => ({ ...s, preferences: { ...s.preferences, [dishId]: kind === 'none' ? undefined : kind } }));
    } catch { /* surfaced by reload on next action */ }
  };

  const selectedDish = dishes.find((d) => d.slug === selected);
  if (!dishes.length) {
    return <p className="ml-empty">{role === 'client' ? 'No dishes have been shared with you yet. Your chef can share dishes from here.' : 'The library is empty.'}</p>;
  }

  return (
    <div className="ml-browse">
      <div className="ml-controls">
        <label className="ml-search">
          <span>Search dishes</span>
          <input type="search" value={query} placeholder="beets, lamb, gluten-free dessert…" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="ml-group">
          <span>Group by</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUPS.filter((g) => role !== 'client' || g.id !== 'program').map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </label>
        <p className="ml-count" aria-live="polite">{visible.length} of {dishes.length} dishes</p>
      </div>
      <FacetRail dishes={matched} filters={filters} setFilters={setFilters} role={role} />
      <div className="ml-list">
        {groups.map((g) => (
          <section key={g.id}>
            {g.title && <h3>{g.title}<b>{g.dishes.length}</b></h3>}
            <ul className="ml-ledger">
              {g.dishes.map((d) => (
                <li key={d.id} className={d.slug === selected ? 'is-selected' : ''}>
                  <button type="button" className="ml-row" onClick={() => setSelected(d.slug)} aria-current={d.slug === selected}>
                    <span className="ml-name">{d.title}</span>
                    {preferences[d.id] && <span className="ml-pref">{preferences[d.id] === 'favorite' ? 'favorite' : 'avoid'}</span>}
                    <span className="ml-meta">
                      {d.timesServed ? `${d.timesServed}× · ${d.lastServed || ''}` : role === 'client' ? '' : 'new'}
                      {d.visibility === 'internal' ? '' : ` · ${label(vocab.visibility, d.visibility).toLowerCase()}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="ml-empty">No dishes match. Clear a filter or search a different word.</p>}
      </div>
      <div className="ml-pane">
        {selectedDish
          ? <DishDetail accessToken={accessToken} slug={selectedDish.slug} role={role} preference={preferences[selectedDish.id]}
              onPreference={setPreference} onSelect={setSelected} onChanged={reload} onUseInMenu={onUseInMenu} />
          : <p className="ml-empty">Choose a dish to see how it has been served and what goes with it.</p>}
      </div>
    </div>
  );
}

function MenuBrowser({ accessToken, role, onReuse }) {
  const [menus, setMenus] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('');
  const [kind, setKind] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api('/api/hub/menu-library?view=menus', accessToken).then((r) => setMenus(r.menus)).catch((e) => setError(e.message));
  }, [accessToken]);

  const open = async (id) => {
    try { setDetail(await api(`/api/hub/menu-library?view=menu&id=${id}`, accessToken)); } catch (e) { setError(e.message); }
  };
  if (error) return <p className="ml-error">{error}</p>;
  if (!menus) return <p className="ml-empty">Loading menus…</p>;
  if (!menus.length) {
    return <p className="ml-empty">No menus are shared with this account yet. Past event menus are owner-only; templates and proposals appear here once saved.</p>;
  }
  const q = query.trim().toLowerCase();
  const rows = menus.filter((m) => (!program || m.program === program) && (!kind || m.kind === kind)
    && (!q || `${m.title} ${m.occasion || ''} ${m.clientLabel || ''}`.toLowerCase().includes(q)));

  return (
    <div className="ml-menus">
      <div className="ml-controls">
        <label className="ml-search"><span>Search menus</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="holiday, cabin, brunch…" /></label>
        <label className="ml-group"><span>Program</span>
          <select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">All</option>{vocab.programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></label>
        <label className="ml-group"><span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All</option>{vocab.menuKinds.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></label>
        <p className="ml-count">{rows.length} of {menus.length} menus</p>
      </div>
      <ul className="ml-ledger ml-menu-list">
        {rows.map((m) => (
          <li key={m.id} className={detail?.menu.id === m.id ? 'is-selected' : ''}>
            <button type="button" className="ml-row" onClick={() => open(m.id)}>
              <span className="ml-name">{m.title}</span>
              <span className="ml-meta">{label(vocab.menuKinds, m.kind)} · {label(vocab.programs, m.program)}{m.year ? ` · ${m.year}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="ml-pane">
        {detail ? (
          <>
            <div className="ml-actions">
              <button type="button" onClick={() => window.print()}>Print menu sheet</button>
              {role === 'privileged' && <button type="button" onClick={() => onReuse(detail)}>Start a new menu from this</button>}
            </div>
            {role === 'privileged' && detail.menu.clientLabel && detail.menu.clientLabel !== 'unknown' && (
              <p className="ml-note">Owner only: {detail.menu.clientLabel}{detail.menu.eventDateText ? ` · ${detail.menu.eventDateText}` : ''}{detail.menu.priceNote ? ` · ${detail.menu.priceNote}` : ''}. This line is not on the printed sheet.</p>
            )}
            <MenuSheet title={sheetTitle(detail.menu)} occasion={detail.menu.occasion && detail.menu.kind !== 'archive' ? detail.menu.occasion : ''}
              guests={detail.menu.kind === 'archive' ? '' : detail.menu.guests}
              sections={sortSections(detail.sections).map((s) => ({ ...s, items: s.items }))} />
          </>
        ) : <p className="ml-empty">Choose a menu to see the sheet.</p>}
      </div>
    </div>
  );
}

export function MenuLibraryView({ accessToken }) {
  const [catalog, reload, setCatalog] = useCatalog(accessToken);
  const [view, setView] = useState('dishes');
  const [seed, setSeed] = useState(null);
  const priv = catalog.role === 'privileged';

  if (catalog.loading) return <p className="ml-empty"><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Loading the menu library…</p>;
  if (catalog.error) return <p className="ml-error">{catalog.error}</p>;

  const views = [['dishes', 'Dishes'], ['menus', 'Menus'], ...(priv ? [['compose', 'Build a menu']] : [])];
  const startMenu = (next) => { setSeed(next); setView('compose'); };

  return (
    <div className="ml-root">
      <nav className="ml-tabs" aria-label="Menu library sections">
        {views.map(([id, text]) => (
          <button key={id} type="button" aria-current={view === id ? 'page' : undefined} className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>{text}</button>
        ))}
      </nav>
      {view === 'dishes' && <DishBrowser accessToken={accessToken} catalog={catalog} reload={reload} setCatalog={setCatalog}
        onUseInMenu={(d) => startMenu({ addDish: d })} />}
      {view === 'menus' && <MenuBrowser accessToken={accessToken} role={catalog.role}
        onReuse={(detail) => startMenu({ fromMenu: detail })} />}
      {view === 'compose' && priv && <MenuComposer accessToken={accessToken} dishes={catalog.dishes} seed={seed} onSaved={() => setView('menus')} />}
    </div>
  );
}

export default MenuLibraryView;
