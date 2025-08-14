// src/App.js

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import initCardTilt from './utils/cardTilt';


// Using a placeholder for the logo to resolve build errors in this environment.
// In your local development, you would use: import logo from './logo.png';
const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

// --- Helper Components & Hooks ---

/**
 * Custom hook to animate a number counting up.
 * @param {number} endValue - The final number to count up to.
 * @param {number} duration - Animation duration in milliseconds.
 * @returns {number} The current animated value.
 */
function useCountUp(endValue, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = endValue;
    // This check is important. If the component re-renders but the end value hasn't changed,
    // we should not restart the animation. We find the "start" value from the *current* count.
    if (count !== 0) {
        start = count;
    }
    
    // If the animation is already complete, do nothing.
    if (start === end) return;

    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      // Ease-out quadratic easing function for a smoother stop
      const easeOutProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeOutProgress * (end - start) + start);
      setCount(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      } else {
         // Ensure it ends precisely on the end value
        setCount(end);
      }
    };

    requestAnimationFrame(animation);

  }, [endValue, duration]); // We remove `count` from dependencies to prevent re-triggering

  return count;
}

function App() {
  useEffect(() => {
    initCardTilt();
  }, []);
// --- CrowdfundingTab component (Complete Redesign) — START ---

// New component for floating "Wow!" text
function FloatingText({ text, onAnimationEnd }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 1, x: Math.random() * 60 - 30 }}
      animate={{ y: -100, opacity: 0, scale: 1.5 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onAnimationEnd}
      className="absolute text-2xl font-bold text-yellow-400 drop-shadow-lg"
      style={{ textShadow: '1px 1px 2px #000' }}
    >
      {text}
    </motion.div>
  );
}

// Main Crowdfunding Component
// Main Crowdfunding Component
function CrowdfundingTab() {
  // State Management
  const [goal, setGoal] =useState(1000);
  const [pizzasSold, setPizzasSold] = useState(0);
  const [funders, setFunders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);

  // Mock Products
  const products = [
    { id: 1, name: "Pizza Voucher", desc: 'One 12" artisan pizza. The classic choice!', price: 20, emoji: "🍕", type: 'pizza' },
    { id: 2, name: "Pie Voucher", desc: 'One 9" seasonal pie. Sweet or savory!', price: 24, emoji: "🥧", type: 'other' },
    { id: 3, name: "Supporter Pack", desc: "Sticker + thank-you wall mention.", price: 10, emoji: "💌", type: 'other' },
    { id: 4, name: "Pizza Party Pack", desc: "Five Pizza Vouchers at a discount!", price: 90, emoji: "🎉", type: 'pizza', pizzaCount: 5 },
  ];

  const fetchStatus = async () => {
    try {
      const response = await fetch('https://local-effort-app-lniu.vercel.app/api/crowdfund/status');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setGoal(data.goal);
      setPizzasSold(data.pizzasSold);
      setFunders(data.funders.reverse());
    } catch (err) {
      setError('Could not load fundraising data. Using mock data.');
      setGoal(1000);
      setPizzasSold(157);
      setFunders([{name: "Alex G."}, {name: "Jordan P."}, {name: "Casey N."}]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Handle Successful Payment Return ---
  // This effect runs when the component loads to check if the user is returning from Square
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // The user has returned from a successful payment.
      // We retrieve the cart from localStorage, as the state would have been reset.
      const lastCart = JSON.parse(localStorage.getItem('le_cart'));
      if (lastCart && lastCart.length > 0) {
        handleSuccessfulPurchase(lastCart);
        // Clear the stored cart and the URL parameter
        localStorage.removeItem('le_cart');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // Fetch the initial status regardless
    fetchStatus();
  }, []);

  // Cart Logic
  const addToCart = (product) => setCart(prevCart => [...prevCart, product]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  // Animated values
  const animatedPizzasSold = useCountUp(pizzasSold, 2000);
  const animatedPercentage = Math.min(100, (animatedPizzasSold / goal) * 100);

  // Encouraging words for animations
  const encouragement = ['Wow!', 'Nice!', 'Awesome!', 'Sweet!', 'Cool!', 'Super!', '🎉'];
  
  // This function now triggers the animations and fetches the new total
  const handleSuccessfulPurchase = (successfulCart) => {
    const pizzasInCart = successfulCart.filter(p => p.type === 'pizza').reduce((sum, item) => sum + (item.pizzaCount || 1), 0);
    
    if (pizzasInCart > 0) {
      for (let i = 0; i < pizzasInCart; i++) {
        setTimeout(() => {
          const newText = {
            id: Date.now() + i,
            text: encouragement[Math.floor(Math.random() * encouragement.length)],
          };
          setFloatingTexts(prev => [...prev, newText]);
        }, i * 200);
      }
    }
    // After animations, clear the visual cart and fetch the new official status from the server
    setCart([]);
    setTimeout(fetchStatus, 500); // Fetch new total from server after a short delay
  };

  // --- UPDATED: Checkout handler ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    // Save the cart to localStorage so we can retrieve it after the redirect
    localStorage.setItem('le_cart', JSON.stringify(cart));

    try {
      // This now sends the cart items to the backend
      const response = await fetch('https://local-effort-app-lniu.vercel.app/api/crowdfund/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, totalAmount: cartTotal }),
      });

      const result = await response.json();
      
      if (response.ok && result.url) {
        // --- THIS IS THE REAL REDIRECT ---
        // Send the user to the Square-hosted checkout page
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to initiate payment.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
      setIsProcessing(false);
      localStorage.removeItem('le_cart'); // Clean up on error
    }
  };

  if (isLoading) return <div className="text-center p-12">Loading fundraising campaign...</div>;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-12 p-4 font-sans">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Help Us Fire Up the Ovens!</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
          We're pre-selling products to fund our new community kitchen. Each pizza voucher purchased fills a slice of our goal!
        </p>
      </header>
      
      {error && <div className="text-center p-4 bg-yellow-100 text-yellow-800 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Left Side - Pizza Tracker */}
        <div className="lg:col-span-1 flex flex-col items-center gap-8 order-2 lg:order-1">
          <div className="relative">
             <PizzaSVG size={400} goal={goal} filled={animatedPizzasSold} />
             <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                 {floatingTexts.map(ft => (
                    <FloatingText 
                        key={ft.id} 
                        text={ft.text} 
                        onAnimationEnd={() => setFloatingTexts(prev => prev.filter(t => t.id !== ft.id))}
                    />
                 ))}
             </div>
          </div>
          <div className="w-full max-w-md">
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-2xl text-gray-800">{animatedPizzasSold.toLocaleString()}</span>
              <span className="text-sm text-gray-500">Goal: {goal.toLocaleString()} pizzas</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <motion.div
                className="bg-red-600 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${animatedPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            <div className="text-center mt-2 font-bold text-lg">{animatedPercentage.toFixed(1)}% Funded</div>
          </div>
           <section className="w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">Recent Supporters</h3>
            <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto">
              {funders.length > 0 ? (
                <ul className="space-y-3">
                  {funders.map((funder, i) => (
                    <li key={i} className="text-sm text-gray-700 animate-fade-in">
                      <span className="font-semibold">{funder.name}</span> supported the campaign!
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">Be the first to support us!</p>}
            </div>
          </section>
        </div>

        {/* Right Side - Products & Cart */}
        <div className="lg:col-span-2 flex flex-col gap-8 order-1 lg:order-2">
          {/* Products Section */}
          <section>
            <h3 className="text-2xl font-bold mb-4">Choose Your Reward</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(product => (
                 <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={() => addToCart(product)}
                 />
              ))}
            </div>
          </section>
          {/* Cart & Checkout Section */}
          <section>
             <h3 className="text-2xl font-bold mb-4">Your Cart</h3>
             <div className="bg-white border rounded-lg p-6 flex flex-col">
                {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your cart is empty.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {cart.map((item, i) => (
                            <li key={i} className="py-3 flex justify-between items-center">
                                <div>
                                    <span className="font-semibold">{item.name}</span>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                </div>
                                <span className="font-bold text-lg">${item.price}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                    <span className="text-xl font-bold">Total:</span>
                    <span className="text-2xl font-extrabold">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                    onClick={handleCheckout} 
                    disabled={cart.length === 0 || isProcessing}
                    className="mt-6 w-full px-6 py-3 rounded-lg bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isProcessing ? "Processing..." : "Checkout with Square"}
                </button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const [showInfo, setShowInfo] = useState(false);
  const buttonText = product.type === 'pizza' ? `Buy a ${product.name.split(' ')[0]}` : "Add to Cart";

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:border-red-500 bg-white">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
        <div className="flex-1">
          <h4 className="text-lg font-bold">{product.name}</h4>
          <p className="text-sm text-gray-600">{product.desc}</p>
        </div>
        <div className="text-4xl ml-4">{product.emoji}</div>
      </div>
      {showInfo && (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-sm text-gray-500 border-t pt-2 mt-2"
        >
            More details about this awesome product would go here. It's a great choice!
        </motion.div>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="font-bold text-xl">${product.price}</div>
        <button 
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors" 
          onClick={onAddToCart}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}


// --- NEW PIZZA SVG ---
// This is a heavily redesigned SVG for a more "pizza-like" appearance.
function PizzaSVG({ size, goal, filled }) {
  const center = size / 2;
  const radius = size * 0.4;
  const crustWidth = size * 0.08;
  const innerRadius = radius - crustWidth;
  const numSlices = Math.min(goal, 1000); // Cap slices for performance
  
  const pepperonis = useMemo(() => {
    const peps = [];
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.sqrt(Math.random()) * (innerRadius - 10);
        peps.push({
            cx: center + dist * Math.cos(angle),
            cy: center + dist * Math.sin(angle),
            r: size * 0.025 * (Math.random() * 0.4 + 0.8) // Vary size
        });
    }
    return peps;
  }, [size, center, innerRadius]);

  const Slice = ({ index }) => {
    const isFilled = index < filled;
    const anglePerSlice = 360 / numSlices;
    const startAngle = -90 + index * anglePerSlice;
    const endAngle = startAngle + anglePerSlice;

    const start = {
      x: center + innerRadius * Math.cos(startAngle * Math.PI / 180),
      y: center + innerRadius * Math.sin(startAngle * Math.PI / 180)
    };
    const end = {
      x: center + innerRadius * Math.cos(endAngle * Math.PI / 180),
      y: center + innerRadius * Math.sin(endAngle * Math.PI / 180)
    };

    const largeArcFlag = anglePerSlice <= 180 ? "0" : "1";
    const d = `M ${center},${center} L ${start.x},${start.y} A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;

    return (
      <path
        d={d}
        fill={isFilled ? "#df4a21" : "transparent"}
        stroke={isFilled ? "#c13e1c" : "#e1b44d"}
        strokeWidth={isFilled ? 1 : 0.5}
        style={{ transition: 'fill 300ms ease-out' }}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="drop-shadow-lg">
      <defs>
        <filter id="crust-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise"/>
          <feDiffuseLighting in="noise" lightingColor="#d4a751" surfaceScale="2" result="light">
            <feDistantLight azimuth="45" elevation="60" />
          </feDiffuseLighting>
          <feComposite in="light" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      
      {/* Base Cheese */}
      <circle cx={center} cy={center} r={innerRadius} fill="#f4cf5d" />

      {/* Slices Layer */}
      <g>
        {Array.from({ length: numSlices }).map((_, i) => <Slice key={i} index={i} />)}
      </g>
      
      {/* Pepperoni Layer (visible only on filled part) */}
      <g clipPath={`url(#filled-mask-${filled})`}>
         {pepperonis.map((pep, i) => (
            <circle key={i} cx={pep.cx} cy={pep.cy} r={pep.r} fill="#c13e1c" stroke="#a12a0f" strokeWidth="1"/>
         ))}
      </g>
      <clipPath id={`filled-mask-${filled}`}>
        <rect x="0" y="0" width={size} height={size} fill="white" />
        {Array.from({ length: numSlices }).map((_, i) => (
          i >= filled ? <Slice key={i} index={i} /> : null
        ))}
      </clipPath>

      {/* Crust */}
      <circle cx={center} cy={center} r={radius} fill="#e1b44d" filter="url(#crust-texture)" />
      <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#d4a751" strokeWidth="2" />
      
       {/* Center Text */}
       <g filter="url(#subtle-glow)">
        <circle cx={center} cy={center} r={size * 0.18} fill="#fff" stroke="#eee" strokeWidth="2" />
        <text x={center} y={center - 6} textAnchor="middle" fontSize={size * 0.1} fontWeight="700" fill="#333">{filled}</text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize={size * 0.04} fill="#666" opacity="0.8">PIZZAS</text>
      </g>
    </svg>
  );
}

// --- Page Transition Wrapper ---
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5,
};

const AnimatedPage = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);


// --- Header ---
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="p-4 md:p-8 border-b border-gray-900 relative">
      <div className="flex justify-between items-center">
        <a href="/#/" onClick={closeMenu}>
          <img src={logo} alt="Local Effort Logo" className="h-10 w-auto cursor-pointer" />
        </a>
        <nav className="hidden md:flex items-center space-x-2 font-mono text-sm">
          <Link to="/services" className="hover:bg-gray-200 rounded p-2 transition-colors">Services</Link>
          <Link to="/pricing" className="hover:bg-gray-200 rounded p-2 transition-colors">Pricing</Link>
          <Link to="/menu" className="hover:bg-gray-200 rounded p-2 transition-colors">Menus</Link>
          <Link to="/about" className="hover:bg-gray-200 rounded p-2 transition-colors">About</Link>
          <Link to="/crowdfunding" className="bg-red-600 text-white rounded font-semibold p-2 px-4 hover:bg-red-700 transition-colors">Fundraiser</Link>
        </nav>
        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>
      {isMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 w-full bg-[#F5F5F5] border-b border-l border-r border-gray-900 font-mono text-center z-50">
          <Link to="/services" onClick={closeMenu} className="block p-4 border-t border-gray-300">Services</Link>
          <Link to="/pricing" onClick={closeMenu} className="block p-4 border-t border-gray-300">Pricing</Link>
          <Link to="/menu" onClick={closeMenu} className="block p-4 border-t border-gray-300">Menus</Link>
          <Link to="/about" onClick={closeMenu} className="block p-4 border-t border-gray-300">About</Link>
          <Link to="/crowdfunding" onClick={closeMenu} className="block p-4 border-t border-gray-300 bg-red-100 font-semibold">Fundraiser</Link>
        </nav>
      )}
    </header>
  );
};

// --- Footer ---
const Footer = () => {
  return (
    <footer className="p-8 mt-16 border-t border-gray-900 font-mono text-sm">
      <div className="flex justify-between">
        <div>
            <p>&copy; {new Date().getFullYear()} Local Effort</p>
            <p className="text-gray-600">Roseville, MN | Midwest</p>
        </div>
        <div className="flex space-x-4">
          <a href="https://instagram.com/localeffort" className="underline">Instagram</a>
          <a href="https://facebook.com/localeffort" className="underline">Facebook</a>
          <a href="https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268" className="underline">Thumbtack</a>
        </div>
      </div>
    </footer>
  );
};

// --- Reusable Components for Pages ---
const ServiceCard = ({ to, title, description }) => (
    <Link to={to} className="block bg-[#F5F5F5] p-8 space-y-4 hover:bg-gray-200 cursor-pointer">
        <h4 className="text-2xl font-bold uppercase">{title}</h4>
        <p className="font-mono text-gray-600 h-24">{description}</p>
        <span className="font-mono text-sm underline">Learn More &rarr;</span>
    </Link>
);

const VennDiagram = () => {
    const svgStyle = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: '10px' };
    const circleStyle = { mixBlendMode: 'multiply' };
    const labelStyle = { fontSize: '10px', fontWeight: 'bold', fill: '#000', textAnchor: 'middle' };
    const centerLabelStyle = { ...labelStyle, fontSize: '8px', fill: '#FFFFFF' };
    return (
      <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" style={svgStyle}>
        <circle cx="115" cy="120" r="50" fill="#fde047" style={circleStyle} />
        <circle cx="185" cy="120" r="50" fill="#67e8f9" style={circleStyle} />
        <circle cx="150" cy="70" r="50" fill="#fca5a5" style={circleStyle} />
        <text x="100" y="130" style={labelStyle}>Cost Efficiency</text>
        <text x="200" y="130" style={labelStyle}>Local Ingredients</text>
        <text x="150" y="55" style={labelStyle}>Perfect Nutrition</text>
        <text x="150" y="105" style={centerLabelStyle}>Foundation</text>
        <text x="150" y="115" style={centerLabelStyle}>Meal Plan</text>
      </svg>
    );
};

const CostEstimator = () => {
    const [userAnswers, setUserAnswers] = useState({});
    const [currentQuestionKey, setCurrentQuestionKey] = useState('start');
    const [questionPath, setQuestionPath] = useState([]);
    const [finalCost, setFinalCost] = useState(0);
    const [breakdown, setBreakdown] = useState([]);
    const [showResults, setShowResults] = useState(false);

    const questions = {
        'start': { id: 'serviceType', title: "What kind of service are you looking for?", type: 'options', options: [ { text: "Weekly Meal Plan", value: "mealPlan" }, { text: "Small Event or Party", value: "smallEvent" }, { text: "Intimate Dinner at Home", value: "dinnerAtHome" }, { text: "Pizza Party", value: "pizzaParty" } ], next: (answer) => `${answer}_q1` },
        'mealPlan_q1': { id: 'numPeople', title: "How many people?", type: 'number', placeholder: "e.g., 2", next: 'mealPlan_q2' },
        'mealPlan_q2': { id: 'meals', title: "Meals per week?", type: 'multi_number', fields: [ { id: 'breakfasts', label: 'Breakfasts' }, { id: 'lunches', label: 'Lunches' }, { id: 'dinners', label: 'Dinners' } ], next: 'mealPlan_q3' },
        'mealPlan_q3': { id: 'billing', title: "Billing preference?", type: 'options', options: [ { text: "Weekly", value: "weekly" }, { text: "Monthly (10% off)", value: "monthly" }, { text: "Seasonally (20% off)", value: "seasonal" } ], next: 'end' },
        'smallEvent_q1': { id: 'numPeople', title: "How many guests?", type: 'number', placeholder: "e.g., 25", next: 'smallEvent_q2' },
        'dinnerAtHome_q1': { id: 'numPeople', title: "How many guests?", type: 'number', placeholder: "e.g., 4", next: 'smallEvent_q2' },
        'smallEvent_q2': { id: 'serviceStyle', title: "Service style?", type: 'options', options: [ { text: "Food Drop-off", value: "dropoff" }, { text: "Passed Appetizers", value: "passedApps" }, { text: "Buffet Style", value: "buffet" }, { text: "Buffet & Passed Apps", value: "buffetAndPassed" }, { text: "Plated Meal", value: "plated" } ], next: 'smallEvent_q4' },
        'smallEvent_q4': { id: 'sensitivity', title: "Focus for the event?", type: 'options', options: [ { text: "Premium / Unforgettable", value: "quality_sensitive" }, { text: "Budget-friendly / Impressive", value: "price_sensitive" } ], next: 'end' },
        'pizzaParty_q1': { id: 'numPeople', title: "How many people?", type: 'number', placeholder: "e.g., 20", next: 'pizzaParty_q2' },
        'pizzaParty_q2': { id: 'addons', title: "Add-ons (salads, etc.)?", type: 'options', options: [ { text: "Yes", value: true }, { text: "No, just pizza", value: false } ], next: 'end' },
    };

    const calculateCost = (answers) => {
        let totalCost = 0;
        let breakdownCalc = [];
        const people = parseInt(answers.numPeople) || 1;
        // Simplified cost model for demonstration
        switch(answers.serviceType) {
            case 'mealPlan': totalCost = people * ((parseInt(answers.breakfasts) || 0) * 15 + (parseInt(answers.lunches) || 0) * 20 + (parseInt(answers.dinners) || 0) * 25); break;
            case 'smallEvent': totalCost = people * 75; break;
            case 'dinnerAtHome': totalCost = people * 120; break;
            case 'pizzaParty': totalCost = 300 + (people > 15 ? (people - 15) * 18 : 0); break;
            default: totalCost = 0;
        }
        setFinalCost(totalCost);
        setBreakdown([`Estimated cost for ${people} person(s): $${totalCost.toFixed(2)}`]);
        setShowResults(true);
    };

    const handleAnswer = (question, value) => {
        const newAnswers = { ...userAnswers };
        if (question.type === 'multi_number') { Object.assign(newAnswers, value); } 
        else { newAnswers[question.id] = value; }
        setUserAnswers(newAnswers);
        setQuestionPath([...questionPath, currentQuestionKey]);
        let nextKey = typeof question.next === 'function' ? question.next(value) : question.next;
        if (!nextKey || nextKey === 'end') { calculateCost(newAnswers); } 
        else { setCurrentQuestionKey(nextKey); }
    };

    const restart = () => {
        setUserAnswers({});
        setCurrentQuestionKey('start');
        setQuestionPath([]);
        setShowResults(false);
    };

    if (showResults) {
        return (
            <div className="border border-gray-900 p-8 text-center">
                <h3 className="text-2xl font-bold">All-Inclusive Ballpark Estimate</h3>
                <p className="text-6xl font-bold my-4">${finalCost.toFixed(2)}</p>
                <div className="bg-gray-200 p-4 text-left mb-6 font-mono text-sm">
                    {breakdown.map((item, i) => <p key={i}>- {item}</p>)}
                </div>
                <button onClick={restart} className="mt-6 text-sm underline font-mono">Start Over</button>
            </div>
        );
    }
    
    const currentQData = questions[currentQuestionKey];
    return (
        <div className="relative w-full border border-gray-900 p-8 min-h-[400px]">
            <h2 className="text-3xl font-bold mb-6">{currentQData.title}</h2>
            {currentQData.type === 'options' && (
                <div className="space-y-3 font-mono">
                    {currentQData.options.map(opt => (
                        <button key={opt.value.toString()} onClick={() => handleAnswer(currentQData, opt.value)} className="w-full text-left p-4 border border-gray-900 hover:bg-gray-200 block">
                            {opt.text}
                        </button>
                    ))}
                </div>
            )}
            {currentQData.type === 'number' && (
                <div>
                    <input type="number" id={`input-${currentQData.id}`} placeholder={currentQData.placeholder} className="w-full p-4 text-xl border-b-2 border-gray-900 outline-none bg-transparent font-mono" onKeyPress={(e) => { if (e.key === 'Enter') { handleAnswer(currentQData, e.target.value || '0'); } }}/>
                    <button onClick={() => handleAnswer(currentQData, document.getElementById(`input-${currentQData.id}`).value || '0')} className="mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700">OK</button>
                </div>
            )}
            {currentQData.type === 'multi_number' && (
                <div className="font-mono space-y-4">
                    {currentQData.fields.map(field => (
                         <div key={field.id} className="grid grid-cols-2 items-center gap-4">
                             <label htmlFor={`input-${field.id}`} className="text-lg">{field.label}</label>
                             <input type="number" id={`input-${field.id}`} placeholder="0" className="p-3 text-lg border-b-2 border-gray-900 outline-none bg-transparent"/>
                         </div>
                    ))}
                    <button onClick={() => {
                        const multiValue = {};
                        currentQData.fields.forEach(field => {
                            multiValue[field.id] = document.getElementById(`input-${field.id}`).value || '0';
                        });
                        handleAnswer(currentQData, multiValue);
                    }} className="mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700 !ml-auto !block">OK</button>
                </div>
            )}
        </div>
    );
};

// --- Page Components ---

const HomePage = () => {
  const navigate = useNavigate();
  return (
    <>
      <Helmet>
        <title>Local Effort | Personal Chef & Event Catering in Roseville, MN</title>
        <meta name="description" content="Local Effort offers personal chef services, event catering, and weekly meal prep in Roseville, MN." />
      </Helmet>
      <div className="space-y-16 md:space-y-32">
        <section className="grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
            <div>
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Minnesotan Food</h2>
                <h3 className="text-5xl md:text-7xl font-bold uppercase text-gray-400">For Your Functions.</h3>
                <p className="mt-8 font-mono max-w-md">Professional in-home dining. 30 years collective fine food experience. Sourcing the best local ingredients without compromise.</p>
                <button onClick={() => navigate('/services')} className="mt-8 bg-gray-900 text-white font-mono py-3 px-6 text-lg hover:bg-gray-700">Explore Services</button>
            </div>
            <div className="w-full min-h-[400px] h-full bg-gray-200 border border-gray-900 p-4">
                <div className="w-full h-full border border-gray-900 bg-cover bg-center" style={{backgroundImage: "url('/gallery/IMG_3145.jpg')"}}></div>
            </div>
        </section>
        <section>
            <h3 className="text-3xl font-bold uppercase mb-8 border-b border-gray-900 pb-4">Core Offerings</h3>
            <div className="grid md:grid-cols-3 gap-px bg-gray-900 border border-gray-900">
                 <ServiceCard to="/meal-prep" title="Weekly Meal Prep" description="Foundation & custom plans. Basic, good nutrition from local Midwest sources." />
                 <ServiceCard to="/events" title="Dinners & Events" description="Event catering and In-home chef experiences, for parties of 2 to 50." />
                 <ServiceCard to="/pizza-party" title="Pizza Parties" description="Mobile high-temperature pizza oven, sourdough crusts, and all local ingredients." />
            </div>
        </section>
      </div>
    </>
  );
};

const AboutUsPage = () => {
    const specialSkills = [
        { name: "Sourdough & Baking", description: "Natural leavening is a passion. We maintain our own sourdough starter and bake all our bread products in-house using local flours." },
        { name: "Fresh Pasta", description: "From agnolotti to tajarin, all our pasta is handmade, often using specialty flours and local eggs." },
        { name: "Charcuterie & Curing", description: "We practice whole-animal butchery and cure our own meats, from duck prosciutto to pork pate, ensuring quality and minimizing waste." },
        { name: "Foraging", description: "When the season allows, we forage for wild ingredients like ramps, mushrooms, and berries to bring a unique taste of Minnesota to the plate." },
        { name: "Fermentation", description: "We use fermentation to create unique flavors and preserve the harvest, making everything from hot sauce to kombucha." }
    ];
    const [activeSkill, setActiveSkill] = useState(specialSkills[0]);
    return (
        <>
            <Helmet>
                <title>About Us | Local Effort</title>
                <meta name="description" content="Meet the chefs behind Local Effort, Weston Smith and Catherine Olsen." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase border-b border-gray-900 pb-4">About Us</h2>
                <p className="font-mono text-lg max-w-3xl">With 30 years of collective experience, we are passionate about food and hospitality. We believe in quality, handmade products and sourcing the best local ingredients without compromise.</p>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="border border-gray-900 p-8">
                        <h3 className="text-3xl font-bold">Weston Smith</h3>
                        <img src="/gallery/IMG-1013.JPG?text=Weston+Smith" alt="Weston Smith" className="my-4" />
                        <p className="font-mono text-gray-600 mb-4">Chef de Cuisine, Director</p>
                        <p className="font-mono">California-born and New York-trained, Weston is in charge of baking our sourdough bread and creating the menus.</p>
                    </div>
                    <div className="border border-gray-900 p-8">
                        <h3 className="text-3xl font-bold">Catherine Olsen</h3>
                        <img src="/gallery/IMG-6353.JPG?text=Catherine+Olsen" alt="Catherine Olsen" className="my-4" />
                        <p className="font-mono text-gray-600 mb-4">Pastry, General Manager</p>
                        <p className="font-mono">A Minnesota native specializing in tarts, bars, cakes, and fresh pasta.</p>
                    </div>
                </div>
                 <div className="border border-gray-900 p-8">
                    <h3 className="text-2xl font-bold mb-4">Special Skills</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 font-mono flex flex-col space-y-2">
                           {specialSkills.map(skill => (
                               <button key={skill.name} onMouseEnter={() => setActiveSkill(skill)} className={`text-left p-2 border-l-2 ${activeSkill.name === skill.name ? 'border-gray-900 bg-gray-200' : 'border-transparent hover:bg-gray-200'}`}>
                                   {skill.name}
                               </button>
                           ))}
                        </div>
                        <div className="md:col-span-2 bg-gray-200 p-6 font-mono min-h-[150px]">
                            <p>{activeSkill.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const ServicesPage = () => {
    const navigate = useNavigate();
    return (
        <>
            <Helmet>
                <title>Services | Local Effort</title>
                <meta name="description" content="Explore the personal chef and catering services offered by Local Effort." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase border-b border-gray-900 pb-4">Services</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Weekly Meal Prep</h3>
                        <p className="font-mono">Nutritious, locally-sourced meals delivered weekly. Foundation & custom plans.</p>
                        <button onClick={() => navigate('/meal-prep')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Dinners & Events</h3>
                        <p className="font-mono">In-home chef experiences for parties of 2 to 50.</p>
                        <button onClick={() => navigate('/events')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                    <div className="border border-gray-900 p-8 space-y-4">
                        <h3 className="text-3xl font-bold">Pizza Parties</h3>
                        <p className="font-mono">Mobile wood-fired pizza for a fun, delicious event.</p>
                        <button onClick={() => navigate('/pizza-party')} className="font-mono text-sm underline">Details &rarr;</button>
                    </div>
                </div>
            </div>
        </>
    );
};

const MealPrepPage = () => (
    <>
        <Helmet>
            <title>Weekly Meal Prep | Local Effort</title>
            <meta name="description" content="Our Foundation Meal Plan provides 21 nutritious meals per week from local Midwest sources." />
        </Helmet>
        <div className="space-y-16">
            <h2 className="text-5xl md:text-7xl font-bold uppercase">Weekly Meal Prep</h2>
            <p className="font-mono text-lg max-w-3xl">Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy to create custom plans for any diet.</p>
            <div className="border border-gray-900 p-8">
                <h3 className="text-3xl font-bold mb-4">Foundation Meal Plan</h3>
                <VennDiagram />
                <p className="font-mono mb-6 max-w-2xl">Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at ~1800 calories/day.</p>
            </div>
        </div>
    </>
);

const EventsPage = () => (
    <>
        <Helmet>
            <title>Dinners & Events | Local Effort</title>
            <meta name="description" content="Let Local Effort cater your next event. We specialize in in-home dining for parties of 2 to 50." />
        </Helmet>
        <div className="space-y-16">
            <h2 className="text-5xl md:text-7xl font-bold uppercase">Dinners & Events</h2>
            <p className="font-mono text-lg max-w-3xl">We bring our passion for food and hospitality to your home or venue. We specialize in cooking for parties from 2 to 50 people.</p>
        </div>
    </>
);

const MenuPage = () => {
    const sampleMenus = [
      {
        title: "Cabin dinner for 12 in May",
        sections: [
          { course: "Start", items: ["Sourdough focaccia with spring herbs", "Roasted beets over labneh - local beets, fresh strained yogurt, citrus and hazelnut or Asparagus salad, bacon, hazelnut, parmesan", "Agnolotti - fresh pasta filled with ricotta and gouda, served with butter and crispy mushroom, honey"] },
          { course: "Main", items: ["Rainbow trout (raised in Forest Hills!) wrapped in fennel and broweston iled cabbage - with asparagus, potato puree or Chicken ballotine with chewy carrots, ramps, sherry jus"] },
          { course: "Dessert", items: ["Strawberry shortcake"] }
        ]
      },
      {
        title: "Office Party for 20",
        description: "(Stationary, substantial appetizers)",
        sections: [
            { course: "Menu", items: ["Charcuterie spread - including duck breast 'prosciutto,' beef bresaola from indiana, wisconsin gouda, minnesota 'camembert,' candied hazelnuts, pickled vegetables, flax crackers, jam, and a pate.", "Sourdough focaccia, with herbes de provence.", "Beets over labneh - local beets treated very nicely, over fresh strained yogurt, with citrus and hazelnut", "Simple carrot salad - julienned carrots tossed in cilantro and pistachio", "Duck Pastrami sliders - on fresh buns with aioli and pickled cabbage"] }
        ]
      },
  {
    title: "Home Event, University gala, 13 guests",
    sections: [
      { course: "Passed Apps", items: ["Grilled Lamb loin Skewers marinated in onion and mint", "Grilled Vegetable skewers, early season", "Walleye brandade, on house crackers"] },
      { course: "Start", items: ["Pork Belly Porchetta with spaetzle, served with peas and carrots, applesauce", "Sourdough focaccia for the table"] },
      { course: "Main", items: ["Duck leg confit, with red polenta and mushrooms or Alaskan Sockeye wrapped in charred cabbage and fennel, served with crispy russet potatoes or Pheasant ballotine, mushroom, carrot, celery root puree"] },
      { course: "Dessert", items: ["Citrus tart - blood orange, Meyer lemon, kumquat or Torta Caprese - dense chocolate hazelnut cake"] }
    ]
  },
  {
    title: "Bar Brava Industry Night",
    sections: [
        { course: "Menu", items: ["Sloppy Joe, on fresh potato bun with purple slaw and white onion", "Pate en Croute, with lamb and duck, served with watercress and mustard", "Lamb neck, over white beans with leek confit and tomato vinaigrette", "Chef's Big Salad - fresh greens, beets, carrots, potatoes - add trout", "Cheese and crackers, jam", "Duck Prosciutto, pickles", "Sourdough Focaccia"] },
        { course: "Dessert", items: ["Carrot cake", "Hazelnut Butter Cup"] }
    ]
  },
  {
    title: "January Wedding for 60",
    sections: [
      { course: "Stationary", items: ["Charcuterie and Cheese spread - local meat and cheeses, including duck ‘prosciutto’, accoutrement like pickles, nuts, chips, jams, sourdough bread and crackers, dips"] },
      { course: "Passed", items: ["Squash toast - ricotta, roasted Kabocha squash, sage honey, fermented chili flake and olive oil", "Charred Date Cruller Bites - Pork skin, balsalmic"] },
      { course: "Seated and shared - Vegetable dishes", items: ["White wine-Poached Leeks over mustard vinaigrette", "Roasted beets over cultured labneh with citrus and hazelnuts", "Smoky cauliflower in lemon cream with watercress and pistachio dukkuh", "Raw carrots, julienned and dressed in cilantro and pistachio", "Roasted Winter chicories and cabbages, goat cheese, pepitas, citrus", "Purple sweet potato salad, warm/German style, tahini aioli, red onion and hominy"] },
      { course: "Seated and shared - Meat dishes", items: ["Braised bison and spaetzle, carrots and peas", "Cassoulet, duck confit with white bean and lamb sausage", "Chicken Ballontine, rolled and sliced, with mushroom and gravy", "Rainbow Trout over potato galette, gruyere"] },
      { course: "Desserts", items: ["Cookie plates, ex. Cardamom citrus shortbread, hazelnut linzer with plum, cranberry oat bars"] }
    ]
  },
  {
    title: "Late Spring Wedding for 130",
    sections: [
        { course: "Start/Share", items: ["Sourdough Focaccia “breadsticks”", "All-belly Porchetta, braised in cider", "Skewers - lamb and vegetable", "Crackers, Pickles and pickled fish, Walleye Brandade", "Crudite, Bagna Cauda", "Lamb hand pies, carrots potatoes and peas"] },
        { course: "Main", items: ["Duck leg confit, over red polenta and grilled asparagus Or Alaskan Sockeye, wild mushroom risotto with peas"] },
        { course: "Desserts", items: ["Hazelnut linzer with jam", "Millionaire shortbread", "Coconut macaron", "Cornish Fairing"] }
    ]
  },
  {
    title: "Bachelorette Party, Summer, 11 Guests",
    sections: [
      { course: "Start", items: ["Sourdough focaccia - basil and cherry tomato", "Prosciutto and melon", "Snap pea salad, fresh yogurt and strawberry, hazelnut"] },
      { course: "Main", items: ["Sockeye salmon OR Hanger Steak OR chicken breast paillard - grilled sweet corn and summer squash, fregola sarda, heirloom tomato"] },
      { course: "Dessert", items: ["Blueberry tart - vanilla creme"] }
    ]
  },
  {
    title: "Home Event, Christmas Work Party, 50 guests - Sample 1",
    sections: [
        { course: "To start", items: ["Salo (cured pork fat), garlic, sourdough bread, pickles", "stuffed cabbage rolls", "beets with dill", "potatoes filled with mushroom", "fresh watermelon, pickled watermelon", "seasonal greens", "olive salad"] },
        { course: "Main", items: ["kabob/shashlik - just mountains of skewers. including: roasted chicken, steak, lamb, tomatoes, mushrooms, and seasonal vegetables, garlic sauce and other sauces and marinades"] }
    ]
  },
  {
    title: "Home Event, Christmas Work Party, 50 guests - Sample 2",
    sections: [
        { course: "Start", items: ["Sourdough focaccia with olive oil and za'atar", "Fresh ricotta", "Spring/summer salad - based on availability"] },
        { course: "Mid-course", items: ["Agnolotti, filled with artichoke and shitake, with crispy sunchokes drizzled with honey"] },
        { course: "Main", items: ["Beef tenderloin, finished in foie gras butter and leek ash", "Asparagus, cured egg yolk, parmesan"] },
        { course: "Movement - Dessert and outdoor fire", items: ["Raspberry marshmallow, with chocolate graham shortbread", "Cognac, or Scotch"] }
    ]
  },
  {
    title: "Home Event, Christmas Work Party, 50 guests - Sample 3",
    sections: [
        { course: "Stationary", items: ["Charcuterie and cheese - a mix of local (Minnesota, Wisconsin, and Indiana) and import (mostly italian, some french), with accoutrement like crudites, olives, jams, nuts, pickles, and housemade chips and crackers. (We can get really specific if you prefer.)", "Fresh Bread - sourdough with local flour - suggesting focaccia and baguette - with olive oil and butter"] },
        { course: "Passed and Placed", items: ["Carrot salad with pistachio and cilantro", "Frites", "James Beard's onion sandwich - onion and mayo with parsley on white bread, crusts cut off", "Duck egg with duck bacon and asparagus", "Scallop and apple", "Short rib \"nigiri\"", "Croque Monsieur"] },
        { course: "Desserts", items: ["Cookie plate - Chocolate Chip, Hazelnut Linzer, + 3rd undecided option", "\"Twinkies\" - citrus chiffon filled with foie gras buttercream", "Japanese cheesecake"] }
    ]
  },
  {
    title: "Home Event, Christmas Work Party, 50 guests - Sample 4",
    sections: [
        { course: "Stationary", items: ["Charcuterie and cheese platters, including: breseola, cured pork tenderloin, marinated olives, pickled beets, tomato jam, 3-5 cheeses, candied walnuts, duck rillettes, house crackers and chips", "Garlic focaccia", "Carrot salad with pistachio and coriander"] },
        { course: "Passed", items: ["Duck egg with duck pastrami", "Kabocha squash toast, ricotta and persimmon honey", "Perfect Beef tenderloin, leek and corn ash, foie gras butter"] },
        { course: "Desserts", items: ["Cookies and bars", "Persimmon cake with cranberry", "Hot chocolate with marshmallows and local peppermint schnapps"] }
    ]
  }
];
    const [openMenu, setOpenMenu] = useState(0);
    return (
        <>
            <Helmet>
                <title>Menu Examples | Local Effort</title>
                <meta name="description" content="View sample menus from real events catered by Local Effort." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Menu Examples</h2>
                <p className="font-mono text-lg max-w-3xl">We create custom menus for every event. These are from real events and are intended as inspiration.</p>
                <div className="space-y-px bg-gray-900 border border-gray-900">
                    {sampleMenus.map((menu, index) => (
                        <div key={index} className="bg-[#F5F5F5]">
                            <button onClick={() => setOpenMenu(openMenu === index ? null : index)} className="w-full p-8 text-left flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold">"{menu.title}"</h3>
                                    {menu.description && <p className="font-mono text-gray-600">{menu.description}</p>}
                                </div>
                                <span className={`transform transition-transform duration-300 text-3xl ${openMenu === index ? 'rotate-45' : ''}`}>+</span>
                            </button>
                            {openMenu === index && (
                                <div className="p-8 pt-0 font-mono text-sm">
                                    <div className="border-t border-gray-300 pt-4 space-y-4">
                                        {menu.sections.map((section, sIndex) => (
                                            <div key={sIndex}>
                                                <h4 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2">{section.course}</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {section.items.map((item, iIndex) => <li key={iIndex}>{item}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

const PizzaPartyPage = () => (
    <>
        <Helmet>
            <title>Mobile Pizza Parties | Local Effort</title>
            <meta name="description" content="Book a mobile wood-fired pizza party with Local Effort." />
        </Helmet>
        <div className="space-y-16">
            <h2 className="text-5xl md:text-7xl font-bold uppercase">Pizza Parties</h2>
            <p className="font-mono text-lg max-w-3xl">Our mobile wood-fired pizza oven is the perfect addition to any event.</p>
        </div>
    </>
);

const PricingPage = () => {
    const [openFaq, setOpenFaq] = useState(null);
    const pricingFaqData = [ { name: "How much does a weekly meal plan cost?", answer: "Our weekly meal plans range from $13.50 for lighter breakfast options to $24 for full dinner meals." }, { name: "What is the cost for a small event or party?", answer: "A simple food drop-off service starts as low as $25 per person. Full-service events can range up to $85 per person or more." }, { name: "How much does an intimate dinner at home cost?", answer: "An intimate dinner at your home generally ranges from $65 to $125 per person." }, { name: "How much is a private pizza party?", answer: "Our private pizza parties start at $300 for groups of up to 15 people." } ];
    return (
        <>
            <Helmet>
                <title>Pricing | Local Effort</title>
                <meta name="description" content="Find pricing information for Local Effort's personal chef services." />
            </Helmet>
            <div className="space-y-16">
                <h2 className="text-5xl md:text-7xl font-bold uppercase">Pricing</h2>
                <p className="font-mono text-lg max-w-3xl">Use our estimator for a ballpark figure, or review our general pricing guidelines below.</p>
                <section>
                    <h3 className="text-3xl font-bold uppercase mb-4">Cost Estimator</h3>
                    <CostEstimator />
                </section>
                <section>
                    <h3 className="text-3xl font-bold uppercase mb-4">General Pricing FAQ</h3>
                     <div className="space-y-px bg-gray-900 border border-gray-900">
                        {pricingFaqData.map((item, index) => (
                            <div key={index} className="bg-[#F5F5F5]">
                                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full p-8 text-left flex justify-between items-center">
                                    <h3 className="text-2xl font-bold">{item.name}</h3>
                                    <span className={`transform transition-transform duration-300 text-3xl ${openFaq === index ? 'rotate-45' : ''}`}>+</span>
                                </button>
                                {openFaq === index && (
                                    <div className="p-8 pt-0">
                                        <p className="font-mono text-gray-700 border-t border-gray-300 pt-4">{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
};

// --- Main App Component Structure ---
// This component contains the router and the main layout.
// It renders the AppContent which handles the animated routes.
const AppContent = () => {
  const location = useLocation();
  return (
    <HelmetProvider>
      <div className="bg-[#F5F5F5] text-gray-900 font-sans antialiased">
        <Header />
        <main className="p-4 md:p-8 lg:p-16">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
              <Route path="/about" element={<AnimatedPage><AboutUsPage /></AnimatedPage>} />
              <Route path="/services" element={<AnimatedPage><ServicesPage /></AnimatedPage>} />
              <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
              <Route path="/crowdfunding" element={<AnimatedPage><CrowdfundingTab /></AnimatedPage>} />
              <Route path="/meal-prep" element={<AnimatedPage><MealPrepPage /></AnimatedPage>} />
              <Route path="/events" element={<AnimatedPage><EventsPage /></AnimatedPage>} />
              <Route path="/menu" element={<AnimatedPage><MenuPage /></AnimatedPage>} />
              <Route path="/pizza-party" element={<AnimatedPage><PizzaPartyPage /></AnimatedPage>} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
}

// The top-level App component that provides the Router context.
function App() {
  return <AppContent />;
}

export default App;