import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';

import FoodItemCard from '../components/menu/FoodItemCard';
import FoodItemModal from '../components/menu/FoodItemModal';
import FeedbackForm from '../components/menu/FeedbackForm';

// Data extracted directly from the provided GitHub link
const menuItems = [
  {
    id: '1',
    name: 'Sourdough Loaf',
    description: 'Classic sourdough bread, perfect for sandwiches or toast.',
    ingredients: ['Flour', 'Water', 'Salt', 'Sourdough Starter'],
  },
  {
    id: '2',
    name: 'Pizza Dough',
    description: 'Ready-to-use pizza dough for a delicious homemade pizza.',
    ingredients: ['Flour', 'Water', 'Salt', 'Yeast', 'Olive Oil'],
  },
  {
    id: '3',
    name: 'Bagels (6-pack)',
    description: 'Freshly baked bagels, available in plain, sesame, or everything.',
    ingredients: ['Flour', 'Water', 'Salt', 'Yeast', 'Malt'],
  },
  {
    id: '4',
    name: 'Focaccia',
    description: 'Light and airy focaccia with rosemary and sea salt.',
    ingredients: ['Flour', 'Water', 'Salt', 'Yeast', 'Olive Oil', 'Rosemary'],
  },
  {
    id: '5',
    name: 'Dinner Rolls (Dozen)',
    description: 'Soft and fluffy dinner rolls, a perfect side for any meal.',
    ingredients: ['Flour', 'Water', 'Salt', 'Yeast', 'Butter', 'Milk'],
  },
  {
    id: '6',
    name: 'Cinnamon Rolls (4-pack)',
    description: 'Gooey and delicious cinnamon rolls with a cream cheese frosting.',
    ingredients: ['Flour', 'Butter', 'Sugar', 'Cinnamon', 'Cream Cheese'],
  },
];


const HappyMondayPage = () => {
  // We no longer need isLoading or useEffect for menu items
  const [selectedItem, setSelectedItem] = useState(null);

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
        <meta name="description" content="Explore our special Happy Monday menu, made with the finest local ingredients." />
      </Helmet>

      <div className="space-y-24 mb-24">
        {/* Menu Items Section */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <h2 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">Happy Monday Menu</h2>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.1 } }
            }}
          >
            {/* The component now maps over the local menuItems array */}
            {menuItems.map(item => (
              <FoodItemCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
            ))}
          </motion.div>
        </section>

        {/* Feedback Section (This remains unchanged) */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            <h2 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">Feedback</h2>
            <p className="text-body mb-8 max-w-2xl">Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your input helps us grow and improve.</p>
            <FeedbackForm />
        </section>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <FoodItemModal item={selectedItem} onClose={handleCloseModal} />
        )}
      </AnimatePresence>
    </>
  );
};

export default HappyMondayPage;
