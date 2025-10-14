import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useSquarePayments } from '../lib/useSquarePayments';
import { PizzaProgress } from '../components/pizzafunder/PizzaProgress';
import { PizzaPledgeForm } from '../components/pizzafunder/PizzaPledgeForm';
import { FeedbackForm } from '../components/pizzafunder/FeedbackForm';
import { FeedbackList } from '../components/pizzafunder/FeedbackList';
import { useToast } from '../components/common/ToastProvider';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

/**
 * PizzaFunderPage - Simple, reliable pizza crowdfunding page
 * Follows SalePage architecture pattern:
 * - All data from backend APIs (no direct Firebase)
 * - Simple state management
 * - Graceful error handling
 * - Square payments integration
 */
const PizzaFunderPage = () => {
  // State - simple and minimal
  const [status, setStatus] = useState({ pizzas: 0, backers: 0, goal: 1000, source: 'loading' });
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState({ status: true, feedback: true });
  const [submitting, setSubmitting] = useState({ pledge: false, feedback: false });
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [pledgeData, setPledgeData] = useState(null);

  const { toast } = useToast();
  const { card, payments } = useSquarePayments();

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
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <Helmet>
        <title>Pizza Funder | Local Effort</title>
        <meta name="description" content="Help us bring delicious pizza to the community! Back our pizza crowdfunding campaign." />
        <link rel="canonical" href="https://localeffortfood.com/pizzafunder" />
      </Helmet>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl font-bold text-orange-600 mb-4">🍕 Pizza Funder</h1>
        <p className="text-xl text-neutral-700 max-w-2xl mx-auto">
          Help us bring artisanal, wood-fired pizza to the community!
          Every pledge helps us reach our goal.
        </p>
      </motion.div>

      {/* Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <PizzaProgress
          pizzas={status.pizzas}
          backers={status.backers}
          goal={status.goal}
        />
      </motion.div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left: Pledge Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!showPledgeForm ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Button
                size="lg"
                onClick={() => setShowPledgeForm(true)}
                className="text-lg px-8 py-6"
              >
                Back This Project
              </Button>
            </div>
          ) : (
            <PizzaPledgeForm
              onPledge={handlePledgeSubmit}
              loading={submitting.pledge}
            />
          )}
        </motion.div>

        {/* Right: Tabs (Story, FAQ, Updates) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="story" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="story">Story</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="mt-4 prose prose-neutral max-w-none">
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
            </TabsContent>

            <TabsContent value="faq" className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-lg mb-2">When will pizzas be ready?</h4>
                <p className="text-neutral-700">We're planning pizza events throughout the campaign and after we reach our goal!</p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Can I get my pizza delivered?</h4>
                <p className="text-neutral-700">Yes! You can choose delivery, pickup, or attend a public pizza party.</p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">What if you don't reach the goal?</h4>
                <p className="text-neutral-700">We're committed to making pizza happen! Your pledge supports the mission regardless.</p>
              </div>
            </TabsContent>

            <TabsContent value="updates" className="mt-4">
              <p className="text-neutral-600">Campaign updates will appear here. Stay tuned!</p>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold text-neutral-800 mb-6">Pizza Love</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Form */}
          <FeedbackForm
            onSubmit={handleFeedbackSubmit}
            loading={submitting.feedback}
          />

          {/* Feedback List */}
          <div>
            <h3 className="text-xl font-semibold text-neutral-700 mb-4">
              What people are saying
            </h3>
            <FeedbackList
              entries={feedback}
              loading={loading.feedback}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PizzaFunderPage;
