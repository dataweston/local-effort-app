import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const EventForm = ({ event, isOpen, onClose, onSave, onDelete, accessToken, isAdmin }) => {
  console.log('EventForm render - isOpen:', isOpen, 'event:', event);

  const [formData, setFormData] = useState(event || {
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    event_type: 'other',
    visibility: 'private',
    status: 'scheduled',
    location: '',
    capacity: '',
    buffer_hours: 4,
    estimated_revenue: '',
    estimated_food_cost: '',
    estimated_labor_cost: '',
    notes: '',
    repeat: 'none',
    repeatUntil: ''
  });

  // Update formData when event prop changes
  useEffect(() => {
    if (event) {
      setFormData(event);
    } else {
      setFormData({
        title: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        start_time: '',
        end_time: '',
        event_type: 'other',
        visibility: 'private',
        status: 'scheduled',
        location: '',
        capacity: '',
        buffer_hours: 4,
        estimated_revenue: '',
        estimated_food_cost: '',
        estimated_labor_cost: '',
        notes: '',
        repeat: 'none',
        repeatUntil: ''
      });
    }
  }, [event, isOpen]);
  
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check for conflicts when date/time changes
    if (['start_date', 'start_time', 'buffer_hours'].includes(field)) {
      checkConflicts(field === 'start_date' ? value : formData.start_date,
                     field === 'start_time' ? value : formData.start_time,
                     field === 'buffer_hours' ? value : formData.buffer_hours);
    }
  };
  
  const checkConflicts = async (date, time, bufferHours) => {
    if (!date || !isAdmin) return; // Only check conflicts for admins
    
    setCheckingConflicts(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/calendar/check-conflicts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          check_date: date,
          check_time: time || '00:00',
          check_buffer_hours: bufferHours || 4,
          exclude_event_id: event?.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts || []);
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50 p-6">
          <Dialog.Description className="sr-only">
            {event?.id ? 'Edit calendar event details' : 'Create a new calendar event'}
          </Dialog.Description>
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {event?.id ? 'Edit Event' : 'New Event'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" required value={formData.title} onChange={e => update('title', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input type="date" required value={formData.start_date} onChange={e => update('start_date', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" value={formData.end_date} onChange={e => update('end_date', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input type="time" value={formData.start_time} onChange={e => update('start_time', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input type="time" value={formData.end_time} onChange={e => update('end_time', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={formData.event_type} onChange={e => update('event_type', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="pizza_party">Pizza Party</option>
                  <option value="meal_prep">Meal Prep</option>
                  <option value="catering">Catering</option>
                  <option value="private_event">Private Event</option>
                  <option value="blocked">Blocked</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Visibility</label>
                <select value={formData.visibility} onChange={e => update('visibility', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={formData.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input type="text" value={formData.location} onChange={e => update('location', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input type="number" min="0" value={formData.capacity} onChange={e => update('capacity', e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Leave empty for unlimited" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Buffer Hours</label>
                <input type="number" min="0" value={formData.buffer_hours} onChange={e => update('buffer_hours', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            
            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900 mb-2">
                      {conflicts.length} Scheduling {conflicts.length === 1 ? 'Conflict' : 'Conflicts'} Detected
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                      {conflicts.map((c, i) => (
                        <li key={i}>
                          {c.conflict_type === 'event' ? '📅' : '🕐'} <strong>{c.conflict_title}</strong> - overlaps by {c.buffer_overlap_minutes} min
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-yellow-700 mt-2">
                      Reduce buffer hours, change the date/time, or save as draft to resolve conflicts.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {checkingConflicts && (
              <div className="text-sm text-gray-500 text-center">
                Checking for conflicts...
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Est. Revenue</label>
                <input type="number" step="0.01" value={formData.estimated_revenue} onChange={e => update('estimated_revenue', e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Food Cost</label>
                <input type="number" step="0.01" value={formData.estimated_food_cost} onChange={e => update('estimated_food_cost', e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Est. Labor Cost</label>
                <input type="number" step="0.01" value={formData.estimated_labor_cost} onChange={e => update('estimated_labor_cost', e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="0.00" />
              </div>
            </div>
            
            {!event?.id && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Repeat</label>
                  <select value={formData.repeat} onChange={e => update('repeat', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="none">None</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {formData.repeat !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Repeat Until</label>
                    <input type="date" value={formData.repeatUntil} onChange={e => update('repeatUntil', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => update('notes', e.target.value)} rows="3" className="w-full px-3 py-2 border rounded-md" />
            </div>
            
            <div className="flex justify-between pt-4">
              {event?.id && onDelete && (
                <button type="button" onClick={() => onDelete(event.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                  Cancel
                </Dialog.Close>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default EventForm;
