import React, { useState, useEffect } from "react";
import { DollarSign, Plus, Trash2, Save, Download } from "lucide-react";
import { db } from "../../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CostingWorksheet = ({ items }) => {
  const [costs, setCosts] = useState(
    items.reduce((acc, item) => {
      acc[item.id] = { flour: 0, meat: 0, vegetables: 0, dairy: 0, otherToppings: 0, packaging: 0, label: 0, custom: [] };
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState(false);
  const costDocRef = doc(db, "costing", "worksheet");

  const loadCosts = async () => {
    setLoading(true);
    try {
      if (!db) return;
      const docSnap = await getDoc(costDocRef);
      if (docSnap.exists()) {
        const savedCosts = docSnap.data();
        const mergedCosts = items.reduce((acc, item) => {
          acc[item.id] = { ...costs[item.id], ...(savedCosts[item.id] || {}) };
          return acc;
        }, {});
        setCosts(mergedCosts);
      }
    } catch (error) {
      console.error("Error loading costs:", error);
      alert("Error loading costs. Please check the console for details.");
    }
    setLoading(false);
  };

  useEffect(() => { loadCosts(); }, []);

  const saveCosts = async () => {
    setLoading(true);
    try {
      if (!db) return;
      await setDoc(costDocRef, costs);
      alert("Costs saved successfully!");
    } catch (error) {
      console.error("Error saving costs:", error);
      alert("Error saving costs. Please try again.");
    }
    setLoading(false);
  };

  const handleCostChange = (itemId, field, value, customIndex = null) => {
    const newCosts = { ...costs };
    if (customIndex !== null) {
      newCosts[itemId].custom[customIndex][field] = value;
    } else {
      newCosts[itemId][field] = parseFloat(value) || 0;
    }
    setCosts(newCosts);
  };

  const addCustomIngredient = (itemId) => {
    const newCosts = { ...costs };
    if (!newCosts[itemId]?.custom) newCosts[itemId].custom = [];
    newCosts[itemId].custom.push({ name: "", cost: 0 });
    setCosts(newCosts);
  };

  const removeCustomIngredient = (itemId, index) => {
    const newCosts = { ...costs };
    newCosts[itemId].custom.splice(index, 1);
    setCosts(newCosts);
  };

  const calculateTotalCost = (itemId) => {
    const itemCosts = costs[itemId];
    if (!itemCosts) return 0;
    const customCosts = (itemCosts.custom || []).reduce((total, ing) => total + (parseFloat(ing.cost) || 0), 0);
    return (
      (itemCosts.flour || 0) +
      (itemCosts.meat || 0) +
      (itemCosts.vegetables || 0) +
      (itemCosts.dairy || 0) +
      (itemCosts.otherToppings || 0) +
      (itemCosts.packaging || 0) +
      (itemCosts.label || 0) +
      customCosts
    );
  };

  const renderCostFields = (item) => {
    const commonFields = [
      { name: "packaging", label: "Packaging" },
      { name: "label", label: "Label" },
    ];
    let categoryFields = [];
    if (item.category === "Sandwiches") {
      categoryFields = [
        { name: "flour", label: "Flour" },
        { name: "meat", label: "Meat" },
        { name: "vegetables", label: "Vegetables" },
        { name: "dairy", label: "Dairy" },
        { name: "otherToppings", label: "Other Toppings" },
      ];
    } else if (item.category === "Pizza") {
      categoryFields = [
        { name: "flour", label: "Dough/Flour" },
        { name: "meat", label: "Meat" },
        { name: "vegetables", label: "Vegetables" },
        { name: "dairy", label: "Cheese/Dairy" },
        { name: "otherToppings", label: "Sauce & Toppings" },
      ];
    }
    const allFields = [...categoryFields, ...commonFields];
    return allFields.map((field) => (
      <div key={field.name} className="flex items-center">
        <label className="w-1/2 text-sm text-slate-600">{field.label}</label>
        <div className="w-1/2 relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="number" step="0.01" value={costs[item.id]?.[field.name] || ""} onChange={(e) => handleCostChange(item.id, field.name, e.target.value)} className="w-full pl-8 pr-2 py-1 border border-slate-300 rounded-md" disabled={loading} />
        </div>
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Costing Worksheet</h2>
        <div className="flex gap-2">
          <button onClick={loadCosts} disabled={loading} className="px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-600 text-white">
            <Download size={18} />{loading ? "Loading..." : "Reload Costs"}
          </button>
          <button onClick={saveCosts} disabled={loading} className="px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white">
            <Save size={18} />{loading ? "Saving..." : "Save Costs"}
          </button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className={`p-4 border border-slate-200 rounded-xl ${loading ? 'bg-slate-50 opacity-50' : ''}`}>
            <h3 className="font-semibold text-slate-800 text-lg mb-2">{item.name}</h3>
            <div className="space-y-2">
              {renderCostFields(item)}
              {(costs[item.id]?.custom || []).map((customIng, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input type="text" placeholder="Custom Ingredient" value={customIng.name} onChange={(e) => handleCostChange(item.id, "name", e.target.value, index)} className="w-1/2 px-2 py-1 border border-slate-300 rounded-md" disabled={loading} />
                  <div className="w-1/2 relative flex items-center">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="number" step="0.01" placeholder="Cost" value={customIng.cost} onChange={(e) => handleCostChange(item.id, "cost", e.target.value, index)} className="w-full pl-8 pr-2 py-1 border border-slate-300 rounded-md" disabled={loading} />
                    <button onClick={() => removeCustomIngredient(item.id, index)} className="ml-2 text-red-500 hover:text-red-700" disabled={loading}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addCustomIngredient(item.id)} className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1" disabled={loading}><Plus size={14} /> Add Custom Ingredient</button>
            </div>
            <div className="border-t mt-4 pt-2 flex justify-between items-center">
              <span className="font-semibold">Total Cost:</span>
              <span className="font-bold text-blue-600">${calculateTotalCost(item.id).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostingWorksheet;
