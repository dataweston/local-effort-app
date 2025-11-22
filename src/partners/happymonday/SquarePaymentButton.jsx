import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { useSquarePayments } from '../../lib/useSquarePayments';
import { recordSquarePayment } from './supabaseClient';

const SquarePaymentButton = ({ userId, currentBalance, onClose, onSuccess }) => {
  const { payments, loading: sdkLoading, error: sdkError } = useSquarePayments();
  const [card, setCard] = useState(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Calculate suggested payment amount (balance due)
  const balanceDue = Math.max(0, currentBalance);
  const suggestedAmount = (balanceDue / 100).toFixed(2);

  useEffect(() => {
    if (!payments || card) return;

    const initializeCard = async () => {
      try {
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');
        setCard(cardInstance);
      } catch (err) {
        console.error('[Square] Failed to initialize card', err);
        setError('Failed to initialize payment form. Please try again.');
      }
    };

    initializeCard();

    return () => {
      if (card?.destroy) {
        card.destroy();
      }
    };
  }, [payments]);

  const handlePayment = async () => {
    if (!card || !amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Tokenize card
      const tokenResult = await card.tokenize();

      if (tokenResult.status === 'OK') {
        const token = tokenResult.token;
        const amountCents = Math.round(parseFloat(amount) * 100);

        // Send payment to backend
        const response = await fetch('/api/happymonday/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            token,
            amountCents,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Payment failed');
        }

        // Payment successful
        alert(`Payment of $${amount} processed successfully!`);
        onSuccess();
      } else {
        const errorMessages = (tokenResult.errors || [])
          .map(e => e.message)
          .join(', ');
        throw new Error(errorMessages || 'Card tokenization failed');
      }
    } catch (err) {
      console.error('[Square] Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard size={24} />
            Make a Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={processing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance info */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Balance Due</p>
          <p className="text-2xl font-bold text-red-600">${suggestedAmount}</p>
        </div>

        {/* Amount input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Payment Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={suggestedAmount}
              className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={processing}
            />
          </div>
          <button
            onClick={() => setAmount(suggestedAmount)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Pay full balance (${suggestedAmount})
          </button>
        </div>

        {/* Card container */}
        {sdkLoading && (
          <div className="mb-6 p-8 bg-slate-50 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600">Loading payment form...</p>
          </div>
        )}

        {sdkError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Payment Form Error</p>
              <p className="text-sm text-red-700">{sdkError}</p>
            </div>
          </div>
        )}

        {!sdkLoading && !sdkError && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Card Information
            </label>
            <div
              id="card-container"
              className="border border-slate-300 rounded-lg p-3 min-h-[100px]"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Payment info */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            Payments are processed securely via Square. ACH payments are also available -
            please contact us at hello@localeffortfood.com to set up ACH payments.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={processing || !card || !amount || parseFloat(amount) <= 0 || sdkError}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              processing || !card || !amount || parseFloat(amount) <= 0 || sdkError
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {processing ? 'Processing...' : `Pay $${amount || '0.00'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SquarePaymentButton;
