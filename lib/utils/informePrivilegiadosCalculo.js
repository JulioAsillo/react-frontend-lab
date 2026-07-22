'use client';

/**
 * informePrivilegiadosCalculo
 *
 * Calcula automáticamente todos los campos del Informe de Privilegiados.
 *
 * ── CORRECCIONES (antes daba todo en 0) ──────────────────────────────
 * 1. CLAVE IDB DE HALLAZGOS: antes leía 'priv-data-priv-windows' (mezcla
 * inválida). La clave real que escribe reportesStore es
 * `${persistKey}-data` → 'priv-windows-data', 'priv-linux-data', etc.
 * 2. CLAVE DE VALIDACIONES: debe replicar EXACTO lo que arma useValidaciones
 * vía DataTablePrivilegiados:
 * valPfx = `${persistKey}-priv-val-${slug}`
 * storeKey = `${valPfx}-val-${scenario}`
 * → `${persistKey}-priv-val-${slug}-val-${scenario}` (doble «-val-»)
 * Además, los reportes de UNA sola hoja (array) se normalizan a
 * { Principal: [...] } → slug = 'principal' (no '').
 * 3. PORCENTAJES ( — fórmula de CUMPLIMIENTO confirmada por Julio):
 * pct_X_activos_correctos_priv = 100 − (hallazgos Cesado Activo / total) × 100
 * pct_X_id_priv = 100 − (hallazgos No Identificado / total) × 100
 * pct_X_auto_priv = "100%" (mock fijo)
 * Guarda: si total = 0 o no hay hallazgos → "100%" (no rompe la división).
 *
 * 4. MFA (nuevo hallazgo — un solo escenario "Validación", una hoja):
 * mfa_sinac_priv = nº de "Incorrecto" en el escenario Validación
 * pct_mfa_ac_co_priv = 100 − (mfa_sinac_priv / Total Activos GDH) × 100
 * Total Activos GDH = filas de la colección 'gdh_activos' (priv-data-gdh).
 *
 * @param bdFechas — Record<sourceId, fechaCorte> del uiStore.bdFechaCorte
 */

import { idbGetItem } from '@/lib/storage';
import { rowIdFnv } from '@/lib/utils/rowId';
import { normalizeSheets, toSheetSlug } from '@/lib/utils/sheets';

// ── Helpers ────────────────────────────────────────────────────────────────

function lsGetSafe(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// FNV-1a 32-bit — idéntico al de useValidaciones.ts
// rowIdFnv canónico en lib/utils/rowId.


// toSheetSlug canónico en lib/utils/sheets.


// normalizeSheets — idéntico a DataTablePrivilegiados.
// Array → { Principal: [...] }; objeto → solo claves cuyo valor es array.
// normalizeSheets canónico en lib/utils/sheets.


// ISO → DD/MM/YYYY
function fmtFecha(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

// Primer valor no vacío entre varios
function firstNonEmpty(...vals) {
  for (const v of vals) if (v && String(v).trim()) return v;
  return '';
}

const CORRECTO_SET = new Set(['correcto', 'sustentado']);

/**
 * Cuenta hallazgos de un escenario sobre un objeto de hojas ya normalizado.
 * Respeta validaciones manuales guardadas en localStorage por el usuario.
 * Devuelve { hallazgos, totalEscenario }.
 *
 * @param sheets      — { sheetKey: rows[] }
 * @param persistKey  — ej. 'priv-windows'
 * @param scenarioKey — 'Cesado Activo' | 'No Identificado' | 'Sin Sustento'
 * @param badgeCol    — columna badge del escenario (igual a scenarioKey aquí)
 */
function contarEscenarioSheets(sheets, persistKey, scenarioKey, badgeCol) {
  let hallazgos = 0;
  let totalEscenario = 0;

  for (const [sheetKey, rows] of Object.entries(sheets)) {
    if (!rows?.length) continue;
    const slug     = toSheetSlug(sheetKey);
    const storeKey = `${persistKey}-priv-val-${slug}-val-${scenarioKey}`;
    const store    = lsGetSafe(storeKey) ?? {};

    const scenarioRows = rows.filter(r => {
      const v = r[badgeCol];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });
    totalEscenario += scenarioRows.length;

    for (const row of scenarioRows) {
      const stored = store[rowIdFnv(row)]?.validacion;
      // 1) Validación manual del usuario
      if (stored && String(stored).trim() !== '') {
        if (String(stored).trim().toLowerCase() === 'incorrecto') hallazgos++;
        continue;
      }
      // 2) Fallback: valor del badgeCol (no-Correcto = hallazgo)
      const raw = row[badgeCol];
      const lower = String(raw).trim().toLowerCase();
      if (!CORRECTO_SET.has(lower)) hallazgos++;
    }
  }
  return { hallazgos, totalEscenario };
}

// Total de registros del reporte = suma de filas de todas las hojas.
function totalRegistros(sheets) {
  return Object.values(sheets).reduce((acc, rows) => acc + (rows?.length ?? 0), 0);
}

const CESADO = 'Cesado Activo';
const NOID   = 'No Identificado';
const SINSUS = 'Sin Sustento';

// Porcentaje de CUMPLIMIENTO = 100 − (hallazgos / total) × 100. 2 decimales.
// Guarda: si total es 0 (no rompe la división) o no hay hallazgos → 100%.
function pctCumpl(n, total) {
  if (!total) return '100%';
  const pct = Math.max(0, 100 - (n / total) * 100);
  return pct.toFixed(2) + '%';
}

// ── Export principal ───────────────────────────────────────────────────────

export async function calcularCamposAutomaticosPrivilegiados(bdFechas = {}) {
  const out = {};

  // ── 1. Fechas de corte (desde uiStore.bdFechaCorte por sourceId) ────────
  const get = id => bdFechas[id] || '';

  out.fc_windows_priv  = fmtFecha(get('server-windows'));
  out.fc_linux_priv    = fmtFecha(get('server-linux'));
  out.fc_apps_priv     = fmtFecha(firstNonEmpty(
    get('app-exactus'), get('app-npac'), get('app-sdp'), get('app-sit')
  ));
  out.fc_sysadmin_priv = fmtFecha(get('dba-sit'));
  out.fc_dba_priv      = fmtFecha(firstNonEmpty(get('dba-exactus'), get('dba-sdp')));
  out.fc_domain_priv   = fmtFecha(get('domain-admin'));
  out.fc_local_priv    = fmtFecha(get('local-admin'));
  out.fc_gdh_priv      = fmtFecha(get('gdh'));
  out.fc_mr_priv       = fmtFecha(get('prf-matriz-rol'));
  out.fc_mfa_priv      = fmtFecha(get('mfa'));
  out.fc_infra_priv    = fmtFecha(firstNonEmpty(get('domain-admin'), get('local-admin')));
  out.fc__priv         = fmtFecha(get('ad'));

  // ── 2. Cargar hallazgos desde IDB (clave correcta: `${persistKey}-data`) ─
  const [
    rawWindows, rawLinux, rawDba, rawSys,
    rawDomain,  rawLocal, rawApps, rawMfa, rawGdhBD,
  ] = await Promise.all([
    idbGetItem('priv-windows-data'),
    idbGetItem('priv-linux-data'),
    idbGetItem('priv-dba-data'),
    idbGetItem('priv-sysadmin-data'),
    idbGetItem('priv-domain-admin-data'),
    idbGetItem('priv-local-admin-data'),
    idbGetItem('priv-apps-data'),
    idbGetItem('priv-mfa-data'),       // hallazgo MFA (reportesStore)
    idbGetItem('priv-data-gdh'),       // recopilación BD GDH (cargarFuente)
  ]);

  // Helper para reportes "simples" (Cesado + NoId, opcional SinSus).
  function bloque(rawData, persistKey, { conSinSus = false } = {}) {
    const sheets   = normalizeSheets(rawData);
    const total    = totalRegistros(sheets);
    const cesados  = contarEscenarioSheets(sheets, persistKey, CESADO, CESADO).hallazgos;
    const noid     = contarEscenarioSheets(sheets, persistKey, NOID,   NOID).hallazgos;
    const sinsus   = conSinSus
      ? contarEscenarioSheets(sheets, persistKey, SINSUS, SINSUS).hallazgos
      : 0;
    return { total, cesados, noid, sinsus };
  }

  // ── 3. Windows (CFG_A) ──────────────────────────────────────────────────
  {
    const { total, cesados, noid } = bloque(rawWindows, 'priv-windows');
    out.windows_cesados_priv     = String(cesados);
    out.windows_noid_sinsus_priv = String(noid);
    out.Windows_noid_sinsus_priv = String(noid); // typo template (mayúscula)
    out.pct_windows_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_windows_id_priv                = pctCumpl(noid,    total);
    out.pct_windows_auto_priv              = '100%';
  }

  // ── 4. Linux (CFG_A) ────────────────────────────────────────────────────
  {
    const { total, cesados, noid } = bloque(rawLinux, 'priv-linux');
    out.linux_cesados_priv     = String(cesados);
    out.linux_noid_sinsus_priv = String(noid);
    out.Linux_noid_sinsus_priv = String(noid); // typo template (mayúscula)
    out.pct_linux_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_linux_id_priv                = pctCumpl(noid,    total);
    out.pct_linux_auto_priv              = '100%';
  }

  // ── 5. DBA (CFG_A, 2 hojas: DB SDP + DB Exactus → ya sumadas) ───────────
  {
    const { total, cesados, noid } = bloque(rawDba, 'priv-dba');
    out.dba_cesados_priv = String(cesados);
    out.dba_sinid_priv   = String(noid);
    out.pct_dba_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_dba_id_priv                = pctCumpl(noid,    total);
    out.pct_dba_auto_priv              = '100%';
  }

  // ── 6. SysAdmin (CFG_A) ─────────────────────────────────────────────────
  {
    const { total, cesados, noid } = bloque(rawSys, 'priv-sysadmin');
    out.sys_cesados_priv = String(cesados);
    out.sys_sinid_priv   = String(noid);
    out.pct_sys_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_sys_id_priv                = pctCumpl(noid,    total);
    out.pct_sys_auto_priv              = '100%';
  }

  // ── 7. Domain Admin (CFG_C: Cesado + NoId + SinSus) ─────────────────────
  // domain_noid_sinsus_priv = NoId + SinSus (suma). pct_id usa SOLO NoId.
  {
    const { total, cesados, noid, sinsus } = bloque(rawDomain, 'priv-domain-admin', { conSinSus: true });
    out.domain_cesados_priv     = String(cesados);
    out.domain_noid_sinsus_priv = String(noid + sinsus);
    out.pct_domain_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_domain_id_priv                = pctCumpl(noid,    total);
    out.pct_domain_auto_priv              = '100%';
  }

  // ── 8. Local Admin (CFG_C) ──────────────────────────────────────────────
  {
    const { total, cesados, noid, sinsus } = bloque(rawLocal, 'priv-local-admin', { conSinSus: true });
    out.local_cesados_priv         = String(cesados);
    out['local_ noid_sinsus_priv'] = String(noid + sinsus); // typo template (espacio)
    out.pct_local_activos_correctos_priv = pctCumpl(cesados, total);
    out.pct_local_id_priv                = pctCumpl(noid,    total);
    out.pct_local_auto_priv              = '100%';
  }

  // ── 9. Apps Críticas (CFG_B, 4 hojas) — por tab ─────────────────────────
  // Cada app es una hoja; total y conteos son por-app (no globales).
  {
    const sheetsApps = normalizeSheets(rawApps);
    const appsTabs = [
      { campo: 'exactus', match: ['app exactus', 'exactus', 'app_exactus'] },
      { campo: 'sdp',     match: ['app sdp',     'sdp',     'app_sdp']     },
      { campo: 'sit',     match: ['app sit',     'sit',     'app_sit']     },
      { campo: 'npac',    match: ['app npac',    'npac',    'app_npac']    },
    ];
    const norm = s => String(s).toLowerCase().replace(/[\s_-]+/g, ' ').trim();

    for (const { campo, match } of appsTabs) {
      // Encontrar la hoja de esta app
      const sheetKey = Object.keys(sheetsApps).find(k => match.includes(norm(k)));
      const subset   = sheetKey ? { [sheetKey]: sheetsApps[sheetKey] } : {};
      const total    = totalRegistros(subset);
      const cesados  = contarEscenarioSheets(subset, 'priv-apps', CESADO, CESADO).hallazgos;
      const noid     = contarEscenarioSheets(subset, 'priv-apps', NOID,   NOID).hallazgos;

      out[`apps_${campo}_cesados_priv`]     = String(cesados);
      out[`apps_${campo}_noid_sinsus_priv`] = String(noid);
      out[`pct_apps_${campo}_activos_correctos_priv`] = pctCumpl(cesados, total);
      out[`pct_apps_${campo}_id_priv`]                = pctCumpl(noid,    total);
      out[`pct_apps_${campo}_auto_priv`]              = '100%';
    }
  }

  // ── 10. MFA Genéricas (1 escenario "Validación", 1 hoja) ────────────────
  // Total Activos GDH = filas de la colección 'gdh_activos' en priv-data-gdh.
  {
    const VALIDACION = 'Validación';
    const sheetsMfa  = normalizeSheets(rawMfa);
    const mfaHall    = contarEscenarioSheets(sheetsMfa, 'priv-mfa', VALIDACION, VALIDACION).hallazgos;

    // Resolver "Total Activos GDH"
    let totalActivosGdh = 0;
    if (Array.isArray(rawGdhBD)) {
      totalActivosGdh = rawGdhBD.length;          // sin colecciones nombradas
    } else if (rawGdhBD && typeof rawGdhBD === 'object') {
      // Buscar la colección de activos (gdh_activos / activos / "activos gdh")
      const key = Object.keys(rawGdhBD).find(k => /activ/i.test(k) && Array.isArray(rawGdhBD[k]));
      if (key) totalActivosGdh = rawGdhBD[key].length;
      else {
        // Fallback: sumar colecciones array que NO sean cesados
        totalActivosGdh = Object.entries(rawGdhBD)
          .filter(([k, v]) => Array.isArray(v) && !/cesad/i.test(k))
          .reduce((a, [, v]) => a + v.length, 0);
      }
    }

    out.mfa_sinac_priv     = String(mfaHall);
    out.pct_mfa_ac_co_priv = pctCumpl(mfaHall, totalActivosGdh);
  }

  return out;
}

/**
 * Campos calculados automáticamente — el formulario debe deshabilitar su edición.
 */
export const CAMPOS_AUTO_PRIVILEGIADOS = new Set([
  // Fechas
  'fc__priv', 'fc_windows_priv', 'fc_linux_priv', 'fc_apps_priv',
  'fc_sysadmin_priv', 'fc_dba_priv', 'fc_domain_priv', 'fc_local_priv',
  'fc_gdh_priv', 'fc_mr_priv', 'fc_mfa_priv', 'fc_infra_priv',
  // Hallazgos Windows/Linux
  'windows_cesados_priv', 'windows_noid_sinsus_priv', 'Windows_noid_sinsus_priv',
  'linux_cesados_priv', 'linux_noid_sinsus_priv', 'Linux_noid_sinsus_priv',
  // DBA
  'dba_cesados_priv', 'dba_sinid_priv',
  // SysAdmin
  'sys_cesados_priv', 'sys_sinid_priv',
  // Domain / Local
  'domain_cesados_priv', 'domain_noid_sinsus_priv',
  'local_cesados_priv', 'local_ noid_sinsus_priv',
  // Apps
  'apps_exactus_cesados_priv', 'apps_exactus_noid_sinsus_priv',
  'apps_sdp_cesados_priv',     'apps_sdp_noid_sinsus_priv',
  'apps_sit_cesados_priv',     'apps_sit_noid_sinsus_priv',
  'apps_npac_cesados_priv',    'apps_npac_noid_sinsus_priv',
  // MFA
  'mfa_sinac_priv', 'pct_mfa_ac_co_priv',
  // Porcentajes
  'pct_windows_activos_correctos_priv', 'pct_windows_auto_priv', 'pct_windows_id_priv',
  'pct_linux_activos_correctos_priv',   'pct_linux_auto_priv',   'pct_linux_id_priv',
  'pct_dba_activos_correctos_priv',     'pct_dba_auto_priv',     'pct_dba_id_priv',
  'pct_sys_activos_correctos_priv',     'pct_sys_auto_priv',     'pct_sys_id_priv',
  'pct_domain_activos_correctos_priv',  'pct_domain_auto_priv',  'pct_domain_id_priv',
  'pct_local_activos_correctos_priv',   'pct_local_auto_priv',   'pct_local_id_priv',
  'pct_apps_exactus_activos_correctos_priv', 'pct_apps_exactus_auto_priv', 'pct_apps_exactus_id_priv',
  'pct_apps_sdp_activos_correctos_priv',     'pct_apps_sdp_auto_priv',     'pct_apps_sdp_id_priv',
  'pct_apps_sit_activos_correctos_priv',     'pct_apps_sit_auto_priv',     'pct_apps_sit_id_priv',
  'pct_apps_npac_activos_correctos_priv',    'pct_apps_npac_auto_priv',    'pct_apps_npac_id_priv',
]);
