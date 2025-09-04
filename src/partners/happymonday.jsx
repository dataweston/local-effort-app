import React, { lazy, Suspense } from 'react';

const ENABLE_LOCAL = import.meta.env.VITE_ENABLE_HAPPYMONDAY_LOCAL === 'true';
const ENABLE_INTEGRATED = (import.meta.env.VITE_ENABLE_HAPPYMONDAY_MODULE ?? 'true') !== 'false';
const HM_URL = import.meta.env.VITE_HAPPYMONDAY_URL || '';

const RealHM = ENABLE_LOCAL
  ? lazy(() => import('../../happymonday/src/App.jsx'))
  : ENABLE_INTEGRATED
    ? lazy(() => import('./happymonday/App.jsx'))
    : null;

export default function HappyMondayProxy() {
	if (RealHM) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading Happy Monday…</div>}>
				<RealHM />
			</Suspense>
		);
	}
	if (HM_URL) {
		return (
			<div style={{ height: '80vh', padding: 0 }}>
				<iframe title="Happy Monday" src={HM_URL} style={{ width: '100%', height: '100%', border: '1px solid #e5e7eb', borderRadius: 8 }} />
			</div>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>Happy Monday</h2>
			<p>This partner app isn't enabled in this build.</p>
		</div>
	);
}
