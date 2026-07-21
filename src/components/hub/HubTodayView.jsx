import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  MessageSquare,
  Soup,
  Sparkles,
  UsersRound,
  Utensils,
} from 'lucide-react';
import { age, api, formatDate, formatTime, todayIso, HubAvatar, Panel, MarkdownPreview } from './hubShared';
import { EmptyState } from './HubIllustrations';

export const HOME_NOTEPAD_TEMPLATE = '#in season#\n- \n\n#events#\n- \n\n#important updates#\n- \n';


export function HomeNotepad({ accessToken }) {
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview' | 'canon'
  const [canon, setCanon] = useState(null);
  const [canonBusy, setCanonBusy] = useState(false);
  const lastSavedRef = useRef('');

  // Parse the notepad's #in season# options into canonical dish matches.
  // commit=true creates any missing dishes in the knowledge graph.
  const loadCanon = useCallback(async (commit = false) => {
    setCanonBusy(true);
    try {
      const res = await api('/api/hub/house-notepad-canon', accessToken, commit ? { method: 'POST', body: '{}' } : undefined);
      setCanon(res);
      if (commit) {
        const created = (res.sections?.inSeason || []).filter((d) => d.created).length;
        setStatus(created ? `Canonicalized · ${created} new dish${created === 1 ? '' : 'es'} created` : 'Canonicalized · all matched');
      }
    } catch (err) {
      setStatus(err.message || 'Unable to canonicalize.');
    } finally {
      setCanonBusy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/api/hub/home-notepad', accessToken);
        if (cancelled) return;
        const next = res.note?.body || HOME_NOTEPAD_TEMPLATE;
        setBody(next);
        lastSavedRef.current = next;
      } catch (err) {
        if (!cancelled) setStatus(err.message || 'Unable to load notepad.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    if (!loaded || body === lastSavedRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/home-notepad', accessToken, {
          method: 'POST',
          body: JSON.stringify({ body }),
        });
        lastSavedRef.current = saved.note?.body ?? body;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, body, loaded]);

  const inSeason = canon?.sections?.inSeason || [];

  return (
    <Panel
      title="House Notepad"
      icon={FileText}
      action={(
        <div className="hub-button-row">
          <button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>Edit</button>
          <button className={mode === 'preview' ? 'is-active' : ''} onClick={() => setMode('preview')}>Preview</button>
          <button
            className={mode === 'canon' ? 'is-active' : ''}
            onClick={() => { setMode('canon'); loadCanon(false); }}
          >
            <CheckCircle2 size={13} /> Canon
          </button>
        </div>
      )}
    >
      <div className="hub-wordpad-tabs">
        <span>{status || 'Shared on every Today tab. In season, events, and important updates.'}</span>
      </div>
      {mode === 'preview' && <MarkdownPreview body={body || HOME_NOTEPAD_TEMPLATE} />}
      {mode === 'edit' && (
        <textarea
          className="hub-wordpad"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          spellCheck="true"
          placeholder={HOME_NOTEPAD_TEMPLATE}
        />
      )}
      {mode === 'canon' && (
        <div className="hub-canon">
          <div className="hub-button-row" style={{ padding: '6px 0' }}>
            <span className="hub-empty" style={{ margin: 0, flex: 1 }}>
              <strong>#in season#</strong> in-stock options, matched to canonical dishes.
            </span>
            <button onClick={() => loadCanon(true)} disabled={canonBusy}>
              {canonBusy ? 'Working…' : 'Canonicalize (create missing)'}
            </button>
          </div>
          {inSeason.length > 0 ? (
            <ul className="hub-rollup-packaging">
              {inSeason.map((d, i) => (
                <li key={`${d.dishEntityId || d.text}-${i}`} className={d.resolved ? '' : 'is-unresolved'}>
                  {d.resolved
                    ? <CheckCircle2 size={14} className="hub-rollup-ok" aria-label="Matched" />
                    : <span className="hub-rollup-qty" aria-hidden>•</span>}
                  <span>
                    {d.text}
                    {d.created && <em className="hub-rollup-canon"> (new)</em>}
                    {!d.created && d.resolved && d.canonicalName
                      && d.canonicalName.toLowerCase() !== d.text.toLowerCase()
                      && <em className="hub-rollup-canon"> → {d.canonicalName}</em>}
                  </span>
                  {!d.resolved && <span className="hub-pill">{d.candidates?.length ? 'review' : 'new'}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hub-empty">{canonBusy ? 'Loading…' : 'No #in season# options yet.'}</p>
          )}
        </div>
      )}
    </Panel>
  );
}


// Customer's home: their plan, this week's menu (with thumbs feedback), editable
// profile, and a read-only intake summary. Replaces the old Subscriber Portal
// Dashboard / This Week / Profile / Past-Menus tabs. Strictly their own data.
export function CustomerHomeView({ accessToken, setTab }) {
  const [profileData, setProfileData] = useState(null);
  const [week, setWeek] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        api('/api/hub/customer-profile', accessToken),
        api('/api/hub/customer-week', accessToken),
      ]);
      setProfileData(p);
      setForm({
        name: p?.customer?.name || '',
        householdSize: p?.profile?.householdSize || '',
        phone: p?.profile?.phone || '',
        address: p?.profile?.address || '',
        deliveryNotes: p?.profile?.deliveryNotes || '',
      });
      setWeek(w);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await api('/api/hub/customer-profile', accessToken, { method: 'PUT', body: JSON.stringify(form) });
      setSaved(true);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const sendFeedback = async (dishId, thumbsUp) => {
    if (!week?.menuWeek) return;
    try {
      await api('/api/hub/customer-week', accessToken, {
        method: 'POST',
        body: JSON.stringify({ dishId, menuWeekId: week.menuWeek.id, thumbsUp }),
      });
      setWeek((prev) => ({
        ...prev,
        items: prev.items.map((it) => it.dishId === dishId
          ? { ...it, feedback: { ...(it.feedback || {}), thumbsUp } }
          : it),
      }));
    } catch { /* ignore */ }
  };

  if (loading) return <p className="hub-empty">Loading your meal prep…</p>;
  const plan = profileData?.plan;
  const survey = profileData?.intakeSurvey;

  return (
    <div className="hub-grid">
      {plan && (
        <Panel title="Your Plan" icon={Soup} action={<button onClick={() => setTab('weeklyMealPrep')}>Meal Prep</button>}>
          <div className="hub-list">
            {plan.items.map((item) => (
              <div className="hub-row" key={item.key}>
                <strong>{item.label}</strong>
                <span>
                  {item.open ? 'as needed' : item.qty != null ? `${item.qty}/week` : ''}
                  {item.serves ? ` · serves ${item.serves.adults} adult${item.serves.kids ? ` + ${item.serves.kids} kids` : ''}` : ''}
                  {item.style ? ` · ${item.style}` : ''}
                </span>
              </div>
            ))}
            {plan.billing && <div className="hub-row"><strong>Billing</strong><span>{plan.billing.cadence} · food {plan.billing.fulfillment}</span></div>}
          </div>
        </Panel>
      )}

      <Panel title="This Week's Menu" icon={Utensils}>
        {!week?.menuWeek && <p className="hub-empty">No menu published yet.</p>}
        {week?.menuWeek && week.items.length === 0 && <p className="hub-empty">No dishes on this week's menu.</p>}
        <div className="hub-list">
          {(week?.items || []).map((item) => (
            <div className="hub-row" key={item.dishId} style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>{item.title}</strong>
                {item.description && <span>{item.description}</span>}
                {item.allergens?.length > 0 && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Allergens: {item.allergens.join(', ')}</span>}
              </div>
              <div className="hub-button-row">
                <button
                  className={item.feedback?.thumbsUp === true ? 'is-active' : ''}
                  title="Thumbs up"
                  onClick={() => sendFeedback(item.dishId, true)}
                >👍</button>
                <button
                  className={item.feedback?.thumbsUp === false ? 'is-active' : ''}
                  title="Thumbs down"
                  onClick={() => sendFeedback(item.dishId, false)}
                >👎</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Your Info" icon={UsersRound}>
        {form && (
          <form onSubmit={saveProfile} className="hub-form">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Household Size<input value={form.householdSize} onChange={(e) => setForm({ ...form, householdSize: e.target.value })} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label>Delivery Notes<textarea value={form.deliveryNotes} onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })} /></label>
            <div className="hub-button-row">
              <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
              {saved && <span className="hub-pill">Saved</span>}
            </div>
          </form>
        )}
      </Panel>

      {survey && typeof survey === 'object' && (
        <Panel title="Intake Survey" icon={FileText}>
          <div className="hub-list">
            {Object.entries(survey).map(([key, val]) => (
              <div className="hub-row" key={key}>
                <strong>{key}</strong>
                <span>{Array.isArray(val) ? val.join(', ') : String(val)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}


export function QuickCapturePanel({ accessToken }) {
  const [text, setText] = useState('');
  const [customer, setCustomer] = useState(null);
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  // Customer search (optional — picking one removes the hardest parse: "who?")
  useEffect(() => {
    if (!custQuery.trim() || custQuery.trim().length < 2 || !accessToken) { setCustResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: custQuery.trim(), type: 'Customer', limit: '6' });
        const data = await api(`/api/brain/entities?${params}`, accessToken);
        if (!cancelled) setCustResults(data.entities || []);
      } catch { if (!cancelled) setCustResults([]); }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [custQuery, accessToken]);

  function reset() { setText(''); setPreview(null); setError(''); setDone(null); }

  async function runPreview() {
    setBusy(true); setError(''); setDone(null);
    try {
      const data = await api('/api/brain/capture', accessToken, {
        method: 'POST',
        body: JSON.stringify({ text, customerId: customer?.id || null, commit: false }),
      });
      setPreview(data);
    } catch (e) { setError(e.message || 'Could not parse'); }
    finally { setBusy(false); }
  }

  async function commit({ force = false } = {}) {
    setBusy(true); setError('');
    try {
      const data = await api('/api/brain/capture', accessToken, {
        method: 'POST',
        body: JSON.stringify({ text, customerId: customer?.id || null, commit: true, force }),
      });
      if (data.committed) setDone({ kind: 'applied', detail: data.applied, preview: data.preview });
      else if (data.capturedToInbox) setDone({ kind: 'inbox', preview: data.preview });
      else setDone({ kind: 'other' });
      setText(''); setPreview(null);
    } catch (e) { setError(e.message || 'Could not apply'); }
    finally { setBusy(false); }
  }

  const medical = preview?.fields?.corrections?.some((c) => c.severity === 'medical');

  return (
    <Panel title="Quick Capture" icon={Sparkles}>
      {customer ? (
        <div className="hub-row" style={{ alignItems: 'center', gap: 8 }}>
          <strong>For: {customer.name}</strong>
          <button onClick={() => setCustomer(null)} style={{ marginLeft: 'auto' }}>change</button>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Customer (optional — sharpens parsing)"
            value={custQuery}
            onChange={(e) => setCustQuery(e.target.value)}
          />
          {custResults.length > 0 && (
            <div className="hub-list" style={{ maxHeight: 120, overflowY: 'auto' }}>
              {custResults.map((c) => (
                <button key={c.id} className="hub-row" onClick={() => { setCustomer(c); setCustQuery(''); setCustResults([]); }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        className="hub-wordpad"
        style={{ minHeight: 56 }}
        rows={2}
        placeholder='e.g. "no legumes this month" · "price: carrots $1.20/lb from CPW" · "task: call flour vendor"'
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); setDone(null); }}
      />

      <div className="hub-button-row" style={{ marginTop: 6 }}>
        <button onClick={runPreview} disabled={busy || !text.trim()}>{busy ? '…' : 'Preview'}</button>
        {preview && !preview.needsConfirm && (
          <button onClick={() => commit()} disabled={busy}>Apply</button>
        )}
        {text && <button onClick={reset} disabled={busy}>Clear</button>}
      </div>

      {error && <p className="hub-empty" style={{ color: 'var(--brand-rose, #b00)' }}>{error}</p>}

      {preview && (
        <div className="hub-canon" style={{ marginTop: 8 }}>
          <div className="hub-row">
            <strong>{preview.intent.replace(/_/g, ' ')}</strong>
            <span>{Math.round((preview.confidence || 0) * 100)}% · {preview.via}</span>
          </div>
          <p style={{ margin: '4px 0' }}>{preview.preview?.summary}</p>
          {preview.needsConfirm && (
            <>
              <p className="hub-empty">
                {medical ? '⚠ Medical/allergy — confirm carefully.'
                  : preview.needsConfirmReason === 'customer-unresolved' ? 'Customer not matched — pick one above or confirm anyway.'
                  : 'Lower confidence — confirm to apply.'}
              </p>
              <div className="hub-button-row">
                <button onClick={() => commit({ force: true })} disabled={busy || (preview.needsConfirmReason === 'customer-unresolved' && !customer)}>
                  Confirm & apply
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {done && (
        <div className="hub-canon" style={{ marginTop: 8 }}>
          {done.kind === 'applied' && <p>✓ Applied: {done.preview?.summary}</p>}
          {done.kind === 'inbox' && <p>↪ Captured to brain inbox for review: {done.preview?.summary}</p>}
          {done.kind === 'other' && <p>Captured.</p>}
        </div>
      )}
    </Panel>
  );
}


export function TodayView({ calendar, docs, conversations, shifts, setTab, accessToken, isCustomer, profile, onRefresh }) {
  const [claimingId, setClaimingId] = useState(null);
  const todaysItems = calendar.filter((item) => String(item.startsAt || '').startsWith(todayIso()));
  const openShifts = shifts.filter((shift) => shift.open).slice(0, 5);
  const recentDocs = docs.slice(0, 4);
  const recentChats = conversations.slice(0, 3);

  const firstName = String(profile?.displayName || '').split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const daypart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const viewerName = String(profile?.displayName || '').toLowerCase();
  const viewerFirst = viewerName.split(/\s+/)[0];
  const myNextShift = shifts
    .filter((shift) => !shift.open && shift.date >= todayIso() && (shift.people || []).some((person) => {
      const normalized = String(person || '').toLowerCase();
      return normalized === viewerName || normalized === viewerFirst;
    }))
    .sort((a, b) => `${a.date}${a.startTime || ''}`.localeCompare(`${b.date}${b.startTime || ''}`))[0];

  const claim = async (shift) => {
    setClaimingId(shift.id);
    try {
      await api('/api/hub/shifts', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'claim', plannerCardId: shift.id }),
      });
      await onRefresh?.();
    } catch { /* refresh shows the true state */ }
    finally { setClaimingId(null); }
  };

  return (
    <div className="hub-home">
      <div className="hub-home-feed">
        <header className="hub-greeting">
          <h2>Good {daypart}, {firstName}</h2>
          <p>
            {todayLabel}
            {myNextShift && <> · next shift: <strong>{myNextShift.title}</strong>, {formatDate(myNextShift.date)} at {formatTime(myNextShift.startTime)}</>}
          </p>
        </header>

        <Panel
          title="Up for Grabs"
          icon={ClipboardList}
          action={openShifts.length > 0
            ? <span className="hub-pill">{openShifts.length} open</span>
            : <button onClick={() => setTab('calendar')}>All shifts</button>}
        >
          {openShifts.length === 0 ? (
            <EmptyState
              art="whisk"
              title="Nothing up for grabs"
              hint="Every shift is covered. The calendar has what's ahead."
            />
          ) : (
            <div className="hub-list">
              {openShifts.map((shift) => (
                <div className="hub-open-shift" key={shift.id}>
                  <div className="hub-open-shift-info">
                    <strong>{shift.title}</strong>
                    <span>{formatDate(shift.date)} · {formatTime(shift.startTime)}{shift.endTime ? ` to ${formatTime(shift.endTime)}` : ''}</span>
                  </div>
                  <button
                    className="hub-claim-button"
                    onClick={() => claim(shift)}
                    disabled={claimingId === shift.id}
                  >
                    <CheckCircle2 size={15} /> {claimingId === shift.id ? 'Claiming…' : 'Pick up'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Today" icon={Home} action={<button onClick={() => setTab('calendar')}>Open calendar</button>}>
          {todaysItems.length === 0 ? (
            <EmptyState
              art="pot"
              title="A quiet day on the books"
              hint="Nothing scheduled today — good day for prep."
            />
          ) : (
            <div className="hub-list">
              {todaysItems.map((item) => (
                <div className="hub-agenda-row" key={item.id}>
                  <span className="hub-time-chip">{formatTime(String(item.startsAt || '').slice(11, 16)) || 'Any time'}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.subtitle && <span>{item.subtitle}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Latest Chatter" icon={MessageSquare} action={<button onClick={() => setTab('chat')}>Open chat</button>}>
          {recentChats.length === 0 ? (
            <EmptyState art="plane" title="No chatter yet" hint="Say hi — everyone sees General." />
          ) : (
            <div className="hub-list">
              {recentChats.map((thread) => (
                <button className="hub-row hub-row-button hub-preview-row" key={thread.id || thread.objectId} onClick={() => setTab('chat')}>
                  <HubAvatar name={thread.title} size={34} />
                  <div className="hub-preview-copy">
                    <strong>{thread.title}</strong>
                    <span>{thread.preview || 'No messages yet'}</span>
                  </div>
                  {thread.lastMessageAt && <small>{age(thread.lastMessageAt)}</small>}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Fresh Documents" icon={FileText} action={<button onClick={() => setTab('docs')}>Open docs</button>}>
          {recentDocs.length === 0 ? (
            <EmptyState art="basket" title="No documents yet" hint="SOPs, menus, and guides land here." />
          ) : (
            <div className="hub-list">
              {recentDocs.map((doc) => (
                <button className="hub-row hub-row-button hub-preview-row" key={doc.id} onClick={() => setTab('docs')}>
                  <div className="hub-preview-copy">
                    <strong>{doc.title}</strong>
                    <span>{doc.category}</span>
                  </div>
                  <span className="hub-pill hub-pill-muted">{doc.visibility}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {!isCustomer && accessToken && (
        <aside className="hub-home-rail">
          <HomeNotepad accessToken={accessToken} />
          <QuickCapturePanel accessToken={accessToken} />
        </aside>
      )}
    </div>
  );
}

