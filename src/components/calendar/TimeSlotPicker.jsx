import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

/**
 * TimeSlotPicker - Calendar-based time slot booking component
 * Fetches available dates from calendar API and allows customers to book
 * Designed for PizzaFunder reward scheduling
 */
export const TimeSlotPicker = ({ 
  pizzaCount = 1,
  customerName = '',
  customerEmail = '',
  onBook,
  loading = false 
}) => {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingDates, setLoadingDates] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Fetch available dates and time slots from calendar API
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        // Fetch both events and time slots in parallel
        const [eventsRes, slotsRes] = await Promise.all([
          fetch('/api/calendar/public-events'),
          fetch('/api/calendar/time-slots?available_only=true')
        ]);
        
        const events = eventsRes.ok ? await eventsRes.json() : [];
        const timeSlots = slotsRes.ok ? await slotsRes.json() : [];
        
        // Filter to events that allow bookings and are in the future
        const bookableEvents = events.filter(event => {
          const isFuture = new Date(event.start_date) >= new Date();
          return event.is_bookable && isFuture;
        }).map(event => ({
          ...event,
          type: 'event',
          display_date: event.start_date,
          display_time: event.start_time,
          booking_id: event.id,
          booking_type: 'event'
        }));
        
        // Format time slots to match structure
        const bookableSlots = timeSlots.filter(slot => {
          const isFuture = new Date(slot.slot_date) >= new Date();
          return slot.is_bookable && isFuture;
        }).map(slot => ({
          ...slot,
          type: 'time_slot',
          title: `${slot.slot_type.replace('_', ' ')} - ${slot.slot_time}`,
          display_date: slot.slot_date,
          display_time: slot.slot_time,
          capacity: slot.capacity,
          available_slots: slot.available_slots,
          booking_id: slot.id,
          booking_type: 'time_slot'
        }));
        
        // Combine and sort by date
        const combined = [...bookableEvents, ...bookableSlots].sort((a, b) => 
          new Date(a.display_date) - new Date(b.display_date)
        );
        
        setAvailableDates(combined);
      } catch (error) {
        console.error('Failed to fetch available dates:', error);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchAvailableDates();
  }, []);

  const handleBooking = async () => {
    if (!selectedDate || !customerEmail) return;

    // Build booking data based on whether it's an event or time slot
    const bookingData = {
      customer_name: customerName,
      customer_email: customerEmail,
      booking_type: 'pizza_pickup',
      quantity: pizzaCount,
      notes: notes.trim() || null,
    };
    
    // Add either event_id or time_slot_id
    if (selectedDate.type === 'event') {
      bookingData.event_id = selectedDate.booking_id;
      bookingData.slot_time = selectedTime || null;
    } else {
      bookingData.time_slot_id = selectedDate.booking_id;
    }

    try {
      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await res.json();

      if (res.ok) {
        setBookingSuccess(true);
        if (onBook) {
          onBook(result.booking);
        }
      } else {
        throw new Error(result.error || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert(error.message || 'Failed to book time slot. Please try again.');
    }
  };

  if (loadingDates) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-600">Loading available dates...</p>
        </CardContent>
      </Card>
    );
  }

  if (bookingSuccess) {
    const displayDate = selectedDate.display_date || selectedDate.start_date;
    const displayTime = selectedDate.display_time || selectedTime;
    
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-green-900">Booking Confirmed!</h3>
          <p className="text-green-800">
            Your {selectedDate.type === 'event' ? 'pickup' : 'appointment'} is scheduled for{' '}
            <strong>{format(new Date(displayDate), 'MMMM d, yyyy')}</strong>
            {displayTime && ` at ${displayTime}`}.
          </p>
          <p className="text-sm text-green-700">
            We've sent a confirmation to {customerEmail}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Your Pizza Pickup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              <strong>No pickup dates available yet.</strong> We'll send you an email when pickup dates are scheduled. 
              You can also check back here anytime to see available dates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Schedule Your Pizza Pickup
        </CardTitle>
        <p className="text-sm text-neutral-600 mt-2">
          You have <strong>{pizzaCount} {pizzaCount === 1 ? 'pizza' : 'pizzas'}</strong> to pick up. 
          Choose from available public events below:
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Dates Grid */}
        <div>
          <Label className="mb-3 block">Select a Date</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableDates.map(item => {
              const itemDate = parseISO(item.display_date);
              const isSelected = selectedDate?.booking_id === item.booking_id;
              const slotsRemaining = item.available_slots;
              const hasCapacity = item.capacity !== null && item.capacity !== undefined;
              const isEvent = item.type === 'event';
              const isTimeSlot = item.type === 'time_slot';
              
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => setSelectedDate(item)}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-neutral-200 hover:border-orange-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isEvent && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">EVENT</span>}
                        {isTimeSlot && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">TIME SLOT</span>}
                      </div>
                      <div className="font-semibold text-neutral-900">
                        {format(itemDate, 'EEEE, MMM d')}
                        {item.display_time && (
                          <span className="text-sm font-normal text-neutral-600 ml-2">
                            @ {item.display_time}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 mt-1 capitalize">
                        {item.title}
                      </div>
                      {item.location && (
                        <div className="text-xs text-neutral-500 mt-1">
                          📍 {item.location}
                        </div>
                      )}
                      {hasCapacity && (
                        <div className="text-xs text-neutral-500 mt-2">
                          {slotsRemaining} {slotsRemaining === 1 ? 'spot' : 'spots'} left
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-orange-500 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Preference (Optional - only show for events, not time slots) */}
        {selectedDate && selectedDate.type === 'event' && !selectedDate.display_time && (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="time">Preferred Time (optional)</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="e.g., 6:00 PM"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-neutral-500">
              We'll do our best to accommodate your preference.
            </p>
          </div>
        )}

        {/* Notes */}
        {selectedDate && (
          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary restrictions, pickup arrangements, etc."
              maxLength={200}
            />
          </div>
        )}

        {/* Confirm Button */}
        {selectedDate && (
          <Button
            onClick={handleBooking}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

TimeSlotPicker.propTypes = {
  pizzaCount: PropTypes.number,
  customerName: PropTypes.string,
  customerEmail: PropTypes.string,
  onBook: PropTypes.func,
  loading: PropTypes.bool,
};
