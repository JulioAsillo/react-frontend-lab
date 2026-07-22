/**
 * columnWidths.js — Anchos por defecto de columnas para tablas de fuentes BD.
 *
 * Dos estrategias explícitas (NO se unifican a propósito: cada una preserva
 * el comportamiento exacto del componente del que fue extraída):
 *   - buildDefaultWidths: heurística por nombre de columna (de FuenteDetalle).
 *   - buildSimpleWidths:  heurística por longitud (de FuenteDetallePriv /
 *     StandardTableView).
 */

/** Heurística detallada: anchos especiales por nombre + longitud del header. */
export function buildDefaultWidths(cols) {
  return Object.fromEntries(
    cols.map((col) => [
      col,
      col === "grupos"      ? 320
      : col === "id"        ? 280
      : col === "upn"       ? 240
      : col === "mail"      ? 220
      : col === "display_name" || col === "full_name" || col === "nombre" ? 200
      : col === "u_organizativa" || col === "funcion" ? 190
      : col.length >= 18    ? 220
      : col.length >= 12    ? 180
      : 150,
    ])
  );
}

/** Heurística simple: 220px si el nombre supera 20 chars, 150px si no. */
export function buildSimpleWidths(cols) {
  return Object.fromEntries(cols.map(col => [col, col.length > 20 ? 220 : 150]));
}
