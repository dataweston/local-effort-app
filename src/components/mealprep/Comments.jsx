import React, { useEffect, useRef, useState } from 'react';
import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import { realtimeDb } from '../../firebaseConfig';

export function Comments({ menuId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!menuId || !realtimeDb) return undefined;
    const commentsRef = ref(realtimeDb, `mealprep_comments/${menuId}/comments`);
    const commentsQuery = query(commentsRef, orderByChild('createdAtMs'), limitToLast(100));
    const unsubscribe = onValue(commentsQuery, (snap) => {
      const raw = snap.val() || {};
      const items = Object.entries(raw).map(([id, value]) => ({ id, ...(value || {}) }));
      items.sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0));
      setComments(items);
    });
    return () => unsubscribe();
  }, [menuId, realtimeDb]);

  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!realtimeDb) return;
    const commentsRef = ref(realtimeDb, `mealprep_comments/${menuId}/comments`);
    const newCommentRef = push(commentsRef);
    const createdAtMs = Date.now();
    await set(newCommentRef, {
      body,
      createdAt: serverTimestamp(),
      createdAtMs,
      uid: user?.uid || null,
      name: user?.displayName || 'Anonymous',
    });
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="mt-8 border-t pt-4">
      <h5 className="font-semibold mb-2">Comments</h5>
      {user ? (
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Leave a comment"
          />
          <button className="px-3 py-2 bg-gray-900 text-white rounded" type="submit">Post</button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">Sign in to comment.</p>
      )}
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="border rounded p-3">
            <p className="text-sm text-gray-500">{c.name || 'Anon'}</p>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
