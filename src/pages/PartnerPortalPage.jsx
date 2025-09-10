import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
// Public Partner Portal — no auth required
import { PARTNER_TOOLS } from '../config/partnerTools';
import * as Icons from 'lucide-react';

const PartnerPortalPage = () => {
  return (
    <>
      <Helmet>
        <title>Partner Portal | Local Effort</title>
        <meta name="description" content="Tools and resources for Local Effort partners." />
      </Helmet>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Partner Portal</h2>
        <p className="text-body max-w-2xl">Public tools and links for partners. No sign-in required.</p>

        <ToolGrid />
      </div>
    </>
  );
};

export default PartnerPortalPage;

function ToolGrid() {
  const visible = PARTNER_TOOLS;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map((t) => {
        const Icon = Icons[t.icon] || Icons.AppWindow;
        const isExternal = t.type === 'external' && t.href;
        const content = (
          <div className="group block p-5 border rounded-xl hover:shadow transition bg-white">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-200">
                <Icon className="w-5 h-5 text-neutral-800" />
              </span>
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-neutral-600">{t.description}</div>
              </div>
            </div>
          </div>
        );
        return isExternal ? (
          <a key={t.key} href={t.href} target="_blank" rel="noopener noreferrer">{content}</a>
        ) : (
          <Link key={t.key} to={t.route}>{content}</Link>
        );
      })}
    </div>
  );
}
