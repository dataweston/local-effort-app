import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { VennDiagram } from '../components/common/VennDiagram';
import Carousel from '../components/common/Carousel';
import CloudinaryImage from '../components/common/cloudinaryImage';
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
  const [filterName] = useState('');
  const [assignedClient, setAssignedClient] = useState(null);
  const [openSection, setOpenSection] = useState(null); // 'foundation' | 'custom' | null
  const [galleryItems, setGalleryItems] = useState([]);

  // Load Cloudinary images tagged 'mealplan' and create a 3-wide carousel
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/search-images?query=mealplan&per_page=12`);
        if (!res.ok) throw new Error(`Gallery fetch failed: ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const images = (data.images || []).slice(0, 12);
        const slides = [];
        for (let i = 0; i < images.length; i += 3) {
          const group = images.slice(i, i + 3);
      slides.push({
            key: group.map((g) => g.public_id).join('|') || `${i}`,
            node: (
        <div className="grid grid-cols-3 gap-3">
                {group.map((img, idx) => (
                  <CloudinaryImage
                    key={img.public_id || idx}
                    publicId={img.public_id}
                    alt={img.public_id}
          className="w-full aspect-square object-cover rounded transition-transform duration-300 hover:scale-[1.03]"
                    placeholderMode="none"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                ))}
              </div>
            ),
          });
        }
        setGalleryItems(slides);
      } catch (_e) {
        // silent fallback: just no gallery
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl md:text-6xl font-bold uppercase">Weekly Meal Prep</h2>
          <div className="flex items-center gap-3">
            {user ? (
              <AuthButtons user={user} />
            ) : (
              auth ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                    } catch (e) {
                      alert(`Sign-in unavailable: ${e?.message || e}`);
                    }
                  }}
                >
                  Sign in
                </button>
              ) : null
            )}
          </div>
        </div>

        <p className="font-mono text-lg max-w-3xl">
          Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy
          to create custom plans for any diet.
        </p>

        {user && (
          <div className="flex gap-2 items-center text-sm text-gray-700">
            <a href="#menus" className="underline">View current menus</a>
            {assignedClient ? (
              <span>for <strong>{assignedClient}</strong></span>
            ) : (
              <span className="italic">no client assigned yet</span>
            )}
          </div>
        )}

        {user && (
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
                <Comments menuId={selected._id} user={user} />
              </div>
            )}
          </section>
        )}

        {/* 3-wide gallery carousel for #mealplan */}
        {galleryItems.length > 0 && (
          <div className="min-h-[14rem] md:min-h-[18rem] lg:min-h-[22rem]">
            <Carousel items={galleryItems} intervalMs={7000} className="w-full" hideDots transitionStyle="slide" />
          </div>
        )}

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
      </div>
    </>
  );
};

export default MealPrepPage;
