import React, { useState, useEffect } from 'react';
import { Settings, Link2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Package, FileText, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';

// Menu items - must match App.jsx
const MENU_ITEMS = [
  { id: 1, name: "Egg Salad Sandwich", price: 5.85, category: "Sandwiches" },
  { id: 2, name: "Turkey Breast", price: 7.1, category: "Sandwiches" },
  { id: 3, name: "Roast Beef", price: 7.1, category: "Sandwiches" },
  { id: 4, name: "Pastrami", price: 7.1, category: "Sandwiches" },
  { id: 5, name: "Mortadella", price: 7.1, category: "Sandwiches" },
  { id: 20, name: "salame cotto", price: 7.1, category: "Sandwiches" },
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
];

const IntegrationsSettings = () => {
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingMappings, setSavingMappings] = useState(false);
  const [expandedSection, setExpandedSection] = useState('quickbooks');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Check URL params for connection success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('qb_connected') === 'true') {
      alert('QuickBooks connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('sq_connected') === 'true') {
      alert('Square connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('qb_error')) {
      alert('QuickBooks connection failed: ' + params.get('qb_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('sq_error')) {
      alert('Square connection failed: ' + params.get('sq_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadIntegrationStatus();
    loadCatalogMappings();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const res = await fetch('/api/happymonday/integration-status');
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data.integrations);
      }
    } catch (err) {
      console.error('Error loading integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogMappings = async () => {
    try {
      const res = await fetch('/api/happymonday/catalog-mapping');
      if (res.ok) {
        const data = await res.json();
        const mappingObj = {};
        (data.mappings || []).forEach(m => {
          mappingObj[m.local_item_id] = {
            square_catalog_object_id: m.square_catalog_object_id || '',
            square_catalog_variation_id: m.square_catalog_variation_id || '',
          };
        });
        setMappings(mappingObj);
      }
    } catch (err) {
      console.error('Error loading catalog mappings:', err);
    }
  };

  const loadSquareCatalog = async () => {
    if (!integrationStatus?.square?.connected) {
      alert('Please connect Square first');
      return;
    }
    setLoadingCatalog(true);
    try {
      const res = await fetch('/api/happymonday/square-catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(data.items || []);
      } else {
        const err = await res.json();
        alert('Error loading catalog: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error loading Square catalog:', err);
      alert('Error loading Square catalog');
    } finally {
      setLoadingCatalog(false);
    }
  };

  const saveMappings = async () => {
    setSavingMappings(true);
    try {
      const mappingsArray = MENU_ITEMS
        .filter(item => mappings[item.id]?.square_catalog_object_id || mappings[item.id]?.square_catalog_variation_id)
        .map(item => ({
          local_item_id: item.id,
          local_item_name: item.name,
          square_catalog_object_id: mappings[item.id]?.square_catalog_object_id || null,
          square_catalog_variation_id: mappings[item.id]?.square_catalog_variation_id || null,
          is_active: true,
        }));

      // Validate catalog IDs when manually entered (not from dropdown)
      if (catalogItems.length === 0) {
        const invalid = mappingsArray.filter(m => {
          const objId = m.square_catalog_object_id || '';
          // Square catalog IDs are alphanumeric strings, typically uppercase with hyphens or underscores
          return objId && objId.trim().length < 5;
        });
        if (invalid.length > 0) {
          const names = invalid.map(m => m.local_item_name).join(', ');
          alert(`Some catalog IDs look too short (< 5 chars) and may be invalid: ${names}.\n\nTip: Load your Square catalog first to pick from a dropdown instead of typing IDs manually.`);
          setSavingMappings(false);
          return;
        }
      }

      // Warn about unmapped items
      const unmappedCount = MENU_ITEMS.length - mappingsArray.length;
      if (unmappedCount > 0 && mappingsArray.length > 0) {
        const proceed = confirm(`${unmappedCount} of ${MENU_ITEMS.length} items are not mapped. Unmapped items will be skipped during inventory sync.\n\nContinue saving?`);
        if (!proceed) {
          setSavingMappings(false);
          return;
        }
      }

      const res = await fetch('/api/happymonday/catalog-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsArray }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Saved ${data.saved} item mappings`);
      } else {
        const err = await res.json();
        alert('Error saving mappings: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving mappings:', err);
      alert('Error saving mappings');
    } finally {
      setSavingMappings(false);
    }
  };

  const updateMapping = (itemId, field, value) => {
    setMappings(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const connectQuickBooks = () => {
    window.location.href = '/api/happymonday/quickbooks-connect';
  };

  const connectSquare = () => {
    window.location.href = '/api/happymonday/square-connect';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const qb = integrationStatus?.quickbooks || {};
  const sq = integrationStatus?.square || {};

  // Determine setup completion steps
  const setupSteps = [
    { label: 'Connect Square POS', done: !!sq.connected, action: 'Expand the Square section below and click "Connect Square".' },
    { label: 'Load Square catalog', done: catalogItems.length > 0 || Object.values(mappings).some(m => m.square_catalog_object_id), action: 'Click "Load Square Catalog" in the mapping section to pull your items.' },
    { label: 'Map menu items', done: Object.values(mappings).filter(m => m.square_catalog_object_id).length >= 3, action: 'Match at least 3 Local Effort items to your Square catalog items, then save.' },
    { label: 'Connect QuickBooks (optional)', done: !!qb.connected, action: 'Expand the QuickBooks section and click "Connect QuickBooks" for bookkeeping exports.' },
  ];
  const completedSteps = setupSteps.filter(s => s.done).length;
  const allDone = completedSteps >= 3; // QB is optional

  return (
    <div className="space-y-6">
      {/* Setup Guide */}
      {!allDone && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
              {completedSteps}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Getting Started</h2>
              <p className="text-sm text-slate-600">{completedSteps} of {setupSteps.length} steps complete</p>
            </div>
          </div>
          <div className="space-y-3">
            {setupSteps.map((step, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${step.done ? 'bg-green-50 border border-green-200' : 'bg-white border border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${step.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <div>
                  <p className={`font-medium ${step.done ? 'text-green-700 line-through' : 'text-slate-800'}`}>{step.label}</p>
                  {!step.done && <p className="text-sm text-slate-500 mt-0.5">{step.action}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-800">Integrations</h2>
        </div>

        <p className="text-slate-600 mb-6">
          Connect QuickBooks for bookkeeping exports and Square for inventory updates.
        </p>

        {/* QuickBooks Section */}
        <div className="border border-slate-200 rounded-xl mb-4 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'quickbooks' ? null : 'quickbooks')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${qb.connected ? 'bg-green-100' : 'bg-slate-200'}`}>
                <FileText className={`w-5 h-5 ${qb.connected ? 'text-green-600' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800">QuickBooks Online</h3>
                <p className="text-sm text-slate-500">Export invoices to QuickBooks for bookkeeping</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {qb.connected ? (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-sm">
                  <XCircle className="w-4 h-4" /> Not connected
                </span>
              )}
              {expandedSection === 'quickbooks' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
          </button>

          {expandedSection === 'quickbooks' && (
            <div className="p-4 border-t border-slate-200">
              {qb.connected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Company ID</p>
                      <p className="font-medium">{qb.realmId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Last Sync</p>
                      <p className="font-medium">{formatDate(qb.lastSync)}</p>
                    </div>
                  </div>
                  {qb.error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <p>{qb.error}</p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">How it works</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Send Local Effort invoices to QuickBooks for your accounting records</li>
                      <li>QuickBooks mirrors the invoice details for bookkeeping</li>
                      <li>Payments stay in Local Effort (Square/ACH/check)</li>
                    </ul>
                  </div>
                  <button
                    onClick={connectQuickBooks}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Reconnect QuickBooks
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Setup Required
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Connect your QuickBooks account to export Local Effort invoices for bookkeeping only. Payments stay in Local Effort.
                    </p>
                    <button
                      onClick={connectQuickBooks}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Link2 className="w-4 h-4" /> Connect QuickBooks
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Square Section */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'square' ? null : 'square')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sq.connected ? 'bg-green-100' : 'bg-slate-200'}`}>
                <Package className={`w-5 h-5 ${sq.connected ? 'text-green-600' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800">Square POS</h3>
                <p className="text-sm text-slate-500">Sync inventory when you receive products</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {sq.connected ? (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-sm">
                  <XCircle className="w-4 h-4" /> Not connected
                </span>
              )}
              {expandedSection === 'square' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
          </button>

          {expandedSection === 'square' && (
            <div className="p-4 border-t border-slate-200">
              {sq.connected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Location ID</p>
                      <p className="font-medium font-mono text-xs">{sq.locationId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Last Sync</p>
                      <p className="font-medium">{formatDate(sq.lastSync)}</p>
                    </div>
                  </div>
                  {sq.error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <p>{sq.error}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">How it works</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Map Local Effort items to your Square catalog below</li>
                      <li>When you receive an order, manually trigger "Sync to Square"</li>
                      <li>Your Square inventory increases by the quantities ordered</li>
                    </ul>
                  </div>

                  <button
                    onClick={connectSquare}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Reconnect Square
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Setup Required
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      Connect your Square account to automatically update inventory when you receive products from Local Effort.
                    </p>
                    <button
                      onClick={connectSquare}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Link2 className="w-4 h-4" /> Connect Square
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Catalog Mapping Section - Only show if Square is connected */}
      {sq.connected && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-slate-800">Item Catalog Mapping</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadSquareCatalog}
                disabled={loadingCatalog}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {loadingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Load Square Catalog
              </button>
              <button
                onClick={saveMappings}
                disabled={savingMappings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {savingMappings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Mappings
              </button>
            </div>
          </div>

          <p className="text-slate-600 mb-4">
            Map Local Effort menu items to your Square catalog items. This enables automatic inventory updates when you receive orders.
          </p>

          {catalogItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Loaded {catalogItems.length} items from your Square catalog. Select from the dropdowns below.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Local Effort Item</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Square Catalog Item</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Variation ID (optional)</th>
                </tr>
              </thead>
              <tbody>
                {MENU_ITEMS.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category} • ${item.price.toFixed(2)}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {catalogItems.length > 0 ? (
                        <select
                          value={mappings[item.id]?.square_catalog_object_id || ''}
                          onChange={(e) => updateMapping(item.id, 'square_catalog_object_id', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select Square Item --</option>
                          {catalogItems.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={mappings[item.id]?.square_catalog_object_id || ''}
                          onChange={(e) => updateMapping(item.id, 'square_catalog_object_id', e.target.value)}
                          placeholder="Square Catalog Object ID"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {catalogItems.length > 0 && mappings[item.id]?.square_catalog_object_id ? (
                        <select
                          value={mappings[item.id]?.square_catalog_variation_id || ''}
                          onChange={(e) => updateMapping(item.id, 'square_catalog_variation_id', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Use default --</option>
                          {(catalogItems.find(c => c.id === mappings[item.id]?.square_catalog_object_id)?.variations || []).map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.sku && `(${v.sku})`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={mappings[item.id]?.square_catalog_variation_id || ''}
                          onChange={(e) => updateMapping(item.id, 'square_catalog_variation_id', e.target.value)}
                          placeholder="Variation ID (optional)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsSettings;
