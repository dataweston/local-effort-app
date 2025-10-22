import { createClient } from '@supabase/supabase-js';
import sanityClient from '../../src/sanityClient';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch published events from Sanity
    const sanityEvents = await sanityClient.fetch(`
      *[_type == "event" && defined(date)] | order(date asc) {
        _id,
        title,
        date,
        endDate,
        startTime,
        endTime,
        location,
        description,
        capacity,
        ticketsUrl,
        "imageUrl": image.asset->url
      }
    `);

    // Fetch campaign events (pizza reward pickup opportunities)
    const campaignEvents = await sanityClient.fetch(`
      *[_type == "crowdfundingCampaign" && defined(events)] {
        _id,
        title,
        "events": events[] {
          location,
          tagline,
          summary,
          startDate,
          endDate,
          timingNote,
          foodType,
          status,
          ticketsUrl,
          ctaLabel,
          locationDetails,
          description,
          "heroImageUrl": heroImage.asset->url
        }
      }
    `);

    // Flatten campaign events into individual event objects
    const flatCampaignEvents = [];
    campaignEvents.forEach(campaign => {
      if (campaign.events && campaign.events.length > 0) {
        campaign.events.forEach((event, index) => {
          flatCampaignEvents.push({
            // Create unique ID combining campaign _id and event index
            _id: `${campaign._id}_event_${index}`,
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

    // Combine both event sources
    const allEvents = [...sanityEvents, ...flatCampaignEvents];

    if (!allEvents || allEvents.length === 0) {
      return res.json({ synced: 0, message: 'No Sanity events found' });
    }

    let syncedCount = 0;
    const errors = [];

    // Sync each Sanity event into calendar
    for (const sanityEvent of allEvents) {
      try {
        // Check if event already exists (by Sanity _id in metadata)
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('sanity_data->>_id', sanityEvent._id)
          .single();

        const eventData = {
          title: sanityEvent.title || 'Untitled Event',
          start_date: sanityEvent.date,
          end_date: sanityEvent.endDate || null,
          start_time: sanityEvent.startTime || null,
          end_time: sanityEvent.endTime || null,
          location: sanityEvent.location || null,
          capacity: sanityEvent.capacity || null,
          event_type: sanityEvent._type === 'campaignEvent' ? 'pizza_pickup' : 'other',
          visibility: 'public',
          status: sanityEvent.status === 'soldOut' ? 'sold_out' : 
                  sanityEvent.status === 'cancelled' ? 'cancelled' :
                  sanityEvent.status === 'postponed' ? 'postponed' : 'scheduled',
          sanity_data: sanityEvent
        };

        if (existing) {
          // Update existing event
          await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', existing.id);
        } else {
          // Insert new event
          await supabase
            .from('calendar_events')
            .insert([eventData]);
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
    console.error('Sanity sync error:', error);
    return res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
}
