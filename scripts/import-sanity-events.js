const sanityClient = require('../src/sanityClient').default;
const { getSupabase } = require('../backend/api/supabaseClient');

async function importSanityEvents() {
  console.log('Fetching events from Sanity...');
  
  const sanityEvents = await sanityClient.fetch(`
    *[_type == "publicEvent"] | order(startDate asc) {
      _id,
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
      description
    }
  `);
  
  console.log(`Found ${sanityEvents.length} events in Sanity`);
  
  const supabase = getSupabase();
  let imported = 0;
  let skipped = 0;
  
  for (const event of sanityEvents) {
    try {
      const eventData = {
        title: event.location || 'Untitled Event',
        start_date: event.startDate,
        end_date: event.endDate || null,
        event_type: event.foodType?.toLowerCase().includes('pizza') ? 'pizza_party' : 'other',
        visibility: 'public',
        status: event.status === 'soldOut' ? 'completed' : event.status === 'cancelled' ? 'cancelled' : 'scheduled',
        location: event.location,
        notes: event.summary || '',
        sanity_data: {
          _id: event._id,
          tagline: event.tagline,
          summary: event.summary,
          timingNote: event.timingNote,
          foodType: event.foodType,
          ticketsUrl: event.ticketsUrl,
          ctaLabel: event.ctaLabel,
          locationDetails: event.locationDetails,
          description: event.description
        }
      };
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([eventData])
        .select()
        .single();
      
      if (error) {
        console.error(`Failed to import ${event.location}:`, error.message);
        skipped++;
      } else {
        console.log(`✓ Imported: ${event.location} (${event.startDate})`);
        imported++;
      }
    } catch (err) {
      console.error(`Error processing ${event.location}:`, err.message);
      skipped++;
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`✓ Imported: ${imported}`);
  console.log(`✗ Skipped: ${skipped}`);
  console.log(`Total: ${sanityEvents.length}`);
}

importSanityEvents().catch(console.error);
