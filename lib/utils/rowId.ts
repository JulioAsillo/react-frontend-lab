/**
 * rowId.ts — Implementación CANÓNICA del hash FNV-1a de fila.
 *
 * ⚠️ INVARIANTE CRÍTICO ⚠️
 * Este hash es la clave de identidad de cada fila en las validaciones
 * guardadas en localStorage (useValidaciones) y en los generadores de
 * Excel/informe. Cualquier cambio en el algoritmo, el orden de claves,
 * los separadores (\u0001 / \u0002) o el formato de salida (8 chars hex)
 * HUÉRFANA todas las validaciones ya guardadas por los certificadores.
 *
 * Antes de este módulo existían 9 copias byte-idénticas repartidas en:
 *   useValidaciones.ts, DataTableUsuarios/Perfiles/Privilegiados,
 *   informeCalculo, informePerfilesCalculo, informePrivilegiadosCalculo,
 *   buildPerfilesExcel, buildPrivilegiadosExcel.
 * Ahora TODAS importan de aquí — una sola fuente de verdad garantiza que
 * el hash no pueda divergir entre consumidores.
 *
 * NO MODIFICAR sin un plan de migración de las claves persistidas.
 */

/** Hash FNV-1a 32-bit → 8 chars hex. Determinista. */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Id estable de una fila: claves ordenadas alfabéticamente, concatenadas
 * como `clave\u0001valor\u0002` y hasheadas con FNV-1a.
 * null/undefined se serializan como cadena vacía.
 */
export function rowIdFnv(row: Record<string, unknown>): string {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? "" : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, "0");
}
