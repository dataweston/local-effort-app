// GET /api/july-dinner/event
// Returns event content (Sanity-backed with fallbacks) plus live seat availability.
const { getEventConfig, getSeatsSold } = require('./_event');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const [event, seatsSold] = await Promise.all([getEventConfig(), getSeatsSold()]);
    const sold = seatsSold === null ? 0 : seatsSold;
    const seatsRemaining = Math.max(0, event.capacity - sold);
    const soldOut = event.status === 'soldOut' || seatsRemaining <= 0;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      event: {
        title: event.title,
        dateLabel: event.dateLabel,
        timeLabel: event.timeLabel,
        eventDateTime: event.eventDateTime,
        location: event.location,
        locationDetails: event.locationDetails,
        priceCents: event.priceCents,
        capacity: event.capacity,
        buyoutPriceCents: event.buyoutPriceCents,
        buyoutCapacity: event.buyoutCapacity,
        maxSeatsPerOrder: event.maxSeatsPerOrder,
        summary: event.summary,
        included: event.included,
        beverageNote: event.beverageNote,
        menu: Array.isArray(event.menu) ? event.menu : [],
        status: event.status,
        heroImageUrl: event.heroImageUrl,
      },
      seatsRemaining,
      soldOut,
      cancelled: event.status === 'cancelled',
    });
  } catch (err) {
    console.error('[july-dinner.event] failed:', err);
    return res.status(500).json({ error: 'Unable to load event' });
  }
};
