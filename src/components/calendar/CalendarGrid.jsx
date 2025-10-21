import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths } from 'date-fns';

const CalendarGrid = ({ currentMonth, setCurrentMonth, events, onEventClick, onDayClick }) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...days];
  
  const getEventsForDay = (day) => {
    if (!day) return [];
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.start_date === dayStr);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
            Today
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-0 text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        
        {paddedDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day && isSameMonth(day, currentMonth);
          const isTodayDate = day && isToday(day);
          
          return (
            <div
              key={i}
              onClick={() => day && onDayClick && onDayClick(day)}
              className={`min-h-24 p-2 border-b border-r ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'} ${isTodayDate ? 'bg-blue-50' : ''} ${onDayClick ? 'cursor-pointer' : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm ${!isCurrentMonth ? 'text-gray-400' : isTodayDate ? 'text-blue-700 font-semibold' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event); }}
                      className={`mt-1 p-1 text-xs rounded cursor-pointer truncate ${
                        event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
