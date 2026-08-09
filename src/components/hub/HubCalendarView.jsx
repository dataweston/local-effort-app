import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarDays, CheckCircle2, CreditCard, Plus, RefreshCw, Upload } from 'lucide-react';
import { GoogleCalendarSync } from '../weeklyplanner/GoogleCalendarSync';
import { api, addDays, formatDate, formatMoneyCents, formatTime, todayIso, Panel, Field } from './hubShared';

export function CalendarView({ accessToken, profile, isPrivileged }) {
  const [anchor, setAnchor] = useState(todayIso());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickView, setQuickView] = useState(isPrivileged ? 'all' : 'mine');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/api/hub/calendar?view=week&date=${anchor}`, accessToken);
      setItems(data.objects || []);
    } finally {
      setLoading(false);
    }
  }, [accessToken, anchor]);

  useEffect(() => { load(); }, [load]);

  const visibleItems = useMemo(() => {
    const viewerName = String(profile?.displayName || '').toLowerCase();
    if (quickView === 'available') return items.filter((item) => item.metadata?.optional || item.subtitle === null);
    if (quickView === 'mine') {
      return items.filter((item) => {
        const people = item.metadata?.people || [];
        return people.some((person) => String(person || '').toLowerCase() === viewerName);
      });
    }
    return items;
  }, [items, profile, quickView]);

  const westonBlocks = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title || ''} ${item.subtitle || ''} ${item.metadata?.category || ''}`.toLowerCase();
      const people = item.metadata?.people || [];
      return people.some((person) => String(person || '').toLowerCase().includes('weston')) &&
        (text.includes('kitchen time') || text.includes('office hours'));
    });
  }, [items]);

  const grouped = useMemo(() => {
    const result = new Map();
    visibleItems.forEach((item) => {
      const date = String(item.startsAt || item.metadata?.date || '').slice(0, 10) || anchor;
      result.set(date, [...(result.get(date) || []), item]);
    });
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems, anchor]);

  return (
    <div className="hub-schedule-stack">
    <Panel
      title="Calendar"
      icon={CalendarDays}
      action={(
        <div className="hub-button-row">
          <button onClick={() => setAnchor(addDays(anchor, -7))}>Previous</button>
          <button onClick={() => setAnchor(todayIso())}>Today</button>
          <button onClick={() => setAnchor(addDays(anchor, 7))}>Next</button>
          <button className={quickView === 'mine' ? 'is-active' : ''} onClick={() => setQuickView('mine')}>My shifts</button>
          <button className={quickView === 'available' ? 'is-active' : ''} onClick={() => setQuickView('available')}>Available shifts</button>
          <button className={quickView === 'all' ? 'is-active' : ''} onClick={() => setQuickView('all')}>All events</button>
          <GoogleCalendarSync accessToken={accessToken} weekStart={anchor} />
          <button onClick={load}><RefreshCw size={13} /></button>
        </div>
      )}
    >
      {loading && <p className="hub-empty">Loading calendar...</p>}
      <div className="hub-calendar-shell">
        <div className="hub-calendar-list">
          {grouped.map(([date, dayItems]) => (
            <section className="hub-day" key={date}>
              <h3>{formatDate(date)}</h3>
              {dayItems.map((item) => (
                <div className={`hub-calendar-item ${item.type === 'event' ? 'hub-calendar-event' : ''} ${item.metadata?.status === 'unavailable' ? 'hub-calendar-unavailable' : ''}`} key={item.id}>
                  <span>{formatTime(String(item.startsAt || '').slice(11, 16)) || 'Any time'}</span>
                  <strong>{item.title}</strong>
                  <small>{item.metadata?.status === 'unavailable' ? 'Unavailable' : (item.type === 'event' ? 'Event' : (item.subtitle || item.type))} {item.metadata?.optional ? '/ open shift' : ''}</small>
                </div>
              ))}
            </section>
          ))}
          {!loading && grouped.length === 0 && <p className="hub-empty">No calendar items this week.</p>}
        </div>
        <aside className="hub-calendar-widget">
          <strong>Weston kitchen time</strong>
          <strong>Weston office hours</strong>
          {westonBlocks.length === 0 ? (
            <span>Waiting on weeklydemo categories.</span>
          ) : westonBlocks.map((item) => (
            <div key={item.id}>
              <span>{formatDate(String(item.startsAt || item.metadata?.date || '').slice(0, 10))}</span>
              <small>{formatTime(String(item.startsAt || '').slice(11, 16)) || 'Any time'} / {item.title}</small>
            </div>
          ))}
        </aside>
      </div>
    </Panel>
    <ShiftsView accessToken={accessToken} profile={profile} isPrivileged={isPrivileged} onCalendarChange={load} />
    </div>
  );
}


export function newAvailabilityDraft() {
  return {
    groupId: '',
    startDate: todayIso(),
    endDate: todayIso(),
    allDay: true,
    startTime: '09:00',
    endTime: '17:00',
    note: '',
  };
}


export function ShiftsView({ accessToken, profile, isPrivileged, onCalendarChange }) {
  const [from, setFrom] = useState(todayIso());
  const [shifts, setShifts] = useState([]);
  const [confirmedEvents, setConfirmedEvents] = useState([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: '', date: todayIso(), startTime: '09:00', endTime: '' });
  const [availabilityDraft, setAvailabilityDraft] = useState(newAvailabilityDraft);
  const [availabilityStatus, setAvailabilityStatus] = useState('');

  const load = useCallback(async () => {
    const [data, payData] = await Promise.all([
      api(`/api/hub/shifts?from=${from}&to=${addDays(from, 14)}`, accessToken),
      api(`/api/hub/payroll?from=${from}&to=${addDays(from, 14)}`, accessToken).catch(() => null),
    ]);
    setShifts(data.shifts || []);
    setConfirmedEvents(data.confirmedEvents || []);
    setAvailabilityBlocks(data.availabilityBlocks || []);
    setPayroll(payData);
  }, [accessToken, from]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const claim = async (shift) => {
    await api('/api/hub/shifts', accessToken, {
      method: 'POST',
      body: JSON.stringify({ action: 'claim', plannerCardId: shift.id }),
    });
    await load();
  };

  const putUp = async (shift) => {
    await api('/api/hub/shifts', accessToken, {
      method: 'POST',
      body: JSON.stringify({ action: 'putUp', plannerCardId: shift.id }),
    });
    await load();
  };

  const createShift = async (event) => {
    event.preventDefault();
    await api('/api/hub/shifts', accessToken, { method: 'POST', body: JSON.stringify(draft) });
    setDraft({ title: '', date: todayIso(), startTime: '09:00', endTime: '' });
    await load();
  };

  const viewerName = profile?.displayName || '';
  const viewerFirstName = viewerName.split(/\s+/)[0];
  const isMine = (shift) => shift.people.some((person) => {
    const normalized = String(person || '').toLowerCase();
    return normalized === viewerName.toLowerCase() || normalized === viewerFirstName.toLowerCase();
  });
  const visibleShifts = isPrivileged ? shifts : shifts.filter((shift) => isMine(shift) || shift.open);

  const startEditing = (shift) => setEditing({
    id: shift.id,
    title: shift.title,
    date: shift.date,
    startTime: shift.startTime || '',
    endTime: shift.endTime || '',
  });

  const saveShift = async (event) => {
    event.preventDefault();
    await api('/api/hub/shifts', accessToken, {
      method: 'POST',
      body: JSON.stringify({ action: 'update', plannerCardId: editing.id, ...editing }),
    });
    setEditing(null);
    await load();
  };

  const saveAvailability = async (event) => {
    event.preventDefault();
    setAvailabilityStatus('Saving...');
    try {
      await api('/api/hub/shifts', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveAvailability', ...availabilityDraft }),
      });
      setAvailabilityDraft(newAvailabilityDraft());
      setAvailabilityStatus('Calendar blocked.');
      await Promise.all([load(), onCalendarChange?.()]);
    } catch (error) {
      setAvailabilityStatus(error.message || 'Unable to block the calendar.');
    }
  };

  const editAvailability = (block) => {
    setAvailabilityDraft({
      groupId: block.groupId,
      startDate: block.startDate,
      endDate: block.endDate,
      allDay: block.allDay,
      startTime: block.startTime || '09:00',
      endTime: block.endTime || '17:00',
      note: block.note || '',
    });
    setAvailabilityStatus('Editing this calendar block.');
  };

  const deleteAvailability = async (block) => {
    if (!window.confirm('Remove this block from the calendar?')) return;
    setAvailabilityStatus('Removing...');
    try {
      await api('/api/hub/shifts', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteAvailability', groupId: block.groupId }),
      });
      if (availabilityDraft.groupId === block.groupId) setAvailabilityDraft(newAvailabilityDraft());
      setAvailabilityStatus('Calendar block removed.');
      await Promise.all([load(), onCalendarChange?.()]);
    } catch (error) {
      setAvailabilityStatus(error.message || 'Unable to remove the calendar block.');
    }
  };

  const shiftAction = (shift) => {
    const mine = isMine(shift);
    if (shift.open && !mine) {
      return <button className="hub-shift-action" onClick={() => claim(shift)}><CheckCircle2 size={14} /> Pick up</button>;
    }
    if (shift.open) {
      return <span className="hub-pill">Up for grabs</span>;
    }
    if (mine || isPrivileged) {
      return <button className="hub-shift-action" onClick={() => putUp(shift)}><Upload size={14} /> Put up for pickup</button>;
    }
    return <span className="hub-pill">Covered</span>;
  };

  return (
    <div className="hub-schedule-stack">
      <Panel title="Confirmed Events" icon={CalendarCheck2}>
        <div className="hub-list">
          {confirmedEvents.length === 0 && <p className="hub-empty">No confirmed events in this two-week window.</p>}
          {confirmedEvents.map((event) => (
            <div className="hub-shift hub-confirmed-event" key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <span>{formatDate(event.date)} / {formatTime(event.startTime) || 'Time TBD'} {event.endTime ? `to ${formatTime(event.endTime)}` : ''}</span>
                <small>{event.people.length ? `Staff: ${event.people.join(', ')}` : 'Staff assignments not entered yet'}</small>
              </div>
              <span className="hub-pill">Confirmed</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title={isPrivileged ? 'Staff Shift Calendar' : 'My Shift Calendar'}
        icon={CalendarDays}
        action={(
          <div className="hub-button-row">
            <button onClick={() => setFrom(addDays(from, -14))}>Previous</button>
            <button onClick={() => setFrom(todayIso())}>Today</button>
            <button onClick={() => setFrom(addDays(from, 14))}>Next</button>
          </div>
        )}
      >
        <div className="hub-list">
          {visibleShifts.length === 0 && <p className="hub-empty">No shifts in this two-week window.</p>}
          {visibleShifts.map((shift) => (
            <div className="hub-shift" key={shift.id}>
              {editing?.id === shift.id ? (
                <form className="hub-form hub-shift-edit" onSubmit={saveShift}>
                  {isPrivileged && <Field label="Shift name"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>}
                  <Field label="Date"><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} required /></Field>
                  <Field label="Start"><input type="time" value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} required /></Field>
                  <Field label="End"><input type="time" value={editing.endTime} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} /></Field>
                  <div className="hub-button-row">
                    <button className="hub-primary-button" type="submit">Save</button>
                    <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <strong>{shift.title}</strong>
                    <span>{formatDate(shift.date)} / {formatTime(shift.startTime)} {shift.endTime ? `to ${formatTime(shift.endTime)}` : ''}</span>
                    <small>
                      {shift.people.length ? `Assigned: ${shift.people.join(', ')}` : 'No one assigned yet'}
                      {shift.putUp ? ' / put up for pickup' : ''}
                    </small>
                  </div>
                  <div className="hub-button-row">
                    {(isPrivileged || isMine(shift)) && <button onClick={() => startEditing(shift)}>Edit</button>}
                    {shiftAction(shift)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div className="hub-grid">
        <Panel title="Block My Calendar" icon={CalendarDays}>
          <form className="hub-form" onSubmit={saveAvailability}>
            <Field label="From">
              <input
                type="date"
                value={availabilityDraft.startDate}
                onChange={(e) => setAvailabilityDraft({
                  ...availabilityDraft,
                  startDate: e.target.value,
                  endDate: availabilityDraft.endDate < e.target.value ? e.target.value : availabilityDraft.endDate,
                })}
                required
              />
            </Field>
            <Field label="Through">
              <input type="date" min={availabilityDraft.startDate} value={availabilityDraft.endDate} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, endDate: e.target.value })} required />
            </Field>
            <Field label="Block">
              <select value={availabilityDraft.allDay ? 'all_day' : 'hours'} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, allDay: e.target.value === 'all_day' })}>
                <option value="all_day">Whole days</option>
                <option value="hours">Specific hours each day</option>
              </select>
            </Field>
            {!availabilityDraft.allDay && (
              <div className="hub-grid">
                <Field label="Start"><input type="time" value={availabilityDraft.startTime} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, startTime: e.target.value })} required /></Field>
                <Field label="End"><input type="time" value={availabilityDraft.endTime} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, endTime: e.target.value })} required /></Field>
              </div>
            )}
            <Field label="Optional context"><textarea value={availabilityDraft.note} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, note: e.target.value })} rows={3} placeholder="For example: class, appointment, or out of town" /></Field>
            <div className="hub-button-row">
              <button className="hub-primary-button" type="submit">{availabilityDraft.groupId ? 'Save calendar block' : 'Block calendar'}</button>
              {availabilityDraft.groupId && <button type="button" onClick={() => { setAvailabilityDraft(newAvailabilityDraft()); setAvailabilityStatus(''); }}>Cancel edit</button>}
            </div>
            {availabilityStatus && <p className="hub-share-status" role="status">{availabilityStatus}</p>}
          </form>
        </Panel>

        {isPrivileged && (
          <Panel title="Add Open Shift" icon={Plus}>
          <form className="hub-form" onSubmit={createShift}>
            <Field label="Shift name"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Date"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></Field>
            <Field label="Start"><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} required /></Field>
            <Field label="End"><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></Field>
            <button className="hub-primary-button" type="submit"><Plus size={13} /> Add shift</button>
          </form>
          </Panel>
        )}
      </div>

      <Panel title={isPrivileged ? 'Staff Availability Blocks' : 'My Availability Blocks'} icon={CalendarDays}>
        <div className="hub-list">
          {availabilityBlocks.length === 0 && <p className="hub-empty">No calendar blocks overlap this two-week window.</p>}
          {availabilityBlocks.map((block) => (
            <div className="hub-shift" key={block.groupId}>
              <div>
                <strong>{block.people?.[0] || 'Staff'} - unavailable</strong>
                <span>
                  {formatDate(block.startDate)}{block.endDate !== block.startDate ? ` through ${formatDate(block.endDate)}` : ''}
                  {' / '}{block.allDay ? 'whole day' : `${formatTime(block.startTime)} to ${formatTime(block.endTime)}`}
                </span>
                <small>{block.note || 'No additional context'}</small>
              </div>
              <div className="hub-button-row">
                <button onClick={() => editAvailability(block)}>Edit</button>
                <button onClick={() => deleteAvailability(block)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="My Pay Evidence" icon={CreditCard}>
        {!payroll && <p className="hub-empty">Pay evidence is unavailable right now.</p>}
        {payroll && (
          <div className="hub-grid">
            <div className="hub-row">
              <strong>{payroll.currentHourlyRateCents ? `${formatMoneyCents(payroll.currentHourlyRateCents)} / hour` : 'Rate not available'}</strong>
              <span>{payroll.square?.currentHourlyRateCents ? 'Current Square Labor wage setting' : 'Company Brain evidence'}</span>
            </div>
            <div className="hub-row">
              <strong>{payroll.square?.paidHours ?? 0} closed timecard hours</strong>
              <span>{formatDate(payroll.period.from)} through {formatDate(payroll.period.to)}</span>
            </div>
            <div className="hub-row">
              <strong>{formatMoneyCents(payroll.square?.grossWagesCents || 0)} estimated gross</strong>
              <span>Closed Square timecards only; pay stubs, tax, and deductions are not included.</span>
            </div>
            {payroll.brain?.documentedHours != null && (
              <div className="hub-row">
                <strong>{payroll.brain.documentedHours} documented hours / {formatMoneyCents(payroll.brain.documentedGrossCents || 0)} gross</strong>
                <span>Square Payroll document evidence through {formatDate(payroll.brain.asOf)}; shown separately from live Labor timecards.</span>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

