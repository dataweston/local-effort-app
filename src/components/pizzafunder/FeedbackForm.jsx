import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Star } from 'lucide-react';

/**
 * FeedbackForm - Simple feedback submission
 * Posts to backend API, no direct Firebase
 */
export const FeedbackForm = ({ onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      alert('Please share your thoughts about the pizza!');
      return;
    }

    onSubmit({ name: name.trim() || 'Anonymous', comment: comment.trim(), rating });
    
    // Reset form
    setName('');
    setComment('');
    setRating(5);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Pizza Love</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CardContent>
          {/* Rating */}
          <div className="space-y-2">
            <Label>How much did you love it?</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={loading}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="feedbackName">Name (optional)</Label>
            <Input
              id="feedbackName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leave blank for 'Anonymous'"
              disabled={loading}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="feedbackComment">Your thoughts</Label>
            <Textarea
              id="feedbackComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved about the pizza..."
              rows={4}
              disabled={loading}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Share Feedback'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

FeedbackForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
