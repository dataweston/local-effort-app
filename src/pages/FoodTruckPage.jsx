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
  const description = "Bring the Local Effort food truck to your event. Wood-fired favorites, seasonal menus, and full-service hospitality with a $1200 minimum commitment.";
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Food Truck Catering",
    description,
    areaServed: ["Minneapolis", "St. Paul", "Twin Cities"],
    provider: {
      "@type": "Organization",
      name: "Local Effort",
      url: canonical.replace("/book-food-truck", "/")
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "1200",
      availability: "https://schema.org/InStock",
      url: canonical,
      description: "Minimum $1200 commitment for food truck service."
    }
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
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
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-orange-500">Local Effort Food Truck</p>
            <h1 className="heading-display heading-balance">Wood-fired food truck for private events</h1>
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
              We bring the oven, chefs, and hospitality staff to your venue. Menus are built around seasonal, Midwest ingredients and the same wood-fired techniques we use in our pizza parties and private dinners.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <FoodTruckDialog triggerClassName="px-6 py-3 text-base" />
              <span className="text-sm text-neutral-600">Minimum commitment: <strong>$1200</strong></span>
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
                <span className="font-medium text-neutral-900">Full-service crew:</span> chef, fire tender, and hospitality lead to coordinate guest flow and service.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Seasonal, wood-fired menus:</span> pizzas, tacos, flatbreads, veg-focused boards, or dessert pies – tailored to your event.
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

      <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-16 space-y-14">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4 }} className="grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h2 className="heading-lg">How the booking works</h2>
            <ol className="list-decimal list-inside space-y-2 text-neutral-700">
              <li>Reach out with your date, guest count, and the vibe of your event.</li>
              <li>We confirm availability within 24 hours and send a tailored menu + estimate.</li>
              <li>A 30% deposit locks in your date. Remaining balance is due seven days before service.</li>
              <li>Day-of, our crew arrives 90 minutes early to set up, fire the oven, and get service ready.</li>
            </ol>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">What the $1200 minimum covers</h3>
            <p className="text-neutral-700 text-sm leading-relaxed">
              The minimum is a guarantee that covers the crew, prep time, and on-site service. Most events land between $1200–$2500 depending on menu depth and guest count. We build menus that match your crowd: casual pizza parties, elevated wood-fired dinners, late-night snacks, or paired beverage service.
            </p>
            <p className="text-neutral-700 text-sm">Need bar service or dessert? We can layer those in or partner with one of our trusted vendors.</p>
          </div>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4, delay: 0.1 }} className="grid md:grid-cols-3 gap-6">
          <FeatureCard title="Menu planning" body="Collaborative planning call two weeks out to lock in service style, timeline, and dietary accommodations." />
          <FeatureCard title="Guest experience" body="We organize service windows to keep lines short and guests fed. Signage and tasting notes are included." />
          <FeatureCard title="Easy tear-down" body="We clean and clear the service area, dispose of our waste, and leave the space the way we found it." />
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fade} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 md:p-10 space-y-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="heading-lg">Lets fire up the truck</h2>
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed">
              Share a few details about your event and well get back within 24 hours with availability, menu ideas, and a quote. We can also hop on a quick call if thats easier.
            </p>
          </div>
          <FoodTruckDialog triggerClassName="px-6 py-3 text-base" />
        </motion.div>
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
