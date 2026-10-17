import React, { useCallback, useEffect, useState } from 'react';
import { api, Field, Panel } from '../../components/hub/hubShared';
const blank = () => ({ displayName: '', serviceArea: '', bio: '', services: '', photoUrl: '' });
const date = value => value ? `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(value))} Central` : 'Not recorded';
function Preview({ profile }) {
  return <section><h3>{profile.draft.displayName}</h3><p>{profile.draft.serviceArea}</p><p className="hub-chef-preserve">{profile.draft.bio}</p><p className="hub-chef-preserve">{profile.draft.services}</p>{profile.draft.photoUrl && <p>Public photo URL: <a href={profile.draft.photoUrl} target="_blank" rel="noopener noreferrer">{profile.draft.photoUrl}</a></p>}<p>Public identifier: {profile.slug}. Draft revision {profile.draftVersion}; record revision {profile.version}.</p><p>{profile.visible ? 'Published on the live directory.' : 'Not currently public.'} Consent: {date(profile.consentedAt)}. Moderation: {date(profile.approvedAt)}.</p>{profile.moderationReason && <p>{profile.moderationReason}</p>}<details><summary>Listing history</summary><ol>{profile.history.map(event => <li key={event.id}>{event.action.replaceAll('-', ' ')} · {date(event.createdAt)}{event.privateNote && <p>Private note: {event.privateNote}</p>}</li>)}</ol></details></section>;
}
export function ChefPublicationPanel({ token, owner = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [slug, setSlug] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const endpoint = owner ? '/api/hub/chef-publication-admin' : '/api/hub/chef-publication';
  const load = useCallback(async (cursor = null) => {
    setError('');
    try {
      const result = await api(`${endpoint}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, token);
      setData(old => owner && cursor ? { ...result, profiles: [...old.profiles, ...result.profiles] } : result);
      if (!owner) { setDraft(result.profile?.draft || blank()); setSlug(result.profile?.slug || ''); }
    } catch (err) { setError(err.message); }
  }, [endpoint, owner, token]);
  useEffect(() => { setData(null); setAccepted(false); setSelectedId(''); load(); }, [load]);
  const selected = owner ? data?.profiles.find(row => row.id === selectedId) : data?.profile;
  async function save(body, method = 'PATCH') {
    setBusy(true); setError(''); setMessage('');
    try {
      await api(endpoint, token, { method, body: JSON.stringify(body) });
      setAccepted(false); setReason(''); setPrivateNote(''); setMessage('Saved. A draft or consent alone does not publish a listing.'); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function action(name) {
    save({ action: name, expectedVersion: selected?.version || 0, ...(owner ? { id: selected.id, expectedDraftVersion: selected.draftVersion, confirmed: accepted, memberReason: reason, privateNote } : name === 'save-draft' ? { draft, slug } : name === 'consent' ? { expectedDraftVersion: selected.draftVersion, accepted, policyId: data.policyId } : {}) }, name === 'save-draft' && !selected ? 'POST' : 'PATCH');
  }
  return <Panel title={owner ? 'Moderated chef publication' : 'Your optional public listing'}>
    <div className="hub-form"><p>Only the separate display name, service area, biography, services and photo URL below can become public. Email, phone, private application details and tax onboarding are never published here. Editing a draft removes its consent and approval; fresh consent never restores an old approval.</p>
      {error && <p role="alert" className="hub-error">{error} <button type="button" onClick={() => load()}>Reload listings</button></p>}
      {message && <p role="status">{message}</p>}
      {owner && data && <><p>{data.directoryConfigured ? 'The CMS directory is configured.' : 'The CMS directory is disabled or incomplete. Approval is blocked; no listings are served.'}</p><Field label="Public listing record"><select value={selectedId} onChange={event => { setSelectedId(event.target.value); setAccepted(false); setReason(''); setPrivateNote(''); }}><option value="">Choose a listing</option>{data.profiles.map(row => <option key={row.id} value={row.id}>{row.draft.displayName} — {row.visible ? 'Public' : 'Private'} — revision {row.draftVersion}</option>)}</select></Field>{data.nextCursor && <button type="button" onClick={() => load(data.nextCursor)}>Load more listing records</button>}</>}
      {selected && <Preview profile={selected} />}
      {!owner && data && <>
        {!data.canSubmit && <p>Your current adopted agreement and active admission do not enable publication. Existing records remain visible and you can withdraw listing consent.</p>}
        {data.canSubmit && <form className="hub-form" onSubmit={event => { event.preventDefault(); action('save-draft'); }}><fieldset disabled={busy} className="hub-chef-fieldset"><legend>Separate public draft</legend>
          <Field label="Public URL identifier"><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} value={slug} onChange={event => { setSlug(event.target.value); setAccepted(false); }} /></Field>
          {[['displayName', 'Public display name', 120], ['serviceArea', 'Public service area', 300], ['bio', 'Public biography', 2000], ['services', 'Public services', 1500], ['photoUrl', 'Public photo URL (optional HTTPS; no personal tokens)', 2048]].map(([key, label, maxLength]) => <Field key={key} label={label}>{['bio', 'services'].includes(key) ? <textarea required maxLength={maxLength} value={draft[key]} onChange={event => { setDraft(old => ({ ...old, [key]: event.target.value })); setAccepted(false); }} /> : <input type={key === 'photoUrl' ? 'url' : 'text'} required={key !== 'photoUrl'} maxLength={maxLength} value={draft[key]} onChange={event => { setDraft(old => ({ ...old, [key]: event.target.value })); setAccepted(false); }} />}</Field>)}
          <button type="submit">Save private listing draft and clear prior approval</button>
        </fieldset></form>}
        {selected && data.canSubmit && <><p className="hub-chef-preserve">{data.publicationTerms}</p>{(!data.applicationConsent || !data.applicationReviewed) && <p>Save consideration consent in your application and have its current revision reviewed before separately consenting to this listing.</p>}<label className="hub-chef-check"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} />I affirm the exact statement above for the saved listing revision shown in the preview, not unsaved edits.</label><button type="button" disabled={busy || !accepted || !data.applicationConsent || !data.applicationReviewed} onClick={() => action('consent')}>Consent to this saved listing for owner moderation</button></>}
        {selected && <button type="button" disabled={busy} onClick={() => action('remove')}>Withdraw public-listing consent now</button>}
      </>}
      {owner && selected && data.canManage && <form className="hub-form" onSubmit={event => { event.preventDefault(); action('approve'); }}><Field label="Member-facing moderation explanation"><textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></Field><Field label="Private moderation note"><textarea maxLength={3000} value={privateNote} onChange={event => setPrivateNote(event.target.value)} /></Field><label className="hub-chef-check"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I have reviewed the exact saved content, separate consent and publication authority.</label><button type="submit" disabled={busy || !accepted || !reason.trim() || !data.directoryConfigured}>Approve this exact consented revision</button><button type="button" disabled={busy || !accepted || !reason.trim()} onClick={() => action('remove')}>Remove this listing from public reads</button></form>}
      <p>Withdrawal takes effect on subsequent directory reads. Third-party search results, downloaded photographs and copies cannot be recalled.</p>
    </div>
  </Panel>;
}
