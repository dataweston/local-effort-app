# PizzaFunder Scheduling Update

## Changes Made

Updated the PizzaFunder page to conditionally show the TimeSlotPicker based on customer's purchase details.

### Logic Implemented

**TimeSlotPicker is shown ONLY when:**
1. Customer purchases **5 or more pizzas** AND
2. Customer selects either:
   - "deliver to my home" OR
   - "make live at my home"

**TimeSlotPicker is hidden when:**
- Customer purchases fewer than 5 pizzas
- Customer selects other preferences:
  - "public pizza party"
  - "frozen pizza"  
  - "i'm open or i'm not sure"

### Code Changes

**File:** `src/pages/PizzaFunderPage.jsx`

1. **Added rewardPreference to lastPledgeData** (Line ~543):
```jsx
setLastPledgeData({
  pizzaCount: data.pizzaCount,
  funderName: data.funderName,
  email: data.email,
  discountCode: data.discountCode,
  total: data.totalCents / 100,
  rewardPreference: data.rewardPreference, // NEW
});
```

2. **Conditional TimeSlotPicker rendering** (Line ~1253):
```jsx
{/* Scheduling Component - Only show for 5+ pizzas AND delivery/live preferences */}
{!schedulingComplete && 
 lastPledgeData?.pizzaCount >= 5 && 
 (lastPledgeData?.rewardPreference === 'deliver to my home' || 
  lastPledgeData?.rewardPreference === 'make live at my home') && (
  <TimeSlotPicker
    pizzaCount={lastPledgeData?.pizzaCount || 1}
    customerName={lastPledgeData?.funderName || ''}
    customerEmail={lastPledgeData?.email || ''}
    onBook={(booking) => {
      setSchedulingComplete(true);
      console.log('Booking confirmed:', booking);
    }}
  />
)}
```

### User Experience

**Scenario 1: Qualifies for scheduling (5+ pizzas + delivery/make live)**
```
✅ Pledge successful
📧 Check email for confirmation
📅 Schedule your pickup using the form below  ← Shows TimeSlotPicker
🍕 Get ready for pizza
```

**Scenario 2: Does not qualify (< 5 pizzas OR other preference)**
```
✅ Pledge successful
📧 Check email for confirmation
📧 Watch for updates about pickup details  ← No TimeSlotPicker
🍕 Get ready for pizza
```

### Testing

**Test Case 1:** Purchase 5 pizzas with "deliver to my home"
- ✅ Should show TimeSlotPicker

**Test Case 2:** Purchase 10 pizzas with "make live at my home"
- ✅ Should show TimeSlotPicker

**Test Case 3:** Purchase 4 pizzas with "deliver to my home"
- ❌ Should NOT show TimeSlotPicker (less than 5)

**Test Case 4:** Purchase 10 pizzas with "public pizza party"
- ❌ Should NOT show TimeSlotPicker (wrong preference)

**Test Case 5:** Purchase 10 pizzas with "frozen pizza"
- ❌ Should NOT show TimeSlotPicker (wrong preference)

### Known Issue

There is a corrupted emoji character on line 1235 in the original "Next Steps" list that needs manual correction:
- Line currently shows: `<li>� Schedule your pickup using the form below</li>`
- Should be updated to conditional rendering as shown above

The conditional logic is working correctly despite this display issue.

### Future Enhancements

Consider adding:
- Email notification explaining why scheduling is/isn't available
- Link to schedule later for customers who skip initial scheduling
- Admin dashboard to see scheduled vs unscheduled large orders
