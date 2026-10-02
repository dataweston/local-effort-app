import React, { useEffect, useState } from 'react';
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
const description =
  'Neapolitan-inspired frozen pizzas, 100% Midwest ingredients. Pick up on Tuesdays at 608 Smith Ave S, West St. Paul.';

const fallbackPage = {
  eyebrow: 'Frozen pizza · Tuesday pickup',
  headline: 'Home-oven pizzas, available on Smith Ave.',
  introduction: 'Pickup on Tuesdays. Perfect frozen pizzas for quick home dinners. 100% Midwest ingredients. Real food.',
  storyHeading: 'A little Naples.\nAll Midwest.',
  storyText: 'Neapolitan-inspired pizzas made with 100% Midwest ingredients. Vacuum sealed for shelf life and home-oven perfection. Keep a few on hand for the nights you’d rather just turn on the oven.',
  orderHeading: 'Stock your freezer.',
  orderIntroduction: 'Choose your packs. Mix as you like.',
  pickupHeading: 'Pick up on Tuesday.',
  pickupAddress: '608 Smith Ave S, West St. Paul, MN',
  journalEyebrow: 'A few pictures from around here',
  journalHeading: 'This is local pizza.',
  notes: [
    {label: '01 / pick up', heading: 'Your Tuesday stop.', text: 'Collect your order at 608 Smith Ave S in West St. Paul. These pizzas are for local pickup only.'},
    {label: '02 / keep frozen', heading: 'Dinner, on standby.', text: 'Vacuum sealed for shelf life. Keep frozen until you’re ready, then follow the baking directions on the package.'},
    {label: '03 / finish well', heading: 'Don’t forget the crust.', text: 'After the bake, brush a little olive oil over the crust. A small step that makes a better pizza.'},
  ],
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
  const [products, setProducts] = useState(generatedCatalog.products);
  const [page, setPage] = useState(fallbackPage);
  useEffect(() => {
    let alive = true;
    fetch('/api/store/products?store=pizza-on-smith')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive || !data) return;
        if (Array.isArray(data.products) && data.products.length) setProducts(data.products);
        if (data.page) setPage({...fallbackPage, ...data.page, notes: data.page.notes?.length ? data.page.notes : fallbackPage.notes});
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
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
          allowsDelivery: false,
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
          availableDeliveryMethod: 'https://schema.org/OnSitePickup',
        },
      },
    })),
  };
  return (
    <div className="pizza-smith fullpage-demo-scope">
      <Helmet>
        <title>Pizza on Smith | Frozen Pizza Pickup — Local Effort</title>
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
        <p className="ps-eyebrow">{page.eyebrow}</p>
        <h1>{page.headline}</h1>
        <p>{page.introduction}</p>
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
          <div className="ps-freezer-photos ps-freezer-photos-single">
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
            <h2>{page.storyHeading.split('\n').map((line, index) => <React.Fragment key={line}>{index > 0 && <br />}{line}</React.Fragment>)}</h2>
            <p>{page.storyText}</p>
          </div>
        </section>
        <section className="ps-order" id="order" aria-labelledby="ps-order-title">
          <div className="ps-order-heading">
            <h2 id="ps-order-title">{page.orderHeading}</h2>
            <p>{page.orderIntroduction}</p>
          </div>
          <div className="ps-products">
            {products.slice(0, 4).map((product, index) => (
              <div className={`ps-product ${index === 3 ? 'ps-special' : ''}`} key={product.id}>
                <div className="ps-product-copy">
                  {index === 3 && <span className="ps-special-label">The special</span>}
                  <h3>{product.title}</h3>
                  <p>
                    {product.shortDescription ||
                      [
                        'Three pizzas, ready when you are.',
                        'Six pizzas. Save $9 vs. two 3-packs.',
                        'Little pizzas for little appetites.',
                        'One pizza. Something a little different.',
                      ][index]}
                  </p>
                  <span className="ps-price">
                    {money(product.price)}
                    {index === 1 && (
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
            ))}
          </div>
          <label
            className="ps-oil"
            htmlFor="ps-olive-oil"
            aria-label="Add 1 liter of olive oil for $32"
          >
            <input
              id="ps-olive-oil"
              type="checkbox"
              checked={!!quantities['smith-olive-oil']}
              onChange={(event) => setQty('smith-olive-oil', event.target.checked ? 1 : 0)}
            />
            <span>
              <strong>
                Add olive oil <span>1 liter · $32</span>
              </strong>
              <small>
                The finishing touch: brush a little olive oil on the crusts after baking. They’re
                better that way.
              </small>
            </span>
          </label>
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
            <button className="ps-checkout" type="button" disabled={total === 0} onClick={buy}>
              {total ? `Checkout · ${money(total)}` : 'Choose your pizzas'}
              <span aria-hidden="true">↗</span>
            </button>
            <p>Secure payment with Square · No account needed</p>
          </div>
        </section>
      </div>
      <section className="ps-journal" aria-labelledby="ps-journal-title">
        <header>
          <div>
            <p className="ps-eyebrow">{page.journalEyebrow}</p>
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
        </div>
        <a className="ps-return-to-order" href="#order">
          Fill your freezer ↗
        </a>
      </section>
      <section className="ps-notes" aria-label="Good to know">
        {page.notes.map((note) => <div key={note.label}><span>{note.label}</span><h2>{note.heading}</h2><p>{note.text}</p></div>)}
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
