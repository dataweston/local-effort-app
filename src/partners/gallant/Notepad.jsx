import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc, updateDoc, onSnapshot, doc, serverTimestamp } from 'firebase/firestore';

function formatTitleFromContent(text) {
  const ts = new Date();
  const stamp = ts.toISOString().slice(0, 16).replace('T', ' ');
  const words = (text || '').trim().split(/\s+/).slice(0, 6).join(' ');
  const clean = words.replace(/\s+/g, ' ').replace(/[^\w\s.-]/g, '').trim();
  return clean ? `${stamp} — ${clean}` : `Note ${stamp}`;
}

export default function Notepad() {
  const [notes, setNotes] = useState([]); // {id, title, content, updatedAt}
  const [openIds, setOpenIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!db) return; // Render read-only empty state if no DB
    const unsub = onSnapshot(collection(db, 'notes'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setNotes(list);
      if (!activeId && list.length) {
        setActiveId(list[0].id);
        setOpenIds((ids) => (ids.includes(list[0].id) ? ids : [...ids, list[0].id]));
      }
    });
    return () => unsub();
  }, [activeId]);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId]);

  const createNote = useCallback(async () => {
    if (!db) return;
    const init = { title: `Note ${new Date().toLocaleString()}`, content: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'notes'), init);
    setOpenIds((ids) => [...ids, ref.id]);
    setActiveId(ref.id);
  }, []);

  const closeTab = (id) => setOpenIds((ids) => ids.filter((x) => x !== id));

  const queueSave = useCallback((id, next) => {
    if (!db) return;
    setSaving(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const nextTitle = next.title?.trim() || formatTitleFromContent(next.content || '');
        await updateDoc(doc(db, 'notes', id), { ...next, title: nextTitle, updatedAt: serverTimestamp() });
      } catch (_) {
        // ignore
      } finally {
        setSaving(false);
      }
    }, 400);
  }, []);

  const publishToBlog = useCallback(async (note) => {
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: note.title || 'Untitled', text: note.content || '', emailOnPublish: true })
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Published to blog and emailed (if configured).');
    } catch (e) {
      alert('Publish failed: ' + (e?.message || String(e)));
    }
  }, []);

  if (!db) {
    return (
      <div className="p-4 border rounded bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notepad</h3>
        </div>
        <p className="text-sm text-gray-600 mt-2">Connect Firebase to enable notes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Notepad</h3>
          <span className="text-xs text-gray-500">{saving ? 'Saving…' : 'Autosave on'}</span>
        </div>
        <button onClick={createNote} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">New Note</button>
      </div>
      {/* Tabs */}
      <div className="px-3 pt-2 flex gap-2 overflow-x-auto border-b">
        {openIds.map((id) => {
          const n = notes.find((x) => x.id === id);
          if (!n) return null;
          const active = id === activeId;
          return (
            <button key={id} onClick={() => setActiveId(id)} className={`px-3 py-1.5 rounded-t ${active ? 'bg-white border border-gray-200 border-b-white' : 'bg-gray-100 border border-transparent hover:bg-gray-200'} text-sm flex items-center gap-2`}>
              <span className="truncate max-w-[16ch]">{n.title || 'Untitled'}</span>
              <span className="text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); closeTab(id); }}>×</span>
            </button>
          );
        })}
      </div>

      {/* Editor and sidebar */}
      <div className="grid md:grid-cols-[1fr_280px] gap-0">
        <div className="p-3">
          {activeNote ? (
            <div className="space-y-2">
              <input
                className="w-full px-3 py-2 border rounded"
                value={activeNote.title || ''}
                onChange={(e) => queueSave(activeNote.id, { ...activeNote, title: e.target.value })}
                placeholder="Title"
              />
              <textarea
                className="w-full h-[52vh] md:h-[60vh] px-3 py-2 border rounded font-mono"
                value={activeNote.content || ''}
                onChange={(e) => queueSave(activeNote.id, { ...activeNote, content: e.target.value })}
                placeholder="Start typing…"
              />
            </div>
          ) : (
            <div className="text-gray-500 p-6">Open a note or create a new one.</div>
          )}
        </div>
        <aside className="border-l bg-gray-50 p-3 min-h-[40vh]">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">All Notes</h4>
          </div>
          <ul className="mt-2 space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button className={`w-full text-left px-2 py-1 rounded ${n.id === activeId ? 'bg-white border' : 'hover:bg-white'}`} onClick={() => { setActiveId(n.id); setOpenIds((ids) => (ids.includes(n.id) ? ids : [...ids, n.id])); }}>
                  <div className="text-sm font-medium truncate">{n.title || 'Untitled'}</div>
                </button>
              </li>
            ))}
            {!notes.length && <li className="text-sm text-gray-500 px-2">No notes yet.</li>}
          </ul>
          {activeNote && (
            <div className="mt-4 border-t pt-3">
              <button onClick={() => publishToBlog(activeNote)} className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Publish to Blog + Email</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
