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

/**
 * formatFechaHora — formatea fechas a "DD/MM/YYYY" (o "DD/MM/YYYY HH:MM:SS"
 * si hay hora) reconociendo dos formatos del backend:
 *   - ISO:  "2026-02-26", "2026-02-26T11:02:21", "2026-02-26 11:02:21"
 *   - US:   "2/26/2026", "2/26/2026 11:02:21 AM"  (M/D/YYYY, hora 12h opcional)
 *
 * No usa `new Date(str)` a propósito: extrae los componentes con regex para
 * evitar corrimientos de día por zona horaria. Si el valor no es una fecha
 * reconocible se devuelve tal cual.
 */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const US_RE  = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i;
const p2 = (n) => String(n).padStart(2, "0");

export function formatFechaHora(value) {
  if (value === null || value === undefined || value === "") return value;
  const s = String(value).trim();

  let yyyy, mm, dd, hh, mi, ss, ampm;
  const iso = s.match(ISO_RE);
  if (iso) {
    [, yyyy, mm, dd, hh, mi, ss] = iso;
  } else {
    const us = s.match(US_RE);
    if (!us) return value; // no es fecha reconocible → tal cual
    [, mm, dd, yyyy, hh, mi, ss, ampm] = us;
    if (hh !== undefined && ampm) {
      let h = Number(hh) % 12;         // 12h → 24h
      if (ampm.toUpperCase() === "PM") h += 12;
      hh = h;
    }
  }

  const fecha = `${p2(dd)}/${p2(mm)}/${yyyy}`;
  if (hh === undefined) return fecha;
  return `${fecha} ${p2(hh)}:${p2(mi)}:${p2(ss ?? 0)}`;
}
