'use client';

/**
 * informeCalculo
 *
 * Auto-calcula los valores del Informe de Certificación a partir del estado
 * REAL guardado en localStorage / IndexedDB.
 *
 * Fuentes de datos:
 * - Fechas de corte de las 10 fuentes BD:
 * IndexedDB "bd-data-{id}-fc" → "2026-04-30"
 * - Validaciones por escenario:
 * localStorage "{persistKey}-val-{sheetSlug}-{scenarioKey}"
 * → { [rowId]: { validacion: "Incorrecto" | "Correcto" | "Sustentado", comentario } }
 *
 * Reglas de negocio (acordadas con Julio):
 * - El conteo de hallazgos del informe = nº de filas con `validacion === "Incorrecto"`.
 * Si una fila está marcada "Correcto" o "Sustentado", NO suma al informe.
 * "Sin validar" → tampoco suma (criterio: solo Incorrecto confirmado escala).
 * - {mes_anio} se deriva de la fecha de corte de cualquiera de las 5 fuentes
 * principales (gdh, ad, entra-id, db-sit/sdp/exactus, app-sit/sdp/npac/exactus).
 * Se toma la primera que tenga valor, en ese orden. Formato → "ABR26".
 * - Las fechas de corte de cada bloque se leen de la fuente correspondiente
 * con fallback en cascada si la primera está vacía.
 * - Los % de cumplimiento se mockean a "99.8%" (no hay fórmula definida aún).
 *
 * Mapeo sheetKey backend → sheetSlug localStorage:
 * "AD" → "ad"
 * "Entra ID" → "entra-id"
 * "App EXACTUS" → "app-exactus"
 * "App SDP" → "app-sdp"
 * "App SIT" → "app-sit"
 * "App NPAC" → "app-npac"
 * "DB_EXACTUS" → "db_exactus"
 * "DB_SDP" → "db_sdp"
 * "DB_SIT" → "db_sit"
 */

import { idbGetItem } from '@/lib/storage';

// ── Slug helper ────────────────────────────────────────────────────────────
// Mismo algoritmo que DataTableUsuarios para sheetSlug.
export function sheetSlug(sheetKey) {
  return String(sheetKey).toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

// ── Lectura genérica de localStorage ───────────────────────────────────────
function lsGetSafe(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Cuenta cuántas filas tienen validacion === "Incorrecto" en un store dado.
 * @param store objeto { rowId: { validacion, comentario } }
 */
function contarIncorrectos(store) {
  if (!store || typeof store !== 'object') return 0;
  let n = 0;
  for (const entry of Object.values(store)) {
    if (entry && typeof entry === 'object') {
      const v = String(entry.validacion ?? '').trim().toLowerCase();
      if (v === 'incorrecto') n++;
    }
  }
  return n;
}

// ── Conteo "visual" — la regla real ────────────────────────────────────────
// El DataTable muestra para cada fila una validación calculada así:
//   currentVal = storedVal (localStorage) ?? escenarioVal (col ESCENARIO) ?? validBadgeVal (col badgeCol)
//
// El conteo del informe debe reflejar lo que el usuario VE en pantalla:
//   Si la fila visualmente dice "Incorrecto" pero el usuario nunca la tocó,
//   tampoco hay entrada en localStorage. Por lo tanto, no basta con leer el
//   store de validaciones — hay que recrear esa cadena de fallback.
//
// Para eso necesitamos también el `raw` del reporte, que está en IndexedDB
// bajo la clave `{persistKey}-data`.

const VALIDACION_OPTS_SET = new Set(['correcto', 'incorrecto', 'sustentado']);

function formatBadgeVal(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  return VALIDACION_OPTS_SET.has(lower) ? lower : null;
}

// FNV-1a 32-bit, idéntico al de useValidaciones.ts — para casar rowIds.
function rowIdFnv(row) {
  let h = 0x811c9dc5;
  const keys = Object.keys(row).sort();
  for (const k of keys) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? '' : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Conteo "como lo ve el usuario":
 *   Para cada fila del escenario:
 *     - Si en localStorage hay store[rowId].validacion → usa ese.
 *     - Si no, mira la columna ESCENARIO (perfiles) → Correcto/Incorrecto.
 *     - Si no, mira la columna badgeCol → si vale "incorrecto" cuenta.
 *   Cuenta como hallazgo SOLO si el resultado final es "incorrecto".
 *
 * @param rawData estructura del store de reportes ({ sheetKey: rows[] })
 * @param persistKey "ad" | "entra" | "apps" | "bd"
 * @param sheetKey "AD" | "Entra ID" | "App SDP" | "DB_SIT" ...
 * @param escenario { key, badgeCol }
 */
function contarHallazgosVisual(rawData, persistKey, sheetKey, escenario) {
  if (!rawData || typeof rawData !== 'object') return 0;

  // Lookup normalizado del sheetKey: toleramos mayúsculas, espacios y variaciones
  // ("App Exactus" vs "App EXACTUS", "app-exactus", etc.)
  function normKey(s) {
    return String(s).toLowerCase().replace(/[\s_\-]+/g, '');
  }
  let rows;
  let resolvedSheetKey = sheetKey; // clave real encontrada en rawData (para el slug)
  if (Array.isArray(rawData)) {
    rows = rawData;
  } else {
    if (Array.isArray(rawData[sheetKey])) {
      rows = rawData[sheetKey];
    } else {
      const target = normKey(sheetKey);
      // Paso 1: coincidencia exacta normalizada
      let foundKey = Object.keys(rawData).find(k => normKey(k) === target);
      // Paso 2: si falla, buscar por cada palabra del sheetKey (ej. "exactus" en "App EXACTUS")
      if (!foundKey) {
        const words = sheetKey.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        foundKey = Object.keys(rawData).find(k =>
          words.every(w => normKey(k).includes(w.replace(/[^a-z0-9]/g, '')))
        );
      }
      if (foundKey) {
        rows = rawData[foundKey];
        resolvedSheetKey = foundKey; // usar la clave real para el slug
      } else {
        rows = [];
      }
    }
  }
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const slug = sheetSlug(resolvedSheetKey);
  const storeKey = `${persistKey}-val-${slug}-${escenario.key}`;
  const store = lsGetSafe(storeKey) ?? {};

  // Solo cuentan las filas que pertenecen al escenario (tienen valor en badgeCol)
  const scenarioRows = rows.filter(r => {
    const v = r?.[escenario.badgeCol];
    return v !== undefined && v !== null && v !== '';
  });

  let n = 0;
  for (const row of scenarioRows) {
    const id = rowIdFnv(row);
    const storedVal = store[id]?.validacion;
    const stored = storedVal ? String(storedVal).trim().toLowerCase() : null;

    let resolved = stored;
    if (!resolved) {
      // Fallback 1: columna ESCENARIO (usada en Perfiles)
      const rawEsc = row['ESCENARIO'] ?? row['Escenario'] ?? row['escenario'];
      if (rawEsc !== undefined && rawEsc !== null && String(rawEsc).trim() !== '') {
        resolved = String(rawEsc).toUpperCase() === 'CORRECTO' ? 'correcto' : 'incorrecto';
      }
    }
    if (!resolved) {
      // Fallback 2: badgeCol — igual lógica que buildExcelBuffer:
      // si el valor NO es "correcto"/"sustentado" y no está vacío → es hallazgo.
      // Esto cubre badgeCols con "Si"/"No", "Activo", o "Incorrecto" directamente.
      const badgeRaw = row[escenario.badgeCol];
      if (badgeRaw !== null && badgeRaw !== undefined && String(badgeRaw).trim() !== '') {
        const bv = String(badgeRaw).trim().toLowerCase();
        if (bv !== 'correcto' && bv !== 'sustentado') {
          resolved = 'incorrecto';
        } else {
          resolved = bv; // "correcto" o "sustentado" → no cuenta
        }
      }
    }

    if (resolved === 'incorrecto') n++;
  }
  return n;
}

// ── Formateo MES_AÑO ───────────────────────────────────────────────────────
// "2026-04-30" → "ABR26"
const MESES_ABBR = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'];

export function fechaToMesAnio(fecha) {
  if (!fecha) return '';
  const s = String(fecha).trim();
  // Acepta YYYY-MM-DD o DD/MM/YYYY
  let yyyy, mm;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) { yyyy = m[1]; mm = m[2]; }
  else {
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) { yyyy = m[3]; mm = m[2]; }
  }
  if (!yyyy || !mm) return '';
  const monthIdx = parseInt(mm, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return '';
  return `${MESES_ABBR[monthIdx]}${yyyy.slice(2)}`;
}

// "2026-04-30" → "30/04/2026"   |   "30/04/2026" se devuelve igual.
// Si se recibe una fecha-hora ISO como "2026-03-31T00:00:00" devolverá
// "31/03/2026 00:00:00" (preserva la hora cuando está presente).
export function fmtFechaDDMMYYYY(fecha) {
  if (!fecha) return '';
  const s = String(fecha).trim();
  // Acepta:
  //  - YYYY-MM-DD
  //  - YYYY-MM-DDTHH:MM[:SS]
  //  - YYYY-MM-DD HH:MM[:SS]
  // Si el string ya viene en DD/MM/YYYY, se devuelve tal cual.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const yyyy = m[1], mm = m[2], dd = m[3];
    const hh = m[4], mi = m[5], ss = m[6];
    if (hh !== undefined) {
      const sec = ss ?? '00';
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${sec}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }
  return s; // probablemente ya está en formato dd/mm/yyyy u otro formato legible
}

// ── Lectura de fechas de corte ────────────────────────────────────────────
//
// v21.7 — NUEVA ARQUITECTURA:
//   Las fechas de recopilación (10 BDs) ya NO se leen desde IDB de forma
//   async. Ahora viven en uiStore.bdFechaCorte (Zustand + localStorage),
//   que se escribe de forma síncrona en cuanto cargarFuente() termina.
//
//   calcularCamposAutomaticos() recibe el mapa de fechas como parámetro
//   → GenerarInformePanel lo obtiene reactivamente con useUIStore().
//
//   Las fechas de HALLAZGOS (mes_anio) siguen leyéndose de IDB porque
//   vienen del datepicker de GenericPanel y no pasan por uiStore.

/**
 * Lee la fecha de corte de un HALLAZGO desde IDB.
 * Clave: `{persistKey}-fechaCorte` — escrita por reportesStore.setRaw().
 * Solo se usa para derivar mes_anio (fecha más reciente de los 5 hallazgos).
 */
export async function getFechaCorteHallazgo(persistKey) {
  try {
    const fc = await idbGetItem(`${persistKey}-fechaCorte`);
    return fc || null;
  } catch {
    return null;
  }
}

/**
 * Normaliza cualquier formato de fecha a YYYY-MM-DD para comparar.
 * Acepta: YYYY-MM-DD, DD/MM/YYYY.
 */
function normalizarFecha(f) {
  if (!f) return '';
  const s = String(f).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

/**
 * mes_anio: fecha MÁS RECIENTE de los 5 hallazgos (AD, Apps, BD, Entra, Cesados).
 * Solo lee IDB de hallazgos — NO mezcla con fechas de recopilación.
 */
export async function getMesAnioDesdeHallazgos() {
  const fechas = await Promise.all([
    getFechaCorteHallazgo('ad'),
    getFechaCorteHallazgo('apps'),
    getFechaCorteHallazgo('bd'),
    getFechaCorteHallazgo('entra'),
    getFechaCorteHallazgo('cesados'),
  ]);
  const validas = fechas.filter(Boolean).map(normalizarFecha).filter(Boolean);
  if (validas.length === 0) return '';
  return validas.sort().at(-1) ?? '';
}

// ── Definición canónica de escenarios (key + badgeCol) ────────────────────
// Debe coincidir con lib/constants/reportes.js (ESCENARIOS_ORDEN).
const SC = {
  cesados:       { key: 'cesados-activos', badgeCol: 'cesadoActivo'      },
  postcese:      { key: 'postcese',        badgeCol: 'actividadPostCese' },
  sin_uso_90:    { key: 'inactividad-90d', badgeCol: 'sinUso>90d'        },
  bloqueado_30d: { key: 'bloqueado-30d',   badgeCol: 'bloqueado>30d'     },
  sin_sustento:  { key: 'sin-sustento',    badgeCol: 'Sin Sustento'      },
};

// ── Mapa: para cada campo del informe → (persistKey, sheetKey, escenario) ─
const MAPA_HALLAZGOS = {
  // Active Directory — una sola hoja "AD"
  ad_cesados:         ['ad',    'AD',          SC.cesados],
  ad_poscese:         ['ad',    'AD',          SC.postcese],
  ad_sin_uso_90:      ['ad',    'AD',          SC.sin_uso_90],
  ad_sin_sustento:    ['ad',    'AD',          SC.sin_sustento],
  ad_deshabilitados:  ['ad',    'AD',          SC.bloqueado_30d],

  // Apps Críticas — 4 hojas
  apps_exactus_cesados:      ['apps', 'App EXACTUS', SC.cesados],
  apps_exactus_poscese:      ['apps', 'App EXACTUS', SC.postcese],
  apps_exactus_sin_uso:      ['apps', 'App EXACTUS', SC.sin_uso_90],
  apps_exactus_sin_sustento: ['apps', 'App EXACTUS', SC.sin_sustento],

  apps_sdp_cesados:      ['apps', 'App SDP', SC.cesados],
  apps_sdp_poscese:      ['apps', 'App SDP', SC.postcese],
  apps_sdp_sin_uso:      ['apps', 'App SDP', SC.sin_uso_90],
  apps_sdp_sin_sustento: ['apps', 'App SDP', SC.sin_sustento],

  apps_sit_cesados:      ['apps', 'App SIT', SC.cesados],
  apps_sit_poscese:      ['apps', 'App SIT', SC.postcese],
  apps_sit_sin_uso:      ['apps', 'App SIT', SC.sin_uso_90],
  apps_sit_sin_sustento: ['apps', 'App SIT', SC.sin_sustento],

  apps_npac_cesados:      ['apps', 'App NPAC', SC.cesados],
  apps_npac_poscese:      ['apps', 'App NPAC', SC.postcese],
  apps_npac_sin_uso:      ['apps', 'App NPAC', SC.sin_uso_90],
  apps_npac_sin_sustento: ['apps', 'App NPAC', SC.sin_sustento],

  // Base de Datos — 3 hojas
  bd_exactus_cesados:        ['bd', 'DB_EXACTUS', SC.cesados],
  bd_exactus_poscese:        ['bd', 'DB_EXACTUS', SC.postcese],
  bd_exactus_sin_uso:        ['bd', 'DB_EXACTUS', SC.sin_uso_90],
  bd_exactus_sin_sustento:   ['bd', 'DB_EXACTUS', SC.sin_sustento],
  bd_exactus_deshabilitados: ['bd', 'DB_EXACTUS', SC.bloqueado_30d],

  bd_sdp_cesados:        ['bd', 'DB_SDP', SC.cesados],
  bd_sdp_poscese:        ['bd', 'DB_SDP', SC.postcese],
  bd_sdp_sin_uso:        ['bd', 'DB_SDP', SC.sin_uso_90],
  bd_sdp_sin_sustento:   ['bd', 'DB_SDP', SC.sin_sustento],
  bd_sdp_deshabilitados: ['bd', 'DB_SDP', SC.bloqueado_30d],

  bd_sit_cesados:        ['bd', 'DB_SIT', SC.cesados],
  bd_sit_poscese:        ['bd', 'DB_SIT', SC.postcese],
  bd_sit_sin_uso:        ['bd', 'DB_SIT', SC.sin_uso_90],
  bd_sit_sin_sustento:   ['bd', 'DB_SIT', SC.sin_sustento],
  bd_sit_deshabilitados: ['bd', 'DB_SIT', SC.bloqueado_30d],

  // EntraID — una sola hoja "Entra ID"
  entra_cesados:      ['entra', 'Entra ID', SC.cesados],
  entra_poscese:      ['entra', 'Entra ID', SC.postcese],
  entra_sin_uso_90:   ['entra', 'Entra ID', SC.sin_uso_90],
  entra_sin_sustento: ['entra', 'Entra ID', SC.sin_sustento],
};

// ── Fórmulas reales de cumplimiento ───────────────────────────────────────
//
// Las tres métricas por hoja/colección:
//
//  pct_X_activos_correctos:
//    100% − (rows con Estado=Activo Y CesadoGDH=Si) / (rows con Estado=Activo)
//    → Para AD usa la data cruda de HAD directamente (columnas Estado, CesadoGDH)
//    → Para Apps/BD/Entra usa las filas de la hoja correspondiente de su rawData
//
//  pct_X_identificados:
//    100% − (rows con Estado=Activo Y CesadoGDH=No Y ActivoGDH=No) / (rows con Estado=Activo)
//
//  pct_X_sin_poscese:
//    100% − (rows con escenario PostCese) / (total rows sin importar estado)
//    Escenario PostCese = fila tiene valor en el badgeCol del escenario postcese

const CAMPOS_PCT = [
  'pct_ad_activos_correctos', 'pct_ad_identificados', 'pct_ad_sin_poscese',
  'pct_apps_sdp_activos',     'pct_apps_sdp_identificados',     'pct_apps_sdp_sin_poscese',
  'pct_apps_exactus_activos', 'pct_apps_exactus_identificados', 'pct_apps_exactus_sin_poscese',
  'pct_apps_sit_activos',     'pct_apps_sit_identificados',     'pct_apps_sit_sin_poscese',
  'pct_apps_npac_activos',    'pct_apps_npac_identificados',    'pct_apps_npac_sin_poscese',
  'pct_bd_sdp_activos',       'pct_bd_sdp_identificados',       'pct_bd_sdp_sin_poscese',
  'pct_bd_exactus_activos',   'pct_bd_exactus_identificados',   'pct_bd_exactus_sin_poscese',
  'pct_bd_sit_activos',       'pct_bd_sit_identificados',       'pct_bd_sit_sin_poscese',
  'pct_entra_activos',        'pct_entra_identificados',        'pct_entra_sin_poscese',
];

/** Extrae filas de una hoja dentro de rawData (array o multi-sheet object). */
function getRows(rawData, sheetKey) {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  // Exact match primero, luego case-insensitive, luego partial
  if (Array.isArray(rawData[sheetKey])) return rawData[sheetKey];
  const target = sheetKey.toLowerCase().replace(/[\s_-]/g, '');
  const found = Object.keys(rawData).find(k =>
    k.toLowerCase().replace(/[\s_-]/g, '') === target
  );
  return found ? (rawData[found] ?? []) : [];
}

/** Normaliza un valor de celda a string lowercase sin espacios para comparaciones. */
function norm(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Busca el valor de una columna en una fila de forma case-insensitive.
 * Acepta variantes: "CesadoGDH", "cesadogdh", "cesado_gdh", "Cesado GDH", etc.
 */
function getCol(row, ...candidates) {
  for (const col of candidates) {
    if (col in row) return row[col];
    // case-insensitive fallback
    const colLow = col.toLowerCase().replace(/[\s_]/g, '');
    const key = Object.keys(row).find(k =>
      k.toLowerCase().replace(/[\s_]/g, '') === colLow
    );
    if (key !== undefined) return row[key];
  }
  return undefined;
}

/** Formatea un ratio como porcentaje con 2 decimales. Si total=0 devuelve "N/A". */
function fmtPct(numerador, total) {
  if (!total || total === 0) return 'N/A';
  // Sanitizar numerador por si llega NaN/undefined de algún cálculo intermedio
  const num = (isNaN(numerador) || numerador === undefined || numerador === null) ? 0 : Number(numerador);
  const tot = Number(total);
  if (isNaN(tot) || tot === 0) return 'N/A';
  const pct = ((tot - num) / tot) * 100;
  // Clamp entre 0 y 100 por seguridad
  const clamped = Math.max(0, Math.min(100, pct));
  return `${clamped.toFixed(2)}%`;
}

/**
 * pct_activos_correctos: 100% − (Activo+CesadoGDH=Si) / (Activo)
 * Columnas: "Estado" (Activo/Inactivo), "CesadoGDH" (Si/No)
 * Variantes aceptadas case-insensitive.
 */
// ── Fórmulas de KPI ───────────────────────────────────────────────────────
//
// pct_activos_correctos:
//   Denominador = filas con Estado=Activo (de toda la hoja, sin filtrar escenario)
//   Numerador   = de esas, las que tienen CesadoGDH=Si  (son el hallazgo)
//   Resultado   = 100% - (numerador / denominador)
//   Si denominador=0 → N/A. Si numerador=0 → 100%.
//
// pct_identificados:
//   Denominador = filas con Estado=Activo (de toda la hoja)
//   Numerador   = de esas, las que tienen CesadoGDH=No Y ActivoGDH=No
//   Resultado   = 100% - (numerador / denominador)
//
// pct_sin_poscese:
//   Denominador = filas del escenario PostCese (badgeCol tiene valor no vacío)
//   Numerador   = de esas, las que tienen Incorrecto en ese escenario
//                 (leído de localStorage: {persistKey}-val-{slug}-postcese)
//   Resultado   = 100% - (numerador / denominador)
//   Si denominador=0 → 100% (no hay filas PostCese = sin hallazgos)
//   Si numerador=0   → 100% (hay filas PostCese pero ninguna es Incorrecto)

function calcActivosCorrectos(rows) {
  // Denominador: todas las filas con Estado=Activo
  const activos = rows.filter(r => {
    const v = norm(getCol(r, 'Estado', 'estado', 'ESTADO'));
    return v === 'activo' || v === 'active';
  });
  // Si no hay filas con Estado=Activo (columna ausente o sin activos) → 100%
  if (activos.length === 0) return '100.00%';

  // Numerador: activos con CesadoGDH=Si
  const hallazgo = activos.filter(r => {
    const v = norm(getCol(r, 'CesadoGDH', 'cesadogdh', 'Cesado GDH', 'cesado_gdh'));
    return v === 'si' || v === 'sí' || v === 'yes' || v === '1' || v === 'true';
  });

  return fmtPct(hallazgo.length, activos.length);
}

function calcIdentificados(rows) {
  // Denominador: todas las filas con Estado=Activo
  const activos = rows.filter(r => {
    const v = norm(getCol(r, 'Estado', 'estado', 'ESTADO'));
    return v === 'activo' || v === 'active';
  });
  // Si no hay filas con Estado=Activo (columna ausente o sin activos) → 100%
  if (activos.length === 0) return '100.00%';

  // Numerador: activos con CesadoGDH=No Y ActivoGDH=No
  const hallazgo = activos.filter(r => {
    const cesado = norm(getCol(r, 'CesadoGDH', 'cesadogdh', 'Cesado GDH', 'cesado_gdh'));
    const activo = norm(getCol(r, 'ActivoGDH',  'activogdh',  'Activo GDH',  'activo_gdh'));
    const esNo = v => v === 'no' || v === '0' || v === 'false';
    return esNo(cesado) && esNo(activo);
  });

  return fmtPct(hallazgo.length, activos.length);
}

function calcSinPoscese(rows, persistKey, sheetKey) {
  // badgeCol del escenario PostCese
  const BADGE_POSTCESE = 'actividadPostCese';
  const ESCENARIO_KEY  = 'postcese';

  // Denominador: TOTAL de filas de la hoja
  const totalFilas = rows.length;
  if (totalFilas === 0) return 'N/A';

  // Filas del escenario PostCese = filas con valor no-vacío en badgeCol
  // El hecho de aparecer en este escenario ya las marca como hallazgo (Incorrecto)
  // a menos que el usuario las valide como Correcto o Sustentado.
  const filasPostCese = rows.filter(r => {
    const v = getCol(r, BADGE_POSTCESE);
    return v !== null && v !== undefined && String(v).trim() !== '';
  });

  if (filasPostCese.length === 0) return '100.00%';

  // Leer store de validaciones de localStorage
  const slug     = sheetKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
  const storeKey = `${persistKey}-val-${slug}-${ESCENARIO_KEY}`;
  let store = {};
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storeKey) : null;
    if (raw) store = JSON.parse(raw);
  } catch {}

  // Lógica: toda fila postcese ES un hallazgo (incorrecto) por defecto.
  // Solo deja de serlo si el usuario la marcó explícitamente como Correcto o Sustentado.
  // Si el badgeCol ya devuelve "Incorrecto"/"Correcto"/"Sustentado" desde el backend,
  // ese valor canónico toma precedencia sobre el "incorrecto por defecto".
  const OPTS_CORRECTO = new Set(['correcto', 'sustentado']);

  let incorrectos = 0;
  for (const r of filasPostCese) {
    // rowId FNV-1a
    let h = 0x811c9dc5;
    const keys = Object.keys(r).sort();
    for (const k of keys) {
      const s = `${k}\u0001${r[k] === null || r[k] === undefined ? '' : String(r[k])}\u0002`;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
      }
    }
    const rowId = h.toString(16).padStart(8, '0');

    // 1. Valor guardado por el usuario en localStorage (tiene máxima prioridad)
    const storedVal = store[rowId]?.validacion;
    if (storedVal && String(storedVal).trim()) {
      const sv = String(storedVal).trim().toLowerCase();
      if (!OPTS_CORRECTO.has(sv)) incorrectos++; // Incorrecto o cualquier otra cosa → hallazgo
      continue;
    }

    // 2. Columna ESCENARIO (usada en Perfiles — raramente aplica aquí)
    const rawEsc = r['ESCENARIO'] ?? r['Escenario'] ?? r['escenario'];
    if (rawEsc !== undefined && rawEsc !== null && String(rawEsc).trim() !== '') {
      if (String(rawEsc).toUpperCase() !== 'CORRECTO') incorrectos++;
      continue;
    }

    // 3. badgeCol: si devuelve valor canónico (Correcto/Incorrecto/Sustentado) usarlo
    const badgeRaw = getCol(r, BADGE_POSTCESE);
    if (badgeRaw !== null && badgeRaw !== undefined) {
      const badgeLow = String(badgeRaw).trim().toLowerCase();
      if (OPTS_CORRECTO.has(badgeLow)) continue; // backend dice Correcto/Sustentado
      // badgeVal es 'incorrecto' o cualquier valor no-canónico ('Si', 'X', etc.)
      // → la fila existe en el escenario postcese → es hallazgo
    }
    incorrectos++;
  }

  return fmtPct(incorrectos, totalFilas);
}

/**
 * Calcula los 3 KPIs para una hoja dada.
 * @param rawData  — raw del reporte (multi-sheet o array)
 * @param sheetKey — nombre de la hoja ("AD", "App SDP", "DB_SIT", "Entra ID")
 * @param persistKey — clave del reporte ("ad", "apps", "bd", "entra")
 */
function calcKpisHoja(rawData, sheetKey, persistKey) {
  const rows = getRows(rawData, sheetKey);
  if (!rows || rows.length === 0) {
    return { activos: 'N/A', identificados: 'N/A', sin_poscese: 'N/A' };
  }
  return {
    activos:       calcActivosCorrectos(rows),
    identificados: calcIdentificados(rows),
    sin_poscese:   calcSinPoscese(rows, persistKey, sheetKey),
  };
}


/**
 * Calcula TODOS los campos automáticos del informe en un solo paso.
 * Devuelve un objeto con las claves del formulario que SÍ son automáticas.
 *
 * Cómo funciona:
 *   1. Carga el `raw` de cada reporte (ad, entra, apps, bd) desde IndexedDB
 *      bajo la clave `{persistKey}-data`. Esa es la fuente de verdad de las
 *      filas que el usuario está viendo en cada DataTable.
 *   2. Para cada campo del MAPA_HALLAZGOS, recorre las filas del escenario
 *      correspondiente y aplica la misma cadena de fallback que usa
 *      DataTableRow:  storedVal → escenarioCol → badgeCol.
 *      Cuenta como hallazgo solo si el resultado final es "incorrecto".
 *   3. Lee fechas de corte desde IDB bajo `bd-data-{id}-fc` (lo escribe
 *      FuenteDetalle al recibir respuesta del backend).
 *   4. Deriva `mes_anio` de la primera fecha disponible.
 *   5. Mockea todos los `pct_*` a "99.8%".
 *
 * Campos NO incluidos (el usuario los llena en el formulario):
 *   - asunto_escalamiento
 *   - {ad,apps_*,bd_*,entra}_com_* (todos los comentarios)
 *   - conclusion_1, conclusion_2, conclusion_3
 */
/**
 * calcularCamposAutomaticos — v21.7
 *
 * @param bdFechas — Record<sourceId, fechaCorte> que viene del uiStore.bdFechaCorte.
 *   Se pasa como parámetro para que sea SÍNCRONO y reactivo (sin IDB async).
 *   Ejemplo: { gdh: '2026-04-30', ad: '2026-04-30', 'entra-id': '2026-04-30', ... }
 */
export async function calcularCamposAutomaticos(bdFechas = {}) {
  const out = {};

  // ── 1. Raw de los 4 reportes de HALLAZGOS (IDB) ───────────────────────
  // Solo los hallazgos se leen de IDB — los datos pesados de filas.
  // Las fechas de corte de RECOPILACIÓN vienen por parámetro (uiStore).
  const [rawAd, rawEntra, rawApps, rawBd] = await Promise.all([
    idbGetItem('ad-data'),
    idbGetItem('entra-data'),
    idbGetItem('apps-data'),
    idbGetItem('bd-data'),
  ]);
  const rawByKey = { ad: rawAd, entra: rawEntra, apps: rawApps, bd: rawBd };

  // ── 2. Conteos por escenario ───────────────────────────────────────────
  for (const [campo, [persistKey, sheetKey, escenario]] of Object.entries(MAPA_HALLAZGOS)) {
    const raw = rawByKey[persistKey];
    out[campo] = String(contarHallazgosVisual(raw, persistKey, sheetKey, escenario));
  }

  // ── 3. Fechas de corte de RECOPILACIÓN ────────────────────────────────
  // Vienen del uiStore (bdFechas) — síncrono, sin IDB, sin race condition.
  // Jerarquía por bloque: primera fuente disponible del grupo.
  const get = (id) => bdFechas[id] || '';
  const fcGdh   = get('gdh');
  const fcAd    = get('ad');
  const fcEntra = get('entra-id');
  const fcApps  = get('app-sit') || get('app-sdp') || get('app-npac') || get('app-exactus');
  const fcBd    = get('db-sit')  || get('db-sdp')  || get('db-exactus');

  out.fecha_corte_gdh   = fmtFechaDDMMYYYY(fcGdh)   || '';
  out.fecha_corte_ad    = fmtFechaDDMMYYYY(fcAd)    || '';
  out.fecha_corte_entra = fmtFechaDDMMYYYY(fcEntra) || '';
  out.fecha_corte_apps  = fmtFechaDDMMYYYY(fcApps)  || '';
  out.fecha_corte_bd    = fmtFechaDDMMYYYY(fcBd)    || '';

  // ── 4. mes_anio — fecha MÁS RECIENTE de los 5 HALLAZGOS ──────────────
  // Solo compara AD, Apps, BD, Entra, Cesados — no mezcla con recopilación.
  const fechaMasReciente = await getMesAnioDesdeHallazgos();
  out.mes_anio = fechaToMesAnio(fechaMasReciente);

  // ── 5. Porcentajes de cumplimiento (fórmulas reales) ─────────────────
  // AD — una sola hoja (rawAd es array directo)
  const kpiAd = calcKpisHoja(rawAd,    'AD',          'ad');
  out.pct_ad_activos_correctos = kpiAd.activos;
  out.pct_ad_identificados     = kpiAd.identificados;
  out.pct_ad_sin_poscese       = kpiAd.sin_poscese;

  // Apps Críticas — 4 hojas
  const kpiAppsSdp    = calcKpisHoja(rawApps,  'App SDP',     'apps');
  const kpiAppsExact  = calcKpisHoja(rawApps,  'App EXACTUS', 'apps');
  const kpiAppsSit    = calcKpisHoja(rawApps,  'App SIT',     'apps');
  const kpiAppsNpac   = calcKpisHoja(rawApps,  'App NPAC',    'apps');

  out.pct_apps_sdp_activos        = kpiAppsSdp.activos;
  out.pct_apps_sdp_identificados  = kpiAppsSdp.identificados;
  out.pct_apps_sdp_sin_poscese    = kpiAppsSdp.sin_poscese;

  out.pct_apps_exactus_activos       = kpiAppsExact.activos;
  out.pct_apps_exactus_identificados = kpiAppsExact.identificados;
  out.pct_apps_exactus_sin_poscese   = kpiAppsExact.sin_poscese;

  out.pct_apps_sit_activos        = kpiAppsSit.activos;
  out.pct_apps_sit_identificados  = kpiAppsSit.identificados;
  out.pct_apps_sit_sin_poscese    = kpiAppsSit.sin_poscese;

  out.pct_apps_npac_activos       = kpiAppsNpac.activos;
  out.pct_apps_npac_identificados = kpiAppsNpac.identificados;
  out.pct_apps_npac_sin_poscese   = kpiAppsNpac.sin_poscese;

  // Base de Datos — 3 hojas
  const kpiBdSdp    = calcKpisHoja(rawBd,    'DB_SDP',      'bd');
  const kpiBdExact  = calcKpisHoja(rawBd,    'DB_EXACTUS',  'bd');
  const kpiBdSit    = calcKpisHoja(rawBd,    'DB_SIT',      'bd');

  out.pct_bd_sdp_activos        = kpiBdSdp.activos;
  out.pct_bd_sdp_identificados  = kpiBdSdp.identificados;
  out.pct_bd_sdp_sin_poscese    = kpiBdSdp.sin_poscese;

  out.pct_bd_exactus_activos       = kpiBdExact.activos;
  out.pct_bd_exactus_identificados = kpiBdExact.identificados;
  out.pct_bd_exactus_sin_poscese   = kpiBdExact.sin_poscese;

  out.pct_bd_sit_activos        = kpiBdSit.activos;
  out.pct_bd_sit_identificados  = kpiBdSit.identificados;
  out.pct_bd_sit_sin_poscese    = kpiBdSit.sin_poscese;

  // Entra ID — una sola hoja (rawEntra es array directo)
  const kpiEntra = calcKpisHoja(rawEntra, 'Entra ID',    'entra');
  out.pct_entra_activos      = kpiEntra.activos;
  out.pct_entra_identificados = kpiEntra.identificados;
  out.pct_entra_sin_poscese  = kpiEntra.sin_poscese;

  return out;
}

/**
 * Devuelve true si la clave es un campo automático (no se debería editar a mano).
 * Útil para deshabilitar inputs en el formulario.
 */
export function esCampoAutomatico(name) {
  if (Object.prototype.hasOwnProperty.call(MAPA_HALLAZGOS, name)) return true;
  if (CAMPOS_PCT.includes(name)) return true;
  if (name === 'mes_anio') return true;
  if (name.startsWith('fecha_corte_')) return true;
  return false;
}

/**
 * Resumen de cuántas filas con validación "Incorrecto" (en localStorage) tiene
 * cada combinación (persistKey, sheetKey). NO incluye el fallback visual —
 * solo lo que el usuario tocó explícitamente. Útil como diagnóstico.
 */
export function resumenValidacionesPorHoja() {
  const out = {};
  const seen = new Set();
  for (const [, [persistKey, sheetKey, escenario]] of Object.entries(MAPA_HALLAZGOS)) {
    const tag = `${persistKey}:${sheetKey}`;
    const seenKey = `${tag}:${escenario.key}`;
    if (seen.has(seenKey)) continue;
    seen.add(seenKey);
    const storeKey = `${persistKey}-val-${sheetSlug(sheetKey)}-${escenario.key}`;
    const n = contarIncorrectos(lsGetSafe(storeKey));
    out[tag] = (out[tag] ?? 0) + n;
  }
  return out;
}
