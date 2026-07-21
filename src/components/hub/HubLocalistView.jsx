import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PortableText } from '@portabletext/react';
import {
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Minus,
  Plus,
  Send,
  ShieldCheck,
  ShoppingCart,
  Upload,
  X,
} from 'lucide-react';
import { createPortableTextComponents } from '../../utils/portableTextComponents';
import { api, age, formatCurrency, Panel, Field } from './hubShared';

export function HubRichText({ value, element = 'p' }) {
  if (!value) return null;
  if (!Array.isArray(value)) return React.createElement(element, null, value);
  const components = createPortableTextComponents({
    block: {
      normal: ({ children }) => React.createElement(element, null, children),
    },
  });
  return <PortableText value={value} components={components} />;
}


export const LOCALIST_CUSTOMER_OPTIONS = [
  { key: 'glutenFree', label: 'Gluten free' },
  { key: 'nutAllergy', label: 'Nut allergy' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'dairyFree', label: 'Dairy free' },
];


export const LOCALIST_PICKUP_WINDOWS = [
  'Tuesday, 2pm-4pm',
  'Tuesday, 4pm-6pm',
  'Wednesday, 2pm-4pm',
  'Wednesday, 4pm-6pm',
];


export const LOCALIST_ITEM_FLAG_LABELS = [
  ['glutenFree', 'Gluten free'],
  ['dairyFree', 'Dairy free'],
  ['containsPork', 'Contains pork'],
  ['containsNuts', 'Contains nuts'],
  ['containsDairy', 'Contains dairy'],
];


export function localistId(prefix) {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}


export function localistIdentity() {
  if (typeof window === 'undefined') return { visitorId: localistId('visitor'), sessionId: localistId('session') };
  const storage = window.localStorage;
  let visitorId = storage.getItem('le:localistVisitorId');
  let sessionId = storage.getItem('le:localistSessionId');
  if (!visitorId) {
    visitorId = localistId('visitor');
    storage.setItem('le:localistVisitorId', visitorId);
  }
  if (!sessionId) {
    sessionId = localistId('session');
    storage.setItem('le:localistSessionId', sessionId);
  }
  return { visitorId, sessionId };
}


export function localistTrackingContext() {
  if (typeof window === 'undefined') return { localistToken: '', entrySource: 'direct', path: '', referrer: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    localistToken: params.get('localist') || '',
    entrySource: params.get('shared') === '1' ? 'shared' : 'direct',
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || '',
  };
}


export function trackLocalistActivity(eventType, data = {}) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      eventType,
      occurredAt: new Date().toISOString(),
      ...localistIdentity(),
      ...localistTrackingContext(),
      ...data,
    };
    api('/api/hub/localist-activity', null, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_err) {
    // Analytics must not block the ordering flow.
  }
}


export function parseLocalistPriceCents(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const dollars = Number(match[1]);
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null;
}


export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}


export function formatPhone(value) {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}


export function LocalistView({
  area = 'localist',
  menuName = 'Localist',
  successName = 'Localist',
  showChat = true,
}) {
  const [items, setItems] = useState(null);
  const [content, setContent] = useState(null);
  const [order, setOrder] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupWindow, setPickupWindow] = useState('');
  const [note, setNote] = useState('');
  const [customerOptions, setCustomerOptions] = useState({});
  const [shareStatus, setShareStatus] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState(() => (
    new URLSearchParams(window.location.search).get('checkout') === `${area}-success` ? 'success' : 'idle'
  ));
  const [checkoutError, setCheckoutError] = useState('');
  const successTrackedRef = useRef(false);

  useEffect(() => {
    api(`/api/hub/localist-menu?area=${encodeURIComponent(area)}`)
      .then((data) => {
        setContent(data.content || null);
        setItems(data.items || []);
        if (area === 'localist') {
          trackLocalistActivity('localist.menu.loaded', {
            metadata: { itemCount: data.items?.length || 0 },
          });
        }
      })
      .catch(() => {
        setContent(null);
        setItems([]);
      });
  }, [area]);

  const pricedItems = useMemo(() => (items || []).map((item) => {
    const exactPrice = Number(item.priceCents);
    const priceCents = Number.isFinite(exactPrice) && exactPrice > 0
      ? Math.round(exactPrice)
      : parseLocalistPriceCents(item.price);
    return { ...item, priceCents };
  }), [items]);

  const selectedItems = useMemo(() => pricedItems
    .map((item) => ({
      ...item,
      quantity: Number(order[item._id]) || 0,
      customerOptions: customerOptions[item._id] || {},
    }))
    .filter((item) => item.quantity > 0), [pricedItems, order, customerOptions]);

  const totalCents = selectedItems.reduce((sum, item) => sum + (item.priceCents || 0) * item.quantity, 0);
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutBusy = checkoutStatus === 'loading';
  const requiresPickupWindow = area === 'localist';
  const canCheckout = totalQuantity > 0
    && totalCents > 0
    && name.trim()
    && email.trim()
    && (!requiresPickupWindow || pickupWindow)
    && !checkoutBusy;
  const cartPayload = useMemo(() => ({
    totalQuantity,
    totalCents,
    items: selectedItems.map((item) => ({
      id: item._id,
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents || 0,
      customerOptions: item.customerOptions,
    })),
  }), [selectedItems, totalCents, totalQuantity]);

  useEffect(() => {
    if (totalQuantity <= 0) return undefined;
    const timer = window.setTimeout(() => {
      if (area === 'localist') trackLocalistActivity('localist.cart.updated', { cart: cartPayload });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [area, cartPayload, totalQuantity]);

  useEffect(() => {
    if (checkoutStatus !== 'success' || successTrackedRef.current) return;
    successTrackedRef.current = true;
    if (area === 'localist') {
      trackLocalistActivity('localist.checkout.success', {
        metadata: { returnedFromSquare: true },
      });
    }
  }, [area, checkoutStatus]);

  const setQuantity = (id, quantity) => {
    const item = pricedItems.find((candidate) => candidate._id === id);
    const inventoryCount = Number(item?.inventoryCount);
    const maxQuantity = Number.isFinite(inventoryCount) && inventoryCount >= 0
      ? Math.min(20, Math.round(inventoryCount))
      : 20;
    const nextQuantity = Math.max(0, Math.min(Number(quantity) || 0, maxQuantity));
    setOrder((prev) => {
      const next = { ...prev };
      if (nextQuantity) next[id] = nextQuantity;
      else delete next[id];
      return next;
    });
  };

  const setCustomerOption = (itemId, key, checked) => {
    setCustomerOptions((prev) => {
      const itemOptions = { ...(prev[itemId] || {}) };
      if (checked) itemOptions[key] = true;
      else delete itemOptions[key];
      return { ...prev, [itemId]: itemOptions };
    });
  };

  const shareLocalistLink = async () => {
    const { localistToken } = localistTrackingContext();
    if (!localistToken) return;
    const url = new URL(window.location.href);
    url.searchParams.set('localist', localistToken);
    url.searchParams.set('shared', '1');
    url.searchParams.delete('checkout');
    const shareUrl = url.toString();
    let shareMethod = 'clipboard';
    try {
      if (navigator.share) {
        shareMethod = 'web_share';
        await navigator.share({ title: 'Local Effort Localist menu', url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        window.prompt('Copy Localist link', shareUrl);
      }
      trackLocalistActivity('localist.link.shared', { shareMethod });
      setShareStatus(shareMethod === 'web_share' ? 'Share opened.' : 'Shared link copied.');
    } catch (_err) {
      setShareStatus('');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canCheckout) return;
    setCheckoutStatus('loading');
    setCheckoutError('');

    try {
      const params = new URLSearchParams(window.location.search);
      const identity = localistIdentity();
      const tracking = localistTrackingContext();
      if (area === 'localist') trackLocalistActivity('localist.checkout.started', { cart: cartPayload });
      const data = await api('/api/hub/localist-checkout', null, {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone: formatPhone(phone),
          pickupWindow: requiresPickupWindow ? pickupWindow : '',
          note,
          localistToken: params.get('localist') || '',
          visitorId: identity.visitorId,
          sessionId: identity.sessionId,
          entrySource: tracking.entrySource,
          sourceArea: area,
          items: selectedItems.map((item) => ({
            id: item._id,
            quantity: item.quantity,
            customerOptions: item.customerOptions,
          })),
        }),
      });
      if (!data.url) throw new Error('Square did not return a checkout link.');
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err.message || 'Unable to start checkout.');
      setCheckoutStatus('idle');
    }
  };

  if (checkoutStatus === 'success') {
    return (
      <div className="hub-menu-paper">
        <Panel title="Payment received" icon={CheckCircle2}>
          <p className="hub-empty hub-menu-thanks">
            Thanks{name ? `, ${name}` : ''} — your {successName} order is in. See you at pickup.
          </p>
          <button
            className="hub-primary-button"
            style={{ marginTop: 16 }}
            type="button"
            onClick={() => {
              setCheckoutStatus('idle');
              setOrder({});
              setName('');
              setEmail('');
              setPhone('');
              setPickupWindow('');
              setNote('');
              setCustomerOptions({});
            }}
          >
            Place another order
          </button>
        </Panel>
        {showChat && <LocalistChat />}
      </div>
    );
  }

  return (
    <div className="hub-menu-paper">
    <Panel
      title={area === 'localist' ? 'Place an order' : `A menu for ${menuName}`}
      icon={ShoppingCart}
    >
      {content && (
        <section className="hub-localist-intro">
          {content.eyebrow && <HubRichText value={content.eyebrow} element="small" />}
          {content.headline && <HubRichText value={content.headline} element="h3" />}
          {content.body && <HubRichText value={content.body} element="p" />}
          {content.note && <HubRichText value={content.note} element="span" />}
        </section>
      )}
      {area === 'localist' && localistTrackingContext().localistToken && (
        <div className="hub-localist-share">
          <button type="button" onClick={shareLocalistLink}>
            <Send size={13} /> Share menu
          </button>
          {shareStatus && <span>{shareStatus}</span>}
        </div>
      )}
      {items === null && <p className="hub-empty">Loading {menuName} menu...</p>}
      {items !== null && items.length === 0 && <p className="hub-empty">No items available.</p>}
      {items !== null && items.length > 0 && (
        <form className="hub-form hub-localist-form" onSubmit={submit}>
          <div className="hub-localist-list">
            {pricedItems.map((item) => {
              const quantity = Number(order[item._id]) || 0;
              const inventoryCount = Number(item.inventoryCount);
              const tracksInventory = Number.isFinite(inventoryCount) && inventoryCount >= 0;
              const roundedInventoryCount = tracksInventory ? Math.round(inventoryCount) : null;
              const soldOut = roundedInventoryCount === 0;
              const maxQuantity = tracksInventory ? Math.min(20, roundedInventoryCount) : 20;
              const disabled = !item.priceCents || soldOut;
              const itemOptions = customerOptions[item._id] || {};
              const activeFlags = LOCALIST_ITEM_FLAG_LABELS
                .filter(([key]) => item.dietaryFlags?.[key])
                .map(([, label]) => label);
              return (
                <div key={item._id} className={`hub-row hub-localist-item${soldOut ? ' is-sold-out' : ''}`}>
                  <div className="hub-localist-item-copy">
                    <strong>
                      {item.name}
                      <span className="hub-localist-price">
                        {item.price || (item.priceCents ? formatCurrency(item.priceCents) : 'No checkout price')}
                      </span>
                    </strong>
                    {tracksInventory && (
                      <span className={`hub-localist-inventory${soldOut ? ' is-sold-out' : ''}${!soldOut && roundedInventoryCount <= 3 ? ' is-low' : ''}`}>
                        {soldOut
                          ? 'Sold out'
                          : roundedInventoryCount === 1
                            ? 'Only 1 left'
                            : `${roundedInventoryCount} remaining`}
                      </span>
                    )}
                    {item.description && <span>{item.description}</span>}
                    {activeFlags.length > 0 && (
                      <div className="hub-localist-flags">
                        {activeFlags.map((flag) => <span key={flag}>{flag}</span>)}
                      </div>
                    )}
                    <div className="hub-localist-options" aria-label={`${item.name} dietary options`}>
                      {LOCALIST_CUSTOMER_OPTIONS.map((option) => (
                        <label key={option.key} className="hub-localist-option">
                          <input
                            type="checkbox"
                            checked={itemOptions[option.key] === true}
                            onChange={(e) => setCustomerOption(item._id, option.key, e.target.checked)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="hub-localist-quantity" aria-label={`${item.name} quantity`}>
                    <button
                      type="button"
                      onClick={() => setQuantity(item._id, quantity - 1)}
                      disabled={quantity === 0}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      value={quantity}
                      inputMode="numeric"
                      aria-label={`${item.name} quantity`}
                      onChange={(event) => setQuantity(item._id, Number(event.target.value))}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(item._id, quantity + 1)}
                      disabled={disabled || quantity >= maxQuantity}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
          <Field label="Email for confirmation">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </Field>
          <Field label="Phone (optional)">
            <input value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" />
          </Field>
          {requiresPickupWindow && (
            <Field label="Pickup window">
              <select value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} required>
                <option value="">Select pickup window</option>
                {LOCALIST_PICKUP_WINDOWS.map((windowLabel) => (
                  <option key={windowLabel} value={windowLabel}>{windowLabel}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Notes (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, delivery instructions..." />
          </Field>
          <div className="hub-localist-checkout">
            <div>
              <span>Total</span>
              <strong>{formatCurrency(totalCents)}</strong>
              <small>{totalQuantity ? `${totalQuantity} item${totalQuantity === 1 ? '' : 's'}` : 'Choose items above'}</small>
            </div>
            <button className="hub-primary-button" type="submit" disabled={!canCheckout}>
              <CreditCard size={13} /> {checkoutBusy ? 'Opening Square...' : 'Checkout with Square'}
            </button>
          </div>
          {checkoutError && <p className="hub-error">{checkoutError}</p>}
        </form>
      )}
    </Panel>
    {showChat && <LocalistChat />}
    </div>
  );
}


export const CHAT_UPLOAD_MIME_TYPES = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'];

export const CHAT_UPLOAD_MAX_BYTES = 1 * 1024 * 1024;

export const URL_PATTERN = /(https?:\/\/[^\s<]+)/gi;


export function isEmbeddableGifPage(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const href = parsed.href.toLowerCase();
    const directImage = /\.(gif|png|jpe?g|webp)(\?|#|$)/.test(href) || href.startsWith('data:image/');
    return !directImage && (host.includes('giphy.com') || host.includes('tenor.com'));
  } catch (_err) {
    return false;
  }
}


export function MessageText({ text }) {
  if (!text) return null;
  const parts = String(text).split(URL_PATTERN);
  return (
    <p>
      {parts.map((part, index) => (
        /^https?:\/\//i.test(part) ? (
          <a href={part} target="_blank" rel="noreferrer" key={`${part}-${index}`}>
            {part}
          </a>
        ) : part
      ))}
    </p>
  );
}


export function LocalistChat() {
  const [messages, setMessages] = useState([]);
  const [senderName, setSenderName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('le:localistChatName') || '';
  });
  const [draftName, setDraftName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('le:localistChatName') || '';
  });
  const [joined, setJoined] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem('le:localistChatName');
  });
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUpload, setImageUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const uploadInputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const data = await api('/api/hub/localist-chat');
    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    loadMessages().catch(() => {});
    const timer = window.setInterval(() => loadMessages().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  const joinChat = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    setSenderName(name);
    setJoined(true);
    setError('');
    if (typeof window !== 'undefined') window.localStorage.setItem('le:localistChatName', name);
  };

  const leaveChatName = () => {
    setJoined(false);
    setDraftName(senderName);
  };

  const attachUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!CHAT_UPLOAD_MIME_TYPES.includes(file.type)) {
      setError('Upload a GIF, PNG, JPG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > CHAT_UPLOAD_MAX_BYTES) {
      setError('Upload must be 1 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUpload({
        dataUrl: String(reader.result || ''),
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.onerror = () => setError('Unable to read that upload.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clearUpload = () => {
    setImageUpload(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = senderName.trim();
    const text = body.trim();
    const media = imageUrl.trim();
    if (!joined || !name || (!text && !media && !imageUpload)) return;

    setBusy(true);
    setError('');
    try {
      await api('/api/hub/localist-chat', null, {
        method: 'POST',
        body: JSON.stringify({
          senderName: name,
          body: text,
          imageUrl: media,
          imageUpload,
        }),
      });
      setBody('');
      setImageUrl('');
      clearUpload();
      await loadMessages();
    } catch (err) {
      setError(err.message || 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Localist Chat" icon={MessageSquare}>
      <div className="hub-message-list hub-localist-chat-list">
        {messages.length === 0 && <p className="hub-empty">No messages yet.</p>}
        {messages.map((message) => (
          <div className="hub-message" key={message.id}>
            <strong>{message.senderName || 'Guest'} / {age(message.createdAt)}</strong>
            <MessageText text={message.body} />
            {message.attachments?.map((attachment) => (
              attachment.type === 'image' && attachment.url ? (
                isEmbeddableGifPage(attachment.url) ? (
                  <div className="hub-message-attachment" key={attachment.url}>
                    <iframe src={attachment.url} title="GIF" loading="lazy" />
                    <a className="hub-message-attachment-source" href={attachment.url} target="_blank" rel="noreferrer">Open GIF</a>
                  </div>
                ) : (
                  <a className="hub-message-attachment" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
                    <img src={attachment.url} alt={attachment.name || ''} loading="lazy" />
                  </a>
                )
              ) : null
            ))}
          </div>
        ))}
      </div>
      {!joined ? (
        <form className="hub-form hub-localist-chat-join" onSubmit={joinChat}>
          <Field label="Name">
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoComplete="name" required />
          </Field>
          <button className="hub-primary-button" type="submit" disabled={!draftName.trim()}>
            <MessageSquare size={13} /> Join chat
          </button>
          {error && <p className="hub-error">{error}</p>}
        </form>
      ) : (
        <form className="hub-form hub-localist-chat-form" onSubmit={submit}>
          <div className="hub-localist-chat-identity">
            <span>{senderName}</span>
            <button type="button" onClick={leaveChatName}>Change</button>
          </div>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a question or share an update..."
              rows={2}
            />
          </Field>
          <Field label="Image/GIF link">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." inputMode="url" autoComplete="url" />
          </Field>
          <div className="hub-localist-chat-upload">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/gif,image/png,image/jpeg,image/webp"
              onChange={attachUpload}
            />
            <button type="button" onClick={() => uploadInputRef.current?.click()}>
              <Upload size={13} /> Upload
            </button>
            {imageUpload && (
              <div className="hub-localist-upload-preview">
                <img src={imageUpload.dataUrl} alt="" />
                <span>{imageUpload.name}</span>
                <button type="button" onClick={clearUpload} aria-label="Remove upload">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
          <button className="hub-primary-button" type="submit" disabled={busy || (!body.trim() && !imageUrl.trim() && !imageUpload)}>
            <Send size={13} /> {busy ? 'Sending...' : 'Send'}
          </button>
          {error && <p className="hub-error">{error}</p>}
        </form>
      )}
    </Panel>
  );
}


export function LocalistClosedScreen() {
  return (
    <>
      <main className="hub-auth-screen">
        <section className="hub-auth-card">
          <div className="hub-brand">
            <ShieldCheck size={24} />
            <div>
              <h1>This menu has closed</h1>
              <p>The Localist link is no longer live.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}


export function LocalistGuestShell({ localistWindow }) {
  const expiresAt = localistWindow?.expiresAt
    ? new Date(localistWindow.expiresAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackLocalistActivity('localist.window.viewed', {
      metadata: {
        windowId: localistWindow?.id || '',
        expiresAt: localistWindow?.expiresAt || '',
      },
    });
  }, [localistWindow]);

  return (
    <div className="hub-app hub-app-guest">
      <main className="hub-main">
        <header className="hub-topbar">
          <div>
            <h1>Localist</h1>
            <p>{expiresAt ? `Open until ${expiresAt}` : 'Localist view'}</p>
          </div>
        </header>
        <div className="hub-guest-content">
          <LocalistView />
        </div>
      </main>
    </div>
  );
}

