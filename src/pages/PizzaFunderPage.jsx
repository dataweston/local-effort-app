import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { PortableText } from '@portabletext/react';
import { groqFetch } from '../sanityClient.js';
import { useSquarePayments } from '../lib/useSquarePayments';
import { PizzaProgress } from '../components/pizzafunder/PizzaProgress';
import { PizzaPledgeForm } from '../components/pizzafunder/PizzaPledgeForm';
import { FeedbackForm } from '../components/pizzafunder/FeedbackForm';
import { FeedbackList } from '../components/pizzafunder/FeedbackList';
import { useToast } from '../components/common/ToastProvider';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import imageUrlBuilder from '@sanity/image-url';
import sanityClient from '../sanityClient.js';

// Image URL builder for Sanity
const builder = imageUrlBuilder(sanityClient);
function urlFor(source) {
  return builder.image(source);
}

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
  const [pledgeData, setPledgeData] = useState(null);
  const [activeTab, setActiveTab] = useState('story');

  const { toast } = useToast();
  const { card, payments } = useSquarePayments();

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
          goal,
          raisedAmount,
          backers,
          endDate,
          heroImage,
          story,
          goals,
          faq,
          "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
        }`;

        const data = await groqFetch(query, { slug: 'pizzafunder' });
        
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
  const handlePledgeSubmit = (data) => {
    setPledgeData(data);
    // Payment will be triggered when pledgeData is set
  };

  // Handle Square payment
  useEffect(() => {
    if (!pledgeData || !card || !payments || submitting.pledge) return;

    (async () => {
      setSubmitting((prev) => ({ ...prev, pledge: true }));

      try {
        const result = await card.tokenize();
        if (result.status === 'OK') {
          // Call backend to process payment via Square API
          const res = await fetch('/api/pizzafunder/pledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...pledgeData,
              sourceId: result.token, // Square payment token
            }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            toast({
              title: 'Thank you!',
              description: data.message || 'Your pledge was successful!',
            });

            // Refresh status
            const statusRes = await fetch('/api/pizzafunder/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setStatus(statusData);
            }

            // Reset form
            setShowPledgeForm(false);
            setPledgeData(null);
          } else {
            throw new Error(data.error || 'Payment failed');
          }
        } else {
          throw new Error(result.errors?.[0]?.message || 'Payment failed');
        }
      } catch (error) {
        toast({
          title: 'Payment failed',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setSubmitting((prev) => ({ ...prev, pledge: false }));
        setPledgeData(null);
      }
    })();
  }, [pledgeData, card, payments, submitting.pledge, toast]);

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
      {campaignData?.heroImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full h-[400px] md:h-[500px] -mx-4 md:-mx-6 lg:-mx-8 rounded-none md:rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={urlFor(campaignData.heroImage).width(1400).height(600).url()}
            alt={campaignData.title}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Content Tabs (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 shadow-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
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
          <div className="sticky top-6">
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
