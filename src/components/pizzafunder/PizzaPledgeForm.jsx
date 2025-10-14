import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Minus, Plus } from 'lucide-react';

/**
 * PizzaPledgeForm - Simple pledge form component
 * No Square integration here - just collects pledge details
 */
export const PizzaPledgeForm = ({ onPledge, loading = false }) => {
  const [pizzaCount, setPizzaCount] = useState(1);
  const [funderName, setFunderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [rewardPreference, setRewardPreference] = useState('public pizza party');

  const pricePerPizza = 20; // $20 per pizza
  const total = pizzaCount * pricePerPizza;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!funderName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }

    onPledge({
      pizzaCount,
      funderName: funderName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      rewardPreference,
      totalCents: total * 100,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Back This Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pizza Counter */}
          <div className="space-y-2">
            <Label htmlFor="pizzaCount">Number of Pizzas</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPizzaCount(Math.max(1, pizzaCount - 1))}
                disabled={pizzaCount <= 1 || loading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-orange-600">{pizzaCount}</div>
                <div className="text-sm text-neutral-600">
                  {pizzaCount === 1 ? 'pizza' : 'pizzas'} × ${pricePerPizza} = ${total}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPizzaCount(pizzaCount + 1)}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="funderName">Your Name</Label>
            <Input
              id="funderName"
              value={funderName}
              onChange={(e) => setFunderName(e.target.value)}
              placeholder="John Doe"
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              disabled={loading}
              required
            />
          </div>

          {/* Phone (optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>

          {/* Reward Preference */}
          <div className="space-y-2">
            <Label htmlFor="rewardPreference">How would you like your pizza?</Label>
            <select
              id="rewardPreference"
              value={rewardPreference}
              onChange={(e) => setRewardPreference(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            >
              <option value="public pizza party">Public pizza party</option>
              <option value="deliver to my home">Deliver to my home</option>
              <option value="make live at my home">Make live at my home</option>
              <option value="frozen pizza">Frozen pizza</option>
              <option value="i'm open or i'm not sure">I'm open / Not sure</option>
            </select>
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Special requests or notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any dietary restrictions, delivery preferences, etc."
              rows={3}
              disabled={loading}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? 'Processing...' : `Pledge $${total} for ${pizzaCount} pizza${pizzaCount > 1 ? 's' : ''}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

PizzaPledgeForm.propTypes = {
  onPledge: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
