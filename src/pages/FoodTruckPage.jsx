import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import FoodTruckDialog from "../components/home/FoodTruckDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../components/common/ToastProvider";
import { useSquarePayments } from "../lib/useSquarePayments";
import devConsole from "../lib/devConsole.js";

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

const initialDepositForm = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  notes: ""
};

const FoodTruckPage = () => {
  const canonical = "https://localeffort.app/book-food-truck";
  const title = "Book the Local Effort Food Truck";
  const description =
    "Book a food truck in Minneapolis with Local Effort's personal chef team. Custom Midwest menus, pizzas, and a beta launch discount on our $1000 minimum commitment.";
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
        "Our price starts at $1200, with per person costs generally ranging from $20-$65 depending on format, menu depth, and guest count. The first three beta bookings lock in a $200 discount."
    },
    {
      question: "Do you travel outside Minneapolis for food truck service?",
      answer:
        "We serve the Twin Cities metro, including Minneapolis and St. Paul, plus roughly a 30-mile radius."
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
        "https://www.instagram.com/localeffort",
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

  const { notify: notifyToast } = useToast();
  const [depositForm, setDepositForm] = useState(() => ({ ...initialDepositForm }));
  const [depositStatus, setDepositStatus] = useState("idle");
  const [depositError, setDepositError] = useState("");
  const depositAmount = 300;
  const depositAmountLabel = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(depositAmount),
    [depositAmount]
  );
  const depositEmailValid = useMemo(
    () => /.+@.+\..+/.test(depositForm.email.trim()),
    [depositForm.email]
  );
  const depositPhoneDigits = useMemo(() => depositForm.phone.replace(/\D/g, ""), [depositForm.phone]);
  const depositPhoneValid = useMemo(() => depositPhoneDigits.length >= 10, [depositPhoneDigits]);
  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    environment: squareEnvironment,
    sdkUrl: squareSdkUrl,
    locationId: squareLocationId
  } = useSquarePayments();
  const cardContainerRef = useRef(null);
  const cardInstanceRef = useRef(null);
  const cardInitRef = useRef(false);
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleDepositChange = useCallback(
    (field) => (event) => {
      const { value } = event.target;
      setDepositForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const destroyCard = useCallback(() => {
    const card = cardInstanceRef.current;
    if (card) {
      devConsole.log("[square] [food-truck] destroying card instance");
      cardInstanceRef.current = null;
      try {
        const maybe = card.destroy?.();
        if (maybe && typeof maybe.then === "function") {
          maybe.catch((err) => devConsole.warn("[square] [food-truck] card destroy warning", err));
        }
      } catch (err) {
        devConsole.warn("[square] [food-truck] card destroy error", err);
      }
    }
    if (cardContainerRef.current) {
      cardContainerRef.current.innerHTML = "";
    }
    cardInitRef.current = false;
    setCardReady(false);
  }, []);

  useEffect(() => {
    if (paymentsError) {
      notifyToast(paymentsError, { type: "error" });
    }
  }, [paymentsError, notifyToast]);

  useEffect(() => {
    if (!payments || cardReady) {
      return;
    }
    const container = cardContainerRef.current;
    if (!container) {
      return;
    }
    if (cardInitRef.current) {
      return;
    }

    let cancelled = false;
    cardInitRef.current = true;
    setCardError("");
    devConsole.log("[square] [food-truck] initializing card", {
      environment: squareEnvironment,
      locationId: squareLocationId,
      sdkUrl: squareSdkUrl
    });

    payments
      .card()
      .then((card) => {
        if (!card) {
          throw new Error("Square card component unavailable.");
        }
        if (cancelled) {
          try {
            card.destroy?.();
          } catch (_) {
            // ignore
          }
          return null;
        }
        cardInstanceRef.current = card;
        return card.attach(container);
      })
      .then((result) => {
        if (cancelled || result === null) {
          return;
        }
        devConsole.log("[square] [food-truck] card attached");
        setCardReady(true);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        devConsole.error("[square] [food-truck] card init failed", err);
        const message = err?.message || "Unable to load the payment form.";
        setCardError(message);
        notifyToast(message, { type: "error" });
        destroyCard();
      });

    return () => {
      cancelled = true;
    };
  }, [payments, cardReady, squareEnvironment, squareLocationId, squareSdkUrl, notifyToast, destroyCard]);

  useEffect(() => () => {
    devConsole.log("[square] [food-truck] page unmount cleanup");
    destroyCard();
  }, [destroyCard]);

  const tokenizeCard = useCallback(async () => {
    const card = cardInstanceRef.current;
    if (!card) {
      const message = "Payment form is not ready yet.";
      notifyToast(message, { type: "error" });
      throw new Error(message);
    }
    const result = await card.tokenize();
    devConsole.log("[square] [food-truck] tokenize result", result);
    if (result.status !== "OK" || !result.token) {
      const message =
        (Array.isArray(result.errors) && result.errors[0]?.message) ||
        "Unable to verify card details.";
      notifyToast(message, { type: "error" });
      throw new Error(message);
    }
    return result.token;
  }, [notifyToast]);

  const handleDepositSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (depositStatus === "loading") return;

      setDepositError("");

      if (!cardReady) {
        const message = "Payment form is not ready yet.";
        setDepositError(message);
        notifyToast(message, { type: "error" });
        return;
      }

      const requiredComplete =
        depositForm.name.trim() &&
        depositForm.email.trim() &&
        depositForm.phone.trim() &&
        depositForm.eventDate;

      if (!requiredComplete) {
        const message = "Please complete all required fields.";
        setDepositError(message);
        notifyToast(message, { type: "error" });
        return;
      }

      if (!depositEmailValid) {
        const message = "Please provide a valid email.";
        setDepositError(message);
        notifyToast(message, { type: "error" });
        return;
      }

      if (!depositPhoneValid) {
        const message = "Please provide a 10-digit phone number.";
        setDepositError(message);
        notifyToast(message, { type: "error" });
        return;
      }

      try {
        setDepositStatus("loading");
        const token = await tokenizeCard();
        const payload = {
          token,
          amount: depositAmount,
          name: depositForm.name.trim(),
          email: depositForm.email.trim(),
          phone: depositForm.phone.trim(),
          eventDate: depositForm.eventDate,
          notes: depositForm.notes.trim()
        };
        devConsole.log("[square] [food-truck] submitting deposit payload", {
          amount: depositAmount,
          eventDate: payload.eventDate
        });
        const response = await fetch("/api/food-truck/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = data?.error || "Unable to process deposit.";
          throw new Error(message);
        }
        devConsole.log("[square] [food-truck] deposit submission succeeded", data);
        notifyToast("Deposit received! We'll confirm within 24 hours.", { type: "success" });
        setDepositStatus("success");
        setDepositForm({ ...initialDepositForm });
        setDepositError("");
        destroyCard();
      } catch (err) {
        devConsole.error("[square] [food-truck] deposit submission failed", err);
        const message = err?.message || "Unable to process payment.";
        setDepositError(message);
        setDepositStatus("error");
        notifyToast(message, { type: "error" });
      } finally {
        setDepositStatus((prev) => (prev === "success" ? "success" : "idle"));
      }
    },
    [
      depositStatus,
      cardReady,
      depositForm.name,
      depositForm.email,
      depositForm.phone,
      depositForm.eventDate,
      depositForm.notes,
      depositEmailValid,
      depositPhoneValid,
      depositAmount,
      tokenizeCard,
      notifyToast,
      destroyCard
    ]
  );

  return (
    <>
      <Helmet>
        <title>Food Truck Catering Minneapolis | Book | Local Effort</title>
        <meta name="description" content="Food truck catering in Minneapolis with Local Effort's personal chef team. Custom Midwest menus, wood-fired pizza, and full-service crew. Beta pricing: $1000 minimum." />
        <meta name="keywords" content={keywords} />
        <meta name="robots" content="noindex, nofollow" />
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
            <h1 className="heading-display heading-balance">Local Effort on Wheels - a food truck for private events</h1>
            <div className="space-y-4 text-lg md:text-xl text-neutral-700 leading-relaxed">
              <p>
                We're in beta launch mode and rolling out the Local Effort truck to a handful of events. The first three hosts to book lock in <span className="font-semibold text-rose-500">$200 off</span> their event.
              </p>
              <p>
                We bring the chefs, the hospitality team, the local ingredients, and now the kitchen, to your venue with menus grounded in Midwest ingredients, humble presentation, and nutrition-forward dishes. Menu options include bbq, sourdough pizza, sandwiches, salads, rice dishes, and seasonal farm-to-table touches.
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
            <h2 className="text-lg font-semibold text-neutral-800">What we offer</h2>
            <ul className="space-y-3 text-sm text-neutral-700">
              <li>
                <span className="font-medium text-neutral-900">Full-service crew:</span> the chefs and our hospitality team coordinate guest flow and service for kids parties, sports events, weddings, and corporate gatherings.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Classic Local Effort options:</span> Midwest cuisine, local ingredients, humble presentation, and nutrition-forward plates.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Customizable menus:</span> pizzas fresh off the deck, hearty sandwiches, composed salads, rice dishes, and seasonal farm-to-table surprises.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Self-contained setup:</span> all cooking happens on the truck. We just need a reasonably level spot (20' x 10') and access to power (15A) if service extends after dusk.
              </li>
              <li>
                <span className="font-medium text-neutral-900">Travel radius:</span> Twin Cities metro plus the surrounding 30 miles.
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
              <li>Reach out with your date, guest count, desired menu, and event goals.</li>
              <li>We confirm availability within 24 hours and send a tailored menu + estimate.</li>
              <li>A 30% deposit locks in your date. Remaining balance is due seven days before service.</li>
              <li>Day-of, our crew arrives 90 minutes early to set up, fire the oven, and get service ready.</li>
            </ol>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Three ways to hit the $1200 minimum</h3>
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
              Most events land between $1200–$4000 depending on menu depth and guest count. Depending on the style of event,
              we can feed 75-150 people in a 2-3 hour period.
            </p>
          </div>
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

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-16 grid gap-10 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <h2 className="heading-lg">Secure your food truck date</h2>
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed">
              Lock in your event with a {depositAmountLabel} deposit (30% of the beta minimum). Pay now to reserve the crew and
              the truck; the remaining balance is due seven days before service.
            </p>
            <p className="text-neutral-600 text-sm">
              Deposits are fully refundable up to 30 days before your event. Questions? Email{' '}
              <a href="mailto:hello@localeffort.app" className="underline decoration-2 underline-offset-4">
                hello@localeffort.app
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-neutral-900">Pay the deposit</h3>
              <p className="text-sm text-neutral-600">
                {depositAmountLabel} reserves your date. You can apply it toward service or transfer it to another event.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleDepositSubmit} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ft-deposit-name">Name / Business*</Label>
                  <Input
                    id="ft-deposit-name"
                    value={depositForm.name}
                    onChange={handleDepositChange('name')}
                    placeholder="Who should we contact?"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ft-deposit-email">Email*</Label>
                  <Input
                    id="ft-deposit-email"
                    type="email"
                    value={depositForm.email}
                    onChange={handleDepositChange('email')}
                    required
                    placeholder="you@example.com"
                  />
                  {!depositEmailValid && depositForm.email && (
                    <p className="text-xs text-red-600">Enter a valid email.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ft-deposit-phone">Phone*</Label>
                  <Input
                    id="ft-deposit-phone"
                    type="tel"
                    value={depositForm.phone}
                    onChange={handleDepositChange('phone')}
                    required
                    placeholder="(555) 123-4567"
                  />
                  {!depositPhoneValid && depositForm.phone && (
                    <p className="text-xs text-red-600">Use a 10-digit phone number.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ft-deposit-date">Event date*</Label>
                  <Input
                    id="ft-deposit-date"
                    type="date"
                    value={depositForm.eventDate}
                    onChange={handleDepositChange('eventDate')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ft-deposit-notes">Notes</Label>
                <Textarea
                  id="ft-deposit-notes"
                  rows={4}
                  value={depositForm.notes}
                  onChange={handleDepositChange('notes')}
                  placeholder="Share venue address, guest count, or service notes."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-card-container">Payment details</Label>
                <div
                  id="food-truck-card-container"
                  ref={cardContainerRef}
                  className="min-h-[96px] rounded-md border border-neutral-200 bg-white px-4 py-5"
                  aria-live="polite"
                >
                  {!cardReady && !cardError && !paymentsError && (
                    <p className="text-sm text-neutral-500">
                      {paymentsLoading ? 'Loading secure payment form…' : 'Preparing secure payment form…'}
                    </p>
                  )}
                  {(cardError || paymentsError) && (
                    <p className="text-sm text-red-600">{cardError || paymentsError}</p>
                  )}
                </div>
              </div>
              {depositError && <p className="text-sm text-red-600">{depositError}</p>}
              {depositStatus === 'success' && !depositError && (
                <p className="text-sm text-emerald-600">
                  Thanks! We received your deposit and will confirm within 24 hours.
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  depositStatus === 'loading' ||
                  !cardReady ||
                  !!cardError ||
                  !!paymentsError ||
                  !depositEmailValid ||
                  !depositPhoneValid
                }
              >
                {depositStatus === 'loading' ? 'Processing…' : `Pay ${depositAmountLabel} deposit`}
              </Button>
              <p className="text-xs text-neutral-500">
                Powered by Square • {squareEnvironment === 'sandbox' ? 'Sandbox mode' : 'Live mode'} •{' '}
                {squareLocationId ? 'Location configured' : 'Location missing'}
              </p>
              {import.meta.env.DEV && (
                <div className="rounded border border-dashed border-neutral-200 p-3 text-[0.7rem] text-neutral-500 space-y-1">
                  <p className="font-semibold">Square diagnostics</p>
                  <p>SDK URL: {squareSdkUrl}</p>
                  <p>Environment: {squareEnvironment}</p>
                  <p>Payments ready: {payments ? 'true' : 'false'} | Card ready: {cardReady ? 'true' : 'false'}</p>
                  {cardError && <p className="text-red-600">Card error: {cardError}</p>}
                  {paymentsError && <p className="text-red-600">Payments error: {paymentsError}</p>}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default FoodTruckPage;
