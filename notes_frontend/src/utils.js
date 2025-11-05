 // PUBLIC_INTERFACE
export function formatDateISO(iso) {
  /** Format ISO date string to a human friendly short format */
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso || '';
  }
}

// PUBLIC_INTERFACE
export function debounce(fn, wait = 400) {
  /** Debounce helper. Returns a debounced function */
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
