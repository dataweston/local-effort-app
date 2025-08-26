// src/components/layout/LoadingSpinner.jsx
import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner = () => (
  <motion.div 
    className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="text-center">
      <motion.div
        className="w-16 h-16 mx-auto mb-4 border-4 border-orange-200 border-t-orange-500 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p 
        className="text-gray-600 font-medium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Preparing something delicious...
      </motion.p>
    </div>
  </motion.div>
);
