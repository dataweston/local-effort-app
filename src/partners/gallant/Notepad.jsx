import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, updateDoc, onSnapshot, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [errorMsg, setErrorMsg] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const saveTimer = useRef(null);

  // Keep ALLOWED in sync with Gallant App.jsx
  const ALLOWED = useMemo(() => new Set(['dataweston@gmail.com', 'colsen03@gmail.com']), []);

  const getAuthHeaders = async () => {
    try {
      const token = await auth?.currentUser?.getIdToken?.();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  // Track auth state locally to gate reads/writes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (db) {
      if (!authReady) return;
      const email = (user?.email || '').toLowerCase();
      if (!user || !ALLOWED.has(email)) {
        setErrorMsg(user ? 'Not authorized for notes' : 'Not signed in');
        return;
      }
      const unsub = onSnapshot(
        collection(db, 'notes'),
        (snap) => {
          setErrorMsg('');
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
          setNotes(list);
          if (!activeId && list.length) {
            setActiveId(list[0].id);
            setOpenIds((ids) => (ids.includes(list[0].id) ? ids : [...ids, list[0].id]));
          }
        },
        (err) => setErrorMsg(err && (err.code ? `${err.code}: ${err.message}` : err.message))
      );
      return () => unsub();
    } else {
      // Fallback to server-side list
      (async () => {
        try {
          const authHeaders = await getAuthHeaders();
          const res = await fetch('/api/notes', { headers: { ...authHeaders } });
          const data = await res.json();
          const list = (data.items || []).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
          setNotes(list);
          if (!activeId && list.length) {
            setActiveId(list[0].id);
            setOpenIds((ids) => (ids.includes(list[0].id) ? ids : [...ids, list[0].id]));
          }
        } catch (_) { /* ignore */ }
      })();
    }
  }, [db, authReady, user]);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId]);

  const ensureAllowed = useCallback(() => {
    if (!auth?.currentUser) { setErrorMsg('Not signed in'); return false; }
    const email = (auth.currentUser.email || '').toLowerCase();
    if (!ALLOWED.has(email)) { setErrorMsg('Not authorized'); return false; }
    return true;
  }, [ALLOWED]);

  const createNote = useCallback(async () => {
    if (db) {
      if (!ensureAllowed()) return;
      const init = { title: `Note ${new Date().toLocaleString()}`, content: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'notes'), init);
      setOpenIds((ids) => [...ids, ref.id]);
      setActiveId(ref.id);
    } else {
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch('/api/notes', { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders }, body: JSON.stringify({ title: `Note ${new Date().toLocaleString()}`, content: '' }) });
        const data = await res.json();
        if (data.id) {
          setOpenIds((ids) => [...ids, data.id]);
          setActiveId(data.id);
          // Soft refresh notes
          const listRes = await fetch('/api/notes', { headers: { ...authHeaders } });
          const listData = await listRes.json();
          setNotes(listData.items || []);
        }
  } catch (_) { /* ignore */ }
    }
  }, [ensureAllowed]);

  const closeTab = (id) => setOpenIds((ids) => ids.filter((x) => x !== id));

  const queueSave = useCallback((id, next) => {
    setSaving(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const nextTitle = next.title?.trim() || formatTitleFromContent(next.content || '');
        if (db) {
          if (!ensureAllowed()) return;
          await updateDoc(doc(db, 'notes', id), { ...next, title: nextTitle, updatedAt: serverTimestamp() });
        } else {
          const authHeaders = await getAuthHeaders();
          await fetch(`/api/notes/${id}`, {
            method: 'PUT', headers: { 'content-type': 'application/json', ...authHeaders }, body: JSON.stringify({ title: nextTitle, content: next.content })
          });
        }
      } catch (e) {
        setErrorMsg(e?.message || String(e));
      } finally {
        setSaving(false);
      }
    }, 400);
  }, [ensureAllowed]);

  const publishToBlog = useCallback(async (note) => {
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: note.title || 'Untitled', text: note.content || '', emailOnPublish: true })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json().catch(() => ({}));
      const slug = data?.slug;
      if (slug) {
        const url = `/weekly/${slug}`;
        // lightweight toast via window.confirm for minimal UI change
        if (window.confirm(`Published! Open the post now?\n${window.location.origin}${url}`)) {
          window.open(url, '_blank', 'noopener');
        }
      } else {
        alert('Published to blog and emailed (if configured).');
      }
    } catch (e) {
      alert('Publish failed: ' + (e?.message || String(e)));
    }
  }, []);

  const deleteNote = useCallback(async (noteId) => {
    if (!noteId) return;
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      if (db) {
        if (!ensureAllowed()) return;
        await updateDoc(doc(db, 'notes', noteId), { _deleted: true, updatedAt: serverTimestamp() });
        // If rules require actual delete, swap to deleteDoc; using soft delete here to avoid rules surprises
      } else {
        const authHeaders = await getAuthHeaders();
        await fetch(`/api/notes/${noteId}`, { method: 'DELETE', headers: { ...authHeaders } });
      }
      setNotes((arr) => arr.filter((n) => n.id !== noteId));
      setOpenIds((ids) => ids.filter((x) => x !== noteId));
      setActiveId((id) => (id === noteId ? null : id));
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    }
  }, [ensureAllowed, getAuthHeaders, db]);

  const saveNow = useCallback(async () => {
    const n = activeNote;
    if (!n) return;
    try {
      const nextTitle = n.title?.trim() || formatTitleFromContent(n.content || '');
      if (db) {
        if (!ensureAllowed()) return;
        await updateDoc(doc(db, 'notes', n.id), { title: nextTitle, content: n.content || '', updatedAt: serverTimestamp() });
      } else {
        const authHeaders = await getAuthHeaders();
        await fetch(`/api/notes/${n.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authHeaders }, body: JSON.stringify({ title: nextTitle, content: n.content || '' }) });
      }
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    }
  }, [activeNote, ensureAllowed]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Notepad</h3>
          <span className="text-xs text-gray-500">{saving ? 'Saving…' : 'Autosave on'}</span>
          {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeNote && (
            <button onClick={saveNow} className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700">Save Now</button>
          )}
          <button onClick={createNote} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">New Note</button>
        </div>
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
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">{activeNote.updatedAt?.seconds ? new Date(activeNote.updatedAt.seconds * 1000).toLocaleString() : ''}</span>
                <button onClick={() => deleteNote(activeNote.id)} className="text-sm text-red-600 hover:text-red-700">Delete note</button>
              </div>
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
