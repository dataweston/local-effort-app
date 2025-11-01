import React, { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';

export default function TimeSlotManager({ accessToken }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  
  const [formData, setFormData] = useState({
    slot_date: '',
    slot_time: '',
    slot_type: 'pizza_pickup',
    capacity: '',
    buffer_hours: 4,
    location: '',
    notes: ''
  });
  
  useEffect(() => {
    loadSlots();
  }, []);
  
  const loadSlots = async () => {
    try {
      setLoading(true);
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch('/api/calendar/time-slots', { headers });
      if (!response.ok) throw new Error('Failed to load time slots');
      const data = await response.json();
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setConflicts([]);
    
    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        buffer_hours: parseInt(formData.buffer_hours)
      };
      
      const url = editingSlot 
        ? `/api/calendar/time-slots?id=${editingSlot.id}`
        : '/api/calendar/time-slots';
      
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(url, {
        method: editingSlot ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 409 && result.conflicts) {
          setConflicts(result.conflicts);
          setError('Scheduling conflicts detected. See details below.');
        } else {
          setError(result.error || result.message || 'Failed to save time slot');
        }
        return;
      }
      
      // Success
      await loadSlots();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setFormData({
      slot_date: slot.slot_date,
      slot_time: slot.slot_time,
      slot_type: slot.slot_type,
      capacity: slot.capacity || '',
      buffer_hours: slot.buffer_hours,
      location: slot.location || '',
      notes: slot.notes || ''
    });
    setError(null);
    setConflicts([]);
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Delete this time slot? This cannot be undone.')) return;
    
    try {
      setLoading(true);
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const response = await fetch(`/api/calendar/time-slots?id=${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete');
      }
      
      await loadSlots();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setEditingSlot(null);
    setFormData({
      slot_date: '',
      slot_time: '',
      slot_type: 'pizza_pickup',
      capacity: '',
      buffer_hours: 4,
      location: '',
      notes: ''
    });
    setError(null);
    setConflicts([]);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Slot Management</h2>
        <button 
          onClick={loadSlots}
          disabled={loading}
          className="btn btn-secondary"
        >
          Refresh
        </button>
      </div>
      
      {/* Form */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">
            {editingSlot ? 'Edit Time Slot' : 'Create New Time Slot'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date *</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={formData.slot_date}
                  onChange={(e) => setFormData({ ...formData, slot_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Time *</span>
                </label>
                <input
                  type="time"
                  className="input input-bordered"
                  value={formData.slot_time}
                  onChange={(e) => setFormData({ ...formData, slot_time: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.slot_type}
                  onChange={(e) => setFormData({ ...formData, slot_type: e.target.value })}
                >
                  <option value="pizza_pickup">Pizza Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="meal_prep">Meal Prep</option>
                  <option value="catering">Catering</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Capacity</span>
                  <span className="label-text-alt">Leave empty for unlimited</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="input input-bordered"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Buffer Hours</span>
                  <span className="label-text-alt">Conflict prevention window</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="input input-bordered"
                  value={formData.buffer_hours}
                  onChange={(e) => setFormData({ ...formData, buffer_hours: e.target.value })}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
            
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            {conflicts.length > 0 && (
              <div className="alert alert-warning">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-bold">Conflicts Detected:</span>
                  </div>
                  <ul className="list-disc list-inside ml-8">
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        {c.type === 'event' ? '📅' : '🕐'} <strong>{c.title}</strong>
                        <br />
                        <span className="text-sm ml-6">
                          {format(new Date(c.start), 'MMM d, h:mm a')} - {format(new Date(c.end), 'h:mm a')}
                          {' '}(overlaps by {c.overlap_minutes} min)
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm ml-6">
                    Reduce buffer hours or choose a different date/time.
                  </p>
                </div>
              </div>
            )}
            
            <div className="card-actions justify-end gap-2">
              {editingSlot && (
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingSlot ? 'Update Slot' : 'Create Slot'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Slots List */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">Existing Time Slots</h3>
          
          {loading && <p>Loading...</p>}
          
          {!loading && slots.length === 0 && (
            <p className="text-gray-500">No time slots created yet.</p>
          )}
          
          {!loading && slots.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Buffer</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id}>
                      <td>{format(new Date(slot.slot_date), 'MMM d, yyyy')}</td>
                      <td>{format(parse(slot.slot_time, 'HH:mm:ss', new Date()), 'h:mm a')}</td>
                      <td className="capitalize">{slot.slot_type.replace('_', ' ')}</td>
                      <td>
                        {slot.capacity ? (
                          <span>
                            {slot.booked_count}/{slot.capacity}
                            {slot.booked_count >= slot.capacity && ' ⚠️ Full'}
                          </span>
                        ) : (
                          'Unlimited'
                        )}
                      </td>
                      <td>{slot.buffer_hours}h</td>
                      <td>
                        <span className={`badge ${
                          slot.status === 'available' ? 'badge-success' :
                          slot.status === 'booked' ? 'badge-warning' :
                          'badge-error'
                        }`}>
                          {slot.status}
                        </span>
                      </td>
                      <td className="space-x-2">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleEdit(slot)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleDelete(slot.id)}
                          disabled={slot.booked_count > 0}
                          title={slot.booked_count > 0 ? 'Cannot delete slot with bookings' : 'Delete slot'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
