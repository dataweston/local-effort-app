# Sale Pages Title & Formatting Update

**Date:** October 15, 2024  
**Files Modified:** `src/pages/TinyDinerSalePage.jsx`, `src/pages/HappyMondaySalePage.jsx`

## Overview
Updated both sale pages with prominent "PIZZA AT" titles and enhanced visual formatting using shadcn/ui Card components for a more polished, professional presentation.

## Changes Made

### Title Updates
**Before:**
- Tiny Diner: "Tiny Diner Sale"
- Happy Monday: "Happy Monday Sale"

**After:**
- Tiny Diner: "PIZZA AT TINY DINER"
- Happy Monday: "PIZZA AT HAPPY MONDAY COFFEE"

### Visual Enhancements

#### 1. **Title Section**
- Large, bold typography: `text-5xl md:text-6xl font-bold tracking-tight`
- Increased prominence of page titles
- Better spacing and hierarchy
- Responsive design (smaller on mobile, larger on desktop)

#### 2. **Subheading**
- Upgraded from basic text to: `text-xl text-neutral-600 font-medium`
- Better contrast and readability
- More visual weight to complement the title

#### 3. **Intro Content Card**
- **Tiny Diner:** Wrapped in Card with `border-amber-200 bg-amber-50/30`
- **Happy Monday:** Wrapped in Card with `border-blue-200 bg-blue-50/30`
- Clean, contained presentation of intro text
- Maintains brand colors (amber for Tiny Diner, blue for Happy Monday)

#### 4. **Pickup Information Card**
- Upgraded from basic alert div to shadcn Card component
- **Tiny Diner:** `border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50`
- **Happy Monday:** `border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50`
- Added lucide-react icons:
  - `Info` icon for card accent
  - `MapPin` icon for location details
  - `Clock` icon for time details
- Better visual hierarchy with icon + text layout
- Improved spacing and readability

## Technical Implementation

### Components Added
```jsx
import { Card, CardContent } from '../components/ui/card';
import { Info, MapPin, Clock } from 'lucide-react';
```

### Structure Pattern
```jsx
<h1 className="text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 mb-3">
  PIZZA AT [LOCATION]
</h1>
<p className="text-xl text-neutral-600 font-medium mb-4">
  {saleIntro.subheading}
</p>
<Card className="border-[color]-200 bg-[color]-50/30">
  <CardContent className="pt-4">
    <div className="prose prose-neutral prose-[color] max-w-none">
      <PortableText ... />
    </div>
  </CardContent>
</Card>
```

### Pickup Info Card Pattern
```jsx
<Card className="mb-6 border-[color]-300 bg-gradient-to-br from-[color]-50 to-[variation]-50">
  <CardContent className="pt-4">
    <div className="flex items-start gap-3">
      <Info className="h-5 w-5 text-[color]-600" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Pickup Information
        </h3>
        <div className="text-sm space-y-1">
          <p className="flex items-start gap-2">
            <Clock className="h-4 w-4" />
            <span><strong>When:</strong> [date/time]</span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="h-4 w-4" />
            <span><strong>Where:</strong> [location]</span>
          </p>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

## Design Decisions

### Color Schemes
- **Tiny Diner:** Amber/Orange gradient (warm, inviting)
- **Happy Monday:** Blue/Sky gradient (fresh, coffee shop vibes)
- Maintains brand consistency across pages

### Typography Hierarchy
1. **Title:** Largest, bold, uppercase → Immediate attention
2. **Subheading:** Medium, prominent → Supporting context
3. **Intro Card:** Contained prose → Detailed information
4. **Pickup Info:** Icon-enhanced card → Critical logistics

### Responsive Design
- `text-5xl md:text-6xl` ensures readability on mobile
- `flex-1` and `flex-shrink-0` for cart button positioning
- Icons maintain consistent sizing across viewports

## Benefits

1. **Improved Visual Hierarchy**
   - Clear "PIZZA AT" branding
   - Better content organization
   - Scannable information layout

2. **Enhanced User Experience**
   - Icons provide visual cues
   - Cards create clear content boundaries
   - Gradient backgrounds add depth

3. **Brand Consistency**
   - Maintained color schemes
   - Consistent pattern across both pages
   - Professional, polished appearance

4. **Accessibility**
   - Better contrast with larger text
   - Icon + text combinations for clarity
   - Semantic HTML structure

## Testing Checklist

- [ ] Verify titles display correctly: "PIZZA AT TINY DINER" and "PIZZA AT HAPPY MONDAY COFFEE"
- [ ] Check responsive behavior on mobile, tablet, desktop
- [ ] Confirm subheading renders when available in Sanity
- [ ] Test intro card displays PortableText content correctly
- [ ] Verify pickup info icons align properly
- [ ] Check gradient backgrounds render smoothly
- [ ] Ensure cart button remains visible and functional
- [ ] Test color contrast meets accessibility standards
- [ ] Verify prose styling in intro cards
- [ ] Check spacing and margins across all sections

## Future Enhancements

1. **Dynamic Pickup Info**
   - Fetch from Sanity instead of hardcoded
   - Allow per-sale customization
   - Add support for multiple pickup windows

2. **Additional Icons**
   - Phone number with Phone icon
   - Special instructions with AlertCircle icon
   - Parking info with Car icon

3. **Badge Components**
   - "Limited Time" badge
   - "Sold Out" indicators
   - "New" item badges

4. **Animation**
   - Subtle fade-in for cards
   - Hover effects on pickup info
   - Smooth transitions on mobile

## Related Files

- `src/pages/TinyDinerSalePage.jsx` - Tiny Diner sale page
- `src/pages/HappyMondaySalePage.jsx` - Happy Monday sale page
- `src/components/ui/card.jsx` - shadcn Card component
- `lucide-react` package - Icon library

## Notes

- Pickup dates/locations currently hardcoded in components
- Consider moving to Sanity for easier updates
- Both pages follow identical structure pattern for consistency
- Icons from lucide-react are tree-shakeable (only imports used icons)
