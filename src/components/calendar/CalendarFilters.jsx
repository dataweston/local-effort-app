import React, { useState } from 'react';
import { X } from 'lucide-react';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Events', color: null },
  { id: 'pizza_party', label: '🍕 Pizza', color: 'orange' },
  { id: 'pizza_pickup', label: '🍕 Pickup', color: 'orange' },
  { id: 'catering', label: '🍴 Catering', color: 'blue' },
  { id: 'meal_prep', label: '🥘 Meal Prep', color: 'purple' },
  { id: 'confirmed', label: '✓ Confirmed', color: 'green', isStatus: true },
  { id: 'scheduled', label: '○ Scheduled', color: 'blue', isStatus: true }
];

export default function CalendarFilters({ activeFilters = [], onFilterChange }) {
  const toggleFilter = (filterId) => {
    if (filterId === 'all') {
      onFilterChange([]);
      return;
    }

    const isActive = activeFilters.includes(filterId);
    const newFilters = isActive
      ? activeFilters.filter(f => f !== filterId)
      : [...activeFilters, filterId];
    
    onFilterChange(newFilters);
  };

  const getChipClasses = (option) => {
    const isActive = option.id === 'all' 
      ? activeFilters.length === 0 
      : activeFilters.includes(option.id);

    const baseClasses = 'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border-2 active:scale-95';
    
    if (!isActive) {
      return `${baseClasses} bg-white border-gray-200 text-gray-600 hover:border-gray-300`;
    }

    const colorClasses = {
      orange: 'bg-orange-100 border-orange-300 text-orange-900',
      blue: 'bg-blue-100 border-blue-300 text-blue-900',
      purple: 'bg-purple-100 border-purple-300 text-purple-900',
      green: 'bg-green-100 border-green-300 text-green-900'
    };

    return `${baseClasses} ${colorClasses[option.color] || 'bg-gray-100 border-gray-300 text-gray-900'}`;
  };

  return (
    <div className="bg-white p-3 border-b sticky top-0 z-20">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleFilter(option.id)}
            className={getChipClasses(option)}
            aria-pressed={option.id === 'all' ? activeFilters.length === 0 : activeFilters.includes(option.id)}
          >
            {option.label}
          </button>
        ))}
        
        {activeFilters.length > 0 && (
          <button
            onClick={() => onFilterChange([])}
            className="px-2 py-1.5 rounded-full text-sm text-red-600 hover:bg-red-50 transition shrink-0"
            aria-label="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
