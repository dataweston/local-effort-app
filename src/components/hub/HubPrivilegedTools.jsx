import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Copy,
  CreditCard,
  FileText,
  Inbox,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { api, formatCurrency, Panel, Field } from './hubShared';

export function PrivilegedTools({ accessToken, reloadDocs }) {
  const [invite, setInvite] = useState({ email: '', accessLevel: 'staff', displayNameHint: '' });
  const [created, setCreated] = useState(null);
  const [brain, setBrain] = useState({ sourceType: 'brain_inbox', sourceId: '', title: '', visibility: 'staff' });
  const [localistWindow, setLocalistWindow] = useState(null);
  const [localistMessage, setLocalistMessage] = useState('');
  const [localistStatus, setLocalistStatus] = useState('');
  const [localistBusy, setLocalistBusy] = useState(false);
  const [localistAnalytics, setLocalistAnalytics] = useState(null);
  const [localistAnalyticsStatus, setLocalistAnalyticsStatus] = useState('Loading activity...');
  const [localistOrders, setLocalistOrders] = useState(null);
  const [localistOrdersStatus, setLocalistOrdersStatus] = useState('Loading orders...');

  const createInvite = async (event) => {
    event.preventDefault();
    const data = await api('/api/hub/invites', accessToken, { method: 'POST', body: JSON.stringify(invite) });
    setCreated(data.invite);
  };

  const publishBrain = async (event) => {
    event.preventDefault();
    await api('/api/hub/brain-publish', accessToken, { method: 'POST', body: JSON.stringify(brain) });
    setBrain({ sourceType: 'brain_inbox', sourceId: '', title: '', visibility: 'staff' });
    await reloadDocs();
  };

  const createLocalistWindow = async () => {
    setLocalistStatus('');
    setLocalistBusy(true);
    try {
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', hoursValid: 48 }),
      });
      setLocalistWindow(data.window);
      setLocalistMessage(`Local Effort Localist menu is live for 48 hours: ${data.window.url} Reply STOP to opt out.`);
      setLocalistStatus('Link ready.');
      loadLocalistAnalytics().catch(() => {});
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to create link.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const sendLocalistSms = async () => {
    if (!localistWindow?.url) return;
    setLocalistStatus('Sending SMS through Brevo...');
    setLocalistBusy(true);
    try {
      const token = new URL(localistWindow.url, window.location.origin).searchParams.get('localist');
      if (!token) throw new Error('Localist token missing from generated link.');
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          action: 'sendSms',
          token,
          message: localistMessage,
        }),
      });
      setLocalistWindow(data.window);
      const brevoStatus = data.brevo?.status ? ` Brevo status: ${data.brevo.status}.` : '';
      const sentCount = Number(data.brevo?.statistics?.sent);
      const sentText = Number.isFinite(sentCount) ? ` Sent count: ${sentCount}.` : '';
      setLocalistStatus(`SMS submitted to Brevo as campaign ${data.brevo?.campaignId || data.window?.smsCampaignId || ''}.${brevoStatus}${sentText}`.trim());
      loadLocalistAnalytics().catch(() => {});
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to send SMS.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const checkLocalistSmsStatus = async () => {
    setLocalistStatus('Checking SMS setup...');
    setLocalistBusy(true);
    try {
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'smsStatus' }),
      });
      const sms = data.sms || {};
      if (sms.ready) {
        setLocalistStatus(`SMS setup ready. Sender: ${sms.sender}. Brevo list IDs: ${(sms.listIds || []).join(', ')}.`);
      } else {
        const missing = [
          !sms.hasApiKey ? 'BREVO_API_KEY' : null,
          !sms.listIds?.length ? 'BREVO_LOCALIST_LIST_ID' : null,
          !sms.sender ? 'BREVO_LOCALIST_SMS_SENDER' : null,
        ].filter(Boolean).join(', ');
        setLocalistStatus(`SMS setup is incomplete. Missing: ${missing || 'unknown config'}.`);
      }
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to check SMS setup.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const copyLocalistLink = async () => {
    if (!localistWindow?.url || !navigator.clipboard) return;
    await navigator.clipboard.writeText(localistWindow.url);
    setLocalistStatus('Link copied.');
  };

  const loadLocalistAnalytics = useCallback(async () => {
    setLocalistAnalyticsStatus('Loading activity...');
    try {
      const data = await api('/api/hub/localist-activity?limit=8', accessToken);
      setLocalistAnalytics(data.windows || []);
      setLocalistAnalyticsStatus('');
    } catch (err) {
      setLocalistAnalytics([]);
      setLocalistAnalyticsStatus(err.message || 'Unable to load Localist activity.');
    }
  }, [accessToken]);

  const loadLocalistOrders = useCallback(async () => {
    setLocalistOrdersStatus('Loading orders...');
    try {
      const data = await api('/api/hub/localist-orders?hours=168&limit=50', accessToken);
      setLocalistOrders(data);
      setLocalistOrdersStatus('');
    } catch (err) {
      setLocalistOrders({ orders: [], summary: {} });
      setLocalistOrdersStatus(err.message || 'Unable to load Localist orders.');
    }
  }, [accessToken]);

  useEffect(() => {
    loadLocalistAnalytics().catch(() => {});
  }, [loadLocalistAnalytics]);

  useEffect(() => {
    loadLocalistOrders().catch(() => {});
  }, [loadLocalistOrders]);

  const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
  const shortDateTime = (value) => (
    value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not yet'
  );

  return (
    <div className="hub-grid">
      <Panel title="Invite User" icon={UserPlus}>
        <form className="hub-form" onSubmit={createInvite}>
          <Field label="Email"><input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></Field>
          <Field label="Access">
            <select value={invite.accessLevel} onChange={(e) => setInvite({ ...invite, accessLevel: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
              <option value="privileged">Privileged</option>
            </select>
          </Field>
          <Field label="Name hint"><input value={invite.displayNameHint} onChange={(e) => setInvite({ ...invite, displayNameHint: e.target.value })} /></Field>
          <button className="hub-primary-button" type="submit"><UserPlus size={13} /> Create invite</button>
        </form>
        {created && (
          <div className="hub-copy-box">
            <strong>Invite link</strong>
            <input readOnly value={created.url || ''} onFocus={(e) => e.target.select()} />
          </div>
        )}
      </Panel>
      <Panel title="Send Brain to Hub" icon={Inbox}>
        <form className="hub-form" onSubmit={publishBrain}>
          <Field label="Source">
            <select value={brain.sourceType} onChange={(e) => setBrain({ ...brain, sourceType: e.target.value })}>
              <option value="brain_inbox">Brain inbox item</option>
              <option value="brain_entity">Brain entity</option>
            </select>
          </Field>
          <Field label="Source ID"><input value={brain.sourceId} onChange={(e) => setBrain({ ...brain, sourceId: e.target.value })} required /></Field>
          <Field label="Hub title"><input value={brain.title} onChange={(e) => setBrain({ ...brain, title: e.target.value })} /></Field>
          <Field label="Visibility">
            <select value={brain.visibility} onChange={(e) => setBrain({ ...brain, visibility: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="privileged">Privileged</option>
            </select>
          </Field>
          <button className="hub-primary-button" type="submit"><FileText size={13} /> Publish as doc</button>
        </form>
      </Panel>
      <Panel title="Localist Window" icon={ShoppingCart}>
        <div className="hub-form">
          <div className="hub-button-row">
            <button type="button" onClick={createLocalistWindow} disabled={localistBusy}>
              <Plus size={13} /> Generate link
            </button>
            <button type="button" onClick={sendLocalistSms} disabled={localistBusy || !localistWindow?.url}>
              <Send size={13} /> Send SMS
            </button>
            <button type="button" onClick={checkLocalistSmsStatus} disabled={localistBusy}>
              <RefreshCw size={13} /> Check SMS
            </button>
          </div>
          {localistWindow?.url && (
            <>
              <Field label="Link">
                <input readOnly value={localistWindow.url} onFocus={(e) => e.target.select()} />
              </Field>
              <Field label="Message">
                <textarea
                  rows={4}
                  value={localistMessage}
                  onChange={(e) => setLocalistMessage(e.target.value)}
                />
              </Field>
              <div className="hub-button-row">
                <button type="button" onClick={copyLocalistLink}>
                  <Copy size={13} /> Copy link
                </button>
                {localistWindow.smsSentAt && <span className="hub-pill">Sent</span>}
              </div>
            </>
          )}
          {localistStatus && <p className="hub-empty">{localistStatus}</p>}
        </div>
      </Panel>
      <Panel
        title="Localist Activity"
        icon={ClipboardList}
        action={(
          <button type="button" onClick={loadLocalistAnalytics}>
            <RefreshCw size={13} />
          </button>
        )}
      >
        {localistAnalyticsStatus && <p className="hub-empty">{localistAnalyticsStatus}</p>}
        {localistAnalytics && localistAnalytics.length === 0 && !localistAnalyticsStatus && (
          <p className="hub-empty">No Localist activity has been recorded yet.</p>
        )}
        <div className="hub-localist-analytics">
          {(localistAnalytics || []).map((windowEntry) => {
            const metrics = windowEntry.metrics || {};
            return (
              <article className="hub-localist-window-card" key={windowEntry.id}>
                <div className="hub-localist-window-head">
                  <div>
                    <strong>{windowEntry.valid ? 'Active window' : 'Closed window'}</strong>
                    <span>Expires {shortDateTime(windowEntry.expiresAt)}</span>
                  </div>
                  {windowEntry.smsCampaignId && <span className="hub-pill">Brevo {windowEntry.smsCampaignId}</span>}
                </div>
                <div className="hub-metric-grid">
                  <div className="hub-metric"><span>Visitors</span><strong>{metrics.uniqueVisitors || 0}</strong></div>
                  <div className="hub-metric"><span>Shared visitors</span><strong>{metrics.sharedVisitors || 0}</strong></div>
                  <div className="hub-metric"><span>Shares</span><strong>{metrics.shareEvents || 0}</strong></div>
                  <div className="hub-metric"><span>Share rate</span><strong>{percent(metrics.shareRate)}</strong></div>
                  <div className="hub-metric"><span>Carts</span><strong>{metrics.cartsStarted || 0}</strong></div>
                  <div className="hub-metric"><span>Abandoned</span><strong>{metrics.abandonedCarts || 0}</strong></div>
                  <div className="hub-metric"><span>Checkout starts</span><strong>{metrics.checkoutStarts || 0}</strong></div>
                  <div className="hub-metric"><span>Paid</span><strong>{metrics.checkoutSuccesses || 0}</strong></div>
                </div>
                <small>
                  Last activity {shortDateTime(metrics.lastActivityAt)}
                  {windowEntry.smsSentAt ? ` / SMS sent ${shortDateTime(windowEntry.smsSentAt)}` : ''}
                </small>
              </article>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Localist Orders"
        icon={CreditCard}
        action={(
          <button type="button" onClick={loadLocalistOrders}>
            <RefreshCw size={13} />
          </button>
        )}
      >
        {localistOrdersStatus && <p className="hub-empty">{localistOrdersStatus}</p>}
        {localistOrders && (
          <div className="hub-localist-analytics">
            <div className="hub-metric-grid">
              <div className="hub-metric"><span>Paid</span><strong>{localistOrders.summary?.paidCount || 0}</strong></div>
              <div className="hub-metric"><span>Paid total</span><strong>{formatCurrency(localistOrders.summary?.paidTotalCents || 0)}</strong></div>
              <div className="hub-metric"><span>Pending</span><strong>{localistOrders.summary?.pendingCount || 0}</strong></div>
              <div className="hub-metric"><span>All orders</span><strong>{localistOrders.summary?.orderCount || 0}</strong></div>
            </div>
            {(localistOrders.orders || []).length === 0 && !localistOrdersStatus && (
              <p className="hub-empty">No Localist orders have been recorded yet.</p>
            )}
            {(localistOrders.orders || []).map((orderEntry) => (
              <article className="hub-localist-window-card" key={orderEntry.id}>
                <div className="hub-localist-window-head">
                  <div>
                    <strong>{orderEntry.customerName}</strong>
                    <span>
                      {orderEntry.status} / {formatCurrency(orderEntry.totalCents)}
                      {orderEntry.paidAt ? ` / paid ${shortDateTime(orderEntry.paidAt)}` : ` / started ${shortDateTime(orderEntry.checkoutStartedAt)}`}
                    </span>
                  </div>
                  <span className="hub-pill">{orderEntry.pickupWindow}</span>
                </div>
                <div className="hub-localist-order-detail">
                  {orderEntry.customerEmail && <span>Email: {orderEntry.customerEmail}</span>}
                  {orderEntry.customerPhone && <span>Phone: {orderEntry.customerPhone}</span>}
                  {orderEntry.customerNote && <span>Notes/allergies: {orderEntry.customerNote}</span>}
                  {orderEntry.squareOrderId && <span>Square order: {orderEntry.squareOrderId}</span>}
                  {orderEntry.squareReceiptUrl && <span>Square receipt: {orderEntry.squareReceiptUrl}</span>}
                  {orderEntry.brainInboxItemId && <span>Brain inbox: {orderEntry.brainInboxItemId}</span>}
                </div>
                <div className="hub-localist-order-items">
                  {(orderEntry.items || []).map((item) => (
                    <span key={`${orderEntry.id}-${item.id}`}>
                      {item.quantity}x {item.name}
                      {item.customerOptions?.length ? ` (${item.customerOptions.join(', ')})` : ''}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

