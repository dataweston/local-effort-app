import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Board from '../../components/calendarRouting/Board';
import PreviewPanel, { PREVIEW_DAYS } from '../../components/calendarRouting/PreviewPanel';
import {
  addDaysIso,
  draftProblems,
  graphKey,
  messageFor,
  normalizeGraph,
  previewKey,
  routeKey,
  todayChicago,
  toSaveGraph,
} from '../../components/calendarRouting/routingRules';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import './calendar-routing.css';

const API = '/api/calendar-routing';
const TOKEN_KEY = 'smallEventsAdminToken'; // same key the Small Events admin pages use
const PREVIEW_DELAY_MS = 350;

const getStoredAdminToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

const setStoredAdminToken = (value) => {
  try {
    if (value) window.localStorage.setItem(TOKEN_KEY, value);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be blocked; the token then lasts for this tab only.
  }
};

class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function callApi(path, token, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('network', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data?.error || (response.status === 401 ? 'unauthorized' : `http-${response.status}`), response.status);
  return data;
}

export default function CalendarRoutingPage() {
  // A signed-in admin needs no token. The pasted token stays as the fallback
  // for a browser that is not signed in.
  const { accessToken, isAdmin: signedInAdmin } = useSupabaseAuth();
  const [token, setToken] = useState('');
  const [tokenDraft, setTokenDraft] = useState('');
  const credential = (signedInAdmin && accessToken) || token;
  const credentialRef = useRef('');
  credentialRef.current = credential;
  const hasCredential = Boolean(credential);
  const [loadState, setLoadState] = useState('idle'); // idle | loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [resources, setResources] = useState([]);
  const [google, setGoogle] = useState(null);
  const [failedMirrors, setFailedMirrors] = useState(0);
  const [liveFeeds, setLiveFeeds] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [notice, setNotice] = useState('Drag from the right edge of a calendar to the left edge of another to cable them.');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState(false);

  const [resource, setResource] = useState('client');
  const [from] = useState(todayChicago);
  const [days, setDays] = useState(null);
  const [savedDays, setSavedDays] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const savedDaysFor = useRef('');

  useEffect(() => {
    const stored = getStoredAdminToken();
    setToken(stored);
    setTokenDraft(stored);
  }, []);

  const load = useCallback(async (activeToken) => {
    setLoadState('loading');
    setLoadError('');
    try {
      const data = await callApi('/graph', activeToken);
      const graph = normalizeGraph(data.graph);
      setSaved(graph);
      setDraft(graph);
      setResources(Array.isArray(data.resources) ? data.resources : []);
      setGoogle(data.google || null);
      setFailedMirrors(Number(data.failedMirrors) || 0);
      setLiveFeeds(Object.fromEntries(graph.nodes.filter((node) => node.kind === 'feed').map((node) => [node.id, node.config])));
      setSelectedKey(null);
      setSaveError('');
      setSavedAt(false);
      savedDaysFor.current = '';
      setLoadState('ready');
      setResource((current) => ((data.resources || []).some((item) => item.slug === current) ? current : data.resources?.[0]?.slug || current));
    } catch (error) {
      setLoadError(messageFor(error.code || 'network'));
      setLoadState('error');
    }
  }, []);

  // Keyed on having a credential, not on its value: Supabase refreshes the
  // access token hourly and a reload would discard unsaved edits.
  useEffect(() => {
    if (hasCredential) load(credentialRef.current);
    else setLoadState('idle');
  }, [hasCredential, load]);

  const submitToken = (event) => {
    event.preventDefault();
    const next = tokenDraft.trim();
    setStoredAdminToken(next);
    setToken(next);
    if (hasCredential && next) load(signedInAdmin && accessToken ? accessToken : next);
  };

  // ── Draft edits ─────────────────────────────────────────────────────────

  const edit = useCallback((change) => {
    setSavedAt(false);
    setDraft((current) => (current ? change(current) : current));
  }, []);

  const moveNode = useCallback((id, x, y) => edit((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, posX: x, posY: y } : n)) })), [edit]);

  const configNode = useCallback((id, patch) => edit((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...patch } } : n)) })), [edit]);

  const connect = useCallback((fromId, toId, kind) => {
    const route = { fromId, toId, kind, enabled: true };
    edit((g) => ({ ...g, routes: [...g.routes, route] }));
    setSelectedKey(routeKey(route));
  }, [edit]);

  const toggleRoute = useCallback((key) => edit((g) => ({ ...g, routes: g.routes.map((r) => (routeKey(r) === key ? { ...r, enabled: !r.enabled } : r)) })), [edit]);

  const deleteRoute = useCallback((key) => {
    edit((g) => ({ ...g, routes: g.routes.filter((r) => routeKey(r) !== key) }));
    setSelectedKey(null);
  }, [edit]);

  const nodesForBoard = useMemo(
    () => (draft ? draft.nodes.map((node) => (node.kind === 'feed' ? { ...node, config: liveFeeds[node.id] || node.config } : node)) : []),
    [draft, liveFeeds],
  );

  const dirty = Boolean(saved && draft && graphKey(saved) !== graphKey(draft));
  const problems = useMemo(() => (draft ? draftProblems(draft) : {}), [draft]);
  const problemCount = Object.keys(problems).length;

  const revert = () => {
    setDraft(saved);
    setSelectedKey(null);
    setSaveError('');
    setSavedAt(false);
    setNotice('Went back to the saved routing.');
  };

  const save = async () => {
    if (!draft || saving || problemCount) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = await callApi('/graph', credentialRef.current, { method: 'PUT', body: toSaveGraph(draft) });
      const graph = normalizeGraph(data.graph);
      // Keep the feeds' live status the server just reported; PUT does not carry it.
      const withFeeds = { ...graph, nodes: graph.nodes.map((node) => (node.kind === 'feed' ? { ...node, config: liveFeeds[node.id] || node.config } : node)) };
      setSaved(withFeeds);
      setDraft(withFeeds);
      setSavedAt(true);
      savedDaysFor.current = '';
    } catch (error) {
      setSaveError(messageFor(error.code || 'network'));
    } finally {
      setSaving(false);
    }
  };

  // ── Preview ─────────────────────────────────────────────────────────────

  const savedKey = saved ? previewKey(saved) : '';
  const draftKey = draft ? previewKey(draft) : '';
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const requestPreview = useCallback(async (graph, signal) => {
    const data = await callApi('/preview', credentialRef.current, {
      method: 'POST',
      signal,
      body: { resource, graph: toSaveGraph(graph), from, to: addDaysIso(from, PREVIEW_DAYS - 1) },
    });
    return Array.isArray(data.days) ? data.days : [];
  }, [resource, from]);

  // The saved graph's preview is the baseline for "N dates change".
  useEffect(() => {
    if (loadState !== 'ready' || !savedRef.current) return undefined;
    const marker = `${resource}|${savedKey}`;
    if (savedDaysFor.current === marker) return undefined;
    const controller = new AbortController();
    requestPreview(savedRef.current, controller.signal)
      .then((result) => {
        savedDaysFor.current = marker;
        setSavedDays(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [loadState, resource, savedKey, requestPreview]);

  // The draft's preview: debounced, and a newer change cancels the request in flight.
  useEffect(() => {
    if (loadState !== 'ready' || !draftRef.current) return undefined;
    const controller = new AbortController();
    setPreviewBusy(true);
    const timer = setTimeout(() => {
      requestPreview(draftRef.current, controller.signal)
        .then((result) => {
          setDays(result);
          setPreviewError('');
          setPreviewBusy(false);
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          setPreviewError(messageFor(error.code || 'network'));
          setPreviewBusy(false);
        });
    }, PREVIEW_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadState, resource, draftKey, requestPreview]);

  const hasToken = hasCredential;
  const bannerError = loadState === 'error' ? loadError : '';

  return (
    <main className="calendar-routing">
      <Helmet>
        <title>Calendar routing | Local Effort admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="cr-top">
        <div>
          <h1>Calendar routing</h1>
          <p className="cr-note">
            What comes in, which calendar it closes, and where bookings go out. Changes show in the preview before you save.
          </p>
        </div>

        <form className="cr-token" onSubmit={submitToken}>
          <label className="cr-field" htmlFor="cr-token">
            <span>Admin token</span>
            <input
              id="cr-token"
              type="password"
              value={tokenDraft}
              autoComplete="off"
              onChange={(event) => setTokenDraft(event.target.value)}
            />
          </label>
          <button type="submit">{hasToken ? 'Reload' : 'Open'}</button>
        </form>
      </header>

      {!hasToken ? <p className="cr-banner">Sign in as an admin, or enter the admin token, to load the routing.</p> : null}
      {bannerError ? <p className="cr-banner cr-banner--error" role="alert">{bannerError}</p> : null}
      {loadState === 'loading' ? <p className="cr-banner" role="status">Loading the routing…</p> : null}

      {failedMirrors > 0 ? (
        <p className="cr-banner cr-banner--warn" role="status">
          {failedMirrors} {failedMirrors === 1 ? 'booking' : 'bookings'} did not reach Google Calendar and will be retried by the daily sync.
        </p>
      ) : null}

      {loadState === 'ready' && draft ? (
        <>
          <div className="cr-bar">
            <p className="cr-state" role="status" aria-live="polite" data-dirty={dirty ? 'true' : undefined}>
              {saving ? 'Saving…' : dirty ? 'Unsaved changes. Buyers still see the saved routing.' : savedAt ? 'Saved. Buyers now see this routing.' : 'Nothing changed since the last save.'}
            </p>
            <div className="cr-bar__actions">
              <button type="button" onClick={revert} disabled={!dirty || saving}>Revert</button>
              <button type="button" className="cr-primary" onClick={save} disabled={!dirty || saving || problemCount > 0}>Save routing</button>
            </div>
          </div>
          {problemCount > 0 ? <p className="cr-note cr-note--error">Fix the highlighted fields before saving.</p> : null}
          {saveError ? <p className="cr-banner cr-banner--error" role="alert">{saveError}</p> : null}

          <div className="cr-layout">
            <Board
              nodes={nodesForBoard}
              routes={draft.routes}
              google={google}
              problems={problems}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onMove={moveNode}
              onConnect={connect}
              onToggle={toggleRoute}
              onDelete={deleteRoute}
              onConfig={configNode}
              notice={notice}
              onNotice={setNotice}
            />
            <PreviewPanel
              resources={resources}
              resource={resource}
              onResource={setResource}
              from={from}
              days={days}
              savedDays={savedDays}
              busy={previewBusy}
              error={previewError}
              dirty={dirty}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
