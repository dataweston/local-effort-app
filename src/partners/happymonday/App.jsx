import React, { useState, useEffect } from "react";
import { ShoppingCart, FileText, Plus, Minus, Send, ArrowLeft, Clock, MessageSquare, ClipboardList } from "lucide-react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import CostingWorksheet from "./CostingWorksheet.jsx";

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

  // State management
  const [currentView, setCurrentView] = useState("order");
  const [cart, setCart] = useState({});
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundRequest, setRefundRequest] = useState({ orderId: null, reason: "" });
  const [loading, setLoading] = useState(false);

  // Load orders from Firebase
  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const loadedOrders = [];
      querySnapshot.forEach((d) => { loadedOrders.push({ id: d.id, firestoreId: d.id, ...d.data() }); });
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
    if (!orderConfirmed || Object.keys(cart).length === 0 || loading || !db) return;
    setLoading(true);
    try {
      const orderData = {
        date: new Date().toISOString().split("T")[0],
        items: { ...cart },
        total: calculateTotal(),
        notes,
        status: "unpaid",
        createdAt: new Date(),
        orderNumber: `ORD-${Date.now()}`,
      };
      await addDoc(collection(db, "orders"), orderData);
      setCart({}); setOrderConfirmed(false); setNotes("");
      await loadOrders();
      alert("Order submitted successfully!");
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Error submitting order. Please try again.");
    }
    setLoading(false);
  };

  const submitRefundRequest = async () => {
    if (!refundRequest.orderId || !refundRequest.reason.trim() || loading || !db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "refundRequests"), {
        orderId: refundRequest.orderId,
        reason: refundRequest.reason,
        createdAt: new Date(),
        status: "pending",
      });
      alert(`Refund request submitted for order ${selectedInvoice.orderNumber || selectedInvoice.id}`);
      setRefundRequest({ orderId: null, reason: "" });
    } catch (error) {
      console.error("Error submitting refund request:", error);
      alert("Error submitting refund request. Please try again.");
    }
    setLoading(false);
  };

  const getItemById = (id) => items.find((item) => item.id === id);
  const total = calculateTotal();
  const hasItems = Object.keys(cart).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Local Effort ↔ Happy Monday</h1>
          <p className="text-slate-600">Trade Order System</p>
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
                        <h3 className="font-semibold text-slate-800">{order.orderNumber || order.id}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1"><Clock size={14} />{new Date(order.date).toLocaleDateString()}</p>
                        {order.notes && (<p className="text-sm text-slate-600 mt-1 flex items-center gap-1"><MessageSquare size={14} />{order.notes}</p>)}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">${order.total.toFixed(2)}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${order.status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>{order.status.toUpperCase()}</span>
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
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold text-slate-800">Invoice {selectedInvoice.orderNumber || selectedInvoice.id}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Order Details</h3>
                <p className="text-sm text-slate-600">Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                <p className="text-sm text-slate-600">Status: <span className={`font-medium ${selectedInvoice.status === "paid" ? "text-green-600" : "text-orange-600"}`}>{selectedInvoice.status.toUpperCase()}</span></p>
                {selectedInvoice.notes && (<div className="mt-2"><p className="text-sm text-slate-600">Notes:</p><p className="text-sm text-slate-800">{selectedInvoice.notes}</p></div>)}
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-slate-800 mb-2">Total Amount</h3>
                <p className="text-3xl font-bold text-blue-600">${selectedInvoice.total.toFixed(2)}</p>
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
      </div>
    </div>
  );
};

export default App;
