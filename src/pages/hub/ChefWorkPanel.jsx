import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, Field, Panel } from '../../components/hub/hubShared';

const central = value => value ? `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(value))} Central` : 'Not recorded';
const money = cents => {
  const value = BigInt(cents || 0);
  return `$${new Intl.NumberFormat('en-US').format(value / 100n)}.${String(value % 100n).padStart(2, '0')}`;
};
const input = (name, label, type = 'text', options) => ({ name, label, type, options });
const reason = input('reason', 'Reason / independent decision evidence', 'textarea');
const period = [input('startsAt', 'Start — ISO date/time with Z or explicit offset'), input('endsAt', 'End — ISO date/time with Z or explicit offset')];
const centralZone = { timeZone: 'America/Chicago' };
const opportunityFields = [input('kind', 'Opportunity kind', 'select', [['referral', 'Referral'], ['prep', 'Prep']]), input('title', 'Title'), input('scope', 'Actual scope', 'textarea'), ...period, input('responseDeadline', 'Response deadline — ISO with explicit zone'), input('compensation', 'Explicit compensation, contracting party, payment timing', 'textarea'), input('engagementReference', 'Paid engagement reference'), input('suitability', 'Suitability, safety and availability requirements', 'textarea'), input('allocationPolicyReference', 'Adopted member-first ordering / rotation policy reference'), reason];
const contributionFields = [input('minutes', 'Actual minutes worked (not claimed or scheduled)', 'number'), input('category', 'Actual authorized contribution category'), input('workDate', 'Date actually worked — Central', 'date'), input('compensationReference', 'Compensation / lawful exchange evidence reference'), input('evidenceReference', 'Completed work evidence reference — no private tax documents'), input('policyReference', 'Exact qualifying policy provision'), reason];
const engagementFields = [...period, input('scope', 'Exact negotiated scope', 'textarea'), input('compensation', 'Exact rate, valuation, contracting party and payment timing', 'textarea'), input('facility', 'Facility and capacity negotiated (or explicit not applicable)', 'textarea'), input('schedule', 'Exact privately negotiated dates / schedule', 'textarea'), input('safetyInsurance', 'Safety, classification and insurance facts', 'textarea'), input('cancellationTerms', 'Exact cancellation / dispute terms', 'textarea'), input('authorityReference', 'Owner contracting authority evidence'), reason];

function Form({ title, fields, onSubmit, fixed = {}, initial = {}, owner = false, disabled = false }) {
  const [values, setValues] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...fixed };
      for (const field of fields) {
        const value = values[field.name] ?? (field.type === 'checkbox' ? false : '');
        payload[field.name] = field.type === 'number' ? Number(value) : value;
      }
      if (owner) payload.confirmed = confirmed;
      await onSubmit(payload); setConfirmed(false);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="hub-chef-form">
    <h4>{title}</h4>
    {fields.map(field => <Field label={field.label} key={field.name}>
      {field.type === 'select' ? <select required value={values[field.name] ?? ''} onChange={e => setValues({ ...values, [field.name]: e.target.value })}><option value="">Choose…</option>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        : field.type === 'multi' ? <select multiple required value={values[field.name] || []} onChange={e => setValues({ ...values, [field.name]: [...e.target.selectedOptions].map(option => option.value) })}>{field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          : field.type === 'textarea' ? <textarea required value={values[field.name] ?? ''} onChange={e => setValues({ ...values, [field.name]: e.target.value })} />
            : field.type === 'checkbox' ? <input type="checkbox" required checked={values[field.name] === true} onChange={e => setValues({ ...values, [field.name]: e.target.checked })} />
              : <input type={field.type} required min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 1 : undefined} value={values[field.name] ?? ''} onChange={e => setValues({ ...values, [field.name]: e.target.value })} />}
    </Field>)}
    {owner && <Field label="I independently reviewed this exact record/version and confirm this action is authorized."><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /></Field>}
    <button className="hub-primary-button" disabled={disabled || busy || (owner && !confirmed)}>{busy ? 'Saving…' : title}</button>
    {error && <p className="hub-error" role="alert">{error} Use Reload records before retrying a conflict; do not blindly resubmit.</p>}
  </form>;
}
function Facts({ entries }) { return <dl>{entries.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => <React.Fragment key={label}><dt><strong>{label}</strong></dt><dd>{String(value)}</dd></React.Fragment>)}</dl>; }
function Times({ row }) { return <Facts entries={[["Start", central(row.startsAt)], ["Start server ISO", row.startsAt], ["End", central(row.endsAt)], ["End server ISO", row.endsAt], ["Operating zone", row.timeZone]]} />; }
function History({ entries = [] }) { return <details><summary>Full recorded history ({entries.length})</summary><ol className="hub-chef-history">{entries.map(entry => <li key={entry.id}><strong>{entry.action || entry.decision}</strong> · {central(entry.createdAt)}<Facts entries={[["Version / reviewed revision", entry.version || entry.revision], ["Reason", entry.reason], ["Actor", entry.actorUid], ["Verified minutes", entry.verifiedMinutes], ["Policy provision", entry.policyReference], ["Evidence reference", entry.evidenceReference], ["Private independent / client choice evidence", entry.clientChoiceEvidence], ["Member identity", entry.membershipId]]} /></li>)}</ol></details>; }
function Template({ snapshot }) { return snapshot ? <details open><summary>{snapshot.title} · version {snapshot.version} · CMS revision {snapshot._rev}</summary><p className="hub-help">Kind: {snapshot.kind} · Authority: {snapshot.approvalReference}</p><div className="hub-markdown-preview">{snapshot.agreementText.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div><p><strong>{snapshot.acceptanceText}</strong></p><p>Questions: <a href={`mailto:${snapshot.replyEmail}`}>{snapshot.replyEmail}</a></p></details> : null; }
function Policy({ snapshot }) { return snapshot ? <details><summary>Exact adopted membership policy snapshot</summary><Facts entries={[["Title", snapshot.title], ["Version", snapshot.version], ["CMS revision", snapshot._rev], ["Authority", snapshot.approvalReference], ["Operations enabled", snapshot.operationsEnabled], ["Reply contact", snapshot.replyEmail]]} /><p>{snapshot.agreementText}</p><p>{snapshot.acceptanceText}</p></details> : null; }

export function ChefWorkPanel({ token, owner = false }) {
  const [section, setSection] = useState('opportunities');
  const [loadedData, setData] = useState(null);
  const data = loadedData?.section === section ? loadedData : null;
  const [related, setRelated] = useState({ engagements: [], contributions: [] });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const loadGeneration = useRef(0);
  const base = `/api/hub/${owner ? 'chef-work-admin' : 'chef-work'}`;
  const load = useCallback(async (cursor = null) => {
    const generation = ++loadGeneration.current;
    const isCurrent = () => generation === loadGeneration.current;
    setBusy(true); setError('');
    try {
      const result = await api(`${base}?section=${section}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, token);
      if (!isCurrent()) return;
      setData(previous => isCurrent() ? (cursor ? { ...result, items: [...(previous?.items || []), ...result.items] } : result) : previous);
      if (!cursor && ['contributions', 'closes'].includes(section)) {
        const target = section === 'contributions' ? 'engagements' : 'contributions';
        let next = null; const items = [];
        do {
          const page = await api(`${base}?section=${target}${next ? `&cursor=${encodeURIComponent(next)}` : ''}`, token);
          if (!isCurrent()) return;
          items.push(...page.items); next = page.nextCursor;
        } while (next);
        setRelated(previous => isCurrent() ? { ...previous, [target]: items } : previous);
      }
    } catch (err) { if (isCurrent()) setError(err.message); }
    finally { if (isCurrent()) setBusy(false); }
  }, [base, section, token]);
  useEffect(() => {
    setData(null); setRelated({ engagements: [], contributions: [] }); setMessage('');
    load();
    return () => { loadGeneration.current++; };
  }, [load]);
  async function save(payload) {
    const generation = loadGeneration.current;
    await api(base, token, { method: 'POST', body: JSON.stringify(payload) });
    if (generation !== loadGeneration.current) return;
    setMessage('Recorded. No payment, message, payroll invitation, kitchen booking or equity issuance was triggered.');
    await load();
  }
  const canManage = owner && data?.canManage;
  const canParticipate = !owner && data?.canParticipate;
  const members = (data?.memberships || []).map(member => [member.id, `${member.application.name} · ${member.id} · policy ${member.policyId}`]);
  const policyOptions = (data?.policies || []).filter(policy => policy.snapshot?.operationsEnabled === true).map(policy => [policy.id, `${policy.snapshot.title} · ${policy.version} · ${policy.id}`]);
  const memberField = input('membershipId', 'Stable admitted member identity', 'select', members);
  const policyField = input('policyId', 'Adopted operations-enabled policy', 'select', policyOptions);
  const signedEngagements = related.engagements.filter(row => row.signedAt).map(row => [row.id, `${row.kind} · ${row.scope} · ${row.id}`]);
  const submitFields = [input('engagementId', 'Your signed engagement', 'select', signedEngagements), ...contributionFields];
  const props = { onSubmit: save, owner: true };
  return <Panel title={owner ? 'Chef work administration' : 'Your chef work and agreements'} action={<button type="button" onClick={() => load()} disabled={busy}>Reload records</button>}>
    <p>Private member-first opportunities are not guaranteed hours. Accepting or claiming is not an assignment, completed work, wages, capital or ownership. Compensation and kitchen use are separately negotiated; no automatic unpaid work, wage offset, payroll invitation or kitchen booking occurs here.</p>
    <p>No W-9, SSN, EIN, bank details or tax documents in any field. Use references to approved secure records, not bearer links or document contents. All displayed operating times are America/Chicago (Central); date/time inputs require an explicit ISO zone.</p>
    <nav aria-label="Chef work sections">{[['opportunities', 'Opportunities'], ['contributions', 'Actual contributions'], ['closes', 'Capital period records'], ['engagements', 'Work / kitchen agreements']].map(([key, label]) => <button type="button" key={key} disabled={section === key} onClick={() => { loadGeneration.current++; setData(null); setRelated({ engagements: [], contributions: [] }); setError(''); setSection(key); }}>{label}</button>)}</nav>
    {error && <p role="alert" className="hub-error">{error} Reload before retrying.</p>}
    {message && <p role="status">{message}</p>}
    {busy && <p>Loading private records…</p>}
    {data && !canManage && owner && <p>Read-only review. Mutation controls are unavailable.</p>}
    {data && !canParticipate && !owner && <p>History remains available. New actions require active admission, accepted terms, and a current adopted operations-enabled policy.</p>}
    {canManage && section === 'opportunities' && <details><summary>Post a new referral / prep opportunity</summary><Form {...props} title="Post opportunity" fields={[policyField, ...opportunityFields]} fixed={{ action: 'post-opportunity', ...centralZone }} /></details>}
    {canParticipate && section === 'contributions' && <details><summary>Submit actual completed contribution</summary><p>Only post-admission actual work qualifies for submission here. Independent referred work and kitchen barter are not automatically qualifying patronage. The independent reviewer records qualifying policy and verified minutes.</p><Form title="Submit actual contribution" fields={submitFields} fixed={{ action: 'submit-contribution' }} onSubmit={save} /></details>}
    {canManage && section === 'closes' && <details><summary>Prepare a separately reviewed period close</summary><p>Only actual approved pool/class/retention decisions may be entered. Contributions require independent approval; the close requires accountant and authority evidence plus explicit owner confirmation. Whole-cent largest remainder allocation uses stable member IDs for ties. Retained total is pool × basis points rounded down; member retained cents are apportioned from gross allocations. No payout or company-capitalization change is made.</p><Form {...props} title="Prepare period close" fields={[policyField, input('classReference', 'Actual class / instrument rights reference'), input('periodStart', 'Completed period first date — Central', 'date'), input('periodEnd', 'Completed period last date — Central', 'date'), input('poolCents', 'Authorized class-specific actual allocable pool — USD integer cents', 'number'), input('retentionBps', 'Approved retention in basis points (0–10000)', 'number'), input('accountantEvidence', 'Accountant review, debts/reserves and solvency evidence', 'textarea'), input('authorityEvidence', 'Actual class/pool/retention authority evidence', 'textarea'), input('contributionIds', 'Select approved, unallocated contributions (multiple selection)', 'multi', related.contributions.filter(row => row.status === 'approved' && !row.allocation).map(row => [row.id, `${row.membership.application.name} · ${row.revisions.at(-1)?.workDate} · ${row.id} · revision ${row.currentRevision}`])), reason]} fixed={{ action: 'prepare-close', ...centralZone }} /></details>}
    {canManage && section === 'engagements' && <details><summary>Offer a privately negotiated work / kitchen agreement</summary>{data.templateError && <p role="alert">{data.templateError}</p>}{data.templates.map(template => <details key={template._id}><summary>Use {template.title} · {template.version}</summary><Template snapshot={template} /><Form {...props} title="Confirm and offer exact agreement" fields={[memberField, ...engagementFields]} fixed={{ action: 'offer-engagement', templateId: template._id, templateRevision: template._rev, ...centralZone }} /></details>)}</details>}
    {data?.items.length === 0 && <p>No records in this section.</p>}
    {data?.items.map(row => <section key={`${row.id}-${row.version || ''}`} className="hub-chef-review-detail">
      <h3>{row.title || (section === 'engagements' ? `${row.kind} agreement` : section === 'contributions' ? `Contribution · ${row.membership?.application.name || row.id}` : `Capital record · ${row.classReference || row.close?.classReference}`)}</h3>
      <p>{row.status || row.close?.status} · Record {row.id}{row.version ? ` · current version ${row.version}` : ''}</p>
      {section === 'opportunities' && <>
        <Times row={row} /><Facts entries={[["Actual scope", row.scope], ["Compensation", row.compensation], ["Engagement reference", row.engagementReference], ["Suitability", row.suitability], ["Member-first policy", row.allocationPolicyReference], ["Response deadline", central(row.responseDeadline)], ["Deadline server ISO", row.responseDeadline], ["Assignment", owner ? row.assignedMembershipId : row.assignedToYou ? 'You are independently assigned' : 'No assignment to you'], ["Assignment reason", row.assignmentReason], ["Client / independent choice", row.clientChoiceEvidence]]} />
        {row.offers.map(offer => <div key={offer.id}><h4>Private offer {offer.id} · {offer.status} · version {offer.version}</h4><Facts entries={[["Member", offer.membership?.application.name], ["Stable membership identity", offer.membershipId], ["Eligibility / availability", offer.eligibilityEvidence], ["Ordering evidence", offer.orderingEvidence], ["Response reason", offer.responseReason], ["Responded", offer.respondedAt && central(offer.respondedAt)]]} />{!owner && offer.status === 'offered' && new Date(row.responseDeadline) > new Date() && row.status === 'open' && canParticipate && <><Form title="Accept interest — not assignment or hours" fields={[reason]} fixed={{ action: 'accept-offer', id: offer.id, expectedVersion: offer.version }} onSubmit={save} /><Form title="Decline offer" fields={[reason]} fixed={{ action: 'decline-offer', id: offer.id, expectedVersion: offer.version }} onSubmit={save} /></>}{offer.status === 'offered' && new Date(row.responseDeadline) <= new Date() && <p>Response window expired. This is not an acceptance or assignment.</p>}</div>)}
        {canManage && row.status !== 'cancelled' && <>
          {row.status === 'open' && <Form {...props} title="Make private member-first offer" fields={[memberField, input('eligibilityEvidence', 'Document suitability and actual availability', 'textarea'), input('orderingEvidence', 'Document adopted ordering / rotation and member-first eligibility', 'textarea'), reason]} fixed={{ action: 'offer-opportunity', id: row.id, expectedVersion: row.version }} />}
          <Form {...props} title="Record independent assignment / client choice" fields={[input('membershipId', 'Accepted member offer', 'select', row.offers.filter(offer => offer.status === 'accepted').map(offer => [offer.membershipId, `${offer.membership.application.name} · ${offer.membershipId}`])), input('clientChoiceEvidence', 'Independent assignment / client choice evidence', 'textarea'), reason]} fixed={{ action: 'assign-opportunity', id: row.id, expectedVersion: row.version }} />
          <Form {...props} title="Cancel opportunity" fields={[reason]} fixed={{ action: 'cancel-opportunity', id: row.id, expectedVersion: row.version }} />
        </>}
        <Policy snapshot={row.policySnapshot} /><History entries={row.events || row.history} />
      </>}
      {section === 'contributions' && <>
        <Facts entries={[["Current submitted revision", row.currentRevision], ["Correction of", row.correctsId], ["Approved review ID", row.approvedReviewId], ["Allocated / locked", row.allocation ? 'Yes — accounting adjustment requires separate accountant resolution' : 'No']]} />
        {row.revisions.map(revision => <details key={revision.id} open={revision.revision === row.currentRevision}><summary>Immutable submission revision {revision.revision}</summary><Facts entries={[["Actual minutes", revision.minutes], ["Category", revision.category], ["Work date — Central", revision.workDate], ["Engagement", revision.engagementId], ["Compensation reference", revision.compensationReference], ["Evidence reference", revision.evidenceReference], ["Proposed policy provision", revision.policyReference], ["Submission / correction reason", revision.reason], ["Submitted", central(revision.createdAt)]]} /></details>)}
        <History entries={row.reviews} /><Policy snapshot={row.policySnapshot} />
        {canParticipate && ['submitted', 'rejected'].includes(row.status) && <Form title="Submit corrected revision for independent review" fields={submitFields} initial={row.revisions.at(-1)} fixed={{ action: 'revise-contribution', id: row.id, expectedVersion: row.version }} onSubmit={save} />}
        {canParticipate && row.status === 'reversed' && <Form title="Submit new linked correction" fields={submitFields} fixed={{ action: 'submit-contribution', correctsId: row.id }} onSubmit={save} />}
        {canManage && row.status === 'submitted' && <Form {...props} title="Independently approve / reject exact revision" fields={[input('decision', 'Independent decision', 'select', [['approved', 'Approve qualifying minutes'], ['rejected', 'Reject']]), input('verifiedMinutes', 'Independently verified minutes (0 for rejection)', 'number'), input('policyReference', 'Actual qualifying policy decision'), input('evidenceReference', 'Independent work / compensation verification evidence'), reason]} fixed={{ action: 'review-contribution', id: row.id, expectedVersion: row.version, revision: row.currentRevision }} />}
        {canManage && row.status === 'approved' && !row.allocation && <Form {...props} title="Independently reverse approval — preserve original" fields={[input('evidenceReference', 'Reversal evidence reference'), reason]} fixed={{ action: 'reverse-contribution', id: row.id, expectedVersion: row.version }} />}
      </>}
      {section === 'engagements' && <>
        <Template snapshot={row.templateSnapshot} /><Times row={row} /><Facts entries={[["Member", row.membership?.application.name], ["Scope", row.scope], ["Compensation", row.compensation], ["Facility / capacity", row.facility], ["Negotiated schedule", row.schedule], ["Safety / insurance", row.safetyInsurance], ["Cancellation terms", row.cancellationTerms], ["Authority", row.authorityReference], ["Owner confirmation", central(row.ownerConfirmedAt)], ["Owner reason", row.ownerReason], ["Signed name", row.signedName], ["Signed at", row.signedAt && central(row.signedAt)], ["Cancelled", row.cancelledAt && central(row.cancelledAt)], ["Cancellation reason", row.cancellationReason]]} />
        <Policy snapshot={row.policySnapshot} /><History entries={row.events} />
        {canParticipate && row.status === 'offered' && <Form title="Sign exact offered agreement and negotiated facts" fields={[input('signedName', 'Your signature name'), input('accepted', row.templateSnapshot.acceptanceText, 'checkbox')]} fixed={{ action: 'sign-engagement', id: row.id, expectedVersion: row.version, templateRevision: row.templateSnapshot._rev }} onSubmit={save} />}
        {canManage && row.status !== 'cancelled' && <Form {...props} title="Record cancellation — retain accepted terms and signature" fields={[reason]} fixed={{ action: 'cancel-engagement', id: row.id, expectedVersion: row.version }} />}
        <p>Signing does not book kitchen hours, invite payroll, approve completed work or deduct wages. Contact the agreement reply address for negotiation or cancellation; accepted terms cannot be edited.</p>
      </>}
      {section === 'closes' && <>
        {owner ? <><Facts entries={[["Class / instrument", row.classReference], ["Period — Central inclusive", `${row.periodStart} through ${row.periodEnd}`], ["Pool", money(row.poolCents)], ["Retention basis points", row.retentionBps], ["Accountant / solvency evidence", row.accountantEvidence], ["Authority evidence", row.authorityEvidence], ["Selected contribution IDs", row.selectedContributionIds.join(', ')], ["Prepared by", row.preparedByUid], ["Prepared", central(row.createdAt)], ["Preparation reason", row.reason], ["Approved by", row.approvedByUid], ["Approved", row.approvedAt && central(row.approvedAt)], ["Approval reason", row.approvalReason], ["Cancelled", row.cancelledAt && central(row.cancelledAt)], ["Cancelled by", row.cancelledByUid], ["Cancellation reason", row.cancellationReason]]} /><Policy snapshot={row.policySnapshot} />
          {row.allocations.map(allocation => <Facts key={allocation.id} entries={[["Stable member identity", allocation.membershipId], ["Verified minutes", allocation.verifiedMinutes], ["Total allocated", money(allocation.totalCents)], ["Retained book capital", money(allocation.retainedCents)], ["Cash payable — not paid", money(allocation.cashPayableCents)]]} />)}
          {canManage && row.status === 'prepared' && <><Form {...props} title="Separately approve immutable period postings" fields={[reason]} fixed={{ action: 'approve-close', id: row.id, expectedVersion: row.version }} /><Form {...props} title="Cancel prepared period close" fields={[reason]} fixed={{ action: 'cancel-close', id: row.id, expectedVersion: row.version }} /></>}
        </> : <><Facts entries={[["Class / instrument", row.close.classReference], ["Period — Central inclusive", `${row.close.periodStart} through ${row.close.periodEnd}`], ["Authorized class pool", money(row.close.poolCents)], ["Approved retention basis points", row.close.retentionBps], ["Your verified minutes", row.verifiedMinutes], ["Your total allocation", money(row.totalCents)], ["Retained book capital", money(row.retainedCents)], ["Cash payable — not paid", money(row.cashPayableCents)], ["Close approved", central(row.close.approvedAt)]]} /><Policy snapshot={row.close.policySnapshot} /></>}
        <p>These record separately authorized accounting facts only. They do not issue equity, modify company capitalization or voting rights, pay cash, convert dues or wages into capital, or guarantee redemption. Zero surplus creates zero new allocation.</p>
      </>}
    </section>)}
    {data?.nextCursor && <button type="button" disabled={busy} onClick={() => load(data.nextCursor)}>Load more records</button>}
  </Panel>;
}
