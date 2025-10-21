import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';

const FinancialSummary = ({ events, receipts }) => {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    
    const futureEvents = events.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate.getFullYear() === currentYear && eventDate >= today && e.status !== 'cancelled';
    });
    
    const totalRevenue = futureEvents.reduce((sum, e) => sum + (e.actual_revenue || e.estimated_revenue || 0), 0);
    const totalFoodCost = futureEvents.reduce((sum, e) => sum + (e.actual_food_cost || e.estimated_food_cost || 0), 0);
    const totalLaborCost = futureEvents.reduce((sum, e) => sum + (e.actual_labor_cost || e.estimated_labor_cost || 0), 0);
    const grossMargin = totalRevenue - totalFoodCost - totalLaborCost;
    
    return { totalRevenue, totalFoodCost, totalLaborCost, grossMargin };
  }, [events]);
  
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">Future Revenue</p>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">Food Costs</p>
            <p className="text-2xl font-semibold text-red-600">{formatCurrency(stats.totalFoodCost)}</p>
          </div>
          <ShoppingCart className="w-8 h-8 text-red-500" />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">Labor Costs</p>
            <p className="text-2xl font-semibold text-orange-600">{formatCurrency(stats.totalLaborCost)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-orange-500" />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">Gross Margin</p>
            <p className="text-2xl font-semibold text-blue-600">{formatCurrency(stats.grossMargin)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-blue-500" />
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
