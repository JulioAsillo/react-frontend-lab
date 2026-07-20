/**
 * sourceCols.js — utilidades para las fuentes de Recopilación (BD_SOURCES,
 * PRIV_BD_SOURCES, PERFILES_BD_SOURCES).
 *
 * Estándar de columnas (de ahora en adelante):
 *
 *   cols: [
 *     { key: "SAMACCOUNTNAME", label: "Cuenta AD" },   // key = nombre crudo del backend
 *     ...                                              // label = texto visible al cliente
 *   ]
 *
 * Retrocompatible: `cols` también puede seguir siendo `string[]` (fuentes viejas);
 * en ese caso el label sale del mapa global fieldLabels.
 *
 * `normalizeSource` convierte la fuente a la forma interna que consume el resto
 * del componente sin cambios: `cols` queda como `string[]` de keys y las
 * etiquetas se acumulan en `colLabels` ({ key: label }).
 */

export function colKeys(cols) {
  if (!Array.isArray(cols)) return [];
  return cols.map(c => (typeof c === "string" ? c : c.key));
}

export function normalizeSource(src) {
  if (!src) return src;
  const colLabels = { ...(src.colLabels || {}) };
  (src.cols || []).forEach(c => {
    if (c && typeof c === "object" && c.label) colLabels[c.key] = c.label;
  });
  return { ...src, cols: colKeys(src.cols), colLabels };
}
