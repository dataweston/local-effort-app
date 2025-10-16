# Quick Implementation Checklist - Event SEO Improvements

## Phase 1: JSON-LD Structured Data (30 minutes)

### Step 1: PizzaFunder Page

**File:** `src/pages/PizzaFunderPage.jsx`

#### 1.1 Import the utility
```jsx
import { generateEventListSchema, generateFAQSchema } from '../utils/generateEventSchema';
```

#### 1.2 Generate schemas (add after `upcomingEvents` useMemo)
```jsx
// Generate event schemas for SEO
const eventSchemas = useMemo(() => 
  generateEventListSchema(upcomingEvents, campaignData),
  [upcomingEvents, campaignData]
);

// Generate FAQ schema
const faqSchema = useMemo(() => 
  campaignData?.faq ? generateFAQSchema(campaignData.faq) : null,
  [campaignData]
);
```

#### 1.3 Add to Helmet (inside existing `<Helmet>` tag)
```jsx
<Helmet>
  {/* ... existing title, description, canonical ... */}
  
  {/* Event Structured Data */}
  {eventSchemas && (
    <script type="application/ld+json">
      {JSON.stringify(eventSchemas)}
    </script>
  )}
  
  {/* FAQ Structured Data */}
  {faqSchema && (
    <script type="application/ld+json">
      {JSON.stringify(faqSchema)}
    </script>
  )}
</Helmet>
```

**Expected result:** Events and FAQ now discoverable by search engines

---

### Step 2: HomePage

**File:** `src/pages/HomePage.jsx`

#### 2.1 Import the utility
```jsx
import { generateEventListSchema } from '../utils/generateEventSchema';
```

#### 2.2 Generate schema (add after events state)
```jsx
const eventSchemas = useMemo(() => 
  generateEventListSchema(events),
  [events]
);
```

#### 2.3 Add to Helmet
```jsx
<Helmet>
  {/* ... existing meta tags ... */}
  
  {/* Event Structured Data */}
  {eventSchemas && eventSchemas.length > 0 && (
    <script type="application/ld+json">
      {JSON.stringify(eventSchemas)}
    </script>
  )}
</Helmet>
```

---

## Phase 2: Add Open Graph Tags (15 minutes)

### PizzaFunder Page

Add to existing Helmet in `PizzaFunderPage.jsx`:

```jsx
<Helmet>
  {/* Existing tags */}
  <title>{campaignData?.title || 'Pizza Funder'} | Local Effort</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="https://localeffortfood.com/pizzafunder" />
  
  {/* Open Graph */}
  <meta property="og:title" content={campaignData?.title || 'Pizza Funder'} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={campaignData?.heroImage?.asset?.url || 'https://localeffortfood.com/images/pizza-default.jpg'} />
  <meta property="og:url" content="https://localeffortfood.com/pizzafunder" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Local Effort" />
  
  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={campaignData?.title || 'Pizza Funder'} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={campaignData?.heroImage?.asset?.url || 'https://localeffortfood.com/images/pizza-default.jpg'} />
  
  {/* Structured Data */}
  {eventSchemas && (
    <script type="application/ld+json">
      {JSON.stringify(eventSchemas)}
    </script>
  )}
  {faqSchema && (
    <script type="application/ld+json">
      {JSON.stringify(faqSchema)}
    </script>
  )}
</Helmet>
```

---

## Phase 3: Improve Event Visibility (3 hours)

### Option A: Add Hidden Crawlable Content (Quick)

Add this BEFORE the tabs in `PizzaFunderPage.jsx`:

```jsx
{/* SEO-friendly event list (hidden but crawlable) */}
{upcomingEvents && upcomingEvents.length > 0 && (
  <div className="sr-only" aria-hidden="true">
    <h2>Upcoming Pizza Events</h2>
    {upcomingEvents.map(event => {
      const startDate = parseEventDate(event.startDate);
      return (
        <article key={event._key} itemScope itemType="https://schema.org/Event">
          <h3 itemProp="name">{event.location}</h3>
          {startDate && (
            <time itemProp="startDate" dateTime={event.startDate}>
              {formatEventDate(event)}
            </time>
          )}
          {event.summary && <p itemProp="description">{event.summary}</p>}
          {event.locationDetails && (
            <address itemProp="location">{event.locationDetails}</address>
          )}
        </article>
      );
    })}
  </div>
)}
```

**This makes events crawlable without changing the UI**

---

### Option B: Feature Events Above Tabs (Better UX & SEO)

Replace the current structure with this:

```jsx
{/* Featured Events Section - BEFORE tabs */}
{upcomingEvents && upcomingEvents.length > 0 && (
  <section className="space-y-6" aria-labelledby="events-heading">
    <header className="text-center">
      <h2 id="events-heading" className="text-3xl font-bold text-neutral-900">
        Upcoming Pizza Events
      </h2>
      <p className="text-lg text-neutral-600 mt-2">
        Join us for pizza! Pick up your pizzas at these events.
      </p>
    </header>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {upcomingEvents.slice(0, 6).map((event, index) => {
        const startDate = parseEventDate(event.startDate);
        return (
          <Card
            key={event._key}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedEvent(event)}
            itemScope
            itemType="https://schema.org/Event"
          >
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-2" itemProp="name">
                {event.location}
              </h3>
              
              {startDate && (
                <time 
                  dateTime={event.startDate}
                  itemProp="startDate"
                  className="text-sm text-orange-600 font-semibold block mb-2"
                >
                  {formatEventDate(event)}
                </time>
              )}
              
              {event.summary && (
                <p className="text-sm text-neutral-700 line-clamp-2" itemProp="description">
                  {event.summary}
                </p>
              )}
              
              {event.foodType && (
                <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {event.foodType}
                </span>
              )}
              
              {/* Hidden metadata for SEO */}
              {event.locationDetails && (
                <meta itemProp="location" content={event.locationDetails} />
              )}
              <meta itemProp="eventStatus" content={
                event.status === 'cancelled' 
                  ? 'EventCancelled' 
                  : 'EventScheduled'
              } />
            </CardContent>
          </Card>
        );
      })}
    </div>
    
    {upcomingEvents.length > 6 && (
      <div className="text-center">
        <Button 
          variant="outline"
          onClick={() => setActiveTab('events')}
        >
          View All {upcomingEvents.length} Events
        </Button>
      </div>
    )}
  </section>
)}

{/* NOW show tabs for supplementary content */}
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* ... existing tabs ... */}
</Tabs>
```

---

## Testing Checklist

### After Implementation, Test:

#### 1. Google Rich Results Test
- [ ] Go to: https://search.google.com/test/rich-results
- [ ] Enter: `https://localeffortfood.com/pizzafunder`
- [ ] Should detect: Event schemas
- [ ] Should detect: FAQ schemas

#### 2. Schema Validator
- [ ] Go to: https://validator.schema.org/
- [ ] Copy page source HTML
- [ ] Paste and validate
- [ ] Should show: 0 errors

#### 3. View Page Source
- [ ] Right-click page → "View Page Source"
- [ ] Search for: `"@type": "Event"`
- [ ] Should find: Multiple event entries
- [ ] Search for: Event location names
- [ ] Should find: Events in HTML (not just JSON)

#### 4. Open Graph Test
- [ ] Go to: https://developers.facebook.com/tools/debug/
- [ ] Enter: `https://localeffortfood.com/pizzafunder`
- [ ] Should show: Campaign title
- [ ] Should show: Hero image
- [ ] Should show: Description

#### 5. Twitter Card Validator
- [ ] Go to: https://cards-dev.twitter.com/validator
- [ ] Enter: `https://localeffortfood.com/pizzafunder`
- [ ] Should show: Large image card
- [ ] Should show: Campaign details

---

## Common Issues & Solutions

### Issue: "No structured data detected"
**Solution:** Check that:
- Schema is in `<Helmet>` tag
- JSON is valid (use JSONLint.com)
- Page has fully loaded

### Issue: "Invalid date format"
**Solution:** Ensure dates are ISO format:
```jsx
startDate.toISOString() // ✅ "2025-10-20T00:00:00.000Z"
event.startDate         // ❌ "2025-10-20" (might work but not ideal)
```

### Issue: Events not in page source
**Solution:** 
- Use Option A (hidden content) or Option B (featured events)
- Don't rely only on tabs for SEO-critical content

### Issue: Duplicate events detected
**Solution:** Check that you're not rendering the same events in multiple places with structured data

---

## Success Metrics

### Before
- 0 event schemas detected
- Generic social previews
- Events not in Google Events
- Tab content invisible to crawlers

### After
- ✅ 5-10 event schemas detected
- ✅ Rich social previews with images
- ✅ Events eligible for Google Events
- ✅ Content visible in page source
- ✅ FAQ rich snippets eligible
- ✅ Better LLM training data

---

## Rollback Plan

If something breaks:

1. Remove the schema script tags from Helmet
2. Revert to original tab structure
3. Keep the utility file (no harm)

The changes are additive and non-breaking.

---

## Next Steps After Phase 1-3

### Future Enhancements
1. Generate static events.json at build time
2. Create individual event landing pages
3. Add dynamic sitemap with events
4. Implement SSR for critical pages
5. Add breadcrumb schema
6. Monitor Google Search Console for rich results

---

## Time Estimates

- Phase 1 (JSON-LD): 30 minutes ⚡
- Phase 2 (Open Graph): 15 minutes ⚡
- Phase 3A (Hidden content): 30 minutes ⚡
- Phase 3B (Featured events): 3 hours ⭐
- Testing: 30 minutes
- **Total for Quick Win:** 1-2 hours
- **Total for Full Implementation:** 4-5 hours

---

## Files to Modify

1. ✅ `src/utils/generateEventSchema.js` (created)
2. ✅ `src/pages/PizzaFunderPage.jsx` (modify)
3. ✅ `src/pages/HomePage.jsx` (modify)

All changes are in 3 files. Low risk, high impact.
