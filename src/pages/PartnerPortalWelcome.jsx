import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
// Partner portal welcome is public; auth optional
import { PARTNER_TOOLS, hasAccess, isAdminProfile } from '../config/partnerTools';
import * as Icons from 'lucide-react';
export default function PartnerPortalWelcome() {
  const [profile] = React.useState(null);
  const [pLoading] = React.useState(false);
  

  return (
    <>
      <Helmet>
        <title>Partner Portal | Welcome</title>
        <meta name="description" content="Local Effort partner tools and resources." />
      </Helmet>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Partner Portal</h2>
        <p className="text-body max-w-2xl">Welcome! Access tools and resources for partners. Sign in to see your tools.</p>

        <div className="p-6 border rounded-md max-w-xl bg-neutral-50">
          <h3 className="text-xl font-semibold mb-2">Welcome</h3>
          <p className="mb-4 text-gray-600">Tools and links for partners. Sign in to access account-specific features.</p>
          <Link to="/auth" className="inline-block px-4 py-2 rounded bg-black text-white">Continue with Google</Link>
        </div>

        <ToolGrid profile={profile} loading={pLoading} />
      </div>
    </>
  );
}

function ToolGrid({ profile }) {
  const isAdmin = isAdminProfile(profile);
  const visible = isAdmin ? PARTNER_TOOLS : PARTNER_TOOLS.filter((t) => hasAccess(profile, t.key));

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
