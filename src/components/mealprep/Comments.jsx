import React, { useEffect, useRef, useState } from 'react';
// NOTE: This component was using Firebase Realtime Database which has been removed.
// It needs to be migrated to Firestore or an API endpoint.
// Keeping imports commented for reference:
// import {
//   limitToLast,
//   onValue,
//   orderByChild,
//   push,
//   query,
//   ref,
//   serverTimestamp,
//   set,
// } from 'firebase/database';

export function Comments({ menuId, user }) {
  // Realtime Database has been removed - comments are currently disabled
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Firebase Realtime Database has been removed - comments are disabled
    // This feature needs to be migrated to Firestore
    setComments([]);
  }, [menuId]);

  const submit = async (e) => {
    e.preventDefault();
    // Firebase Realtime Database has been removed - commenting is disabled
    alert('Comments are temporarily unavailable while we migrate to our new system.');
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
