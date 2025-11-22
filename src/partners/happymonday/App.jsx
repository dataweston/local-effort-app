import React, { useState, useEffect } from "react";
import { ShoppingCart, FileText, Plus, Minus, Send, ArrowLeft, Clock, MessageSquare, ClipboardList, DollarSign, CreditCard } from "lucide-react";
import { useSupabaseAuth } from "../../contexts/SupabaseAuthContext";
import { supabase } from "../../lib/supabaseClient";
import {
  getCurrentHappyMondayUser,
  getUserCredit,
  loadOrders,
  createOrder,
  updateOrderStatus,
  adjustCreditBalance,
} from "./supabaseClient";
import CostingWorksheet from "./CostingWorksheet.jsx";
import SquarePaymentButton from "./SquarePaymentButton.jsx";

const App = () => {
  // Items for sale
  const [items] = useState([
    { id: 1, name: "Egg Salad Sandwich", price: 5.1, category: "Sandwiches" },
    { id: 2, name: "Turkey Breast", price: 6.1, category: "Sandwiches" },
    { id: 3, name: "Roast Beef", price: 7.1, category: "Sandwiches" },
    { id: 4, name: "Pastrami", price: 7.1, category: "Sandwiches" },
    { id: 5, name: "Mortadella", price: 7.1, category: "Sandwiches" },
    { id: 6, name: "Vegetable", price: 6.1, category: "Sandwiches" },
    { id: 7, name: '12" Cheese', price: 7.1, category: "Pizza" },
    { id: 8, name: '4" Cheese', price: 3.6, category: "Pizza" },
    { id: 9, name: '12" Pepperoni', price: 8.1, category: "Pizza" },
    { id: 10, name: '12" Seasonal', price: 8.1, category: "Pizza" },
    { id: 11, name: '12" Gluten Free', price: 8.1, category: "Pizza" },
    { id: 12, name: "Beet Salad", price: 5.1, category: "Salads" },
    { id: 13, name: "Pasta Salad (gluten free)", price: 3.1, category: "Salads" },
    { id: 14, name: "Yogurt & Granola (gluten free)", price: 3.1, category: "Breakfast" },
    { id: 15, name: "Yogurt & Granola with chocolate (gluten free)", price: 4.1, category: "Breakfast" },
    { id: 16, name: "Chia Pudding", price: 3.1, category: "Breakfast" },
    { id: 17, name: "Chia Pudding (dairy free)", price: 4.1, category: "Breakfast" },
  ]);

  // Auth and user state
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const [hmUser, setHmUser] = useState(null);
  const [creditBalance, setCreditBalance] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Email/password sign in
  const signInWithEmail = async (e) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;

    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        alert(`Login failed: ${error.message}`);
      }
      // User will be set via the auth context
    } catch (err) {
      console.error('Sign in error:', err);
      alert('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  // Google OAuth sign in
  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    setSigningIn(true);
    try {
      const origin = window.location.origin;
      const redirectUrl = `${origin}/partners/happy-monday`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Sign in error:', error);
        alert('Failed to sign in with Google. Please try again.');
        setSigningIn(false);
      }
      // Don't reset signingIn here - page will redirect
    } catch (err) {
      console.error('Sign in error:', err);
      alert('Failed to sign in. Please try again.');
      setSigningIn(false);
    }
  };

  // State management
  const [currentView, setCurrentView] = useState("order");
  const [cart, setCart] = useState({});
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundRequest, setRefundRequest] = useState({ orderId: null, reason: "" });
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load user data and orders
  useEffect(() => {
    if (user?.email) {
      loadUserData();
    } else {
      setHmUser(null);
      setCreditBalance(null);
      setIsAdmin(false);
      setOrders([]);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      console.log('[HappyMonday] Loading user data for:', user.email);
      const userData = await getCurrentHappyMondayUser(user.email);
      console.log('[HappyMonday] User data received:', userData);

      if (!userData) {
        console.error("[HappyMonday] User not found in happymonday_users table. Email:", user.email);
        alert(`Your account (${user.email}) is not authorized for this portal. Please contact hello@localeffortfood.com`);
        await signOut();
        return;
      }

      setHmUser(userData);
      setIsAdmin(userData.role === 'admin');

      // Load credit balance
      const credit = await getUserCredit(userData.id);
      setCreditBalance(credit);

      // Load orders
      await loadOrdersData(userData.id, userData.role === 'admin');
    } catch (error) {
      console.error("Error loading user data:", error);
      alert("Error loading your data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersData = async (userId, isAdminUser = false) => {
    try {
      const loadedOrders = await loadOrders(userId, isAdminUser);
      setOrders(loadedOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  // Calculate total
  const calculateTotal = () => Object.entries(cart).reduce((total, [itemId, quantity]) => {
    const item = items.find((i) => i.id === parseInt(itemId));
    return total + (item ? item.price * quantity : 0);
  }, 0);

  const updateCart = (itemId, change) => {
    setCart((prev) => {
      const newCart = { ...prev };
      const currentQty = newCart[itemId] || 0;
      const newQty = Math.max(0, currentQty + change);
      if (newQty === 0) delete newCart[itemId];
      else newCart[itemId] = newQty;
      return newCart;
    });
  };

  const submitOrder = async () => {
    if (!orderConfirmed || Object.keys(cart).length === 0 || loading || !hmUser) return;
    setLoading(true);
    try {
      const totalCents = Math.round(calculateTotal() * 100);
      const orderNumber = `HM-${Date.now()}`;
      const orderDate = new Date().toISOString().split("T")[0];
      const isClientOrder = !isAdmin; // Client orders trigger email

      await createOrder({
        userId: hmUser.id,
        createdBy: hmUser.id,
        orderNumber,
        orderDate,
        items: cart,
        totalCents,
        notes,
        isClientOrder,
      });

      setCart({});
      setOrderConfirmed(false);
      setNotes("");

      // Reload data
      await loadUserData();

      if (isClientOrder) {
        alert("Order submitted successfully! An email has been sent to both you and Local Effort.");
      } else {
        alert("Order created successfully!");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Error submitting order. Please try again.");
    }
    setLoading(false);
  };

  const submitRefundRequest = async () => {
    if (!refundRequest.orderId || !refundRequest.reason.trim() || loading) return;
    setLoading(true);
    try {
      // Send email to admin about refund request
      await fetch('/api/happymonday/refund-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedInvoice.id,
          orderNumber: selectedInvoice.order_number,
          reason: refundRequest.reason,
          userEmail: hmUser.email,
        }),
      });
      alert(`Refund request submitted for order ${selectedInvoice.order_number || selectedInvoice.id}`);
      setRefundRequest({ orderId: null, reason: "" });
    } catch (error) {
      console.error("Error submitting refund request:", error);
      alert("Error submitting refund request. Please try again.");
    }
    setLoading(false);
  };

  const handleMarkAsPaid = async (orderId) => {
    if (!isAdmin || !confirm("Mark this order as paid?")) return;
    setLoading(true);
    try {
      await updateOrderStatus(orderId, 'paid');
      await loadOrdersData(hmUser.id, isAdmin);
      alert("Order marked as paid!");
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
    setLoading(false);
  };

  const getItemById = (id) => items.find((item) => item.id === id);
  const total = calculateTotal();
  const hasItems = Object.keys(cart).length > 0;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Local Effort ↔ Happy Monday</h1>
            <p className="text-slate-600">Trade Order System</p>
          </div>

          {/* Google Sign In for Admin */}
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4 ${
              signingIn
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or sign in with email</span>
            </div>
          </div>

          {/* Email/Password Sign In for Client */}
          <form onSubmit={signInWithEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={signingIn}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={signingIn}
              />
            </div>

            <button
              type="submit"
              disabled={signingIn || !email || !password}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                signingIn || !email || !password
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {signingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 text-center">
              Authorized users only. Contact <a href="mailto:hello@localeffortfood.com" className="text-blue-600 hover:underline">hello@localeffortfood.com</a> for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format balance for display
  const formatBalance = (cents) => {
    const dollars = Math.abs(cents || 0) / 100;
    return `$${dollars.toFixed(2)}`;
  };

  const balanceColor = (creditBalance?.balance_cents || 0) < 0 ? 'text-green-600' : 'text-red-600';
  const balanceLabel = (creditBalance?.balance_cents || 0) < 0 ? 'Credit Available' : 'Balance Due';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with balance and logout */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Local Effort ↔ Happy Monday</h1>
              <p className="text-slate-600">Trade Order System</p>
              <p className="text-sm text-slate-500 mt-1">Logged in as: {hmUser?.email} ({isAdmin ? 'Admin' : 'Client'})</p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Credit Balance Display */}
          {creditBalance && (
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border-2 border-blue-200">
              <div>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">{balanceLabel}</p>
                <p className={`text-3xl font-bold ${balanceColor}`}>
                  {formatBalance(creditBalance.balance_cents)}
                </p>
                {creditBalance.opening_credit_cents > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Opening credit: {formatBalance(creditBalance.opening_credit_cents)}
                  </p>
                )}
              </div>
              {!isAdmin && (creditBalance?.balance_cents || 0) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <CreditCard size={20} />
                  Make Payment
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg">
            <button onClick={() => setCurrentView("order")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "order" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
              <ShoppingCart size={20} /> New Order
            </button>
            <button onClick={() => setCurrentView("invoices")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "invoices" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
              <FileText size={20} /> Past Orders
            </button>
            <button onClick={() => setCurrentView("costing")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "costing" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
              <ClipboardList size={20} /> Costing
            </button>
          </div>
        </div>
        {currentView === "order" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Available Items</h2>
                <div className="grid gap-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <p className="text-sm text-slate-500">{item.category}</p>
                        <p className="text-lg font-bold text-blue-600">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateCart(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors" disabled={!cart[item.id]}>
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-medium">{cart[item.id] || 0}</span>
                        <button onClick={() => updateCart(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Order Summary</h2>
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Order Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                {hasItems ? (
                  <div className="space-y-2 mb-4">
                    {Object.entries(cart).map(([itemId, quantity]) => {
                      const item = getItemById(parseInt(itemId));
                      return (
                        <div key={itemId} className="flex justify-between text-sm">
                          <span>{item.name} × {quantity}</span>
                          <span>${(item.price * quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No items selected</p>
                )}
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mb-6">
                  <label htmlFor="hm-special-instructions" className="block text-sm font-medium text-slate-700 mb-2">Special Instructions</label>
                  <textarea id="hm-special-instructions" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows="3" placeholder="Any special requests or notes..." />
                </div>
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={orderConfirmed} onChange={(e) => setOrderConfirmed(e.target.checked)} className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">I confirm this order is correct</span>
                  </label>
                </div>
                <button onClick={submitOrder} disabled={!orderConfirmed || !hasItems || loading} className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${orderConfirmed && hasItems && !loading ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                  <Send size={20} />
                  {loading ? "Submitting..." : "Submit Order"}
                </button>
              </div>
            </div>
          </div>
        )}
        {currentView === "invoices" && !selectedInvoice && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Past Orders</h2>
            {orders.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} onClick={() => setSelectedInvoice(order)} className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 cursor-pointer transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-800">{order.order_number || order.id}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                        {isAdmin && order.user && (
                          <p className="text-xs text-slate-500 mt-1">Client: {order.user.email}</p>
                        )}
                        {order.notes && (
                          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                            <MessageSquare size={14} />{order.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">${(order.total_cents / 100).toFixed(2)}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "paid" ? "bg-green-100 text-green-800" :
                          order.status === "partial" ? "bg-yellow-100 text-yellow-800" :
                          order.status === "refunded" ? "bg-red-100 text-red-800" :
                          "bg-orange-100 text-orange-800"
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {currentView === "invoices" && selectedInvoice && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">Invoice {selectedInvoice.order_number || selectedInvoice.id}</h2>
              </div>
              {isAdmin && selectedInvoice.status !== 'paid' && (
                <button
                  onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  Mark as Paid
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Order Details</h3>
                <p className="text-sm text-slate-600">Date: {new Date(selectedInvoice.order_date).toLocaleDateString()}</p>
                <p className="text-sm text-slate-600">
                  Status: <span className={`font-medium ${
                    selectedInvoice.status === "paid" ? "text-green-600" :
                    selectedInvoice.status === "partial" ? "text-yellow-600" :
                    selectedInvoice.status === "refunded" ? "text-red-600" :
                    "text-orange-600"
                  }`}>
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                </p>
                {isAdmin && selectedInvoice.user && (
                  <p className="text-sm text-slate-600">Client: {selectedInvoice.user.email}</p>
                )}
                {selectedInvoice.notes && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600">Notes:</p>
                    <p className="text-sm text-slate-800">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-slate-800 mb-2">Total Amount</h3>
                <p className="text-3xl font-bold text-blue-600">${(selectedInvoice.total_cents / 100).toFixed(2)}</p>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">Items Ordered</h3>
              <div className="space-y-2">
                {Object.entries(selectedInvoice.items).map(([itemId, quantity]) => {
                  const item = getItemById(parseInt(itemId));
                  return (
                    <div key={itemId} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item ? item.name : `Item ${itemId}`}</p>
                        <p className="text-sm text-slate-600">Quantity: {quantity}</p>
                      </div>
                      <p className="font-medium">${item ? (item.price * quantity).toFixed(2) : "0.00"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t pt-6">
              <h3 className="font-semibold text-slate-800 mb-4">Request Refund or Credit</h3>
              <textarea value={refundRequest.orderId === selectedInvoice.id ? refundRequest.reason : ""} onChange={(e) => setRefundRequest({ orderId: selectedInvoice.id, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4" rows="3" placeholder="Please explain the reason for your refund or credit request..." />
              <button onClick={submitRefundRequest} disabled={!refundRequest.reason.trim() || refundRequest.orderId !== selectedInvoice.id || loading} className={`px-6 py-2 rounded-lg font-medium transition-all ${refundRequest.reason.trim() && refundRequest.orderId === selectedInvoice.id && !loading ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                {loading ? "Submitting..." : "Submit Refund Request"}
              </button>
            </div>
          </div>
        )}
        {currentView === "costing" && <CostingWorksheet items={items} />}

        {/* Square Payment Modal */}
        {showPaymentModal && hmUser && creditBalance && (
          <SquarePaymentButton
            userId={hmUser.id}
            currentBalance={creditBalance.balance_cents}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              loadUserData(); // Reload to update balance
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
