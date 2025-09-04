import React, { lazy, Suspense } from 'react';

const ENABLE_LOCAL = (import.meta.env.VITE_ENABLE_GALLANT === 'true') || (import.meta.env.VITE_ENABLE_GALLANT_LOCAL === 'true');
const ENABLE_INTEGRATED = (import.meta.env.VITE_ENABLE_GALLANT_MODULE ?? 'true') !== 'false';
const GALLANT_URL = import.meta.env.VITE_GALLANT_URL || '';

let RealGallant = null;
if (ENABLE_LOCAL) {
	const localPath = ['..', '..', 'gallant-hawking-l8r4wz', 'src', 'App.jsx'].join('/');
	RealGallant = lazy(() => import(/* @vite-ignore */ localPath));
} else if (ENABLE_INTEGRATED) {
	RealGallant = lazy(() => import('./gallant/App.jsx'));
}

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
