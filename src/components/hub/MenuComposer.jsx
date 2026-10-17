import React, { useEffect, useMemo, useState } from 'react';
import { api } from './hubShared';
import vocab from '../../config/menuVocabulary.json';
import MenuSheet from './MenuSheet';

const EMPTY = { id: null, title: '', kind: 'proposal', program: 'events', occasion: '', guests: '', notes: '', clientLabel: '', visibility: 'internal', sections: [] };

function fromDetail(detail) {
  const m = detail.menu;
  const archive = m.kind === 'archive';
  return {
    ...EMPTY,
    // Archive menus are history: reuse them as a copy, never edit in place or carry the client over.
    id: archive ? null : m.id,
    title: archive ? '' : m.title,
    kind: archive ? 'proposal' : m.kind,
    program: m.program,
    occasion: archive ? '' : m.occasion || '',
    guests: archive ? '' : m.guests || '',
    notes: archive ? '' : m.notes || '',
    visibility: archive ? 'internal' : m.visibility,
    sections: detail.sections.map((s) => ({ course: s.course, items: s.items.map((i) => ({ dishId: i.dishId, title: i.title, wording: i.wording })) })),
  };
}

function addItem(sections, course, item) {
  const next = sections.map((s) => ({ ...s, items: [...s.items] }));
  let s = next.find((x) => x.course === course);
  if (!s) { s = { course, items: [] }; next.push(s); }
  if (!s.items.some((i) => i.dishId === item.dishId)) s.items.push(item);
  return next;
}

export default function MenuComposer({ accessToken, dishes, seed, onSaved }) {
  const [menu, setMenu] = useState(() => {
    let base = seed?.fromMenu ? fromDetail(seed.fromMenu) : { ...EMPTY };
    if (seed?.addDish) {
      const d = seed.addDish;
      base = { ...base, sections: addItem(base.sections, d.courses?.[0] || 'main', { dishId: d.id, title: d.title, wording: d.title }) };
    }
    return base;
  });
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setMessage(''); }, [menu]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return dishes.filter((d) => words.every((w) => d.title.toLowerCase().includes(w))).slice(0, 12);
  }, [dishes, query]);

  const set = (key) => (e) => setMenu((m) => ({ ...m, [key]: e.target.value }));
  const move = (course, index, delta) => setMenu((m) => ({
    ...m,
    sections: m.sections.map((s) => {
      if (s.course !== course) return s;
      const items = [...s.items]; const j = index + delta;
      if (j < 0 || j >= items.length) return s;
      [items[index], items[j]] = [items[j], items[index]];
      return { ...s, items };
    }),
  }));
  const remove = (course, index) => setMenu((m) => ({
    ...m, sections: m.sections.map((s) => (s.course === course ? { ...s, items: s.items.filter((_, i) => i !== index) } : s)).filter((s) => s.items.length),
  }));
  const reword = (course, index, wording) => setMenu((m) => ({
    ...m, sections: m.sections.map((s) => (s.course === course ? { ...s, items: s.items.map((it, i) => (i === index ? { ...it, wording } : it)) } : s)),
  }));

  const save = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/api/hub/menu-library', accessToken, { method: 'POST', body: JSON.stringify({ action: 'save-menu', ...menu }) });
      setMenu((m) => ({ ...m, id: r.id }));
      setMessage('Saved.');
      if (onSaved) onSaved(r.id);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const total = menu.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="ml-compose">
      <div className="ml-compose-form">
        <h2>{menu.id ? 'Edit menu' : 'New menu'}</h2>
        <label>Title<input value={menu.title} onChange={set('title')} placeholder="Spring dinner for twelve" /></label>
        <div className="ml-two">
          <label>Kind
            <select value={menu.kind} onChange={set('kind')}>
              {vocab.menuKinds.filter((k) => k.id !== 'archive').map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select></label>
          <label>Program
            <select value={menu.program} onChange={set('program')}>
              {vocab.programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select></label>
        </div>
        <div className="ml-two">
          <label>Occasion<input value={menu.occasion} onChange={set('occasion')} placeholder="Rehearsal dinner" /></label>
          <label>Guests<input value={menu.guests} onChange={set('guests')} placeholder="12" /></label>
        </div>
        <label>Client (owner only, not on the sheet)<input value={menu.clientLabel} onChange={set('clientLabel')} /></label>
        <label>Note on the sheet<textarea rows={2} value={menu.notes} onChange={set('notes')} /></label>
        <label>Who sees it
          <select value={menu.visibility} onChange={set('visibility')}>
            {vocab.visibility.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select></label>

        <h3>Add dishes</h3>
        <div className="ml-two">
          <label>Find a dish<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type part of a name" /></label>
          <label>Put it under
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">Its usual course</option>
              {vocab.courses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></label>
        </div>
        <ul className="ml-ledger">
          {results.map((d) => (
            <li key={d.id}>
              <button type="button" className="ml-row" onClick={() => {
                setMenu((m) => ({ ...m, sections: addItem(m.sections, course || d.courses?.[0] || 'main', { dishId: d.id, title: d.title, wording: d.title }) }));
              }}>
                <span className="ml-name">{d.title}</span>
                <span className="ml-meta">{d.timesServed ? `${d.timesServed}× served` : 'new'}</span>
              </button>
            </li>
          ))}
        </ul>

        <h3>On this menu</h3>
        {total === 0 && <p className="ml-empty">Nothing yet. Search for a dish above.</p>}
        {menu.sections.map((s) => (
          <div key={s.course} className="ml-year">
            <h4>{vocab.courses.find((c) => c.id === s.course)?.label || s.course}</h4>
            <ul className="ml-ledger">
              {s.items.map((it, i) => (
                <li key={`${it.dishId}-${i}`} className="ml-compose-item">
                  <input aria-label={`Wording for ${it.title}`} value={it.wording} onChange={(e) => reword(s.course, i, e.target.value)} />
                  <button type="button" onClick={() => move(s.course, i, -1)} aria-label="Move up" disabled={i === 0}>Up</button>
                  <button type="button" onClick={() => move(s.course, i, 1)} aria-label="Move down" disabled={i === s.items.length - 1}>Down</button>
                  <button type="button" onClick={() => remove(s.course, i)} aria-label={`Remove ${it.title}`}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="ml-actions">
          <button type="button" className="ml-primary" disabled={busy || !menu.title.trim() || total === 0} onClick={save}>{menu.id ? 'Save changes' : 'Save menu'}</button>
          <button type="button" onClick={() => window.print()} disabled={total === 0}>Print sheet</button>
          {message && <span className="ml-note" role="status">{message}</span>}
          {error && <span className="ml-error" role="alert">{error}</span>}
        </div>
      </div>
      <div className="ml-pane">
        <MenuSheet title={menu.title} occasion={menu.occasion} guests={menu.guests} sections={menu.sections} notes={menu.notes} />
      </div>
    </div>
  );
}
