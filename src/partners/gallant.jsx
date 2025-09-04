import React, { lazy, Suspense } from 'react';

const ENABLE_LOCAL = (import.meta.env.VITE_ENABLE_GALLANT === 'true') || (import.meta.env.VITE_ENABLE_GALLANT_LOCAL === 'true');
const GALLANT_URL = import.meta.env.VITE_GALLANT_URL || '';
const RealGallant = ENABLE_LOCAL ? lazy(() => import('../../gallant-hawking-l8r4wz/src/App.jsx')) : null;

export default function GallantProxy() {
	if (RealGallant) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading Gallant…</div>}>
				<RealGallant />
			</Suspense>
		);
	}
	if (GALLANT_URL) {
		return (
			<div style={{ height: '80vh', padding: 0 }}>
				<iframe title="Gallant Hawking" src={GALLANT_URL} style={{ width: '100%', height: '100%', border: '1px solid #e5e7eb', borderRadius: 8 }} />
			</div>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>Gallant Hawking</h2>
			<p>This partner app isn't enabled in this build.</p>
		</div>
	);
}
