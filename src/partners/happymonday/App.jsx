import React, { useState, useEffect, useMemo } from "react";
import { ShoppingCart, FileText, Plus, Minus, Send, ArrowLeft, Clock, MessageSquare, ClipboardList, CreditCard, BarChart2, Download, Filter, Search, Printer, Mail, Settings, Package, RefreshCw } from "lucide-react";
import { useSupabaseAuth } from "../../contexts/SupabaseAuthContext";
import { supabase } from "../../lib/supabaseClient";
import {
  getCurrentHappyMondayUser,
  getClientUserId,
  getUserCredit,
  loadOrders,
  createOrder,
  updateOrder,
} from "./supabaseClient";
import CostingWorksheet from "./CostingWorksheet.jsx";
import SquarePaymentButton from "./SquarePaymentButton.jsx";
import IntegrationsSettings from "./IntegrationsSettings.jsx";

// Helper function to format dates correctly without timezone conversion
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};

const createDefaultReportFilters = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    status: 'all',
    category: 'all',
    searchText: '',
  };
};

const toDateOnly = (value) => {
  if (!value) return null;
  const parts = value.split('T')[0].split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const escapeHtml = (value = '') =>
  value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
    { id: 9, name: '4" Pepperoni', price: 3.6, category: "Pizza" },
    { id: 10, name: '12" Pepperoni', price: 8.1, category: "Pizza" },
    { id: 11, name: '12" Seasonal', price: 8.1, category: "Pizza" },
    { id: 12, name: '12" Supreme', price: 8.1, category: "Pizza" },
    { id: 13, name: '12" Gluten Free', price: 8.1, category: "Pizza" },
    { id: 14, name: "Beet Salad", price: 5.1, category: "Salads" },
    { id: 15, name: "Pasta Salad (gluten free)", price: 3.1, category: "Salads" },
    { id: 16, name: "Yogurt & Granola (gluten free)", price: 3.1, category: "Breakfast" },
    { id: 17, name: "Yogurt & Granola with chocolate (gluten free)", price: 4.1, category: "Breakfast" },
    { id: 18, name: "Chia Pudding", price: 3.1, category: "Breakfast" },
    { id: 19, name: "Chia Pudding (dairy free)", price: 4.1, category: "Breakfast" },
  ]);

  // Auth and user state
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const [hmUser, setHmUser] = useState(null);
  const [clientUserId, setClientUserId] = useState(null); // Always the client ID
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
      const { error } = await supabase.auth.signInWithPassword({
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
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [orders, setOrders] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundRequest, setRefundRequest] = useState({ orderId: null, reason: "" });
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editCart, setEditCart] = useState({});
  const [editNotes, setEditNotes] = useState("");
  const [editOrderDate, setEditOrderDate] = useState("");
  const [reportFilters, setReportFilters] = useState(() => createDefaultReportFilters());
  const [reportSending, setReportSending] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncingQuickBooks, setSyncingQuickBooks] = useState(false);

  const getQuickBooksSyncStatus = (invoice) => {
    if (!invoice) return 'not_sent';
    if (invoice.qb_sync_status) return invoice.qb_sync_status;
    if (invoice.qb_invoice_id) return 'sent';
    return 'not_sent';
  };

  const getQuickBooksStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return { label: 'Sent', className: 'bg-green-100 text-green-700' };
      case 'error':
        return { label: 'Error', className: 'bg-red-100 text-red-700' };
      default:
        return { label: 'Not sent', className: 'bg-slate-100 text-slate-700' };
    }
  };

  // Sync inventory to Square
  const handleSyncInventory = async (orderId) => {
    if (!confirm("Sync this order to Square inventory? This will INCREASE inventory counts for the mapped items.")) return;
    setSyncingInventory(true);
    try {
      const res = await fetch('/api/happymonday/sync-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          triggeredBy: hmUser?.id 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let message = `✅ Inventory synced for order ${data.orderNumber}\n\nItems synced: ${data.changesApplied}`;
        if (data.itemsSkipped?.length > 0) {
          message += `\n\nSkipped items:\n${data.itemsSkipped.map(s => `• ${s.item_name}: ${s.reason}`).join('\n')}`;
        }
        alert(message);
        const refreshedOrders = await loadOrdersData();
        if (selectedInvoice?.id === orderId) {
          const updated = refreshedOrders.find(o => o.id === orderId);
          if (updated) setSelectedInvoice(updated);
        }
      } else {
        alert('Error syncing inventory: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Sync inventory error:', err);
      alert('Error syncing inventory');
    } finally {
      setSyncingInventory(false);
    }
  };

  const handleSendToQuickBooks = async (orderId) => {
    if (!isAdmin || !orderId || syncingQuickBooks) return;
    if (!confirm("Send this invoice to QuickBooks? This creates a bookkeeping-only copy for the client's records.")) return;
    setSyncingQuickBooks(true);
    try {
      const res = await fetch('/api/happymonday/quickbooks-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        const invoiceSuffix = data.invoiceId ? ` (ID ${data.invoiceId})` : '';
        alert(`QuickBooks invoice created for ${data.orderNumber || 'this order'}${invoiceSuffix}.`);
      } else {
        alert('Error sending to QuickBooks: ' + (data.message || data.error || 'Unknown error'));
      }

      const refreshedOrders = await loadOrdersData();
      if (selectedInvoice?.id === orderId) {
        const updated = refreshedOrders.find(o => o.id === orderId);
        if (updated) setSelectedInvoice(updated);
      }
    } catch (err) {
      console.error('QuickBooks sync error:', err);
      alert('Error sending to QuickBooks');
    } finally {
      setSyncingQuickBooks(false);
    }
  };

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

      // Always get the client's user ID (for payments and credit)
      const clientId = await getClientUserId();
      setClientUserId(clientId);

      // Load credit balance (admin sees client's balance)
      const credit = await getUserCredit(userData.id, userData.role, userData.email);
      setCreditBalance(credit);

      // Load orders (both users see all orders)
      await loadOrdersData();
    } catch (error) {
      console.error("Error loading user data:", error);
      alert("Error loading your data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersData = async () => {
    try {
      const loadedOrders = await loadOrders();
      setOrders(loadedOrders);
      return loadedOrders || [];
    } catch (error) {
      console.error("Error loading orders:", error);
    }
    return [];
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
      const newQty = currentQty + change;
      // Allow negative quantities for credits (both admin and customer)
      if (newQty === 0) delete newCart[itemId];
      else newCart[itemId] = newQty;
      return newCart;
    });
  };

  const updateEditCart = (itemId, change) => {
    setEditCart((prev) => {
      const newCart = { ...prev };
      const currentQty = newCart[itemId] || 0;
      const newQty = currentQty + change;
      // Allow negative quantities for credits
      if (newQty === 0) delete newCart[itemId];
      else newCart[itemId] = newQty;
      return newCart;
    });
  };

  const calculateEditTotal = () => Object.entries(editCart).reduce((total, [itemId, quantity]) => {
    const item = items.find((i) => i.id === parseInt(itemId));
    return total + (item ? item.price * quantity : 0);
  }, 0);

  const startEditingInvoice = () => {
    if (!selectedInvoice) return;
    setEditCart({ ...selectedInvoice.items });
    setEditNotes(selectedInvoice.notes || "");
    // Normalize date to YYYY-MM-DD format for date input
    const dateOnly = selectedInvoice.order_date.split('T')[0];
    setEditOrderDate(dateOnly);
    setIsEditingInvoice(true);
  };

  const cancelEditingInvoice = () => {
    setIsEditingInvoice(false);
    setEditCart({});
    setEditNotes("");
    setEditOrderDate("");
  };

  const saveInvoiceEdits = async () => {
    if (!selectedInvoice || !hmUser || loading) return;
    setLoading(true);
    try {
      const totalCents = Math.round(calculateEditTotal() * 100);

      await updateOrder(selectedInvoice.id, {
        items: editCart,
        totalCents,
        notes: editNotes,
        orderDate: editOrderDate,
        editedBy: hmUser.id,
      });

      // Reload data
      await loadOrdersData();
      await loadUserData();

      // Update selected invoice
      const updatedOrders = await loadOrders();
      const updatedInvoice = updatedOrders.find(o => o.id === selectedInvoice.id);
      if (updatedInvoice) {
        setSelectedInvoice(updatedInvoice);
      }

      setIsEditingInvoice(false);
      alert("Invoice updated successfully!");
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert(`Error updating invoice: ${error.message}`);
    }
    setLoading(false);
  };

  const submitOrder = async () => {
    if (!orderConfirmed || Object.keys(cart).length === 0 || loading || !hmUser) return;
    setLoading(true);
    try {
      const totalCents = Math.round(calculateTotal() * 100);
      const orderNumber = `HM-${Date.now()}`;
      const isClientOrder = !isAdmin; // Client orders trigger email

      await createOrder({
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
      setOrderDate(new Date().toISOString().split("T")[0]);

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
    if (!isAdmin || !confirm("Mark this order as paid? This will apply any available credits and close the invoice.")) return;
    setLoading(true);
    try {
      // Call the database function that handles credit application
      const { data, error } = await supabase.rpc('mark_happymonday_order_paid', {
        p_order_id: orderId,
        p_processed_by: hmUser.id
      });

      if (error) throw error;

      await loadUserData();
      
      // Show summary of what happened
      const summary = data;
      let message = "Order marked as paid!\n\n";
      if (summary.credit_used > 0) {
        message += `Credit applied: $${(summary.credit_used / 100).toFixed(2)}\n`;
        message += `New credit balance: $${Math.abs(summary.new_credit_balance / 100).toFixed(2)}\n`;
        if (summary.amount_remaining > 0) {
          message += `\nRemaining amount due: $${(summary.amount_remaining / 100).toFixed(2)}`;
        }
      }
      alert(message);
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
    setLoading(false);
  };

  const handlePrintInvoice = (invoice) => {
    // Generate print-friendly HTML
    const itemsHtml = Object.entries(invoice.items).map(([itemId, quantity]) => {
      const item = getItemById(parseInt(itemId));
      const itemPrice = item ? item.price * quantity : 0;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item ? item.name : `Item ${itemId}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item ? item.price.toFixed(2) : '0.00'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${itemPrice.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.order_number || invoice.id}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1e293b;
            }
            .header {
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #1e293b;
              font-size: 28px;
            }
            .header p {
              margin: 0;
              color: #64748b;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .details-section {
              flex: 1;
            }
            .details-section h3 {
              font-size: 14px;
              text-transform: uppercase;
              color: #64748b;
              margin: 0 0 10px 0;
              font-weight: 600;
            }
            .details-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-unpaid { background: #fed7aa; color: #92400e; }
            .status-partial { background: #fef3c7; color: #92400e; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #f1f5f9;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              color: #475569;
            }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) {
              text-align: right;
            }
            .total-row {
              background: #f8fafc;
              font-weight: 700;
              font-size: 18px;
            }
            .total-row td {
              padding: 16px 12px;
              border-top: 2px solid #3b82f6;
            }
            .notes {
              background: #f8fafc;
              padding: 16px;
              border-radius: 8px;
              margin-top: 30px;
            }
            .notes h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
              text-transform: uppercase;
              color: #64748b;
            }
            .notes p {
              margin: 0;
              font-size: 14px;
              line-height: 1.6;
            }
            .print-button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              margin-bottom: 20px;
            }
            .print-button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Print Invoice</button>
          
          <div class="header">
            <h1>Local Effort Food</h1>
            <p>Happy Monday Partnership Invoice</p>
          </div>

          <div class="invoice-details">
            <div class="details-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${invoice.order_number || invoice.id}</p>
              <p><strong>Date:</strong> ${formatDate(invoice.order_date)}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
            </div>
            ${invoice.user ? `
              <div class="details-section">
                <h3>Bill To</h3>
                <p><strong>Happy Monday</strong></p>
                <p>${invoice.user.email}</p>
              </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total Amount:</td>
                <td style="text-align: right; color: #3b82f6;">$${(invoice.total_cents / 100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${invoice.notes ? `
            <div class="notes">
              <h3>Notes</h3>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getItemById = (id) => items.find((item) => item.id === id);

  const categoryOptions = useMemo(() => {
    const unique = new Set(items.map((item) => item.category));
    return Array.from(unique).sort();
  }, [items]);

  const reportData = useMemo(() => {
    if (!orders?.length) {
      return {
        detailedRows: [],
        itemSummary: [],
        totals: { revenue: 0, quantity: 0, pizzaQuantity: 0, pizzaRevenue: 0, creditIssued: 0 },
        filteredOrdersCount: 0,
      };
    }

    const startDate = reportFilters.startDate ? toDateOnly(reportFilters.startDate) : null;
    const endDate = reportFilters.endDate ? toDateOnly(reportFilters.endDate) : null;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }
    const searchTerm = reportFilters.searchText.trim().toLowerCase();

    const filteredOrders = orders.filter((order) => {
      const orderDateObj = order.order_date ? toDateOnly(order.order_date) : null;
      if (startDate && orderDateObj && orderDateObj < startDate) return false;
      if (endDate && orderDateObj && orderDateObj > endDate) return false;
      if (reportFilters.status !== 'all' && order.status !== reportFilters.status) return false;
      return true;
    });

    const detailedRows = [];

    filteredOrders.forEach((order) => {
      if (!order?.items) return;
      Object.entries(order.items).forEach(([itemId, qty]) => {
        const numericQty = Number(qty) || 0;
        if (numericQty === 0) return;

        const catalogItem = getItemById(parseInt(itemId, 10));
        const category = catalogItem?.category || 'Other';
        const name = catalogItem?.name || `Item ${itemId}`;
        const unitPrice = catalogItem?.price ?? 0;
        const total = unitPrice * numericQty;

        const matchesCategory = reportFilters.category === 'all' || category === reportFilters.category;
        const matchesSearch = !searchTerm || [name, category, order.order_number, order.notes]
          .some((field) => field?.toLowerCase().includes(searchTerm));

        if (!matchesCategory || !matchesSearch) return;

        detailedRows.push({
          orderId: order.id,
          orderNumber: order.order_number || order.id,
          date: order.order_date,
          status: order.status,
          notes: order.notes,
          itemId: parseInt(itemId, 10),
          name,
          category,
          quantity: numericQty,
          unitPrice,
          total,
        });
      });
    });

    const itemSummaryMap = new Map();
    detailedRows.forEach((row) => {
      if (!itemSummaryMap.has(row.name)) {
        itemSummaryMap.set(row.name, {
          name: row.name,
          category: row.category,
          quantity: 0,
          total: 0,
          orderNumbers: new Set(),
        });
      }
      const summary = itemSummaryMap.get(row.name);
      summary.quantity += row.quantity;
      summary.total += row.total;
      summary.orderNumbers.add(row.orderNumber);
    });

    const itemSummary = Array.from(itemSummaryMap.values())
      .map((entry) => ({
        name: entry.name,
        category: entry.category,
        quantity: entry.quantity,
        total: entry.total,
        orderCount: entry.orderNumbers.size,
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const totals = detailedRows.reduce((acc, row) => {
      acc.revenue += row.total;
      acc.quantity += row.quantity;
      if (row.category === 'Pizza') {
        acc.pizzaQuantity += row.quantity;
        acc.pizzaRevenue += row.total;
      }
      if (row.total < 0) {
        acc.creditIssued += row.total;
      }
      return acc;
    }, { revenue: 0, quantity: 0, pizzaQuantity: 0, pizzaRevenue: 0, creditIssued: 0 });

    return {
      detailedRows,
      itemSummary,
      totals,
      filteredOrdersCount: filteredOrders.length,
    };
  }, [orders, reportFilters, items]);

  const statusOptions = ['all', 'unpaid', 'partial', 'paid', 'refunded'];

  const total = calculateTotal();
  const hasItems = Object.keys(cart).length > 0;

  const updateReportFilter = (field, value) => {
    setReportFilters((prev) => ({ ...prev, [field]: value }));
  };

  const setLastNDays = (days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    setReportFilters((prev) => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }));
  };

  const setThisWeekRange = () => {
    const today = new Date();
    const start = new Date(today);
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(today.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setReportFilters((prev) => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }));
  };

  const formatCurrencyValue = (value) => {
    const prefix = value < 0 ? '-' : '';
    return `${prefix}$${Math.abs(value).toFixed(2)}`;
  };

  const buildReportRangeLabel = () => {
    if (reportFilters.startDate && reportFilters.endDate) {
      return `${formatDate(reportFilters.startDate)} – ${formatDate(reportFilters.endDate)}`;
    }
    if (reportFilters.startDate) {
      return `From ${formatDate(reportFilters.startDate)}`;
    }
    if (reportFilters.endDate) {
      return `Through ${formatDate(reportFilters.endDate)}`;
    }
    return 'All Dates';
  };

  const downloadReportCsv = () => {
    if (!reportData.detailedRows.length) {
      alert('No data to export for the selected filters.');
      return;
    }

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '""';
      const str = value.toString().replace(/"/g, '""');
      return `"${str}"`;
    };

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const header = ['Order #', 'Date', 'Status', 'Item', 'Category', 'Quantity', 'Unit Price', 'Line Total', 'Notes'];
    const rows = reportData.detailedRows.map((row) => [
      row.orderNumber,
      row.date ? row.date.split('T')[0] : '',
      row.status,
      row.name,
      row.category,
      row.quantity,
      row.unitPrice.toFixed(2),
      row.total.toFixed(2),
      row.notes || '',
    ].map(escapeCsv).join(','));

    const csvContent = [header.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const startLabel = reportFilters.startDate || 'start';
    const endLabel = reportFilters.endDate || 'end';
    const filename = `happy-monday-report-${startLabel}-to-${endLabel}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generateReportDocumentHtml = ({ includePrintButton = false } = {}) => {
    const rangeLabel = buildReportRangeLabel();
    const statusLabel = reportFilters.status === 'all' ? 'All statuses' : reportFilters.status.toUpperCase();
    const categoryLabel = reportFilters.category === 'all' ? 'All categories' : reportFilters.category;
    const searchLabel = reportFilters.searchText ? escapeHtml(reportFilters.searchText) : '—';
    const requestedBy = escapeHtml(hmUser?.email || 'Happy Monday user');
    const generatedAt = escapeHtml(new Date().toLocaleString());

    const summaryRows = reportData.itemSummary.length
      ? reportData.itemSummary.map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td style="text-align:right;">${item.quantity}</td>
          <td style="text-align:right;">${formatCurrencyValue(item.total)}</td>
          <td style="text-align:right;">${item.orderCount}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:16px;">No items match the selected filters.</td></tr>';

    const lineRows = reportData.detailedRows.length
      ? reportData.detailedRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.orderNumber)}</td>
          <td>${escapeHtml(formatDate(row.date))}</td>
          <td>${escapeHtml(row.status.toUpperCase())}</td>
          <td>
            <div style="font-weight:600; color:#0f172a;">${escapeHtml(row.name)}</div>
            <div style="font-size:12px; color:#64748b;">${escapeHtml(row.category)}</div>
            ${row.notes ? `<div style="margin-top:4px; font-size:11px; color:#94a3b8;">${escapeHtml(row.notes)}</div>` : ''}
          </td>
          <td style="text-align:right; ${row.quantity < 0 ? 'color:#dc2626;' : ''}">${row.quantity}</td>
          <td style="text-align:right;">${formatCurrencyValue(row.unitPrice)}</td>
          <td style="text-align:right; ${row.total < 0 ? 'color:#dc2626;' : 'color:#0f172a;'}">${formatCurrencyValue(row.total)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:16px;">No line items match the selected filters.</td></tr>';

    const printButton = includePrintButton ? `
      <button class="print-button" onclick="window.print()">🖨️ Save / Print</button>
    ` : '';

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Happy Monday Report</title>
    <style>
      @media print {
        body { margin: 0; }
        .print-button { display: none; }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
        background: #f1f5f9;
        color: #0f172a;
      }
      .card {
        background: #ffffff;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
      }
      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 24px;
        margin-bottom: 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 32px;
        color: #0f172a;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .meta-tile {
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #e2e8f0;
      }
      .meta-tile span {
        display: block;
        font-size: 12px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #64748b;
      }
      .meta-tile strong {
        display: block;
        margin-top: 6px;
        font-size: 16px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 32px;
      }
      thead {
        background: #eff6ff;
        color: #1d4ed8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      th, td {
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      th {
        text-align: left;
      }
      tbody tr:last-child td {
        border-bottom: none;
      }
      .summary-callout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }
      .summary-callout .tile {
        border-radius: 16px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .summary-callout .tile h3 {
        margin: 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
      }
      .summary-callout .tile p {
        margin: 8px 0 0;
        font-size: 24px;
        font-weight: 700;
      }
      .print-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 20px;
      }
      .print-button:hover {
        background: #2563eb;
      }
    </style>
  </head>
  <body>
    ${printButton}
    <div class="card">
      <div class="header">
        <h1>Local Effort ↔ Happy Monday</h1>
        <p style="margin:8px 0 0; color:#475569;">Custom invoice-style report</p>
      </div>

      <div class="meta-grid">
        <div class="meta-tile">
          <span>Date Range</span>
          <strong>${escapeHtml(rangeLabel)}</strong>
        </div>
        <div class="meta-tile">
          <span>Status</span>
          <strong>${escapeHtml(statusLabel)}</strong>
        </div>
        <div class="meta-tile">
          <span>Category</span>
          <strong>${escapeHtml(categoryLabel)}</strong>
        </div>
        <div class="meta-tile">
          <span>Search</span>
          <strong>${searchLabel}</strong>
        </div>
      </div>

      <div class="meta-grid" style="margin-top:0;">
        <div class="meta-tile">
          <span>Requested By</span>
          <strong>${requestedBy}</strong>
        </div>
        <div class="meta-tile">
          <span>Generated</span>
          <strong>${generatedAt}</strong>
        </div>
        <div class="meta-tile">
          <span>Invoices Matched</span>
          <strong>${reportData.filteredOrdersCount}</strong>
        </div>
        <div class="meta-tile">
          <span>Line Items</span>
          <strong>${reportData.detailedRows.length}</strong>
        </div>
      </div>

      <div class="summary-callout">
        <div class="tile">
          <h3>Net Sales</h3>
          <p>${formatCurrencyValue(reportData.totals.revenue)}</p>
        </div>
        <div class="tile">
          <h3>Units Moved</h3>
          <p>${reportData.totals.quantity}</p>
        </div>
        <div class="tile">
          <h3>Pizza Sales</h3>
          <p>${formatCurrencyValue(reportData.totals.pizzaRevenue)}</p>
          <span style="font-size:12px; color:#64748b;">Units: ${reportData.totals.pizzaQuantity}</span>
        </div>
        <div class="tile">
          <h3>Credits / Adjustments</h3>
          <p style="color:#dc2626;">${formatCurrencyValue(reportData.totals.creditIssued)}</p>
        </div>
      </div>

      <h2 style="margin-bottom:12px;">Item Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th style="text-align:right;">Quantity</th>
            <th style="text-align:right;">Net</th>
            <th style="text-align:right;">Invoices</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>

      <h2 style="margin-bottom:12px;">Line Items</h2>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Status</th>
            <th>Item</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows}
        </tbody>
      </table>
    </div>
  </body>
</html>`;
  };

  const openReportPdfPreview = () => {
    if (!reportData.detailedRows.length) {
      alert('Add at least one line item by adjusting the filters before exporting.');
      return;
    }
    if (typeof window === 'undefined') return;
    const html = generateReportDocumentHtml({ includePrintButton: true });
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Your browser blocked the PDF preview. Please allow pop-ups for this site.');
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
  };

  const emailReport = async () => {
    if (!reportData.detailedRows.length || reportSending) {
      if (!reportData.detailedRows.length) {
        alert('No data to send. Try widening your filters first.');
      }
      return;
    }
    setReportSending(true);
    try {
      const htmlContent = generateReportDocumentHtml();
      const response = await fetch('/api/happymonday/send-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent,
          filters: reportFilters,
          totals: reportData.totals,
          lineItemCount: reportData.detailedRows.length,
          invoiceCount: reportData.filteredOrdersCount,
          requestedBy: hmUser?.email || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send report email.');
      }

      alert('Report emailed to both partners. Check your inbox in a moment.');
    } catch (error) {
      console.error('[HappyMonday] Error emailing report:', error);
      alert(error.message || 'Failed to email report.');
    } finally {
      setReportSending(false);
    }
  };

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

  const openInvoicesCents = creditBalance?.open_invoice_total_cents ?? orders.filter(o => o.status === 'unpaid' || o.status === 'partial').reduce((sum, o) => sum + o.total_cents, 0);
  const closedInvoicesCents = creditBalance?.closed_invoice_total_cents ?? orders.filter(o => o.status === 'paid' || o.status === 'refunded').reduce((sum, o) => sum + o.total_cents, 0);
  const openInvoiceCount = creditBalance?.open_invoice_count ?? orders.filter(o => o.status === 'unpaid' || o.status === 'partial').length;
  const closedInvoiceCount = creditBalance?.closed_invoice_count ?? orders.filter(o => o.status === 'paid' || o.status === 'refunded').length;
  const balanceDriftCents = creditBalance?.balance_drift_cents ?? 0;
  const netAfterOpenCents = (openInvoicesCents || 0) + (creditBalance?.balance_cents || 0);

  const balanceColor = (creditBalance?.balance_cents || 0) < 0 ? 'text-green-600' : 'text-red-600';
  const balanceLabel = (creditBalance?.balance_cents || 0) < 0 ? 'Credit Available' : 'Balance Due';
  const quickBooksSyncStatus = getQuickBooksSyncStatus(selectedInvoice);
  const quickBooksBadge = getQuickBooksStatusBadge(quickBooksSyncStatus);

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
                {Math.abs(balanceDriftCents) > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Stored balance was off by {formatBalance(balanceDriftCents)}; auto-synced to the canonical ledger.
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
            <button onClick={() => setCurrentView("reports")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "reports" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
              <BarChart2 size={20} /> Reports
            </button>
            {/* Hide costing for hello@happymonday.company */}
            {hmUser?.email !== 'hello@happymonday.company' && (
              <button onClick={() => setCurrentView("costing")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "costing" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
                <ClipboardList size={20} /> Costing
              </button>
            )}
            {/* Settings/Integrations - visible to hello@happymonday.company */}
            {hmUser?.email === 'hello@happymonday.company' && (
              <button onClick={() => setCurrentView("settings")} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${currentView === "settings" ? "bg-blue-500 text-white shadow-md" : "text-slate-600 hover:text-blue-500"}`}>
                <Settings size={20} /> Settings
              </button>
            )}
          </div>
        </div>
        {currentView === "order" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Available Items</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Use negative quantities to receive credit. For example, -3 sandwiches gives you $15.30 credit
                    instead of charging you. This is useful for returns, credits, or promotional adjustments.
                  </p>
                </div>
                <div className="grid gap-4">
                  {items.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{item.name}</h3>
                          <p className="text-sm text-slate-500">{item.category}</p>
                          <p className="text-lg font-bold text-blue-600">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateCart(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors">
                            <Minus size={16} />
                          </button>
                          <span className={`w-12 text-center font-medium ${qty < 0 ? 'text-red-600' : ''}`}>{qty}</span>
                          <button onClick={() => updateCart(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Order Summary</h2>
                <div className="mb-4">
                  <label htmlFor="hm-order-date" className="block text-sm font-medium text-slate-700 mb-2">Order Date</label>
                  <input 
                    id="hm-order-date"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {hasItems ? (
                  <div className="space-y-2 mb-4">
                    {Object.entries(cart).map(([itemId, quantity]) => {
                      const item = getItemById(parseInt(itemId));
                      const lineTotal = item.price * quantity;
                      return (
                        <div key={itemId} className="flex justify-between text-sm">
                          <span className={quantity < 0 ? 'text-red-600' : ''}>
                            {item.name} × {quantity}
                          </span>
                          <span className={lineTotal < 0 ? 'text-red-600' : ''}>
                            ${lineTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No items selected</p>
                )}
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xl font-bold">Total:</span>
                      {total < 0 && (
                        <p className="text-xs text-red-600 mt-1">Credit amount</p>
                      )}
                    </div>
                    <span className={`text-xl font-bold ${total < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      ${total.toFixed(2)}
                    </span>
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
            
            {/* Admin Summary */}
            {isAdmin && orders.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Summary</h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">Closed Invoices</p>
                    <p className="text-3xl font-bold text-slate-800">
                      ${(closedInvoicesCents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {closedInvoiceCount} closed invoices
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">Total Open Invoices</p>
                    <p className="text-3xl font-bold text-orange-600">
                      ${(openInvoicesCents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {openInvoiceCount} unpaid/partial
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">Client Standing Credit</p>
                    <p className={`text-3xl font-bold ${(creditBalance?.balance_cents || 0) < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                      ${Math.abs((creditBalance?.balance_cents || 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(creditBalance?.balance_cents || 0) < 0 ? 'Credit available' : 'No credit'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-1">Net After Credit</p>
                    <p className={`text-3xl font-bold ${netAfterOpenCents < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                      ${(netAfterOpenCents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {netAfterOpenCents < 0 ? 'Credit remains after open invoices' : 'Amount owed after applying credit'}
                    </p>
                  </div>
                </div>
                {Math.abs(balanceDriftCents) > 0 && (
                  <p className="text-xs text-amber-700 mt-4">
                    Stored balance differed from canonical ledger by {formatBalance(balanceDriftCents)}; numbers above use the canonical calculation.
                  </p>
                )}
              </div>
            )}
            
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
                          {formatDate(order.order_date)}
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
                <button onClick={() => { setSelectedInvoice(null); setIsEditingInvoice(false); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">
                  {isEditingInvoice ? "Edit Invoice" : "Invoice"} {selectedInvoice.order_number || selectedInvoice.id}
                </h2>
                {selectedInvoice.inventory_sync_status === 'synced' && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    <Package size={12} /> Synced to Square
                  </span>
                )}
                {isAdmin && (
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${quickBooksBadge.className}`}>
                    <FileText size={12} /> {quickBooksBadge.label}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditingInvoice && (
                  <>
                    <button
                      onClick={() => handlePrintInvoice(selectedInvoice)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <FileText size={18} />
                      Print
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleSendToQuickBooks(selectedInvoice.id)}
                        disabled={syncingQuickBooks || quickBooksSyncStatus === 'sent'}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          quickBooksSyncStatus === 'sent'
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        } ${syncingQuickBooks ? 'opacity-50' : ''}`}
                      >
                        {syncingQuickBooks ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                        Send to QuickBooks
                      </button>
                    )}
                    {/* Sync to Square button - only for admin and not already synced */}
                    {isAdmin && selectedInvoice.inventory_sync_status !== 'synced' && (
                      <button
                        onClick={() => handleSyncInventory(selectedInvoice.id)}
                        disabled={syncingInventory}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {syncingInventory ? <RefreshCw size={18} className="animate-spin" /> : <Package size={18} />}
                        Sync to Square
                      </button>
                    )}
                    {isAdmin && selectedInvoice.status === 'unpaid' && !selectedInvoice.is_closed && (
                      <button
                        onClick={startEditingInvoice}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Edit Invoice
                      </button>
                    )}
                    {isAdmin && selectedInvoice.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </>
                )}
                {isEditingInvoice && (
                  <>
                    <button
                      onClick={cancelEditingInvoice}
                      className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg font-medium transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveInvoiceEdits}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                      disabled={loading || Object.keys(editCart).length === 0}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {!isEditingInvoice ? (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Order Details</h3>
                    <p className="text-sm text-slate-600">Date: {formatDate(selectedInvoice.order_date)}</p>
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
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Edit Mode:</strong> You can add/remove items and adjust quantities. Use negative quantities to give credit
                      (e.g., -3 sandwiches gives customer $15.30 credit instead of charging them).
                    </p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="edit-order-date" className="block text-sm font-medium text-slate-700 mb-2">Order Date</label>
                    <input
                      id="edit-order-date"
                      type="date"
                      value={editOrderDate}
                      onChange={(e) => setEditOrderDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <h3 className="font-semibold text-slate-800 mb-4">Edit Items</h3>
                  <div className="grid gap-4 mb-6">
                    {items.map((item) => {
                      const qty = editCart[item.id] || 0;
                      if (qty === 0) return null;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">{item.name}</h3>
                            <p className="text-sm text-slate-500">{item.category}</p>
                            <p className="text-lg font-bold text-blue-600">${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateEditCart(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors">
                              <Minus size={16} />
                            </button>
                            <span className={`w-12 text-center font-medium ${qty < 0 ? 'text-red-600' : ''}`}>{qty}</span>
                            <button onClick={() => updateEditCart(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors">
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="font-semibold text-slate-800 mb-4">Add More Items</h3>
                  <div className="grid gap-4 mb-6 max-h-96 overflow-y-auto">
                    {items.map((item) => {
                      const qty = editCart[item.id] || 0;
                      if (qty !== 0) return null;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">{item.name}</h3>
                            <p className="text-sm text-slate-500">{item.category}</p>
                            <p className="text-lg font-bold text-blue-600">${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateEditCart(item.id, -1)} className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors" title="Add as credit (negative)">
                              <Minus size={16} />
                            </button>
                            <button onClick={() => updateEditCart(item.id, 1)} className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors">
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="edit-notes" className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      id="edit-notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                      placeholder="Any special requests or notes..."
                    />
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-slate-800">New Total</h3>
                        {calculateEditTotal() < 0 && (
                          <p className="text-sm text-red-600">Credit amount (will reduce customer balance)</p>
                        )}
                      </div>
                      <p className={`text-3xl font-bold ${calculateEditTotal() < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        ${calculateEditTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {!isEditingInvoice && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-800 mb-4">Request Refund or Credit</h3>
                <textarea value={refundRequest.orderId === selectedInvoice.id ? refundRequest.reason : ""} onChange={(e) => setRefundRequest({ orderId: selectedInvoice.id, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4" rows="3" placeholder="Please explain the reason for your refund or credit request..." />
                <button onClick={submitRefundRequest} disabled={!refundRequest.reason.trim() || refundRequest.orderId !== selectedInvoice.id || loading} className={`px-6 py-2 rounded-lg font-medium transition-all ${refundRequest.reason.trim() && refundRequest.orderId === selectedInvoice.id && !loading ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
                  {loading ? "Submitting..." : "Submit Refund Request"}
                </button>
              </div>
            )}
          </div>
        )}
        {currentView === "reports" && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Custom Reports</h2>
                <p className="text-sm text-slate-500">Build quick breakdowns like "Pizza sales for last week" and send/save them just like invoices.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadReportCsv}
                  disabled={!reportData.detailedRows.length}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    reportData.detailedRows.length ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Download size={18} />
                  Export CSV
                </button>
                <button
                  onClick={openReportPdfPreview}
                  disabled={!reportData.detailedRows.length}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    reportData.detailedRows.length ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Printer size={18} />
                  Download PDF
                </button>
                <button
                  onClick={emailReport}
                  disabled={!reportData.detailedRows.length || reportSending}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                    !reportData.detailedRows.length || reportSending ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Mail size={18} />
                  {reportSending ? 'Emailing...' : 'Email Report'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Sales</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrencyValue(reportData.totals.revenue)}</p>
                <p className="text-xs text-slate-500 mt-1">Across {reportData.filteredOrdersCount} invoices</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Units Moved</p>
                <p className="text-2xl font-bold text-slate-900">{reportData.totals.quantity}</p>
                <p className="text-xs text-slate-500 mt-1">Includes negative quantities for credits</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pizza Sales</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrencyValue(reportData.totals.pizzaRevenue)}</p>
                <p className="text-xs text-slate-500 mt-1">Pizza units: {reportData.totals.pizzaQuantity}</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits / Adjustments</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrencyValue(reportData.totals.creditIssued)}</p>
                <p className="text-xs text-slate-500 mt-1">Negative = credit back to client</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold">
                <Filter size={16} />
                Filter invoices
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="hm-report-start" className="text-sm font-medium text-slate-600 mb-1 block">Start date</label>
                  <input
                    id="hm-report-start"
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => updateReportFilter('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="hm-report-end" className="text-sm font-medium text-slate-600 mb-1 block">End date</label>
                  <input
                    id="hm-report-end"
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => updateReportFilter('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="hm-report-status" className="text-sm font-medium text-slate-600 mb-1 block">Invoice status</label>
                  <select
                    id="hm-report-status"
                    value={reportFilters.status}
                    onChange={(e) => updateReportFilter('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="hm-report-category" className="text-sm font-medium text-slate-600 mb-1 block">Menu category</label>
                  <select
                    id="hm-report-category"
                    value={reportFilters.category}
                    onChange={(e) => updateReportFilter('category', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div>
                  <label htmlFor="hm-report-search" className="text-sm font-medium text-slate-600 mb-1 block">Keyword search</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="hm-report-search"
                      type="text"
                      value={reportFilters.searchText}
                      onChange={(e) => updateReportFilter('searchText', e.target.value)}
                      placeholder="Pizza, sandwich, HM-123..."
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-600">Quick ranges</span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={setThisWeekRange} className="px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">This Week</button>
                    <button onClick={() => setLastNDays(7)} className="px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">Last 7 Days</button>
                    <button onClick={() => setLastNDays(30)} className="px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">Last 30 Days</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <BarChart2 size={18} /> Item breakdown
              </h3>
              {reportData.itemSummary.length === 0 ? (
                <p className="text-sm text-slate-500">No items match the current filters.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="text-left py-3 px-4">Item</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-right py-3 px-4">Quantity</th>
                        <th className="text-right py-3 px-4">Net</th>
                        <th className="text-right py-3 px-4">Invoices</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.itemSummary.map((item) => (
                        <tr key={item.name} className="border-t border-slate-100">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrencyValue(item.total)}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.category}</td>
                          <td className="py-3 px-4 text-right font-semibold">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-semibold">{formatCurrencyValue(item.total)}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{item.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Line items ({reportData.detailedRows.length})</h3>
              <p className="text-xs text-slate-500 mb-3">Showing {reportData.detailedRows.length} line items from {reportData.filteredOrdersCount} invoices.</p>
              {reportData.detailedRows.length === 0 ? (
                <p className="text-sm text-slate-500">Adjust your filters to see invoice lines.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="text-left py-3 px-4">Order #</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Item</th>
                        <th className="text-right py-3 px-4">Qty</th>
                        <th className="text-right py-3 px-4">Unit</th>
                        <th className="text-right py-3 px-4">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.detailedRows.map((row) => (
                        <tr key={`${row.orderId}-${row.itemId}-${row.name}-${row.quantity}-${row.total}-${row.date}`} className="border-t border-slate-100">
                          <td className="py-3 px-4 font-medium text-slate-800">{row.orderNumber}</td>
                          <td className="py-3 px-4 text-slate-600">{formatDate(row.date)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              row.status === 'paid' ? 'bg-green-100 text-green-700' :
                              row.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              row.status === 'refunded' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {row.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-xs text-slate-500">{row.category}</p>
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${row.quantity < 0 ? 'text-red-600' : ''}`}>{row.quantity}</td>
                          <td className="py-3 px-4 text-right">{formatCurrencyValue(row.unitPrice)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${row.total < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrencyValue(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {currentView === "costing" && <CostingWorksheet items={items} />}
        {currentView === "settings" && <IntegrationsSettings />}

        {/* Square Payment Modal */}
        {showPaymentModal && clientUserId && creditBalance && (
          <SquarePaymentButton
            userId={clientUserId}
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
