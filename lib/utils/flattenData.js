/**
 * flattenData — normaliza CUALQUIER forma de respuesta del API a un array plano.
 *
 * Casos manejados:
 *   []                     → devuelve tal cual
 *   { data: [] }           → devuelve data
 *   { DB_SDP: [], ... }    → aplana todos los arrays
 *   null / undefined       → []
 *   string / number        → []
 *   {} (vacío)             → []
 */
export function flattenData(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];

  // Wrapper { data: [...] }
  if (Array.isArray(raw.data)) return raw.data;

  // Multi-tab: objeto cuyos valores son arrays { Key: [...] }
  const vals = Object.values(raw);
  if (vals.length > 0 && Array.isArray(vals[0])) {
    return vals.flat();
  }

  return [];
}
