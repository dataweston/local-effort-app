import React from 'react';

const AACRM_URL = (import.meta.env.VITE_AACRM_URL || '').trim();

export default function AACRMPartnerWorkspace() {
  const hasRemoteApp = Boolean(AACRM_URL);

  return (
    <div className="min-h-screen bg-slate-100 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-lg font-semibold text-emerald-700 shadow-sm">
              AA
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AACRM</p>
              <h1 className="text-3xl font-semibold text-slate-900">AACRM Workspace</h1>
              <p className="text-sm text-slate-600">
                Shared workspace embedding the AACRM partner tool. Updates reflect the external app in real time.
              </p>
            </div>
          </div>
          {hasRemoteApp && (
            <a
              href={AACRM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              Open in new tab
            </a>
          )}
        </header>
        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {hasRemoteApp ? (
              <iframe
                key={AACRM_URL}
                src={AACRM_URL}
                title="AACRM partner tool"
                className="h-[80vh] w-full"
                loading="lazy"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            ) : (
              <div className="px-6 py-16 text-center text-slate-600">
                <h2 className="mb-2 text-xl font-semibold text-slate-900">AACRM tool unavailable</h2>
                <p className="mx-auto max-w-2xl text-sm">
                  Set the <code className="rounded bg-slate-100 px-1 py-0.5">VITE_AACRM_URL</code> environment variable to the deployed AACRM Next.js app to embed it here.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
            <p className="font-medium">Need a standalone window?</p>
            <p>
              The AACRM workspace runs as an external Next.js app. Use the button above to launch it directly if you need more space or developer tools.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
