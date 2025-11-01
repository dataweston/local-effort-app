import React, { useState } from 'react';
import { Mail, Send, Copy, Check, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function InvitationManager({ accessToken }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pizzaCount, setPizzaCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setGeneratedUrl('');
    
    if (!customerName || !customerEmail) {
      setError('Please enter customer name and email');
      return;
    }
    
    setLoading(true);
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const res = await fetch('/api/calendar/generate-invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          pizza_count: pizzaCount,
          expires_days: 30
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invitation');
      }
      
      setGeneratedUrl(data.schedule_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleSendEmail = async () => {
    // TODO: Integrate with Brevo email service
    alert('Email sending coming soon! For now, copy the link and send manually.');
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerEmail('');
    setPizzaCount(5);
    setGeneratedUrl('');
    setError('');
    setCopied(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Send Scheduling Invitation</h2>
          <p className="text-sm text-gray-600">Generate a unique link for customers to schedule their pizza pickup</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Doe"
            disabled={!!generatedUrl}
          />
        </div>

        <div>
          <Label htmlFor="customerEmail">Customer Email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="john@example.com"
            disabled={!!generatedUrl}
          />
        </div>

        <div>
          <Label htmlFor="pizzaCount">Pizza Count</Label>
          <Input
            id="pizzaCount"
            type="number"
            min="1"
            value={pizzaCount}
            onChange={(e) => setPizzaCount(parseInt(e.target.value) || 1)}
            disabled={!!generatedUrl}
          />
        </div>

        {!generatedUrl ? (
          <Button
            onClick={handleGenerate}
            disabled={loading || !customerName || !customerEmail}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate Invitation Link'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Invitation Link Generated:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-green-300 overflow-x-auto">
                  {generatedUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                className="flex-1"
                variant="default"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
              >
                New Invitation
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
