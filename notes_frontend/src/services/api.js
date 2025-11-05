const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  ''
).trim();

const isBackendConfigured = !!API_BASE;

// Storage keys for local fallback
const LS_KEY = 'notes_app_items_v1';

/**
 * Read all notes from localStorage
 */
function lsReadAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local notes; resetting', e);
    localStorage.removeItem(LS_KEY);
    return [];
  }
}

/**
 * Write all notes to localStorage
 */
function lsWriteAll(notes) {
  localStorage.setItem(LS_KEY, JSON.stringify(notes));
}

/**
 * Normalize API note object shape
 */
function normalize(note) {
  // expect { id, title, content, updatedAt }
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    updatedAt: note.updatedAt ? new Date(note.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * PUBLIC_INTERFACE
 * Fetch all notes either from backend or localStorage.
 */
export async function fetchNotes() {
  /** Fetch all notes. Returns array of {id,title,content,updatedAt} */
  if (isBackendConfigured) {
    const res = await fetch(`${API_BASE.replace(/\/+$/,'')}/notes`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load notes (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalize) : [];
  }
  // local fallback
  return lsReadAll();
}

/**
 * PUBLIC_INTERFACE
 * Fetch a single note by id.
 */
export async function fetchNote(id) {
  /** Fetch a single note by id */
  if (isBackendConfigured) {
    const res = await fetch(`${API_BASE.replace(/\/+$/,'')}/notes/${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to load note ${id} (${res.status})`);
    return normalize(await res.json());
  }
  const all = lsReadAll();
  return all.find(n => n.id === id) || null;
}

/**
 * PUBLIC_INTERFACE
 * Create a new note.
 */
export async function createNote(note) {
  /** Create a note: {title, content} */
  if (isBackendConfigured) {
    const res = await fetch(`${API_BASE.replace(/\/+$/,'')}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(`Failed to create note (${res.status})`);
    return normalize(await res.json());
  }
  const all = lsReadAll();
  const now = new Date().toISOString();
  const newNote = {
    id: note.id || `n_${Math.random().toString(36).slice(2, 10)}`,
    title: note.title || 'Untitled',
    content: note.content || '',
    updatedAt: now,
  };
  all.unshift(newNote);
  lsWriteAll(all);
  return newNote;
}

/**
 * PUBLIC_INTERFACE
 * Update an existing note by id with partial fields.
 */
export async function updateNote(id, patch) {
  /** Update a note by id, patch: {title?, content?} */
  if (isBackendConfigured) {
    const res = await fetch(`${API_BASE.replace(/\/+$/,'')}/notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Failed to update note (${res.status})`);
    return normalize(await res.json());
  }
  const all = lsReadAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx === -1) throw new Error('Note not found');
  const now = new Date().toISOString();
  const updated = { ...all[idx], ...patch, updatedAt: now };
  all[idx] = updated;
  lsWriteAll(all);
  return updated;
}

/**
 * PUBLIC_INTERFACE
 * Delete a note by id.
 */
export async function deleteNote(id) {
  /** Delete note by id */
  if (isBackendConfigured) {
    const res = await fetch(`${API_BASE.replace(/\/+$/,'')}/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete note (${res.status})`);
    return true;
  }
  const all = lsReadAll();
  const next = all.filter(n => n.id !== id);
  lsWriteAll(next);
  return true;
}
