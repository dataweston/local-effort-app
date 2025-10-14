import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';

/**
 * PizzaProgress - Shows funding progress with pizza count and goal
 * Simple, visual component - no complex state or side effects
 */
export const PizzaProgress = ({ pizzas = 0, backers = 0, goal = 1000 }) => {
  const percentage = goal > 0 ? Math.min(100, (pizzas / goal) * 100) : 0;
  const remaining = Math.max(0, goal - pizzas);

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Pizza Count */}
          <div className="text-center">
            <div className="text-6xl font-bold text-orange-600 mb-2">
              {pizzas.toLocaleString()}
            </div>
            <div className="text-lg text-neutral-700">
              {pizzas === 1 ? 'pizza funded' : 'pizzas funded'}
            </div>
            {backers > 0 && (
              <div className="text-sm text-neutral-600 mt-1">
                {backers.toLocaleString()} {backers === 1 ? 'backer' : 'backers'}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-sm text-neutral-600">
              <span>{percentage.toFixed(0)}% of goal</span>
              <span className="font-medium">{goal.toLocaleString()} pizzas</span>
            </div>
          </div>

          {/* Remaining */}
          {remaining > 0 && (
            <div className="text-center text-sm text-neutral-600">
              <span className="font-semibold text-orange-600">{remaining.toLocaleString()}</span> more pizzas needed
            </div>
          )}

          {/* Success message */}
          {pizzas >= goal && (
            <div className="text-center text-lg font-semibold text-green-600">
              🎉 Goal reached! Thank you!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

PizzaProgress.propTypes = {
  pizzas: PropTypes.number,
  backers: PropTypes.number,
  goal: PropTypes.number,
};
