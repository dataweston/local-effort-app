import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import { fetchStatus, createCheckoutSession } from '../api/crowdfundService';
import { ProductCard } from '../components/common/ProductCard';
import { PizzaSVG } from '../components/crowdfunding/PizzaSVG';
import { FloatingText } from '../components/crowdfunding/FloatingText';

export const CrowdfundingPage = () => {
  const [goal, setGoal] = useState(1000);
  const [pizzasSold, setPizzasSold] = useState(0);
  const [funders, setFunders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);

  const products = [
    { id: 1, name: "Pizza Voucher", desc: 'One 12" artisan pizza. The classic choice!', price: 20, emoji: "🍕", type: 'pizza' },
    { id: 2, name: "Pie Voucher", desc: 'One 9" seasonal pie. Sweet or savory!', price: 24, emoji: "🥧", type: 'other' },
    { id: 3, name: "Supporter Pack", desc: "Sticker + thank-you wall mention.", price: 10, emoji: "💌", type: 'other' },
    { id: 4, name: "Pizza Party Pack", desc: "Five Pizza Vouchers at a discount!", price: 90, emoji: "🎉", type: 'pizza', pizzaCount: 5 },
  ];

  const loadStatus = async () => {
    try {
      const data = await fetchStatus();
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const lastCart = JSON.parse(localStorage.getItem('le_cart'));
      if (lastCart && lastCart.length > 0) {
        handleSuccessfulPurchase(lastCart);
        localStorage.removeItem('le_cart');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    loadStatus();
  }, []);

  const addToCart = (product) => setCart(prevCart => [...prevCart, product]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  const animatedPizzasSold = useCountUp(pizzasSold, 2000);
  const animatedPercentage = Math.min(100, (animatedPizzasSold / goal) * 100);

  const encouragement = ['Wow!', 'Nice!', 'Awesome!', 'Sweet!', 'Cool!', 'Super!', '🎉'];
  
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
    setCart([]);
    setTimeout(loadStatus, 500);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    localStorage.setItem('le_cart', JSON.stringify(cart));

    try {
      const result = await createCheckoutSession(cart, cartTotal);
      window.location.href = result.url;
    } catch (err) {
      alert(`Error: ${err.message}`);
      setIsProcessing(false);
      localStorage.removeItem('le_cart');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-pulse-warm w-12 h-12 bg-primary-warm rounded-full mx-auto mb-4"></div>
        <p className="text-body">Loading fundraising campaign...</p>
      </div>
    </div>
  );

  return (
    <div className="container space-y-12">
      {/* Header */}
      <header className="text-center animate-fade-in-up">
        <h1 className="text-hero font-display gradient-text mb-6">
          Help Us Fire Up the Ovens!
        </h1>
        <p className="text-body-large max-w-4xl mx-auto">
          We're pre-selling products to fund our new community kitchen. 
          Each pizza voucher purchased fills a slice of our goal!
        </p>
      </header>
      
      {/* Error Message */}
      {error && (
        <div className="card bg-yellow-50 border-yellow-200 animate-fade-in-up stagger-1">
          <div className="card-content py-4">
            <p className="text-body text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Progress Section */}
        <div className="lg:col-span-1 flex flex-col items-center gap-8 order-2 lg:order-1">
          {/* Pizza Visualization */}
          <div className="relative animate-fade-in-scale stagger-2">
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

          {/* Progress Bar */}
          <div className="w-full max-w-md animate-fade-in-up stagger-3">
            <div className="flex justify-between items-end mb-4">
              <span className="text-heading font-display gradient-text">
                {animatedPizzasSold.toLocaleString()}
              </span>
              <span className="text-caption">Goal: {goal.toLocaleString()} pizzas</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-warm"
                initial={{ width: 0 }}
                animate={{ width: `${animatedPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="text-center mt-3">
              <span className="text-subheading font-display">
                {animatedPercentage.toFixed(1)}% Funded
              </span>
            </div>
          </div>

          {/* Recent Supporters */}
          <section className="w-full max-w-md animate-fade-in-up stagger-4">
            <h3 className="text-subheading font-display mb-4">Recent Supporters</h3>
            <div className="card bg-secondary-cream">
              <div className="card-content max-h-48 overflow-y-auto">
                {funders.length > 0 ? (
                  <ul className="space-y-3">
                    {funders.map((funder, i) => (
                      <li key={i} className="text-body animate-fade-in-left" style={{ animationDelay: `${i * 0.1}s` }}>
                        <span className="font-semibold">{funder.name}</span> supported the campaign!
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-caption text-center py-8">Be the first to support us!</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Products and Cart Section */}
        <div className="lg:col-span-2 flex flex-col gap-8 order-1 lg:order-2">
          {/* Products */}
          <section className="animate-fade-in-up stagger-2">
            <h3 className="text-heading font-display mb-6">Choose Your Reward</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {products.map((product, index) => (
                <div key={product.id} className="animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                  <ProductCard 
                    product={product} 
                    onAddToCart={() => addToCart(product)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Cart */}
          <section className="animate-fade-in-up stagger-3">
            <h3 className="text-heading font-display mb-6">Your Cart</h3>
            <div className="card">
              <div className="card-content">
                {cart.length === 0 ? (
                  <p className="text-body text-center py-12 text-neutral-warm-gray">
                    Your cart is empty.
                  </p>
                ) : (
                  <ul className="space-y-4 mb-8">
                    {cart.map((item, i) => (
                      <li key={i} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="text-subheading font-display">{item.name}</span>
                          <p className="text-caption mt-1">{item.desc}</p>
                        </div>
                        <span className="text-subheading font-display gradient-text">
                          ${item.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                
                <div className="border-t pt-6 flex justify-between items-center mb-6">
                  <span className="text-heading font-display">Total:</span>
                  <span className="text-heading font-display gradient-text">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                
                <button 
                  onClick={handleCheckout} 
                  disabled={cart.length === 0 || isProcessing}
                  className={`btn w-full text-lg ${cart.length === 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                >
                  {isProcessing ? "Processing..." : "Checkout with Square"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};