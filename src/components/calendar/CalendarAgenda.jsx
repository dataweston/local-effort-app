import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isToday, isSameMonth } from 'date-fns';

const EVENT_COLORS = {
  pizza_party: {
    bg: 'bg-orange-50',
    border: 'border-l-4 border-orange-500',
    text: 'text-orange-900',
    icon: '🍕'
  },
  pizza_pickup: {
    bg: 'bg-orange-50',
    border: 'border-l-4 border-orange-500',
    text: 'text-orange-900',
    icon: '🍕'
  },
  catering: {
    bg: 'bg-blue-50',
    border: 'border-l-4 border-blue-500',
    text: 'text-blue-900',
    icon: '🍴'
  },
  meal_prep: {
    bg: 'bg-purple-50',
    border: 'border-l-4 border-purple-500',
    text: 'text-purple-900',
    icon: '🥘'
  },
  private_event: {
    bg: 'bg-indigo-50',
    border: 'border-l-4 border-indigo-500',
    text: 'text-indigo-900',
    icon: '🎉'
  },
  blocked: {
    bg: 'bg-gray-50',
    border: 'border-l-4 border-gray-400',
    text: 'text-gray-600',
    icon: '🚫'
  },
  other: {
    bg: 'bg-slate-50',
    border: 'border-l-4 border-slate-500',
    text: 'text-slate-900',
    icon: '📅'
  }
};

const STATUS_BADGES = {
  confirmed: { label: '✓ Confirmed', color: 'bg-green-100 text-green-800 border-green-200' },
  scheduled: { label: '○ Scheduled', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  draft: { label: '◐ Draft', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  completed: { label: '✓ Done', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: '✕ Cancelled', color: 'bg-red-100 text-red-800 border-red-200' }
};

export default function CalendarAgenda({ currentMonth, setCurrentMonth, events, onEventClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const groupedEvents = days.reduce((acc, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.start_date === dayStr);
    if (dayEvents.length > 0) {
      acc.push({ date: day, events: dayEvents });
    }
    return acc;
  }, []);

  const getDayLabel = (date) => {
    if (isToday(date)) return 'TODAY';
    return format(date, 'EEEE').toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Month Navigation */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-lg font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Events List */}
      <div className="divide-y">
        {groupedEvents.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No events this month</p>
          </div>
        ) : (
          groupedEvents.map(({ date, events: dayEvents }, index) => (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Day Header */}
              <div className={`px-4 py-2 ${isToday(date) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xs font-bold ${isToday(date) ? 'text-blue-700' : 'text-gray-500'}`}>
                    {getDayLabel(date)}
                  </span>
                  <span className={`text-sm font-semibold ${isToday(date) ? 'text-blue-900' : 'text-gray-700'}`}>
                    {format(date, 'MMM d')}
                  </span>
                </div>
              </div>

              {/* Day Events */}
              <div className="divide-y divide-gray-100">
                {dayEvents.map((event) => {
                  const colorScheme = EVENT_COLORS[event.event_type] || EVENT_COLORS.other;
                  const statusBadge = STATUS_BADGES[event.status] || STATUS_BADGES.scheduled;

                  return (
                    <article
                      key={event.id}
                      onClick={() => onEventClick && onEventClick(event)}
                      className={`p-4 ${colorScheme.bg} ${colorScheme.border} cursor-pointer hover:shadow-md transition-all active:scale-[0.98]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title & Icon */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg" role="img" aria-label={event.event_type}>
                              {colorScheme.icon}
                            </span>
                            <h3 className={`font-semibold ${colorScheme.text} truncate`}>
                              {event.title}
                            </h3>
                          </div>

                          {/* Time */}
                          {(event.start_time || event.end_time) && (
                            <p className="text-sm text-gray-600 mb-1">
                              {event.start_time && format(parseISO(`2000-01-01T${event.start_time}`), 'h:mm a')}
                              {event.start_time && event.end_time && ' - '}
                              {event.end_time && format(parseISO(`2000-01-01T${event.end_time}`), 'h:mm a')}
                            </p>
                          )}

                          {/* Location */}
                          {event.location && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}

                          {/* Capacity */}
                          {event.capacity && (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="w-3 h-3 text-gray-500" />
                              <span className={event.booked_slots >= event.capacity ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                {event.booked_slots || 0}/{event.capacity}
                                {event.booked_slots >= event.capacity && ' FULL'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusBadge.color} shrink-0`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
