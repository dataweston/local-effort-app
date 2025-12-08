// src/pages/FullPageDemoPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FullPageContainer from '../components/fullpage/FullPageContainer';
import FullPageSection from '../components/fullpage/FullPageSection';
import {
  fadeInUp,
  fullPageStagger,
} from '../utils/animations';

const FullPageDemoPage = () => {
  const [activePage, setActivePage] = useState(0);

  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'work', label: 'Work' },
    { id: 'contact', label: 'Contact' },
  ];

  const handlePageChange = (index) => {
    setActivePage(index);
  };

  const navigateToPage = (index) => {
    if (window.scrollToPage) {
      window.scrollToPage(index);
    }
  };

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-neutral-900">
            Demo Site
          </Link>

          <div className="flex gap-1">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => navigateToPage(index)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activePage === index
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Full Page Container */}
      <FullPageContainer
        pages={pages}
        enableKeyboard={true}
        onPageChange={handlePageChange}
      >
        {/* Page 1: Home */}
        <FullPageSection
          id="home"
          className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900"
          animation="fadeScale"
        >
          <div className="flex flex-col items-center justify-center h-full text-white px-6 pt-20">
            <motion.div
              variants={fullPageStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center max-w-4xl"
            >
              <motion.h1
                variants={fadeInUp}
                className="heading-display text-white mb-6"
              >
                Horizontal Full-Page Navigation
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto"
              >
                Swipe horizontally or use the menu bar to navigate between pages.
                Each page takes the full viewport width.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex gap-4 justify-center"
              >
                <button
                  onClick={() => navigateToPage(1)}
                  className="btn btn-primary px-6 py-3 text-base"
                >
                  Explore Pages
                </button>
                <Link
                  to="/"
                  className="btn btn-secondary px-6 py-3 text-base bg-white text-neutral-900 hover:bg-neutral-100"
                >
                  Exit Demo
                </Link>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="mt-12 text-neutral-400 text-sm"
              >
                <p>Keyboard: ← → arrows • Trackpad: Swipe left/right • Click menu items</p>
              </motion.div>
            </motion.div>
          </div>
        </FullPageSection>

        {/* Page 2: About */}
        <FullPageSection
          id="about"
          className="bg-white"
          animation="sectionReveal"
        >
          <div className="flex flex-col items-center justify-center h-full px-6 pt-20">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <h2 className="heading-xl mb-6">About This Demo</h2>
                <p className="text-lg text-neutral-600 mb-8">
                  This is a horizontal full-page scroll navigation system. Each page takes
                  the full viewport width, and you can navigate between them smoothly.
                </p>
              </motion.div>

              <motion.div
                variants={fullPageStagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid md:grid-cols-2 gap-8"
              >
                <motion.div variants={fadeInUp} className="card">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-bold mb-2">CSS Scroll-Snap</h3>
                  <p className="text-neutral-600">
                    Horizontal scroll-snap for smooth page-to-page navigation with
                    native browser performance.
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="card">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold mb-2">Menu Navigation</h3>
                  <p className="text-neutral-600">
                    Click any menu item to instantly jump to that page with smooth
                    animated transitions.
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="card">
                  <div className="text-4xl mb-4">⌨️</div>
                  <h3 className="text-xl font-bold mb-2">Keyboard Support</h3>
                  <p className="text-neutral-600">
                    Navigate with left/right arrow keys, or use trackpad gestures
                    for a natural experience.
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="card">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-xl font-bold mb-2">Touch Friendly</h3>
                  <p className="text-neutral-600">
                    Swipe left or right on touch devices. Fully responsive and
                    mobile-optimized.
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 3: Services */}
        <FullPageSection
          id="services"
          className="bg-gradient-to-br from-orange-50 to-rose-50"
          animation="slideUp"
        >
          <div className="flex flex-col items-center justify-center h-full px-6 pt-20">
            <div className="max-w-4xl w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="heading-xl mb-6">Features</h2>
                <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                  Everything you need for horizontal page navigation
                </p>
              </motion.div>

              <motion.div
                variants={fullPageStagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid md:grid-cols-3 gap-6"
              >
                {[
                  {
                    title: 'Smooth Transitions',
                    desc: 'CSS scroll-snap provides buttery smooth page transitions',
                    icon: '✨',
                  },
                  {
                    title: 'Active State Tracking',
                    desc: 'Menu highlights the current page automatically',
                    icon: '🎯',
                  },
                  {
                    title: 'Full Viewport Pages',
                    desc: 'Each page takes 100vw × 100vh for immersive experience',
                    icon: '📐',
                  },
                  {
                    title: 'Hash Navigation',
                    desc: 'Deep link to specific pages with URL fragments',
                    icon: '🔗',
                  },
                  {
                    title: 'Customizable',
                    desc: 'Easy to integrate into any React application',
                    icon: '⚙️',
                  },
                  {
                    title: 'Performant',
                    desc: 'Zero JavaScript overhead for scrolling behavior',
                    icon: '🚀',
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="bg-white rounded-xl p-6 shadow-sm"
                  >
                    <div className="text-3xl mb-3">{feature.icon}</div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-neutral-600">{feature.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 4: Work */}
        <FullPageSection
          id="work"
          className="bg-gradient-to-br from-neutral-800 to-neutral-900"
          animation="fadeScale"
        >
          <div className="flex flex-col items-center justify-center h-full px-6 text-white pt-20">
            <div className="max-w-5xl w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="heading-xl text-white mb-4">
                  How It Works
                </h2>
                <p className="text-neutral-300 text-lg">
                  Simple, elegant, and built with modern web technologies
                </p>
              </motion.div>

              <motion.div
                variants={fullPageStagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-6"
              >
                <motion.div
                  variants={fadeInUp}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-8"
                >
                  <h3 className="text-2xl font-bold mb-4">1. CSS Scroll-Snap</h3>
                  <p className="text-neutral-300">
                    The container uses <code className="bg-black/30 px-2 py-1 rounded text-sm">scroll-snap-type: x mandatory</code> for
                    horizontal scrolling with snap points at each page.
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-8"
                >
                  <h3 className="text-2xl font-bold mb-4">2. Menu Bar Navigation</h3>
                  <p className="text-neutral-300">
                    Clicking menu items triggers <code className="bg-black/30 px-2 py-1 rounded text-sm">scrollIntoView()</code> to
                    smoothly scroll to the target page.
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-8"
                >
                  <h3 className="text-2xl font-bold mb-4">3. IntersectionObserver</h3>
                  <p className="text-neutral-300">
                    Tracks which page is currently in view and updates the active menu state automatically.
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 5: Contact */}
        <FullPageSection
          id="contact"
          className="bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600"
          animation="sectionReveal"
        >
          <div className="flex flex-col items-center justify-center h-full px-6 text-white pt-20">
            <motion.div
              variants={fullPageStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center max-w-3xl"
            >
              <motion.h2
                variants={fadeInUp}
                className="heading-display text-white mb-6"
              >
                Ready to Build?
              </motion.h2>

              <motion.p
                variants={fadeInUp}
                className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
              >
                This horizontal navigation system is production-ready. Integrate it
                into your project and customize to your needs.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
              >
                <Link
                  to="/"
                  className="btn btn-primary bg-white text-neutral-900 hover:bg-neutral-100 px-8 py-4 text-base"
                >
                  Back to Home
                </Link>
                <button
                  onClick={() => navigateToPage(0)}
                  className="btn bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 px-8 py-4 text-base"
                >
                  Back to Start
                </button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="text-white/80 text-sm space-y-2"
              >
                <p>Built with React • Framer Motion • Tailwind CSS</p>
                <p className="text-white/60">
                  Keyboard: ← → arrows • Trackpad/Mouse: Swipe • Menu: Click to navigate
                </p>
              </motion.div>
            </motion.div>
          </div>
        </FullPageSection>
      </FullPageContainer>
    </>
  );
};

export default FullPageDemoPage;
