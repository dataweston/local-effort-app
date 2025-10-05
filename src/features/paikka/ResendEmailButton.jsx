import React, { useState } from 'react';

import { Button } from '../../components/ui/button';

const ResendEmailButton = ({ order, jwt }) => {
  const [status, setStatus] = useState('idle');

  const handleClick = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const response = await fetch('/api/paikka/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, jwt }),
      });
      if (!response.ok) {
        throw new Error('Failed to resend email');
      }
      setStatus('success');
    } catch (err) {
      console.error('Resend email failed', err);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" onClick={handleClick} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : status === 'success' ? 'Email resent' : 'Resend email'}
      </Button>
      {status === 'error' && (
        <p className="text-sm text-rose-600">We could not resend the email. Try again shortly.</p>
      )}
      {status === 'success' && (
        <p className="text-sm text-emerald-600">Email sent. Check your inbox in a moment.</p>
      )}
    </div>
  );
};

export default ResendEmailButton;
