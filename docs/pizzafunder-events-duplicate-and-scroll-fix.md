# PizzaFunder Events Duplicate & Mobile Scroll Fix

**Date:** October 15, 2025  
**Issues:** 
1. Events displaying twice (standalone section + Events tab)
2. Event modal won't scroll on mobile, content cut off
**Status:** ✅ Fixed

## Problems

### 1. Duplicate Events Display
Events were appearing in TWO locations on `/pizzafunder`:
- **Standalone "Upcoming Pizza Events" section** - Grid of 4 event cards before the main content
- **"Events" tab** - List of all events within the tab system

This created redundancy and visual clutter.

### 2. Mobile Modal Scroll Issue
When clicking an event on mobile:
- Modal opened but content was cut off
- Unable to scroll to see full event details
- Description, ticket buttons, and other content were inaccessible

**Root Cause:** EventDialog had conflicting overflow settings:
- Parent `DialogContent` had `overflow-hidden` and `min-h-0`
- Child had `overflow-y-auto` but was constrained by parent
- Mobile max-height was too restrictive
- Hero image had `h-full` which caused layout issues on mobile

## Solutions Applied

### Fix 1: Remove Duplicate Events Section

**Removed** the standalone "Upcoming Pizza Events" section (lines 772-838):
```jsx
// REMOVED THIS ENTIRE BLOCK:
{/* Upcoming Events Section */}
{upcomingEvents && upcomingEvents.length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="space-y-4"
  >
    <h2 className="text-3xl font-bold text-neutral-900">Upcoming Pizza Events</h2>
    <p className="text-neutral-600">Join us at these pizza parties and pick up your pizzas!</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {upcomingEvents.slice(0, 4).map((event) => {
        // Event cards...
      })}
    </div>
    
    {upcomingEvents.length > 4 && (
      <p className="text-center text-neutral-600 text-sm">
        And {upcomingEvents.length - 4} more events!
      </p>
    )}
  </motion.div>
)}
```

**Result:** Events now only appear in the "Events" tab where they belong.

### Fix 2: Fix Mobile Modal Scrolling

**Changed EventDialog container structure:**

**Before:**
```jsx
<DialogContent
  className={cn(
    'max-w-3xl overflow-hidden p-0 min-h-0',
    'max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-4rem)]',
    '[&_[data-radix-dialog-close]]:z-20'
  )}
>
  <div className={cn(
    'flex h-full min-h-0 w-full flex-col overflow-hidden',
    hasHeroImage ? 'md:flex-row' : ''
  )}>
    {hasHeroImage && (
      <div className="relative h-56 w-full flex-shrink-0 overflow-hidden bg-slate-100 md:h-full md:w-64 md:max-h-full md:self-stretch">
    )}
    <div className="flex-1 min-h-0 overflow-y-auto p-6 md:max-h-full">
```

**After:**
```jsx
<DialogContent
  className={cn(
    'max-w-3xl p-0',
    'max-h-[90vh] sm:max-h-[85vh]',
    'overflow-y-auto',
    '[&_[data-radix-dialog-close]]:z-20'
  )}
>
  <div className={cn(
    'flex w-full flex-col',
    hasHeroImage ? 'md:flex-row' : ''
  )}>
    {hasHeroImage && (
      <div className="relative h-56 w-full flex-shrink-0 overflow-hidden bg-slate-100 md:h-auto md:w-64 md:min-h-[400px]">
    )}
    <div className="flex-1 p-6">
```

**Key Changes:**
1. **Removed `overflow-hidden`** from DialogContent - allows scrolling
2. **Changed max-height** to `90vh` on mobile, `85vh` on desktop - more reasonable viewport usage
3. **Added `overflow-y-auto`** directly to DialogContent - enables scrolling
4. **Removed `h-full` and `min-h-0`** constraints - prevents layout conflicts
5. **Changed hero image** from `h-full` to `h-56` mobile, `h-auto` desktop with `min-h-[400px]`
6. **Removed nested `overflow-y-auto`** - scrolling now at parent level

### Fix 3: Cleanup Unused Import

Removed `ChevronRight` import since it was only used in the deleted standalone events section:

```jsx
// REMOVED:
import { ChevronRight } from 'lucide-react';
```

## Testing

### Test 1: Verify No Duplicate Events
1. Navigate to `/pizzafunder`
2. Scroll down - should NOT see "Upcoming Pizza Events" section before tabs
3. Click "Events" tab - should see all events listed here
4. ✅ Events only appear once

### Test 2: Mobile Modal Scrolling
1. Open `/pizzafunder` on mobile (or resize browser to mobile width)
2. Click "Events" tab
3. Click any event card
4. Modal should open
5. **Verify scrolling works:**
   - Swipe up/down to scroll
   - Should be able to see full event description
   - Should be able to reach ticket button at bottom
   - Hero image should display properly without layout breaks
6. ✅ Modal scrolls smoothly, all content accessible

### Test 3: Desktop Modal
1. Open `/pizzafunder` on desktop
2. Click "Events" tab
3. Click any event
4. Modal should open with hero image on left, content on right
5. Content should scroll if needed
6. ✅ Desktop layout works correctly

## Visual Comparison

### Before:
```
[Hero & Progress]
[Upcoming Events Grid] ← DUPLICATE
[Main Content]
  └── [Tabs]
      └── [Events Tab] ← ORIGINAL
          └── [Event List]
```

### After:
```
[Hero & Progress]
[Main Content]
  └── [Tabs]
      └── [Events Tab] ← ONLY LOCATION
          └── [Event List]
```

## Benefits

1. **Cleaner Layout** - No duplicate content
2. **Better Organization** - Events are logically grouped with other content tabs
3. **Mobile Friendly** - Event modals now scroll properly on small screens
4. **Reduced Confusion** - Users won't wonder why events appear twice
5. **Faster Load** - Not rendering duplicate event cards
6. **Better UX** - All event details accessible on all screen sizes

## Related Files

- **Modified:** `src/pages/PizzaFunderPage.jsx`
- **Lines Changed:** 
  - Removed lines 772-838 (standalone events section)
  - Modified lines 82-107 (EventDialog scrolling)
  - Removed line 21 (ChevronRight import)

## Notes

- Events tab still shows all upcoming events (not limited to 4)
- Event cards in tab have click handlers that open the modal
- Modal now uses viewport-based height instead of calc() for better mobile support
- Hero image in modal adapts better to mobile vs desktop layouts
- Sticky header in modal still works on scroll
