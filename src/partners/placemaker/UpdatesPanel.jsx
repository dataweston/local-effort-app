import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const COLLECTION_KEY = 'placemakerNotes';
const UPDATES_ID = 'updates';
const LOCAL_STORAGE_KEY = 'placemaker-updates-local';

function readLocalUpdates() {
  try {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch (error) {
    console.warn('Placemaker updates local read failed', error);
    return '';
  }
}

function writeLocalUpdates(value) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, value || '');
  } catch (error) {
    console.warn('Placemaker updates local write failed', error);
  }
}

export default function UpdatesPanel() {
  const [content, setContent] = useState('');
  const [syncMode, setSyncMode] = useState(db ? 'firestore' : 'local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setContent(readLocalUpdates());
      setSyncMode('local');
      setLoading(false);
      return () => {};
    }

    const ref = doc(db, COLLECTION_KEY, UPDATES_ID);
    const unsubscribe = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          const value = data.content || '';
          setContent(value);
          writeLocalUpdates(value);
        } else {
          try {
            await setDoc(ref, {
              title: 'updates',
              content: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setContent('');
            writeLocalUpdates('');
          } catch (error) {
            console.warn('Placemaker updates seed failed', error);
            setContent(readLocalUpdates());
            setSyncMode('local');
          }
        }
        setSyncMode('firestore');
        setLoading(false);
      },
      (err) => {
        console.warn('Placemaker updates snapshot error', err);
        setContent(readLocalUpdates());
        setSyncMode('local');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Updates</h2>
        </div>
        <span className="text-xs text-slate-500">{syncMode === 'firestore' ? 'Live sync' : 'Offline mode'}</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading updates…
        </div>
      ) : content ? (
        <div className="whitespace-pre-wrap text-sm text-slate-700">{content}</div>
      ) : (
        <p className="text-sm text-slate-500">No updates yet.</p>
      )}
    </section>
  );
}
