# Calendar Auth Follow-Up Instructions

## Context
- `/calendar` currently renders a public blank state; admin features and event data require Supabase auth that is not wired up.
- Front-end previously attempted to use Supabase, but current repo state does **not** send auth tokens in calendar fetches or gate admin-only actions.
- Calendar API handlers (`api/calendar/*`) still allow unauthenticated access for write operations.
- Supabase environment variables exist in `.env`; target admin emails are `dataweston@gmail.com`, `colsen03@gmail.com`.

## Objectives
1. **Restore Supabase auth plumbing in the front-end:**
   - Update `SupabaseAuthContext.jsx` to expose the current session access token (e.g. `accessToken`).
   - Ensure the context re-fetches on auth state change and provides `isAdmin(email)`.
   - Audit `CalendarAuthBanner.jsx`/sign-in flow to confirm Google OAuth redirect works.

2. **Fix `/calendar` page behaviour (`src/pages/CalendarPage.jsx`):**
   - Use the access token for all calls to `/api/calendar/*`.
   - Re-fetch events/receipts after sign-in, and show loading states while auth initializes.
   - Gate admin-only UI and actions (new event, CSV import/export, Sanity sync, Time Slots, Invitations, Financials) so public users cannot see controls or trigger fetches.
   - For non-admins, keep read-only experience (public events only) and show EventBottomSheet instead of edit dialog when clicking an event.

3. **Secure calendar admin tools:**
   - `TimeSlotManager.jsx` and `InvitationManager.jsx` must require admin access and include auth headers.
   - `EventForm.jsx` should attach auth headers when checking conflicts and only surface conflict info for admins.

4. **Lock down API handlers:**
   - In `api/calendar/events.js`, `time-slots.js`, `generate-invite.js`, `receipts.js`, etc., verify the Supabase user from the provided Bearer token.
   - Reject write operations (POST/PUT/PATCH/DELETE) unless the user is an approved admin email.
   - Ensure conflict check endpoints also enforce admin access.

5. **Regression coverage:**
   - Manual flow: visit `/calendar`, sign in with Google admin, confirm events populate and admin tabs/actions work.
   - Confirm public (signed-out) view still shows public events and hides admin controls.
   - Exercise API endpoints with/without auth (e.g. using `curl`) to verify rejection of unauthenticated writes.

## References
- `.github/instructions/calendar-master-system.instructions.md`
- `CALENDAR-STATUS.md` for desired feature set
- `.env` for Supabase keys and admin email list

## Deliverables
- Front-end auth fixes merged.
- API auth checks added with clear error responses.
- Short summary of tests performed (UI + API) before handing back.
