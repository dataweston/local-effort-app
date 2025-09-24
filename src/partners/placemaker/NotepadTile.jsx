import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, NotebookPen, Plus } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const COLLECTION_KEY = 'placemakerNotes';
const LOCAL_NOTES_KEY = 'placemaker-notes-local';

function formatTitleFromContent(content) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const snippet = (content || '').trim().split(/\s+/).slice(0, 6).join(' ');
  return snippet ? `${stamp} · ${snippet}` : `${stamp} · Note`;
}

function readLocalNotes() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(LOCAL_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((note) => ({
      id: String(note.id || `local-${Date.now()}`),
      title: String(note.title || 'Untitled'),
      content: String(note.content || ''),
      updatedAt: note.updatedAt || null,
    }));
  } catch (error) {
    console.warn('Placemaker notes local read failed', error);
    return [];
  }
}

function writeLocalNotes(notes) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn('Placemaker notes local write failed', error);
  }
}

function upsertNote(list, id, payload) {
  const next = [...list];
  const index = next.findIndex((note) => note.id === id);
  if (index >= 0) {
    next[index] = { ...next[index], ...payload };
  } else {
    next.unshift({ id, ...payload });
  }
  return next;
}

const NotepadTile = forwardRef(function NotepadTile(_, ref) {
  const [notes, setNotes] = useState([]);
  const activeIdRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [syncMode, setSyncMode] = useState(db ? 'firestore' : 'local');

  const saveTimer = useRef(null);
  const localEditRef = useRef(false);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!db) {
      const localNotes = readLocalNotes();
      setNotes(localNotes);
      if (localNotes.length) {
        activeIdRef.current = localNotes[0].id;
        setActiveId(localNotes[0].id);
      }
      setSyncMode('local');
      setLoadingList(false);
      return () => {};
    }

    const colRef = collection(db, COLLECTION_KEY);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            title: data.title || 'Untitled',
            content: data.content || '',
            updatedAt: data.updatedAt || null,
          };
        });
        items.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.seconds || b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setNotes(items);
        writeLocalNotes(items);
        setSyncMode('firestore');
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
        console.warn('Placemaker notes snapshot error', err);
        const localNotes = readLocalNotes();
        setNotes(localNotes);
        if (localNotes.length) {
          activeIdRef.current = localNotes[0].id;
          setActiveId(localNotes[0].id);
        }
        setSyncMode('local');
        setLoadingList(false);
        if (err?.message && !/permission/i.test(err.message)) {
          setError(err.message);
        } else {
          setError('');
        }
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    const active = notes.find((note) => note.id === activeId);
    const nextContent = active?.content || '';
    if (localEditRef.current) {
      localEditRef.current = false;
      return;
    }
    setDraft(nextContent);
  }, [notes, activeId]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (loadingList) return;
    if (bootstrappedRef.current) return;
    if (!notes.length) {
      bootstrappedRef.current = true;
      handleCreate();
    }
  }, [loadingList, notes.length]);

  const queueSave = (id, content) => {
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const title = formatTitleFromContent(content);
    const updatedAt = { seconds: Math.floor(Date.now() / 1000) };

    setNotes((prev) => {
      const next = upsertNote(prev, id, { title, content, updatedAt });
      writeLocalNotes(next);
      return next;
    });

    if (!db || syncMode !== 'firestore') {
      saveTimer.current = setTimeout(() => {
        setSaving(false);
      }, 120);
      return;
    }

    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateDoc(doc(db, COLLECTION_KEY, id), {
          title,
          content,
          updatedAt: serverTimestamp(),
        });
        setError('');
      } catch (err) {
        console.warn('Placemaker note save failed', err);
        setError(err?.message || 'Failed to save note. Working offline.');
        setSyncMode('local');
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const handleCreate = async () => {
    const now = new Date();
    const title = `${now.toLocaleDateString()} · New note`;

    if (!db || syncMode !== 'firestore') {
      const localId = `local-${Date.now()}`;
      const updatedAt = { seconds: Math.floor(Date.now() / 1000) };
      setNotes((prev) => {
        const next = [{ id: localId, title, content: '', updatedAt }, ...prev];
        writeLocalNotes(next);
        return next;
      });
      setActiveId(localId);
      setDraft('');
      return;
    }

    try {
      const newDoc = await addDoc(collection(db, COLLECTION_KEY), {
        title,
        content: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveId(newDoc.id);
      setDraft('');
    } catch (err) {
      setError(err?.message || 'Failed to create note.');
    }
  };

  const handleContentChange = (value) => {
    setDraft(value);
    localEditRef.current = true;
    if (activeId) {
      queueSave(activeId, value);
    }
  };

  const handleSaveClick = () => {
    if (!activeId) return;
    queueSave(activeId, draft);
  };

  useImperativeHandle(ref, () => ({
    appendToNote: async (text) => {
      if (!text) return;
      let targetId = activeIdRef.current;
      if (!targetId) {
        const now = new Date();
        const title = `${now.toLocaleDateString()} · Snapshot`;
        if (!db || syncMode !== 'firestore') {
          targetId = `local-${Date.now()}`;
          const updatedAt = { seconds: Math.floor(Date.now() / 1000) };
          setNotes((prev) => {
            const next = [{ id: targetId, title, content: '', updatedAt }, ...prev];
            writeLocalNotes(next);
            return next;
          });
          setActiveId(targetId);
          activeIdRef.current = targetId;
        } else {
          try {
            const newDoc = await addDoc(collection(db, COLLECTION_KEY), {
              title,
              content: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            targetId = newDoc.id;
            setActiveId(newDoc.id);
            activeIdRef.current = newDoc.id;
          } catch (err) {
            setError(err?.message || 'Unable to create note for snapshot.');
            return;
          }
        }
      }

      const stamp = new Date().toLocaleString();
      const existing = notes.find((n) => n.id === targetId)?.content || '';
      const combined = `--- ${stamp} ---\n${text}\n\n${existing}`;
      setDraft(combined);
      localEditRef.current = true;
      queueSave(targetId, combined);
    },
  }));

  const activeNote = notes.find((n) => n.id === activeId) || null;

  if (!notes.length && loadingList) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <NotebookPen className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Shared Notepad</h2>
        </div>
        <div className="mt-6 flex justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Realtime notes</p>
          <h2 className="text-xl font-semibold text-slate-900">Shared Notepad</h2>
          <span className="text-[11px] text-slate-500">{syncMode === 'firestore' ? 'Live sync' : 'Offline mode'}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Saving</span>}
          <button
            type="button"
            onClick={handleSaveClick}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Save now
          </button>
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
          Updated {new Date((activeNote.updatedAt.seconds || 0) * 1000).toLocaleString()}
        </p>
      )}
    </div>
  );
});

export default NotepadTile;
