import React, { lazy, Suspense } from 'react';

// Safe stub: real ZAFA app is not included in production build by default.
// To enable locally, set VITE_ENABLE_ZAFA=true and adjust vite alias.

const ENABLED = import.meta.env.VITE_ENABLE_ZAFA === 'true';
const RealZafa = ENABLED
	? lazy(() => import('../../local-effort-zafa-events/src/app.jsx'))
	: null;

export default function ZafaProxy() {
	if (RealZafa) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading ZAFA…</div>}>
				<RealZafa />
			</Suspense>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>ZAFA Events</h2>
			<p>The ZAFA partner tool isn't enabled in this build.</p>
		</div>
	);
}
