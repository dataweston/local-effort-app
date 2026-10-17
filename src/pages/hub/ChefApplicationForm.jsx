import React from 'react';

// Limits mirror api-handlers/hub/_chefApplication.js; the server remains the authority.
export const LIMITS = {
  name: 120, serviceArea: 300, experience: 3000, interests: 1500, availability: 1500, phone: 40,
  workProfile: { services: 2000, cuisines: 1000, training: 1500, equipment: 1500, travel: 1000 },
  publicDraft: { bio: 2000, services: 1500, photoUrl: 2048 },
};
const REQUIRED = [
  ['name', 'Your name'],
  ['serviceArea', 'Where you can work'],
  ['experience', 'Your cooking and work experience'],
  ['interests', 'What you are looking for'],
  ['availability', 'Your availability'],
];
const WORK_FIELDS = [
  ['services', 'Services you can offer', 'The kinds of work you would take on, such as prep, catering, private dinners or events.'],
  ['cuisines', 'Cuisines and specialties', 'What you cook best.'],
  ['training', 'Training and food-safety experience', 'Describe it here. Do not upload documents.'],
  ['equipment', 'Equipment and kitchen preferences', 'What you bring, and what you would need access to.'],
  ['travel', 'Travel range and logistics', 'How far you will go, and whether you have a vehicle.'],
];
export const fieldId = (...parts) => `chef-q-${parts.join('-')}`;

export function validateApplication(form, { acknowledgmentRequired }) {
  const problems = [];
  for (const [key, label] of REQUIRED) {
    const value = form[key].trim();
    if (!value) problems.push({ field: key, message: `${label} is required.` });
    else if (value.length > LIMITS[key]) problems.push({ field: key, message: `${label} is too long. Keep it under ${LIMITS[key]} characters.` });
  }
  const phone = form.phone.trim();
  if (form.contactPreference !== 'email' && !phone) problems.push({ field: 'phone', message: 'Add a phone number, or choose email as your contact method.' });
  else if (phone && (!/^\+?[\d().\s-]+$/.test(phone) || !/^\d{7,15}$/.test(phone.replace(/\D/g, '')))) problems.push({ field: 'phone', message: 'Enter a phone number with 7 to 15 digits.' });
  const photo = form.publicDraft.photoUrl.trim();
  if (photo && !/^https:\/\//i.test(photo)) problems.push({ field: 'photoUrl', message: 'The photo link must start with https://.' });
  if (acknowledgmentRequired && !form.acknowledgment) problems.push({ field: 'acknowledgment', message: 'Confirm the statement above the submit button to apply.' });
  return problems;
}

function Question({ id, label, hint, optional, max, value = '', error, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const left = max ? max - value.length : null;
  return <div className={`hub-chef-q${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}{optional && <span className="hub-chef-optional"> (optional)</span>}</label>
    {hint && <p id={`${id}-hint`} className="hub-help">{hint}</p>}
    {React.cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
    {error && <p id={`${id}-error`} className="hub-error">{error}</p>}
    {max && left <= max * 0.1 && <p className={`hub-chef-count${left < 0 ? ' is-over' : ''}`}>{left < 0 ? `${-left} characters over the limit` : `${left} characters left`}</p>}
  </div>;
}

export default function ChefApplicationForm({ form, change, nestedChange, application, email, busy, dirty, problems, error, message, statusRef, onSubmit, onDiscard, onReload }) {
  const isNew = !application;
  const reapplying = application?.status === 'withdrawn';
  const errors = Object.fromEntries(problems.map((p) => [p.field, p.message]));
  const text = (key, props = {}) => ({ value: form[key], onChange: (e) => change(key, e.target.value), ...props });
  const detailsOpen = application?.status === 'needs-information' || Object.values(form.workProfile).some(Boolean);
  const draftOpen = Object.values(form.publicDraft).some(Boolean) || form.publicationConsent;
  return <form onSubmit={onSubmit} noValidate className="hub-form hub-chef-form">
    <fieldset disabled={busy} className="hub-chef-fieldset">
      <div className="hub-chef-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => change('website', e.target.value)} /></label></div>

      <section className="hub-chef-section">
        <h3>About you</h3>
        <Question id={fieldId('name')} label="Your name" error={errors.name}>
          <input autoComplete="name" maxLength={LIMITS.name} {...text('name')} />
        </Question>
        <fieldset className="hub-chef-radios">
          <legend>How should Local Effort reach you?</legend>
          <p className="hub-help">This only records your preference. Local Effort sends no automatic messages from this workspace.</p>
          {[['email', `Email (${email})`], ['phone', 'Phone'], ['either', 'Either email or phone']].map(([value, label]) =>
            <label key={value} className="hub-chef-check"><input type="radio" name="contactPreference" value={value} checked={form.contactPreference === value} onChange={() => change('contactPreference', value)} /><span>{label}</span></label>)}
        </fieldset>
        <Question id={fieldId('phone')} label="Phone" optional={form.contactPreference === 'email'} error={errors.phone}>
          <input type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} {...text('phone')} />
        </Question>
      </section>

      <section className="hub-chef-section">
        <h3>Your cooking</h3>
        <Question id={fieldId('serviceArea')} label="Where can you work?" hint="Neighborhoods or cities where you can cook or deliver. For example: St. Paul, Roseville, South Minneapolis." error={errors.serviceArea}>
          <input maxLength={LIMITS.serviceArea} {...text('serviceArea')} />
        </Question>
        <Question id={fieldId('experience')} label="Cooking and work experience" hint="Restaurants, catering, private-chef or pop-up work, and for how long. A few sentences is plenty." max={LIMITS.experience} value={form.experience} error={errors.experience}>
          <textarea rows={5} {...text('experience')} />
        </Question>
      </section>

      <section className="hub-chef-section">
        <h3>What you are looking for</h3>
        <Question id={fieldId('interests')} label="What interests you?" hint="Referrals, prep work, kitchen access, or other goals. What would make this worth your time?" max={LIMITS.interests} value={form.interests} error={errors.interests}>
          <textarea rows={4} {...text('interests')} />
        </Question>
        <Question id={fieldId('availability')} label="Availability and work preferences" hint="Days and hours you can work, how much work you want, and any limits." max={LIMITS.availability} value={form.availability} error={errors.availability}>
          <textarea rows={4} {...text('availability')} />
        </Question>
      </section>

      {!isNew && <>
        <details className="hub-chef-details" open={detailsOpen}>
          <summary>Optional: fuller private work profile</summary>
          <p className="hub-help">Optional details for work discussions. Do not enter SSNs, EINs, banking information, W-9 details, medical records, or identity documents here or in public drafts.</p>
          {WORK_FIELDS.map(([key, label, hint]) => <Question key={key} id={fieldId('work', key)} label={label} hint={hint} optional max={LIMITS.workProfile[key]} value={form.workProfile[key]}>
            <textarea rows={3} value={form.workProfile[key]} onChange={(e) => nestedChange('workProfile', key, e.target.value)} />
          </Question>)}
        </details>
        <details className="hub-chef-details" open={draftOpen}>
          <summary>Optional: public profile draft (stays private)</summary>
          <p className="hub-help">This private draft does not publish anything. The consent below permits consideration only. After admission, the separate public-listing panel requires consent to an exact saved revision and owner moderation.</p>
          <Question id={fieldId('bio')} label="Public biography draft" optional max={LIMITS.publicDraft.bio} value={form.publicDraft.bio}>
            <textarea rows={4} value={form.publicDraft.bio} onChange={(e) => nestedChange('publicDraft', 'bio', e.target.value)} />
          </Question>
          <Question id={fieldId('publicServices')} label="Public services draft" optional max={LIMITS.publicDraft.services} value={form.publicDraft.services}>
            <textarea rows={3} value={form.publicDraft.services} onChange={(e) => nestedChange('publicDraft', 'services', e.target.value)} />
          </Question>
          <Question id={fieldId('photoUrl')} label="Photo link" hint="A public HTTPS link. It is not uploaded or previewed." optional error={errors.photoUrl}>
            <input type="url" inputMode="url" maxLength={LIMITS.publicDraft.photoUrl} value={form.publicDraft.photoUrl} onChange={(e) => nestedChange('publicDraft', 'photoUrl', e.target.value)} />
          </Question>
          <label className="hub-chef-check"><input type="checkbox" checked={form.publicationConsent} onChange={(e) => change('publicationConsent', e.target.checked)} /><span>I separately consent to consideration of my biography, services, and photo draft for future public publication, only after owner moderation. I can remove this consent here.</span></label>
        </details>
        <p className="hub-help"><strong>Keep tax records out of this application.</strong> Do not send or upload a W-9 here. Follow only the secure provider instructions in your membership offer after owner classification and provider review. This workspace does not send payroll invitations or collect tax or bank records.</p>
      </>}

      {(isNew || reapplying) && <div className={`hub-chef-ack${errors.acknowledgment ? ' has-error' : ''}`}>
        <label className="hub-chef-check"><input id={fieldId('acknowledgment')} type="checkbox" checked={form.acknowledgment} aria-invalid={errors.acknowledgment ? true : undefined} onChange={(e) => change('acknowledgment', e.target.checked)} /><span>I understand this is a no-fee application, not membership admission, employment, an equity grant, or guaranteed work. I consent to private review by authorized Local Effort reviewers. Membership requires a separate offer and accepted terms; withdrawing retains the private application and review history.</span></label>
        {errors.acknowledgment && <p className="hub-error">{errors.acknowledgment}</p>}
      </div>}

      <div ref={statusRef} className="hub-chef-status">
        {problems.length > 0 && <div className="hub-error" role="alert"><strong>Fix {problems.length === 1 ? 'this' : 'these'} before saving:</strong>
          <ul>{problems.map((p) => <li key={p.field}><a href={`#${fieldId(p.field)}`} onClick={(e) => { e.preventDefault(); document.getElementById(fieldId(p.field))?.focus(); }}>{p.message}</a></li>)}</ul></div>}
        {error && <div className="hub-error" role="alert">{error}{' '}<button type="button" className="hub-text-button" onClick={onReload}>Reload saved version (discards your edits)</button></div>}
        {message && <p className="hub-notice" role="status">{message}</p>}
      </div>

      <div className="hub-chef-actions">
        <button type="submit" className="hub-primary-button" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Submit no-fee application' : reapplying ? 'Reapply with these details' : application.status === 'needs-information' ? 'Save and resubmit for review' : 'Save private profile'}</button>
        {dirty && !busy && <><span className="hub-help" role="status">You have unsaved changes.</span><button type="button" className="hub-text-button" onClick={onDiscard}>{isNew ? 'Clear the form' : 'Discard changes'}</button></>}
      </div>
    </fieldset>
  </form>;
}
