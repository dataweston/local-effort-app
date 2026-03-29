import React, { useState } from 'react';
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
        <SmallEventsWizard
          initialType={initialType}
          onClose={() => navigate('/')}
        />
      </div>
    </div>
  );
}
