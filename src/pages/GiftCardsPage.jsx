import React from 'react';
import { Helmet } from 'react-helmet-async';
import GiftCardDialog from '../components/home/GiftCardDialog';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/gift-cards-page.css';

const GiftCardsPage = () => {
  const canonical = `${SITE_URL}/gift-cards`;

  return (
    <div className="gift-card-page fullpage-demo-scope">
      <Helmet>
        <title>Gift Cards | {SITE_NAME}</title>
        <meta
          name="description"
          content="Send a Local Effort gift card for private dinners, pizza parties, weekly meals, and other chef-made experiences in Minneapolis-St. Paul."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={`Gift Cards | ${SITE_NAME}`} />
        <meta
          property="og:description"
          content="Give a Local Effort dinner, pizza party, or chef-made experience. Digital delivery is available immediately."
        />
      </Helmet>

      <main className="gift-card-page__main">
        <section className="about-gift-card" aria-labelledby="gift-card-page-title">
          <figure className="about-gift-card__plate">
            <img
              src="https://iiif.micr.io/jaTqd/full/900,/0/default.jpg"
              alt="Botanical study of four apples by Anselmus Boëtius de Boodt"
              width={900}
              height={1152}
              decoding="async"
            />
          </figure>
          <div className="about-gift-card__copy">
            <p className="about-gift-card__folio">gift certificate / field no. 01</p>
            <h1 className="about-gift-card__title" id="gift-card-page-title">
              Give them dinner, not more stuff.
            </h1>
            <p className="about-gift-card__text">
              A Local Effort gift card can become a quiet dinner at home, a pizza party, weekly meals,
              or something we plan together. Send the digital card now or choose a hand-lettered leather
              keepsake at $250 and above.
            </p>
            <div className="about-gift-card__ledger" aria-label="Common gift card amounts">
              <span>$100</span>
              <span>$250</span>
              <span>$500</span>
            </div>
            <div>
              <GiftCardDialog autoOpen />
            </div>
            <p className="about-gift-card__note">redeemable across Local Effort experiences —</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GiftCardsPage;
