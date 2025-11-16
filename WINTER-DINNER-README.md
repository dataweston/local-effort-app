# Winter Dinner Ticket Sales Page

## Overview
An elegant, fixed-layout single-page experience for selling winter dinner tickets with integrated payment processing, email notifications, and database storage.

## What Was Built

### 1. Page Component
**File:** [src/pages/WinterDinnerPage.jsx](src/pages/WinterDinnerPage.jsx)

- Single-page, fixed layout (no scrolling)
- Fully responsive (desktop & mobile)
- Animated GIF background (`sprite_flicker.gif`) at 80% screen width
- "Attend Dinner" call-to-action button
- Framer Motion animations for smooth transitions

### 2. Registration Modal
**File:** [src/components/WinterDinner/DinnerRegistrationModal.jsx](src/components/WinterDinner/DinnerRegistrationModal.jsx)

Features:
- Elegant modal with Framer Motion entrance/exit animations
- Form fields (all using shadcn/ui):
  - Name (required)
  - Email (required)
  - Phone number (required)
  - Dietary restrictions & allergies (textarea)
  - Alcohol/non-alcohol toggle (Switch component)
- Integrated Square checkout
- Success screen with confirmation message
- Real-time validation

### 3. Payment Integration
**File:** [api/winter-dinner/checkout.js](api/winter-dinner/checkout.js)

Handles:
- Square payment processing
- Supabase database storage
- Brevo email notifications (customer & admin)
- Contact management via Brevo

**Default Ticket Price:** $75.00

### 4. UI Components Created
**File:** [src/components/ui/switch.jsx](src/components/ui/switch.jsx)

- New shadcn/ui Switch component for the alcohol toggle
- Built with Radix UI primitives

### 5. Database Setup
**File:** [supabase-winter-dinner-setup.sql](supabase-winter-dinner-setup.sql)

SQL script to create the `winter_dinner_registrations` table with:
- Payment tracking
- Customer information
- Dietary restrictions
- Alcohol preference
- Row-level security policies

### 6. Routing
Updated [src/App.jsx](src/App.jsx) to include:
- Route: `/winterdinner`
- Hidden header and footer on this page for immersive experience

## Setup Instructions

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:
```sql
-- Execute the contents of supabase-winter-dinner-setup.sql
```

### 2. Environment Variables
Ensure these are configured in your environment:
```
# Square
SQUARE_ACCESS_TOKEN=<your_square_access_token>
SQUARE_LOCATION_ID=<your_square_location_id>
SQUARE_ENVIRONMENT=Production (or Sandbox)

# Supabase
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_key>

# Brevo
BREVO_API_KEY=<your_brevo_api_key>
SENDER_EMAIL=<your_sender_email>
TEAM_INBOX_EMAIL=<your_team_email>

# Frontend (Vite)
VITE_SQUARE_APP_ID=<your_square_app_id>
VITE_SQUARE_LOCATION_ID=<your_square_location_id>
VITE_SQUARE_ENV=production (or sandbox)
```

### 3. Event Details
Update event details in [api/winter-dinner/checkout.js](api/winter-dinner/checkout.js:126-129):
```javascript
const eventDate = 'December 21, 2025';
const eventTime = '6:00 PM';
const eventLocation = 'Local Effort Space';
const eventAddress = '1024 E 38th St, Minneapolis, MN';
```

### 4. Ticket Price
To change the ticket price, update the constant in:
- Frontend: [src/components/WinterDinner/DinnerRegistrationModal.jsx:10](src/components/WinterDinner/DinnerRegistrationModal.jsx#L10)
- Backend: [api/winter-dinner/checkout.js:44](api/winter-dinner/checkout.js#L44)

## User Flow

1. User visits `/winterdinner`
2. Sees animated background with "Attend Dinner" button
3. Clicks button → modal opens with registration form
4. Fills out form and enters payment details
5. Square processes payment
6. Registration saved to Supabase
7. Customer receives confirmation email via Brevo
8. Admin receives notification email
9. Success screen displays
10. User can close modal

## Email Notifications

### Customer Email
- Subject: "✨ Your Winter Dinner Ticket Confirmation"
- Contains event details, customer info, and payment confirmation
- Formatted for readability

### Admin Email
- Subject: "🎫 New Ticket: [Customer Name] - Winter Dinner"
- Contains all registration details
- Includes dietary restrictions and alcohol preference

## Features Implemented

✅ Single-page, fixed, responsive layout
✅ Animated GIF background (sprite_flicker.gif)
✅ Framer Motion modal animations
✅ Shadcn/ui form components
✅ Alcohol/non-alcohol toggle switch
✅ Square payment integration
✅ Success confirmation screen
✅ Customer email confirmation (Brevo)
✅ Admin notification email (Brevo)
✅ Supabase database storage
✅ Contact management (Brevo)
✅ Form validation
✅ Error handling

## File Structure
```
src/
├── pages/
│   └── WinterDinnerPage.jsx          # Main page component
├── components/
│   ├── WinterDinner/
│   │   └── DinnerRegistrationModal.jsx  # Registration modal & form
│   └── ui/
│       └── switch.jsx                # New toggle component
└── App.jsx                           # Updated with /winterdinner route

api/
└── winter-dinner/
    └── checkout.js                   # Payment & notification handler

public/
└── images/
    └── sprite_flicker.gif            # Background animation

supabase-winter-dinner-setup.sql      # Database setup script
```

## Testing Checklist

- [ ] Run Supabase SQL setup script
- [ ] Verify all environment variables are set
- [ ] Test payment flow with Square test cards
- [ ] Verify customer email is sent
- [ ] Verify admin email is received
- [ ] Check Supabase for saved registration
- [ ] Test on mobile devices
- [ ] Verify responsive layout
- [ ] Test form validation
- [ ] Test error handling

## Notes

- The page is completely isolated (no header/footer)
- Build completed successfully
- All dependencies installed (@radix-ui/react-switch)
- Compatible with existing codebase architecture
- Follows established patterns for Square checkout and Brevo emails

## Support

For questions or issues, refer to the existing payment implementations:
- [api/store/checkout.js](api/store/checkout.js) - Similar Square payment pattern
- [backend/api/services/brevo.js](backend/api/services/brevo.js) - Email service reference
