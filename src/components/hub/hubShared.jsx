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

