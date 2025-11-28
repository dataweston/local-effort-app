import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { useSquareCard } from '../../hooks/useSquareCard';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

const TICKET_PRICE = 17500; // $175.00 in cents
const TICKET_PRICE_USD = (TICKET_PRICE / 100).toFixed(2);
const MIN_TICKETS = 1;
const MAX_TICKETS = 6;

const createInitialFormData = () => ({
  name: '',
  email: '',
  phone: '',
  dietaryRestrictions: '',
  drinkMenu: 'wine', // 'wine' or 'non-alcoholic'
  quantity: 1,
});

const clampQuantity = (value) => {
  if (Number.isNaN(value)) return MIN_TICKETS;
  return Math.min(MAX_TICKETS, Math.max(MIN_TICKETS, value));
};

const DinnerRegistrationModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState(createInitialFormData);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { cardLoaded, error: cardError, loadingScript, tokenize, reset } = useSquareCard(
    '#winter-dinner-card-container',
    isOpen && !showSuccess,
    [isOpen, showSuccess]
  );

  useEffect(() => {
    if (!isOpen) {
      setFormData(createInitialFormData());
      setShowSuccess(false);
      setErrorMessage('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'quantity') {
      const parsed = parseInt(value, 10);
      setFormData(prev => ({ ...prev, quantity: clampQuantity(parsed) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDrinkMenuChange = (value) => {
    setFormData(prev => ({ ...prev, drinkMenu: value }));
  };

  const handleQuantityStep = (direction) => {
    setFormData(prev => ({
      ...prev,
      quantity: clampQuantity(prev.quantity + direction),
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Please enter your name');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Please enter your phone number');
      return false;
    }
    if (!Number.isInteger(formData.quantity) || formData.quantity < MIN_TICKETS) {
      setErrorMessage(`Please select between ${MIN_TICKETS} and ${MAX_TICKETS} tickets.`);
      return false;
    }
    return true;
  };

  const totalAmount = formData.quantity * TICKET_PRICE;
  const totalAmountUsd = (totalAmount / 100).toFixed(2);
  const ticketLabel = formData.quantity > 1 ? 'tickets' : 'ticket';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    if (!cardLoaded) {
      setErrorMessage('Payment form is still loading. Please wait.');
      return;
    }

    setIsProcessing(true);

    try {
      // Tokenize the card
      const token = await tokenize();

      // Submit to backend
      const response = await fetch('/api/winter-dinner/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          },
          dietaryRestrictions: formData.dietaryRestrictions,
          drinkMenu: formData.drinkMenu,
          token,
          quantity: formData.quantity,
          amount: totalAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Show success
      setShowSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      reset();
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!isProcessing && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        )}

        {showSuccess ? (
          // Success State
          <motion.div
            className="p-12 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <Check className="w-12 h-12 text-green-600" />
            </motion.div>
            <h2 className="text-3xl font-light mb-4">Thank You!</h2>
            <p className="text-gray-600 text-lg mb-2">
              Your {ticketLabel} {formData.quantity > 1 ? 'have' : 'has'} been confirmed.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              We've sent a confirmation email to <span className="font-medium">{formData.email}</span> with all the details.
            </p>
            <Button
              onClick={handleClose}
              className="px-8 py-6 text-lg"
            >
              Close
            </Button>
          </motion.div>
        ) : (
          // Form State
          <div className="p-8 md:p-12">
            <h2 className="text-3xl font-light mb-2 text-center">Winter Dinner</h2>
            <p className="text-center text-gray-500 mb-8">Secure your seat at our exclusive dinner</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="text-base py-6"
                  disabled={isProcessing}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="text-base py-6"
                  disabled={isProcessing}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="text-base py-6"
                  disabled={isProcessing}
                  required
                />
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-2">
                <Label htmlFor="dietaryRestrictions" className="text-base">
                  Dietary Restrictions & Allergies
                </Label>
                <Textarea
                  id="dietaryRestrictions"
                  name="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={handleChange}
                  placeholder="Please let us know about any dietary restrictions or allergies..."
                  className="text-base min-h-[100px]"
                  disabled={isProcessing}
                />
              </div>

              {/* Drink Menu Selection */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Beverage Pairing</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDrinkMenuChange('wine')}
                    disabled={isProcessing}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.drinkMenu === 'wine'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Wine Pairing</div>
                    <div className="text-sm mt-1 opacity-80">Curated wine selections</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDrinkMenuChange('non-alcoholic')}
                    disabled={isProcessing}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.drinkMenu === 'non-alcoholic'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Non-Alcoholic</div>
                    <div className="text-sm mt-1 opacity-80">Artisanal beverages</div>
                  </button>
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base font-medium">
                  Quantity
                </Label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleQuantityStep(-1)}
                    disabled={isProcessing || formData.quantity <= MIN_TICKETS}
                    className="w-12 h-12 rounded-full border border-gray-300 text-2xl leading-none text-gray-700 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={MIN_TICKETS}
                    max={MAX_TICKETS}
                    value={formData.quantity}
                    onChange={handleChange}
                    className="text-center text-lg py-6 w-24"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityStep(1)}
                    disabled={isProcessing || formData.quantity >= MAX_TICKETS}
                    className="w-12 h-12 rounded-full border border-gray-300 text-2xl leading-none text-gray-700 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {`$${TICKET_PRICE_USD} per seat · Max ${MAX_TICKETS} seats per order`}
                </p>
              </div>

              {/* Payment Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-light">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-light block">${totalAmountUsd}</span>
                    <span className="text-xs text-gray-500">{formData.quantity} × ${TICKET_PRICE_USD}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Card Information</Label>
                  <div
                    id="winter-dinner-card-container"
                    className="min-h-[60px] p-4 border border-gray-300 rounded-md"
                  />
                  {loadingScript && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading payment form...
                    </p>
                  )}
                  {cardError && (
                    <p className="text-sm text-red-600">{cardError}</p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={isProcessing || !cardLoaded || loadingScript}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Purchase ${ticketLabel.charAt(0).toUpperCase() + ticketLabel.slice(1)} - $${totalAmountUsd}`
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Your payment information is secure and encrypted
              </p>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DinnerRegistrationModal;
