import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    writeBatch,
    query,
    onSnapshot,
    deleteDoc,
    updateDoc,
    runTransaction,
    setDoc
} from 'firebase/firestore';
import { Home, FileText, Package, Book, Utensils, DollarSign, PlusCircle, Trash2, Edit, ChevronLeft, AlertCircle, X, CheckCircle, LogOut } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "YOUR_API_KEY", authDomain: "YOUR_AUTH_DOMAIN", projectId: "YOUR_PROJECT_ID" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Helper Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-full overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Notification = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border ${bgColor} flex items-center`}>
            <Icon className="mr-3" />
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 text-lg font-semibold">&times;</button>
        </div>
    );
};

// --- Login Component ---
const Login = ({ auth, showNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                showNotification('success', 'Account created successfully! You are now logged in.');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            showNotification('error', error.message);
            console.error("Authentication error:", error);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">{isSignUp ? 'Create an Account' : 'Welcome Back!'}</h2>
                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <button type="submit" className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {isSignUp ? 'Sign Up' : 'Login'}
                        </button>
                    </div>
                </form>
                <p className="text-sm text-center text-gray-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 font-medium text-indigo-600 hover:underline">
                        {isSignUp ? 'Login' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    // --- State Management ---
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
    const [selectedRecipeId, setSelectedRecipeId] = useState(null);

    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Data state
    const [invoices, setInvoices] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [sales, setSales] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    // --- Firebase Initialization ---
    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
        
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            setUser(user);
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);
    
    // --- Data Fetching (Firestore onSnapshot) ---
    useEffect(() => {
        if (!isAuthReady || !db || !user) {
            if(isAuthReady && !user) setLoading(false);
            return;
        };

        setLoading(true);
        const collections = ['invoices', 'inventory', 'recipes', 'menuItems', 'sales'];
        const unsubscribers = collections.map(coll => {
            const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/${coll}`));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                switch (coll) {
                    case 'invoices': setInvoices(data); break;
                    case 'inventory': setInventory(data); break;
                    case 'recipes': setRecipes(data); break;
                    case 'menuItems': setMenuItems(data); break;
                    case 'sales': setSales(data); break;
                    default: break;
                }
            }, (error) => {
                console.error(`Error fetching ${coll}:`, error);
                showNotification('error', `Failed to load ${coll}.`);
            });
        });

        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [isAuthReady, db, user]);

    // --- Helper Functions ---
    const showNotification = (type, message) => {
        setNotification({ type, message });
    };

    const getCollectionRef = (collectionName) => {
        if (!user) return null;
        return collection(db, `artifacts/${appId}/users/${user.uid}/${collectionName}`);
    };

    // --- Navigation ---
    const navigateTo = (page) => {
        setCurrentPage(page);
        setSelectedInvoiceId(null);
        setSelectedRecipeId(null);
    };

    const viewInvoiceDetail = (id) => {
        setSelectedInvoiceId(id);
        setCurrentPage('invoiceDetail');
    };

    const viewRecipeDetail = (id) => {
        setSelectedRecipeId(id);
        setCurrentPage('recipeDetail');
    };

    const getDashboardStats = useMemo(() => {
        const totalInventoryValue = inventory.reduce((acc, item) => acc + ((item.latestPrice || 0) * (item.stock || 0)), 0);
        const totalSales = sales.reduce((sum, sale) => sum + sale.totalRevenue, 0);
        const totalCogs = sales.reduce((sum, sale) => sum + sale.totalCogs, 0);
        const profitMargin = totalSales > 0 ? ((totalSales - totalCogs) / totalSales) * 100 : 0;

        return {
            invoiceCount: invoices.length,
            inventoryItemCount: inventory.length,
            recipeCount: recipes.length,
            menuItemCount: menuItems.length,
            totalInventoryValue,
            totalSales,
            profitMargin
        };
    }, [invoices, inventory, recipes, menuItems, sales]);

    // --- Page Rendering ---
    const renderPage = () => {
        if (loading || !isAuthReady) {
            return <div className="flex justify-center items-center h-full"><div className="text-xl font-semibold">Loading...</div></div>;
        }
        switch (currentPage) {
            case 'dashboard': return <Dashboard stats={getDashboardStats} navigateTo={navigateTo} />;
            case 'invoices': return <Invoices invoices={invoices} viewInvoiceDetail={viewInvoiceDetail} db={db} getCollectionRef={getCollectionRef} inventory={inventory} showNotification={showNotification} />;
            case 'invoiceDetail': return <InvoiceDetail invoiceId={selectedInvoiceId} db={db} getCollectionRef={getCollectionRef} inventory={inventory} showNotification={showNotification} navigateBack={() => navigateTo('invoices')} />;
            case 'inventory': return <Inventory inventory={inventory} db={db} getCollectionRef={getCollectionRef} showNotification={showNotification} />;
            case 'recipes': return <Recipes recipes={recipes} viewRecipeDetail={viewRecipeDetail} db={db} getCollectionRef={getCollectionRef} inventory={inventory} showNotification={showNotification} />;
            case 'recipeDetail': return <RecipeDetail recipeId={selectedRecipeId} db={db} getCollectionRef={getCollectionRef} inventory={inventory} showNotification={showNotification} navigateBack={() => navigateTo('recipes')} />;
            case 'menu': return <MenuItems menuItems={menuItems} recipes={recipes} inventory={inventory} db={db} getCollectionRef={getCollectionRef} showNotification={showNotification} />;
            case 'sales': return <Sales sales={sales} menuItems={menuItems} recipes={recipes} inventory={inventory} db={db} getCollectionRef={getCollectionRef} showNotification={showNotification} />;
            default: return <Dashboard stats={getDashboardStats} navigateTo={navigateTo} />;
        }
    };

    if (!isAuthReady) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Login auth={auth} showNotification={showNotification} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
            <Navbar navigateTo={navigateTo} currentPage={currentPage} auth={auth} showNotification={showNotification} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

// --- Components for each page ---

const Navbar = ({ navigateTo, currentPage, auth, showNotification }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'invoices', label: 'Invoices', icon: FileText },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'recipes', label: 'Recipes', icon: Book },
        { id: 'menu', label: 'Menu Items', icon: Utensils },
        { id: 'sales', label: 'Record Sales', icon: DollarSign },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            showNotification('success', 'You have been logged out.');
        } catch (error) {
            showNotification('error', 'Failed to log out.');
            console.error(error);
        }
    };

    return (
        <nav className="w-16 md:w-64 bg-white shadow-md flex flex-col">
            <div className="flex items-center justify-center md:justify-start p-4 border-b h-16">
                <Utensils className="text-indigo-600 h-8 w-8" />
                <h1 className="hidden md:block text-xl font-bold text-gray-800 ml-3">RestoEdge</h1>
            </div>
            <ul className="flex-1 mt-4">
                {navItems.map(item => (
                    <li key={item.id} className="px-2">
                        <button
                            onClick={() => navigateTo(item.id)}
                            className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors duration-200 ${currentPage === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="hidden md:block ml-4 font-medium">{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
             <div className="p-2 border-t">
                <button onClick={handleLogout} className="flex items-center w-full p-3 rounded-lg text-gray-600 hover:bg-gray-200">
                    <LogOut className="h-6 w-6" />
                    <span className="hidden md:block ml-4 font-medium">Logout</span>
                </button>
            </div>
        </nav>
    );
};

const Dashboard = ({ stats, navigateTo }) => {
    const statCards = [
        { title: 'Total Sales', value: `$${stats.totalSales.toFixed(2)}`, icon: DollarSign, color: 'text-green-500', page: 'sales' },
        { title: 'Profit Margin', value: `${stats.profitMargin.toFixed(2)}%`, icon: DollarSign, color: 'text-blue-500', page: 'sales' },
        { title: 'Inventory Value', value: `$${stats.totalInventoryValue.toFixed(2)}`, icon: Package, color: 'text-yellow-500', page: 'inventory' },
        { title: 'Invoices', value: stats.invoiceCount, icon: FileText, color: 'text-red-500', page: 'invoices' },
        { title: 'Recipes', value: stats.recipeCount, icon: Book, color: 'text-purple-500', page: 'recipes' },
        { title: 'Menu Items', value: stats.menuItemCount, icon: Utensils, color: 'text-pink-500', page: 'menu' },
    ];

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map(card => (
                    <div key={card.title} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo(card.page)}>
                        <div className="flex items-center">
                            <div className={`p-3 rounded-full bg-opacity-20 ${card.color.replace('text-', 'bg-')}`}>
                                <card.icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                <p className="text-2xl font-semibold text-gray-800">{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Invoices = ({ invoices, viewInvoiceDetail, db, getCollectionRef, inventory, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newInvoice, setNewInvoice] = useState({ vendor: '', date: new Date().toISOString().split('T')[0], totalAmount: '' });

    const handleAddInvoice = async () => {
        if (!newInvoice.vendor || !newInvoice.date || !newInvoice.totalAmount) {
            showNotification('error', 'Please fill all fields.');
            return;
        }
        try {
            await addDoc(getCollectionRef('invoices'), {
                ...newInvoice,
                totalAmount: parseFloat(newInvoice.totalAmount),
                createdAt: new Date()
            });
            showNotification('success', 'Invoice added successfully!');
            setIsModalOpen(false);
            setNewInvoice({ vendor: '', date: new Date().toISOString().split('T')[0], totalAmount: '' });
        } catch (error) {
            console.error("Error adding invoice:", error);
            showNotification('error', 'Failed to add invoice.');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Invoices</h2>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                    <PlusCircle className="mr-2" /> Add Invoice
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Date</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Vendor</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoices.sort((a,b) => new Date(b.date) - new Date(a.date)).map(invoice => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="p-4">{invoice.date}</td>
                                <td className="p-4">{invoice.vendor}</td>
                                <td className="p-4">${parseFloat(invoice.totalAmount).toFixed(2)}</td>
                                <td className="p-4">
                                    <button onClick={() => viewInvoiceDetail(invoice.id)} className="text-indigo-600 hover:text-indigo-800">View Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Invoice">
                <div className="space-y-4">
                    <input type="text" placeholder="Vendor" value={newInvoice.vendor} onChange={e => setNewInvoice({ ...newInvoice, vendor: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="date" value={newInvoice.date} onChange={e => setNewInvoice({ ...newInvoice, date: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Total Amount" value={newInvoice.totalAmount} onChange={e => setNewInvoice({ ...newInvoice, totalAmount: e.target.value })} className="w-full p-2 border rounded" />
                    <button onClick={handleAddInvoice} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Invoice</button>
                </div>
            </Modal>
        </div>
    );
};

const InvoiceDetail = ({ invoiceId, db, getCollectionRef, inventory, showNotification, navigateBack }) => {
    const [invoice, setInvoice] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ inventoryItemId: '', quantity: '', price: '' });

    useEffect(() => {
        if (!invoiceId) return;

        const unsubInvoice = onSnapshot(doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/invoices/${invoiceId}`), (doc) => {
            setInvoice({ id: doc.id, ...doc.data() });
        });

        const unsubLineItems = onSnapshot(collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/invoices/${invoiceId}/lineItems`), (snapshot) => {
            setLineItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubInvoice();
            unsubLineItems();
        };
    }, [invoiceId, db]);

    const handleAddLineItem = async () => {
        if (!newItem.inventoryItemId || !newItem.quantity || !newItem.price) {
            showNotification('error', 'Please fill all fields for the line item.');
            return;
        }

        const quantity = parseFloat(newItem.quantity);
        const price = parseFloat(newItem.price);
        const inventoryItemRef = doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/inventory/${newItem.inventoryItemId}`);
        const lineItemRef = collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/invoices/${invoiceId}/lineItems`);

        try {
            await runTransaction(db, async (transaction) => {
                const inventoryDoc = await transaction.get(inventoryItemRef);
                if (!inventoryDoc.exists()) {
                    throw "Inventory item not found!";
                }

                const currentStock = inventoryDoc.data().stock || 0;
                const newStock = currentStock + quantity;
                const perUnitPrice = price / quantity;

                transaction.update(inventoryItemRef, { 
                    stock: newStock,
                    latestPrice: perUnitPrice 
                });
                
                const selectedInventoryItem = inventory.find(i => i.id === newItem.inventoryItemId);

                transaction.set(doc(lineItemRef), {
                    ...newItem,
                    inventoryItemName: selectedInventoryItem.name,
                    quantity,
                    price,
                    createdAt: new Date()
                });
            });

            showNotification('success', 'Line item added and inventory updated!');
            setIsModalOpen(false);
            setNewItem({ inventoryItemId: '', quantity: '', price: '' });
        } catch (error) {
            console.error("Transaction failed: ", error);
            showNotification('error', 'Failed to add line item.');
        }
    };
    
    const handleDeleteLineItem = async (lineItemId, inventoryItemId, quantity) => {
        if (!window.confirm("Are you sure? This will also reduce the inventory stock.")) return;

        const lineItemRef = doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/invoices/${invoiceId}/lineItems/${lineItemId}`);
        const inventoryItemRef = doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/inventory/${inventoryItemId}`);

        try {
            await runTransaction(db, async (transaction) => {
                const inventoryDoc = await transaction.get(inventoryItemRef);
                if (inventoryDoc.exists()) {
                    const currentStock = inventoryDoc.data().stock || 0;
                    const newStock = Math.max(0, currentStock - quantity);
                    transaction.update(inventoryItemRef, { stock: newStock });
                }
                transaction.delete(lineItemRef);
            });
            showNotification('success', 'Line item deleted and inventory updated.');
        } catch (error) {
            console.error("Error deleting line item:", error);
            showNotification('error', 'Failed to delete line item.');
        }
    };


    if (!invoice) return <div>Loading invoice details...</div>;

    return (
        <div>
            <button onClick={navigateBack} className="flex items-center text-indigo-600 mb-4">
                <ChevronLeft /> Back to Invoices
            </button>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-bold">{invoice.vendor}</h2>
                <p className="text-gray-600">Date: {invoice.date}</p>
                <p className="text-gray-600">Total: ${invoice.totalAmount.toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Line Items</h3>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
                    <PlusCircle className="mr-2" /> Add Line Item
                </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Product</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Quantity</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Price</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {lineItems.map(item => (
                            <tr key={item.id}>
                                <td className="p-4">{item.inventoryItemName}</td>
                                <td className="p-4">{item.quantity}</td>
                                <td className="p-4">${item.price.toFixed(2)}</td>
                                <td className="p-4">
                                    <button onClick={() => handleDeleteLineItem(item.id, item.inventoryItemId, item.quantity)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Line Item">
                <div className="space-y-4">
                    <select value={newItem.inventoryItemId} onChange={e => setNewItem({ ...newItem, inventoryItemId: e.target.value })} className="w-full p-2 border rounded">
                        <option value="">Select Inventory Item</option>
                        {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border rounded" />
                    <button onClick={handleAddLineItem} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Item</button>
                </div>
            </Modal>
        </div>
    );
};

const Inventory = ({ inventory, db, getCollectionRef, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', stock: 0, unit: '', latestPrice: 0 });
    const [editingItem, setEditingItem] = useState(null);

    const handleSaveItem = async () => {
        if (!newItem.name || !newItem.unit) {
            showNotification('error', 'Name and unit are required.');
            return;
        }
        try {
            if (editingItem) {
                const itemRef = doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/inventory/${editingItem.id}`);
                await updateDoc(itemRef, {
                    name: newItem.name,
                    stock: parseFloat(newItem.stock),
                    unit: newItem.unit,
                });
                showNotification('success', 'Inventory item updated!');
            } else {
                await addDoc(getCollectionRef('inventory'), {
                    ...newItem,
                    stock: parseFloat(newItem.stock),
                    latestPrice: parseFloat(newItem.latestPrice),
                    createdAt: new Date()
                });
                showNotification('success', 'Inventory item added!');
            }
            closeModal();
        } catch (error) {
            console.error("Error saving item:", error);
            showNotification('error', 'Failed to save item.');
        }
    };
    
    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/inventory/${id}`));
            showNotification('success', 'Item deleted.');
        } catch(e) {
            showNotification('error', 'Could not delete item.');
            console.error(e);
        }
    }

    const openEditModal = (item) => {
        setEditingItem(item);
        setNewItem({ name: item.name, stock: item.stock, unit: item.unit });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        setNewItem({ name: '', stock: 0, unit: '', latestPrice: 0 });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Inventory</h2>
                <button onClick={openAddModal} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
                    <PlusCircle className="mr-2" /> Add Item
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Stock</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Unit</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Latest Price/Unit</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {inventory.map(item => (
                            <tr key={item.id}>
                                <td className="p-4">{item.name}</td>
                                <td className="p-4">{item.stock}</td>
                                <td className="p-4">{item.unit}</td>
                                <td className="p-4">${(item.latestPrice || 0).toFixed(2)}</td>
                                <td className="p-4 flex items-center space-x-2">
                                    <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700"><Edit size={18}/></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}>
                <div className="space-y-4">
                    <input type="text" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Current Stock" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Unit (e.g., kg, lbs, each)" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="w-full p-2 border rounded" />
                    {!editingItem && <input type="number" placeholder="Initial Price/Unit" value={newItem.latestPrice} onChange={e => setNewItem({ ...newItem, latestPrice: e.target.value })} className="w-full p-2 border rounded" />}
                    <button onClick={handleSaveItem} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">{editingItem ? "Save Changes" : "Add Item"}</button>
                </div>
            </Modal>
        </div>
    );
};

const Recipes = ({ recipes, viewRecipeDetail, db, getCollectionRef, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRecipeName, setNewRecipeName] = useState('');

    const handleAddRecipe = async () => {
        if (!newRecipeName) {
            showNotification('error', 'Recipe name is required.');
            return;
        }
        try {
            await addDoc(getCollectionRef('recipes'), { name: newRecipeName, createdAt: new Date() });
            showNotification('success', 'Recipe added!');
            setIsModalOpen(false);
            setNewRecipeName('');
        } catch (error) {
            console.error("Error adding recipe:", error);
            showNotification('error', 'Failed to add recipe.');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Recipes</h2>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
                    <PlusCircle className="mr-2" /> Add Recipe
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(recipe => (
                    <div key={recipe.id} className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-4">{recipe.name}</h3>
                        <button onClick={() => viewRecipeDetail(recipe.id)} className="w-full text-center bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300">View Details</button>
                    </div>
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Recipe">
                <input type="text" placeholder="Recipe Name" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} className="w-full p-2 border rounded mb-4" />
                <button onClick={handleAddRecipe} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Recipe</button>
            </Modal>
        </div>
    );
};

const RecipeDetail = ({ recipeId, db, getCollectionRef, inventory, showNotification, navigateBack }) => {
    const [recipe, setRecipe] = useState(null);
    const [ingredients, setIngredients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newIngredient, setNewIngredient] = useState({ inventoryItemId: '', quantity: '' });

    useEffect(() => {
        if (!recipeId) return;
        const unsubRecipe = onSnapshot(doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipeId}`), (doc) => setRecipe({ id: doc.id, ...doc.data() }));
        const unsubIngredients = onSnapshot(collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipeId}/ingredients`), (snapshot) => {
            setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubRecipe(); unsubIngredients(); };
    }, [recipeId, db]);

    const handleAddIngredient = async () => {
        if (!newIngredient.inventoryItemId || !newIngredient.quantity) {
            showNotification('error', 'Please select an item and enter a quantity.');
            return;
        }
        try {
            const selectedInventoryItem = inventory.find(i => i.id === newIngredient.inventoryItemId);
            await addDoc(collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipeId}/ingredients`), {
                inventoryItemId: newIngredient.inventoryItemId,
                inventoryItemName: selectedInventoryItem.name,
                unit: selectedInventoryItem.unit,
                quantity: parseFloat(newIngredient.quantity),
            });
            showNotification('success', 'Ingredient added.');
            setIsModalOpen(false);
            setNewIngredient({ inventoryItemId: '', quantity: '' });
        } catch (error) {
            console.error("Error adding ingredient:", error);
            showNotification('error', 'Failed to add ingredient.');
        }
    };
    
    const handleDeleteIngredient = async (ingredientId) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipeId}/ingredients/${ingredientId}`));
            showNotification('success', 'Ingredient removed.');
        } catch(e) {
            showNotification('error', 'Failed to remove ingredient.');
        }
    }

    const recipeCost = useMemo(() => {
        return ingredients.reduce((total, ing) => {
            const inventoryItem = inventory.find(i => i.id === ing.inventoryItemId);
            const price = inventoryItem ? (inventoryItem.latestPrice || 0) : 0;
            return total + (price * ing.quantity);
        }, 0);
    }, [ingredients, inventory]);

    if (!recipe) return <div>Loading recipe...</div>;

    return (
        <div>
            <button onClick={navigateBack} className="flex items-center text-indigo-600 mb-4"><ChevronLeft /> Back to Recipes</button>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-bold">{recipe.name}</h2>
                <p className="text-gray-600 font-semibold">Total Recipe Cost: ${recipeCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Ingredients</h3>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"><PlusCircle className="mr-2" /> Add Ingredient</button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Quantity</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Unit</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {ingredients.map(ing => (
                            <tr key={ing.id}>
                                <td className="p-4">{ing.inventoryItemName}</td>
                                <td className="p-4">{ing.quantity}</td>
                                <td className="p-4">{ing.unit}</td>
                                <td className="p-4">
                                    <button onClick={() => handleDeleteIngredient(ing.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Ingredient">
                <div className="space-y-4">
                    <select value={newIngredient.inventoryItemId} onChange={e => setNewIngredient({ ...newIngredient, inventoryItemId: e.target.value })} className="w-full p-2 border rounded">
                        <option value="">Select Inventory Item</option>
                        {inventory.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input type="number" placeholder="Quantity" value={newIngredient.quantity} onChange={e => setNewIngredient({ ...newIngredient, quantity: e.target.value })} className="w-full p-2 border rounded" />
                    <button onClick={handleAddIngredient} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Ingredient</button>
                </div>
            </Modal>
        </div>
    );
};

const MenuItems = ({ menuItems, recipes, inventory, db, getCollectionRef, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', recipeId: '', sellingPrice: '' });

    const getRecipeCost = useCallback((recipeId) => {
        if (!recipeId) return 0;
        const recipeIngredientsRef = collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipeId}/ingredients`);
        
        // This is a simplified calculation. A more robust solution would fetch ingredients on demand.
        // For this UI, we rely on pre-fetched data.
        let totalCost = 0;
        // This part is tricky without fetching subcollections for all recipes.
        // We will approximate or show N/A. For a real app, this data structure would be different.
        return 'N/A'; // Simplified for this example
    }, [db, inventory]);

    const handleSaveItem = async () => {
        if (!newItem.name || !newItem.recipeId || !newItem.sellingPrice) {
            showNotification('error', 'Please fill all fields.');
            return;
        }
        try {
            await addDoc(getCollectionRef('menuItems'), {
                ...newItem,
                sellingPrice: parseFloat(newItem.sellingPrice),
                createdAt: new Date()
            });
            showNotification('success', 'Menu item added!');
            setIsModalOpen(false);
            setNewItem({ name: '', recipeId: '', sellingPrice: '' });
        } catch (error) {
            console.error("Error adding menu item:", error);
            showNotification('error', 'Failed to add menu item.');
        }
    };
    
    const handleDeleteItem = async (id) => {
        if(!window.confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/menuItems/${id}`));
            showNotification('success', 'Menu item deleted.');
        } catch(e) {
            showNotification('error', 'Could not delete menu item.');
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Menu Items</h2>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"><PlusCircle className="mr-2" /> Add Menu Item</button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Name</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Recipe</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Selling Price</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {menuItems.map(item => (
                            <tr key={item.id}>
                                <td className="p-4">{item.name}</td>
                                <td className="p-4">{recipes.find(r => r.id === item.recipeId)?.name || 'N/A'}</td>
                                <td className="p-4">${item.sellingPrice.toFixed(2)}</td>
                                <td className="p-4">
                                     <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Menu Item">
                <div className="space-y-4">
                    <input type="text" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border rounded" />
                    <select value={newItem.recipeId} onChange={e => setNewItem({ ...newItem, recipeId: e.target.value })} className="w-full p-2 border rounded">
                        <option value="">Select Recipe</option>
                        {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="number" placeholder="Selling Price" value={newItem.sellingPrice} onChange={e => setNewItem({ ...newItem, sellingPrice: e.target.value })} className="w-full p-2 border rounded" />
                    <button onClick={handleSaveItem} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Add Item</button>
                </div>
            </Modal>
        </div>
    );
};

const Sales = ({ sales, menuItems, recipes, inventory, db, getCollectionRef, showNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saleItems, setSaleItems] = useState([{ menuItemId: '', quantity: 1 }]);
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

    const addSaleItem = () => setSaleItems([...saleItems, { menuItemId: '', quantity: 1 }]);
    const updateSaleItem = (index, field, value) => {
        const newItems = [...saleItems];
        newItems[index][field] = value;
        setSaleItems(newItems);
    };

    const handleRecordSale = async () => {
        if (saleItems.some(item => !item.menuItemId || item.quantity <= 0)) {
            showNotification('error', 'Please complete all sale item details.');
            return;
        }

        const batch = writeBatch(db);
        let totalRevenue = 0;
        let totalCogs = 0;

        try {
            // Fetch all ingredients for all recipes in one go to be more efficient
            const recipeIngredientPromises = recipes.map(recipe => 
                getDocs(collection(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/recipes/${recipe.id}/ingredients`))
            );
            const recipeIngredientSnapshots = await Promise.all(recipeIngredientPromises);
            const allRecipeIngredients = recipeIngredientSnapshots.reduce((acc, snapshot, index) => {
                const recipeId = recipes[index].id;
                acc[recipeId] = snapshot.docs.map(doc => doc.data());
                return acc;
            }, {});

            for (const saleItem of saleItems) {
                const menuItem = menuItems.find(mi => mi.id === saleItem.menuItemId);
                if (!menuItem) continue;

                const recipeId = menuItem.recipeId;
                const recipeIngredients = allRecipeIngredients[recipeId];
                if (!recipeIngredients) continue;

                let cogs = 0;
                for (const ingredient of recipeIngredients) {
                    const inventoryItem = inventory.find(inv => inv.id === ingredient.inventoryItemId);
                    if (inventoryItem) {
                        cogs += (inventoryItem.latestPrice || 0) * ingredient.quantity;

                        // Add inventory update to batch
                        const inventoryRef = doc(db, `artifacts/${appId}/users/${getAuth().currentUser.uid}/inventory/${inventoryItem.id}`);
                        const newStock = (inventoryItem.stock || 0) - (ingredient.quantity * saleItem.quantity);
                        batch.update(inventoryRef, { stock: Math.max(0, newStock) });
                    }
                }
                
                totalCogs += cogs * saleItem.quantity;
                totalRevenue += menuItem.sellingPrice * saleItem.quantity;
            }

            // Add sale record to batch
            const saleDocRef = doc(getCollectionRef('sales'));
            batch.set(saleDocRef, {
                date: saleDate,
                items: saleItems,
                totalRevenue,
                totalCogs,
                createdAt: new Date()
            });

            await batch.commit();

            showNotification('success', 'Sale recorded and inventory updated!');
            setIsModalOpen(false);
            setSaleItems([{ menuItemId: '', quantity: 1 }]);
        } catch (error) {
            console.error("Error recording sale: ", error);
            showNotification('error', 'Failed to record sale. Check inventory levels.');
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Sales History</h2>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"><PlusCircle className="mr-2" /> Record Sale</button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Date</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Revenue</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">COGS</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-600">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => (
                            <tr key={sale.id}>
                                <td className="p-4">{sale.date}</td>
                                <td className="p-4 text-green-600">${sale.totalRevenue.toFixed(2)}</td>
                                <td className="p-4 text-red-600">${sale.totalCogs.toFixed(2)}</td>
                                <td className="p-4 font-semibold">${(sale.totalRevenue - sale.totalCogs).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Sale">
                <div className="space-y-4">
                    <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full p-2 border rounded" />
                    {saleItems.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <select value={item.menuItemId} onChange={e => updateSaleItem(index, 'menuItemId', e.target.value)} className="w-2/3 p-2 border rounded">
                                <option value="">Select Menu Item</option>
                                {menuItems.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
                            </select>
                            <input type="number" min="1" value={item.quantity} onChange={e => updateSaleItem(index, 'quantity', parseInt(e.target.value))} className="w-1/3 p-2 border rounded" />
                        </div>
                    ))}
                    <button onClick={addSaleItem} className="w-full text-indigo-600 py-2 rounded-lg border border-indigo-600 hover:bg-indigo-50">Add Another Item</button>
                    <button onClick={handleRecordSale} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Record Sale</button>
                </div>
            </Modal>
        </div>
    );
};

export default App;
