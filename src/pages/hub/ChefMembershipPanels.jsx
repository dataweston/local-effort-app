import React, { useCallback, useEffect, useState } from 'react';
import { api, Field, Panel } from '../../components/hub/hubShared';

const labels = { offered: 'Membership offered', accepted: 'Agreement accepted — onboarding pending', active: 'Admitted member', declined: 'Offer declined', cancelled: 'Offer cancelled', resigned: 'Membership ended by member', revoked: 'Membership ended by owner' };
const date = (value) => value ? `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(value))} Central` : 'Not yet verified';
function Terms({ terms }) {
  return <section className="hub-chef-agreement">
    <h3>{terms.title} — {terms.version}</h3>
    <p className="hub-chef-preserve">{terms.agreementText}</p>
    <p><strong>{terms.acceptanceText}</strong></p>
    {terms.dues && <section><h3>Agreed operating dues</h3><p>{new Intl.NumberFormat('en-US', { style: 'currency', currency: terms.dues.currency }).format(terms.dues.amountCents / 100)} per assessed month</p>{[['billingText', 'Billing'], ['refundText', 'Refunds'], ['cancellationText', 'Cancellation'], ['waiverText', 'Reductions and waivers']].map(([key, label]) => <div key={key}><h4>{label}</h4><p className="hub-chef-preserve">{terms.dues[key]}</p></div>)}</section>}
    {terms.publicationEnabled && <section><h3>Separate optional public listing</h3><p className="hub-chef-preserve">{terms.publicationConsentText}</p><p>Signing this membership agreement does not consent to publication. You must separately submit and consent to the exact listing.</p></section>}
    <h3>Onboarding</h3>
    <p className="hub-chef-preserve">{terms.onboardingInstructions}</p>
    {terms.secureOnboardingUrl && <p><a href={terms.secureOnboardingUrl} target="_blank" rel="noopener noreferrer">Open secure onboarding provider</a></p>}
    <p>Questions: <a href={`mailto:${terms.replyEmail}`}>{terms.replyEmail}</a></p>
  </section>;
}
function History({ rows, owner = false }) {
  return <ol className="hub-chef-history">{rows.map((entry) => <li key={entry.version}>
    <strong>{entry.action.replaceAll('-', ' ')} — {labels[entry.toStatus] || entry.toStatus}</strong> · {date(entry.createdAt)}
    {entry.memberReason && <p>{entry.memberReason}</p>}
    {owner && entry.privateNote && <p>Private verification note: {entry.privateNote}</p>}
  </li>)}</ol>;
}
export function ChefMembershipPanel({ token }) {
  const [membership, setMembership] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState('');
  const [response, setResponse] = useState('');
  const load = useCallback(async (cursor = null) => {
    try { const data = await api(`/api/hub/chef-membership${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, token); setMembership(data.membership); setAgreements(previous => cursor ? [...previous, ...data.agreements] : data.agreements); setNextCursor(data.nextCursor); setError(''); }
    catch (err) { setError(err.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  async function respond(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api('/api/hub/chef-membership', token, { method: 'PATCH', body: JSON.stringify({ action: response, id: membership.id, expectedVersion: membership.version, ...(response === 'accept' ? { policyId: membership.policyId, acceptedName: signature, accepted } : { memberReason: reason }), website: '' }) });
      setMembership(data.membership); setResponse(''); setAccepted(false); setSignature(''); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (!membership) return error ? <p className="hub-error" role="alert">Membership could not be loaded: {error} <button type="button" onClick={() => load()}>Retry</button></p> : null;
  return <Panel title="Your chef membership">
    <h3>{labels[membership.status]}</h3>
    {membership.memberReason && <p>{membership.memberReason}</p>}
    <Terms terms={membership.terms} />
    {membership.acceptedAt && <p>Accepted by {membership.acceptedName} on {date(membership.acceptedAt)}. Your accepted agreement is retained above.</p>}
    {membership.policyRetiredAt && membership.status !== 'active' && <p role="status">This policy has been retired. Contact the owner for current terms; this offer cannot be accepted or admitted.</p>}
    {['accepted', 'active'].includes(membership.status) && <dl>
      <dt>Orientation verified</dt><dd>{date(membership.orientationVerifiedAt)}</dd>
      <dt>Secure provider onboarding verified</dt><dd>{date(membership.onboardingVerifiedAt)}</dd>
      <dt>Admission</dt><dd>{membership.admittedAt ? date(membership.admittedAt) : 'The owner must separately approve admission after the requirements above are complete.'}</dd>
    </dl>}
    {error && <p className="hub-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => load()}>Reload membership</button></p>}
    {['offered', 'accepted', 'active'].includes(membership.status) && <form className="hub-form" onSubmit={respond}><Field label="Membership response"><select value={response} onChange={(event) => { setResponse(event.target.value); setAccepted(false); }} required>
      <option value="">Choose a response</option>
      {membership.status === 'offered' && !membership.policyRetiredAt && <option value="accept">Accept the agreement</option>}
      {['offered', 'accepted'].includes(membership.status) && <option value="decline">Decline this offer</option>}
      {membership.status === 'active' && <option value="leave">End my membership</option>}
    </select></Field>
    {response === 'accept' ? <>
      <Field label="Your full name as signature"><input value={signature} onChange={(event) => setSignature(event.target.value)} maxLength={160} required autoComplete="name" /></Field>
      <label className="hub-chef-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required />{membership.terms.acceptanceText}</label>
    </> : response && <Field label="Reason for the owner (optional)"><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} /></Field>}
    {response === 'leave' && <p>Your agreement and private audit history will be retained. Ending membership does not erase legal or financial obligations recorded in your agreement.</p>}
    <button type="submit" disabled={busy || !response || (response === 'accept' && !accepted)}>{busy ? 'Saving…' : response === 'accept' ? 'Sign and accept this agreement' : response === 'leave' ? 'Confirm end of membership' : 'Confirm response'}</button></form>}
    <details><summary>Membership history</summary><History rows={membership.history} /></details>
    {agreements.length > 0 && <section><h3>Earlier signed agreements</h3>{agreements.map(agreement => <details key={agreement.id}><summary>{agreement.terms.version} — {labels[agreement.status]} · accepted {date(agreement.acceptedAt)}</summary><Terms terms={agreement.terms} /><p>Signed by {agreement.acceptedName} on {date(agreement.acceptedAt)}.</p><History rows={agreement.history} /></details>)}{nextCursor && <button type="button" onClick={() => load(nextCursor)}>Load earlier signed agreements</button>}</section>}
  </Panel>;
}

export function ChefMembershipAdministration({ token, application }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [policyId, setPolicyId] = useState('');
  const [memberReason, setMemberReason] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [action, setAction] = useState('');
  const load = useCallback(async (cursor = null) => {
    try {
      const query = new URLSearchParams();
      if (application?.id) query.set('applicationId', application.id);
      if (cursor) query.set('cursor', cursor);
      const result = await api(`/api/hub/chef-memberships?${query}`, token);
      setData((old) => cursor ? { ...result, memberships: [...old.memberships, ...result.memberships] } : result);
      setError('');
    } catch (err) { setError(err.message); }
  }, [token, application?.id]);
  useEffect(() => { setData(null); setSelectedId(''); setPolicyId(''); setConfirmed(false); setMessage(''); setMemberReason(''); setPrivateNote(''); setAction(''); load(); }, [load]);
  async function save(body, method = 'PATCH') {
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/hub/chef-memberships', token, { method, body: JSON.stringify({ ...body, confirmed }) });
      setConfirmed(false); setAction(''); setPrivateNote(''); setMessage('Membership action saved. No email, provider invitation, charge, staff access, or equity grant was created.'); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const selected = data?.memberships.find((entry) => entry.id === selectedId);
  return <section className="hub-chef-membership-admin">
    <h3>Membership administration</h3>
    <p>Application review is not admission. Adopt final approved terms, make a private offer, obtain the applicant’s signature, verify orientation and secure onboarding, then separately admit the member.</p>
    {error && <p className="hub-error" role="alert">{error} <button type="button" onClick={() => load()}>Reload</button></p>}
    {message && <p role="status">{message}</p>}
    {data && <>
      {data.policyError && <p role="status">{data.policyError}</p>}
      {data.publishedPolicy && <details><summary>Read the published CMS agreement before adoption</summary><Terms terms={data.publishedPolicy} /><p>Approval reference: {data.publishedPolicy.approvalReference}</p><p>CMS revision: {data.publishedPolicy._rev}</p></details>}
      {data.canManage && <>
        <label className="hub-chef-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I have authority for this action and have reviewed the exact terms and applicable member record.</label>
        {data.publishedPolicy && <button type="button" disabled={busy || !confirmed} onClick={() => save({ action: 'adopt-policy', expectedCmsRevision: data.publishedPolicy._rev }, 'POST')}>Adopt this exact published policy revision</button>}
        {application?.status === 'reviewed' && <form className="hub-form" onSubmit={(event) => { event.preventDefault(); save({ action: 'offer', applicationId: application.id, expectedApplicationVersion: application.version, policyId, memberReason }, 'POST'); }}><h4>Offer membership to {application.name}</h4>
        <Field label="Adopted policy"><select value={policyId} onChange={(event) => { setPolicyId(event.target.value); setConfirmed(false); }} required><option value="">Choose adopted terms</option>{data.policies.filter((policy) => !policy.retiredAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.snapshot.title} — {policy.version}</option>)}</select></Field>
        <Field label="Message visible to the applicant"><textarea value={memberReason} onChange={(event) => setMemberReason(event.target.value)} maxLength={2000} /></Field>
        <button type="submit" disabled={busy || !confirmed || !policyId}>Create a private membership offer</button></form>}
      </>}
      <Field label="Membership record"><select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setConfirmed(false); setAction(''); }}><option value="">Choose a member record</option>{data.memberships.map((entry) => <option key={entry.id} value={entry.id}>{entry.applicant.name} — {labels[entry.status]} — {entry.terms.version}</option>)}</select></Field>
      {data.nextCursor && <button type="button" onClick={() => load(data.nextCursor)}>Load more membership records</button>}
      {selected && <>
        <Terms terms={selected.terms} />
        <p>{labels[selected.status]}. Agreement signed: {selected.acceptedAt ? `${selected.acceptedName}, ${date(selected.acceptedAt)}` : 'Not signed'}. Orientation: {date(selected.orientationVerifiedAt)}. Secure onboarding: {date(selected.onboardingVerifiedAt)}.</p>
        <History rows={selected.history} owner />
        {data.canManage && <form className="hub-form" onSubmit={(event) => { event.preventDefault(); save({ action, id: selected.id, expectedVersion: selected.version, memberReason, privateNote }); }}><Field label="Owner action"><select value={action} onChange={(event) => { setAction(event.target.value); setConfirmed(false); }} required><option value="">Choose an action</option>
          {selected.status === 'accepted' && <><option value="verify-orientation">Verify completed orientation</option><option value="verify-onboarding">Verify completed secure provider onboarding</option><option value="admit">Approve admission</option></>}
          {['offered', 'accepted'].includes(selected.status) && <option value="cancel-offer">Cancel the offer</option>}
          {selected.status === 'active' && <option value="revoke">End membership</option>}
        </select></Field>
        <Field label="Member-facing explanation"><textarea value={memberReason} onChange={(event) => setMemberReason(event.target.value)} maxLength={2000} required={['admit', 'cancel-offer', 'revoke'].includes(action)} /></Field>
        <Field label="Private verification note"><textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} maxLength={3000} required={['verify-orientation', 'verify-onboarding', 'revoke'].includes(action)} /></Field>
        <p>Record only how completion was verified. Never paste an SSN, tax document, bank information, provider token, or personal onboarding link.</p>
        <button type="submit" disabled={busy || !confirmed || !action}>Save confirmed owner action</button>
        <button type="button" disabled={busy || !confirmed || selected.policyRetiredAt} onClick={() => save({ action: 'retire-policy', policyId: selected.policyId })}>Retire this policy for future acceptance and admission</button></form>}
      </>}
    </>}
  </section>;
}
