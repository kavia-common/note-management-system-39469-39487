import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './theme.css';
import { fetchNotes, fetchNote, createNote, updateNote, deleteNote } from './services/api';
import { debounce, formatDateISO } from './utils';

/**
 * PUBLIC_INTERFACE
 * App is the main Notes application component. It renders:
 * - Header with brand and actions
 * - Sidebar with searchable note list
 * - Main area for viewing and editing a note
 * Persistence is done against a backend if REACT_APP_API_BASE or REACT_APP_BACKEND_URL is set,
 * otherwise localStorage is used as a fallback.
 */
function App() {
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [theme, setTheme] = useState('light');
  const [editing, setEditing] = useState({ title: '', content: '' });

  // Load notes on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchNotes();
        if (!cancelled) {
          setNotes(data);
          // select first by default
          if (data.length > 0) {
            setActiveId(data[0].id);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load notes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep theme on document
  useEffect(() => {
    document.documentElement.style.background = 'var(--bg)';
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Update local editing state when active note changes
  useEffect(() => {
    if (!activeId) {
      setEditing({ title: '', content: '' });
      return;
    }
    // try find note from in-memory list first
    const local = notes.find(n => n.id === activeId);
    if (local) {
      setEditing({ title: local.title, content: local.content });
      return;
    }
    // otherwise fetch
    let cancelled = false;
    (async () => {
      try {
        const n = await fetchNote(activeId);
        if (!cancelled && n) {
          setEditing({ title: n.title, content: n.content });
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load note');
      }
    })();
    return () => { cancelled = true; };
  }, [activeId, notes]);

  // Filtered notes based on search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  // Create Note
  const handleCreate = async () => {
    setErr('');
    try {
      setSaving(true);
      const newN = await createNote({ title: 'Untitled', content: '' });
      setNotes(prev => [newN, ...prev]);
      setActiveId(newN.id);
      setEditing({ title: newN.title, content: newN.content });
    } catch (e) {
      setErr(e.message || 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  // Delete Note
  const handleDelete = async (id) => {
    if (!id) return;
    const confirm = window.confirm('Delete this note? This cannot be undone.');
    if (!confirm) return;
    setErr('');
    try {
      setSaving(true);
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      // select next note if available
      const remaining = notes.filter(n => n.id !== id);
      setActiveId(remaining.length ? remaining[0].id : null);
      if (!remaining.length) setEditing({ title: '', content: '' });
    } catch (e) {
      setErr(e.message || 'Failed to delete note');
    } finally {
      setSaving(false);
    }
  };

  // Save note changes (debounced)
  const doSave = useCallback(async (id, patch) => {
    if (!id) return;
    try {
      setSaving(true);
      const updated = await updateNote(id, patch);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updated } : n));
    } catch (e) {
      setErr(e.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }, []);
  const debouncedSave = useMemo(() => debounce(doSave, 500), [doSave]);

  const handleFieldChange = (field, value) => {
    setEditing(prev => {
      const next = { ...prev, [field]: value };
      if (activeId) {
        debouncedSave(activeId, { [field]: value });
      }
      return next;
    });
  };

  const activeNote = useMemo(
    () => notes.find(n => n.id === activeId) || null,
    [notes, activeId]
  );

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="header">
        <div className="brand">
          <div className="brand-badge" aria-hidden>🗒️</div>
          <div>
            <div className="brand-title">Ocean Notes</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Quick. Simple. Professional.</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            + New Note
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="section-title">Your Notes</div>
        <div className="surface-card" style={{ padding: 12, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notes"
          />
        </div>
        {loading ? (
          <div className="surface-card">Loading notes…</div>
        ) : (
          <div className="note-list">
            {filtered.map(n => (
              <button
                key={n.id}
                className={`note-list-item ${activeId === n.id ? 'active' : ''}`}
                onClick={() => setActiveId(n.id)}
                aria-label={`Open note ${n.title || 'Untitled'}`}
              >
                <div className="w-100">
                  <p className="title m-0">{n.title || 'Untitled'}</p>
                  <div className="meta">
                    <span className="note-badge">Updated</span> {formatDateISO(n.updatedAt)}
                  </div>
                </div>
              </button>
            ))}
            {!filtered.length && (
              <div className="surface-card">No notes found. Create a new one!</div>
            )}
          </div>
        )}
      </aside>

      <main className="main">
        {err && (
          <div className="surface-card" style={{ borderColor: 'var(--error)', color: 'var(--error)', marginBottom: 12 }}>
            {err}
          </div>
        )}
        {!activeId ? (
          <div className="surface-card note-empty">
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>Welcome to Ocean Notes</div>
              <div style={{ color: 'var(--muted)' }}>Select a note from the left or create a new one.</div>
              <div className="mt-16">
                <button className="btn btn-primary" onClick={handleCreate}>Create your first note</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="surface-card">
            <div className="toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="note-badge">Editing</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {activeNote ? `Last updated ${formatDateISO(activeNote.updatedAt)}` : ''}
                </span>
              </div>
              <div className="flex gap-10">
                <button
                  className="btn"
                  onClick={() => setActiveId(null)}
                  title="Close"
                >
                  Close
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(activeId)}
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            </div>
            <input
              className="input"
              value={editing.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Note title"
              aria-label="Note title"
            />
            <textarea
              className="textarea mt-12"
              value={editing.content}
              onChange={(e) => handleFieldChange('content', e.target.value)}
              placeholder="Write your note here..."
              aria-label="Note content"
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
