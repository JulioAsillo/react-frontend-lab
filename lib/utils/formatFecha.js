/**
 * formatFecha.js
 *
 * Formatea fechas ISO (las que devuelve el backend: "2024-05-01",
 * "2024-05-01T00:00:00", con o sin timezone) a "DD-MM-YYYY", sin horas.
 *
 * Deliberadamente NO usa `new Date(str)` + `.getDate()/.getMonth()`: eso
 * interpreta la fecha en la zona horaria local del navegador y puede
 * correr el día ±1 según el timezone del usuario. Se extraen los
 * componentes directo del string ISO para evitar ese corrimiento.
 *
 * Si el valor no matchea el patrón ISO (ej. ya es texto, es null, es un
 * nombre, etc.) se devuelve tal cual — no se fuerza el formato sobre
 * columnas que no son fecha.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * @param {*} value
 * @returns {*} "DD-MM-YYYY" si `value` es una fecha ISO reconocible, o el
 *   valor original sin modificar en cualquier otro caso (incluye null/undefined).
 */
export function formatFechaDDMMYYYY(value) {
  if (value === null || value === undefined) return value;
  const s = String(value).trim();
  const m = s.match(ISO_DATE_RE);
  if (!m) return value;
  const [, yyyy, mm, dd] = m;
  return `${dd}-${mm}-${yyyy}`;
}
