/**
 * sheets.js — Helpers canónicos para respuestas multi-hoja del backend.
 *
 * Antes existían 6 copias de normalizeSheets (con el alias normalizeTabs en
 * DataTablePerfiles) y 4 de toSheetSlug. Todas eran behaviorally idénticas;
 * este módulo es ahora la única fuente de verdad.
 *
 * ⚠️ toSheetSlug es parte de las claves de localStorage de validaciones:
 *   `${persistKey}-priv-val-${slug}-val-${scenarioKey}`  (Privilegiados)
 *   `${persistKey}-prf-val-${slug}-${scenarioKey}`       (Perfiles)
 * NO cambiar el algoritmo del slug: huérfana las validaciones guardadas.
 */

/**
 * Normaliza rawData del backend → { sheetKey: rows[] }.
 *   - Array plano          → { Principal: [...] }   (vacío → {})
 *   - { data:[], x:[] }    → solo las claves cuyo valor es array
 *   - cualquier otra cosa  → {}
 */
export function normalizeSheets(rawData) {
  if (!rawData) return {};
  if (Array.isArray(rawData)) return rawData.length ? { Principal: rawData } : {};
  if (typeof rawData !== "object") return {};
  const result = {};
  for (const [k, v] of Object.entries(rawData)) {
    if (Array.isArray(v)) result[k] = v;
  }
  return result;
}

/** Slug de sheetKey: minúsculas, espacios → '-', solo [a-z0-9-]. */
export function toSheetSlug(s) {
  return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
