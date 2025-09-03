import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { VennDiagram } from '../components/common/VennDiagram';
import client from '../sanityClient';
import { useAuthUser } from '../hooks/useAuthUser';
import { AuthButtons } from '../components/mealprep/AuthButtons';
import { auth, signInWithGoogle } from '../firebaseConfig';
import { MenuList } from '../components/mealprep/MenuList';
import { MenuDetail } from '../components/mealprep/MenuDetail';
import { Comments } from '../components/mealprep/Comments';
import { getAssignedClientNameForUser } from '../data/mealPrepClients';
import { getUserProfile, saveUserProfile } from '../utils/userProfiles';

export const MealPrepPage = () => {
  const { user } = useAuthUser();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [assignedClient, setAssignedClient] = useState(null);
  const [openSection, setOpenSection] = useState(null); // 'foundation' | 'custom' | null

  // Resolve assigned client for signed-in user and persist mapping.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setAssignedClient(null);
        return;
      }
      // Try to read persisted mapping first
      let clientName = null;
      try {
        const profile = await getUserProfile(user.uid);
        clientName = profile?.mealPrepClientName || null;
      } catch (_e) {}

      // Fallback to mapping by email/displayName
      if (!clientName) {
        clientName = getAssignedClientNameForUser(user);
      }

      // Persist if we discovered a mapping
      if (clientName) {
        try {
          await saveUserProfile(user.uid, {
            mealPrepClientName: clientName,
            email: user.email || null,
            displayName: user.displayName || null,
          });
        } catch (_e) {}
      }
      if (mounted) setAssignedClient(clientName);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setMenus([]);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
      };
    }
  (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!client || !client.fetch) {
          throw new Error('Content service unavailable');
        }
        const data = await client.fetch(
          `*[_type == "mealPrepMenu" && published == true] | order(date desc)[0...50]{
            _id, date, clientName, menu, notes
          }`
        );
        if (mounted) setMenus(data || []);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    // If user has an assigned client, show only those menus
    const base = assignedClient
      ? menus.filter((m) => (m.clientName || '').toLowerCase() === assignedClient.toLowerCase())
      : menus;
    const q = filterName.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => (m.clientName || '').toLowerCase().includes(q));
  }, [menus, filterName, assignedClient]);

  return (
    <>
      <Helmet>
        <title>Weekly Meal Prep | Local Effort</title>
        <meta
          name="description"
          content="Our Foundation Meal Plan provides 21 nutritious meals per week from local Midwest sources."
        />
      </Helmet>
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="text-5xl md:text-7xl font-bold uppercase">Weekly Meal Prep</h2>
          {auth ? <AuthButtons user={user} /> : null}
        </div>

        <p className="font-mono text-lg max-w-3xl">
          Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy
          to create custom plans for any diet.
        </p>

        <div className="flex gap-4 items-center">
          {!user ? (
            <button
              type="button"
              className="underline"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (e) {
                  alert(`Sign-in unavailable: ${e?.message || e}`);
                }
              }}
            >
              Already a member? Sign in
            </button>
          ) : (
            <div className="text-sm text-gray-700">
              <a href="#menus" className="underline">View current menus</a>
              {assignedClient ? (
                <span className="ml-2">for <strong>{assignedClient}</strong></span>
              ) : (
                <span className="ml-2 italic">no client assigned yet</span>
              )}
            </div>
          )}
        </div>

        {/* Foundation Plan Accordion */}
        <div className="border border-gray-900 rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
            onClick={() => setOpenSection(openSection === 'foundation' ? null : 'foundation')}
          >
            <span className="text-xl font-bold">Foundation Meal Plan</span>
            <span className="text-sm text-gray-600">{openSection === 'foundation' ? 'Hide ▲' : 'View More ▼'}</span>
          </button>
          <div
            className={`transition-[max-height,opacity] duration-300 ease-in-out ${
              openSection === 'foundation' ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-6">
              <VennDiagram />
              <p className="font-mono mt-6 max-w-2xl">
                Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at
                ~1800 calories/day.
              </p>
            </div>
          </div>
        </div>

        {/* Custom Plan Accordion */}
        <div className="border border-gray-900 rounded-md overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
            onClick={() => setOpenSection(openSection === 'custom' ? null : 'custom')}
          >
            <span className="text-xl font-bold">Custom Plan</span>
            <span className="text-sm text-gray-600">{openSection === 'custom' ? 'Hide ▲' : 'View More ▼'}</span>
          </button>
          <div
            className={`transition-[max-height,opacity] duration-300 ease-in-out ${
              openSection === 'custom' ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-6">
              <VennDiagram />
              <p className="font-mono mt-6 max-w-2xl">
                We tailor plans to your needs (gluten-free, vegetarian, high-protein, etc.). Tell us your goals
                and preferences and we’ll propose a weekly plan and schedule.
              </p>
            </div>
          </div>
        </div>

        <section id="menus" className="space-y-4">
          <h3 className="text-2xl font-bold">Past Menu Examples.</h3>
          {/* Filter removed per request */}

          {!user ? (
            <div className="text-sm text-gray-700">
              <button
                type="button"
                className="underline"
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (e) {
                    alert(`Sign-in unavailable: ${e?.message || e}`);
                  }
                }}
              >
                Already a member? Sign in
              </button>
              {!auth && (
                <p className="mt-2 text-xs text-gray-500">Sign-in temporarily unavailable. Check Firebase env variables.</p>
              )}
            </div>
          ) : loading ? (
            <p>Loading menus…</p>
          ) : error ? (
            <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded">
              <p className="font-semibold">{error}</p>
              <p className="text-sm mt-1">If this persists, ensure Sanity env vars are set on the web app (VITE_APP_SANITY_PROJECT_ID, VITE_APP_SANITY_DATASET) and that the Studio has the new Meal Prep Menu content.</p>
            </div>
          ) : !selected ? (
            <MenuList menus={filtered} onSelect={setSelected} />
          ) : (
            <div>
              <MenuDetail menu={selected} onBack={() => setSelected(null)} />
              <Comments menuId={selected._id} user={user} />
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default MealPrepPage;
