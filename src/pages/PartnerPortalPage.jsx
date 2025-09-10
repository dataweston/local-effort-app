import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuthUser } from '../hooks/useAuthUser';
import { getUserProfile } from '../utils/userProfiles';
import { PARTNER_TOOLS, hasAccess, isAdminProfile, isAdminEmail } from '../config/partnerTools';
import * as Icons from 'lucide-react';

const PartnerPortalPage = () => {
  const { user, loading } = useAuthUser();
  const [profile, setProfile] = React.useState(null);
  const [pLoading, setPLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return setProfile(null);
      setPLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        if (!cancelled) setProfile(p || null);
      } finally {
        if (!cancelled) setPLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <>
      <Helmet>
        <title>Partner Portal | Local Effort</title>
        <meta name="description" content="Tools and resources for Local Effort partners." />
      </Helmet>
      <div className="space-y-6">
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Partner Portal</h2>
        <p className="text-body max-w-2xl">Welcome. Sign in to see your tools, or jump to the portal welcome.</p>

        {!loading && !user && (
          <div className="p-6 border rounded-md max-w-xl bg-neutral-50">
            <h3 className="text-xl font-semibold mb-2">Sign in required</h3>
            <p className="mb-4 text-gray-600">Use your Google account to continue.</p>
            <div className="flex gap-3">
              <Link to="/auth" className="inline-block px-4 py-2 rounded bg-black text-white">Sign in</Link>
            </div>
          </div>
        )}

        {user && (
          <ToolGrid profile={profile} user={user} loading={pLoading} />
        )}
      </div>
    </>
  );
};

export default PartnerPortalPage;

function ToolGrid({ profile, user }) {
  const isAdmin = isAdminProfile(profile) || isAdminEmail(user?.email);
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
