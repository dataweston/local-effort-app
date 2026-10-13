import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SmallEventsWizard from '../components/smallEvents/SmallEventsWizard';
import '../styles/le-checkout.css';

export default function BookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || null;

  return (
    <div style={{ minHeight: '100vh', background: '#fffaf1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ width: '100%', maxWidth: '680px', padding: '0 1rem' }}>
        <header style={{ maxWidth: 520, margin: '0 auto 1.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', lineHeight: 1.15 }}>Book a private event</h1>
          <p>Plan a chef-led dinner or pizza party in Minneapolis–St. Paul. Choose your event to get an estimate and request a date.</p>
        </header>
        <SmallEventsWizard
          initialType={initialType}
          onClose={() => navigate('/')}
        />
      </div>
    </div>
  );
}
