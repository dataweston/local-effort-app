import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CartProvider, useCart } from '../store/cart/CartContext';
import CartDrawer from '../store/components/CartDrawer';
import catalog from '../store/data/pizzaOnSmith.json';
import generatedCatalog from '../store/data/generatedPizzaOnSmithPageData.json';
import { SITE_URL } from '../config/siteMetadata';
import { trackEvent } from '../lib/trackEvent';
import '../styles/pizza-on-smith.css';

const money = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const photos = [
  {
    src: 'brussels',
    alt: 'Brussels sprout pizza on a silver platter',
  },
  {
    src: 'sliced',
    alt: 'A slice pulled from a pepperoni pizza on a wooden board',
  },
  {
    src: 'crust',
    alt: 'Close-up of a blistered pizza crust inside its vacuum seal',
  },
  {
    src: 'cheese',
    alt: 'Small cheese and pepperoni pizzas on parchment',
  },
  {
    src: 'oven',
    alt: 'A person holding a freshly baked pizza beside an outdoor oven',
  },
  {
    src: 'stamp',
    alt: 'Local Pizza lettering printed with hand-carved potato stamps',
  },
  {
    src: 'boxed',
    alt: 'A pizza in a hand-stamped Local Pizza box',
  },
  {
    src: 'seasonal',
    alt: 'A vacuum-sealed seasonal pizza topped with corn, herbs and cheese',
  },
];
const journalPhotos = ['sliced', 'oven', 'stamp', 'boxed'].map((src) =>
  photos.find((photo) => photo.src === src)
);
const photoUrl = (name) => `/images/pizza-on-smith/${name}.webp`;
const productImage = (product) => product.images?.[0] || (product.image ? photoUrl(product.image) : null);
const description = 'Neapolitan-inspired pizzas made with 100% Midwest ingredients. Order October 13–28 for pickup or delivery the week of November 2.';

const fallbackPage = {
  eyebrow: '',
  headline: 'Home-oven pizzas, available on Smith Ave.',
  introduction: 'Order October 13–28. Pickup and delivery happen the week of November 2. 100% Midwest ingredients. Real food.',
  storyHeading: 'A little Naples.\nAll Midwest.',
  storyText: 'Neapolitan-inspired pizzas made with 100% Midwest ingredients. Vacuum sealed for shelf life and home-oven perfection. Keep a few on hand for the nights you’d rather just turn on the oven.',
  orderHeading: 'Stock your freezer.',
  orderIntroduction: 'Choose your packs. Mix as you like.',
  pickupHeading: 'Fulfillment the week of November 2.',
  pickupAddress: 'Pickup at 608 Smith Ave S, West St. Paul, MN · delivery and shipping options at checkout',
  journalEyebrow: '',
  journalHeading: 'This is local pizza.',
  oliveOilDescription: 'The finishing touch: brush a little olive oil on the crusts after baking. They’re better that way.',
  checkoutFootnote: 'Ordering October 13–28 · Secure payment with Square',
  returnToOrderLabel: 'Fill your freezer ↗',
  notes: [
    {label: '01 / order', heading: 'October 13–28.', text: 'Choose pickup, Twin Cities metro delivery, or shipping within 100 miles.'},
    {label: '02 / fulfillment', heading: 'Week of November 2.', text: 'All pickups and deliveries are scheduled for the week of November 2.'},
    {label: '03 / finish well', heading: 'Don’t forget the crust.', text: 'After the bake, brush a little olive oil over the crust. A small step that makes a better pizza.'},
  ],
};

const mergePage = (nextPage) => ({
  ...fallbackPage,
  ...(nextPage || {}),
  introduction: fallbackPage.introduction,
  pickupHeading: fallbackPage.pickupHeading,
  pickupAddress: fallbackPage.pickupAddress,
  journalEyebrow: '',
  checkoutFootnote: fallbackPage.checkoutFootnote,
  notes: fallbackPage.notes,
});

const uniqueProducts = (items) => {
  const bySlug = new Map();
  for (const product of items || []) {
    const key = product.slug || product.id;
    const existing = bySlug.get(key);
    if (!existing || product.id === key) bySlug.set(key, product);
  }
  return [...bySlug.values()];
};

function Quantity({ title, value, onChange }) {
  return (
    <div className="ps-quantity" role="group" aria-label={`${title} quantity`}>
      <button
        type="button"
        aria-label={`Remove one ${title}`}
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        −
      </button>
      <output aria-live="polite" aria-label={`${title} quantity`}>
        {value}
      </output>
      <button
        type="button"
        aria-label={`Add one ${title}`}
        disabled={value >= 50}
        onClick={() => onChange(Math.min(50, value + 1))}
      >
        +
      </button>
    </div>
  );
}

function PizzaShop() {
  const { add, clear, openCart } = useCart();
  const [quantities, setQuantities] = useState({ 'smith-cheese-3': 1 });
  const [activePhoto, setActivePhoto] = useState(0);
  const [products, setProducts] = useState(uniqueProducts(generatedCatalog.products));
  const [page, setPage] = useState(() => mergePage(generatedCatalog.page));
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [cloudinaryPhotos, setCloudinaryPhotos] = useState([]);
  const orderOpen = Date.now() >= Date.parse('2026-10-13T05:00:00Z') && Date.now() < Date.parse('2026-10-29T05:00:00Z');
  const checkoutLinkHandled = useRef(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/store/products?store=pizza-on-smith')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data?.products) && data.products.length) setProducts(uniqueProducts(data.products));
        if (data?.page) setPage(mergePage(data.page));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setCatalogLoaded(true);
      });
    fetch('/api/search-images?query=pizza&per_page=12')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (alive && Array.isArray(data?.images)) {
          setCloudinaryPhotos(data.images
            .filter((image) => image.context?.alt?.toLowerCase().includes('pizza'))
            .map((image) => ({
              id: image.asset_id || image.public_id || image.thumbnail_url,
              src: image.large_url || image.thumbnail_url || image.secure_url,
              alt: 'Pizza from the Local Effort kitchen',
            }))
            .filter((image) => image.id && image.src)
            .slice(0, 8));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!catalogLoaded || checkoutLinkHandled.current || typeof window === 'undefined' || !orderOpen) return;
    const productId = new URLSearchParams(window.location.search).get('add_to_cart');
    if (!productId) return;
    checkoutLinkHandled.current = true;
    const product = products.find((item) => item.id === productId);
    const outOfStock = product?.inventoryManaged === true && Number(product.inventory) <= 0;
    if (!product || outOfStock) return;
    clear();
    add({
      productId: product.id,
      title: product.title,
      qty: 1,
      unitPrice: product.price,
      image: productImage(product),
      allowsDelivery: product.allowsDelivery !== false,
    });
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    trackEvent('checkout.started', {
      store: catalog.store,
      amountCents: product.price,
      itemCount: 1,
      source: 'google_checkout_link',
    });
    openCart();
  }, [add, catalogLoaded, clear, openCart, orderOpen, products]);
  const oliveOil = products.find((product) =>
    product.id === 'smith-olive-oil' ||
    product.slug === 'smith-olive-oil' ||
    product.offerKey?.includes('olive_oil')
  );
  const pizzaProducts = products.filter((product) => product.id !== oliveOil?.id);
  const setQty = (id, qty) => setQuantities((current) => ({ ...current, [id]: qty }));
  const total = products.reduce(
    (sum, product) => sum + product.price * (quantities[product.id] || 0),
    0
  );
  const buy = () => {
    // This is a complete order builder, so repeated clicks never duplicate a bag.
    clear();
    products.forEach((product) => {
      const qty = quantities[product.id] || 0;
      if (qty)
        add({
          productId: product.id,
          title: product.title,
          qty,
          unitPrice: product.price,
          image: productImage(product),
          allowsDelivery: product.allowsDelivery !== false,
        });
    });
    trackEvent('checkout.started', {
      store: catalog.store,
      amountCents: total,
      itemCount: Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    });
    openCart();
  };
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pizza on Smith',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.title,
        sku: product.id,
        description:
          product.id === 'smith-olive-oil'
            ? '1 liter of olive oil. Brush a little on the crust after baking.'
            : description,
        ...(productImage(product) ? { image: productImage(product).startsWith('http') ? productImage(product) : `${SITE_URL}${productImage(product)}` } : {}),
        brand: { '@type': 'Brand', name: 'Local Effort' },
        offers: {
          '@type': 'Offer',
          price: (product.price / 100).toFixed(2),
          priceCurrency: 'USD',
          url: `${SITE_URL}/pizza-on-smith`,
          checkoutPageURLTemplate: `${SITE_URL}/pizza-on-smith?add_to_cart=${encodeURIComponent(product.id)}`,
          availableDeliveryMethod: [
            'https://schema.org/OnSitePickup',
            'https://schema.org/DeliveryModeOwnFleet',
            'https://schema.org/ParcelService',
          ],
        },
      },
    })),
  };
  return (
    <div className="pizza-smith fullpage-demo-scope">
      <Helmet>
        <title>Pizza on Smith | Local Effort Cooperative</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/pizza-on-smith`} />
        <meta property="og:title" content="Pizza on Smith — Local Effort" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/pizza-on-smith`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}${photoUrl('brussels')}`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <header className="ps-hero">
        <h1>{page.headline}</h1>
        <p>{page.introduction}</p>
        <p className="ps-order-window" role="status">
          {orderOpen
            ? 'Ordering open October 13–28 · pickup and delivery the week of November 2'
            : 'Ordering closed · pickup and delivery for this release take place the week of November 2'}
        </p>
      </header>
      <div className="ps-shop">
        <section className="ps-gallery" aria-label="Our pizzas">
          <figure>
            <img
              className={`ps-main-photo ps-photo-${photos[activePhoto].src}`}
              src={photoUrl(photos[activePhoto].src)}
              alt={photos[activePhoto].alt}
              width="960"
              height="1200"
              fetchPriority="high"
            />
          </figure>
          <div className="ps-gallery-controls" aria-label="Photo navigation">
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setActivePhoto((activePhoto + photos.length - 1) % photos.length)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setActivePhoto((activePhoto + 1) % photos.length)}
            >
              →
            </button>
          </div>
          <div className="ps-thumbnails" aria-label="Choose a photo">
            {photos.map((photo, index) => (
              <button
                key={photo.src}
                type="button"
                aria-label={`Show photo: ${photo.alt}`}
                aria-pressed={activePhoto === index}
                onClick={() => setActivePhoto(index)}
              >
                <img
                  src={photoUrl(`${photo.src}-thumb`)}
                  alt=""
                  width="72"
                  height="72"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          <div className="ps-freezer-photos">
            <figure>
              <img
                src={photoUrl('crust')}
                alt="A close look at the browned crust through its vacuum seal"
                width="720"
                height="960"
                loading="lazy"
              />
            </figure>
          </div>
          <div className="ps-story">
            <h2>{String(page.storyHeading || '').split('\n').map((line, index) => <React.Fragment key={`${line}-${index}`}>{index > 0 && <br />}{line}</React.Fragment>)}</h2>
            <p>{page.storyText}</p>
          </div>
        </section>
        <section className="ps-order" id="order" aria-labelledby="ps-order-title">
          <div className="ps-order-heading">
            <h2 id="ps-order-title">{page.orderHeading}</h2>
            <p>{page.orderIntroduction}</p>
          </div>
          <div className="ps-products">
            {pizzaProducts.map((product) => {
              const isSpecial = product.id.includes('brussels') || product.slug?.includes('brussels');
              const isSixPack = product.id.includes('cheese-6') || product.slug?.includes('cheese-6');
              return (
              <div className={`ps-product ${isSpecial ? 'ps-special' : ''}`} key={product.id}>
                <div className="ps-product-copy">
                  {isSpecial && <span className="ps-special-label">The special</span>}
                  <h3>{product.title}</h3>
                  {product.shortDescription ? <p>{product.shortDescription}</p> : null}
                  <span className="ps-price">
                    {money(product.price)}
                    {isSixPack && (
                      <small> / {money(Math.round(product.price / 6))} per pizza</small>
                    )}
                  </span>
                </div>
                <Quantity
                  title={product.title}
                  value={quantities[product.id] || 0}
                  onChange={(qty) => setQty(product.id, qty)}
                />
              </div>
            )})}
          </div>
          {oliveOil ? <label
            className="ps-oil"
            htmlFor="ps-olive-oil"
            aria-label={`Add ${oliveOil.title} for ${money(oliveOil.price)}`}
          >
            <input
              id="ps-olive-oil"
              type="checkbox"
              checked={!!quantities[oliveOil.id]}
              onChange={(event) => setQty(oliveOil.id, event.target.checked ? 1 : 0)}
            />
            <span>
              <strong>
                {oliveOil.title} <span>{money(oliveOil.price)}</span>
              </strong>
              <small>{page.oliveOilDescription}</small>
            </span>
          </label> : null}
          <div className="ps-pickup">
            <span aria-hidden="true">↗</span>
            <div>
              <strong>{page.pickupHeading}</strong>
              <p>{page.pickupAddress}</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=608+Smith+Ave+S+West+St+Paul+MN"
                target="_blank"
                rel="noreferrer"
              >
                Get directions ↗
              </a>
            </div>
          </div>
          <div className="ps-buy">
            <div className="ps-total" aria-live="polite">
              <span>Your order</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="ps-checkout" type="button" disabled={total === 0 || !orderOpen} onClick={buy}>
              {total ? `Checkout · ${money(total)}` : 'Choose your pizzas'}
              <span aria-hidden="true">↗</span>
            </button>
            <p>{page.checkoutFootnote}</p>
          </div>
        </section>
      </div>
      <section className="ps-journal" aria-labelledby="ps-journal-title">
        <header>
          <div>
            {page.journalEyebrow && !/a few pictures from around here/i.test(page.journalEyebrow) && <p className="ps-eyebrow">{page.journalEyebrow}</p>}
            <h2 id="ps-journal-title">{page.journalHeading}</h2>
          </div>
        </header>
        <div className="ps-journal-grid">
          {journalPhotos.map((photo) => (
            <figure key={photo.src} className={`ps-journal-${photo.src}`}>
              <img
                src={photoUrl(photo.src)}
                alt={photo.alt}
                width={photo.src === 'sliced' ? 1400 : 960}
                height={photo.src === 'sliced' ? 934 : 1280}
                loading="lazy"
              />
            </figure>
          ))}
          {cloudinaryPhotos.map((photo) => (
            <figure key={photo.id}>
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            </figure>
          ))}
        </div>
        <a className="ps-return-to-order" href="#order">
          {page.returnToOrderLabel}
        </a>
      </section>
      <section className="ps-notes" aria-label="Good to know">
        {page.notes.map((note, index) => <div key={note._key || note.label || index}><span>{note.label}</span><h2>{note.heading}</h2><p>{note.text}</p></div>)}
      </section>
      <footer className="ps-footer">
        <Link to="/">local effort cooperative</Link>
        <a href="mailto:yum@localeffortfood.com">Questions? yum@localeffortfood.com</a>
      </footer>
      <CartDrawer store={catalog.store} directCheckout />
    </div>
  );
}

export default function PizzaOnSmithPage() {
  return (
    <CartProvider storageKey="le_cart_pizza_on_smith">
      <PizzaShop />
    </CartProvider>
  );
}
