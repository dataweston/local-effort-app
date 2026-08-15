// src/components/hub/HubMembershipView.jsx
//
// A Localist member's own membership page. Four things, in the order a member
// cares about them: what they get, what they've spent (and the credit it
// earned), what we've written to members, and the way into the 308B member
// capital offerings.
//
// Data: GET /api/hub/membership (api-handlers/hub/membership.js) — self-scoped.
import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Coins,
  ExternalLink,
  Megaphone,
  Receipt,
  RefreshCw,
  Sprout,
} from 'lucide-react';
import { api, formatCurrency, formatDate, MarkdownPreview, Panel } from './hubShared';

// Membership perks. Copy lives here rather than in the API because it is
// marketing language, not data — keep it in step with /localist.
const PERKS = [
  {
    icon: Sprout,
    title: 'First look at pickup menus',
    body: 'Members see and order from the weekly pickup menu before anyone else.',
  },
  {
    icon: BadgeCheck,
    title: 'The door to weekly meal prep',
    body: 'Meal prep customers are members first. Membership is what makes the weekly plan possible.',
  },
  {
    icon: CalendarClock,
    title: 'Perks and first tastes',
    body: 'Extras in the bag, first tastes of new dishes, and occasional member-only surprises.',
  },
];
const PAID_CREDIT_PERK = {
  icon: Coins,
  title: '4% back as credit, quarterly',
  body: 'Monthly and annual members accrue 4% of tracked spending as quarterly credit.',
};
const WAIVED_PERK = {
  icon: Coins,
  title: 'Waived-member low-cost menu',
  body: 'The low-cost menu is an additional benefit reserved for cost-waived Localists.',
};

export function MembershipView({ accessToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await api('/api/hub/membership', accessToken);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Unable to load your membership');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="hub-empty-state">
        <RefreshCw className="animate-spin" size={22} aria-hidden="true" />
        <p className="hub-empty-hint">Loading your membership…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hub-empty-state">
        <p className="hub-empty-hint">{error}</p>
        <button type="button" onClick={load}>Try again</button>
      </div>
    );
  }

  const membership = data?.membership || {};
  const dues = data?.dues || {};
  const billing = data?.billing || {};
  const purchases = data?.purchases || {};
  const credit = data?.credit || {};
  const messages = data?.messages || [];
  const tier = membership.tier || {};
  const perks = tier.key === 'waived' ? [...PERKS, WAIVED_PERK] : [...PERKS, PAID_CREDIT_PERK];

  return (
    <div className="hub-membership">
      {/* ── Who you are in the co-op ── */}
      <section className="hub-membership__banner">
        <div>
          <p className="hub-membership__eyebrow">Localist membership</p>
          <h2>{membership.displayName || membership.email}</h2>
          <p className="hub-membership__meta">
            {tier.label || 'Localist'}
            {tier.price ? ` · ${tier.price}` : ''}
            {membership.memberSince ? ` · member since ${formatDate(membership.memberSince)}` : ''}
          </p>
        </div>
        <span className={`hub-pill ${membership.status === 'active' ? 'is-good' : ''}`}>
          {membership.status || 'unknown'}
        </span>
      </section>

      <div className="hub-membership__grid">
        {/* ── Dues and Square subscription state ── */}
        <Panel title="Membership dues" icon={CreditCard}>
          <div className="hub-membership__stats">
            <div>
              <span className="hub-membership__stat-value">
                {dues.amountCents == null ? 'Not recorded' : formatCurrency(dues.amountCents)}
              </span>
              <span className="hub-membership__stat-label">
                {dues.waived ? 'dues waived' : `${dues.cadence || 'unknown'} dues`}
              </span>
            </div>
            <div>
              <span className="hub-membership__stat-value">{dues.status || 'unknown'}</span>
              <span className="hub-membership__stat-label">roster status</span>
            </div>
          </div>
          <p className="hub-membership__hint">
            {dues.waived
              ? 'No Square subscription is required for your cost-waived membership.'
              : billing.subscription
                ? `Square subscription recorded · ${billing.subscription.status || 'status unavailable'}`
                : 'A Square subscription identifier is not yet available in Hub.'}
          </p>
          <p className="hub-membership__hint">
            {billing.history?.available
              ? 'Your membership billing history is available below.'
              : 'Membership billing history is not available in Hub yet. Food purchases are tracked separately.'}
          </p>
        </Panel>

        {/* ── Tracked food purchases and accrued-credit estimate ── */}
        <Panel title="Tracked pickup purchases" icon={Receipt}>
          <div className="hub-membership__stats">
            <div>
              <span className="hub-membership__stat-value">{formatCurrency(purchases.totalCents || 0)}</span>
              <span className="hub-membership__stat-label">tracked food purchases</span>
            </div>
            <div>
              <span className="hub-membership__stat-value">{purchases.orderCount || 0}</span>
              <span className="hub-membership__stat-label">paid pickup orders</span>
            </div>
            <div>
              <span className="hub-membership__stat-value">{formatCurrency(purchases.quarterToDateCents || 0)}</span>
              <span className="hub-membership__stat-label">tracked this quarter</span>
            </div>
          </div>

          <div className="hub-membership__credit">
            {credit.eligible ? (
              <>
                <strong>{formatCurrency(credit.quarterToDateAccruedEstimateCents || 0)}</strong>{' '}
                estimated 4% credit accrued this quarter ·{' '}
                {formatCurrency(credit.lifetimeAccruedEstimateCents || 0)} estimated from all tracked
                paid food purchases.
                <span className="hub-membership__credit-note">{credit.note}</span>
              </>
            ) : (
              <>
                The 4% quarterly credit is reserved for monthly and annual memberships.
                Cost-waived Localists instead receive the waived-member low-cost menu,
                alongside the same menus, pickups, and other perks.
              </>
            )}
          </div>

          {(purchases.recent || []).length > 0 ? (
            <ul className="hub-membership__orders">
              {purchases.recent.map((order) => (
                <li key={order.id}>
                  <span className="hub-membership__order-date">{formatDate(order.paidAt)}</span>
                  <span className="hub-membership__order-meta">
                    {order.totalQuantity ? `${order.totalQuantity} items` : 'pickup order'}
                    {order.pickupWindow ? ` · ${order.pickupWindow}` : ''}
                  </span>
                  <span className="hub-membership__order-total">{formatCurrency(order.totalCents)}</span>
                  {order.receiptUrl && (
                    <a href={order.receiptUrl} target="_blank" rel="noreferrer" aria-label="Square receipt">
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hub-membership__hint">
              No tracked paid pickup orders yet. Membership dues do not appear in this list.
            </p>
          )}
        </Panel>

        {/* ── Perks ── */}
        <Panel title="Your perks" icon={BadgeCheck}>
          <ul className="hub-membership__perks">
            {perks.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon size={16} aria-hidden="true" />
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── Messages from us ── */}
        <Panel title="Messages from us" icon={Megaphone}>
          {messages.length === 0 ? (
            <p className="hub-membership__hint">
              Nothing new. Notes to members show up here — menu changes, co-op news,
              and anything that affects your pickups.
            </p>
          ) : (
            <ul className="hub-membership__messages">
              {messages.map((message) => (
                <li key={message.id}>
                  <div className="hub-membership__message-head">
                    <strong>{message.title}</strong>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                  {message.summary && <p className="hub-membership__message-summary">{message.summary}</p>}
                  <MarkdownPreview body={message.body} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── 308B ── */}
        <Panel title="Invest in the cooperative" icon={Coins}>
          <p className="hub-membership__308b-copy">
            Local Effort is a Minnesota Chapter 308B cooperative association, and every
            staff member is offered equity ownership. Members can put capital in
            directly — a kitchen equipment note, a local-farm purchasing fund, or a
            patronage-linked capital account.
          </p>
          <a className="hub-membership__308b-cta" href="/308b-member">
            See the 308B Member offerings
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <p className="hub-membership__hint">
            Members only. Nothing is charged from that page — it sends you the offering
            documents and a real conversation about the risks.
          </p>
        </Panel>
      </div>
    </div>
  );
}

export default MembershipView;
