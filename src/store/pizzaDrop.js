import { useEffect, useState } from 'react';

const TIME_ZONE = 'America/Chicago';
const CLOSING_SOON_MS = 48 * 60 * 60 * 1000;

const dayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export function getDropWindow(page) {
  const opensAt = Date.parse(page?.dropOpensAt);
  const closesAt = Date.parse(page?.dropClosesAt);
  return Number.isFinite(opensAt) && Number.isFinite(closesAt) && closesAt > opensAt ? { opensAt, closesAt } : null;
}

// 'upcoming' | 'open' | 'closed'. A page without a valid window never sells.
export function getDropState(window, now) {
  if (!window) return 'closed';
  if (now < window.opensAt) return 'upcoming';
  if (now >= window.closesAt) return 'closed';
  return 'open';
}

export const isClosingSoon = (window, now) => !!window && now < window.closesAt && window.closesAt - now <= CLOSING_SOON_MS;

export const formatDropMoment = (ms) => `${dayFormat.format(ms)} · ${timeFormat.format(ms)}`;

export function formatCountdown(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export const dropProgress = (window, now) =>
  window ? Math.min(1, Math.max(0, (now - window.opensAt) / (window.closesAt - window.opensAt))) : 0;

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
