import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { api, age, HubAvatar, Panel } from './hubShared';
import { EmptyState } from './HubIllustrations';

export function ChatView({ accessToken, people, currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');

  const peopleById = useMemo(() => {
    const map = {};
    people.forEach((person) => { if (person.userId) map[person.userId] = person; });
    return map;
  }, [people]);

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
            <button className={`hub-row hub-row-button hub-preview-row ${selected?.id === thread.id ? 'is-active' : ''}`} key={thread.id || thread.objectId} onClick={() => setSelected(thread)}>
              <HubAvatar name={thread.title} size={34} />
              <div className="hub-preview-copy">
                <strong>{thread.title}</strong>
                <span>{thread.preview || 'No messages yet'}</span>
              </div>
              {thread.lastMessageAt && <small>{age(thread.lastMessageAt)}</small>}
            </button>
          ))}
        </div>
        <h3 className="hub-subhead">Message a person</h3>
        <div className="hub-list">
          {people.map((person) => (
            <button className="hub-row hub-row-button hub-preview-row" key={person.id} onClick={() => startDm(person)}>
              <HubAvatar name={person.displayName} size={34} />
              <div className="hub-preview-copy">
                <strong>{person.displayName}</strong>
                <span>{person.title || person.accessLevel}</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'General'} icon={MessageSquare}>
        <div className="hub-message-list">
          {messages.length === 0 && (
            <EmptyState art="plane" title="No messages yet" hint="Start the thread — say what's cooking." />
          )}
          {messages.map((message, index) => {
            const isSelf = message.senderId === currentUserId;
            const senderName = peopleById[message.senderId]?.displayName
              || (isSelf ? 'You' : (message.senderRole || 'Staff'));
            const showHead = index === 0 || messages[index - 1].senderId !== message.senderId;
            return (
              <div className={`hub-msg${isSelf ? ' is-self' : ''}`} key={message.id}>
                {!isSelf && (
                  <span className="hub-msg-gutter">
                    {showHead && <HubAvatar name={senderName} size={28} />}
                  </span>
                )}
                <div className="hub-msg-col">
                  {showHead && (
                    <div className="hub-msg-meta">
                      {!isSelf && <strong>{senderName}</strong>}
                      <span>{age(message.createdAt)}</span>
                    </div>
                  )}
                  <div className="hub-msg-bubble"><p>{message.body}</p></div>
                </div>
              </div>
            );
          })}
        </div>
        <form className="hub-compose" onSubmit={send}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
          <button type="submit" aria-label="Send message"><Send size={16} aria-hidden="true" /></button>
        </form>
      </Panel>
    </div>
  );
}

