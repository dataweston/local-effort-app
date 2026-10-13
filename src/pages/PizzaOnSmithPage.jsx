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
import DropBanner from '../store/components/DropBanner';
import { getDropState, getDropWindow, useNow } from '../store/pizzaDrop';
import PizzaRichCopy from '../store/components/PizzaRichCopy';
import { cloudinarySrcSet, cloudinaryUrl, usablePhotos } from '../store/pizzaPhotos';

const money = (cents) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const photoUrl = (name) => `/images/pizza-on-smith/${name}.webp`;
const lines = (value) => String(value || '').split('\n').map((line, index) => (
  <React.Fragment key={`${line}-${index}`}>{index > 0 && <br />}{line}</React.Fragment>
));
const productImage = (product) => product.images?.[0] || (product.image ? photoUrl(product.image) : null);
const mergePage = (nextPage) => ({
  ...generatedCatalog.page,
  ...Object.fromEntries(Object.entries(nextPage || {}).filter(([, value]) => value != null && value !== '')),
  notes: nextPage?.notes?.length ? nextPage.notes : generatedCatalog.page.notes,
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

function Quantity({ title, value, onChange, max = 50 }) {
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
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
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
  const now = useNow(30000);
  const dropWindow = getDropWindow(page);
  const dropState = getDropState(dropWindow, now);
  const description = page.seoDescription;
  const galleryPhotos = usablePhotos(page.galleryPhotos);
  const detailPhoto = usablePhotos([page.detailPhoto])[0];
  const journalPhotos = usablePhotos(page.journalPhotos);
  const shownPhoto = galleryPhotos[Math.min(activePhoto, Math.max(galleryPhotos.length - 1, 0))];
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
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!catalogLoaded || checkoutLinkHandled.current || typeof window === 'undefined' || dropState !== 'open') return;
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
  }, [add, catalogLoaded, clear, dropState, openCart, products]);
  const oliveOil = products.find((product) =>
    product.id === 'smith-olive-oil' ||
    product.slug === 'smith-olive-oil' ||
    product.offerKey?.includes('olive_oil')
  );
  const pizzaProducts = products.filter((product) => product.id !== oliveOil?.id);
  const unitsLeft = (product) => (product.inventoryManaged === true ? Math.max(0, Number(product.inventory) || 0) : null);
  const soldOut = pizzaProducts.length > 0 && pizzaProducts.every((product) => unitsLeft(product) === 0);
  const orderOpen = dropState === 'open' && !soldOut;
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
        {galleryPhotos[0] ? <meta property="og:image" content={cloudinaryUrl(galleryPhotos[0].publicId, { width: 1200, ratio: '1.91' })} /> : null}
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <header className="ps-hero">
        <h1>{lines(page.headline)}</h1>
        <PizzaRichCopy value={page.introduction} />
        <DropBanner
          window={dropWindow}
          state={dropState}
          now={now}
          soldOut={soldOut}
          fulfillmentLabel={page.fulfillmentLabel}
        />
      </header>
      <div className="ps-shop">
        <section className="ps-gallery" aria-label="Our pizzas">
          {shownPhoto ? (
            <>
              <figure>
                <img
                  className="ps-main-photo"
                  src={cloudinaryUrl(shownPhoto.publicId, { width: 960, ratio: '3:4' })}
                  srcSet={cloudinarySrcSet(shownPhoto.publicId, [480, 960, 1440], '3:4')}
                  sizes="(min-width: 900px) 50vw, 100vw"
                  alt={shownPhoto.alt}
                  width="960"
                  height="1280"
                  fetchPriority="high"
                />
              </figure>
              {galleryPhotos.length > 1 ? (
                <>
                  <div className="ps-gallery-controls" aria-label="Photo navigation">
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => setActivePhoto((activePhoto + galleryPhotos.length - 1) % galleryPhotos.length)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => setActivePhoto((activePhoto + 1) % galleryPhotos.length)}
                    >
                      →
                    </button>
                  </div>
                  <div className="ps-thumbnails" aria-label="Choose a photo">
                    {galleryPhotos.map((photo, index) => (
                      <button
                        key={photo._key || photo.publicId}
                        type="button"
                        aria-label={`Show photo: ${photo.alt}`}
                        aria-pressed={activePhoto === index}
                        onClick={() => setActivePhoto(index)}
                      >
                        <img
                          src={cloudinaryUrl(photo.publicId, { width: 144, ratio: '1:1' })}
                          alt=""
                          width="72"
                          height="72"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          {detailPhoto ? (
            <div className="ps-freezer-photos">
              <figure>
                <img
                  src={cloudinaryUrl(detailPhoto.publicId, { width: 720, ratio: '3:4' })}
                  alt={detailPhoto.alt}
                  width="720"
                  height="960"
                  loading="lazy"
                />
              </figure>
            </div>
          ) : null}
          <div className="ps-story">
            <h2>{lines(page.storyHeading)}</h2>
            <PizzaRichCopy value={page.storyText} />
          </div>
        </section>
        <section className="ps-order" id="order" aria-labelledby="ps-order-title">
          <div className="ps-order-heading">
            <h2 id="ps-order-title">{page.orderHeading}</h2>
            <PizzaRichCopy value={page.orderIntroduction} />
          </div>
          <div className="ps-products">
            {pizzaProducts.map((product) => {
              const isSpecial = product.id.includes('brussels') || product.slug?.includes('brussels');
              const isSixPack = product.id.includes('cheese-6') || product.slug?.includes('cheese-6');
              const left = unitsLeft(product);
              return (
              <div className={`ps-product ${isSpecial ? 'ps-special' : ''}`} key={product.id}>
                <div className="ps-product-copy">
                  <h3>{product.title}</h3>
                  {product.shortDescription ? <p>{product.shortDescription}</p> : null}
                  <span className="ps-price">
                    {money(product.price)}
                    {isSixPack && (
                      <small> / {money(Math.round(product.price / 6))} per pizza</small>
                    )}
                  </span>
                  {left !== null && left <= 12 ? (
                    <span className={`ps-stock${left === 0 ? ' ps-stock-out' : ''}`}>
                      {left === 0 ? 'Sold out' : `Only ${left} left`}
                    </span>
                  ) : null}
                </div>
                <Quantity
                  title={product.title}
                  value={quantities[product.id] || 0}
                  max={left ?? 50}
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
              <small><PizzaRichCopy value={page.oliveOilDescription} inline /></small>
            </span>
          </label> : null}
          <div className="ps-pickup">
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
              {!orderOpen
                ? soldOut && dropState === 'open' ? 'Sold out' : dropState === 'upcoming' ? 'Ordering opens soon' : 'Ordering closed'
                : total ? `Checkout · ${money(total)}` : 'Choose your pizzas'}
            </button>
            <p>{page.checkoutFootnote}</p>
          </div>
        </section>
      </div>
      <section className="ps-journal" aria-labelledby="ps-journal-title">
        <header>
          <div>
            <h2 id="ps-journal-title">{page.journalHeading}</h2>
          </div>
        </header>
        {journalPhotos.length ? (
          <div className="ps-journal-grid">
            {journalPhotos.map((photo, index) => (
              <figure key={photo._key || photo.publicId} className={index === 0 ? 'ps-journal-wide' : undefined}>
                <img
                  src={cloudinaryUrl(photo.publicId, { width: index === 0 ? 1400 : 960, ratio: index === 0 ? '3:2' : '3:4' })}
                  alt={photo.alt}
                  width={index === 0 ? 1400 : 960}
                  height={index === 0 ? 934 : 1280}
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        ) : null}
        <a className="ps-return-to-order" href="#order">
          {page.returnToOrderLabel}
        </a>
      </section>
      <dl className="ps-notes" aria-label="Good to know">
        {page.notes.map((note, index) => <div key={note._key || note.heading || index}><dt>{note.heading}</dt><dd><PizzaRichCopy value={note.text} /></dd></div>)}
      </dl>
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
