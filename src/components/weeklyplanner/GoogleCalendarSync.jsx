import React, { useState } from 'react';
import { Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';

export function GoogleCalendarSync({
  accessToken,
  weekStart = null,
  from = null,
  to = null,
  label = 'Sync to Google',
  onSynced = null,
}) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultLabel, setResultLabel] = useState('');

  const handleSync = async () => {
    if (!accessToken) return;
    setStatus('syncing');
    setErrorMsg('');
    setResultLabel('');
    try {
      const payload = {};
      if (weekStart) payload.weekStart = weekStart;
      if (from) payload.from = from;
      if (to) payload.to = to;
      const res = await fetch('/api/planner/google-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      onSynced?.(data);
      setResultLabel(`${data.processed || 0} checked`);
      setStatus(data.ok === false ? 'error' : 'success');
      if (data.ok === false) setErrorMsg(data.errors?.[0]?.error || 'Some calendar updates failed');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Sync failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const icons = {
    idle: <Calendar size={14} />,
    syncing: <Loader2 size={14} className="animate-spin" />,
    success: <Check size={14} />,
    error: <AlertCircle size={14} />,
  };
  const labels = {
    idle: label,
    syncing: 'Syncing…',
    success: resultLabel || 'Synced',
    error: 'Sync failed',
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={status === 'syncing'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors touch-target-ios disabled:opacity-50"
        style={{
          borderColor:
            status === 'error' ? 'var(--color-state-danger)' : 'var(--color-border-default)',
          color:
            status === 'success'
              ? 'var(--color-state-success)'
              : status === 'error'
                ? 'var(--color-state-danger)'
                : 'var(--color-text-secondary)',
        }}
        title={
          errorMsg || 'Reconcile planner work blocks with the Local Effort operations calendar'
        }
      >
        {icons[status]}
        <span className="hidden sm:inline">{labels[status]}</span>
      </button>
    </div>
  );
}
