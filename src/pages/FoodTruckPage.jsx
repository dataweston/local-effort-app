import React from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import FoodTruckDialog from "../components/home/FoodTruckDialog";

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

const FoodTruckPage = () => {
  const canonical = "https://localeffort.app/book-food-truck";
  const title = "Book the Local Effort Food Truck";
  const description =
    "Book a food truck in Minneapolis with Local Effort's personal chef team. Custom Midwest menus, wood-fired favorites, and a beta launch discount on our $1000 minimum commitment.";
  const keywords = [
    "book a chef",
    "personal chef",
    "food trucks Minneapolis",
    "book a food truck in Minneapolis",
    "how much does a food truck cost",
    "wood fired food truck"
  ].join(", ");
  const faqItems = [
    {
      question: "How much does a food truck cost for a private event?",
      answer:
        "Most Minneapolis food truck rentals with Local Effort range from $1,000 to $2,300. The first three beta bookings lock in a $200 discount on the $1,000 minimum, with pricing adjusted based on menu depth and guest count."
    },
    {
      question: "Can I book a personal chef with the food truck?",
      answer:
        "Yes. Our personal chef team plans the menu, cooks on site, and hosts your guests. We handle dietary requests, staffing, and execution so you can focus on the event."
    },
    {
      question: "Do you travel outside Minneapolis for food truck service?",
      answer:
        "We serve the Twin Cities metro, including Minneapolis and St. Paul, plus roughly a 60-mile radius. Let us know if you need the truck farther out and we will customize a travel plan."
    },
    {
      question: "How do I book the Local Effort food truck?",
      answer:
        "Share your date, guest count, and goals. We reply within 24 hours with menu ideas, a chef-led plan, and a quote so you can secure the truck with a 30% deposit."
    }
  ];
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Food Truck Catering",
    description,
    serviceType: "Food truck catering in Minneapolis",
    keywords,
    areaServed: ["Minneapolis", "St. Paul", "Twin Cities"],
    category: "Food & Beverage > Catering",
    provider: {
      "@type": "Organization",
      name: "Local Effort",
      url: canonical.replace("/book-food-truck", "/"),
      sameAs: [
        "https://www.instagram.com/local_effort",
        "https://www.facebook.com/localeffort"
      ]
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "1000",
      availability: "https://schema.org/InStock",
      url: canonical,
      description:
        "Beta launch pricing: $1000 minimum commitment for food truck service with $200 discount for first bookings."
    },
    potentialAction: {
      "@type": "ReserveAction",
      target: canonical,
      name: "Book a food truck in Minneapolis"
    }
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content="Local Effort" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <section className="bg-gradient-to-br from-orange-50 via-rose-50 to-white border-b border-orange-100">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fade}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-orange-500">
              Local Effort Food Truck
              <span className="ml-3 inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-rose-500">
                Beta
              </span>
            </p>
            <h1 className="heading-display heading-balance">Wood-fired food truck for private events</h1>
            <div className="space-y-4 text-lg md:text-xl text-neutral-700 leading-relaxed">
              <p>
                We're in beta launch mode and rolling out the Local Effort truck to a handful of events. The first three hosts to book lock in <span className="font-semibold text-rose-500">$200 off</span> their event.
              </p>
              <p>
                We bring the oven, chefs, and hospitality team to your venue with menus grounded in Midwest ingredients, humble presentation, and nutrition-forward dishes. Expect pizza, sandwiches, salads, rice dishes, and seasonal farm-to-table touches.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <FoodTruckDialog triggerClassName="px-6 py-3 text-base" />
              <span className="text-sm text-neutral-600">
                Minimum commitment:
                <span className="ml-2 font-semibold text-neutral-500 line-through">$1200</span>
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Now $1000
                </span>
              </span>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={fade}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-orange-200 bg-white/70 backdrop-blur-sm shadow-xl p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-neutral-800">What you can expect</h2>
            <ul className="space-y-3 text-sm text-neutral-700">
              <li>
                <span className="font-medium text-neutral-900">Full-service crew:</span> chef, fire tender, and hospitality lead to coordinate guest flow and service for kids parties, sports events, weddings, and corporate gatherings.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Classic Local Effort flavor:</span> Midwest cuisine, local ingredients, humble presentation, and nutrition-forward plates.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Customizable menus:</span> pizzas fresh off the deck, hearty sandwiches, composed salads, rice dishes, and seasonal farm-to-table surprises.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Self-contained setup:</span> all cooking happens on the truck. We just need a reasonably level spot (20' x 10') and access to power (15A) if service extends after dusk.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Travel radius:</span> Twin Cities metro plus the surrounding 60 miles. Let us know if you need us farther out.
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      <section
        id="food-truck-minneapolis"
        className="bg-white py-16 md:py-20 border-b border-neutral-100"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid gap-12 lg:grid-cols-[1.2fr_1fr] items-start">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fade}
            transition={{ duration: 0.45 }}
            className="space-y-6 text-neutral-700 text-base leading-relaxed"
          >
            <h2 className="heading-lg">Food truck catering in Minneapolis and beyond</h2>
            <p>
              Local Effort pairs a wood-fired food truck with a <span className="font-semibold text-neutral-900">personal chef</span> team so you can <span className="font-semibold text-neutral-900">book a chef</span> and a mobile kitchen in one move. We design Midwest-forward menus, handle staffing, and make sure service runs smoothly for weddings, corporate retreats, block parties, and backyard celebrations across Minneapolis and St. Paul.
            </p>
            <p>
              Whether you want Detroit-style pies, composed salads, or comfort staples like smoked pork sandwiches, the truck is outfitted for high-volume cooking with scratch-made ingredients. Tell us about your guests and we'll customize the service to match dietary needs, timing, and budget.
            </p>
            <p>
              Curious about pricing? Most hosts ask, <em className="italic">how much does a food truck cost?</em> Our beta launch special locks in a $1,000 minimum with incentives for early bookings. From there, we scale portions, add dessert or bar partners, and manage on-site flow so your guests feel taken care of from the first slice to the last goodbye.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fade}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 space-y-6"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-neutral-900">Fast facts</h3>
              <p className="text-sm text-neutral-600">
                Download the essentials to <span className="font-medium text-neutral-900">book a food truck in Minneapolis</span> with confidence.
              </p>
            </div>
            <dl className="space-y-4 text-sm text-neutral-700">
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-neutral-900">Chef-led experience</dt>
                <dd className="text-right">
                  Personal chefs plan and execute your menu, including vegan, gluten-free, and kid-friendly options.
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-neutral-900">Service range</dt>
                <dd className="text-right">
                  Minneapolis, St. Paul, Twin Cities suburbs, and 60-mile radius—with custom quotes for longer travel.
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-neutral-900">Budget guide</dt>
                <dd className="text-right">
                  Most events fall between $1,000 and $2,300 depending on guest count and menu depth.
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-medium text-neutral-900">Ideal events</dt>
                <dd className="text-right">
                  Weddings, graduation parties, corporate lunches, sports banquets, festivals, and neighborhood nights.
                </dd>
              </div>
            </dl>
            <FoodTruckDialog triggerClassName="w-full justify-center py-3 text-base" />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-16 space-y-14">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4 }} className="grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h2 className="heading-lg">How the booking works</h2>
            <ol className="list-decimal list-inside space-y-2 text-neutral-700">
              <li>Reach out with your date, guest count, desired menu, and event goals.</li>
              <li>We confirm availability within 24 hours and send a tailored menu + estimate.</li>
              <li>A 30% deposit locks in your date. Remaining balance is due seven days before service.</li>
              <li>Day-of, our crew arrives 90 minutes early to set up, fire the oven, and get service ready.</li>
            </ol>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Three ways to hit the $1000 minimum</h3>
            <div className="space-y-3 text-neutral-700 text-sm leading-relaxed">
              <p>
                <span className="font-semibold text-neutral-900">Cover the whole fee:</span> Guests eat free and you capture the full beta discount.
              </p>
              <p>
                <span className="font-semibold text-neutral-900">Cover part of the fee:</span> We subsidize pricing so your guests enjoy incredible food at a very friendly cost.
              </p>
              <p>
                <span className="font-semibold text-neutral-900">Guarantee the minimum:</span> Guests pay menu pricing. If sales land under $1000, the booking party makes up the difference.
              </p>
            </div>
            <p className="text-neutral-700 text-sm">
              Most events land between $1000–$2300 depending on menu depth and guest count. Need bar service or dessert? We can layer those in or partner with trusted vendors.
            </p>
          </div>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4, delay: 0.1 }} className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            title="Custom menu planning"
            body="Collaborative planning call to dial in pizza, sandwiches, salads, rice dishes, and seasonal touches for your crowd."
          />
          <FeatureCard
            title="Hospitality-first experience"
            body="We organize service windows to keep lines short, coordinate dietary accommodations, and make sure every guest feels cared for."
          />
          <FeatureCard
            title="Simple wrap-up"
            body="We clean and clear the service area, dispose of waste, and leave the space better than we found it."
          />
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 md:p-10 space-y-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="heading-lg">Lets fire up the truck</h2>
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed">
              Share a few details about your event and we'll get back within 24 hours with availability, menu ideas, and a quote. Mention the beta launch to claim the $200 discount if you're one of the first three bookings. We can also hop on a quick call if that's easier.
            </p>
          </div>
          <FoodTruckDialog triggerClassName="px-6 py-3 text-base" />
        </motion.div>
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fade}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="heading-lg">Food truck FAQs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-neutral-900">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </section>
    </>
  );
};

const FeatureCard = ({ title, body }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
    <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
    <p className="mt-3 text-sm text-neutral-700 leading-relaxed">{body}</p>
  </div>
);

export default FoodTruckPage;
