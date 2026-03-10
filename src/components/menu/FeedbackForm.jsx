import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'requests',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message) {
      setStatus({ type: 'error', message: 'Please enter a message before submitting.' });
      return;
    }

    setStatus({ type: 'loading', message: '' });

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        subject: `Happy Monday Feedback (${formData.category})`,
        message: formData.message,
        type: 'feedback',
        category: formData.category,
        website: formData.website,
      };

      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(errorText);
      }

      setStatus({ type: 'success', message: 'Thank you! Your feedback has been submitted.' });
      setFormData({ name: '', email: '', phone: '', category: 'requests', message: '', website: '' });

      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 5000);
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Could not submit feedback. Please try again or contact us at yum@localeffortfood.com'
      });
    }
  };

  return (
    <div className="max-w-2xl bg-neutral-50 border border-neutral-200 p-8 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-neutral-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="requests">Requests</option>
              <option value="quality">Quality Feedback</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-neutral-700">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
          ></textarea>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
              Name (Optional)
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={handleChange}
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />
        <div className="flex items-center justify-between">
          <motion.button
            type="submit"
            className="btn btn-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            disabled={status.type === 'loading'}
          >
            {status.type === 'loading' ? 'Sending...' : 'Submit Feedback'}
          </motion.button>
          {status.message && (
            <p
              className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
            >
              {status.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
