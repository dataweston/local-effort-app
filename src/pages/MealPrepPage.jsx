import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { VennDiagram } from '../components/common/VennDiagram';
import PhotoGrid from '../components/common/PhotoGrid';
import client from '../sanityClient';
// Meal prep is now public: remove Firebase auth gating
import { MenuList } from '../components/mealprep/MenuList';
import { MenuDetail } from '../components/mealprep/MenuDetail';
import { Comments } from '../components/mealprep/Comments';
import { getAssignedClientNameForUser } from '../data/mealPrepClients';
import { getUserProfile, saveUserProfile } from '../utils/userProfiles';
import { Link } from 'react-router-dom';

export const MealPrepPage = () => {
  // no auth gating; menus are public
  const user = null;
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterName] = useState('');
  const [assignedClient, setAssignedClient] = useState(null);
  const [openSection, setOpenSection] = useState(null); // 'foundation' | 'custom' | null
  // const [galleryItems, setGalleryItems] = useState([]);

  // Gallery carousel removed per request

  // Resolve assigned client for signed-in user and persist mapping.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setAssignedClient(null);
        return;
      }
      let clientName = null;
      try {
        const profile = await getUserProfile(user.uid);
        clientName = profile?.mealPrepClientName || null;
      } catch (_e) {
        // ignore profile fetch errors; mapping will fall back
      }
      if (!clientName) {
        clientName = getAssignedClientNameForUser(user);
      }
      if (clientName) {
        try {
          await saveUserProfile(user.uid, {
            mealPrepClientName: clientName,
            email: user.email || null,
            displayName: user.displayName || null,
          });
        } catch (_e) {
          // non-fatal: profile save can be retried later
        }
      }
      if (mounted) setAssignedClient(clientName);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Load menus once signed in
  useEffect(() => {
    let mounted = true;
  // load menus publicly
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
      <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] leading-[1.02]">Weekly Meal Prep</h2>
          <div className="flex items-center gap-3">
            {/* Public access — no sign-in required */}
          </div>
        </div>

        <p className="text-body max-w-2xl">
          Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy
          to create custom plans for any diet.
        </p>

          <div className="flex gap-2 items-center text-sm text-gray-700 mt-2">
            <a href="#menus" className="underline">View current menus</a>
            {assignedClient ? (
              <span>for <strong>{assignedClient}</strong></span>
            ) : (
              <span className="italic">no client assigned yet</span>
            )}
          </div>

          {false && (
            <section id="menus" className="space-y-4">
              <h3 className="text-2xl font-bold">Current Menus</h3>
              {loading ? (
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
                  <Comments menuId={selected._id} />
                </div>
              )}
            </section>
          )}
        

  {/* Photo grid for meal plan images */}
  <PhotoGrid tags="mealplan" perPage={24} masonry />

  {/* Side-by-side accordions */}
  <div className="grid md:grid-cols-2 gap-6">
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
  </div>

  {/* Menus moved above; section removed here */}
  {/* Weekly Journal embeds */}
  <section className="mt-10">
    <WeeklyJournalEmbeds />
  </section>
      </div>
    </>
  );
};

export default MealPrepPage;

function WeeklyJournalEmbeds() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost"] | order(publishedAt desc)[0...3]{ title, "slug": slug.current, excerpt, publishedAt }`;
        const items = await client.fetch(q);
        if (mounted) setPosts(items || []);
      } catch (_) {
        // ignore blog fetch errors
      }
    })();
    return () => { mounted = false };
  }, []);
  if (!posts.length) return null;
  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Weekly Meal Prep Journal</h3>
        <Link to="/weekly" className="text-sm underline">View more</Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <article key={p.slug} className="rounded-md ring-1 ring-neutral-200 p-4">
            <h4 className="text-lg font-semibold">
              <Link to={`/weekly/${p.slug}`} className="hover:underline">{p.title}</Link>
            </h4>
            <div className="text-sm text-gray-500 mt-1">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}</div>
            {p.excerpt && <p className="text-gray-700 mt-2">{p.excerpt}</p>}
            <div className="mt-3">
              <Link to={`/weekly/${p.slug}`} className="btn btn-ghost px-3 py-1 text-sm">Read</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
