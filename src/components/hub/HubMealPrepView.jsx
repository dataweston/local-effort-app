import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, FileText, RefreshCw, Soup } from 'lucide-react';
import { api, formatDate, formatMoneyCents, Panel, MarkdownPreview } from './hubShared';

export function CustomerSpendCell({ customer, intakeDate }) {
  const txns = customer.transactions || [];
  const txnCount = customer.transactionCount || 0;
  const total = customer.totalSpendCents || 0;
  const emailThreads = customer.emailThreads || [];
  const emailCount = customer.emailThreadCount || 0;

  return (
    <div className="hub-spend-cell">
      <span>
        <strong>{formatMoneyCents(total)}</strong>
        {txnCount > 0 ? ` lifetime / ${txnCount} txn${txnCount === 1 ? '' : 's'}` : ' / no transactions'}
      </span>
      {txns.slice(0, 3).map((txn) => (
        <small key={txn.id}>
          {formatDate(String(txn.occurredAt).slice(0, 10))} — {formatMoneyCents(txn.amountCents)}
          {txn.matchedBy === 'email' ? ' (email match)' : ''}
        </small>
      ))}
      {emailCount > 0 ? (
        <small className="hub-spend-emails">
          ✉ {emailCount} email thread{emailCount === 1 ? '' : 's'}
          {emailThreads[0]?.subject ? ` — latest: "${emailThreads[0].subject}"` : ''}
        </small>
      ) : (
        <small className="hub-spend-emails">No email threads found</small>
      )}
      {intakeDate && (
        <small>Intake: {formatDate(String(intakeDate).slice(0, 10))}</small>
      )}
    </div>
  );
}


// Derive the prep week's Sunday from a note tab id ("week-2026-06-28"), so the
// menu panel parses the correct week's notepad.
export function weekStartFromTabId(tabId) {
  const match = /week-(\d{4}-\d{2}-\d{2})$/.exec(String(tabId || ''));
  return match ? match[1] : null;
}


export const MENU_MEAL_ORDER = ['dinner', 'lunch', 'breakfast', 'kids', 'snacks'];

export const MENU_MEAL_LABEL = { dinner: 'Dinners', lunch: 'Lunches', breakfast: 'Breakfasts', kids: 'Kids', snacks: 'Snacks' };


// Permanent category headings seeded into a blank Weekly Meal Prep week. Mirrors
// MENU_TEMPLATE in api-handlers/hub/_mealMenuParse.js (keep in sync). Under each
// heading: a dish NAME line (main component), then prose description/side lines.
export const MEAL_MENU_TEMPLATE = ['Dinners', 'Lunches', 'Breakfasts', 'Kids', 'Snacks']
  .map((h) => `${h}\n`).join('\n');


// Staff-only view of the week's MENU and its formalized canonical dishes.
// Source: the active week's Weekly Meal Prep notepad, parsed via
// /api/hub/master-menu. Dishes are grouped by meal category (the subheading they
// sit under: #dinners# #lunches# #breakfasts# #kids meals#), and each is matched
// to a knowledge-graph Dish entity. Counts, stations, and chef assignment are a
// later prep-breakdown step, not shown here.
export function MasterMenuPanel({ accessToken, weekStart, weekLabel }) {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
      const next = await api(`/api/hub/master-menu${query}`, accessToken);
      setMenu(next);
    } catch (err) {
      setError(err.message || 'Unable to parse menu.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, weekStart]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const dishes = menu?.dishes || [];
  const summary = menu?.summary;
  // Group dishes by meal, preserving the canonical meal order.
  const byMeal = MENU_MEAL_ORDER
    .map((meal) => ({ meal, dishes: dishes.filter((d) => d.meal === meal) }))
    .filter((group) => group.dishes.length > 0);

  return (
    <Panel
      title="This Week&apos;s Menu"
      icon={ClipboardList}
      action={(
        <div className="hub-button-row">
          <button onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
      )}
    >
      <p className="hub-empty" style={{ marginTop: 0 }}>
        Parsed from {weekLabel ? <strong>{weekLabel}</strong> : 'this week'}&apos;s prep notepad
        below, under <code>Dinners / Lunches / Breakfasts / Kids / Snacks</code>. Write each dish as a
        name line (the main component) then a line or two of sides &amp; ingredients. Each dish name is
        matched to a canonical dish in the knowledge graph.
      </p>
      <div className="hub-foodinputs-status">
        <span>
          {loading
            ? 'Parsing menu...'
            : error
            || (summary
              ? `${summary.total} dishes · ${summary.resolved} matched · ${summary.unresolved} unmatched`
              : 'No menu yet.')}
        </span>
      </div>

      {byMeal.length > 0 ? (
        byMeal.map((group) => (
          <div key={group.meal} className="hub-menu-meal">
            <h5>{MENU_MEAL_LABEL[group.meal]}</h5>
            <ul className="hub-rollup-packaging">
              {group.dishes.map((dish, i) => (
                <li key={`${dish.dishEntityId || dish.text}-${i}`} className={dish.resolved ? '' : 'is-unresolved'}>
                  {dish.resolved
                    ? <CheckCircle2 size={14} className="hub-rollup-ok" aria-label="Matched" />
                    : <span className="hub-rollup-qty" aria-hidden>•</span>}
                  <span>
                    {dish.text}
                    {dish.resolved && dish.canonicalName
                      && dish.canonicalName.toLowerCase() !== dish.text.toLowerCase()
                      && <em className="hub-rollup-canon"> → {dish.canonicalName}</em>}
                    {dish.description && <small className="hub-dish-desc">{dish.description}</small>}
                  </span>
                  {!dish.resolved && (
                    <span className="hub-pill" title="No confident canonical dish match">
                      {dish.candidates?.length ? 'review' : 'new'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        !loading && (
          <p className="hub-empty">
            Write this week&apos;s menu in the prep notepad below under
            {' '}<code>Dinners</code>, <code>Lunches</code>, <code>Breakfasts</code>,
            {' '}<code>Kids</code>, <code>Snacks</code> — one dish name per line with sides
            beneath — then refresh.
          </p>
        )
      )}
    </Panel>
  );
}


export function WeeklyMealPrepView({ accessToken, isPrivileged, isCustomer = false }) {
  const [data, setData] = useState({
    customers: [],
    pausedCustomers: [],
    upcomingCustomers: [],
    notes: [],
    mode: 'staff',
  });
  const [activeTab, setActiveTab] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(false);
  const lastSavedRef = useRef('');
  const activeTabRef = useRef(activeTab);

  // Customer view is read-only. Respect both the backend mode and a privileged
  // user's "preview as customer" toggle so the preview is faithful.
  const canEditNotes = data.mode !== 'customer' && !isCustomer;

  const load = useCallback(async ({ keepStatus = false } = {}) => {
    setLoading(true);
    try {
      const next = await api('/api/hub/weekly-meal-prep', accessToken);
      setData(next);
      const selected = (next.notes || []).find((note) => note.id === activeTabRef.current) || next.notes?.[0];
      if (selected) {
        activeTabRef.current = selected.id;
        setActiveTab(selected.id);
        // Seed the permanent category headings into a blank week so the menu
        // always has Dinners/Lunches/Breakfasts/Kids/Snacks to write under.
        const body = selected.document?.body || (next.mode !== 'customer' ? MEAL_MENU_TEMPLATE : '');
        setNoteBody(body);
        lastSavedRef.current = body;
      }
      if (!keepStatus) setStatus('');
    } catch (err) {
      setStatus(err.message || 'Unable to load weekly meal prep.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  useEffect(() => {
    if (!canEditNotes || noteBody === lastSavedRef.current) return;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/weekly-meal-prep', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, body: noteBody }),
        });
        lastSavedRef.current = saved.note?.document?.body || noteBody;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, canEditNotes, noteBody]);

  const chooseNote = (tabId) => {
    const next = data.notes.find((note) => note.id === tabId);
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    // Blank week → seed the permanent category headings (staff only).
    const body = next?.document?.body || (canEditNotes ? MEAL_MENU_TEMPLATE : '');
    setNoteBody(body);
    lastSavedRef.current = body;
  };

  const customerLabel = isCustomer
    ? 'Customer view'
    : isPrivileged
    ? 'Privileged view: staff and customer'
    : 'Staff view';

  return (
    <div className="hub-meal-prep">
      <Panel
        title={isCustomer ? 'Your Meal Prep Profile' : 'Active Customer Profiles'}
        icon={Soup}
        action={(
          <div className="hub-button-row">
            {!isCustomer && <span className="hub-pill">{customerLabel}</span>}
            <button onClick={() => load()}><RefreshCw size={13} /></button>
          </div>
        )}
      >
        {loading && <p className="hub-empty">Loading meal prep...</p>}
        <div className="hub-customer-table-wrap">
          <table className="hub-customer-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Profile</th>
                <th>Latest Order</th>
                {!isCustomer && <th>Spend &amp; History</th>}
                {!isCustomer && <th>Brain Signals</th>}
              </tr>
            </thead>
            <tbody>
              {data.customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    {customer.mealPrepStage === 'paused' && <span className="hub-pill hub-pill-muted">paused</span>}
                    {customer.source === 'brain' && customer.mealPrepStage !== 'paused' && <span className="hub-pill">from intake</span>}
                    <span>{customer.users.map((user) => user.email).join(', ') || customer.slug || ''}</span>
                  </td>
                  <td>{customer.planSummary || customer.priceTierDefault || 'No plan rules'}</td>
                  <td>
                    <span>{customer.profile.householdSize || 'Household not set'}</span>
                    <small>{customer.profile.deliveryNotes || customer.profile.address || ''}</small>
                  </td>
                  <td>
                    {customer.latestOrder ? (
                      <>
                        <span>{formatDate(String(customer.latestOrder.weekStart).slice(0, 10))} / {customer.latestOrder.itemCount} items</span>
                        <small>{customer.latestOrder.items.slice(0, 3).map((item) => `${item.quantity}x ${item.title}`).join('; ')}</small>
                      </>
                    ) : 'No order yet'}
                  </td>
                  {!isCustomer && (
                    <td>
                      <CustomerSpendCell customer={customer} />
                    </td>
                  )}
                  {!isCustomer && (
                    <td>
                      <span>{customer.brain?.inferences?.[0]?.summary || customer.brain?.assertions?.[0]?.dst || 'No active brain signal'}</span>
                      {customer.brain?.properties && <small>{customer.brain.properties.householdSize || customer.brain.properties.slug || ''}</small>}
                    </td>
                  )}
                </tr>
              ))}
              {!loading && data.customers.length === 0 && (
                <tr><td colSpan={isCustomer ? 4 : 6}>No customer profiles are linked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {data.mode !== 'customer' && (data.pausedCustomers || []).length > 0 && (
        <Panel
          title="Paused Customers"
          icon={Soup}
          action={<span className="hub-pill hub-pill-muted">{data.pausedCustomers.length} paused</span>}
        >
          <details>
            <summary className="hub-paused-summary">
              Show paused customer profiles
            </summary>
            <div className="hub-customer-table-wrap">
              <table className="hub-customer-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Profile</th>
                    <th>Spend &amp; History</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pausedCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.name}</strong>
                        <span>{customer.users.map((user) => user.email).join(', ') || customer.slug || ''}</span>
                      </td>
                      <td>{customer.planSummary || customer.priceTierDefault || 'No plan rules'}</td>
                      <td>
                        <span>{customer.profile.householdSize || 'Household not set'}</span>
                        <small>{customer.profile.deliveryNotes || customer.profile.address || ''}</small>
                      </td>
                      <td><CustomerSpendCell customer={customer} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>
      )}

      {data.mode !== 'customer' && (
        <Panel
          title="Upcoming Customers"
          icon={Soup}
          action={<span className="hub-pill">Intake submitted</span>}
        >
          <p className="hub-empty" style={{ marginTop: 0 }}>
            New profiles created from the website meal-prep intake. They&apos;re not active customers yet.
          </p>
          <div className="hub-customer-table-wrap">
            <table className="hub-customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Household</th>
                  <th>Estimate</th>
                  <th>Preferred Start</th>
                  <th>History &amp; Emails</th>
                </tr>
              </thead>
              <tbody>
                {(data.upcomingCustomers || []).map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <span>{customer.email || customer.phone || '—'}</span>
                    </td>
                    <td>
                      <span>{customer.householdSize || 'Household not set'}</span>
                      <small>{customer.address || ''}</small>
                    </td>
                    <td>
                      {customer.estimateWeeklyTotal != null
                        ? `$${Number(customer.estimateWeeklyTotal).toLocaleString('en-US', { maximumFractionDigits: 2 })}/wk`
                        : 'No estimate'}
                    </td>
                    <td>{customer.preferredStartDate ? formatDate(String(customer.preferredStartDate).slice(0, 10)) : 'Flexible'}</td>
                    <td>
                      <CustomerSpendCell customer={customer} intakeDate={customer.intakeSubmittedAt} />
                    </td>
                  </tr>
                ))}
                {!loading && (data.upcomingCustomers || []).length === 0 && (
                  <tr><td colSpan="5">No upcoming customers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {canEditNotes && (
        <MasterMenuPanel
          accessToken={accessToken}
          weekStart={weekStartFromTabId(activeTab)}
          weekLabel={(data.notes || []).find((note) => note.id === activeTab)?.title || ''}
        />
      )}

      <Panel
        title="Shared Prep Notes"
        icon={FileText}
        action={canEditNotes ? (
          <div className="hub-button-row">
            <button className={preview ? '' : 'is-active'} onClick={() => setPreview(false)}>Edit</button>
            <button className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>Preview</button>
          </div>
        ) : null}
      >
        <div className="hub-wordpad-tabs">
          {(data.notes || []).map((note) => (
            <button key={note.id} className={activeTab === note.id ? 'is-active' : ''} onClick={() => chooseNote(note.id)}>
              {note.title}
            </button>
          ))}
          <span>
            {status || (canEditNotes
              ? 'Shared with all staff. Tabs fall off Tuesday and archive to the brain.'
              : 'Shared with your household by the kitchen.')}
          </span>
        </div>
        {canEditNotes ? (
          preview ? (
            <MarkdownPreview body={noteBody} />
          ) : (
            <textarea
              className="hub-wordpad"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              spellCheck="true"
              placeholder={MEAL_MENU_TEMPLATE}
            />
          )
        ) : (
          <MarkdownPreview body={noteBody || 'No staff note published yet.'} />
        )}
      </Panel>
    </div>
  );
}

