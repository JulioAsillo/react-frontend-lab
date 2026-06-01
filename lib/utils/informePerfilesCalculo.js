'use client';

/**
 * informePerfilesCalculo — v24.7
 *
 * Calcula los campos automáticos del Informe de Certificación de Perfiles.
 *
 * Fuentes:
 *   - Datos crudos de hallazgos: IndexedDB bajo "{persistKey}-data"
 *   - Validaciones por escenario: localStorage "{persistKey}-prf-val-{scKey}"
 *   - Fechas de corte: uiStore.bdFechaCorte[sourceId]
 *
 * Mapa de campos → (persistKey, tabKey, columnaEscenario):
 *
 *   {gdh_rol_incorrecto_perfiles}  → prf-roles, tab "Roles", col "Existe en MR"
 *   {gdh_mr_no_existe_perfiles}    → prf-roles, tab "Roles", col "Validación Rol"
 *   {mov_rol_incorrecto_perfiles}  → prf-moviper, tab "Moviper", col "Validación Rol"
 *   {mov_mr_no_existe_perfiles}    → prf-moviper, tab "Moviper", col "Existe en MR"
 *   {apps_exactus_perfiles}        → prf-apps, tab "EXACTUS", col "ROl + Perfil" o "Perfil No Identificado"
 *   {apps_sdp_perfiles}            → prf-apps, tab "SDP"
 *   {apps_sit_perfiles}            → prf-apps, tab "SIT"
 *   {apps_npac_perfiles}           → prf-apps, tab "NPAC"
 *   {bd_exactus_perfiles}          → prf-dbs, tab "EXACTUS", col "Perfil No Identificado"
 *   {bd_sdp_perfiles}              → prf-dbs, tab "SDP"
 */

import { idbGetItem } from '@/lib/storage';

// ── Helpers ────────────────────────────────────────────────────────────────

function lsGetSafe(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// FNV-1a 32-bit — idéntico al de useValidaciones.ts
function rowIdFnv(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? '' : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, '0');
}

// Formatea fecha ISO → DD/MM/YYYY
function fmtFecha(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

/**
 * Obtiene las filas de una tab dentro de rawData.
 * rawData puede ser array (tab única) o { tabKey: rows[] }.
 */
function getRows(rawData, tabKey) {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  // Coincidencia exacta primero, luego case-insensitive
  if (Array.isArray(rawData[tabKey])) return rawData[tabKey];
  const target = tabKey.toLowerCase().replace(/[\s_-]/g, '');
  const found  = Object.keys(rawData).find(k =>
    k.toLowerCase().replace(/[\s_-]/g, '') === target
  );
  return found ? (rawData[found] ?? []) : [];
}

/**
 * scKey: slug de la tab usado en la clave de localStorage.
 * Replica la lógica de TabSheet en DataTablePerfiles:
 *   tabKey.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")
 */
function toScKey(tabKey) {
  return String(tabKey).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const VALIDACION_CORRECTO = new Set(['correcto', 'sustentado']);

/**
 * Cuenta las filas de una tab donde la columnaEscenario tiene hallazgo.
 * 
 * Lógica (misma cadena que DataTableRow + informeCalculo.js):
 *   1. Si el usuario guardó validación en localStorage → usar esa
 *   2. Si el valor de la columnaEscenario es canónico → usar ese
 *   3. Si el valor de la columnaEscenario es no-vacío y no-canónico → Incorrecto
 *
 * Solo cuenta como hallazgo si el resultado final es "incorrecto".
 */
function contarHallazgosPerfiles(rawData, persistKey, tabKey, columnaEscenario, scenarioKey) {
  const rows = getRows(rawData, tabKey);
  if (!rows.length) return 0;

  const sheetSlug = toScKey(tabKey);
  // Si hay scenarioKey (GDH/Moviper con sub-tabs): clave nueva {persistKey}-prf-{sheetSlug}-{scenarioKey}
  // Si no (Apps/DBs vista única): clave antigua {persistKey}-prf-val-{sheetSlug}
  const storeKey = scenarioKey
    ? `${persistKey}-prf-${sheetSlug}-${scenarioKey}`
    : `${persistKey}-prf-val-${sheetSlug}`;
  const store    = lsGetSafe(storeKey) ?? {};

  let count = 0;
  for (const row of rows) {
    const rowId    = rowIdFnv(row);
    const stored   = store[rowId]?.validacion;

    // 1. Valor guardado por el usuario
    if (stored && String(stored).trim() !== '') {
      if (String(stored).trim().toLowerCase() === 'incorrecto') count++;
      continue;
    }

    // 2 & 3. Valor de la columna de escenario
    const raw = row[columnaEscenario];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const lower = String(raw).trim().toLowerCase();
    if (!VALIDACION_CORRECTO.has(lower)) count++; // Incorrecto o cualquier valor ≠ correcto/sustentado
  }
  return count;
}

/**
 * Calcula TODOS los campos automáticos del informe de Perfiles.
 * @param bdFechas — Record<sourceId, fechaCorte> desde uiStore.bdFechaCorte
 */
export async function calcularCamposAutomaticosPerfiles(bdFechas = {}) {
  const out = {};

  // ── 1. Fechas de corte ─────────────────────────────────────────────────
  const get = (id) => bdFechas[id] || '';
  out.fecha_corte_gdh_perfiles     = fmtFecha(get('prf-gdh'))       || '';
  out.fecha_corte_ad_perfiles      = fmtFecha(get('prf-ad'))        || '';
  out.fecha_corte_mr_perfiles      = fmtFecha(get('prf-matriz-rol')) || '';
  out.fecha_corte_moviper_perfiles = fmtFecha(get('prf-moviper'))    || '';
  out.fecha_corte_apps_perfiles    = fmtFecha(
    get('prf-app-exactus') || get('prf-app-sdp') || get('prf-app-sit') || get('prf-app-npac')
  ) || '';
  out.fecba_corte_bd_perfiles      = fmtFecha(
    get('prf-db-sdp') || get('prf-db-exactus')
  ) || '';

  // ── 2. Datos crudos de hallazgos desde IDB ─────────────────────────────
  const [rawRoles, rawMoviper, rawApps, rawDbs] = await Promise.all([
    idbGetItem('prf-roles-data'),
    idbGetItem('prf-moviper-data'),
    idbGetItem('prf-apps-data'),
    idbGetItem('prf-dbs-data'),
  ]);

  // ── 3. GDH (Roles) ─────────────────────────────────────────────────────
  // Tab "Roles" en el JSON del backend
  // {gdh_rol_incorrecto_perfiles} → escenario "Existe en MR"
  // {gdh_mr_no_existe_perfiles}   → escenario "Validación Rol"
  out.gdh_rol_incorrecto_perfiles = String(
    contarHallazgosPerfiles(rawRoles, 'prf-roles', 'Roles', 'Existe en MR', 'existe-en-mr')
  );
  out.gdh_mr_no_existe_perfiles = String(
    contarHallazgosPerfiles(rawRoles, 'prf-roles', 'Roles', 'Validación Rol', 'validacion-rol')
  );

  // ── 4. Moviper ─────────────────────────────────────────────────────────
  // Tab "Moviper"
  // {mov_rol_incorrecto_perfiles} → escenario "Validación Rol"
  // {mov_mr_no_existe_perfiles}   → escenario "Existe en MR"
  out.mov_rol_incorrecto_perfiles = String(
    contarHallazgosPerfiles(rawMoviper, 'prf-moviper', 'Moviper', 'Validación Rol', 'validacion-rol')
  );
  out.mov_mr_no_existe_perfiles = String(
    contarHallazgosPerfiles(rawMoviper, 'prf-moviper', 'Moviper', 'Existe en MR', 'existe-en-mr')
  );

  // ── 5. Aplicaciones Críticas ───────────────────────────────────────────
  // Tabs: EXACTUS, SDP, SIT, NPAC
  // Escenario único: "Perfil No Identificado" (también "ROl + Perfil" pero es el mismo hallazgo)
  // Contamos "Perfil No Identificado" que es el escenario definitivo
  for (const [campo, tab] of [
    ['apps_exactus_perfiles', 'EXACTUS'],
    ['apps_sdp_perfiles',     'SDP'    ],
    ['apps_sit_perfiles',     'SIT'    ],
    ['apps_npac_perfiles',    'NPAC'   ],
  ]) {
    out[campo] = String(
      contarHallazgosPerfiles(rawApps, 'prf-apps', tab, 'Perfil No Identificado')
    );
  }

  // ── 6. Base de Datos ───────────────────────────────────────────────────
  for (const [campo, tab] of [
    ['bd_exactus_perfiles', 'EXACTUS'],
    ['bd_sdp_perfiles',     'SDP'    ],
  ]) {
    out[campo] = String(
      contarHallazgosPerfiles(rawDbs, 'prf-dbs', tab, 'Perfil No Identificado')
    );
  }

  // ── 7. Porcentajes de cumplimiento ─────────────────────────────────────
  // Fórmula: pct = 100% − (hallazgos / total_filas_de_la_hoja)
  // Si total = 0 → "N/A". Si hallazgos = 0 → "100.00%".
  function pctCumplimiento(hallazgos, rawData, persistKey, tabKey, columnaEscenario, scenarioKey) {
    const rows = getRows(rawData, tabKey);
    if (!rows || rows.length === 0) return 'N/A';
    const n = parseInt(hallazgos, 10);
    if (isNaN(n)) return 'N/A';
    const pct = Math.max(0, ((rows.length - n) / rows.length) * 100);
    return pct.toFixed(2) + '%';
  }

  // GDH: usa como total las filas de la tab Roles, hallazgo = sum de ambos escenarios
  const gdhTotal = getRows(rawRoles, 'Roles').length;
  const gdhH = parseInt(out.gdh_rol_incorrecto_perfiles, 10) + parseInt(out.gdh_mr_no_existe_perfiles, 10);
  out.pct_gdh_perfiles = gdhTotal > 0
    ? Math.max(0, ((gdhTotal - gdhH) / gdhTotal) * 100).toFixed(2) + '%'
    : 'N/A';

  // Moviper
  const movTotal = getRows(rawMoviper, 'Moviper').length;
  const movH = parseInt(out.mov_rol_incorrecto_perfiles, 10) + parseInt(out.mov_mr_no_existe_perfiles, 10);
  out.pct_mov_perfiles = movTotal > 0
    ? Math.max(0, ((movTotal - movH) / movTotal) * 100).toFixed(2) + '%'
    : 'N/A';

  // Apps
  for (const [pctCampo, hCampo, tab] of [
    ['pct_apps_sdp_perfiles',     'apps_sdp_perfiles',     'SDP'    ],
    ['pct_apps_exactus_perfiles', 'apps_exactus_perfiles', 'EXACTUS'],
    ['pct_apps_npac_perfiles',    'apps_npac_perfiles',    'NPAC'   ],
    ['pct_apps_sit_perfiles',     'apps_sit_perfiles',     'SIT'    ],
  ]) {
    out[pctCampo] = pctCumplimiento(out[hCampo], rawApps, 'prf-apps', tab);
  }

  // BD
  for (const [pctCampo, hCampo, tab] of [
    ['pct_bd_sdp_perfiles',     'bd_sdp_perfiles',     'SDP'    ],
    ['pct_bd_exactus_perfiles', 'bd_exactus_perfiles', 'EXACTUS'],
  ]) {
    out[pctCampo] = pctCumplimiento(out[hCampo], rawDbs, 'prf-dbs', tab);
  }

  return out;
}

/**
 * Lista de campos calculados automáticamente (para deshabilitar edición en el form).
 */
export const CAMPOS_AUTO_PERFILES = new Set([
  'fecha_corte_gdh_perfiles',
  'fecha_corte_ad_perfiles',
  'fecha_corte_mr_perfiles',
  'fecha_corte_moviper_perfiles',
  'fecha_corte_apps_perfiles',
  'fecba_corte_bd_perfiles',
  'gdh_rol_incorrecto_perfiles',
  'gdh_mr_no_existe_perfiles',
  'mov_rol_incorrecto_perfiles',
  'mov_mr_no_existe_perfiles',
  'apps_exactus_perfiles',
  'apps_sdp_perfiles',
  'apps_sit_perfiles',
  'apps_npac_perfiles',
  'bd_exactus_perfiles',
  'bd_sdp_perfiles',
  // Porcentajes automáticos (ítem 1 v25.2)
  'pct_gdh_perfiles',
  'pct_mov_perfiles',
  'pct_apps_sdp_perfiles',
  'pct_apps_exactus_perfiles',
  'pct_apps_npac_perfiles',
  'pct_apps_sit_perfiles',
  'pct_bd_sdp_perfiles',
  'pct_bd_exactus_perfiles',
]);
