# Mobile-First Calendar UI Design Plan

## Design Philosophy
**Mobile First → Progressive Enhancement**
- Default: Agenda/list view (easiest to scan on mobile)
- Tablet: Compact month grid
- Desktop: Full month grid + sidebar

## Responsive Breakpoints
```css
mobile: < 768px (default)
tablet: 768px - 1024px
desktop: > 1024px
```

## Component Architecture

### 1. CalendarAgenda.jsx (NEW - Mobile Primary)
**Purpose:** List-based event view optimized for mobile scrolling

**Layout:**
```
┌─────────────────────┐
│ ← October 2025 →    │
├─────────────────────┤
│ TODAY - Oct 25      │
│ ┌─────────────────┐ │
│ │ 🍕 Happy Monday │ │
│ │ 5:00 PM - 7:00  │ │
│ │ 📍 Coffee Shop  │ │
│ └─────────────────┘ │
│                     │
│ FRIDAY - Nov 15     │
│ ┌─────────────────┐ │
│ │ 🍕 Paikka       │ │
│ │ 6:00 PM - 8:00  │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**Features:**
- Swipeable month navigation
- Color-coded event cards by type
- Tap to expand details
- Filter chips (pizza/catering/all)
- Pull-to-refresh

**Color Coding:**
- 🟠 Pizza events: `bg-orange-100 border-orange-300`
- 🔵 Catering: `bg-blue-100 border-blue-300`
- 🟢 Confirmed: green accent
- ⚪ Blocked: `bg-gray-100`

### 2. CalendarGrid.jsx (ENHANCED - Desktop Primary)
**Current Issues:**
- Fixed 7-column grid breaks on mobile
- min-h-24 cells too tall for small screens
- Event text truncates poorly

**Improvements:**
```jsx
// Responsive grid classes
<div className={`
  grid gap-0 text-sm
  ${viewMode === 'compact' ? 'grid-cols-7' : 'hidden md:grid md:grid-cols-7'}
`}>
```

**Mobile Compact Mode:**
- Smaller cells (min-h-16)
- Just date number + dot indicators
- No event titles (tap to see)
- 2-letter day names

**Desktop Full Mode:**
- Current design (min-h-24)
- Event titles visible
- Hover states

### 3. CalendarFilters.jsx (NEW)
**Purpose:** Filter events by type, status

```jsx
<div className="flex gap-2 overflow-x-auto pb-2">
  <FilterChip active label="All Events" />
  <FilterChip label="Pizza 🍕" color="orange" />
  <FilterChip label="Catering 🍴" color="blue" />
  <FilterChip label="Confirmed ✓" color="green" />
</div>
```

### 4. EventBottomSheet.jsx (NEW - Mobile)
**Purpose:** Slide-up modal for event details

**Triggered by:**
- Tapping event card in agenda
- Tapping day in compact grid

**Content:**
- Event title, time, location
- Capacity indicator
- Quick actions: Edit, Cancel, View Bookings

## CalendarPage.jsx Integration

### Mobile (<768px):
```jsx
<div className="lg:hidden">
  <CalendarFilters />
  <CalendarAgenda 
    events={events}
    currentMonth={currentMonth}
    onEventClick={openBottomSheet}
  />
</div>
```

### Desktop (>1024px):
```jsx
<div className="hidden lg:block">
  <div className="flex gap-6">
    <div className="flex-1">
      <CalendarGrid mode="full" />
    </div>
    <aside className="w-80">
      <UpcomingEvents list (current) />
      <QuickStats />
    </aside>
  </div>
</div>
```

### Tablet (768-1024px):
**Option 1:** Compact grid only
**Option 2:** Toggle between agenda/grid

## Visual Design System

### Event Type Colors
```js
const EVENT_COLORS = {
  pizza_party: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-500'
  },
  catering: {
    bg: 'bg-blue-50',
    border: 'border-blue-200', 
    text: 'text-blue-900',
    badge: 'bg-blue-500'
  },
  meal_prep: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    badge: 'bg-purple-500'
  },
  blocked: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    badge: 'bg-gray-400'
  }
}
```

### Status Badges
```jsx
{status === 'confirmed' && <Badge color="green">✓ Confirmed</Badge>}
{status === 'scheduled' && <Badge color="blue">○ Scheduled</Badge>}
{status === 'cancelled' && <Badge color="red">✕ Cancelled</Badge>}
```

### Capacity Indicators
```jsx
<div className="flex items-center gap-2 text-sm">
  <Users className="w-4 h-4" />
  <span>{booked_slots}/{capacity}</span>
  {booked_slots >= capacity && <span className="text-red-600">FULL</span>}
</div>
```

## Animation Strategy
- Agenda cards: `fade-in` stagger (50ms delay each)
- Month transitions: `slide-x` 200ms
- Bottom sheet: `slide-up` 300ms spring
- Filter chips: `scale` on tap

## Accessibility
- Touch targets: min 44x44px
- Focus visible on all interactive elements
- ARIA labels on icon buttons
- Semantic HTML (time, article, nav)

## Performance
- Virtual scrolling for 100+ events
- Lazy load past months
- Memoize event calculations
- Debounce filter changes

## Implementation Priority
1. CalendarAgenda.jsx (core mobile experience)
2. Enhance CalendarGrid.jsx responsiveness
3. EventBottomSheet.jsx
4. CalendarFilters.jsx
5. Polish animations

## Success Metrics
- Mobile calendar loads <1s
- Scrolling 60fps
- Touch interactions <100ms response
- Zero horizontal scroll on mobile
