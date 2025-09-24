import React, { useCallback, useRef } from 'react';
import CostingTile from './CostingTile';
import NotepadTile from './NotepadTile';
import UpdatesPanel from './UpdatesPanel';

export default function PlacemakerWorkspace() {
  const notepadRef = useRef(null);

  const handleSnapshot = useCallback((payload) => {
    if (!payload) return;
    const trimmed = typeof payload === 'string' ? payload.trim() : '';
    if (!trimmed) return;
    notepadRef.current?.appendToNote(trimmed);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/placemaker-logo.jpg" alt="Placemaker Hospitality logo" className="h-12 w-12 rounded-full border border-emerald-200 object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Placemaker</p>
              <h1 className="text-3xl font-semibold text-slate-900">Placemaker Workspace</h1>
              <p className="text-sm text-slate-600">Shared tools update in real time. No login required.</p>
            </div>
          </div>
        </header>
        <UpdatesPanel />
        <div className="columns-1 gap-6 space-y-6 md:columns-2">
          <div className="break-inside-avoid">
            <CostingTile onSnapshot={handleSnapshot} />
          </div>
          <div className="break-inside-avoid">
            <NotepadTile ref={notepadRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
