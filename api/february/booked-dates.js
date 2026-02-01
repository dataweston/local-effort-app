// GET /api/february/booked-dates
// Returns array of dates that are already booked for February dinners

const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Get the current year's February or next year if we're past February
    const now = new Date();
    const year = now.getMonth() > 1 ? now.getFullYear() + 1 : now.getFullYear();
    const startDate = `${year}-02-01`;
    const endDate = `${year}-02-28`;

    const { data, error } = await supabase
      .from('february_bookings')
      .select('booking_date')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .eq('status', 'confirmed');

    if (error) {
      console.error('[february.booked-dates] query error', error);
      return res.status(500).json({ error: 'Failed to fetch booked dates' });
    }

    const bookedDates = (data || []).map((row) => row.booking_date);

    return res.status(200).json({ bookedDates });
  } catch (err) {
    console.error('[february.booked-dates] error', err?.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
