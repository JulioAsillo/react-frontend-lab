/**
 * badgeValueMap.js
 *
 * Pintado de celdas basado en el VALOR de la celda, no en el nombre de la
 * columna. Reemplaza el patrón anterior (Set de nombres de columna
 * hardcodeado en badgeCols.js) para el módulo "usuarios".
 *
 * Por qué: los 5 backends de Certificación de Usuarios (AD, Entra ID, Apps
 * Críticas, Base de Datos, Preliminares) SIEMPRE devuelven uno de estos 3
 * pares de valores en sus columnas de hallazgo/estado:
 *   - "Correcto" / "Incorrecto"  (todas las columnas de validación/escenario)
 *   - "Si" / "No"                (activoGDH, cesadoGDH)
 *   - "Activo" / "Bloqueado"     (Estado)
 *
 * Con esto, NO hace falta mantener una lista de nombres de columna: si el
 * backend agrega una columna nueva (ej. "Usr NuevaApp") que trae estos
 * mismos valores, se pinta automáticamente sin tocar ningún archivo del
 * frontend.
 *
 * Alcance actual: SOLO módulo "usuarios" (ver moduleKey === "usuarios" en
 * Badge.jsx). Perfiles y Privilegiados siguen con el Set legacy de
 * badgeCols.js hasta que se decida migrarlos.
 */

// valor normalizado (minúsculas, trim) → clase CSS (definidas en globals.css)
export const VALUE_COLOR_MAP = {
  "correcto":   "ok",
  "incorrecto": "inc",
  "activo":     "activo",
  "bloqueado":  "bloq",
  "sustentado": "sust",
  "si":         "ok",
  "no":         "bloq",
};

/**
 * Devuelve la clase de color para un valor, o null si el valor no es
 * reconocido (en cuyo caso el llamador debe renderizar texto plano, NO un
 * color por defecto — a diferencia del Badge.jsx anterior, que pintaba
 * naranja "sustentado" cualquier valor desconocido).
 * @param {*} value
 * @returns {string|null}
 */
export function resolveValueBadgeClass(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim().toLowerCase();
  if (v === "") return null;
  return VALUE_COLOR_MAP[v] ?? null;
}
