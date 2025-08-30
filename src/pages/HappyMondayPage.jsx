import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
const BlockContent = lazy(() => import('@sanity/block-content-to-react'));
import sanityClient from '../sanityClient.js';
import FoodItemCard from '../components/menu/FoodItemCard';
const FoodItemModal = lazy(() => import('../components/menu/FoodItemModal'));
const FeedbackForm = lazy(() => import('../components/menu/FeedbackForm'));
const LoadingSpinner = lazy(() => import('../components/layout/LoadingSpinner'));
import ErrorBoundary from '../components/ErrorBoundary';

const HappyMondayPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [pageContent, setPageContent] = useState(null); // State for the new content
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This query fetches both menu items and the page content in one request
    const query = `{
      "menuItems": *[_type == "menuItems"],
      "pageContent": *[_type == "happyMondayPage"][0]
    }`;

    sanityClient
      .fetch(query)
      .then((data) => {
        setMenuItems(data.menuItems || []);
        setPageContent(data.pageContent); // Set the new page content
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleCardClick = (item) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  return (
    <>
      <Helmet>
        <title>Happy Monday | Local Effort</title>
        <meta
          name="description"
          content="Explore our special Happy Monday menu, made with the finest local ingredients."
        />
      </Helmet>

      <div className="space-y-24 mb-24">
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          {/* Render the dynamic content box */}
          {pageContent && (
            <div className="text-center mb-12">
              <h2 className="text-heading uppercase mb-4">{pageContent.title}</h2>
              {/* The BlockContent component renders rich text. Wrap lazy import in Suspense + ErrorBoundary */}
              <div className="prose lg:prose-lg mx-auto max-w-3xl">
                <ErrorBoundary>
                  <Suspense fallback={<div className="text-center">Loading content…</div>}>
                    <BlockContent blocks={pageContent.body} client={sanityClient} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          )}

          <Suspense fallback={<div className="flex justify-center items-center h-64">Loading…</div>}>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <motion.div
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="initial"
                animate="animate"
                variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
              >
                {menuItems.map((item) => (
                  <FoodItemCard key={item._id} item={item} onClick={() => handleCardClick(item)} />
                ))}
              </motion.div>
            )}
          </Suspense>
        </section>

          <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <h2 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">Feedback</h2>
          <p className="text-body mb-8 max-w-2xl">
            Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your
            input helps us grow and improve.
          </p>
          <ErrorBoundary>
            <Suspense fallback={<div className="text-center p-8">Loading form…</div>}>
              <FeedbackForm />
            </Suspense>
          </ErrorBoundary>
        </section>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <ErrorBoundary>
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center">Loading…</div>}>
              <FoodItemModal item={selectedItem} onClose={handleCloseModal} />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </>
  );
};

export default HappyMondayPage;
