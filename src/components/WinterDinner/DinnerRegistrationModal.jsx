import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { useSquareCard } from '../../hooks/useSquareCard';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';

const TICKET_PRICE = 7500; // $75.00 in cents
const TICKET_PRICE_USD = (TICKET_PRICE / 100).toFixed(2);

const DinnerRegistrationModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRestrictions: '',
    includesAlcohol: true,
  });

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
      setFormData({
        name: '',
        email: '',
        phone: '',
        dietaryRestrictions: '',
        includesAlcohol: true,
      });
      setShowSuccess(false);
      setErrorMessage('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAlcoholToggle = (checked) => {
    setFormData(prev => ({ ...prev, includesAlcohol: checked }));
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
    return true;
  };

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
          includesAlcohol: formData.includesAlcohol,
          token,
          amount: TICKET_PRICE,
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
              Your ticket has been confirmed.
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

              {/* Alcohol Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="alcohol-toggle" className="text-base font-medium cursor-pointer">
                    Include Alcohol Pairing
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Curated wine pairings with each course
                  </p>
                </div>
                <Switch
                  id="alcohol-toggle"
                  checked={formData.includesAlcohol}
                  onCheckedChange={handleAlcoholToggle}
                  disabled={isProcessing}
                />
              </div>

              {/* Payment Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-light">Total</span>
                  <span className="text-2xl font-light">${TICKET_PRICE_USD}</span>
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
                  `Purchase Ticket - $${TICKET_PRICE_USD}`
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
