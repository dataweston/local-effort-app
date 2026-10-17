import React, { useCallback, useEffect, useState } from 'react';
import { api, Field, Panel } from '../../components/hub/hubShared';
import { ChefMembershipPanel, ChefMembershipAdministration } from './ChefMembershipPanels';
import { ChefDuesPanel } from './ChefDuesPanel';
import { ChefWorkPanel } from './ChefWorkPanel';
import { ChefPublicationPanel } from './ChefPublicationPanel';

const empty = () => ({
  name: '', serviceArea: '', experience: '', interests: '', availability: '', phone: '', contactPreference: 'email',
  workProfile: { services: '', cuisines: '', training: '', equipment: '', travel: '' },
  publicDraft: { bio: '', services: '', photoUrl: '' }, publicationConsent: false, acknowledgment: false, website: '',
});
const statusLabel = (value) => ({ pending: 'Pending review', reviewed: 'Reviewed — not membership admission', 'needs-information': 'More information requested', withdrawn: 'Withdrawn' }[value] || value);
const actionLabel = (value) => ({ apply: 'Application submitted', update: 'Private profile saved', review: 'Review recorded', withdraw: 'Application withdrawn', reapply: 'Application reopened', resubmit: 'Updated information submitted' }[value] || 'Application changed');
const contactLabels = { email: 'Email', phone: 'Phone', either: 'Either email or phone' };
const workLabels = { services: 'Services offered', cuisines: 'Cuisines and specialties', training: 'Training and food safety', equipment: 'Equipment and kitchen preferences', travel: 'Travel range and logistics' };
const date = (value) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(value)) + ' Central' : '';
function toForm(row) {
  const blank = empty();
  return Object.fromEntries(Object.keys(blank).map((key) => [key, key === 'acknowledgment' ? false : row[key] ?? blank[key]]));
}

function History({ history, privateReview = false }) {
  if (!history?.length) return null;
  return <ol className="hub-chef-history">{history.map((entry) => <li key={entry.version}>
    <strong>{statusLabel(entry.toStatus)}</strong> · {actionLabel(entry.action)} · revision {entry.version}
    <div>{date(entry.createdAt)}</div>
    {entry.applicantReason && <p>{entry.applicantReason}</p>}
    {privateReview && <><div>Recorded by {entry.actorEmail}</div>{entry.privateNote && <p>Private note: {entry.privateNote}</p>}</>}
  </li>)}</ol>;
}

function ChefSignIn({ auth }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signIn() {
    setBusy(true); setError('');
    try { await auth.signInWithGoogle(`${window.location.origin}/hub/chef`); }
    catch (err) { setError(err.message || 'Google sign-in is unavailable.'); setBusy(false); }
  }
  return <main className="hub-auth-screen"><div className="hub-auth-card">
    <h1>Chef application workspace</h1>
    <p>Use your Google account to apply to Local Effort’s proposed chef cooperative and return to your private work profile.</p>
    <p>No fees are due at signup. Applying does not admit you as a member, grant ownership, offer employment, or guarantee work.</p>
    <button type="button" className="hub-primary-button hub-google-button" disabled={busy} onClick={signIn}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
    <p className="hub-help">Choose the same Google account on every visit. No invitation or authentication email is sent by this application.</p>
    {error && <p className="hub-error" role="alert">{error}</p>}
    <a href="/chef-cooperative">Back to the chef cooperative information</a>
  </div></main>;
}

function ReviewPanel({ token }) {
  const [items, setItems] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [filter, setFilter] = useState('');
  const [cursor, setCursor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [disposition, setDisposition] = useState('pending');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (next = null) => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (next) params.set('cursor', next);
      const result = await api(`/api/hub/chef-applications?${params}`, token);
      setItems((previous) => next ? [...(previous || []), ...result.applications] : result.applications);
      setCursor(result.nextCursor); setCanReview(result.canReview);
    } catch (err) {
      if (!['Hub access required', 'Privileged access required', 'Unauthorized'].includes(err.message)) setError(err.message);
    }
  }, [token, filter]);
  useEffect(() => { load(); }, [load]);
  async function open(id) {
    setError(''); setMessage(''); setBusy(true);
    try {
      const result = await api(`/api/hub/chef-applications?id=${encodeURIComponent(id)}`, token);
      setDetail(result.application); setCanReview(result.canReview);
      setDisposition(result.application.status === 'withdrawn' ? 'pending' : result.application.status);
      setReason(result.application.applicantReason); setNote('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function review(event) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const result = await api('/api/hub/chef-applications', token, { method: 'PATCH', body: JSON.stringify({ id: detail.id, expectedVersion: detail.version, status: disposition, applicantReason: reason, privateNote: note }) });
      setDetail(result.application); setNote(''); setMessage('Review recorded. No admission, work access, or notification was issued.');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (!items) return error ? <p className="hub-error" role="alert">Review access could not be checked: {error} <button type="button" onClick={() => load()}>Retry</button></p> : null;
  return <Panel title="Private application review">
    <div className="hub-form">
      <p>Authorized owner / privileged Hub review only. Dispositions do not admit members. Private notes never appear in the applicant’s workspace.</p>
      <Field label="Filter disposition"><select value={filter} onChange={(e) => { setFilter(e.target.value); setDetail(null); }}>
        <option value="">All applications</option>{['pending', 'reviewed', 'needs-information', 'withdrawn'].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
      </select></Field>
      <button type="button" className="hub-text-button" disabled={busy} onClick={() => load()}>Reload review list</button>
      {items.length === 0 && <p>No applications in this view.</p>}
      <ul className="hub-chef-review-list">{items.map((item) => <li key={item.id}><button type="button" disabled={busy} onClick={() => open(item.id)}>{item.name} — {statusLabel(item.status)}</button><span>{item.email} · {date(item.updatedAt)}</span></li>)}</ul>
      {cursor && <button type="button" disabled={busy} onClick={() => load(cursor)}>Load more applications</button>}
      {error && <p className="hub-error" role="alert">{error}</p>}
      {message && <p className="hub-notice" role="status">{message}</p>}
      {detail && <section className="hub-chef-review-detail">
        <h3>{detail.name}</h3><p>{detail.email} · revision {detail.version} · {statusLabel(detail.status)}</p>
        <button type="button" className="hub-text-button" disabled={busy} onClick={() => open(detail.id)}>Reload selected application</button>
        <dl>{[
          ['Service area', detail.serviceArea], ['Experience', detail.experience], ['Interests', detail.interests],
          ['Availability', detail.availability], ['Phone', detail.phone], ['Contact preference', contactLabels[detail.contactPreference]],
          ...Object.entries(workLabels).map(([key, label]) => [label, detail.workProfile?.[key]]),
          ['Public biography draft', detail.publicDraft?.bio], ['Public services draft', detail.publicDraft?.services],
          ['Photo URL draft', detail.publicDraft?.photoUrl],
          ['Publication consent', detail.publicationConsent ? `Requested ${date(detail.publicationConsentAt)}; moderation still required` : 'Not given'],
          ['Application acknowledgment', `${detail.acknowledgmentVersion} · ${date(detail.acknowledgedAt)}`],
        ].map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></React.Fragment>)}</dl>
        {canReview && detail.status !== 'withdrawn' ? <form className="hub-form" onSubmit={review}>
          <Field label="Review disposition"><select value={disposition} onChange={(e) => setDisposition(e.target.value)}>{['pending', 'reviewed', 'needs-information'].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></Field>
          <Field label="Reason visible to applicant"><textarea maxLength={2000} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} required={disposition !== 'pending'} /></Field>
          <Field label="Private review note (not shared with applicant)"><textarea maxLength={3000} rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <button className="hub-primary-button" disabled={busy} type="submit">{busy ? 'Recording…' : 'Record review'}</button>
        </form> : <p>{detail.status === 'withdrawn' ? 'The applicant must reapply before review can resume.' : 'Read-only review access.'}</p>}
        <History history={detail.history} privateReview />
      </section>}
      <ChefMembershipAdministration token={token} application={detail} />
      <ChefDuesPanel token={token} owner />
      <ChefWorkPanel token={token} owner />
      <ChefPublicationPanel token={token} owner />
    </div>
  </Panel>;
}

function ApplicationPanel({ token, email, onChange }) {
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError(''); setMessage(''); setWithdrawing(false);
    try {
      const result = await api('/api/hub/chef-application', token);
      setApplication(result.application); onChange(result.application); setForm(result.application ? toForm(result.application) : empty()); setLoaded(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }, [token, onChange]);
  useEffect(() => { load(); }, [load]);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const nestedChange = (key, field, value) => setForm((previous) => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
  async function save(event) {
    event.preventDefault();
    const action = application?.status === 'withdrawn' ? 'reapply' : application?.status === 'needs-information' ? 'resubmit' : 'update';
    await mutate(application ? { ...form, action, expectedVersion: application.version } : form, application ? 'PATCH' : 'POST');
  }
  async function mutate(body, method) {
    setError(''); setMessage(''); setBusy(true);
    try {
      const result = await api('/api/hub/chef-application', token, { method, body: JSON.stringify(body) });
      setApplication(result.application); onChange(result.application); setForm(toForm(result.application)); setWithdrawing(false);
      setMessage(result.application.status === 'withdrawn' ? 'Application withdrawn. Publication consent removed. Your private record is retained for review history; you can reapply here.' : 'Saved to your private application. No payment, membership admission, public publication, or message was triggered.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <Panel title="Your application and work profile">
    <div className="hub-form">
      <p>Signed in as {email}. Application records are available only to this sign-in identity and authorized reviewers.</p>
      <p>No fees are due to apply. Membership offers, signed terms, admission and any dues assessment are separate steps. Application review is not employment, equity, or guaranteed work.</p>
      <button type="button" className="hub-text-button" disabled={busy} onClick={load}>Reload saved application (discards unsaved changes)</button>
      {application && <div className="hub-notice"><strong>{statusLabel(application.status)}</strong><div>Revision {application.version} · saved {date(application.updatedAt)}</div>{application.applicantReason && <p>{application.applicantReason}</p>}</div>}
      {error && <p className="hub-error" role="alert">{error}</p>}
      {message && <p className="hub-notice" role="status">{message}</p>}
      {!loaded && <p>{busy ? 'Loading private application…' : 'Your application could not load. Use reload to try again.'}</p>}
    </div>
    {loaded && <form onSubmit={save} className="hub-form">
      <fieldset disabled={busy} className="hub-chef-fieldset">
        <legend>{application ? 'Private application details' : 'Start with a short questionnaire'}</legend>
        <div className="hub-chef-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => change('website', e.target.value)} /></label></div>
        <Field label="Your name"><input required autoComplete="name" maxLength={120} value={form.name} onChange={(e) => change('name', e.target.value)} /></Field>
        <Field label="Service area / where you can work"><input required maxLength={300} value={form.serviceArea} onChange={(e) => change('serviceArea', e.target.value)} /></Field>
        <Field label="Cooking and work experience"><textarea required maxLength={3000} rows={4} value={form.experience} onChange={(e) => change('experience', e.target.value)} /></Field>
        <Field label="What interests you: referrals, prep work, kitchen access, or other goals"><textarea required maxLength={1500} rows={3} value={form.interests} onChange={(e) => change('interests', e.target.value)} /></Field>
        <Field label="Availability and work preferences"><textarea required maxLength={1500} rows={3} value={form.availability} onChange={(e) => change('availability', e.target.value)} /></Field>
        <Field label="Preferred contact method (no automatic messages)"><select value={form.contactPreference} onChange={(e) => change('contactPreference', e.target.value)}><option value="email">Email</option><option value="phone">Phone</option><option value="either">Either email or phone</option></select></Field>
        <Field label="Phone (optional unless phone contact selected)"><input type="tel" autoComplete="tel" maxLength={40} required={form.contactPreference !== 'email'} value={form.phone} onChange={(e) => change('phone', e.target.value)} /></Field>
        {application && <>
          <h3>Fuller private work profile</h3>
          <p className="hub-help">Optional details for work discussions. Do not enter SSNs, EINs, banking information, W-9 details, medical records, or identity documents here or in public drafts.</p>
          {[['services', 'Services you can offer', 2000], ['cuisines', 'Cuisines and specialties', 1000], ['training', 'Relevant training / food-safety experience (no document uploads)', 1500], ['equipment', 'Equipment and kitchen preferences', 1500], ['travel', 'Travel range and logistics', 1000]].map(([key, label, max]) => <Field key={key} label={label}><textarea maxLength={max} rows={3} value={form.workProfile[key]} onChange={(e) => nestedChange('workProfile', key, e.target.value)} /></Field>)}
          <h3>Optional public-profile draft — still private</h3>
          <p>This private draft does not publish anything. The consent below permits consideration only. After admission, the separate public-listing panel requires consent to an exact saved revision and owner moderation.</p>
          <Field label="Public biography draft"><textarea maxLength={2000} rows={4} value={form.publicDraft.bio} onChange={(e) => nestedChange('publicDraft', 'bio', e.target.value)} /></Field>
          <Field label="Public services draft"><textarea maxLength={1500} rows={3} value={form.publicDraft.services} onChange={(e) => nestedChange('publicDraft', 'services', e.target.value)} /></Field>
          <Field label="Photo URL draft (optional public HTTPS link; not uploaded or previewed)"><input type="url" maxLength={2048} value={form.publicDraft.photoUrl} onChange={(e) => nestedChange('publicDraft', 'photoUrl', e.target.value)} /></Field>
          <label className="hub-chef-check"><input type="checkbox" checked={form.publicationConsent} onChange={(e) => change('publicationConsent', e.target.checked)} /><span>I separately consent to consideration of my biography, services, and photo draft for future public publication, only after owner moderation. I can remove this consent here.</span></label>
          <h3>Keep tax records out of this application</h3><p>Do not send or upload a W-9 here. Follow only the secure provider instructions in your membership offer after owner classification and provider review. This workspace does not send payroll invitations or collect tax or bank records.</p>
        </>}
        {(!application || application.status === 'withdrawn') && <label className="hub-chef-check"><input type="checkbox" required checked={form.acknowledgment} onChange={(e) => change('acknowledgment', e.target.checked)} /><span>I understand this is a no-fee application, not membership admission, employment, an equity grant, or guaranteed work. I consent to private review by authorized Local Effort reviewers. Membership requires a separate offer and accepted terms; withdrawing retains the private application and review history.</span></label>}
        <button type="submit" className="hub-primary-button" disabled={busy}>{busy ? 'Saving…' : !application ? 'Submit no-fee application' : application.status === 'withdrawn' ? 'Reapply with these details' : application.status === 'needs-information' ? 'Save and resubmit for review' : 'Save private profile'}</button>
      </fieldset>
    </form>}
    {application && application.status !== 'withdrawn' && <div className="hub-form">
      {withdrawing ? <div className="hub-notice"><p>Withdraw this application? Review stops and publication consent is removed. The private record and history remain; no message is sent.</p><div className="hub-button-row"><button type="button" disabled={busy} onClick={() => mutate({ action: 'withdraw', expectedVersion: application.version, website: form.website }, 'PATCH')}>Confirm withdrawal</button><button type="button" disabled={busy} onClick={() => setWithdrawing(false)}>Keep application</button></div></div> : <button type="button" className="hub-text-button" disabled={busy} onClick={() => setWithdrawing(true)}>Withdraw application</button>}
    </div>}
    {application && <div className="hub-form"><h3>Application history</h3><History history={application.history} /></div>}
  </Panel>;
}

export default function HubChefView({ auth }) {
  const [signOutError, setSignOutError] = useState('');
  const [application, setApplication] = useState(null);
  if (auth.loading) return <main className="hub-auth-screen"><p>Loading chef workspace…</p></main>;
  if (!auth.user) return <ChefSignIn auth={auth} />;
  if (!auth.accessToken) return <main className="hub-auth-screen"><p>Waiting for your authenticated session…</p></main>;
  return <div className="hub-app hub-chef-workspace"><main className="hub-main">
    <header className="hub-topbar"><div><h1>Chef workspace</h1><p>Private application, work profile, and review</p></div><button type="button" className="hub-signout" onClick={async () => { try { await auth.signOut(); } catch (err) { setSignOutError(err.message); } }}>Sign out</button></header>
    {signOutError && <p className="hub-error" role="alert">{signOutError}</p>}
    <ChefMembershipPanel key={`member-${auth.user.id}`} token={auth.accessToken} />
    <div className="hub-chef-layout"><ReviewPanel key={`review-${auth.user.id}`} token={auth.accessToken} /><ApplicationPanel key={auth.user.id} token={auth.accessToken} email={auth.user.email} onChange={setApplication} /></div>
    {application && <><ChefDuesPanel key={`dues-${auth.user.id}`} token={auth.accessToken} /><ChefWorkPanel key={`work-${auth.user.id}`} token={auth.accessToken} /><ChefPublicationPanel key={`publication-${auth.user.id}`} token={auth.accessToken} /></>}
  </main></div>;
}
