import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '../ui/card';
import { Star } from 'lucide-react';

/**
 * FeedbackList - Displays pizza feedback entries
 * Simple display component - no Firebase, just renders data
 */
export const FeedbackList = ({ entries = [], loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-neutral-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-full mb-1" />
              <div className="h-3 bg-neutral-200 rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-neutral-500">
          No feedback yet. Be the first to share your pizza love!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Rating Stars */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= entry.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-neutral-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-neutral-700">
                {entry.name || 'Anonymous'}
              </span>
            </div>

            {/* Comment */}
            <p className="text-neutral-700 leading-relaxed">
              {entry.comment}
            </p>

            {/* Date (if available) */}
            {entry.createdAt && (
              <div className="mt-2 text-xs text-neutral-500">
                {new Date(entry.createdAt).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

FeedbackList.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      comment: PropTypes.string.isRequired,
      rating: PropTypes.number.isRequired,
      createdAt: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
};
