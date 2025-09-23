import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, NotebookPen, Plus } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const COLLECTION_KEY = 'placemakerNotes';

function formatTitleFromContent(content) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const snippet = (content || '').trim().split(/\s+/).slice(0, 6).join(' ');
  return snippet ? `${stamp} · ${snippet}` : `${stamp} · Note`;
}

const NotepadTile = forwardRef(function NotepadTile(_, ref) {
  const [notes, setNotes] = useState([]);
  const activeIdRef = useRef(null);
  const bootstrappedRef = useRef(false);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveTimer = useRef(null);
  const localEditRef = useRef(false);

  useEffect(() => {
    if (!db) {
      setLoadingList(false);
      setError('Firebase is not configured; notes will not persist.');
      return () => {};
    }
    const colRef = collection(db, COLLECTION_KEY);
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        items.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.seconds || b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setNotes(items);
        setLoadingList(false);
        if (!items.length) {
          activeIdRef.current = null;
          setActiveId(null);
        } else if (!activeIdRef.current || !items.find((item) => item.id === activeIdRef.current)) {
          activeIdRef.current = items[0].id;
          setActiveId(items[0].id);
        }
      },
      (err) => {
        setError(err?.message || 'Failed to load notes.');
        setLoadingList(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    const active = notes.find((n) => n.id === activeId);
    const nextContent = active?.content || '';
    if (localEditRef.current) {
      localEditRef.current = false;
      return;
    }
    setDraft(nextContent);
  }, [notes, activeId]);

  const queueSave = (id, content) => {
    if (!db || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const title = formatTitleFromContent(content);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateDoc(doc(db, COLLECTION_KEY, id), {
          title,
          content,
          updatedAt: serverTimestamp(),
        });
        setError('');
      } catch (e) {
        setError(e?.message || 'Failed to save note.');
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const handleCreate = async () => {
    if (!db) return;
    try {
      const now = new Date();
      const title = `${now.toLocaleDateString()} · New note`;
      const newDoc = await addDoc(collection(db, COLLECTION_KEY), {
        title,
        content: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveId(newDoc.id);
      setDraft('');
    } catch (e) {
      setError(e?.message || 'Failed to create note.');
    }
  };

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!db) return;
    if (loadingList) return;
    if (bootstrappedRef.current) return;
    if (!notes.length) {
      bootstrappedRef.current = true;
      handleCreate();
    }
  }, [db, loadingList, notes.length]);

  const handleContentChange = (value) => {
    setDraft(value);
    localEditRef.current = true;
    if (activeId) {
      queueSave(activeId, value);
    }
  };

  useImperativeHandle(ref, () => ({
    appendToNote: async (text) => {
      if (!db || !text) return;
      let targetId = activeId;
      if (!targetId) {
        try {
          const now = new Date();
          const title = `${now.toLocaleDateString()} · Snapshot`;
          const newDoc = await addDoc(collection(db, COLLECTION_KEY), {
            title,
            content: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          targetId = newDoc.id;
          setActiveId(newDoc.id);
          activeIdRef.current = newDoc.id;
        } catch (e) {
          setError(e?.message || 'Unable to create note for snapshot.');
          return;
        }
      }
      const existing = notes.find((n) => n.id === targetId)?.content || draft || '';
      const stamp = new Date().toLocaleString();
      const decorated = `--- ${stamp} ---\n${text}\n\n`;
      const combined = decorated + existing;
      setDraft(combined);
      localEditRef.current = true;
      queueSave(targetId, combined);
    },
  }));

  const activeNote = notes.find((n) => n.id === activeId) || null;

  if (!db) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <NotebookPen className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Shared Notepad</h2>
        </div>
        <p className="mt-4 text-sm text-slate-600">Firebase is disabled in this build; notes will not sync.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Realtime notes</p>
          <h2 className="text-xl font-semibold text-slate-900">Shared Notepad</h2>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Saving</span>}
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            New note
          </button>
        </div>
      </header>
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <label className="mb-3 flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Select note</span>
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          value={activeId || ''}
          onChange={(e) => setActiveId(e.target.value || null)}
        >
          <option value="">Choose a note…</option>
          {notes.map((note) => (
            <option key={note.id} value={note.id}>
              {note.title || 'Untitled'}
            </option>
          ))}
        </select>
      </label>

      {loadingList ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => handleContentChange(e.target.value)}
          className="min-h-[240px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          placeholder="Start typing…"
        />
      )}

      {activeNote?.updatedAt && (
        <p className="mt-2 text-xs text-slate-500">
          Updated {new Date(activeNote.updatedAt.seconds * 1000).toLocaleString()}
        </p>
      )}
    </div>
  );
});

export default NotepadTile;






