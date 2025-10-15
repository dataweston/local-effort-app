import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { PortableText } from '@portabletext/react';
import { groqFetch } from '../sanityClient.js';
import { PizzaProgress } from '../components/pizzafunder/PizzaProgress';
import { PizzaPledgeForm } from '../components/pizzafunder/PizzaPledgeForm';
import { FeedbackForm } from '../components/pizzafunder/FeedbackForm';
import { FeedbackList } from '../components/pizzafunder/FeedbackList';
import { useToast } from '../components/common/ToastProvider';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import PrioritiesPie from '../components/crowdfunding/PrioritiesPie.jsx';

/**
 * PizzaFunderPage - Modern, Sanity-powered pizza crowdfunding page
 * Enhanced with Sanity CMS integration and modern design
 * Pattern: Similar to CrowdfundingPage but simplified for single campaign focus
 */
const PizzaFunderPage = () => {
  // State - simple and minimal
  const [campaignData, setCampaignData] = useState(null);
  const [status, setStatus] = useState({ pizzas: 0, backers: 0, goal: 1000, source: 'loading' });
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState({ campaign: true, status: true, feedback: true });
  const [submitting, setSubmitting] = useState({ pledge: false, feedback: false });
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [activeTab, setActiveTab] = useState('story');
  const [selectedTier, setSelectedTier] = useState(null);
  
  // Gallery state
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const galleryLoadedRef = useRef(false);
  
  // Email subscription state
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle');
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const { toast } = useToast();

  // Portable Text components
  const portableComponents = useMemo(() => createPortableTextComponents(), []);

  // Fetch campaign data from Sanity
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Query Sanity for pizzafunder campaign data
        const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
          title,
          description,
          pizzaGoal,
          pizzasSold,
          piesSold,
          goal,
          raisedAmount,
          backers,
          endDate,
          heroImage{
            asset->{
              _id,
              url
            },
            alt
          },
          story,
          goals,
          events[]{
            _key,
            location,
            tagline,
            summary,
            startDate,
            endDate,
            timingNote,
            foodType,
            status,
            ticketsUrl,
            ctaLabel,
            locationDetails,
            "heroImage": heroImage.asset->url,
            "heroImageAlt": coalesce(heroImage.alt, location),
            description
          },
          "featuredPublicEvents": featuredPublicEvents[]->{ 
            _id, 
            location,
            tagline,
            summary,
            startDate, 
            endDate, 
            timingNote,
            foodType,
            status,
            ticketsUrl,
            ctaLabel,
            locationDetails,
            "heroImage": heroImage.asset->url,
            "heroImageAlt": coalesce(heroImage.alt, location),
            description
          },
          faq,
          "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
          "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
        }`;

        const data = await groqFetch(query, { slug: 'local-pizza-by-local-effort-let-s-make-1000-pizzas' });
        
        if (mounted) {
          setCampaignData(data || null);
          setLoading((prev) => ({ ...prev, campaign: false }));
        }
      } catch (err) {
        console.error('Failed to load campaign data:', err);
        if (mounted) {
          setLoading((prev) => ({ ...prev, campaign: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch funding status on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/pizzafunder/status');
        const data = res.ok ? await res.json() : { pizzas: 0, backers: 0, goal: 1000, source: 'error' };
        if (mounted) {
          setStatus(data);
          setLoading((prev) => ({ ...prev, status: false }));
        }
      } catch {
        if (mounted) {
          setStatus({ pizzas: 0, backers: 0, goal: 1000, source: 'error' });
          setLoading((prev) => ({ ...prev, status: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch feedback on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/pizzafunder/feedback?limit=8');
        const data = res.ok ? await res.json() : { entries: [] };
        if (mounted) {
          setFeedback(data.entries || []);
          setLoading((prev) => ({ ...prev, feedback: false }));
        }
      } catch {
        if (mounted) {
          setFeedback([]);
          setLoading((prev) => ({ ...prev, feedback: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Handle pledge form submission (collects data, shows payment)
  // Handle pledge form submission (now receives tokenized payment data)
  const handlePledgeSubmit = async (data) => {
    setSubmitting((prev) => ({ ...prev, pledge: true }));

    try {
      // Call backend to process payment via Square API
      const res = await fetch('/api/pizzafunder/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), // data already includes sourceId from Square tokenization
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast({
          title: 'Thank you!',
          description: result.message || 'Your pledge was successful!',
        });

        // Refresh status
        const statusRes = await fetch('/api/pizzafunder/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
        }

        // Reset form
        setShowPledgeForm(false);
        setSelectedTier(null);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      toast({
        title: 'Payment failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      throw error; // Re-throw so PizzaPledgeForm knows it failed
    } finally {
      setSubmitting((prev) => ({ ...prev, pledge: false }));
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (data) => {
    setSubmitting((prev) => ({ ...prev, feedback: true }));

    try {
      const res = await fetch('/api/pizzafunder/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast({
          title: 'Thank you!',
          description: 'Your feedback has been shared!',
        });

        // Add to local list
        setFeedback((prev) => [result.feedback, ...prev].slice(0, 8));
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error) {
      toast({
        title: 'Failed to submit',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting((prev) => ({ ...prev, feedback: false }));
    }
  };

  // Handle email subscription
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscribeEmail || subscribeStatus === 'loading') return;

    setSubscribeStatus('loading');
    setSubscribeMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSubscribeStatus('success');
        setSubscribeMessage('Thanks for subscribing!');
        setSubscribeEmail('');
      } else {
        throw new Error(result.error || 'Subscription failed');
      }
    } catch (error) {
      setSubscribeStatus('error');
      setSubscribeMessage(error.message || 'Failed to subscribe. Please try again.');
    }
  };

  // Lazy load gallery images when tab is activated
  useEffect(() => {
    if (activeTab !== 'gallery' || galleryLoadedRef.current || galleryLoading) return;

    let mounted = true;
    galleryLoadedRef.current = true;

    (async () => {
      setGalleryLoading(true);
      setGalleryError('');

      try {
        // Fetch pizza and pie images from Cloudinary
        const [pizzaRes, pieRes] = await Promise.all([
          fetch('/api/search-images?query=pizza'),
          fetch('/api/search-images?query=pie'),
        ]);

        if (!mounted) return;

        const [pizzaData, pieData] = await Promise.all([
          pizzaRes.json(),
          pieRes.json(),
        ]);

        // Combine and deduplicate images
        const allImages = [...(pizzaData.resources || []), ...(pieData.resources || [])];
        const uniqueImages = Array.from(
          new Map(allImages.map((img) => [img.public_id, img])).values()
        );

        if (mounted) {
          setGalleryImages(uniqueImages);
          setGalleryLoading(false);
        }
      } catch (error) {
        console.error('Failed to load gallery:', error);
        if (mounted) {
          setGalleryError('Failed to load images');
          setGalleryLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [activeTab, galleryLoading]);

  return (
    <div className="space-y-12 mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12">
      <Helmet>
        <title>{campaignData?.title || 'Pizza Funder'} | Local Effort</title>
        <meta 
          name="description" 
          content={campaignData?.description?.[0]?.children?.[0]?.text || "Help us bring delicious pizza to the community! Back our pizza crowdfunding campaign."} 
        />
        <link rel="canonical" href="https://localeffortfood.com/pizzafunder" />
      </Helmet>

      {/* Hero Section with Image */}
      {campaignData?.heroImage?.asset?.url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full h-[400px] md:h-[500px] -mx-4 md:-mx-6 lg:-mx-8 rounded-none md:rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={campaignData.heroImage.asset.url}
            alt={campaignData.heroImage.alt || campaignData.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-4"
            >
              {campaignData.title}
            </motion.h1>
            {campaignData.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg md:text-xl text-white/90 max-w-3xl prose prose-invert"
              >
                <PortableText value={campaignData.description} components={portableComponents} />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* No hero image fallback */}
      {!campaignData?.heroImage && !loading.campaign && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            {campaignData?.title || '🍕 Pizza Funder'}
          </h1>
          {campaignData?.description && (
            <div className="text-xl text-neutral-700 max-w-2xl mx-auto prose">
              <PortableText value={campaignData.description} components={portableComponents} />
            </div>
          )}
          {!campaignData && (
            <p className="text-xl text-neutral-700 max-w-2xl mx-auto">
              Help us bring artisanal, wood-fired pizza to the community!
              Every pledge helps us reach our goal.
            </p>
          )}
        </motion.div>
      )}

      {/* Compact Progress Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 shadow-lg border-2 border-orange-100 bg-gradient-to-br from-white to-orange-50/30">
          <PizzaProgress
            pizzas={status.pizzas}
            backers={status.backers}
            goal={campaignData?.pizzaGoal || status.goal}
          />
        </Card>
      </motion.div>

      {/* Reward Tiers Section */}
      {campaignData?.rewardTiers && campaignData.rewardTiers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-bold text-neutral-900">Choose Your Reward</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignData.rewardTiers.map((tier, index) => {
              const isSelected = selectedTier?.amount === tier.amount;
              const pizzaLabel = tier.pizzaCount ? `${tier.pizzaCount} Pizza${tier.pizzaCount > 1 ? 's' : ''}` : null;
              const pieLabel = tier.pieCount ? `${tier.pieCount} Pie${tier.pieCount > 1 ? 's' : ''}` : null;
              const displayLabel = pizzaLabel || pieLabel || `$${tier.amount}`;

              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-orange-500 shadow-lg' : ''
                  }`}
                  onClick={() => {
                    setSelectedTier(tier);
                    setShowPledgeForm(true);
                  }}
                >
                  <div className="p-6 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-neutral-900">{displayLabel}</h3>
                      <span className="text-2xl font-bold text-orange-600">${tier.amount}</span>
                    </div>
                    <p className="text-lg font-semibold text-neutral-700">{tier.title}</p>
                    <p className="text-sm text-neutral-600">{tier.description}</p>
                    {tier.limit && (
                      <p className="text-xs font-semibold uppercase text-orange-600">
                        Limited - {tier.limit} available
                      </p>
                    )}
                    <Button
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTier(tier);
                        setShowPledgeForm(true);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select This Reward'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Content Tabs (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Hero Image - matching /crowdfunding style */}
          {campaignData?.heroImage?.asset?.url ? (
            <img
              src={campaignData.heroImage.asset.url}
              alt={campaignData.heroImage.alt || campaignData.title}
              className="w-full object-cover rounded-lg aspect-video bg-gray-100"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
              <div className="text-6xl">🍕</div>
            </div>
          )}

          <Card className="p-6 shadow-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              {/* Story Tab */}
              <TabsContent value="story" className="mt-0 prose prose-neutral max-w-none">
                {campaignData?.story ? (
                  <PortableText value={campaignData.story} components={portableComponents} />
                ) : (
                  <>
                    <h2>Our Pizza Mission</h2>
                    <p>
                      We're on a mission to bring authentic, wood-fired pizza to our community.
                      Your support helps us purchase ingredients, equipment, and make this dream a reality.
                    </p>
                    <h3>What We're Making</h3>
                    <ul>
                      <li>Authentic Neapolitan-style pizza</li>
                      <li>Fresh, locally-sourced ingredients</li>
                      <li>Wood-fired perfection</li>
                      <li>Community gathering experiences</li>
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* Goals Tab */}
              <TabsContent value="goals" className="mt-0 prose prose-neutral max-w-none">
                <div className="mb-8 not-prose">
                  <PrioritiesPie />
                </div>
                {campaignData?.goals ? (
                  <PortableText value={campaignData.goals} components={portableComponents} />
                ) : (
                  <>
                    <h2>Campaign Goals</h2>
                    <p>
                      Our goal is to make {campaignData?.pizzaGoal || status.goal} pizzas for the community.
                      Every pledge brings us closer to this goal!
                    </p>
                    <h3>How Your Support Helps</h3>
                    <ul>
                      <li>Purchase high-quality ingredients</li>
                      <li>Cover equipment and materials</li>
                      <li>Support local farmers and suppliers</li>
                      <li>Create jobs in the community</li>
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="mt-0 space-y-6">
                {campaignData?.faq && campaignData.faq.length > 0 ? (
                  campaignData.faq.map((item, index) => (
                    <div key={index} className="pb-4 border-b border-neutral-200 last:border-0">
                      <h4 className="font-bold text-lg mb-2 text-neutral-900">{item.question}</h4>
                      <p className="text-neutral-700 leading-relaxed">{item.answer}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="pb-4 border-b border-neutral-200">
                      <h4 className="font-semibold text-lg mb-2">When will pizzas be ready?</h4>
                      <p className="text-neutral-700">We're planning pizza events throughout the campaign and after we reach our goal!</p>
                    </div>
                    <div className="pb-4 border-b border-neutral-200">
                      <h4 className="font-semibold text-lg mb-2">Can I get my pizza delivered?</h4>
                      <p className="text-neutral-700">Yes! You can choose delivery, pickup, or attend a public pizza party.</p>
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-lg mb-2">What if you don't reach the goal?</h4>
                      <p className="text-neutral-700">We're committed to making pizza happen! Your pledge supports the mission regardless.</p>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Updates Tab */}
              <TabsContent value="updates" className="mt-0 space-y-6">
                {campaignData?.updates && campaignData.updates.length > 0 ? (
                  campaignData.updates.map((update, index) => {
                    const publishDate = update.publishedAt ? new Date(update.publishedAt) : null;
                    return (
                      <div key={index} className="pb-6 border-b border-neutral-200 last:border-0">
                        <h3 className="font-bold text-xl mb-2 text-neutral-900">{update.title}</h3>
                        {publishDate && (
                          <p className="text-sm text-neutral-500 mb-3">
                            {publishDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                        <div className="prose prose-neutral max-w-none">
                          <PortableText value={update.body} components={portableComponents} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-neutral-600">Campaign updates will appear here. Stay tuned!</p>
                )}
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="mt-0">
                {galleryLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-neutral-600">Loading gallery...</p>
                  </div>
                ) : galleryError ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-red-600">{galleryError}</p>
                  </div>
                ) : galleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryImages.map((img) => (
                      <motion.div
                        key={img.public_id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
                        <img
                          src={img.secure_url}
                          alt={img.public_id}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-neutral-600">No images to display yet.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Right Column: Pledge Form (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="sticky top-6 space-y-6">
            {!showPledgeForm ? (
              <Card className="p-8 shadow-xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">🍕</div>
                  <h3 className="text-2xl font-bold text-neutral-900">Back This Project</h3>
                  <p className="text-neutral-700">
                    Help us make amazing pizza for the community!
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setShowPledgeForm(true)}
                    className="w-full text-lg py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    Make a Pledge
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 shadow-xl">
                <PizzaPledgeForm
                  onPledge={handlePledgeSubmit}
                  loading={submitting.pledge}
                  selectedTier={selectedTier}
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowPledgeForm(false)}
                  className="w-full mt-4"
                >
                  Cancel
                </Button>
              </Card>
            )}

            {/* How it Works */}
            <Card className="p-6 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">How it Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-3 text-neutral-700">
                  <li>
                    <strong>Order by Dec 31, 2024</strong> – Pre-order your pizzas now through our crowdfunding campaign
                  </li>
                  <li>
                    <strong>We'll make them in January 2025</strong> – Once we reach our goal, we'll start baking
                  </li>
                  <li>
                    <strong>Pick up fresh on event day</strong> – Get your hot, delicious pizzas at the designated pickup location
                  </li>
                  <li>
                    <strong>All or nothing</strong> – If we don't reach the goal, you won't be charged
                  </li>
                  <li>
                    <strong>Support local</strong> – Your order helps bring community together through great food
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Email Subscription */}
            <Card className="p-6 shadow-lg bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Follow Along</CardTitle>
                <CardDescription className="text-slate-300">
                  Get updates on our pizza-making progress!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <Label htmlFor="subscribe-email" className="text-white">Email</Label>
                    <Input
                      id="subscribe-email"
                      type="email"
                      placeholder="your@email.com"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      required
                      disabled={subscribeStatus === 'loading'}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={subscribeStatus === 'loading'}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </Button>
                  {subscribeMessage && (
                    <p className={`text-sm ${subscribeStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {subscribeMessage}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-16"
      >
        <h2 className="text-4xl font-bold text-neutral-900 mb-2 text-center">
          Pizza Love 🍕❤️
        </h2>
        <p className="text-xl text-neutral-600 mb-8 text-center">
          Share your excitement and see what others are saying!
        </p>

        <Card className="p-8 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feedback Form */}
            <div>
              <h3 className="text-2xl font-semibold text-neutral-800 mb-4">
                Share Your Thoughts
              </h3>
              <FeedbackForm
                onSubmit={handleFeedbackSubmit}
                loading={submitting.feedback}
              />
            </div>

            {/* Feedback List */}
            <div>
              <h3 className="text-2xl font-semibold text-neutral-800 mb-4">
                What People Are Saying
              </h3>
              <FeedbackList
                entries={feedback}
                loading={loading.feedback}
              />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default PizzaFunderPage;
