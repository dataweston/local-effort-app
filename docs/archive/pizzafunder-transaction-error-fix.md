# PizzaFunder Transaction Error Fix

## Issue
Console errors preventing transactions from completing:
```
Uncaught (in promise) TypeError: q is not a function
Payment error: Error: Credit card number is not valid
TypeError: R is not a function
```

## Root Cause
The error "q is not a function" in minified code indicated that the `toast` function was being called in a problematic way, likely during error handling when the context was lost or the component was unmounting.

## Fixes Applied

### 1. Improved Error Handling in PizzaPledgeForm
**File**: `src/components/pizzafunder/PizzaPledgeForm.jsx`

**Changes**:
- Added safe `showToast` wrapper function that checks if toast is available before calling
- Simplified try-catch nesting to avoid double error handling
- Changed from nested try-catch to single-level error handling
- Removed re-throwing of errors that were already handled

**Before**:
```javascript
try {
  if (result.status === 'OK') {
    try {
      await onPledge({...});
    } catch (pledgeError) {
      toast({ ... }); // Could fail if context lost
      throw pledgeError;
    }
  } else {
    throw new Error(...);
  }
} catch (error) {
  toast({ ... }); // Could fail
}
```

**After**:
```javascript
const showToast = (title, description, variant) => {
  try {
    if (toast && typeof toast === 'function') {
      toast({ title, description, variant });
    }
  } catch (err) {
    console.error('Toast error:', err);
  }
};

try {
  const result = await cardInstanceRef.current.tokenize();
  
  if (result.status !== 'OK') {
    showToast('Card validation failed', errorMsg, 'destructive');
    return; // Early return instead of throw
  }

  await onPledge({...});
} catch (error) {
  console.error('Payment error:', error);
  showToast('Payment failed', error.message, 'destructive');
}
```

### 2. Improved Error Handling in Parent Component
**File**: `src/pages/PizzaFunderPage.jsx`

**Changes**:
- Removed duplicate toast call in parent (let form handle it)
- Improved response parsing with fallback
- Added discount code message in success toast
- Wrapped status refresh in try-catch to prevent failures

**Before**:
```javascript
try {
  const res = await fetch(...);
  const result = await res.json();
  
  if (res.ok && result.success) {
    toast({ title: 'Thank you!', description: result.message || '...' });
    // ...
  } else {
    throw new Error(...);
  }
} catch (error) {
  toast({ ... }); // Duplicate error toast
  throw error;
}
```

**After**:
```javascript
try {
  const res = await fetch(...);
  
  if (!res.ok) {
    const result = await res.json().catch(() => ({ error: 'Failed' }));
    throw new Error(result.error || `Server error: ${res.status}`);
  }
  
  const result = await res.json();
  
  if (result.success) {
    const discountMsg = data.discountCode ? ` Discount code applied!` : '';
    toast({ title: 'Thank you!', description: `Success!${discountMsg}` });
    
    // Wrapped in try-catch to prevent cascade failures
    try {
      const statusRes = await fetch('/api/pizzafunder/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
    } catch (statusErr) {
      console.error('Failed to refresh status:', statusErr);
    }
    
    setShowPledgeForm(false);
    setSelectedTier(null);
  } else {
    throw new Error(result.error || 'Payment failed');
  }
} catch (error) {
  console.error('[handlePledgeSubmit] Error:', error);
  throw error; // Let form handle toast
}
```

## Benefits

### 1. Safe Toast Calls
- `showToast` helper wraps all toast calls in try-catch
- Checks if toast function exists before calling
- Logs errors instead of crashing

### 2. No Duplicate Error Messages
- Form handles showing error toast
- Parent only re-throws error, doesn't show duplicate toast
- User sees one clear error message instead of multiple

### 3. Prevents Cascade Failures
- Status refresh failure doesn't break pledge success
- Each async operation wrapped independently
- Better error isolation

### 4. Better Error Messages
- Discount code mentioned in success message
- More specific error messages (card validation vs payment vs server)
- Console logs preserved for debugging

## Testing

### Test Case 1: Valid Discount Code
1. Enter "since2022" discount code
2. Fill form with valid data
3. Enter valid card (test mode: 4111 1111 1111 1111)
4. Submit pledge
5. ✅ Should show success toast with discount mention
6. ✅ Should close form and refresh totals
7. ✅ No console errors

### Test Case 2: Invalid Card
1. Fill form with valid data
2. Enter invalid card number
3. Submit pledge
4. ✅ Should show "Card validation failed" toast
5. ✅ Form stays open for correction
6. ✅ No "q is not a function" error

### Test Case 3: Server Error
1. Fill form with valid data
2. Disconnect from internet or stop server
3. Submit pledge
4. ✅ Should show "Payment failed" toast
5. ✅ Error message includes server details
6. ✅ No crashes or undefined function errors

### Test Case 4: Normal Payment
1. Don't enter discount code
2. Fill form with valid data
3. Enter valid card
4. Submit pledge
5. ✅ Should show success toast
6. ✅ Should process payment through Square
7. ✅ Should refresh totals
8. ✅ No console errors

## Related Issues Fixed

### Issue: "Credit card number is not valid"
This is a legitimate Square validation error when test card numbers are entered incorrectly. The fix ensures this error is shown cleanly without causing crashes.

### Issue: Toast context lost during error
The original code assumed `toast` would always be available, but during rapid state changes or component unmounting, the context could be lost, causing "is not a function" errors.

### Issue: Double error toasts
Both parent and child components were showing error toasts, confusing users. Now only the form shows errors.

## Deployment

### No Database Changes Required
All fixes are frontend-only.

### No API Changes Required
API already handles discount codes correctly.

### Deploy Steps
1. Commit changes to `src/components/pizzafunder/PizzaPledgeForm.jsx`
2. Commit changes to `src/pages/PizzaFunderPage.jsx`
3. Build and deploy frontend
4. Test all scenarios above

## Monitoring

After deployment, monitor for:
- Reduction in "TypeError" console errors
- Successful pledge completion rate
- User feedback about error messages
- Discount code usage stats

### Check Successful Pledges
```sql
SELECT 
  COUNT(*) as total_pledges,
  SUM(CASE WHEN discount_code IS NOT NULL THEN 1 ELSE 0 END) as discount_pledges,
  SUM(amount_cents) / 100.0 as total_revenue
FROM crowdfund_pledges
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Future Improvements

### 1. Better Square Error Messages
Map Square error codes to user-friendly messages:
- "INVALID_CARD_NUMBER" → "Please check your card number"
- "INVALID_EXPIRATION" → "Please check the expiration date"
- "CVV_FAILURE" → "Please verify your security code"

### 2. Retry Logic
For network errors, offer automatic retry:
```javascript
const retryFetch = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

### 3. Form State Persistence
Save form data to localStorage to prevent data loss:
```javascript
useEffect(() => {
  const saved = localStorage.getItem('pledge-draft');
  if (saved) {
    const data = JSON.parse(saved);
    setFunderName(data.funderName || '');
    setEmail(data.email || '');
    // ...
  }
}, []);
```

### 4. Real-time Validation
Show validation as user types:
- Email format validation
- Phone number formatting
- Card number formatting (via Square SDK)

## Related Files
- `src/components/pizzafunder/PizzaPledgeForm.jsx` - Form error handling
- `src/pages/PizzaFunderPage.jsx` - Parent error handling
- `docs/pizzafunder-discount-code-implementation.md` - Discount feature docs
