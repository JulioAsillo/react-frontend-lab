/**
 * collections.js — Helpers para fuentes BD con múltiples colecciones
 * (ej. GDH: gdh_activos + gdh_cesados). Extraídos de FuenteDetallePriv.
 */

/**
 * Deriva { rows, collections } de lo guardado en IndexedDB.
 *   array               → { rows, collections: null }
 *   { key:[...] } (1)   → { rows: [...], collections: null }
 *   { a:[...], b:[...] } → { rows: primera, collections: { a, b } }
 * Si `src.dataKey` apunta a una clave válida, se prefiere esa colección.
 */
export function splitStored(stored, src) {
  if (Array.isArray(stored)) return { rows: stored, collections: null };
  if (!stored || typeof stored !== "object") return { rows: [], collections: null };
  if (typeof src?.dataKey === "string" && Array.isArray(stored[src.dataKey])) {
    return { rows: stored[src.dataKey], collections: null };
  }
  const entries = Object.entries(stored).filter(([, v]) => Array.isArray(v));
  if (entries.length === 0) return { rows: [], collections: null };
  if (entries.length === 1) return { rows: entries[0][1], collections: null };
  return { rows: entries[0][1], collections: Object.fromEntries(entries) };
}

/** Etiqueta legible de una colección (gdh_activos → Activos). */
export function prettyColl(k) {
  return String(k).replace(/^gdh[_\s-]?/i, "").replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase()).trim() || String(k);
}
