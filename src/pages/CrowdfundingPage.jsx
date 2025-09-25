// ...existing code...
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import SectionHeader from '../components/ui/SectionHeader';
import sanityClient from '../sanityClient.js';
import { useSquareCard } from '../hooks/useSquareCard';

// --- Sanity Image URL Builder Setup (kept for future use if dynamic hero image restored) ---
// const builder = imageUrlBuilder(sanityClient);
// function urlFor(source) { return builder.image(source); }

// --- Helper & Child Components (No changes needed here) ---
const StatBox = ({ value, label }) => (
  <div>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-gray-600">{label}</p>
  </div>
);

StatBox.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
};

const RewardTierCard = ({ tier, onContribute, busy }) => {
  // 💡 IMPROVEMENT: Handle cases where a referenced reward tier might have been deleted.
  if (!tier) {
    return null;
  }

  // Display pizza count when available, otherwise fall back to legacy dollar amount
  const pieCountLabel = tier.pieCount ? `${tier.pieCount.toLocaleString()} pies` : null;
  const pizzaCountLabel = tier.pizzaCount ? `${tier.pizzaCount.toLocaleString()} pizzas` : null;
  const moneyLabel = tier.amount ? `$${tier.amount.toLocaleString()}` : null;

  return (
    <div className="card p-6 border hover:border-[var(--color-accent)] transition-colors">
      <p className="text-2xl font-bold">
        {pieCountLabel
          ? `${pieCountLabel} — ${tier.title}`
          : pizzaCountLabel
          ? `${pizzaCountLabel} — ${tier.title}`
          : `Pledge ${moneyLabel || '$0'} or more`}
      </p>
      {!pizzaCountLabel && (
        <h4 className="text-xl font-bold text-[var(--color-accent)] mt-1">{tier.title}</h4>
      )}
      <p className="text-body text-gray-600 my-3">{tier.description}</p>
      {tier.limit && (
        <p className="text-sm font-semibold text-gray-500 mb-3">LIMITED ({tier.limit} left)</p>
      )}
      <button
        className="btn btn-secondary w-full disabled:opacity-60" disabled={busy || !(typeof tier.amount === 'number' && tier.amount > 0)}
        onClick={() => {
          if (typeof tier.amount === 'number' && tier.amount > 0) onContribute({ name: tier.title || 'Pledge', price: tier.amount });
        }}
      >
        {typeof tier.amount === 'number' ? 'Select this reward' : 'Unavailable online'}
      </button>
    </div>
  );
};
RewardTierCard.propTypes = {
  tier: PropTypes.shape({
  pizzaCount: PropTypes.number,
  pieCount: PropTypes.number,
    amount: PropTypes.number,
    title: PropTypes.string,
    description: PropTypes.string,
    limit: PropTypes.number,
  }),
};
// ...existing code...

// --- Main Page Component ---
const CrowdfundingPage = () => {
  const [campaignData, setCampaignData] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [funderName, setFunderName] = useState('');
  const [pizzaQty, setPizzaQty] = useState(1);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [referralState, setReferralState] = useState({ status: 'idle', valid: false, participant: null, code: '' });

  useEffect(() => {
    // 💡 IMPROVEMENT: Fetch a specific campaign by its slug for a more robust component.
    // For this example, we'll hardcode a slug. In a real app, you'd get this from the URL.
    const slug = 'local-pizza-by-local-effort-let-s-make-1000-pizzas'; // Replace with a real slug from your Sanity data
  const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
      title,
      // Short description: prefer new field name, fallback to legacy if present
      "description": coalesce(description, shortDescription),
      // pizza-specific fields (keep legacy fields for backwards compatibility)
      pizzaGoal,
      pizzasSold,
      piesSold,
      goal,
      raisedAmount,
      backers,
      endDate,
      heroImage,
      story,
      goals,
      faq,
  "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
      "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
    }`;

    const params = { slug };

    const doFetch = async () => {
      try {
        const data = await sanityClient.fetch(query, params);
        setCampaignData(data);
      } catch (err) {
        // Provide richer logging so we can see the real failure in browser consoles
        try {
          const msg = err && err.message ? err.message : String(err);
          console.error('Sanity fetch error message:', msg);
          if (err && err.response && typeof err.response.text === 'function') {
            const body = await err.response.text();
            console.error('Sanity fetch response body:', body);
          }
        } catch (logErr) {
          console.error('Error while logging Sanity error:', logErr);
        }

        // Attempt a safe fallback: fetch the first crowdfundingCampaign available
        try {
          const fallback = `*[_type == "crowdfundingCampaign"][0]{
            title,
            "description": coalesce(description, shortDescription),
            pizzaGoal,
            pizzasSold,
            piesSold,
            goal,
            raisedAmount,
            backers,
            endDate,
            heroImage,
            story,
            goals,
            faq,
            "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
            "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
          }`;
          const fbData = await sanityClient.fetch(fallback);
          if (fbData) {
            console.warn('Loaded fallback campaign (first in dataset)');
            setCampaignData(fbData);
            // previously cleared error state (removed unused state)
            return;
          }
        } catch (fbErr) {
          console.error('Fallback fetch also failed:', fbErr && (fbErr.message || fbErr));
        }

  console.warn('Failed to load campaign data.');
      } finally {
  // loading state removed; no-op
      }
    };

    doFetch();
  }, []);

  // Derive reward tiers safely for hooks below
  const rewardTiers = (campaignData?.rewardTiers) || [];
  const visibleTiers = useMemo(() => {
    const hasValid = referralState.valid && referralState.code;
    return rewardTiers.filter((t) => {
      if (!t?.referralOnly) return true;
      if (!hasValid) return false;
      if (t.referralCode && typeof t.referralCode === 'string') {
        return t.referralCode.trim().toLowerCase() === referralState.code.trim().toLowerCase();
      }
      return true;
    });
  }, [rewardTiers, referralState]);
  const firstPayTier = useMemo(
    () => visibleTiers.find(t => typeof t?.amount === 'number' && t.amount > 0) || null,
    [visibleTiers]
  );

  // Destructure frequently used fields from campaign data (safe even if null)
  // Destructure raw values (null-safe post processing below)
  const {
    title: campaignTitle,
    description,
    faq: faqRaw,
    story: storyRaw,
    backers: backersRaw,
    endDate,
    piesSold: piesSoldRaw,
  } = campaignData || {};
  // Normalize numbers (treat null as 0)
  const backers = typeof backersRaw === 'number' ? backersRaw : 0;
  const piesSold = typeof piesSoldRaw === 'number' ? piesSoldRaw : 0;
  // Normalize block arrays
  const faq = Array.isArray(faqRaw) ? faqRaw : [];
  const story = Array.isArray(storyRaw) ? storyRaw : [];
  const title = campaignTitle || 'Crowdfunding';

  // Initialize shared Square card (enabled only when a payable tier exists)
  const { cardLoaded, error: squareConfigError, tokenize, envInfo } = useSquareCard('#cf-card-container', !!firstPayTier, [firstPayTier?.amount]);

  // On return from Square (?payment=success), confirm and update counters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      (async () => {
        try {
          const raw = localStorage.getItem('cf_items');
          const items = raw ? JSON.parse(raw) : [];
          const name = localStorage.getItem('cf_name') || undefined;
          if (Array.isArray(items) && items.length > 0) {
            const res = await fetch('/api/crowdfund/confirm-payment', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items, funderName: name })
            });
            if (res.ok) {
              setConfirmMsg('Thanks! Your contribution has been recorded.');
            }
          }
        } catch (_) {
          // ignore
        } finally {
          try { localStorage.removeItem('cf_items'); localStorage.removeItem('cf_name'); } catch (e) { /* ignore */ }
        }
      })();
    }
  }, []);

  const contribute = async (items) => {
    setPayError('');
    setPaying(true);
    try {
      let token;
      try {
        token = await tokenize();
      } catch (tokErr) {
        throw new Error(tokErr?.message || 'Card not ready');
      }
      const payload = {
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity || 1,
          type: i.type,
          pizzaCount: i.pizzaCount,
        })),
        funderName,
        token,
        pizzaQty,
      };
      const res = await fetch('/api/crowdfund/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data.error || 'Checkout failed';
        // Attempt to surface Square API JSON array string
        if (typeof msg === 'string' && msg.startsWith('[')) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.code) {
              msg = `Square error: ${parsed[0].code}${parsed[0].detail ? ' - ' + parsed[0].detail : ''}`;
            }
          } catch (_) { /* ignore parse */ }
        }
        throw new Error(msg);
      }
      setConfirmMsg('Thanks! Your contribution has been processed.');
    } catch (e) {
      setPayError(e?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const updates = Array.isArray(campaignData?.updates) ? campaignData.updates : [];

  // --- Pizza-specific values (prefer pizza fields, fallback to legacy money values) ---
  const pizzasSold = (campaignData?.pizzasSold ?? campaignData?.raisedAmount ?? 0) || 0;
  const pizzaGoal = (campaignData?.pizzaGoal ?? campaignData?.goal ?? 1000) || 1000; // default goal to 1000 pizzas
  const daysLeft = endDate
    ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;
  const progressPercentage = pizzaGoal > 0 ? Math.min((pizzasSold / pizzaGoal) * 100, 100) : 0;

  const TabButton = ({ tabName, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tabName)}
      aria-pressed={activeTab === tabName}
      className="tab"
    >
      {label}
    </button>
  );

  TabButton.propTypes = {
    tabName: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  };

  // Helper to extract a plain-text excerpt from Portable Text arrays for meta description
  const plainTextFromPortable = (blocks) => {
    if (!blocks) return '';
    if (typeof blocks === 'string') return blocks;
    return (blocks || [])
      .filter(Boolean)
      .map((blk) => {
        if (typeof blk === 'string') return blk;
        if (blk.children && Array.isArray(blk.children)) {
          return blk.children.map((c) => c.text || '').join('');
        }
        return '';
      })
      .join('\n')
      .trim();
  };

  // Ensure PortableText always receives an array of blocks
  const toPortableBlocks = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    const text = typeof val === 'string' ? val : String(val);
    return [
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text }],
      },
    ];
  };

  // --- Utility: extract plain text from a single portable block (for optional tagline upgrade) ---
  const blockText = (blk) => {
    if (!blk) return '';
    if (typeof blk === 'string') return blk;
    if (Array.isArray(blk.children)) return blk.children.map(c => c.text || '').join('');
    return '';
  };

  // Optional: promote first paragraph to h2 if it matches tagline phrase
  let taglineBlock = null;
  let remainingDescriptionBlocks = description;
  if (Array.isArray(description) && description.length) {
    const first = description[0];
    const text = blockText(first).trim().toLowerCase();
    if (text.startsWith('local effort is making local pizza')) {
      taglineBlock = first;
      remainingDescriptionBlocks = description.slice(1);
    }
  }

  return (
    <>
      <Helmet>
    <title>{`${title} | Crowdfunding Campaign`}</title>
  <meta name="description" content={plainTextFromPortable(description).slice(0,160)} />
      </Helmet>

  <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* --- Page Header --- */}
        <div>
                <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] leading-[1.02]">{title}</h1>
                {/* Short description rendered with Portable Text (supports paragraphs and formatting) */}
                <div className="mt-6 md:mt-8 text-body max-w-2xl">
                  {taglineBlock && (
                    <h2 className="text-2xl md:text-3xl font-semibold leading-snug tracking-tight">
                      {blockText(taglineBlock)}
                    </h2>
                  )}
                  {description && (Array.isArray(description) ? (
                    <PortableText value={remainingDescriptionBlocks} />
                  ) : (
                    <PortableText value={toPortableBlocks(description)} />
                  ))}
                </div>
              </div>

        {/* --- Main Content Grid --- */}
  <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">
          {/* --- Left Column (Media & Content Tabs) --- */}
          <div className="lg:col-span-3 space-y-8">
            {/* Override hero image per request */}
            <img
              src={"/gallery/5Z0A5718-Edit.jpg"}
              alt={title}
              className="w-full object-cover rounded-lg aspect-video bg-gray-100"
              loading="lazy"
            />

            <div className="border-b border-neutral-200">
              <nav className="tablist">
                <TabButton tabName="story" label="Our Story" />
                {updates.length > 0 && (
                  <TabButton tabName="updates" label={`Updates (${updates.length})`} />
                )}
                <TabButton tabName="goals" label="Goals" />
                {faq.length > 0 && <TabButton tabName="faq" label="FAQ" />}
              </nav>
            </div>
            <div className="prose max-w-none text-body">
              {activeTab === 'story' && story.length > 0 && <PortableText value={story} />}
              {activeTab === 'updates' && (
                <div className="space-y-8">
                  {updates.map((update, index) => (
                    <div key={index} className="p-4 border-l-4 border-gray-200">
                      <div className="mt-0">
                        <SectionHeader overline="Update" title={update.title} />
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(update.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <PortableText value={update.body} />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="space-y-6">
                  {campaignData?.goals
                    ? (
                        Array.isArray(campaignData.goals)
                          ? <PortableText value={campaignData.goals} />
                          : <PortableText value={toPortableBlocks(campaignData.goals)} />
                      )
                    : (
                      <p className="text-gray-500">No goals content yet. Add content in the Goals field in Sanity Studio.</p>
                    )}
                </div>
              )}
              {activeTab === 'faq' && (
                <div className="space-y-6">
                  {faq.map((item, index) => (
                    <div key={index}>
                      <h4 className="font-bold text-lg mb-1">{item.question}</h4>
                      <p className="mt-0">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- Right Column (Stats & Rewards) --- */}
          <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0">
            <div className="card p-6 space-y-4 ring-1 ring-neutral-200">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[var(--color-accent)] h-2.5 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div>
                <p className="text-4xl font-bold text-[var(--color-accent)]">
                  {pizzasSold.toLocaleString()} pizzas
                </p>
                <p className="text-body text-gray-600">
                  sold of {pizzaGoal.toLocaleString()} pizzas goal
                </p>
                {/* Pies sold (no goal) */}
                <p className="mt-2 text-2xl font-semibold">{piesSold.toLocaleString()} pies</p>
                <p className="text-body text-gray-600">sold</p>
              </div>
              <div className="flex justify-between text-body text-center border-y py-3">
                <StatBox value={backers.toLocaleString()} label="backers" />
                <StatBox
                  value={daysLeft > 0 ? daysLeft : 'Ended'}
                  label={daysLeft > 0 ? 'days to go' : ''}
                />
              </div>
              {confirmMsg && <p className="text-sm text-emerald-700">{confirmMsg}</p>}
              {payError && <p className="text-sm text-red-600">{payError}</p>}
              <div className="flex flex-col gap-2">
                {/* Name input without label */}
                <input id="cf-name" className="input w-full" placeholder="Name" value={funderName} onChange={(e) => setFunderName(e.target.value)} />
              </div>
              {/* Referral code apply */}
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Have a referral code?"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!referralInput || referralState.status === 'checking'}
                  onClick={async () => {
                    const code = (referralInput || '').trim();
                    if (!code) return;
                    setReferralState({ status: 'checking', valid: false, participant: null, code });
                    try {
                      const resp = await fetch('/api/referrals/validate', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ code }),
                      });
                      const data = await resp.json().catch(() => ({}));
                      if (resp.ok && data && data.valid) {
                        setReferralState({ status: 'ok', valid: true, participant: data.participant || null, code });
                      } else {
                        setReferralState({ status: 'ok', valid: false, participant: null, code });
                      }
                    } catch (_) {
                      setReferralState({ status: 'error', valid: false, participant: null, code });
                    }
                  }}
                >
                  {referralState.status === 'checking' ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {referralState.status === 'ok' && referralState.valid && (
                <p className="text-sm text-emerald-700">Code applied{referralState.participant?.name ? ` for ${referralState.participant.name}` : ''}.</p>
              )}
              {referralState.status === 'ok' && !referralState.valid && (
                <p className="text-sm text-red-600">That code is not valid.</p>
              )}
              {firstPayTier && (
                <div className="flex items-center gap-3">
                  <label htmlFor="pizza-qty" className="text-sm">Quantity</label>
                  <input
                    id="pizza-qty"
                    type="number"
                    min={1}
                    max={50}
                    value={pizzaQty}
                    onChange={(e) => setPizzaQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="input w-24"
                  />
                </div>
              )}
              <div className="space-y-3">
                <div id="cf-card-container" className="border rounded-md p-4 bg-white min-h-[88px]" aria-label="Card payment form">
                  {!cardLoaded && !squareConfigError && (
                    <p className="text-sm text-gray-500">Loading secure payment form…</p>
                  )}
                  {squareConfigError && (
                    <p className="text-sm text-red-600">{squareConfigError}</p>
                  )}
                </div>
                <button
                  disabled={!firstPayTier || !cardLoaded || paying || !!squareConfigError}
                  onClick={() => firstPayTier && contribute([{ name: firstPayTier.title || 'Pizza', price: Math.round(firstPayTier.amount * 100), type: 'pizza', pizzaCount: pizzaQty, quantity: pizzaQty }])}
                  className="btn btn-primary w-full text-lg py-3 disabled:opacity-60"
                >
                  {paying ? 'Processing…' : cardLoaded ? 'i want pizza' : 'Loading payment form…'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader overline="Contribute" title="Support Us" />
              {visibleTiers.map((tier) => (
                <RewardTierCard
                  key={tier?.title || Math.random()}
                  tier={tier}
                  busy={paying}
                  onContribute={(item) => contribute([{ name: item.name || item.title || 'Pledge', price: Math.round((item.price || item.amount) * 100), type: 'pledge', quantity: 1 }])}
                />
              ))}
              {/* Dev diagnostics */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="mt-8 p-4 border rounded text-xs space-y-1 bg-gray-50">
                  <p className="font-semibold">Payment Diagnostics</p>
                  <p>SDK URL: {envInfo?.sdkUrl}</p>
                  <p>App ID present: {envInfo?.appId ? 'yes' : 'no'}</p>
                  <p>Location ID present: {envInfo?.locationId ? 'yes' : 'no'}</p>
                  <p>Sandbox mode: {envInfo?.sandbox ? 'true' : 'false'}</p>
                  <p>Loaded: {cardLoaded ? 'true' : 'false'} | Attempts: {envInfo?.attempts ?? 'n/a'}</p>
                  {squareConfigError && <p className="text-red-600">Error: {squareConfigError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CrowdfundingPage;
