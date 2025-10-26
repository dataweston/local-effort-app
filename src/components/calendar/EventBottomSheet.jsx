import React from 'react';
import { X, MapPin, Users, Calendar, Clock, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';

const EVENT_COLORS = {
  pizza_party: { bg: 'bg-orange-50', accent: 'text-orange-600', icon: '🍕' },
  pizza_pickup: { bg: 'bg-orange-50', accent: 'text-orange-600', icon: '🍕' },
  catering: { bg: 'bg-blue-50', accent: 'text-blue-600', icon: '🍴' },
  meal_prep: { bg: 'bg-purple-50', accent: 'text-purple-600', icon: '🥘' },
  private_event: { bg: 'bg-indigo-50', accent: 'text-indigo-600', icon: '🎉' },
  blocked: { bg: 'bg-gray-50', accent: 'text-gray-600', icon: '🚫' },
  other: { bg: 'bg-slate-50', accent: 'text-slate-600', icon: '📅' }
};

const STATUS_BADGES = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
};

export default function EventBottomSheet({ event, open, onClose, onEdit }) {
  if (!event) return null;

  const colorScheme = EVENT_COLORS[event.event_type] || EVENT_COLORS.other;
  const statusBadge = STATUS_BADGES[event.status] || STATUS_BADGES.scheduled;

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-fade-in" />
        <Dialog.Content 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto animate-slide-up md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl"
          aria-describedby="event-details"
        >
          {/* Header */}
          <div className={`${colorScheme.bg} px-6 py-4 border-b sticky top-0 z-10`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-3xl" role="img" aria-label={event.event_type}>
                  {colorScheme.icon}
                </span>
                <div className="flex-1">
                  <Dialog.Title className={`text-xl font-bold ${colorScheme.accent}`}>
                    {event.title}
                  </Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Event details for {event.title}
                  </Dialog.Description>
                  <span className={`inline-block px-2 py-0.5 mt-1 text-xs font-medium rounded-full ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
              </div>
              <Dialog.Close className="p-2 hover:bg-white/50 rounded-full transition">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div id="event-details" className="p-6 space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className={`w-5 h-5 mt-0.5 ${colorScheme.accent}`} />
              <div>
                <p className="font-semibold text-gray-900">
                  {format(parseISO(event.start_date), 'EEEE, MMMM d, yyyy')}
                </p>
                {(event.start_time || event.end_time) && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {event.start_time && format(parseISO(`2000-01-01T${event.start_time}`), 'h:mm a')}
                    {event.start_time && event.end_time && ' - '}
                    {event.end_time && format(parseISO(`2000-01-01T${event.end_time}`), 'h:mm a')}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className={`w-5 h-5 mt-0.5 ${colorScheme.accent}`} />
                <p className="text-gray-700">{event.location}</p>
              </div>
            )}

            {/* Capacity */}
            {event.capacity && (
              <div className="flex items-start gap-3">
                <Users className={`w-5 h-5 mt-0.5 ${colorScheme.accent}`} />
                <div>
                  <p className="text-gray-700">
                    <span className="font-semibold">{event.booked_slots || 0}</span> / {event.capacity} spots filled
                  </p>
                  {event.booked_slots >= event.capacity && (
                    <p className="text-sm text-red-600 font-semibold mt-1">Event is full</p>
                  )}
                  {event.capacity - (event.booked_slots || 0) > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      {event.capacity - (event.booked_slots || 0)} spots remaining
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Revenue (admin only) */}
            {event.estimated_revenue > 0 && (
              <div className="flex items-start gap-3">
                <DollarSign className={`w-5 h-5 mt-0.5 ${colorScheme.accent}`} />
                <div>
                  <p className="text-gray-700">
                    Est. Revenue: <span className="font-semibold text-green-600">${event.estimated_revenue.toFixed(2)}</span>
                  </p>
                  {event.actual_revenue > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Actual: ${event.actual_revenue.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.notes}</p>
              </div>
            )}

            {/* Event Type Badge */}
            <div className="pt-4 border-t">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {event.event_type?.replace('_', ' ').toUpperCase()}
              </span>
              <span className="inline-block ml-2 px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {event.visibility?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Actions */}
          {onEdit && (
            <div className="p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => { onEdit(event); onClose(); }}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Edit Event
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
