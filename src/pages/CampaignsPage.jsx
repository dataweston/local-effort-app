import React, { useState } from 'react';

export default function CampaignsPage() {
  const [html, setHtml] = useState('<h1>Hello</h1><p>Start your campaign…</p>');
  const [name, setName] = useState('New Campaign');

  const handleSave = async () => {
    try {
      const res = await fetch('/api/campaigns/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      alert('Saved ' + data.id);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Campaigns</h1>
      <div className="space-y-3">
        <input className="border p-2 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="border p-2 w-full h-64" value={html} onChange={(e) => setHtml(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white rounded" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
