#!/bin/bash

# Calendar System Test & Verification Script
# Run this after applying the database migration

echo "🔍 Calendar System Verification"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this from the project root directory"
  exit 1
fi

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  
  echo -n "Testing $description... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173$endpoint")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "http://localhost:5173$endpoint" -H "Content-Type: application/json")
  fi
  
  if [ "$response" = "200" ] || [ "$response" = "201" ]; then
    echo "✅ OK ($response)"
  else
    echo "❌ FAILED ($response)"
  fi
}

echo "📡 Testing API Endpoints"
echo "------------------------"

test_endpoint "GET" "/api/calendar/events" "Events endpoint"
test_endpoint "GET" "/api/calendar/time-slots" "Time slots endpoint"
test_endpoint "GET" "/api/calendar/public-events" "Public events endpoint"
test_endpoint "POST" "/api/calendar/sync-sanity" "Sync Sanity endpoint"

echo ""
echo "🗄️  Database Tables Check"
echo "------------------------"
echo "Please verify these tables exist in your Supabase dashboard:"
echo "  ✓ calendar_events"
echo "  ✓ calendar_time_slots"
echo "  ✓ calendar_bookings"
echo "  ✓ calendar_receipts"
echo "  ✓ calendar_invitations (should already exist)"
echo ""
echo "  Views:"
echo "  ✓ calendar_events_public"
echo "  ✓ calendar_time_slots_available"
echo ""

echo "🎯 Next Steps"
echo "-------------"
echo "1. Apply the database migration (see README_CALENDAR_SETUP.md)"
echo "2. Sync Sanity events: curl -X POST http://localhost:5173/api/calendar/sync-sanity"
echo "3. Visit http://localhost:5173/calendar to test the UI"
echo "4. Create a time slot using the TimeSlotManager"
echo "5. Test the invitation flow"
echo ""

echo "📚 Useful Commands"
echo "------------------"
echo "# Sync events from Sanity:"
echo "curl -X POST http://localhost:5173/api/calendar/sync-sanity"
echo ""
echo "# Get all events:"
echo "curl http://localhost:5173/api/calendar/events"
echo ""
echo "# Get public events only:"
echo "curl http://localhost:5173/api/calendar/public-events"
echo ""
echo "# Get available time slots:"
echo "curl 'http://localhost:5173/api/calendar/time-slots?available_only=true'"
echo ""

echo "✨ Done!"
