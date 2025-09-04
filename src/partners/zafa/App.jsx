import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Users,
  FileText,
  Send,
  ArrowLeft,
  Edit,
  Clock,
  CheckCircle,
} from "lucide-react";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import emailjs from "emailjs-com";

// Integrated ZAFA Events + Invoices tool
export default function ZafaApp() {
  // State management
  const [currentView, setCurrentView] = useState("calendar");
  const [events, setEvents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form states
  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    estimatedGuests: "",
    menu: "",
    estimatedCost: "",
    notes: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    finalCost: "",
    deposit: "",
    email: "",
    notes: "",
  });

  // Load data from Firebase
  useEffect(() => {
    loadEvents();
    loadInvoices();
  }, []);

  const loadEvents = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "events"), orderBy("date", "asc"));
      const querySnapshot = await getDocs(q);
      const loadedEvents = [];
      querySnapshot.forEach((d) => {
        loadedEvents.push({ id: d.id, ...d.data() });
      });
      setEvents(loadedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadInvoices = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const loadedInvoices = [];
      querySnapshot.forEach((d) => {
        loadedInvoices.push({ id: d.id, ...d.data() });
      });
      setInvoices(loadedInvoices);
    } catch (error) {
      console.error("Error loading invoices:", error);
    }
  };

  // Create or update event
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    if (loading || !db) return;
    setLoading(true);
    try {
      const eventData = {
        ...eventForm,
        estimatedGuests: parseInt(eventForm.estimatedGuests) || 0,
        estimatedCost: parseFloat(eventForm.estimatedCost) || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (selectedEvent) {
        await updateDoc(doc(db, "events", selectedEvent.id), {
          ...eventData,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, "events"), eventData);
      }
      setEventForm({
        name: "",
        date: "",
        estimatedGuests: "",
        menu: "",
        estimatedCost: "",
        notes: "",
      });
      setSelectedEvent(null);
      await loadEvents();
      setCurrentView("events");
      alert(selectedEvent ? "Event updated successfully!" : "Event created successfully!");
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Error saving event. Please try again.");
    }
    setLoading(false);
  };

  // Generate invoice
  const generateInvoice = async (event) => {
    if (loading || !db) return;
    setLoading(true);
    try {
      const finalAmount = parseFloat(invoiceForm.finalCost) || 0;
      const depositAmount = parseFloat(invoiceForm.deposit) || 0;
      const balanceDue = finalAmount - depositAmount;
      const invoiceData = {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        estimatedCost: event.estimatedCost,
        finalCost: finalAmount,
        deposit: depositAmount,
        balanceDue,
        email: invoiceForm.email,
        notes: invoiceForm.notes,
        status: "pending",
        createdAt: new Date(),
        invoiceNumber: `INV-${Date.now()}`,
      };
      await addDoc(collection(db, "invoices"), invoiceData);
      if (invoiceForm.email) {
        try {
          const templateParams = {
            to_email: invoiceForm.email,
            event_name: event.name,
            event_date: format(new Date(event.date), "MMMM d, yyyy"),
            invoice_number: invoiceData.invoiceNumber,
            final_cost: finalAmount.toFixed(2),
            deposit: depositAmount.toFixed(2),
            balance_due: balanceDue.toFixed(2),
            notes: invoiceForm.notes,
          };
          await emailjs.send(
            "service_62ytl14",
            "template_w0q56ps",
            templateParams,
            "8JO0XTTh5R62cNEbP"
          );
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }
      setInvoiceForm({ finalCost: "", deposit: "", email: "", notes: "" });
      setSelectedEvent(null);
      await loadInvoices();
      setCurrentView("invoices");
      alert("Invoice generated successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Error generating invoice. Please try again.");
    }
    setLoading(false);
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId, status) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status,
        updatedAt: new Date(),
      });
      await loadInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
    }
  };

  // Calendar helpers
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return events.filter((event) => event.date === dateString);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Local Effort × ZAFA Counterspell</h1>
          <p className="text-slate-600">Event Management System</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setCurrentView("calendar")}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                currentView === "calendar"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-slate-600 hover:text-blue-500"
              }`}
            >
              <Calendar size={20} />
              Calendar
            </button>
            <button
              onClick={() => setCurrentView("events")}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                currentView === "events"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-slate-600 hover:text-blue-500"
              }`}
            >
              <Users size={20} />
              Events
            </button>
            <button
              onClick={() => setCurrentView("invoices")}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                currentView === "invoices"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-slate-600 hover:text-blue-500"
              }`}
            >
              <FileText size={20} />
              Invoices
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {currentView === "calendar" && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{format(currentMonth, "MMMM yyyy")}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center font-semibold text-slate-600">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth().map((date) => {
                const dayEvents = getEventsForDate(date);
                return (
                  <div key={date.toString()} className="min-h-24 p-2 border border-slate-200 rounded-lg">
                    <div className="text-sm font-medium text-slate-700 mb-1">{format(date, "d")}</div>
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventForm({
                            name: event.name,
                            date: event.date,
                            estimatedGuests: event.estimatedGuests.toString(),
                            menu: event.menu,
                            estimatedCost: event.estimatedCost.toString(),
                            notes: event.notes || "",
                          });
                          setCurrentView("event-form");
                        }}
                        className="text-xs bg-blue-100 text-blue-800 p-1 rounded cursor-pointer hover:bg-blue-200 transition-colors mb-1"
                      >
                        {event.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setEventForm({
                    name: "",
                    date: format(new Date(), "yyyy-MM-dd"),
                    estimatedGuests: "",
                    menu: "",
                    estimatedCost: "",
                    notes: "",
                  });
                  setCurrentView("event-form");
                }}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 mx-auto"
              >
                <Plus size={20} />
                Add New Event
              </button>
            </div>
          </div>
        )}

        {/* Events List View */}
        {currentView === "events" && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">All Events</h2>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setEventForm({
                    name: "",
                    date: format(new Date(), "yyyy-MM-dd"),
                    estimatedGuests: "",
                    menu: "",
                    estimatedCost: "",
                    notes: "",
                  });
                  setCurrentView("event-form");
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Add Event
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No events scheduled</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-6 border border-slate-200 rounded-xl hover:border-blue-300 transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">{event.name}</h3>
                        <p className="text-slate-600 mb-1">📅 {format(new Date(event.date), "MMMM d, yyyy")}</p>
                        <p className="text-slate-600 mb-1">👥 {event.estimatedGuests} estimated guests</p>
                        <p className="text-slate-600">💰 ${event.estimatedCost.toFixed(2)} estimated cost</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setEventForm({
                              name: event.name,
                              date: event.date,
                              estimatedGuests: event.estimatedGuests.toString(),
                              menu: event.menu,
                              estimatedCost: event.estimatedCost.toString(),
                              notes: event.notes || "",
                            });
                            setCurrentView("event-form");
                          }}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setInvoiceForm({ finalCost: event.estimatedCost.toString(), deposit: "", email: "", notes: "" });
                            setCurrentView("invoice-form");
                          }}
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <FileText size={16} />
                          Generate Invoice
                        </button>
                      </div>
                    </div>
                    {event.menu && (
                      <div className="mb-3">
                        <h4 className="font-medium text-slate-700 mb-1">Menu:</h4>
                        <p className="text-slate-600 text-sm">{event.menu}</p>
                      </div>
                    )}
                    {event.notes && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-1">Notes:</h4>
                        <p className="text-slate-600 text-sm">{event.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event Form View */}
        {currentView === "event-form" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setCurrentView("events")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800">{selectedEvent ? "Edit Event" : "Create New Event"}</h2>
            </div>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              <div>
                <label htmlFor="event-name" className="block text-sm font-medium text-slate-700 mb-2">Event Name</label>
                <input
                  id="event-name"
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-date" className="block text-sm font-medium text-slate-700 mb-2">Event Date</label>
                <input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-guests" className="block text-sm font-medium text-slate-700 mb-2">Estimated Guests</label>
                <input
                  id="event-guests"
                  type="number"
                  value={eventForm.estimatedGuests}
                  onChange={(e) => setEventForm({ ...eventForm, estimatedGuests: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-menu" className="block text-sm font-medium text-slate-700 mb-2">Menu</label>
                <textarea
                  id="event-menu"
                  value={eventForm.menu}
                  onChange={(e) => setEventForm({ ...eventForm, menu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="4"
                  placeholder="Describe the menu for this event..."
                  required
                />
              </div>
              <div>
                <label htmlFor="event-estimated-cost" className="block text-sm font-medium text-slate-700 mb-2">Estimated Cost ($)</label>
                <input
                  id="event-estimated-cost"
                  type="number"
                  step="0.01"
                  value={eventForm.estimatedCost}
                  onChange={(e) => setEventForm({ ...eventForm, estimatedCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-notes" className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                <textarea
                  id="event-notes"
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Any additional notes or special requirements..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    loading ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  {loading ? "Saving..." : selectedEvent ? "Update Event" : "Create Event"}
                </button>
                <button type="button" onClick={() => setCurrentView("events")} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invoice Form View */}
        {currentView === "invoice-form" && selectedEvent && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setCurrentView("events")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800">Generate Invoice for {selectedEvent.name}</h2>
            </div>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Event Details</h3>
              <p className="text-sm text-slate-600">Date: {format(new Date(selectedEvent.date), "MMMM d, yyyy")}</p>
              <p className="text-sm text-slate-600">Estimated Cost: ${selectedEvent.estimatedCost.toFixed(2)}</p>
            </div>
            <div className="space-y-6">
              <div>
                <label htmlFor="invoice-final" className="block text-sm font-medium text-slate-700 mb-2">Final Cost ($)</label>
                <input
                  id="invoice-final"
                  type="number"
                  step="0.01"
                  value={invoiceForm.finalCost}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, finalCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  required
                />
              </div>
              <div>
                <label htmlFor="invoice-deposit" className="block text-sm font-medium text-slate-700 mb-2">Deposit Received ($)</label>
                <input
                  id="invoice-deposit"
                  type="number"
                  step="0.01"
                  value={invoiceForm.deposit}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, deposit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              {invoiceForm.finalCost && invoiceForm.deposit && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-800">Balance Due: {(parseFloat(invoiceForm.finalCost) - parseFloat(invoiceForm.deposit)).toFixed(2)}</p>
                </div>
              )}
              <div>
                <label htmlFor="invoice-email" className="block text-sm font-medium text-slate-700 mb-2">Client Email (Optional)</label>
                <input
                  id="invoice-email"
                  type="email"
                  value={invoiceForm.email}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="client@example.com"
                />
                <p className="text-xs text-slate-500 mt-1">If provided, the invoice will be emailed to the client</p>
              </div>
              <div>
                <label htmlFor="invoice-notes" className="block text-sm font-medium text-slate-700 mb-2">Invoice Notes (Optional)</label>
                <textarea
                  id="invoice-notes"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Payment terms, additional notes..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => generateInvoice(selectedEvent)}
                  disabled={loading || !invoiceForm.finalCost}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    loading || !invoiceForm.finalCost ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  <Send size={20} />
                  {loading ? "Generating..." : "Generate Invoice"}
                </button>
                <button type="button" onClick={() => setCurrentView("events")} className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoices List View */}
        {currentView === "invoices" && !selectedInvoice && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No invoices generated yet</p>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className="p-6 border border-slate-200 rounded-xl hover:border-blue-300 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-1">{invoice.invoiceNumber}</h3>
                        <p className="text-slate-600 mb-1">Event: {invoice.eventName}</p>
                        <p className="text-slate-600 mb-1">Date: {format(new Date(invoice.eventDate), "MMMM d, yyyy")}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock size={14} />
                          Created: {invoice.createdAt?.seconds ? format(new Date(invoice.createdAt.seconds * 1000), "MMM d, yyyy") : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 mb-2">${invoice.balanceDue.toFixed(2)}</p>
                        <p className="text-sm text-slate-500 mb-2">Total: ${invoice.finalCost.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${invoice.status === "completed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                            {invoice.status.toUpperCase()}
                          </span>
                          {invoice.status === "pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateInvoiceStatus(invoice.id, "completed");
                              }}
                              className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoice Detail View */}
        {currentView === "invoices" && selectedInvoice && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800">Invoice {selectedInvoice.invoiceNumber}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Details</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Event:</span> {selectedInvoice.eventName}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {format(new Date(selectedInvoice.eventDate), "MMMM d, yyyy")}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {selectedInvoice.createdAt?.seconds ? format(new Date(selectedInvoice.createdAt.seconds * 1000), "MMMM d, yyyy") : ""}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${selectedInvoice.status === "completed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                      {selectedInvoice.status.toUpperCase()}
                    </span>
                  </p>
                  {selectedInvoice.email && (
                    <p>
                      <span className="font-medium">Email:</span> {selectedInvoice.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-medium">${selectedInvoice.finalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit Received:</span>
                    <span className="font-medium">-${selectedInvoice.deposit.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Balance Due:</span>
                    <span className="text-blue-600">${selectedInvoice.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            {selectedInvoice.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Notes</h3>
                <p className="text-slate-600 bg-slate-50 p-4 rounded-lg">{selectedInvoice.notes}</p>
              </div>
            )}
            <div className="flex gap-4">
              {selectedInvoice.status === "pending" && (
                <button onClick={() => updateInvoiceStatus(selectedInvoice.id, "completed")} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all flex items-center gap-2">
                  <CheckCircle size={20} />
                  Mark as Completed
                </button>
              )}
              <button onClick={() => window.print()} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center gap-2">
                <FileText size={20} />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
