import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Heart, Minus, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RATINGS = [
  { value: 'love',    label: 'Love it',  icon: Heart,      color: '#e07070' },
  { value: 'like',    label: 'Like it',  icon: ThumbsUp,   color: '#6ba87e' },
  { value: 'ok',      label: 'It\'s ok', icon: Minus,      color: '#a0a0a0' },
  { value: 'dislike', label: 'Not for me', icon: ThumbsDown, color: '#c0392b' },
];

export default function BrainPortalPage() {
  const { shareToken } = useParams();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [feedback, setFeedback] = useState({}); // dishName → { rating, notes, submitted }
  const [submitting, setSubmitting] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!shareToken) return;
    fetch(`${API_BASE}/api/brain/portal/${shareToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setMenu(data.menu);
          // Hydrate any previously-submitted feedback from the portal response
          if (data.feedback) {
            const hydrated = {};
            for (const f of data.feedback) {
              hydrated[f.dishName] = { rating: f.rating, notes: f.notes || '', submitted: true };
            }
            setFeedback(hydrated);
          }
        } else {
          setError(data.error || 'Menu not found');
        }
      })
      .catch(() => setError('Could not load menu'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  async function submitFeedback(dishName, rating, notes = '') {
    if (submitting) return;
    setSubmitting(dishName);
    setSubmitError(null);
    try {
      // Token goes in Authorization header, not query string (avoids server logs / referrer leakage)
      const res = await fetch(`${API_BASE}/api/brain/menu/${menu.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shareToken}`,
        },
        body: JSON.stringify({ dishName, rating, notes, customerName: customerName || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback(prev => ({ ...prev, [dishName]: { rating, notes, submitted: true } }));
      } else {
        setSubmitError(`Couldn't save feedback for "${dishName}" — please try again.`);
      }
    } catch {
      setSubmitError(`Couldn't save feedback for "${dishName}" — check your connection and try again.`);
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <Shell><p style={styles.muted}>Loading menu…</p></Shell>;
  if (error) return <Shell><p style={{ color: 'var(--brand-rose, #e07070)', textAlign: 'center' }}>{error}</p></Shell>;
  if (!menu) return null;

  const dishes = menu.dishes || [];
  const weekLabel = menu.weekOf ? `Week of ${formatDate(menu.weekOf)}` : null;

  return (
    <Shell>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ ...styles.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          Local Effort Food{weekLabel ? ` · ${weekLabel}` : ''}
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-ink, #1a1a1a)', margin: 0 }}>
          {menu.name}
        </h1>
        {menu.notes && (
          <p style={{ ...styles.muted, marginTop: '0.75rem', maxWidth: 480, margin: '0.75rem auto 0' }}>
            {menu.notes}
          </p>
        )}
      </div>

      {/* Name prompt */}
      {!nameConfirmed && (
        <div style={{ ...styles.card, marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--brand-ink, #1a1a1a)' }}>
            Who's leaving feedback?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 320, margin: '0 auto' }}>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Your name (optional)"
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && setNameConfirmed(true)}
            />
            <button onClick={() => setNameConfirmed(true)} style={styles.btnPrimary}>
              {customerName.trim() ? 'Continue' : 'Skip'}
            </button>
          </div>
        </div>
      )}

      {/* Dish list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {dishes.map((dish, idx) => {
          const dishName = dish.name || dish;
          const fb = feedback[dishName];
          return (
            <DishCard
              key={idx}
              dish={dish}
              dishName={dishName}
              feedback={fb}
              submitting={submitting === dishName}
              disabled={!nameConfirmed}
              shareToken={shareToken}
              onRate={(rating) => submitFeedback(dishName, rating)}
            />
          );
        })}
      </div>

      {/* Submit error */}
      {submitError && (
        <p style={{ color: 'var(--brand-rose, #c0392b)', textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem' }}>
          {submitError}
        </p>
      )}

      {/* Footer */}
      <p style={{ ...styles.muted, textAlign: 'center', marginTop: '2.5rem', fontSize: '0.7rem' }}>
        Your feedback helps us plan meals you'll love.
      </p>
    </Shell>
  );
}

function DishCard({ dishName, dish, feedback, submitting, disabled, onRate }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  if (feedback?.submitted) {
    const ratingDef = RATINGS.find(r => r.value === feedback.rating);
    const Icon = ratingDef?.icon || CheckCircle;
    return (
      <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.8 }}>
        <Icon size={18} color={ratingDef?.color || '#6ba87e'} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, margin: 0, color: 'var(--brand-ink, #1a1a1a)' }}>{dishName}</p>
          {dish.description && <p style={{ ...styles.muted, margin: '0.2rem 0 0', fontSize: '0.8rem' }}>{dish.description}</p>}
        </div>
        <span style={{ fontSize: '0.75rem', color: ratingDef?.color || '#6ba87e', fontWeight: 600 }}>{ratingDef?.label}</span>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--brand-ink, #1a1a1a)' }}>{dishName}</p>
      {dish.description && <p style={{ ...styles.muted, margin: '0 0 0.75rem', fontSize: '0.82rem' }}>{dish.description}</p>}

      {disabled ? (
        <p style={{ ...styles.muted, fontSize: '0.78rem' }}>Enter your name above to leave feedback</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {RATINGS.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => {
                  if (value === 'dislike') { setShowNotes(true); return; }
                  onRate(value);
                }}
                disabled={!!submitting}
                style={{
                  ...styles.ratingBtn,
                  borderColor: color,
                  color: color,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {showNotes && (
            <div style={{ marginTop: '0.75rem' }}>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What didn't work? (optional)"
                rows={2}
                style={{ ...styles.input, width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => { onRate('dislike', notes); setShowNotes(false); }} style={styles.btnDanger}>
                  Send feedback
                </button>
                <button onClick={() => setShowNotes(false)} style={styles.btnGhost}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--brand-linen, #faf8f3)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  muted: {
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  input: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '16px', // prevents iOS zoom
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--brand-olive, #6ba87e)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
  },
  btnDanger: {
    padding: '0.4rem 0.875rem',
    borderRadius: '0.5rem',
    backgroundColor: 'var(--brand-rose, #e07070)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.82rem',
  },
  btnGhost: {
    padding: '0.4rem 0.875rem',
    borderRadius: '0.5rem',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    fontSize: '0.82rem',
  },
  ratingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    backgroundColor: 'transparent',
    border: '1.5px solid',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    transition: 'opacity 0.15s',
  },
};
