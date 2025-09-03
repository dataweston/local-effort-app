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

export const MealPrepPage = () => {
  const { user } = useAuthUser();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterName, setFilterName] = useState('');

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
    const q = filterName.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter((m) => (m.clientName || '').toLowerCase().includes(q));
  }, [menus, filterName]);

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
            <a href="#menus" className="underline">View current menus</a>
          )}
        </div>

        <div className="border border-gray-900 p-8">
          <h3 className="text-3xl font-bold mb-4">Foundation Meal Plan</h3>
          <VennDiagram />
          <p className="font-mono mb-6 max-w-2xl">
            Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at
            ~1800 calories/day.
          </p>
        </div>

        <section id="menus" className="space-y-4">
          <h3 className="text-2xl font-bold">Current Menus</h3>
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
            <MenuList menus={menus} onSelect={setSelected} />
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
