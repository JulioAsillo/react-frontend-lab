/**
 * payload.ts — Helpers de normalización de respuestas del backend.
 *
 * Antes estaban DUPLICADOS de forma idéntica en:
 *   - lib/store/uiStore.ts
 *   - components/admin/usuarios/recopilacion/FuenteDetalle.jsx
 * Ahora son la única fuente de verdad (tipados, usables desde JS y TS).
 */

/** Busca recursivamente una fecha de corte (`fecha_corte` o `fechaCorte`). */
export function findFechaCorte(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.fecha_corte === 'string' && p.fecha_corte.trim()) return p.fecha_corte;
  if (typeof p.fechaCorte === 'string' && p.fechaCorte.trim()) return p.fechaCorte;
  for (const value of Object.values(p)) {
    if (!value || typeof value !== 'object') continue;
    const nested = findFechaCorte(value);
    if (nested) return nested;
  }
  return null;
}

/** Resuelve la(s) colección(es) de filas, soportando todas las formas del backend. */
export function resolveCollectionRows(payload: unknown): unknown[] | Record<string, unknown[]> {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.rows)) return p.rows as unknown[];
  const data = p.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as unknown[];
  if (typeof data !== 'object') return [];
  const entries = Object.entries(data as Record<string, unknown>).filter(([, v]) => Array.isArray(v));
  if (entries.length === 0) return [];
  if (entries.length === 1) return entries[0][1] as unknown[];
  return Object.fromEntries(entries) as Record<string, unknown[]>;
}
