import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'requests',
    message: '',
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
    setStatus({ type: 'loading', message: 'Submitting...' });
    try {
      await addDoc(collection(db, 'feedback'), {
        ...formData,
        submittedAt: serverTimestamp(),
      });
      setStatus({ type: 'success', message: 'Thank you! Your feedback has been sent.' });
      setFormData({ name: '', email: '', phone: '', category: 'requests', message: '' }); // Clear form
    } catch (error) {
      console.error('Error adding document: ', error);
      setStatus({ type: 'error', message: 'Something went wrong. Please try again.' });
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
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
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
