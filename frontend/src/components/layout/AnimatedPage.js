// src/components/layout/AnimatedPage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../utils/animations';

export const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="optimize-rendering"
    >
      {children}
    </motion.div>
  );
};