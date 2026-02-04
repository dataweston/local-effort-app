import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Minus, Plus } from 'lucide-react';
import { useSquarePayments } from '../../lib/useSquarePayments';
import { useToast } from '../common/ToastProvider';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../../lib/checkoutAttemptId';

/**
 * PizzaPledgeForm - Pledge form with Square payment integration
 * Collects pledge details and processes payment via Square SDK
 */
export const PizzaPledgeForm = ({ onPledge, loading = false, selectedTier }) => {
  const [pizzaCount, setPizzaCount] = useState(selectedTier?.pizzaCount || 1);
  const [funderName, setFunderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [rewardPreference, setRewardPreference] = useState('public pizza party');
  const [discountCode, setDiscountCode] = useState('');
  
  // Square payment state
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [fallbackStatus, setFallbackStatus] = useState({ loading: false, error: '' });
  const cardContainerRef = useRef(null);
  const cardInstanceRef = useRef(null);
  const cardInitRef = useRef(false);
  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = 'le:checkoutAttempt:pizzafunder';

  const { toast } = useToast();
  const { payments, loading: paymentsLoading, error: paymentsError } = useSquarePayments();

  // Keep pizza count in sync with the selected reward tier
  // This ensures switching tiers updates the quantity and total without refresh
  useEffect(() => {
    const nextCount = selectedTier?.pizzaCount || 1;
    setPizzaCount(nextCount);
  }, [selectedTier]);

  const pricePerPizza = selectedTier?.amount ? selectedTier.amount / (selectedTier.pizzaCount || 1) : 20;
  const baseTotal = pizzaCount * pricePerPizza;
  
  // Apply discount if valid code entered
  const validDiscountCode = 'since2022';
  const isDiscountValid = discountCode.toLowerCase().trim() === validDiscountCode;
  const discountAmount = isDiscountValid ? baseTotal : 0;
  const total = baseTotal - discountAmount;

  // Helper function to show toast safely
  const showToast = (title, description, variant = undefined) => {
    try {
      if (toast && typeof toast === 'function') {
        toast({ title, description, variant });
      }
    } catch (err) {
      console.error('Toast error:', err);
    }
  };

  const withTimeout = (promise, ms, message) => {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  };

  const resolveCheckoutAttemptId = useCallback(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, []);

  const clearCheckoutAttempt = useCallback(() => {
    checkoutAttemptRef.current = '';
    clearCheckoutAttemptId(attemptStorageKey);
  }, []);

  // Destroy card instance
  const destroyCard = () => {
    if (cardInstanceRef.current) {
      try {
        cardInstanceRef.current.destroy?.();
        cardInstanceRef.current = null;
      } catch (err) {
        console.warn('Card destroy warning:', err);
      }
    }
    cardInitRef.current = false;
  };

  const buildFallbackLink = useCallback(async () => {
    if (fallbackStatus.loading) return;
    setFallbackStatus({ loading: true, error: '' });
    try {
      const response = await fetch('/api/pizzafunder/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pizzaCount,
          funderName: funderName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
          rewardPreference,
          totalCents: Math.round(total * 100),
          baseTotalCents: Math.round(baseTotal * 100),
          discountCode: isDiscountValid ? discountCode.trim() : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to create hosted checkout.');
      setFallbackUrl(data?.url || '');
      setFallbackStatus({ loading: false, error: '' });
    } catch (err) {
      setFallbackStatus({ loading: false, error: err?.message || 'Unable to create hosted checkout.' });
    }
  }, [fallbackStatus.loading, pizzaCount, funderName, email, phone, notes, rewardPreference, total, baseTotal, isDiscountValid, discountCode]);

  // Initialize Square card when payments SDK is ready
  useEffect(() => {
    if (!payments || !cardContainerRef.current || cardInitRef.current || paymentsLoading || paymentsError) {
      return;
    }

    const container = cardContainerRef.current;
    let cancelled = false;
    cardInitRef.current = true;
    setCardError('');
    setCardReady(false);

    payments
      .card()
      .then((card) => {
        if (!card) {
          throw new Error('Square card component unavailable.');
        }
        if (cancelled) {
          try {
            card.destroy?.();
          } catch (_) {
            // ignore
          }
          return null;
        }
        cardInstanceRef.current = card;
        return card.attach(container);
      })
      .then((result) => {
        if (cancelled || result === null) {
          return;
        }
        setCardReady(true);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        console.error('Card init failed:', err);
        const message = err?.message || 'Unable to load the payment form.';
        setCardError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [payments, paymentsLoading, paymentsError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyCard();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return;

    if (!funderName.trim()) {
      showToast('Name required', 'Please enter your name', 'destructive');
      return;
    }

    if (!email.trim()) {
      showToast('Email required', 'Please enter your email', 'destructive');
      return;
    }

    if (!cardReady || !cardInstanceRef.current) {
      showToast('Payment form not ready', 'Please wait for the payment form to load', 'destructive');
      return;
    }

    setSubmitting(true);
    setPaymentError('');

    try {
      // Tokenize the card
      const result = await withTimeout(
        cardInstanceRef.current.tokenize(),
        20000,
        'Card verification timed out. Please try again.'
      );
      
      if (result.status !== 'OK') {
        const errorMsg = result.errors?.[0]?.message || 'Payment tokenization failed';
        showToast('Card validation failed', errorMsg, 'destructive');
        return;
      }

      if (!payments || typeof payments.verifyBuyer !== 'function') {
        throw new Error('Buyer verification unavailable. Please try hosted checkout.');
      }

      const nameParts = funderName.trim().split(' ');
      const verificationDetails = {
        amount: total.toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: nameParts[0] || undefined,
          familyName: nameParts.slice(1).join(' ') || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          countryCode: 'US',
        },
      };
      const verificationResult = await withTimeout(
        payments.verifyBuyer(result.token, verificationDetails),
        20000,
        'Buyer verification timed out. Please try again.'
      );
      const verificationToken = verificationResult?.token || verificationResult?.verificationToken;
      if (!verificationToken) {
        throw new Error('Buyer verification failed. Please try again.');
      }
      const checkoutAttemptId = resolveCheckoutAttemptId();

      // Call the parent's onPledge with the token
      await onPledge({
        pizzaCount,
        funderName: funderName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        rewardPreference,
        totalCents: Math.round(total * 100),
        baseTotalCents: Math.round(baseTotal * 100),
        discountCode: isDiscountValid ? discountCode.trim() : null,
        discountAmount: isDiscountValid ? Math.round(discountAmount * 100) : 0,
        sourceId: result.token,
        verificationToken,
        checkoutAttemptId,
        selectedTier: selectedTier || null,
      });
      clearCheckoutAttempt();

      // Success - parent will handle the toast and reset
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Payment failed. Please try again.');
      showToast('Payment failed', error.message || 'Please try again', 'destructive');
    } finally {
      setSubmitting(false);
    }
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
              disabled={loading || submitting}
            />
          </div>

          {/* Discount Code (optional) */}
          <div className="space-y-2">
            <Label htmlFor="discountCode">Discount Code (optional)</Label>
            <Input
              id="discountCode"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Enter discount code"
              disabled={loading || submitting}
            />
            {isDiscountValid && (
              <p className="text-sm text-green-600 font-semibold">
                ✓ 100% discount applied! You'll receive a complimentary pledge confirmation.
              </p>
            )}
            {discountCode && !isDiscountValid && (
              <p className="text-sm text-amber-600">
                Invalid discount code
              </p>
            )}
          </div>

          {/* Total with Discount Display */}
          {isDiscountValid && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span className="line-through text-neutral-500">${baseTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-700">Discount ({validDiscountCode}):</span>
                <span className="text-green-700">-${discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-green-300 pt-2 mt-2">
                <span>Total:</span>
                <span className="text-green-700">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Square Payment Card */}
          <div className="space-y-2">
            <Label htmlFor="pizza-card-container">Payment Details</Label>
            <div
              id="pizza-card-container"
              ref={cardContainerRef}
              className="border rounded-md p-4 min-h-[88px] bg-white"
              aria-label="Card payment form"
            >
              {!cardReady && !cardError && !paymentsError && (
                <p className="text-sm text-gray-500">
                  {paymentsLoading
                    ? 'Loading secure payment form...'
                    : 'Preparing secure payment form...'}
                </p>
              )}
              {(cardError || paymentsError || paymentError) && (
                <div className="space-y-2 text-sm text-red-600">
                  <p>{cardError || paymentsError || paymentError}</p>
                  <button
                    type="button"
                    className="underline text-xs"
                    onClick={buildFallbackLink}
                    disabled={fallbackStatus.loading}
                  >
                    {fallbackStatus.loading ? 'Building hosted checkout...' : 'Use hosted Square checkout'}
                  </button>
                  {fallbackStatus.error && (
                    <p className="text-xs text-red-600">{fallbackStatus.error}</p>
                  )}
                  {fallbackUrl && (
                    <p className="text-xs">
                      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">Open hosted checkout</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={loading || submitting || !cardReady || !!cardError || !!paymentsError}
        >
          {submitting 
            ? 'Processing...' 
            : isDiscountValid 
              ? `Confirm Pledge - FREE (${pizzaCount} pizza${pizzaCount > 1 ? 's' : ''})`
              : `Pledge $${total.toFixed(2)} for ${pizzaCount} pizza${pizzaCount > 1 ? 's' : ''}`
          }
        </Button>
      </CardFooter>
    </Card>
  );
};

PizzaPledgeForm.propTypes = {
  onPledge: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  selectedTier: PropTypes.shape({
    amount: PropTypes.number,
    pizzaCount: PropTypes.number,
    title: PropTypes.string,
  }),
};
