import React, { lazy, Suspense } from 'react';

const ENABLED = import.meta.env.VITE_ENABLE_GALLANT === 'true';
const RealGallant = ENABLED
	? lazy(() => import('../../gallant-hawking-l8r4wz/src/App.jsx'))
	: null;

export default function GallantProxy() {
	if (RealGallant) {
		return (
			<Suspense fallback={<div style={{ padding: 24 }}>Loading Gallant…</div>}>
				<RealGallant />
			</Suspense>
		);
	}
	return (
		<div style={{ padding: 24 }}>
			<h2>Gallant Hawking</h2>
			<p>This partner app isn't enabled in this build.</p>
		</div>
	);
}
