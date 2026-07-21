import React, { useEffect, useState } from 'react';
import { FileText, Plus, Share2, ShieldCheck } from 'lucide-react';
import { api, Panel, Field } from './hubShared';

export function DocsView({ accessToken, docs, reloadDocs, isPrivileged, canEdit, sharedDocId }) {
  const [selectedId, setSelectedId] = useState(sharedDocId || docs[0]?.id || null);
  const [selected, setSelected] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [draft, setDraft] = useState({ title: '', summary: '', body: '', category: 'sop', visibility: 'staff' });

  useEffect(() => {
    if (!selectedId) return;
    setLoadError('');
    api(`/api/hub/docs?id=${encodeURIComponent(selectedId)}`, accessToken)
      .then((data) => {
        setSelected(data.document);
        setLoadError('');
      })
      .catch(() => {
        setSelected(null);
        setLoadError('This document is unavailable to this Google account. Ask the sender to confirm its Hub audience and your access.');
      });
  }, [accessToken, selectedId]);

  useEffect(() => {
    if (!selectedId && docs[0]) setSelectedId(docs[0].id);
  }, [docs, selectedId]);

  useEffect(() => {
    if (sharedDocId) setSelectedId(sharedDocId);
  }, [sharedDocId]);

  const chooseDoc = (id) => {
    setSelectedId(id);
    setShareStatus('');
    setEditing(null);
    setEditStatus('');
    const url = new URL(window.location.href);
    url.pathname = '/hub';
    url.searchParams.set('tab', 'docs');
    url.searchParams.set('doc', id);
    url.searchParams.delete('shared');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  };

  const shareDoc = async (doc) => {
    if (!doc) return;
    const url = new URL('/hub', window.location.origin);
    url.searchParams.set('tab', 'docs');
    url.searchParams.set('doc', doc.id);
    url.searchParams.set('shared', '1');
    const audience = doc.visibility === 'privileged' ? 'privileged Hub members' : 'Hub staff';
    const text = `${doc.title} — sign in with an authorized Local Effort Google account. Available to ${audience}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: doc.title, text, url: url.toString() });
        setShareStatus('Share opened.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setShareStatus(`Link copied — ${audience} only.`);
      } else {
        window.prompt('Copy authenticated Hub document link', url.toString());
        setShareStatus(`Link ready — ${audience} only.`);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setShareStatus('Unable to share this link.');
    }
  };

  const createDoc = async (event) => {
    event.preventDefault();
    const data = await api('/api/hub/docs', accessToken, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    setDraft({ title: '', summary: '', body: '', category: 'sop', visibility: 'staff' });
    await reloadDocs();
    chooseDoc(data.document.id);
  };

  const startEditing = () => {
    if (!selected) return;
    setEditStatus('');
    setEditing({
      id: selected.id,
      title: selected.title,
      summary: selected.summary || '',
      body: selected.body || '',
      category: selected.category || 'general',
      visibility: selected.visibility,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setEditStatus('Saving...');
    try {
      const data = await api('/api/hub/docs', accessToken, {
        method: 'PUT',
        body: JSON.stringify(editing),
      });
      setSelected(data.document);
      setEditing(null);
      setEditStatus('');
      await reloadDocs();
    } catch (err) {
      setEditStatus(err.message || 'Unable to save the document.');
    }
  };

  return (
    <div className="hub-doc-layout">
      <Panel title="Documents" icon={FileText}>
        <div className="hub-list">
          {docs.length === 0 && <p className="hub-empty">No documents yet.</p>}
          {docs.map((doc) => (
            <div className="hub-doc-list-row" key={doc.id}>
              <button className={`hub-row hub-row-button ${selectedId === doc.id ? 'is-active' : ''}`} onClick={() => chooseDoc(doc.id)}>
                <strong>{doc.title}</strong>
                <span>{doc.category} / {doc.visibility}</span>
              </button>
              <button className="hub-doc-share-button" type="button" onClick={() => shareDoc(doc)} aria-label={`Share ${doc.title}`} title={`Share with ${doc.visibility === 'privileged' ? 'privileged Hub members' : 'Hub staff'}`}>
                <Share2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title={selected?.title || 'Document'}
        icon={FileText}
        action={selected && !editing && (
          <div className="hub-button-row">
            {canEdit && (
              <button type="button" onClick={startEditing}>Edit</button>
            )}
            <button type="button" onClick={() => shareDoc(selected)}>
              <Share2 size={13} aria-hidden="true" /> Share
            </button>
          </div>
        )}
      >
        {selected && editing ? (
          <form className="hub-form" onSubmit={saveEdit}>
            <Field label="Title"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
            <Field label="Summary"><input value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></Field>
            <Field label="Category"><input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
            {isPrivileged && (
              <Field label="Visibility">
                <select value={editing.visibility} onChange={(e) => setEditing({ ...editing, visibility: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="privileged">Privileged</option>
                </select>
              </Field>
            )}
            <Field label="Body"><textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={14} required /></Field>
            {editStatus && <p className="hub-share-status" role="status">{editStatus}</p>}
            <div className="hub-button-row">
              <button className="hub-primary-button" type="submit" disabled={editStatus === 'Saving...'}>
                {editStatus === 'Saving...' ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" onClick={() => { setEditing(null); setEditStatus(''); }}>Cancel</button>
            </div>
          </form>
        ) : selected ? (
          <article className="hub-doc-body">
            <p className="hub-doc-summary">{selected.summary}</p>
            <pre>{selected.body}</pre>
            <div className="hub-doc-access-note">
              <ShieldCheck size={13} aria-hidden="true" />
              {selected.visibility === 'privileged' ? 'Privileged Hub members only' : 'Signed-in Hub staff'}
            </div>
            {shareStatus && <p className="hub-share-status" role="status">{shareStatus}</p>}
          </article>
        ) : loadError ? (
          <div className="hub-doc-denied">
            <ShieldCheck size={22} aria-hidden="true" />
            <p>{loadError}</p>
          </div>
        ) : (
          <p className="hub-empty">Choose a document.</p>
        )}
      </Panel>
      {isPrivileged && (
        <Panel title="Publish Document" icon={Plus}>
          <form className="hub-form" onSubmit={createDoc}>
            <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Summary"><input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
            <Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Visibility">
              <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="privileged">Privileged</option>
              </select>
            </Field>
            <Field label="Body"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={8} required /></Field>
            <button className="hub-primary-button" type="submit"><Plus size={13} /> Publish</button>
          </form>
        </Panel>
      )}
    </div>
  );
}

