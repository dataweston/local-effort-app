import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Download, Upload, Calendar as CalendarIcon, DollarSign, Clock, Mail, Grid, List } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import CalendarGrid from '../components/calendar/CalendarGrid';
import CalendarAgenda from '../components/calendar/CalendarAgenda';
import CalendarFilters from '../components/calendar/CalendarFilters';
import EventBottomSheet from '../components/calendar/EventBottomSheet';
import EventForm from '../components/calendar/EventForm';
import FinancialSummary from '../components/calendar/FinancialSummary';
import CSVImporter from '../components/calendar/CSVImporter';
import TimeSlotManager from '../components/calendar/TimeSlotManager';
import InvitationManager from '../components/calendar/InvitationManager';
import { CalendarAuthBanner } from '../components/calendar/CalendarAuthBanner';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const CalendarPage = () => {
  const { user, isAdmin, accessToken, loading: authLoading } = useSupabaseAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [showEventSheet, setShowEventSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'agenda'
  const [activeFilters, setActiveFilters] = useState([]);
  
  useEffect(() => {
    if (!authLoading) {
      loadEvents();
      if (isAdmin) {
        loadReceipts();
      }
    }
  }, [authLoading, isAdmin, accessToken]);
  
  const loadEvents = async () => {
    try {
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const res = await fetch('/api/calendar/events', { headers });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadReceipts = async () => {
    if (!isAdmin || !accessToken) return;
    
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`
      };
      const res = await fetch('/api/calendar/receipts', { headers });
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  };
  
  const handleSaveEvent = async (eventData) => {
    if (!isAdmin || !accessToken) {
      alert('Admin access required');
      return;
    }
    
    try {
      const url = eventData.id ? `/api/calendar/events?id=${eventData.id}` : '/api/calendar/events';
      const method = eventData.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(eventData)
      });
      
      if (!res.ok) throw new Error('Failed to save event');
      
      await loadEvents();
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      alert('Failed to save event: ' + error.message);
    }
  };
  
  const handleDeleteEvent = async (eventId) => {
    if (!isAdmin || !accessToken) {
      alert('Admin access required');
      return;
    }
    
    if (!confirm('Delete this event?')) return;
    
    try {
      const res = await fetch(`/api/calendar/events?id=${eventId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete');
      
      await loadEvents();
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      alert('Failed to delete event: ' + error.message);
    }
  };
  
  const handleCSVImport = async (data) => {
    if (!isAdmin || !accessToken) {
      throw new Error('Admin access required');
    }
    
    try {
      const promises = data.map(event => 
        fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(event)
        })
      );
      
      await Promise.all(promises);
      await loadEvents();
      alert(`Successfully imported ${data.length} events`);
    } catch (error) {
      throw new Error('Import failed: ' + error.message);
    }
  };
  
  const handleExportCSV = () => {
    const headers = ['title', 'start_date', 'end_date', 'event_type', 'visibility', 'status', 'location', 'capacity', 'estimated_revenue', 'estimated_food_cost', 'estimated_labor_cost', 'notes'];
    const rows = events.map(e => headers.map(h => e[h] || '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  const handleSyncSanity = async () => {
    if (!isAdmin || !accessToken) {
      alert('Admin access required');
      return;
    }
    
    if (!confirm('Import all Sanity events into the calendar? Existing events will be updated.')) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/calendar/sync-sanity', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.message || 'Sync failed');
      
      await loadEvents();
      alert(`Synced ${result.synced} of ${result.total} Sanity events`);
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const openNewEvent = (date) => {
    if (!isAdmin) return;
    
    setSelectedEvent({
      title: '',
      start_date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      event_type: 'other',
      visibility: 'private',
      status: 'scheduled'
    });
    setShowEventForm(true);
  };
  
  const openEditEvent = (event) => {
    if (!isAdmin) {
      openEventSheet(event);
      return;
    }
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const openEventSheet = (event) => {
    setSelectedEvent(event);
    setShowEventSheet(true);
  };

  const filteredEvents = React.useMemo(() => {
    if (activeFilters.length === 0) return events;
    
    return events.filter(event => {
      const typeFilters = activeFilters.filter(f => !['confirmed', 'scheduled'].includes(f));
      const statusFilters = activeFilters.filter(f => ['confirmed', 'scheduled'].includes(f));
      
      const matchesType = typeFilters.length === 0 || typeFilters.includes(event.event_type);
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(event.status);
      
      return matchesType && matchesStatus;
    });
  }, [events, activeFilters]);
  
  if (loading || authLoading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  
  return (
    <>
      <Helmet>
        <title>Master Calendar | Local Effort</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <CalendarAuthBanner />
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Master Calendar</h1>
          {isAdmin && (
            <div className="flex gap-3">
            <button onClick={handleSyncSanity} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" />
              Sync Sanity
            </button>
            <button onClick={() => setShowCSVImporter(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={() => openNewEvent()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </button>
            </div>
          )}
        </div>
        
        <Tabs.Root defaultValue="calendar" className="w-full">
          <Tabs.List className="flex border-b mb-6">
            <Tabs.Trigger value="calendar" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </Tabs.Trigger>
            {isAdmin && (
              <>
                <Tabs.Trigger value="time-slots" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Slots
                </Tabs.Trigger>
                <Tabs.Trigger value="invitations" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invitations
                </Tabs.Trigger>
                <Tabs.Trigger value="financials" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financials
                </Tabs.Trigger>
              </>
            )}
          </Tabs.List>
          
          <Tabs.Content value="calendar">
            {/* Mobile: Filters + Agenda */}
            <div className="lg:hidden mb-6">
              <CalendarFilters 
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
              />
              <CalendarAgenda
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                events={filteredEvents}
                onEventClick={openEventSheet}
              />
            </div>

            {/* Desktop: Grid + Sidebar */}
            <div className="hidden lg:block">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Grid className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'agenda' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <List className="w-4 h-4" />
                  Agenda
                </button>
              </div>

              {viewMode === 'grid' ? (
                <CalendarGrid
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  events={events}
                  onEventClick={openEditEvent}
                  onDayClick={openNewEvent}
                  compactMode={false}
                />
              ) : (
                <>
                  <CalendarFilters 
                    activeFilters={activeFilters}
                    onFilterChange={setActiveFilters}
                  />
                  <CalendarAgenda
                    currentMonth={currentMonth}
                    setCurrentMonth={setCurrentMonth}
                    events={filteredEvents}
                    onEventClick={openEditEvent}
                  />
                </>
              )}
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
              <div className="space-y-3">
                {events
                  .filter(e => new Date(e.start_date) >= new Date() && e.status !== 'cancelled')
                  .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                  .slice(0, 10)
                  .map(event => (
                    <div key={event.id} onClick={() => openEditEvent(event)} className="p-4 border rounded-lg hover:shadow-md cursor-pointer transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-gray-600">{event.start_date} • {event.location}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.event_type} • {event.visibility} • {event.status}
                          </p>
                        </div>
                        {event.estimated_revenue > 0 && (
                          <div className="text-right">
                            <p className="font-semibold text-green-600">${event.estimated_revenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                              {event.capacity && `${event.booked_slots || 0}/${event.capacity} booked`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Tabs.Content>
          
          {isAdmin && (
            <>
              <Tabs.Content value="time-slots">
                <TimeSlotManager accessToken={accessToken} />
              </Tabs.Content>
              
              <Tabs.Content value="invitations">
                <InvitationManager accessToken={accessToken} />
              </Tabs.Content>
              
              <Tabs.Content value="financials">
                <FinancialSummary events={events} receipts={receipts} />
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </div>
      
      <EventForm
        event={selectedEvent}
        isOpen={showEventForm}
        onClose={() => { setShowEventForm(false); setSelectedEvent(null); }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        accessToken={accessToken}
        isAdmin={isAdmin}
      />
      
      <EventBottomSheet
        event={selectedEvent}
        open={showEventSheet}
        onClose={() => setShowEventSheet(false)}
        onEdit={openEditEvent}
      />

      <CSVImporter
        isOpen={showCSVImporter}
        onClose={() => setShowCSVImporter(false)}
        onImport={handleCSVImport}
      />
    </>
  );
};

export default CalendarPage;
