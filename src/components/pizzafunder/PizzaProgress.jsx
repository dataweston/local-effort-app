import React from 'react';
import PropTypes from 'prop-types';
import { Progress } from '../ui/progress';
import { motion } from 'framer-motion';

/**
 * PizzaProgress - Compact, modern funding progress display
 * Redesigned for better visual hierarchy and reduced vertical space
 */
export const PizzaProgress = ({ pizzas = 0, backers = 0, goal = 1000 }) => {
  const percentage = goal > 0 ? Math.min(100, (pizzas / goal) * 100) : 0;
  const remaining = Math.max(0, goal - pizzas);
  const isComplete = pizzas >= goal;

  return (
    <div className="space-y-4">
      {/* Stats Row - Compact horizontal layout */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-red-600 bg-clip-text text-transparent">
            {pizzas.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-neutral-600 mt-1">
            Pizzas Funded
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-4xl font-bold text-neutral-700">
            {backers.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-neutral-600 mt-1">
            {backers === 1 ? 'Backer' : 'Backers'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-4xl font-bold text-neutral-700">
            {goal.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-neutral-600 mt-1">
            Goal
          </div>
        </motion.div>
      </div>

      {/* Progress Bar - Enhanced with gradient */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="space-y-2"
      >
        <div className="relative">
          <Progress 
            value={percentage} 
            className="h-4 bg-neutral-200" 
            indicatorClassName="bg-gradient-to-r from-orange-500 to-red-500"
          />
          {/* Percentage overlay on progress bar */}
          {percentage > 10 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow-lg">
                {percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-600">
            {percentage < 10 && (
              <span className="font-semibold text-orange-600">{percentage.toFixed(1)}%</span>
            )}
          </span>
          <span className="text-neutral-600">
            {isComplete ? (
              <span className="font-bold text-green-600">✓ Goal Reached!</span>
            ) : remaining > 0 ? (
              <>
                <span className="font-semibold text-orange-600">{remaining.toLocaleString()}</span>
                {' '}more needed
              </>
            ) : null}
          </span>
        </div>
      </motion.div>

      {/* Success Banner */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg"
        >
          <p className="text-lg font-bold text-green-700">
            🎉 Thank you for your amazing support!
          </p>
        </motion.div>
      )}
    </div>
  );
};

PizzaProgress.propTypes = {
  pizzas: PropTypes.number,
  backers: PropTypes.number,
  goal: PropTypes.number,
};
