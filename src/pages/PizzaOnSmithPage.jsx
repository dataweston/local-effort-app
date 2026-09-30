import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CartProvider, useCart } from '../store/cart/CartContext';
import CartDrawer from '../store/components/CartDrawer';
import catalog from '../store/data/pizzaOnSmith.json';
import { SITE_URL } from '../config/siteMetadata';
import { trackEvent } from '../lib/trackEvent';
import '../styles/pizza-on-smith.css';

const money = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const photos = [
  {
    src: 'brussels',
    alt: 'Brussels sprout pizza on a silver platter',
    caption: 'The Brussels sprout special.',
  },
  {
    src: 'sliced',
    alt: 'A slice pulled from a pepperoni pizza on a wooden board',
    caption: 'From the oven to the table. Pepperoni pictured.',
  },
  {
    src: 'crust',
    alt: 'Close-up of a blistered pizza crust inside its vacuum seal',
    caption: 'A proper crust. Ready for your oven.',
  },
  {
    src: 'packed',
    alt: 'A stack of individually vacuum-sealed pizzas',
    caption: 'A freezer full of good dinners.',
  },
  {
    src: 'cheese',
    alt: 'Small cheese and pepperoni pizzas on parchment',
    caption: 'Little pizzas, same big crust.',
  },
  {
    src: 'oven',
    alt: 'A person holding a freshly baked pizza beside an outdoor oven',
    caption: 'Pizza makes people happy.',
  },
  {
    src: 'stamp',
    alt: 'Local Pizza lettering printed with hand-carved potato stamps',
    caption: 'Even the stamp is homemade.',
  },
  {
    src: 'local-pizza',
    alt: 'A person holding a small shirt with the red Local Pizza stamp',
    caption: 'Local pizza. Little shirt.',
  },
  {
    src: 'boxed',
    alt: 'A pizza in a hand-stamped Local Pizza box',
    caption: 'A very good thing to bring home.',
  },
  {
    src: 'seasonal',
    alt: 'A vacuum-sealed seasonal pizza topped with corn, herbs and cheese',
    caption: 'Midwest ingredients, sealed in.',
  },
];
const journalPhotos = ['sliced', 'local-pizza', 'oven', 'stamp', 'boxed'].map((src) =>
  photos.find((photo) => photo.src === src)
);
const photoUrl = (name) => `/images/pizza-on-smith/${name}.webp`;
const description =
  'Neapolitan-inspired frozen pizzas, 100% Midwest ingredients. Pick up on Tuesdays at 604 Smith Ave S, West St. Paul.';

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
  const { add, clear, totalQty, openCart } = useCart();
  const [quantities, setQuantities] = useState({ 'smith-cheese-3': 1 });
  const [activePhoto, setActivePhoto] = useState(0);
  const setQty = (id, qty) => setQuantities((current) => ({ ...current, [id]: qty }));
  const total = catalog.products.reduce(
    (sum, product) => sum + product.price * (quantities[product.id] || 0),
    0
  );
  const buy = () => {
    // This is a complete order builder, so repeated clicks never duplicate a bag.
    clear();
    catalog.products.forEach((product) => {
      const qty = quantities[product.id] || 0;
      if (qty)
        add({
          productId: product.id,
          title: product.title,
          qty,
          unitPrice: product.price,
          image: product.image ? photoUrl(product.image) : null,
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
    itemListElement: catalog.products.map((product, index) => ({
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
        ...(product.image ? { image: `${SITE_URL}${photoUrl(product.image)}` } : {}),
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
      <nav className="ps-nav" aria-label="Pizza shop navigation">
        <Link to="/" className="ps-wordmark">
          local effort
        </Link>
        <span>good food, close to home.</span>
        {totalQty > 0 ? (
          <button type="button" onClick={openCart}>
            Your order ({totalQty}) ↗
          </button>
        ) : (
          <a href="#order">Order pizza ↗</a>
        )}
      </nav>
      <header className="ps-hero">
        <h1>Home Oven Pizzas available on Smith Ave.</h1>
        <p>pickup on tuesdays. Perfect frozen pizzas for quick home dinners. 100% midwest ingredients. Real Food.</p>
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
              fetchpriority="high"
            />
            <figcaption>
              <span>{photos[activePhoto].caption}</span>
              <span>
                {String(activePhoto + 1).padStart(2, '0')} / {photos.length}
              </span>
            </figcaption>
          </figure>
          <div className="ps-gallery-controls" aria-label="Photo navigation">
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setActivePhoto((activePhoto + photos.length - 1) % photos.length)}
            >
              ←
            </button>
            <span>Food, freezers &amp; familiar faces</span>
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
                src={photoUrl('packed')}
                alt="Pizzas vacuum sealed individually and stacked for the freezer"
                width="720"
                height="960"
                loading="lazy"
              />
              <figcaption>Stock up.</figcaption>
            </figure>
            <figure>
              <img
                src={photoUrl('crust')}
                alt="A close look at the browned crust through its vacuum seal"
                width="720"
                height="960"
                loading="lazy"
              />
              <figcaption>Look at that crust.</figcaption>
            </figure>
          </div>
          <div className="ps-story">
            <h2>
              A little Naples.
              <br />
              All Midwest.
            </h2>
            <p>
              Neapolitan-inspired pizzas made with 100% Midwest ingredients. Vacuum sealed for shelf
              life and home-oven perfection. Keep a few on hand for the nights you’d rather just
              turn on the oven.
            </p>
          </div>
        </section>
        <section className="ps-order" id="order" aria-labelledby="ps-order-title">
          <div className="ps-order-heading">
            <h2 id="ps-order-title">Stock your freezer.</h2>
            <p>Choose your packs. Mix as you like.</p>
          </div>
          <div className="ps-products">
            {catalog.products.slice(0, 4).map((product, index) => (
              <div className={`ps-product ${index === 3 ? 'ps-special' : ''}`} key={product.id}>
                <div className="ps-product-copy">
                  {index === 3 && <span className="ps-special-label">The special</span>}
                  <h3>
                    {
                      [
                        '10″ cheese · 3 pack',
                        '10″ cheese · 6 pack',
                        'Kids’ cheese · 3 pack',
                        'Brussels sprout pizza',
                      ][index]
                    }
                  </h3>
                  <p>
                    {
                      [
                        'Three pizzas, ready when you are.',
                        'Six pizzas. Save $9 vs. two 3-packs.',
                        'Little pizzas for little appetites.',
                        'One pizza. Something a little different.',
                      ][index]
                    }
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
          <label className="ps-oil">
            <input
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
              <strong>Pick up on Tuesday. It’s free.</strong>
              <p>
                604 Smith Ave S<br />
                West St. Paul, MN
              </p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=604+Smith+Ave+S+West+St+Paul+MN"
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
            <p className="ps-eyebrow">A few pictures from around here</p>
            <h2 id="ps-journal-title">This is local pizza.</h2>
          </div>
          <p>
            From the first slice to the potato-stamped boxes. A mix of past and present pizzas;
            today’s selection is in the order form.
          </p>
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
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
        <a className="ps-return-to-order" href="#order">
          Fill your freezer ↗
        </a>
      </section>
      <section className="ps-notes" aria-label="Good to know">
        <div>
          <span>01 / pick up</span>
          <h2>Your Tuesday stop.</h2>
          <p>
            Collect your order at 604 Smith Ave S in West St. Paul. Pickup is free; these pizzas are
            for local pickup only.
          </p>
        </div>
        <div>
          <span>02 / keep frozen</span>
          <h2>Dinner, on standby.</h2>
          <p>
            Vacuum sealed for shelf life. Keep frozen until you’re ready, then follow the baking
            directions on the package.
          </p>
        </div>
        <div>
          <span>03 / finish well</span>
          <h2>Don’t forget the crust.</h2>
          <p>
            After the bake, brush a little olive oil over the crust. A small step that makes a
            better pizza.
          </p>
        </div>
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
