import React, { lazy, Suspense } from 'react';

// Safe proxy: choose from integrated module, local external app, or iframe/stub.
const ENABLE_LOCAL = import.meta.env.VITE_ENABLE_ZAFA_LOCAL === 'true';
const ENABLE_INTEGRATED = (import.meta.env.VITE_ENABLE_ZAFA_MODULE ?? 'true') !== 'false';
const ZAFA_URL = import.meta.env.VITE_ZAFA_URL || '';

let RealZafa = null;
if (ENABLE_LOCAL) {
	// Build the path dynamically and ask Vite to ignore pre-bundling so Rollup won't try to resolve it in production.
	const localPath = ['..', '..', 'local-effort-zafa-events', 'src', 'app.jsx'].join('/');
	RealZafa = lazy(() => import(/* @vite-ignore */ localPath));
} else if (ENABLE_INTEGRATED) {
	RealZafa = lazy(() => import('./zafa/App.jsx'));
}

export default function ZafaProxy() {
	if (RealZafa) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading ZAFA…</div>}>
				<RealZafa />
			</Suspense>
		);
	}
	if (ZAFA_URL) {
		return (
			<div style={{ height: '80vh', padding: 0 }}>
				<iframe
					title="ZAFA Events"
					src={ZAFA_URL}
					style={{ width: '100%', height: '100%', border: '1px solid #e5e7eb', borderRadius: 8 }}
				/>
			</div>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>ZAFA Events</h2>
			<p>The ZAFA partner tool isn't enabled in this build.</p>
		</div>
	);
}
