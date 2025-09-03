export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, reason: 'unsupported' };
  const reg = await navigator.serviceWorker.ready;
  let vapid = import.meta?.env?.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: 'no-vapid' };
  const convertedVapidKey = urlBase64ToUint8Array(vapid);
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedVapidKey });
  const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, subscription: sub }) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
