import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TimeSlotPicker } from '../components/calendar/TimeSlotPicker';
import { Card } from '../components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function SchedulePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedulingComplete, setSchedulingComplete] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Validate invitation token
    fetch(`/api/calendar/validate-invite?token=${token}`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || 'Invalid invitation');
          });
        }
        return res.json();
      })
      .then(data => {
        setInvitation(data.invitation);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleBookingComplete = async (booking) => {
    // Mark invitation as used
    try {
      await fetch(`/api/calendar/mark-invite-used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, booking_id: booking.id })
      });
    } catch (err) {
      // Silently fail - booking is already complete
    }
    
    setSchedulingComplete(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/pizzafunder')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Go to PizzaFunder
          </button>
        </Card>
      </div>
    );
  }

  if (schedulingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 mb-4">
            Thank you, {invitation.customer_name}! We've received your scheduling request.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You'll receive a confirmation email at {invitation.customer_email} with all the details.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Return Home
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Schedule Your Pizza Pickup
          </h1>
          <p className="text-lg text-gray-600">
            Hi {invitation.customer_name}! Thanks for pledging {invitation.pizza_count} pizza{invitation.pizza_count > 1 ? 's' : ''}.
          </p>
          <p className="text-gray-500 mt-2">
            Select a date and time below to schedule your pickup.
          </p>
        </div>

        <TimeSlotPicker
          customerName={invitation.customer_name}
          customerEmail={invitation.customer_email}
          pizzaCount={invitation.pizza_count}
          onBook={handleBookingComplete}
        />
      </div>
    </div>
  );
}
