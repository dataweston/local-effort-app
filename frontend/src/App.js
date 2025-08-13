// src/App.js

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Using a placeholder for the logo to resolve build errors in this environment.
// In your local development, you would use: import logo from './logo.png';
const logo = 'https://placehold.co/160x50/111827/f5f5f5?text=Local+Effort&font=mono';

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
    if (start === end && count === end) return;

    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      // Ease-out quadratic easing function
      const easeOutProgress = progress * (2 - progress);
      setCount(Math.floor(easeOutProgress * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animation);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animation);

  }, [endValue, duration]);

  return count;
}


// --- CrowdfundingTab component (pizza tracker) — START ---
// This is the completely redesigned crowdfunding component.

function CrowdfundingTab() {
  const [goal, setGoal] = useState(1000);
  const [pizzasSold, setPizzasSold] = useState(0);
  const [funders, setFunders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch initial crowdfunding status from the backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // IMPORTANT: Replace with your deployed backend URL
        const response = await fetch('http://localhost:3001/api/crowdfund/status');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setGoal(data.goal);
        setPizzasSold(data.pizzasSold);
        setFunders(data.funders.reverse()); // Show most recent first
        setIsLoading(false);
      } catch (err) {
        setError('Could not load fundraising data. Please try again later.');
        setIsLoading(false);
        // Set some default values on error to prevent crashes
        setGoal(1000);
        setPizzasSold(157);
        setFunders([{name: "Alex G."}, {name: "Jordan P."}, {name: "Casey N."}]);
      }
    };
    fetchStatus();
  }, []);

  const animatedPizzasSold = useCountUp(pizzasSold);
  const animatedPercentage = Math.min(100, (animatedPizzasSold / goal) * 100);

  // Handle pre-buying a product
  const handlePrebuy = async (productName, amount) => {
    setIsProcessing(true);
    try {
      // In a real app, you might collect the funder's name from a form
      const funderName = `Supporter #${Math.floor(Math.random() * 10000)}`;

      const response = await fetch('http://localhost:3001/api/crowdfund/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          amount,
          funderName,
        }),
      });

      const result = await response.json();

      if (response.ok && result.paymentUrl) {
        // Redirect to Square for payment
        window.location.href = result.paymentUrl;
      } else {
        throw new Error(result.error || 'Failed to initiate payment.');
      }
    } catch (err) {
      console.error("Payment Error:", err.message);
      alert(`Error: ${err.message}`); // Replace with a better notification system
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-12">Loading fundraising campaign...</div>;
  }
  
  if (error) {
    return <div className="text-center p-12 bg-red-100 text-red-800 rounded-lg">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 p-4 font-sans">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Help Us Fire Up the Ovens!</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          We're pre-selling pizzas to fund our new community kitchen. Every purchase gets us one step closer to opening our doors.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3 flex flex-col items-center gap-8">
          <PizzaSVG size={400} goal={goal} filled={animatedPizzasSold} />
          <div className="w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-2xl text-gray-800">{animatedPizzasSold.toLocaleString()}</span>
              <span className="text-sm text-gray-500">Goal: {goal.toLocaleString()} pizzas</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${animatedPercentage}%` }}
              />
            </div>
             <div className="text-center mt-2 font-bold text-lg">{animatedPercentage.toFixed(1)}% Funded</div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-8">
          <section>
            <h3 className="text-2xl font-bold mb-4 border-b pb-2">Choose Your Reward</h3>
            <ProductsPanel onPrebuy={handlePrebuy} isProcessing={isProcessing} />
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-4 border-b pb-2">Recent Supporters</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              {funders.length > 0 ? (
                <ul className="space-y-3">
                  {funders.map((funder, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      🍕 <span className="font-semibold">{funder.name}</span> supported the campaign.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Be the first to support us!</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PizzaSVG({ size, goal, filled }) {
  const cx = size / 2, cy = size / 2, R = size * 0.45, r = size * 0.18;
  const dTheta = (2 * Math.PI) / goal;
  
  const slices = useMemo(() => {
    // Only calculate as many slices as needed to avoid performance issues with large goals
    const renderCount = Math.min(goal, 2000); 
    return Array.from({ length: renderCount }, (_, i) => {
      const a0 = i * dTheta - Math.PI / 2;
      const a1 = (i + 1) * dTheta - Math.PI / 2;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
      const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 0 0 ${xi0} ${yi0} Z`;
    });
  }, [goal, cx, cy, R, r, dTheta]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="pizza-svg drop-shadow-lg">
      <defs>
        <filter id="subtle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
        </linearGradient>
      </defs>
      <g className="pizza-base">
        <circle cx={cx} cy={cy} r={R} fill="#f4cf5d" stroke="#e1b44d" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={R} fill="url(#shimmer)" className="shimmer-effect" opacity="0"/>
      </g>
      
      <g>
        {slices.map((d, i) => {
          const isFilled = i < filled;
          return (
            <path
              key={i}
              d={d}
              fill={isFilled ? "#d35435" : "#f4cf5d"}
              stroke={isFilled ? "#9c2d11" : "#e1b44d"}
              strokeWidth={0.5}
              opacity={isFilled ? 1 : 0.2}
              style={{ transition: 'fill 300ms ease-out, opacity 300ms ease-out' }}
            />
          );
        })}
      </g>
      
      <g filter="url(#subtle-glow)">
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#eee" strokeWidth="2" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.1} fontWeight="700" fill="#333">{filled}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={size * 0.04} fill="#666" opacity="0.8">PIZZAS SOLD</text>
      </g>
    </svg>
  );
}

function ProductsPanel({ onPrebuy, isProcessing }) {
  const products = [
    { name: "Pizza Presale", desc: 'One 12" artisan pizza voucher.', price: 20, emoji: "🍕" },
    { name: "Pie Presale", desc: 'One 9" seasonal pie voucher.', price: 24, emoji: "🥧" },
    { name: "Supporter Pack", desc: "Sticker + thank-you wall mention.", price: 10, emoji: "💌" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {products.map(product => (
        <ProductCard 
          key={product.name}
          {...product}
          onBuy={() => onPrebuy(product.name, product.price)}
          isProcessing={isProcessing}
        />
      ))}
    </div>
  );
}

function ProductCard({ name, desc, price, emoji, onBuy, isProcessing }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 flex flex-col gap-3 transition-all hover:shadow-md hover:border-red-500">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-lg font-bold">{name}</h4>
          <p className="text-sm text-gray-600">{desc}</p>
        </div>
        <div className="text-3xl">{emoji}</div>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <div className="font-bold text-xl">${price}</div>
        <button 
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed" 
          onClick={onBuy}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Pre-buy'}
        </button>
      </div>
    </div>
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
                        <img src="https://placehold.co/600x400/e5e7eb/333?text=Weston+Smith" alt="Weston Smith" className="my-4" />
                        <p className="font-mono text-gray-600 mb-4">Chef de Cuisine, Director</p>
                        <p className="font-mono">California-born and New York-trained, Weston is in charge of baking our sourdough bread and creating the menus.</p>
                    </div>
                    <div className="border border-gray-900 p-8">
                        <h3 className="text-3xl font-bold">Catherine Olsen</h3>
                        <img src="https://placehold.co/600x400/e5e7eb/333?text=Catherine+Olsen" alt="Catherine Olsen" className="my-4" />
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
