import React, { useEffect, useRef, useState } from 'react';
import { parseBulletin, resolveBulletin, suggestLinks, applySuggestions } from '../../shared/home-bulletin.mjs';
import bulletinLinkRegistry from '../../shared/home-bulletin-links.json';
import '../styles/home-hero.css';

const renderNodes = (nodes, keyPrefix) => nodes.map((node, index) => {
  const key = `${keyPrefix}-${index}`;
  if (node.type === 'text') return node.text;
  if (node.type === 'code') return <code key={key}>{node.text}</code>;
  if (node.type === 'strong') return <strong key={key}>{renderNodes(node.children, key)}</strong>;
  if (node.type === 'em') return <em key={key}>{renderNodes(node.children, key)}</em>;
  // Site pages open in the same tab; only outside links open a new one.
  if (node.internal || !node.href.startsWith('https:')) return <a key={key} href={node.href}>{renderNodes(node.children, key)}</a>;
  return <a key={key} href={node.href} target="_blank" rel="noreferrer">{renderNodes(node.children, key)}</a>;
});

const renderBulletin = (markdown) => parseBulletin(markdown).map((block, index) => {
  const key = `bulletin-${index}`;
  if (block.type === 'spacer') return <div className="home-hero__spacer" key={key} />;
  const content = renderNodes(block.children, key);
  if (block.type === 'heading') { const Tag = `h${block.level}`; return <Tag key={key}>{content}</Tag>; }
  if (block.type === 'list') return <div className="home-hero__list-line" key={key}>– {content}</div>;
  if (block.type === 'quote') return <blockquote key={key}>{content}</blockquote>;
  return <p key={key}>{content}</p>;
});

/**
 * The markdown bulletin note and its admin editor. One note per `slug`
 * (see BULLETIN_SLUGS in backend/api/routes/homeBulletin.js). Everyone sees the
 * note; only an admin sees Edit, and the server re-checks the token on save.
 */
export default function Bulletin({ slug = 'home', isAdmin = false, accessToken = '', className = '' }) {
  const endpoint = `/api/home-bulletin?slug=${encodeURIComponent(slug)}`;
  const [bulletin, setBulletin] = useState('');
  const [facts, setFacts] = useState(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetch(endpoint).then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || typeof data.markdown !== 'string') return;
        setBulletin(data.markdown);
        setFacts(data.facts || null);
      })
      .catch(() => {});
  }, [endpoint]);

  // What Save stores: the draft plus every suggestion the admin did not remove,
  // exactly as the preview shows it. Live values stay as tokens so they never go stale.
  const toSave = suggestions ? applySuggestions(draft, suggestions) : draft;
  const preview = resolveBulletin(toSave, facts);
  // Suggestions carry text offsets, so any edit to the draft (typing or a toolbar button) retires them.
  useEffect(() => { setSuggestions(null); }, [draft]);

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ markdown: toSave }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save');
      setBulletin(data.markdown || '');
      if (data.facts) setFacts(data.facts);
      setEditing(false);
      setSuggestions(null);
      setStatus('Saved');
    } catch (error) {
      setStatus(error.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (before, after = '', placeholder = 'text') => {
    const input = textareaRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? start;
    const selected = draft.slice(start, end) || placeholder;
    setDraft(`${draft.slice(0, start)}${before}${selected}${after}${draft.slice(end)}`);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertLink = () => {
    const input = textareaRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? start;
    const selected = draft.slice(start, end);
    const selectedIsUrl = /^https?:\/\/\S+$/.test(selected);
    const label = selectedIsUrl ? 'link text' : selected || 'link text';
    const url = selectedIsUrl ? selected : 'https://';
    setDraft(`${draft.slice(0, start)}[${label}](${url})${draft.slice(end)}`);
    requestAnimationFrame(() => {
      input?.focus();
      // Select whichever half the editor still needs, so typing or pasting fills it in.
      const from = selectedIsUrl ? start + 1 : start + label.length + 3;
      input?.setSelectionRange(from, from + (selectedIsUrl ? label.length : url.length));
    });
  };

  return (
    <div className={`home-hero__bulletin ${className}`.trim()}>
      {editing ? (
        <div className="home-hero__editor">
          <div className="home-hero__format" aria-label="Formatting tools">
            <button type="button" aria-label="Bold" title="Bold" onClick={() => insertMarkdown('**', '**')}><strong>B</strong></button>
            <button type="button" aria-label="Italic" title="Italic" onClick={() => insertMarkdown('*', '*')}><em>I</em></button>
            <button type="button" onClick={() => insertMarkdown('## ', '', 'Heading')}>Heading</button>
            <button type="button" onClick={() => insertMarkdown('- ', '', 'List item')}>List</button>
            <button type="button" onClick={insertLink}>Link</button>
            <button type="button" onClick={() => { setSuggestions(suggestLinks(draft, bulletinLinkRegistry)); setStatus(''); }}>Auto-link</button>
          </div>
          <textarea ref={textareaRef} aria-label="Bulletin markdown" value={draft} onChange={(event) => setDraft(event.target.value)} rows={9} />
          <div className="home-hero__preview-label">Preview</div>
          <div className="home-hero__note home-hero__preview">{renderBulletin(preview.markdown)}</div>
          {preview.notes.map((note) => <p className="home-hero__suggest-note" key={`note-${note.line}`}>Line {note.line}. {note.reason}</p>)}
          {suggestions && (
            <div className="home-hero__suggestions">
              {suggestions.length === 0 ? <p className="home-hero__suggest-note">No more links to suggest.</p> : (
                <>
                  <ul>
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <span>“{suggestion.text}” links to {suggestion.label} ({suggestion.url})</span>
                        <button type="button" onClick={() => setSuggestions(suggestions.filter((other) => other.id !== suggestion.id))}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => { setDraft(applySuggestions(draft, suggestions)); setSuggestions(null); }}>Accept all</button>
                </>
              )}
            </div>
          )}
          <div className="home-hero__edit-actions">
            <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving' : 'Save'}</button>
            <button type="button" onClick={() => { setEditing(false); setSuggestions(null); setStatus(''); }}>Cancel</button>
            <span aria-live="polite">{status}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="home-hero__note">{renderBulletin(resolveBulletin(bulletin, facts).markdown)}</div>
          {isAdmin && <button type="button" className="home-hero__edit" onClick={() => { setDraft(bulletin); setEditing(true); }}>Edit</button>}
        </>
      )}
    </div>
  );
}
