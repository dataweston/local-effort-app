import React, { useState, useEffect, useRef } from 'react';
import * as anime from 'animejs';
import { useCountUp } from '../hooks/useCountUp';
import { fetchStatus, createCheckoutSession } from '../api/crowdfundService';
import { ProductCard } from '../components/common/ProductCard';
import { PizzaSVG } from '../components/crowdfunding/PizzaSVG';

export const CrowdfundingPage = () => {
  const [goal, setGoal] = useState(1000);
  const [pizzasSold, setPizzasSold] = useState(0);
  const [funders, setFunders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const heroRef = useRef(null);
  const rewardsRef = useRef(null);

  const products = [
    { id: 1, name: "Pizza Voucher", desc: 'One 12\" artisan pizza.', price: 20, type: 'pizza' },
    { id: 2, name: "Pie Voucher", desc: 'One 9\" seasonal pie.', price: 24, type: 'other' },
    { id: 3, name: "Supporter Pack", desc: "Sticker + thank-you mention.", price: 10, type: 'other' },
  ];

  const loadStatus = async () => {
    try {
      const data = await fetchStatus();
      setGoal(data.goal);
      setPizzasSold(data.pizzasSold);
      setFunders(data.funders.reverse());
    } catch {
      setError('Could not load data. Using mock data.');
      setGoal(1000);
      setPizzasSold(157);
      setFunders([{ name: 'Alex G.' }, { name: 'Jordan P.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            anime.default({
              targets: entry.target.querySelectorAll('.reveal'),
              opacity: [0, 1],
              translateY: [40, 0],
              easing: 'easeOutQuad',
              duration: 700,
              delay: anime.stagger(100),
            });
          }
        });
      },
      { threshold: 0.2 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    if (rewardsRef.current) observer.observe(rewardsRef.current);
    return () => observer.disconnect();
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const animatedPizzasSold = useCountUp(pizzasSold, 1500);
  const animatedPercentage = Math.min(100, (animatedPizzasSold / goal) * 100);

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
    }
  };

  if (isLoading) return <div className="text-center p-12">Loading...</div>;

  return (
    <div className="flex flex-col gap-20">
      {/* Hero: Pizza tracker */}
      <section ref={heroRef} className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-hero reveal">Our Goal: {goal} Pizzas</h1>
        <div className="mt-8 reveal">
          <PizzaSVG size={400} goal={goal} filled={animatedPizzasSold} />
        </div>
        <div className="mt-4 text-heading reveal">{animatedPizzasSold} Sold ({animatedPercentage.toFixed(1)}%)</div>
      </section>

      {/* Rewards */}
      <section ref={rewardsRef} className="max-w-5xl mx-auto px-4">
        <h2 className="text-heading mb-6 reveal">Choose Your Reward</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="reveal">
              <ProductCard product={product} onAddToCart={() => setCart([...cart, product])} />
            </div>
          ))}
        </div>
        <div className="mt-10 card reveal">
          <h3 className="text-heading mb-4">Your Cart</h3>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-200 mb-4">
              {cart.map((item, i) => (
                <li key={i} className="py-2 flex justify-between">
                  <span>{item.name}</span>
                  <span>${item.price}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={handleCheckout} disabled={!cart.length || isProcessing} className="btn btn-primary w-full">
            {isProcessing ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </section>
    </div>
  );
};
