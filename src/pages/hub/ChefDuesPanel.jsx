import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, Field, Panel, formatCurrency } from '../../components/hub/hubShared';

const time = value => value ? `${new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))} Central (${new Date(value).toISOString()})` : 'Not recorded';
const dollars = value => formatCurrency(value);
function Terms({ terms }) {
  return <section className="hub-chef-agreement"><h3>Accepted dues terms — {terms.version}</h3>
    {['billingText', 'refundText', 'cancellationText', 'waiverText'].map(key => <p key={key}>{terms.dues?.[key]}</p>)}
    <details><summary>Exact adopted agreement</summary><p>{terms.agreementText}</p><p>{terms.acceptanceText}</p><p>Approval reference: {terms.approvalReference}</p></details>
    <p>Questions: <a href={`mailto:${terms.replyEmail}`}>{terms.replyEmail}</a></p>
  </section>;
}
function Assessment({ row }) {
  return <section>
    <h3>{row.period} — {row.status.replaceAll('_', ' ')}</h3>
    <p>Assessment {row.id} · version {row.version}<br />Invoice {row.invoice.number || row.invoice.id}</p>
    <p>{time(row.serviceStartAt)} through {time(row.serviceEndAt)} (end exclusive). Due {time(row.dueAt)}.</p>
    <dl><dt>Adopted assessment</dt><dd>{dollars(row.assessedCents)}</dd><dt>Reduction / waiver</dt><dd>{dollars(row.assessedCents - row.payableCents)} — {row.adjustmentReason || 'None'}</dd><dt>Payable assessment</dt><dd>{dollars(row.payableCents)}</dd><dt>Verified payments</dt><dd>{dollars(row.invoice.paidCents)}</dd><dt>Verified refunds</dt><dd>{dollars(row.invoice.refundedCents)}</dd><dt>Net invoice outstanding</dt><dd>{dollars(row.invoice.outstandingCents)}</dd></dl>
    {row.invoice.refundedCents > 0 && <p>A refund does not authorize another payment. Contact the owner about the remaining invoice balance.</p>}
    <p>Owner assessment reason: {row.reason}</p>
    <p>Accepted by {row.acceptedName} at {time(row.acceptedAt)}. {row.frozenAt ? `Payment facts locked ${time(row.frozenAt)}.` : 'Owner may revise this assessment until checkout begins.'}</p>
    <Terms terms={row.terms} />
    <h4>Payment and refund allocations</h4>
    {row.invoice.allocations.length ? <ul>{row.invoice.allocations.map(a => <li key={a.id}>{a.type} {dollars(a.amountCents)} — {a.status} · {a.provider} reference {a.reference} · {time(a.occurredAt)}{a.receiptUrl && <React.Fragment> · <a href={a.receiptUrl} target="_blank" rel="noreferrer">Provider receipt</a></React.Fragment>}</li>)}</ul> : <p>No verified payment or refund allocations.</p>}
    <h4>Owned checkout attempts</h4>
    {row.attempts.length ? <ul>{row.attempts.map(a => <li key={a.id}>Attempt {a.id} — {a.status}, {dollars(a.requestedCents)}<br />Commercial order {a.orderId || 'Not recorded'} · Square order {a.squareOrderId || 'Not yet recovered'} · Payment {a.paymentId || 'Not verified'}<br />Started {time(a.startedAt)} · Completed {time(a.completedAt)}{a.failureCode && <p>{a.failureCode}: {a.failureMessage}</p>}</li>)}</ul> : <p>No checkout attempt. Waivers require no payment.</p>}
    <details><summary>Assessment action history</summary><ol className="hub-chef-history">{row.history.map(e => <li key={e.version}>{e.action} · version {e.version} · {time(e.createdAt)}<p>{e.reason}</p>{e.actorUid && <p>Actor {e.actorUid} · {e.outcome}</p>}</li>)}</ol></details>
  </section>;
}
function ConfirmationEvidence({ value }) {
  if (!value) return null;
  return <section><h4>Durable confirmation jobs</h4>{!value.available && <p role="alert">{value.error}</p>}
    {value.missingKeys?.map(key => <p key={key}>Missing durable job: {key}. Repair confirmations after verified payment; do not send separately.</p>)}
    <ul>{value.jobs.map(job => <li key={job._id}>{job.idempotencyKey} — {job.status}<br />Attempts {job.attempts} · Next retry {time(job.nextAttemptAt)} · Sender accepted {time(job.sentAt)} · Provider message ID {job.providerMessageId || 'None'}{job.lastError && <p>Last error {time(job.lastErrorAt)}: {job.lastError}</p>}{job.deadLetterReason && <p>Dead letter: {job.deadLetterReason}</p>}</li>)}</ul>
    <p>{value.deliveryNote || 'Job state is not proof of inbox delivery. Suppression remains enforced by the shared worker.'}</p>
  </section>;
}
export function ChefDuesPanel({ token, owner = false }) {
  const endpoint = owner ? '/api/hub/chef-dues-admin' : '/api/hub/chef-dues';
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const detailRequest = useRef(0);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [memberLookup, setMemberLookup] = useState('');
  const [period, setPeriod] = useState('');
  const [cents, setCents] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [reason, setReason] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [refundId, setRefundId] = useState('');
  const [role, setRole] = useState('customer');
  const load = useCallback(async (cursor = null, membershipFilter = '') => {
    try {
      setError('');
      const query = new URLSearchParams();
      if (cursor) query.set('cursor', cursor);
      if (owner && membershipFilter.trim()) query.set('membershipId', membershipFilter.trim());
      const result = await api(`${endpoint}${query.size ? `?${query}` : ''}`, token);
      setData(previous => cursor && previous ? { ...result, memberships: previous.memberships, assessments: [...previous.assessments, ...result.assessments] } : result);
    } catch (err) { setError(err.message); }
  }, [endpoint, token, owner]);
  const choose = useCallback(async id => {
    const request = ++detailRequest.current;
    setSelected(id); setDetail(null); setConfirmed(false); setReason(''); setPaymentId(''); setRefundId('');
    setPeriod(''); setCents(''); setDueAt(''); setAdjustmentReason('');
    if (!id) return;
    try {
      const result = await api(`${endpoint}?id=${encodeURIComponent(id)}`, token);
      if (request !== detailRequest.current) return;
      setDetail(result); const row = result.assessment;
      setPeriod(row.period); setCents(String(row.payableCents)); setDueAt(new Date(row.dueAt).toISOString()); setAdjustmentReason(row.adjustmentReason);
    } catch (err) { if (request === detailRequest.current) setError(err.message); }
  }, [endpoint, token]);
  useEffect(() => { detailRequest.current += 1; setData(null); setSelected(''); setDetail(null); setMessage(''); load(); }, [load]);
  async function save(body, method = 'POST') {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api(endpoint, token, { method, body: JSON.stringify(body) });
      setConfirmed(false);
      if (result.url) { window.location.assign(result.url); return; }
      setMessage(result.outcome ? JSON.stringify(result.outcome) : 'Assessment saved.');
      await load();
      if (owner && result.assessment) await choose(result.assessment.id);
    } catch (err) { setError(`${err.message} Reload current records before retrying; no return URL is proof of payment.`); }
    finally { setBusy(false); }
  }
  const row = detail?.assessment;
  const member = data?.memberships?.find(m => m.id === memberId);
  const manage = owner && data?.canManage && (!detail || detail.canManage !== false);
  const action = name => save({ action: name, id: row.id, expectedVersion: row.version, confirmed, reason, ...(name === 'revise' ? { period, payableCents: Number(cents), dueAt, adjustmentReason } : {}), ...(name === 'recover-payment' ? { paymentId } : {}), ...(name === 'verify-refund' ? { refundId } : {}), ...(name === 'retry-confirmation' ? { role } : {}) }, name === 'revise' ? 'PATCH' : 'POST');
  return <Panel title={owner ? 'Chef dues administration' : 'Your chef cooperative dues'} action={<button type="button" disabled={busy} onClick={async () => { await load(); if (owner && selected) await choose(selected); }}>Reload current records</button>}>
    <p>Private, explicitly assessed service dues only. No signup charge, recurring autopay, wage offset or ownership purchase. Browser payment returns never mark an invoice paid or refunded.</p>
    {error && <p className="hub-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!data && <p>Loading dues records…</p>}
    {owner && data && !data.canManage && <p>Read-only review. Owner actions are unavailable.</p>}
    {data?.assessments.length === 0 && <p>No assessed periods. Dues are not charged automatically.</p>}
    {owner ? <React.Fragment>
      <Field label="Exact membership ID filter (optional)"><input value={memberLookup} onChange={e => setMemberLookup(e.target.value)} /></Field><button type="button" disabled={busy} onClick={async () => { await choose(''); setMemberId(''); await load(null, memberLookup); }}>Load this membership / clear filter</button>
      <Field label="Assessment to inspect"><select value={selected} onChange={e => choose(e.target.value)}><option value="">Choose an assessment</option>{data?.assessments.map(a => <option key={a.id} value={a.id}>{a.applicant.name} — {a.period} — {a.status} — {a.id}</option>)}</select></Field>
      {row && <React.Fragment><p>{row.applicant.name} · {row.applicant.email} · contact preference {row.applicant.contactPreference}</p><Assessment row={row} /><ConfirmationEvidence value={detail.confirmations} />
        <details><summary>Exact persisted customer and owner confirmation snapshots</summary>{row.confirmationFacts ? row.confirmationFacts.confirmationTemplates.map(c => <section key={c.role}><h4>{c.role}: {c.payload.subject}</h4><p>To {c.payload.to.map(to => to.email).join(', ')} · Reply {c.payload.replyTo.email}</p><pre>{c.payload.textContent}</pre></section>) : <p>Not yet frozen. Both confirmation snapshots will be persisted before creating a hosted link, independently of Brevo API-key availability.</p>}</details>
      </React.Fragment>}
      {manage && <React.Fragment>
        <h3>{row ? 'Act on this exact assessment version' : 'Assess one service month'}</h3>
        {!row && <Field label="Admitted membership"><select value={memberId} onChange={e => { const m = data.memberships.find(item => item.id === e.target.value); setMemberId(e.target.value); setCents(m?.terms.dues ? String(m.terms.dues.amountCents) : ''); }}><option value="">Choose admitted member</option>{data.memberships.map(m => <option key={m.id} value={m.id}>{m.name} — {m.email} — {m.id}</option>)}</select></Field>}
        {data.membershipListLimited && <p>The first 200 active memberships are listed. Enter an exact membership ID in the filter to load another member.</p>}
        {member && !row && <React.Fragment><p>Accepted {time(member.acceptedAt)} · admitted {time(member.admittedAt)} · membership version {member.version}</p><Terms terms={member.terms} /></React.Fragment>}
        {(!row || !row.frozenAt) && <React.Fragment><Field label="Service month"><input type="month" value={period} onChange={e => setPeriod(e.target.value)} disabled={Boolean(row)} /></Field><Field label="Payable amount in integer cents (zero records a waiver)"><input type="number" min="0" step="1" value={cents} onChange={e => setCents(e.target.value)} /></Field><Field label="Due timestamp with explicit timezone (ISO 8601)"><input value={dueAt} onChange={e => setDueAt(e.target.value)} /></Field><Field label="Reduction or waiver reason (required below adopted amount)"><textarea value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} /></Field></React.Fragment>}
        <Field label="Owner action reason (visible to this member)"><textarea value={reason} onChange={e => setReason(e.target.value)} /></Field><Field label="Explicit action confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I authorize this action for the displayed member, assessment and version. No separate email send or new refund is requested.</Field>
        {!row ? <button type="button" disabled={busy || !confirmed || !reason.trim() || !member || cents === '' || !period || !dueAt} onClick={() => save({ action: 'assess', membershipId: member.id, membershipVersion: member.version, period, payableCents: Number(cents), adjustmentReason, dueAt, confirmed, reason })}>Assess this period</button> : <React.Fragment>
          {!row.frozenAt && <button type="button" disabled={busy || !confirmed || !reason.trim() || cents === ''} onClick={() => action('revise')}>Save assessment revision</button>}
          {row.frozenAt && !row.invoice.allocations.length && <button type="button" disabled={busy || !confirmed || !reason.trim()} onClick={() => action('recover-link')}>Recover the original one-off hosted link</button>}
          {row.frozenAt && <React.Fragment><Field label="Square payment ID to verify (not a return URL)"><input value={paymentId} onChange={e => setPaymentId(e.target.value)} /></Field><button type="button" disabled={busy || !confirmed || !reason.trim() || !paymentId.trim()} onClick={() => action('recover-payment')}>Verify and reconcile completed payment</button><button type="button" disabled={busy || !confirmed || !reason.trim()} onClick={() => action('repair-confirmations')}>Repair missing durable confirmation jobs</button><Field label="Failed confirmation role"><select value={role} onChange={e => setRole(e.target.value)}><option value="customer">Customer</option><option value="owner">Owner</option></select></Field><button type="button" disabled={busy || !confirmed || !reason.trim()} onClick={() => action('retry-confirmation')}>Requeue failed job through shared outbox</button><p>Sent and suppressed jobs are not requeued. Sending remains the configured worker’s responsibility.</p><Field label="Completed Square refund ID to verify"><input value={refundId} onChange={e => setRefundId(e.target.value)} /></Field><button type="button" disabled={busy || !confirmed || !reason.trim() || !refundId.trim()} onClick={() => action('verify-refund')}>Verify existing provider refund and record allocation</button><p>This action cannot issue a refund; notes and owner confirmation do not prove that money was returned.</p></React.Fragment>}
        </React.Fragment>}
      </React.Fragment>}
    </React.Fragment> : data?.assessments.map(a => <section key={a.id}><Assessment row={a} />{a.canPay && <button type="button" disabled={busy} onClick={() => save({ action: 'checkout', id: a.id, expectedVersion: a.version })}>{a.frozenAt ? 'Resume original one-off Square checkout' : `Pay ${dollars(a.payableCents)} once with Square`}</button>}</section>)}
    {data?.nextCursor && <button type="button" disabled={busy} onClick={() => load(data.nextCursor, data.membershipFilter || '')}>Load more assessments</button>}
  </Panel>;
}
