/**
 * Event Schema Generator for SEO
 * Generates schema.org structured data (JSON-LD) for events
 * 
 * Usage:
 *   import { generateEventListSchema } from './utils/generateEventSchema';
 *   
 *   const schemas = generateEventListSchema(upcomingEvents, campaignData);
 *   
 *   <Helmet>
 *     <script type="application/ld+json">
 *       {JSON.stringify(schemas)}
 *     </script>
 *   </Helmet>
 */

/**
 * Parse event date string to Date object
 * @param {string} value - ISO date string or date string
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseEventDate(value) {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Get schema.org event status URL
 * @param {string} status - Event status (scheduled, cancelled, postponed, etc.)
 * @returns {string} Schema.org event status URL
 */
function getEventStatusUrl(status) {
  switch (status) {
    case 'cancelled':
      return 'https://schema.org/EventCancelled';
    case 'postponed':
      return 'https://schema.org/EventPostponed';
    case 'rescheduled':
      return 'https://schema.org/EventRescheduled';
    case 'soldOut':
      return 'https://schema.org/EventScheduled'; // Event is still scheduled, just sold out
    default:
      return 'https://schema.org/EventScheduled';
  }
}

/**
 * Generate schema.org Event structured data for a single event
 * @param {Object} event - Event data from Sanity
 * @param {Object} campaignData - Optional campaign data for fallback image
 * @returns {Object|null} Event schema or null if invalid
 */
export const generateEventSchema = (event, campaignData = null) => {
  if (!event) return null;
  
  const startDate = parseEventDate(event.startDate);
  const endDate = parseEventDate(event.endDate) || startDate;
  
  // Must have a valid start date
  if (!startDate) return null;
  
  // Get fallback image
  const fallbackImage = campaignData?.heroImage?.asset?.url || 
                       'https://www.localeffortfood.com/images/default-event.jpg';
  
  // Base schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.location || "Local Effort Event",
    "description": event.summary || 
                   event.tagline || 
                   (Array.isArray(event.description) 
                     ? extractTextFromPortableText(event.description)
                     : event.description) ||
                   "Join us for a food event by Local Effort",
    "startDate": startDate.toISOString(),
    "endDate": endDate.toISOString(),
    "eventStatus": getEventStatusUrl(event.status),
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.location || "Local Effort",
      "address": event.locationDetails || event.location || "Minneapolis, MN"
    },
    "image": event.heroImage || 
             event.heroImageUrl || 
             (event.heroImage?.asset?.url) ||
             fallbackImage,
    "organizer": {
      "@type": "Organization",
      "name": "Local Effort",
      "url": "https://www.localeffortfood.com",
      "logo": "https://www.localeffortfood.com/images/logo.png"
    }
  };
  
  // Add timing note if available
  if (event.timingNote) {
    schema.description = `${schema.description}. ${event.timingNote}`;
  }
  
  // Add offers/tickets if available
  if (event.ticketsUrl) {
    schema.offers = {
      "@type": "Offer",
      "url": event.ticketsUrl,
      "availability": event.status === 'soldOut' 
        ? "https://schema.org/SoldOut" 
        : "https://schema.org/InStock",
      "validFrom": new Date().toISOString()
    };
    
    // Add CTA label if available
    if (event.ctaLabel) {
      schema.offers.name = event.ctaLabel;
    }
  }
  
  // Add food type as additional type
  if (event.foodType) {
    schema.additionalType = `https://schema.org/FoodEvent`;
    schema.about = {
      "@type": "Thing",
      "name": event.foodType
    };
  }
  
  return schema;
};

/**
 * Generate schema.org Event list for multiple events
 * @param {Array} events - Array of event data from Sanity
 * @param {Object} campaignData - Optional campaign data
 * @returns {Array|null} Array of event schemas or null if no valid events
 */
export const generateEventListSchema = (events, campaignData = null) => {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }
  
  const validEvents = events
    .map(event => generateEventSchema(event, campaignData))
    .filter(Boolean); // Remove null entries
    
  return validEvents.length > 0 ? validEvents : null;
};

/**
 * Extract plain text from Sanity Portable Text blocks
 * @param {Array} blocks - Portable Text blocks
 * @returns {string} Plain text content
 */
function extractTextFromPortableText(blocks) {
  if (!Array.isArray(blocks)) return '';
  
  return blocks
    .filter(block => block._type === 'block')
    .map(block => {
      if (!Array.isArray(block.children)) return '';
      return block.children
        .map(child => child.text || '')
        .join('');
    })
    .join(' ')
    .trim()
    .slice(0, 200); // Limit to 200 chars for description
}

/**
 * Generate FAQPage schema for campaign FAQ
 * @param {Array} faqItems - Array of {question, answer} objects
 * @returns {Object|null} FAQPage schema or null
 */
export const generateFAQSchema = (faqItems) => {
  if (!Array.isArray(faqItems) || faqItems.length === 0) {
    return null;
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
};

/**
 * Generate Organization schema for Local Effort
 * @param {Object} business - Business data from business.json
 * @returns {Object} Organization schema
 */
export const generateOrganizationSchema = (business = null) => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business?.name || "Local Effort",
    "description": business?.description || "Personal chef services, meal prep, and catering in Minneapolis",
    "url": "https://www.localeffortfood.com",
    "logo": "https://www.localeffortfood.com/images/logo.png",
    "image": "https://www.localeffortfood.com/images/hero.jpg",
    "telephone": business?.phone || "",
    "email": business?.email || "",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Minneapolis",
      "addressRegion": "MN",
      "addressCountry": "US"
    },
    "geo": business?.geo || {
      "@type": "GeoCoordinates",
      "latitude": "44.9778",
      "longitude": "-93.2650"
    },
    "servesCuisine": ["American", "Pizza", "Italian"],
    "priceRange": "$$"
  };
};
