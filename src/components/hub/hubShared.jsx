import React from 'react';

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}


export function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}


export function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}


export function formatMoneyCents(cents) {
  const dollars = Number(cents || 0) / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}


export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}


// Coerce a free-form value from unstructured Brain `properties` JSON into a
// string safe to render in JSX. Intake forms sometimes store fields like
// deliveryPreference as an object (e.g. { day, time, preference }) instead of
// a string; dropping that straight into JSX throws React error #31 and blanks
// the whole page. Objects become a "key: value" join; arrays a comma list.
export function displayText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${displayText(v)}`)
      .join(' · ');
  }
  return String(value);
}


export function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  const parsed = new Date();
  parsed.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}


export function age(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 2) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}


export async function api(path, accessToken, options = {}) {
  const devApiRoot = import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';
  const res = await fetch(`${devApiRoot}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}


export function Panel({ title, icon: Icon, action, children }) {
  return (
    <section className="hub-panel">
      <div className="hub-panel-head">
        <div className="hub-panel-title">
          {Icon && <Icon size={15} aria-hidden="true" />}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}


export function Field({ label, children }) {
  return (
    <label className="hub-field">
      <span>{label}</span>
      {children}
    </label>
  );
}


export function MarkdownPreview({ body }) {
  const lines = String(body || '').split('\n');
  return (
    <div className="hub-markdown-preview">
      {lines.map((line, index) => {
        const wrapped = line.trim().match(/^#(.+)#$/);
        if (wrapped) return <h3 key={index}>{wrapped[1].trim()}</h3>;
        if (line.startsWith('### ')) return <h4 key={index}>{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>;
        if (line.startsWith('- ')) return <p key={index}>• {line.slice(2)}</p>;
        if (!line.trim()) return <br key={index} />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

// Identity tones for avatars: soft wash + deep text pairs drawn from the brand
// family (olive, plum, rose, tan, sage). Deterministic per name so a person
// keeps their color everywhere in the Hub.
const AVATAR_TONES = [
  ['#E4E9D7', '#4E5843'],
  ['#E6DEEA', '#5A4964'],
  ['#F3DFE2', '#A94E5D'],
  ['#EFE0D4', '#7A5B3A'],
  ['#E1E6E2', '#4F5D55'],
  ['#E4E0EB', '#5D5470'],
  ['#F0E2D2', '#8A6119'],
  ['#DFE8DC', '#445243'],
];

export function avatarTone(name) {
  const text = String(name || '?');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function HubAvatar({ name, size = 32 }) {
  const [bg, fg] = avatarTone(name);
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';
  return (
    <span
      className="hub-avatar"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

