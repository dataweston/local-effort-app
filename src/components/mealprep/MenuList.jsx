import React from 'react';

export function MenuList({ menus, onSelect }) {
  if (!menus || menus.length === 0) {
    return <p className="text-gray-600">No menus yet.</p>;
  }
  return (
    <ul className="divide-y divide-gray-200 border rounded-md">
      {menus.map((m) => (
        <li key={m._id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">{m.clientName}</p>
            <p className="text-sm text-gray-500">Week of {m.date}</p>
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded bg-gray-900 text-white text-sm"
            onClick={() => onSelect && onSelect(m)}
          >
            View
          </button>
        </li>
      ))}
    </ul>
  );
}
