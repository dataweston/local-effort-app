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
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [waitlist, setWaitlist] = useState({
    name: '',
    email: '',
    phone: '',
    familySize: '',
    children: '',
    daysPerWeek: '',
    mealsPerDay: '',
    allergies: '',
    questions: '',
  });

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

  // Load menus once signed in (now public)
  useEffect(() => {
    let mounted = true;
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

  const mealPrepFaq = [
    {
      question: 'What does the Minneapolis meal prep service include?',
      answer:
        'Our Minneapolis personal chef team plans menus, shops for local ingredients, cooks in-home or in our commissary kitchen, and delivers labeled meals with reheating notes.',
    },
    {
      question: 'Do you offer flexible meal plan Minneapolis subscriptions?',
      answer:
        'Yes. Choose a Foundation Plan with 21 meals per week or build a custom meal plan Minneapolis schedule that covers breakfasts, lunches, dinners, snacks, or postpartum support.',
    },
    {
      question: 'How far in advance should I book meal prep?',
      answer:
        'Most households schedule recurring deliveries two to four weeks in advance. We keep a few last-minute spots open for new Minneapolis meal prep clients when possible.',
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: mealPrepFaq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const resetWaitlist = () =>
    setWaitlist({
      name: '',
      email: '',
      phone: '',
      familySize: '',
      children: '',
      daysPerWeek: '',
      mealsPerDay: '',
      allergies: '',
      questions: '',
    });

  const handleWaitlistChange = (field, value) => {
    setWaitlist((prev) => ({ ...prev, [field]: value }));
    if (waitlistStatus !== 'idle') setWaitlistStatus('idle');
  };

  const handleWaitlistSubmit = async (event) => {
    event.preventDefault();
    setWaitlistStatus('sending');
    try {
      const lines = [
        'Weekly Meal Prep Waitlist signup',
        `Name: ${waitlist.name}`,
        `Email: ${waitlist.email}`,
        `Phone: ${waitlist.phone || '(not provided)'}`,
        `Family size: ${waitlist.familySize || '(not provided)'}`,
        `Children & ages: ${waitlist.children || '(not provided)'}`,
        `Days per week: ${waitlist.daysPerWeek || '(not provided)'}`,
        `Meals per day: ${waitlist.mealsPerDay || '(not provided)'}`,
        `Allergies or medical comments: ${waitlist.allergies || '(none noted)'}`,
        '',
        'Questions or notes:',
        waitlist.questions || '(none provided)',
      ];
      const payload = {
        name: waitlist.name,
        email: waitlist.email,
        phone: waitlist.phone,
        subject: 'Meal Prep Waitlist signup',
        type: 'meal-prep-waitlist',
        message: lines.join('\n'),
      };
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setWaitlistStatus('success');
      resetWaitlist();
    } catch (_error) {
      setWaitlistStatus('error');
    }
  };

  return (
    <>
      <Helmet>
        <title>Meal Prep Minneapolis | Weekly Meal Plans | Local Effort</title>
        <meta
          name="description"
          content="Weekly meal prep in Minneapolis with chef-prepared meals, reheating notes, and flexible meal plans for families and professionals. Foundation and custom plans available."
        />
        <meta
          name="keywords"
          content="meal prep Minneapolis, meal plan Minneapolis, Minneapolis personal chef, weekly meal prep, custom meal plan"
        />
        <link rel="canonical" href="https://localeffortfood.com/meal-prep" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Weekly Meal Prep Service",
          "serviceType": "Meal Preparation",
          "description": "Weekly meal prep in Minneapolis with chef-prepared meals, reheating notes, and flexible meal plans.",
          "provider": {
            "@type": "LocalBusiness",
            "name": "Local Effort"
          },
          "areaServed": [
            {"@type": "Place", "name": "Minneapolis"},
            {"@type": "Place", "name": "St. Paul"},
            {"@type": "Place", "name": "Twin Cities"}
          ],
          "offers": {
            "@type": "Offer",
            "priceCurrency": "USD",
            "price": "325",
            "description": "Starting at $325 for 12 chef-prepared meals"
          }
        })}</script>
      </Helmet>
      {showWaitlistForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="form-card w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-sm underline z-10"
              onClick={() => {
                setShowWaitlistForm(false);
                setWaitlistStatus('idle');
                resetWaitlist();
              }}
            >
              Close
            </button>
            <h2 className="text-2xl font-bold mb-2">Join the Waiting List</h2>
            <p className="text-sm text-gray-600 mb-4">
              Thank you for your interest in meal planning. Share a few details below and we&rsquo;ll reach out as soon as a space opens up.
            </p>
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="waitlist-name">Name</label>
                <input
                  id="waitlist-name"
                  className="input"
                  value={waitlist.name}
                  onChange={(e) => handleWaitlistChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="waitlist-email">Email</label>
                  <input
                    id="waitlist-email"
                    type="email"
                    className="input"
                    value={waitlist.email}
                    onChange={(e) => handleWaitlistChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="waitlist-phone">Phone number</label>
                  <input
                    id="waitlist-phone"
                    className="input"
                    value={waitlist.phone}
                    onChange={(e) => handleWaitlistChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="waitlist-family">Family size</label>
                <input
                  id="waitlist-family"
                  className="input"
                  placeholder="e.g. 2 adults, 2 kids"
                  value={waitlist.familySize}
                  onChange={(e) => handleWaitlistChange('familySize', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="waitlist-children">Children &amp; ages</label>
                <textarea
                  id="waitlist-children"
                  className="textarea"
                  rows={2}
                  value={waitlist.children}
                  onChange={(e) => handleWaitlistChange('children', e.target.value)}
                  placeholder="Tell us about school schedules, toddlers, or teens."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="waitlist-days">Days per week</label>
                  <input
                    id="waitlist-days"
                    className="input"
                    placeholder="How many days should we cover?"
                    value={waitlist.daysPerWeek}
                    onChange={(e) => handleWaitlistChange('daysPerWeek', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="waitlist-meals">Meals per day</label>
                  <input
                    id="waitlist-meals"
                    className="input"
                    placeholder="Breakfast, lunch, dinner?"
                    value={waitlist.mealsPerDay}
                    onChange={(e) => handleWaitlistChange('mealsPerDay', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="waitlist-allergies">Allergies or medical comments</label>
                <textarea
                  id="waitlist-allergies"
                  className="textarea"
                  rows={3}
                  value={waitlist.allergies}
                  onChange={(e) => handleWaitlistChange('allergies', e.target.value)}
                  placeholder="Include any dietary restrictions, allergies, or doctor notes."
                />
              </div>
              <div>
                <label className="label" htmlFor="waitlist-questions">Questions for the team</label>
                <textarea
                  id="waitlist-questions"
                  className="textarea"
                  rows={3}
                  value={waitlist.questions}
                  onChange={(e) => handleWaitlistChange('questions', e.target.value)}
                  placeholder="Anything else we should know?"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={waitlistStatus === 'sending'}>
                  {waitlistStatus === 'sending' ? 'Submitting...' : 'Join waitlist'}
                </button>
                {waitlistStatus === 'success' && (
                  <span className="text-green-700 text-sm">Thank you! We'll reach out as soon as a space opens up.</span>
                )}
                {waitlistStatus === 'error' && (
                  <span className="text-red-700 text-sm">We couldn&rsquo;t submit your request. Please try again.</span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <header className="flex items-center gap-4">
          <h1 className="heading-display heading-balance">
            Weekly meal prep
          </h1>
        </header>

        <section className="max-w-md">
          <h2 className="text-xl font-bold mb-3">Join the waiting list</h2>
          <p className="text-sm text-gray-600 mb-3">
            We're currently at capacity. Add your name to our waitlist and we'll reach out when a spot opens up.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetWaitlist();
              setWaitlistStatus('idle');
              setShowWaitlistForm(true);
            }}
          >
            Join the waitlist
          </button>
        </section>

        <section className="space-y-4 max-w-3xl">
          <p className="text-body">
            Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy to create custom plans for
            any diet.
          </p>
          <p className="text-body">
            Looking for meal prep Minneapolis support between events? Our chefs cook, portion, and package complete menus so your
            family has reheatable dinners, lunches, and snacks. Prefer variety? Build a meal plan Minneapolis subscription with
            rotating cuisines, macros, and ingredient sourcing that fits your schedule.
          </p>
          <div className="flex gap-2 items-center text-sm text-gray-700">
            <a href="#menus" className="underline">
              View current menus
            </a>
            {assignedClient ? (
              <span>
                for <strong>{assignedClient}</strong>
              </span>
            ) : (
              <span className="italic">no client assigned yet</span>
            )}
          </div>
        </section>

        {false && (
          <section id="menus" className="space-y-4">
            <h3 className="text-2xl font-bold">Current Menus</h3>
            {loading ? (
              <p>Loading menus…</p>
            ) : error ? (
              <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded">
                <p className="font-semibold">{error}</p>
                <p className="text-sm mt-1">
                  If this persists, ensure Sanity env vars are set on the web app (VITE_APP_SANITY_PROJECT_ID,
                  VITE_APP_SANITY_DATASET) and that the Studio has the new Meal Prep Menu content.
                </p>
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

        <section className="space-y-4">
          <h3 className="text-2xl font-bold">Meal Prep Minneapolis Gallery</h3>
          <PhotoGrid tags="mealplan" perPage={24} masonry />
        </section>

        <section className="space-y-6">
          <h3 className="text-2xl font-bold">Meal Plan Options</h3>
          <div className="grid md:grid-cols-2 gap-6">
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
                    Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at ~1800 calories/day.
                  </p>
                </div>
              </div>
            </div>

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
                  <p className="text-body">
                    We tailor plans to your needs (gluten-free, vegetarian, high-protein, etc.). Tell us your goals and
                    preferences and we’ll propose a weekly plan and schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ visually hidden per request (keeping JSON-LD in <Helmet> for SEO). Restore by setting condition to true. */}
        {false && (
          <section className="space-y-4" id="meal-prep-faq">
            <h3 className="text-2xl font-bold">Meal Prep Minneapolis FAQ</h3>
            <div className="space-y-6">
              {mealPrepFaq.map((item) => (
                <div key={item.question} className="border border-gray-200 rounded-lg p-6">
                  <h4 className="text-xl font-semibold">{item.question}</h4>
                  <p className="text-gray-700 mt-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
        const q =
          `*[_type == "blogPost"] | order(publishedAt desc)[0...3]{ title, "slug": slug.current, excerpt, publishedAt }`;
        const items = await client.fetch(q);
        if (mounted) setPosts(items || []);
      } catch (_) {
        // ignore blog fetch errors
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  if (!posts.length) return null;
  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Weekly Meal Prep Journal</h3>
        <Link to="/weekly" className="text-sm underline">
          View more
        </Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <article key={p.slug} className="rounded-md ring-1 ring-neutral-200 p-4">
            <h4 className="text-lg font-semibold">
              <Link to={`/weekly/${p.slug}`} className="hover:underline">
                {p.title}
              </Link>
            </h4>
            <div className="text-sm text-gray-500 mt-1">
              {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}
            </div>
            {p.excerpt && <p className="text-gray-700 mt-2">{p.excerpt}</p>}
            <div className="mt-3">
              <Link to={`/weekly/${p.slug}`} className="btn btn-ghost px-3 py-1 text-sm">
                Read
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
