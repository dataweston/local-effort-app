# TimeSlotPicker Data Flow for PizzaFunder

## Overview

The TimeSlotPicker component fetches available calendar events from the Supabase database and displays them as selectable date options for customers to schedule their pizza pickup.

---

## Step-by-Step Flow

### 1. Component Mounts (PizzaFunder Success Screen)

**When it happens:**
- Customer successfully completes pledge on `/pizzafunder`
- They purchased **5+ pizzas** AND selected **"deliver to my home"** or **"make live at my home"**

**Component receives props:**
```jsx
<TimeSlotPicker
  pizzaCount={10}                      // From pledge data
  customerName="John Smith"             // From pledge data
  customerEmail="john@example.com"      // From pledge data
  onBook={(booking) => { ... }}         // Callback when booking completes
/>
```

---

### 2. Fetching Available Dates

**API Call:** `GET /api/calendar/public-events`

**Code Location:** `src/components/calendar/TimeSlotPicker.jsx` (lines 29-54)

```jsx
useEffect(() => {
  const fetchAvailableDates = async () => {
    try {
      const res = await fetch('/api/calendar/public-events');
      if (res.ok) {
        const events = await res.json();
        
        // Filter to events that allow bookings and have available capacity
        const bookable = events.filter(event => 
          event.is_bookable &&                          // ⚠️ ISSUE: Not in database
          event.max_capacity > 0 &&                     // ⚠️ ISSUE: Should be 'capacity'
          event.booked_slots < event.max_capacity &&    // ⚠️ ISSUE: Should be 'capacity'
          new Date(event.start_date) >= new Date()
        );
        
        setAvailableDates(bookable);
      }
    } catch (error) {
      console.error('Failed to fetch available dates:', error);
    }
  };

  fetchAvailableDates();
}, []);
```

---

### 3. Database Query

**Endpoint:** `api/calendar/public-events.js`

```javascript
const { data, error } = await supabase
  .from('calendar_events_public')   // Uses view, not table
  .select('*')
  .limit(50);

return res.json({ events: data, source: 'supabase' });
```

**Database View:** `calendar_events_public` (from `supabase/calendar-schema.sql`)

```sql
CREATE OR REPLACE VIEW calendar_events_public AS
SELECT 
  id,
  title,
  start_date,
  end_date,
  start_time,
  end_time,
  event_type,
  location,
  capacity,                              -- ✅ Available
  capacity - booked_slots AS available_slots,
  sanity_data,
  created_at
FROM calendar_events
WHERE visibility = 'public'              -- Only public events
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE         -- Future events only
ORDER BY start_date ASC;
```

**What the view returns:**
```json
{
  "events": [
    {
      "id": "uuid-123",
      "title": "Pizza Pickup Party - Downtown",
      "start_date": "2025-11-15",
      "end_date": null,
      "start_time": "18:00:00",
      "end_time": "20:00:00",
      "event_type": "pizza_party",
      "location": "123 Main St",
      "capacity": 50,
      "available_slots": 42,
      "sanity_data": {...},
      "created_at": "2025-10-21T10:00:00Z"
    }
  ],
  "source": "supabase"
}
```

---

### 4. Client-Side Filtering (BROKEN)

**Current filter logic:**
```javascript
const bookable = events.filter(event => 
  event.is_bookable &&                    // ⚠️ Field doesn't exist in view!
  event.max_capacity > 0 &&               // ⚠️ Should be 'capacity'
  event.booked_slots < event.max_capacity // ⚠️ Should use 'available_slots'
  && new Date(event.start_date) >= new Date()
);
```

**Problems:**
1. ❌ `is_bookable` - Not returned by the view
2. ❌ `max_capacity` - Field is named `capacity` 
3. ❌ `booked_slots` - Not returned by view (use `available_slots` instead)

**What SHOULD work:**
```javascript
const bookable = events.filter(event => 
  event.capacity > 0 &&                   // Has capacity
  event.available_slots > 0 &&            // Has space available
  new Date(event.start_date) >= new Date() // Future date
);
```

---

### 5. Display Available Dates

**If events found:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {availableDates.map(event => {
    const eventDate = parseISO(event.start_date);
    const slotsRemaining = event.max_capacity - event.booked_slots; // ⚠️ BROKEN
    
    return (
      <button onClick={() => setSelectedDate(event)}>
        <div className="font-semibold">
          {format(eventDate, 'EEEE, MMM d')}  {/* "Friday, Nov 15" */}
        </div>
        <div className="text-sm">
          {event.title}  {/* "Pizza Pickup Party - Downtown" */}
        </div>
        <div className="text-xs">
          {slotsRemaining} spots left  {/* "42 spots left" */}
        </div>
      </button>
    );
  })}
</div>
```

**If no events:**
```jsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <p>No pickup dates available yet. We'll send you an email when 
     pickup dates are scheduled.</p>
</div>
```

---

### 6. Customer Selects Date

**User clicks event card:**
```javascript
onClick={() => setSelectedDate(event)}
```

**Selected event stored in state:**
```javascript
{
  id: "uuid-123",
  title: "Pizza Pickup Party - Downtown",
  start_date: "2025-11-15",
  capacity: 50,
  available_slots: 42,
  // ... other fields
}
```

**UI updates:**
- Selected card highlighted with orange border
- Time preference input appears (optional)
- Notes field appears (optional)
- "Confirm Booking" button appears

---

### 7. Customer Submits Booking

**API Call:** `POST /api/calendar/book`

```javascript
const bookingData = {
  event_id: selectedDate.id,           // "uuid-123"
  customer_name: customerName,         // "John Smith"
  customer_email: customerEmail,       // "john@example.com"
  pizza_count: pizzaCount,            // 10
  preferred_time: selectedTime,        // "18:30" (optional)
  notes: notes                         // "Gluten-free please" (optional)
};

await fetch('/api/calendar/book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bookingData)
});
```

---

### 8. Database Insert

**Table:** `calendar_bookings`

```sql
INSERT INTO calendar_bookings (
  event_id,
  customer_name,
  customer_email,
  booking_type,
  booking_status,
  slot_time,
  quantity,
  notes
) VALUES (
  'uuid-123',
  'John Smith',
  'john@example.com',
  'pizza_pickup',
  'confirmed',
  '18:30:00',
  10,
  'Gluten-free please'
);
```

**Trigger fires:** Auto-increments `booked_slots` on the event
```sql
-- Before: capacity=50, booked_slots=8
-- After:  capacity=50, booked_slots=9
```

---

### 9. Success Confirmation

**Component shows:**
```jsx
<Card>
  <div className="text-5xl">✅</div>
  <h3>Booking Confirmed!</h3>
  <p>Your pickup is scheduled for <strong>November 15, 2025</strong> at 6:30 PM.</p>
  <p>We've sent a confirmation to john@example.com</p>
</Card>
```

**Email sent:** Via Brevo integration (existing system)

---

## 🚨 CRITICAL BUGS TO FIX

### Bug #1: Field Name Mismatch
**Problem:** TimeSlotPicker looks for `max_capacity`, but database uses `capacity`

**Fix needed in:** `src/components/calendar/TimeSlotPicker.jsx`

```javascript
// WRONG:
event.max_capacity > 0 && event.booked_slots < event.max_capacity

// RIGHT:
event.capacity > 0 && event.available_slots > 0
```

### Bug #2: Missing `is_bookable` Field
**Problem:** Filter checks `event.is_bookable` but view doesn't return it

**Options to fix:**

**Option A:** Add to view (recommended)
```sql
-- In calendar-schema.sql, update view to include a computed field:
CREATE OR REPLACE VIEW calendar_events_public AS
SELECT 
  id,
  title,
  start_date,
  -- ... other fields
  capacity,
  booked_slots,
  capacity - booked_slots AS available_slots,
  (capacity > 0 AND capacity > booked_slots) AS is_bookable,  -- NEW
  sanity_data,
  created_at
FROM calendar_events
WHERE visibility = 'public' 
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE;
```

**Option B:** Remove from filter
```javascript
// Just check if capacity exists and slots available
const bookable = events.filter(event => 
  event.capacity > 0 && 
  event.available_slots > 0 &&
  new Date(event.start_date) >= new Date()
);
```

### Bug #3: Wrong API Response Structure
**Problem:** API returns `{ events: [...] }` but code expects array

**Current API:**
```javascript
return res.json({ events: data, source: 'supabase' });
```

**TimeSlotPicker expects:**
```javascript
const events = await res.json();  // Expects array directly
```

**Fix needed in:** `api/calendar/public-events.js`

```javascript
// WRONG:
return res.json({ events: data, source: 'supabase' });

// RIGHT (to match other pages):
return res.json(data);  // Return array directly
```

---

## Summary

**How it SHOULD work:**
1. ✅ Customer completes pledge (5+ pizzas, delivery preference)
2. ✅ TimeSlotPicker mounts and calls `/api/calendar/public-events`
3. ❌ API returns events from `calendar_events_public` view (wrong structure)
4. ❌ Component filters for bookable events (using wrong field names)
5. ❌ Display fails because fields don't match
6. ❌ No dates shown to customer

**How it WILL work after fixes:**
1. ✅ Customer completes pledge
2. ✅ TimeSlotPicker calls API
3. ✅ API returns array of public events with correct fields
4. ✅ Component filters: `capacity > 0 && available_slots > 0`
5. ✅ Events displayed as selectable cards
6. ✅ Customer books slot → confirmation email sent

---

## Quick Fix Checklist

- [ ] Update `api/calendar/public-events.js` to return array directly
- [ ] Update `calendar-schema.sql` view to include `booked_slots` field
- [ ] Update `TimeSlotPicker.jsx` to use `capacity` instead of `max_capacity`
- [ ] Update `TimeSlotPicker.jsx` to use `available_slots` for display
- [ ] Add `is_bookable` computed field to view OR remove from filter
- [ ] Run database migration to update view
- [ ] Test with real pledge flow
