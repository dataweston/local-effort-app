import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { api, age, Panel } from './hubShared';

export function ChatView({ accessToken, people, currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');

  const loadConversations = useCallback(async () => {
    const data = await api('/api/hub/conversations', accessToken);
    setConversations(data.conversations || []);
    if (!selected && data.conversations?.length) setSelected(data.conversations[0]);
  }, [accessToken, selected]);

  const loadMessages = useCallback(async (thread) => {
    if (!thread) return;
    if (!thread.id) {
      const data = await api('/api/hub/conversations', accessToken, {
        method: 'POST',
        body: JSON.stringify({ mode: 'general', action: 'ensure' }),
      });
      setSelected(data.thread);
      return;
    }
    const data = await api(`/api/hub/conversations?threadId=${encodeURIComponent(thread.id)}`, accessToken);
    setMessages(data.messages || []);
  }, [accessToken]);

  useEffect(() => { loadConversations().catch(() => {}); }, [loadConversations]);
  useEffect(() => { loadMessages(selected).catch(() => {}); }, [selected, loadMessages]);

  const startDm = async (person) => {
    const data = await api('/api/hub/conversations', accessToken, {
      method: 'POST',
      body: JSON.stringify({ mode: 'dm', targetUserId: person.userId, action: 'ensure' }),
    });
    setSelected(data.thread);
    await loadConversations();
  };

  const send = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    const isDm = selected?.objectType === 'hub_dm';
    const targetUserId = isDm ? selected.objectId.split(':').find((id) => id && id !== currentUserId) : undefined;
    await api('/api/hub/conversations', accessToken, {
      method: 'POST',
      body: JSON.stringify({ mode: isDm ? 'dm' : 'general', targetUserId, body: text }),
    });
    setBody('');
    await loadConversations();
    await loadMessages(selected);
  };

  return (
    <div className="hub-chat-layout">
      <Panel title="Chats" icon={MessageSquare}>
        <div className="hub-list">
          {conversations.map((thread) => (
            <button className={`hub-row hub-row-button ${selected?.id === thread.id ? 'is-active' : ''}`} key={thread.id || thread.objectId} onClick={() => setSelected(thread)}>
              <strong>{thread.title}</strong>
              <span>{thread.preview || 'No messages yet'} {thread.lastMessageAt ? `/ ${age(thread.lastMessageAt)}` : ''}</span>
            </button>
          ))}
        </div>
        <h3 className="hub-subhead">Message a person</h3>
        <div className="hub-list">
          {people.map((person) => (
            <button className="hub-row hub-row-button" key={person.id} onClick={() => startDm(person)}>
              <strong>{person.displayName}</strong>
              <span>{person.title || person.accessLevel}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'General'} icon={MessageSquare}>
        <div className="hub-message-list">
          {messages.length === 0 && <p className="hub-empty">No messages yet.</p>}
          {messages.map((message) => (
            <div className="hub-message" key={message.id}>
              <strong>{message.senderRole || 'staff'} / {age(message.createdAt)}</strong>
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <form className="hub-compose" onSubmit={send}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a clear update..." />
          <button type="submit"><Send size={13} aria-hidden="true" /> Send</button>
        </form>
      </Panel>
    </div>
  );
}

