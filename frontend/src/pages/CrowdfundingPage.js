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

        <div className="lg:col-span-2 flex flex-col gap-8 order-1 lg:order-2">
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