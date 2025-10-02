import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Gift, Loader2, Mail, MapPin, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useSquareCard } from "../../hooks/useSquareCard";
import { cn } from "../../lib/utils";
import { heroFallbackSrc } from "../../data/cloudinaryContent";

const presetAmounts = [100, 150, 200, 250, 350, 500];

const initialForm = {
  amount: 150,
  customAmount: "",
  cardType: "digital",
  deliveryTarget: "recipient",
  shipTo: "recipient",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  recipientName: "",
  recipientEmail: "",
  recipientPhone: "",
  note: "",
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPostal: "",
};

const normalizeAmount = (amount, customValue) => {
  if (customValue) {
    const value = Number(customValue);
    if (!Number.isNaN(value) && value > 0) {
      return value;
    }
  }
  return amount;
};

const GiftCardDialog = ({ className = "" }) => {
  const defaultSiteUrl = "https://localeffort.app";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : defaultSiteUrl;
  const giftCardImage = heroFallbackSrc
    ? (heroFallbackSrc.startsWith("http") ? heroFallbackSrc : `${siteUrl}${heroFallbackSrc}`)
    : undefined;
  const productSchema = useMemo(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Local Effort Gift Card",
      description: "Local Effort gift cards cover private chef dinners, pizza parties, and hospitality across Minneapolis-St. Paul.",
      brand: { "@type": "Organization", name: "Local Effort" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "50",
        highPrice: "500",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/#gift-cards`,
      },
    };
    if (giftCardImage) {
      schema.image = [giftCardImage];
    }
    return schema;
  }, [giftCardImage, siteUrl]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const amountValue = useMemo(() => normalizeAmount(form.amount, form.customAmount), [form.amount, form.customAmount]);
  const canChoosePhysical = amountValue >= 250;

  const { cardLoaded, error: squareError, tokenize, reset: resetSquare } = useSquareCard("#gift-card-card-container", open, [amountValue]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setStatus("idle");
      setError("");
      setSuccess(null);
      setTimeout(() => resetSquare(), 150);
    }
  }, [open, resetSquare]);

  useEffect(() => {
    if (!canChoosePhysical && form.cardType === "physical") {
      setForm((prev) => ({ ...prev, cardType: "digital" }));
    }
  }, [canChoosePhysical, form.cardType]);

  const handleAmountClick = (value) => {
    setForm((prev) => ({ ...prev, amount: value, customAmount: "" }));
  };

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === "processing") return;

    const resolvedAmount = amountValue;
    if (!resolvedAmount || resolvedAmount < 50) {
      setError("Gift card must be at least $50.");
      return;
    }

    const { buyerName, buyerEmail, recipientEmail, cardType, deliveryTarget } = form;
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError("Buyer name and email are required.");
      return;
    }
    if (deliveryTarget === "recipient" && !recipientEmail.trim()) {
      setError("Recipient email is required when sending directly to them.");
      return;
    }
    if (cardType === "physical") {
      if (!form.shippingLine1.trim() || !form.shippingCity.trim() || !form.shippingState.trim() || !form.shippingPostal.trim()) {
        setError("Complete shipping details are required for physical cards.");
        return;
      }
    }

    try {
      setStatus("processing");
      setError("");
      const token = await tokenize();
      const payload = {
        amount: resolvedAmount,
        token,
        cardType,
        deliveryTarget,
        note: form.note,
        buyer: {
          name: form.buyerName,
          email: form.buyerEmail,
          phone: form.buyerPhone,
        },
        recipient: {
          name: form.recipientName,
          email: form.recipientEmail,
          phone: form.recipientPhone,
        },
        shipping: cardType === "physical"
          ? {
              shipTo: form.shipTo,
              address: {
                line1: form.shippingLine1,
                line2: form.shippingLine2,
                city: form.shippingCity,
                state: form.shippingState,
                postal: form.shippingPostal,
              },
            }
          : null,
      };

      const response = await fetch("/api/store/gift-card-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Checkout failed");
      }

      const data = await response.json();
      setSuccess({
        code: data.code,
        amount: data.amount,
        cardType: data.cardType,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Something went wrong while processing your gift card.");
    }
  };

  const amountLabel = useMemo(() => `$${amountValue.toFixed(2)}`, [amountValue]);
  const disableSubmit = !cardLoaded || status === "processing";

  const renderSuccess = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-emerald-500" />
        <h3 className="mt-4 text-2xl font-semibold text-emerald-700">Gift card sent!</h3>
        <p className="text-sm text-emerald-700">We just delivered the gift card email and a confirmation receipt. Save this code for your records.</p>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-500">Gift card code</p>
          <p className="mt-2 text-2xl font-mono font-bold tracking-widest text-slate-900">{success?.code || "Pending"}</p>
        </div>
        <p className="mt-4 text-sm text-slate-600">Amount: <span className="font-semibold">{amountLabel}</span> - Type: {success?.cardType === "physical" ? "Leather physical card + digital code" : "Digital"}</p>
        <button
          type="button"
          className="mt-5 inline-flex items-center justify-center rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100"
          onClick={() => {
            if (success?.code) navigator.clipboard?.writeText(success.code).catch(() => {});
          }}
        >
          Copy code
        </button>
      </div>
      <DialogFooter>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </DialogFooter>
    </div>
  );

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={cn("btn btn-primary flex items-center gap-2 shadow-sm", className)}>
          <Gift className="h-4 w-4" />
          Buy Gift Card
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gift a Local Effort experience</DialogTitle>
          <DialogDescription>
            Choose the amount, pick digital or leather gift card, and we will send it instantly with all the right instructions.
          </DialogDescription>
        </DialogHeader>

        {status === "success" && success ? (
          renderSuccess()
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Amount</p>
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((value) => {
                  const active = form.customAmount === "" && form.amount === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      className={cn(
                        "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold transition",
                        active ? "border-orange-500 bg-orange-500 text-white" : "bg-white text-slate-700 hover:border-orange-400 hover:text-orange-500"
                      )}
                      onClick={() => handleAmountClick(value)}
                    >
                      ${value}
                    </button>
                  );
                })}
                <label className="flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-orange-300">
                  <span className="text-slate-500">Other</span>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    value={form.customAmount}
                    onChange={(event) => {
                      const { value } = event.target;
                      setForm((prev) => ({ ...prev, customAmount: value }));
                    }}
                    className="w-24 border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                    placeholder="250"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">{amountLabel} selected. Physical leather cards unlock at $250+.</p>
            </section>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <h4 className="text-sm font-semibold text-slate-700">Delivery preferences</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "recipient", label: "Email recipient" },
                  { value: "buyer", label: "Email me" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, deliveryTarget: option.value }))}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                      form.deliveryTarget === option.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-600"
                        : "border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-500"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, cardType: "digital" }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    form.cardType === "digital"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                  )}
                >
                  Instant digital
                </button>
                <button
                  type="button"
                  disabled={!canChoosePhysical}
                  onClick={() => setForm((prev) => ({ ...prev, cardType: "physical" }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    form.cardType === "physical"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600"
                      : canChoosePhysical
                        ? "border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600"
                        : "border-dashed border-slate-200 text-slate-400"
                  )}
                >
                  Leather keepsake
                </button>
              </div>
              {!canChoosePhysical && (
                <p className="text-xs text-slate-500">Select $250 or more to ship a physical leather card along with the digital code.</p>
              )}
              {form.cardType === "physical" && (
                <div className="space-y-3 rounded-xl border border-amber-100 bg-white p-4">
                  <div className="flex gap-3">
                    {[
                      { value: "recipient", label: "Ship to recipient" },
                      { value: "buyer", label: "Ship to me" },
                    ].map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setForm((prev) => ({ ...prev, shipTo: option.value }))}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                          form.shipTo === option.value
                            ? "border-amber-500 bg-amber-500/15 text-amber-700"
                            : "border-amber-200 text-amber-500 hover:border-amber-300"
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="label" htmlFor="gift-shipping-line1">Street address</label>
                      <input id="gift-shipping-line1" className="input" value={form.shippingLine1} onChange={handleInputChange("shippingLine1")} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label" htmlFor="gift-shipping-line2">Apartment, suite (optional)</label>
                      <input id="gift-shipping-line2" className="input" value={form.shippingLine2} onChange={handleInputChange("shippingLine2")} />
                    </div>
                    <div>
                      <label className="label" htmlFor="gift-shipping-city">City</label>
                      <input id="gift-shipping-city" className="input" value={form.shippingCity} onChange={handleInputChange("shippingCity")} />
                    </div>
                    <div>
                      <label className="label" htmlFor="gift-shipping-state">State</label>
                      <input id="gift-shipping-state" className="input" value={form.shippingState} onChange={handleInputChange("shippingState")} />
                    </div>
                    <div>
                      <label className="label" htmlFor="gift-shipping-postal">Postal code</label>
                      <input id="gift-shipping-postal" className="input" value={form.shippingPostal} onChange={handleInputChange("shippingPostal")} />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Buyer details</h4>
                <div>
                  <label className="label" htmlFor="gift-buyer-name">Your name</label>
                  <input id="gift-buyer-name" className="input" value={form.buyerName} onChange={handleInputChange("buyerName")} required />
                </div>
                <div>
                  <label className="label" htmlFor="gift-buyer-email">Email</label>
                  <input id="gift-buyer-email" className="input" type="email" value={form.buyerEmail} onChange={handleInputChange("buyerEmail")} required />
                </div>
                <div>
                  <label className="label" htmlFor="gift-buyer-phone">Phone (optional)</label>
                  <input id="gift-buyer-phone" className="input" value={form.buyerPhone} onChange={handleInputChange("buyerPhone")} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Recipient details</h4>
                <div>
                  <label className="label" htmlFor="gift-recipient-name">Recipient name</label>
                  <input id="gift-recipient-name" className="input" value={form.recipientName} onChange={handleInputChange("recipientName")} />
                </div>
                <div>
                  <label className="label" htmlFor="gift-recipient-email">Recipient email</label>
                  <input id="gift-recipient-email" className="input" type="email" value={form.recipientEmail} onChange={handleInputChange("recipientEmail")} placeholder="hello@friend.com" />
                </div>
                <div>
                  <label className="label" htmlFor="gift-recipient-phone">Recipient phone (optional)</label>
                  <input id="gift-recipient-phone" className="input" value={form.recipientPhone} onChange={handleInputChange("recipientPhone")} />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <label className="label" htmlFor="gift-note">Note for the recipient (optional)</label>
              <textarea id="gift-note" className="input min-h-[90px]"
                value={form.note}
                onChange={handleInputChange("note")}
                placeholder="Add a short note to appear inside the gift email."
              />
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Gift card FAQ</h4>
              <details className="group rounded-xl border border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                  <span>How much should I buy?</span>
                  <span className="text-xl leading-none text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  A simple dinner family style is around $65/person. A super fancy coursed dinner with wine and scallops is $115/person plus a discretionary wine budget (an additional $50-$150/person recommended). Pizzas are usually around $15 and pies are around $30. That's the range.
                </p>
              </details>
              <details className="group rounded-xl border border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Leather???</span>
                  <span className="text-xl leading-none text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  We hand-letter a short note into leather from Tandy Leather. It's a souvenir that makes a big impact as a gift.
                </p>
              </details>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Payment details</p>
              <div id="gift-card-card-container" className="min-h-[96px] rounded-lg border border-slate-200 bg-white p-3">
                {!cardLoaded && !squareError && <p className="text-sm text-slate-500">Loading secure card entry...</p>}
                {squareError && <p className="text-sm text-red-600">{squareError}</p>}
              </div>
              <p className="text-xs text-slate-400">We use Square to process payments securely. The card is charged immediately and refunds are available on request within 14 days (if unused).</p>
            </section>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

            <DialogFooter className="items-center justify-between gap-3 sm:flex-row">
              <div className="text-xs text-slate-500">{amountLabel} - {form.cardType === "physical" ? "Digital + leather card" : "Instant digital card"}</div>
              <button
                type="submit"
                className={cn("btn btn-primary flex items-center gap-2", disableSubmit && "opacity-60")}
                disabled={disableSubmit}
              >
                {status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                {status === "processing" ? "Processing..." : "Send gift card"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
};

export default GiftCardDialog;
