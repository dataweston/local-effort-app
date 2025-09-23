import React, { lazy, Suspense } from 'react';

const PlacemakerWorkspace = lazy(() => import('./placemaker/App.jsx'));

export default function PlacemakerProxy() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading Placemaker Workspace…</div>}>
      <PlacemakerWorkspace />
    </Suspense>
  );
}
