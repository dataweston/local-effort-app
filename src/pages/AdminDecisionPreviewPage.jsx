import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import '../styles/fullpage-demo-theme.css';
import '../styles/decision-preview-admin.css';

const DEFAULT_FORM = {
  path: '/',
  pageType: 'home',
  category: '',
  productSlug: '',
  acquisitionSource: '',
  acquisitionCampaign: '',
  acquisitionMedium: '',
  acquisitionTerm: '',
  referrer: '',
  isReturning: false,
  deviceType: 'desktop',
  geoRegion: '',
  language: 'en-US',
  commercialMode: '',
  cartItemCount: 0,
  viewedProductSlugs: '',
  maxWords: 35,
  tone: 'helpful, concise, non-pushy',
  variantOverride: '',
};

const VARIANT_OPTIONS = [
  { value: '', label: 'Assigned variant' },
  { value: 'control', label: 'Force control' },
  { value: 'rules', label: 'Force rules' },
  { value: 'llm-copy', label: 'Force llm-copy' },
];

function createPreviewSessionId() {
  return `decision-preview-${Math.random().toString(36).slice(2, 10)}`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function parseCommaList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildObservedSignalChips(preview) {
  const context = preview?.context;
  if (!context) return [];

  const chips = [
    `path:${context.page.path}`,
    `page:${context.page.type || 'unknown'}`,
  ];

  if (context.acquisition?.source) chips.push(`source:${context.acquisition.source}`);
  if (context.acquisition?.campaign) chips.push(`campaign:${context.acquisition.campaign}`);
  if (context.acquisition?.medium) chips.push(`medium:${context.acquisition.medium}`);
  if (context.visitor?.deviceType) chips.push(`device:${context.visitor.deviceType}`);
  if (context.visitor?.language) chips.push(`language:${context.visitor.language}`);
  chips.push(`cart_items:${context.session?.cartItemCount || 0}`);

  for (const slug of context.session?.viewedProductSlugs || []) {
    chips.push(`viewed:${slug}`);
  }

  return chips;
}

function buildInferredSignalChips(preview) {
  const context = preview?.context;
  const selected = preview?.selected;
  if (!context || !selected) return [];

  const chips = [];

  if (context.acquisition?.campaignClass) chips.push(`campaign_class:${context.acquisition.campaignClass}`);
  if (context.visitor?.commercialMode) chips.push(`commercial_mode:${context.visitor.commercialMode}`);
  if (context.session?.depth) chips.push(`session_depth:${context.session.depth}`);
  chips.push(`high_intent:${context.session?.hasHighIntent ? 'yes' : 'no'}`);

  for (const hypothesis of selected.visitorHypotheses || []) {
    chips.push(`hypothesis:${hypothesis.label} (${Math.round((hypothesis.confidence || 0) * 100)}%)`);
  }

  return chips;
}

const UNUSED_SIGNAL_CHIPS = [
  'No Google Analytics / GA4 import',
  'No ad-platform audience sync',
  'No demographic enrichment layer',
];

function renderMatchState(detail) {
  if (detail?.matched) return 'matched';
  const failed = Object.entries(detail?.matchDetails || {})
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  return failed.length ? `not matched: ${failed.join(', ')}` : 'not matched';
}

const AdminDecisionPreviewPage = () => {
  const {
    user,
    isAdmin,
    accessToken,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  } = useSupabaseAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sessionId, setSessionId] = useState(createPreviewSessionId);
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const authHeaders = useMemo(() => (
    accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  ), [accessToken]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePreview = useCallback(async () => {
    if (!accessToken) return;
    setLoadingPreview(true);
    setStatus('Running preview...');
    try {
      const payload = {
        sessionId,
        path: form.path,
        pageType: form.pageType || undefined,
        category: form.category || undefined,
        productSlug: form.productSlug || undefined,
        acquisition: {
          source: form.acquisitionSource || undefined,
          campaign: form.acquisitionCampaign || undefined,
          medium: form.acquisitionMedium || undefined,
          term: form.acquisitionTerm || undefined,
          referrer: form.referrer || undefined,
        },
        visitor: {
          isReturning: form.isReturning,
          deviceType: form.deviceType || undefined,
          geoRegion: form.geoRegion || undefined,
          language: form.language || undefined,
          commercialMode: form.commercialMode || undefined,
        },
        session: {
          cartItemCount: Number(form.cartItemCount) || 0,
          viewedProductSlugs: parseCommaList(form.viewedProductSlugs),
        },
        constraints: {
          maxWords: Number(form.maxWords) || undefined,
          tone: form.tone || undefined,
        },
        variantOverride: form.variantOverride || undefined,
      };
      const data = await fetchJson('/api/decision/admin/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      setPreview(data);
      setStatus('Preview ready');
    } catch (error) {
      setStatus(error.message || 'Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  }, [accessToken, authHeaders, form, sessionId]);

  useEffect(() => {
    if (isAdmin && accessToken && !preview) {
      void handlePreview();
    }
  }, [accessToken, handlePreview, isAdmin, preview]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    fetchJson('/api/decision/admin/report?days=14', { headers: authHeaders })
      .then((data) => setReport(data))
      .catch(() => setReport(null));
  }, [accessToken, authHeaders, isAdmin]);

  const handleEmitEvent = async (eventType) => {
    if (!preview) return;
    setStatus(`Logging ${eventType}...`);
    try {
      await fetchJson('/api/decision/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1',
          eventType,
          occurredAt: new Date().toISOString(),
          sessionId,
          path: preview.context.page.path,
          strategy: preview.selected.strategy,
          assignment: preview.assignment,
          reasonCodes: preview.selected.reasonCodes,
          selectedPriorityIds: preview.selected.businessPriorities.map((entry) => entry.id),
          metadata: {
            surface: 'admin-preview',
            variantOverride: form.variantOverride || null,
          },
        }),
      });
      setStatus(`${eventType} logged`);
    } catch (error) {
      setStatus(error.message || 'Event logging failed');
    }
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthMessage('');
    try {
      await signInWithGoogle(`${window.location.origin}/admin/decision-preview`);
    } catch (error) {
      setAuthMessage(error.message || 'Sign in failed');
      setSigningIn(false);
    }
  };

  const handleEmailSignIn = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    setAuthMessage('');
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error) {
      setAuthMessage(error.message || 'Sign in failed');
    } finally {
      setSigningIn(false);
    }
  };

  const matchedPriorities = preview?.debug?.priorityEvaluations?.filter((entry) => entry.matched) || [];
  const unmatchedPriorities = preview?.debug?.priorityEvaluations?.filter((entry) => !entry.matched) || [];
  const observedSignals = useMemo(() => buildObservedSignalChips(preview), [preview]);
  const inferredSignals = useMemo(() => buildInferredSignalChips(preview), [preview]);

  if (loading) {
    return (
      <div className="decision-preview-admin fullpage-demo-scope">
        <div className="decision-preview-admin-shell">
          <Card>
            <CardHeader>
              <CardTitle>Loading admin access...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Checking credentials.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="decision-preview-admin fullpage-demo-scope">
        <div className="decision-preview-admin-shell decision-preview-admin-shell--narrow">
          <Card>
            <CardHeader>
              <CardTitle>Decision Preview Admin</CardTitle>
              <CardDescription>Sign in with an admin account to inspect adaptive welcome decisions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGoogleSignIn} disabled={signingIn}>Sign in with Google</Button>
              <div className="decision-preview-admin-divider">or sign in with email</div>
              <form onSubmit={handleEmailSignIn} className="decision-preview-admin-auth-form">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email"
                  disabled={signingIn}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="password"
                  disabled={signingIn}
                />
                <Button type="submit" disabled={signingIn || !email || !password}>
                  {signingIn ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              {authMessage ? <p className="text-sm text-red-600">{authMessage}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="decision-preview-admin fullpage-demo-scope">
        <div className="decision-preview-admin-shell decision-preview-admin-shell--narrow">
          <Card>
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
              <CardDescription>Your current account does not have preview access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Use an approved admin account to inspect decision behavior and experiment state.</p>
              <Button variant="outline" onClick={signOut}>Sign out</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="decision-preview-admin fullpage-demo-scope">
      <div className="decision-preview-admin-shell">
        <header className="decision-preview-admin-hero">
          <div>
            <span className="decision-preview-admin-eyebrow">Decision Engine Admin</span>
            <h1>Preview adaptive welcome decisions before rollout</h1>
            <p className="decision-preview-admin-subtitle">
              Inspect normalized context, assignment, matched priorities, and reason codes from the same backend seam that future customer-facing surfaces will use.
            </p>
          </div>
          <div className="decision-preview-admin-hero-actions">
            <div className="decision-preview-admin-status">{status || 'Ready'}</div>
            <Button variant="outline" size="sm" onClick={() => { setSessionId(createPreviewSessionId()); setStatus('Started a new preview session'); }}>
              New session
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        <div className="decision-preview-admin-grid">
          <Card className="decision-preview-admin-panel">
            <CardHeader>
              <CardTitle>Preview Inputs</CardTitle>
              <CardDescription>Shape the request as acquisition, visitor, and page context.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="decision-preview-admin-form-grid">
                <label>
                  <span>Path</span>
                  <input value={form.path} onChange={(event) => updateField('path', event.target.value)} />
                </label>
                <label>
                  <span>Page type</span>
                  <input value={form.pageType} onChange={(event) => updateField('pageType', event.target.value)} />
                </label>
                <label>
                  <span>Category</span>
                  <input value={form.category} onChange={(event) => updateField('category', event.target.value)} />
                </label>
                <label>
                  <span>Product slug</span>
                  <input value={form.productSlug} onChange={(event) => updateField('productSlug', event.target.value)} />
                </label>
                <label>
                  <span>Source</span>
                  <input value={form.acquisitionSource} onChange={(event) => updateField('acquisitionSource', event.target.value)} />
                </label>
                <label>
                  <span>Campaign</span>
                  <input value={form.acquisitionCampaign} onChange={(event) => updateField('acquisitionCampaign', event.target.value)} />
                </label>
                <label>
                  <span>Medium</span>
                  <input value={form.acquisitionMedium} onChange={(event) => updateField('acquisitionMedium', event.target.value)} />
                </label>
                <label>
                  <span>Search term</span>
                  <input value={form.acquisitionTerm} onChange={(event) => updateField('acquisitionTerm', event.target.value)} />
                </label>
                <label className="decision-preview-admin-form-grid__wide">
                  <span>Referrer</span>
                  <input value={form.referrer} onChange={(event) => updateField('referrer', event.target.value)} />
                </label>
                <label>
                  <span>Device</span>
                  <select value={form.deviceType} onChange={(event) => updateField('deviceType', event.target.value)}>
                    <option value="desktop">desktop</option>
                    <option value="mobile">mobile</option>
                    <option value="tablet">tablet</option>
                  </select>
                </label>
                <label>
                  <span>Geo region</span>
                  <input value={form.geoRegion} onChange={(event) => updateField('geoRegion', event.target.value)} />
                </label>
                <label>
                  <span>Language</span>
                  <input value={form.language} onChange={(event) => updateField('language', event.target.value)} />
                </label>
                <label>
                  <span>Commercial mode</span>
                  <input value={form.commercialMode} onChange={(event) => updateField('commercialMode', event.target.value)} placeholder="consumer | subscriber | b2b | planner" />
                </label>
                <label>
                  <span>Cart items</span>
                  <input type="number" min="0" value={form.cartItemCount} onChange={(event) => updateField('cartItemCount', event.target.value)} />
                </label>
                <label>
                  <span>Viewed product slugs</span>
                  <input value={form.viewedProductSlugs} onChange={(event) => updateField('viewedProductSlugs', event.target.value)} placeholder="slug-one, slug-two" />
                </label>
                <label>
                  <span>Max words</span>
                  <input type="number" min="1" value={form.maxWords} onChange={(event) => updateField('maxWords', event.target.value)} />
                </label>
                <label>
                  <span>Variant override</span>
                  <select value={form.variantOverride} onChange={(event) => updateField('variantOverride', event.target.value)}>
                    {VARIANT_OPTIONS.map((option) => (
                      <option key={option.value || 'assigned'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="decision-preview-admin-toggle">
                  <input type="checkbox" checked={form.isReturning} onChange={(event) => updateField('isReturning', event.target.checked)} />
                  <span>Returning visitor</span>
                </label>
                <label className="decision-preview-admin-form-grid__wide">
                  <span>Tone</span>
                  <input value={form.tone} onChange={(event) => updateField('tone', event.target.value)} />
                </label>
              </div>
              <div className="decision-preview-admin-actions-row">
                <Button onClick={handlePreview} disabled={loadingPreview}>{loadingPreview ? 'Running...' : 'Run preview'}</Button>
                <Button variant="outline" onClick={() => setForm(DEFAULT_FORM)}>Reset fields</Button>
              </div>
              <p className="text-sm text-slate-600">This preview uses request payload fields, browser-style context, cart state, and decision-event telemetry. It does not read Google Analytics.</p>
            </CardContent>
          </Card>

          <div className="decision-preview-admin-stack">
            <Card className="decision-preview-admin-panel">
              <CardHeader>
                <CardTitle>Decision Result</CardTitle>
                <CardDescription>Primary recommendation selected by the current policy engine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview ? (
                  <>
                    <div className="decision-preview-admin-kpis">
                      <div>
                        <span>Strategy</span>
                        <strong>{preview.selected.strategy}</strong>
                      </div>
                      <div>
                        <span>Assignment</span>
                        <strong>{preview.assignment?.variant || 'none'}</strong>
                      </div>
                      <div>
                        <span>Priority source</span>
                        <strong>{preview.debug?.prioritySource?.sourceName || 'unknown'}</strong>
                      </div>
                    </div>
                    <div className="decision-preview-admin-welcome">{preview.selected.welcomeText}</div>
                    <div>
                      <div className="decision-preview-admin-section-label">Suggested actions</div>
                      <div className="decision-preview-admin-chip-row">
                        {preview.selected.suggestedActions.length ? preview.selected.suggestedActions.map((action) => (
                          <span key={`${action.label}-${action.href}`} className="decision-preview-admin-chip">
                            {action.label} {"->"} {action.href}
                          </span>
                        )) : <span className="decision-preview-admin-chip is-muted">No CTA selected</span>}
                      </div>
                    </div>
                    <div>
                      <div className="decision-preview-admin-section-label">Reason codes</div>
                      <div className="decision-preview-admin-chip-row">
                        {preview.selected.reasonCodes.map((reason) => (
                          <span key={reason} className="decision-preview-admin-chip is-accent">{reason}</span>
                        ))}
                      </div>
                    </div>
                    <div className="decision-preview-admin-actions-row">
                      <Button variant="outline" size="sm" onClick={() => handleEmitEvent('decision.rendered')}>Log rendered</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEmitEvent('decision.clicked')}>Log clicked</Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">Run a preview to inspect the current decision output.</p>
                )}
              </CardContent>
            </Card>

            <Card className="decision-preview-admin-panel">
              <CardHeader>
                <CardTitle>How It Reads The Visitor</CardTitle>
                <CardDescription>Observed facts are normalized first, then the engine infers higher-level signals before matching priorities.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview ? (
                  <>
                    <div>
                      <div className="decision-preview-admin-section-label">Observed inputs</div>
                      <div className="decision-preview-admin-chip-row">
                        {observedSignals.map((signal) => (
                          <span key={signal} className="decision-preview-admin-chip">{signal}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="decision-preview-admin-section-label">Inferred signals</div>
                      <div className="decision-preview-admin-chip-row">
                        {inferredSignals.length ? inferredSignals.map((signal) => (
                          <span key={signal} className="decision-preview-admin-chip is-accent">{signal}</span>
                        )) : <span className="decision-preview-admin-chip is-muted">No inferred signals</span>}
                      </div>
                    </div>
                    <div>
                      <div className="decision-preview-admin-section-label">Explicitly not used</div>
                      <div className="decision-preview-admin-chip-row">
                        {UNUSED_SIGNAL_CHIPS.map((signal) => (
                          <span key={signal} className="decision-preview-admin-chip is-muted">{signal}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">The backend decides from normalized request context and Sanity priorities. GA/GA4 is not part of the decision payload anywhere in this flow.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">Run a preview to see which signals are directly observed versus inferred.</p>
                )}
              </CardContent>
            </Card>

            <Card className="decision-preview-admin-panel">
              <CardHeader>
                <CardTitle>Priority Inspector</CardTitle>
                <CardDescription>See which priorities matched and why others did not.</CardDescription>
              </CardHeader>
              <CardContent className="decision-preview-admin-priority-columns">
                <div>
                  <div className="decision-preview-admin-section-label">Matched priorities</div>
                  <div className="decision-preview-admin-priority-list">
                    {matchedPriorities.length ? matchedPriorities.map((entry) => (
                      <div key={entry.id} className="decision-preview-admin-priority-card">
                        <div className="decision-preview-admin-priority-head">
                          <strong>{entry.label}</strong>
                          <span>{entry.strategy} | {entry.weight.toFixed(2)}</span>
                        </div>
                        <div className="decision-preview-admin-priority-meta">{renderMatchState(entry)}</div>
                        <div className="decision-preview-admin-chip-row">
                          {(entry.reasons || []).map((reason) => (
                            <span key={reason} className="decision-preview-admin-chip">{reason}</span>
                          ))}
                        </div>
                      </div>
                    )) : <p className="text-sm text-slate-600">No priorities matched this context.</p>}
                  </div>
                </div>
                <div>
                  <div className="decision-preview-admin-section-label">Unmatched priorities</div>
                  <div className="decision-preview-admin-priority-list">
                    {unmatchedPriorities.length ? unmatchedPriorities.map((entry) => (
                      <div key={entry.id} className="decision-preview-admin-priority-card is-muted">
                        <div className="decision-preview-admin-priority-head">
                          <strong>{entry.label}</strong>
                          <span>{entry.strategy} | {entry.weight.toFixed(2)}</span>
                        </div>
                        <div className="decision-preview-admin-priority-meta">{renderMatchState(entry)}</div>
                      </div>
                    )) : <p className="text-sm text-slate-600">All known priorities matched.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="decision-preview-admin-grid decision-preview-admin-grid--lower">
          <Card className="decision-preview-admin-panel">
            <CardHeader>
              <CardTitle>Decision Report</CardTitle>
              <CardDescription>Last 14 days of tracked decision events for the new surface.</CardDescription>
            </CardHeader>
            <CardContent>
              {report ? (
                <>
                  <div className="decision-preview-admin-kpis">
                    <div>
                      <span>Rendered</span>
                      <strong>{report.totals?.rendered || 0}</strong>
                    </div>
                    <div>
                      <span>Clicked</span>
                      <strong>{report.totals?.clicked || 0}</strong>
                    </div>
                    <div>
                      <span>CTR</span>
                      <strong>{(((report.clickThroughRate || 0) * 100).toFixed(1))}%</strong>
                    </div>
                  </div>
                  <div className="decision-preview-admin-priority-columns">
                    <div>
                      <div className="decision-preview-admin-section-label">Variants</div>
                      <div className="decision-preview-admin-priority-list">
                        {(report.variants || []).map((entry) => (
                          <div key={entry.key} className="decision-preview-admin-priority-card">
                            <div className="decision-preview-admin-priority-head">
                              <strong>{entry.key}</strong>
                              <span>{entry.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="decision-preview-admin-section-label">Top priorities</div>
                      <div className="decision-preview-admin-priority-list">
                        {(report.topPriorities || []).map((entry) => (
                          <div key={entry.priorityId} className="decision-preview-admin-priority-card">
                            <div className="decision-preview-admin-priority-head">
                              <strong>{entry.priorityId}</strong>
                              <span>{entry.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">Reporting is not available yet for this environment.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="decision-preview-admin-grid decision-preview-admin-grid--lower">
          <Card className="decision-preview-admin-panel">
            <CardHeader>
              <CardTitle>Normalized Context</CardTitle>
            </CardHeader>
            <CardContent>
              <pre>{preview ? formatJson(preview.context) : 'Run a preview to inspect normalized context.'}</pre>
            </CardContent>
          </Card>
          <Card className="decision-preview-admin-panel">
            <CardHeader>
              <CardTitle>Debug Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre>{preview ? formatJson(preview.debug || {}) : 'Run a preview to inspect debug diagnostics.'}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDecisionPreviewPage;


