import React, { useCallback, useEffect, useRef, useState } from 'react';

// Never prerender or retain a directory snapshot: every read rechecks consent.
export default function ChefDirectory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const currentRequest = useRef(null);
  const load = useCallback(async () => {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    setData(null);
    try {
      const profiles = [];
      let cursor = null;
      let directory = null;
      do {
        const response = await fetch(`/api/chef-profiles${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
        if (!response.ok) throw new Error('Directory unavailable');
        const result = await response.json();
        directory = result.directory;
        profiles.push(...result.profiles);
        cursor = result.nextCursor;
      } while (cursor);
      if (!controller.signal.aborted) { setData({ directory, profiles }); setError(false); }
    } catch { if (!controller.signal.aborted) { setData(null); setError(true); } }
  }, []);
  useEffect(() => {
    let mounted = true;
    // This wrapper prevents queued focus events from restarting after unmount.
    const refresh = () => { if (mounted && document.visibilityState === 'visible') load(); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { mounted = false; currentRequest.current?.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  if (!data?.directory) return error ? <p role="status"><a href="/api/chef-profiles">The live chef directory is temporarily unavailable.</a></p> : null;
  return <section className="chef-cooperative__section" id="chef-directory" aria-labelledby="chef-directory-title">
    <h2 id="chef-directory-title">{data.directory.heading}</h2>
    <div><p className="chef-cooperative__copy">{data.directory.body}</p><div className="chef-cooperative__ledger">{data.profiles.map(profile => <article className="chef-cooperative__row" key={profile.slug} id={`chef-${profile.slug}`}><div><h3>{profile.displayName}</h3><p>{profile.serviceArea}</p>{profile.photoUrl && <figure className="chef-cooperative__photo"><img src={profile.photoUrl} alt={profile.displayName} loading="lazy" referrerPolicy="no-referrer" /></figure>}</div><div><p>{profile.bio}</p><p>{profile.services}</p></div></article>)}</div></div>
  </section>;
}
