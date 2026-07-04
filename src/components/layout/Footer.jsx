import React, { useState } from 'react';
import { AskChefForm } from '../forms/AskChefForm';
import '../../styles/fullpage-demo-theme.css';

export const Footer = () => {
  const [showAskChef, setShowAskChef] = useState(false);

  return (
    <>
      <footer className="fullpage-demo-scope fullpage-demo-footer">
        <div className="fullpage-demo-footer-inner">
          <div className="fullpage-demo-footer-brand">
            <div className="fullpage-demo-footer-name">Local Effort Inc.</div>
            <div className="fullpage-demo-footer-location">Roseville, MN</div>
          </div>
          <nav className="fullpage-demo-footer-links" aria-label="Footer">
            <a href="/releases" className="fullpage-demo-footer-link">Press</a>
            <a href="/happymonday" className="fullpage-demo-footer-link">For Happy Monday</a>
            <a href="/return-policy" className="fullpage-demo-footer-link">Returns</a>
          </nav>
          <div className="fullpage-demo-footer-actions">
            <button
              type="button"
              onClick={() => setShowAskChef(true)}
              className="fullpage-demo-footer-button"
            >
              Ask a chef
            </button>
          </div>
        </div>
      </footer>

      <AskChefForm
        open={showAskChef}
        onOpenChange={setShowAskChef}
        dialogClassName="fullpage-demo-scope"
      />
    </>
  );
};
