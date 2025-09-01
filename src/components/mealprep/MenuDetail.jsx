import React from 'react';

export function MenuDetail({ menu, onBack }) {
  if (!menu) return null;
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-blue-600">← Back</button>
      <h4 className="text-2xl font-bold">{menu.clientName}</h4>
      <p className="text-gray-600">Week of {menu.date}</p>
      {menu.notes && <p className="italic text-gray-700">{menu.notes}</p>}
      <ul className="list-disc ml-6">
        {menu.menu?.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
