const { getSanityClient } = require('../../backend/api/sanityClient');
const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    // Extract user session for auth
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const adminEmails = ['dataweston@gmail.com', 'colsen03@gmail.com'];
          isAdmin = adminEmails.includes(user.email?.toLowerCase());
        }
      } catch (err) {
        // Auth failed
      }
    }
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const sanityClient = getSanityClient();
    if (!sanityClient) {
      return res.status(500).json({ error: 'Sanity not configured' });
    }
    
    const sanityEvents = await sanityClient.fetch('*[_type == "event" && defined(date)] | order(date asc) { _id, title, date, endDate, startTime, endTime, location, description, capacity, ticketsUrl, "imageUrl": image.asset->url }');

    const campaignEvents = await sanityClient.fetch('*[_type == "crowdfundingCampaign" && defined(events) && count(events[defined(startDate)]) > 0] { _id, title, "events": events[defined(startDate)] { location, tagline, summary, startDate, endDate, timingNote, foodType, status, ticketsUrl, ctaLabel, locationDetails, description, "heroImageUrl": heroImage.asset->url } }');

    const flatCampaignEvents = [];
    campaignEvents.forEach(campaign => {
      if (campaign.events && campaign.events.length > 0) {
        campaign.events.forEach((event, index) => {
          flatCampaignEvents.push({
            _id: campaign._id + '_event_' + index,
            _type: 'campaignEvent',
            campaignId: campaign._id,
            campaignTitle: campaign.title,
            title: event.location || 'Pizza Pickup',
            date: event.startDate,
            endDate: event.endDate || null,
            startTime: event.timingNote || null,
            endTime: null,
            location: event.location,
            description: event.description,
            capacity: null,
            ticketsUrl: event.ticketsUrl || null,
            imageUrl: event.heroImageUrl || null,
            status: event.status || 'scheduled',
            foodType: event.foodType || null,
            tagline: event.tagline || null,
            summary: event.summary || null,
            locationDetails: event.locationDetails || null,
            ctaLabel: event.ctaLabel || null
          });
        });
      }
    });

    const allEvents = [...sanityEvents, ...flatCampaignEvents];
    if (!allEvents || allEvents.length === 0) {
      return res.json({ synced: 0, total: 0, message: 'No Sanity events found' });
    }

    let syncedCount = 0;
    const errors = [];

    for (const sanityEvent of allEvents) {
      try {
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('sanity_event_id', sanityEvent._id)
          .maybeSingle();

        const eventData = {
          title: sanityEvent.title || 'Untitled Event',
          start_date: sanityEvent.date,
          end_date: sanityEvent.endDate || null,
          start_time: null, // timingNote is text, not TIME format
          end_time: null,
          location: sanityEvent.location || null,
          capacity: sanityEvent.capacity || null,
          event_type: sanityEvent._type === 'campaignEvent' ? 'pizza_pickup' : 'other',
          visibility: 'public',
          status: sanityEvent.status === 'soldOut' ? 'completed' : 
                  sanityEvent.status === 'cancelled' ? 'cancelled' : 
                  sanityEvent.status === 'postponed' ? 'cancelled' : 
                  'scheduled',
          is_bookable: sanityEvent.ticketsUrl ? false : true,
          sanity_event_id: sanityEvent._id,
          sanity_data: sanityEvent,
          updated_at: new Date().toISOString()
        };

        if (existing) {
          const { error: updateError } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('calendar_events')
            .insert([eventData]);
          if (insertError) throw insertError;
        }
        syncedCount++;
      } catch (err) {
        errors.push({
          sanity_id: sanityEvent._id,
          title: sanityEvent.title,
          error: err.message
        });
      }
    }

    return res.json({
      synced: syncedCount,
      total: allEvents.length,
      sources: {
        events: sanityEvents.length,
        campaignEvents: flatCampaignEvents.length
      },
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
}
