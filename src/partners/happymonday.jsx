import React, { lazy, Suspense } from 'react';

const ENABLED = import.meta.env.VITE_ENABLE_HAPPYMONDAY === 'true';
const RealHM = ENABLED
	? lazy(() => import('../../happymonday/src/App.jsx'))
	: null;

export default function HappyMondayProxy() {
	if (RealHM) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading Happy Monday…</div>}>
				<RealHM />
			</Suspense>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>Happy Monday</h2>
			<p>This partner app isn't enabled in this build.</p>
		</div>
	);
}
