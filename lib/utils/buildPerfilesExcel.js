'use client';
/**
 * buildPerfilesExcel
 *
 * Construye en el CLIENTE los 4 Excel incrustados del informe de Perfiles,
 * con el mismo método que Privilegiados/Usuarios y la estructura de los Excel
 * de referencia (Hallazgos_GDH / Moviper / Apps / BDs - Perfiles):
 *
 * Hoja "Escenarios" (resumen) + hojas de detalle con banner "VOLVER A ESCENARIOS"
 * y columnas = vista web. Solo se crea hoja de detalle si hay hallazgos.
 *
 * Mapeo a slots del template (verificado en template-informe-perfiles.docx):
 * excel_gdh → rId14 → GDH (Activos): H1_rolincorrecto + H2_matriznoexiste
 * excel_moviper → rId16 → Moviper: H1_rolincorrecto
 * excel_apps → rId18 → Apps: H1/H2/H3/H4 (EXACTUS/SDP/NPAC/SIT)
 * excel_bd → rId20 → BDs: EXA_H1 / SDP_H1
 *
 * Claves de validación (idénticas a DataTablePerfiles):
 * con escenario: `${persistKey}-prf-val-${sheetSlug}-${scenarioKey}`
 * vista única: `${persistKey}-prf-val-${sheetSlug}`
 */
import * as XLSX from 'xlsx';
import { displayAccion } from '@/lib/constants/accionCorrectiva';
import { idbGetItem } from '@/lib/storage';

const idbKey = pk => `${pk}-data`;
const OPTS = new Set(['Correcto', 'Incorrecto', 'Sustentado']);
const CANON = new Set(['correcto', 'sustentado']);

function normalizeSheets(r) {
  if (!r) return {};
  if (Array.isArray(r)) return r.length ? { Principal: r } : {};
  if (typeof r !== 'object') return {};
  const o = {}; for (const [k, v] of Object.entries(r)) if (Array.isArray(v)) o[k] = v; return o;
}
function toSheetSlug(s) { return String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); }
function fnvHash(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k]; const s = `${k}\u0001${v == null ? '' : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, '0');
}
function resolveVal(row, badge, store, rowId) {
  const stored = store[rowId]?.validacion;
  if (stored && OPTS.has(stored)) return stored;
  const raw = row[badge];
  if (raw != null && String(raw).trim() !== '') {
    const f = String(raw).charAt(0).toUpperCase() + String(raw).slice(1).toLowerCase();
    if (OPTS.has(f)) return f;
    return String(raw).trim();
  }
  return '';
}
function lsGet(key) {
  try { const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null; return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
const DATE_RE = /(fecha|date|login|alta|cese|inicio|fin|ingreso)/i;
function toExcelDate(val, col) {
  if (!DATE_RE.test(col) || typeof val !== 'string' || !val) return val;
  const ddmm = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  const iso  = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let dt = null;
  if (ddmm) dt = new Date(+ddmm[3], +ddmm[2] - 1, +ddmm[1]);
  else if (iso) dt = new Date(+iso[1], +iso[2] - 1, +iso[3]);
  if (dt && !isNaN(dt.getTime())) return (dt.getTime() - dt.getTimezoneOffset() * 60000) / 86400000 + 25569;
  return val;
}

// Hallazgo = validación no canónica y no vacía
function esHallazgo(val) {
  const v = String(val || '').trim().toLowerCase();
  return v !== '' && !CANON.has(v);
}

/**
 * Construye las hojas de detalle de una hoja del backend.
 * @param rows      filas de la hoja
 * @param persistKey ej. 'prf-roles'
 * @param sheetKey   nombre de la hoja del backend (para slug de validación)
 * @param escenarios [{ tabName, badgeCol, scenarioKey, label, com, hasComentario }]
 *        scenarioKey: '' → vista única (clave sin escenario)
 * @param allBadge   Set de columnas badge a excluir de las columnas de datos
 */
function detallesDeHoja(rows, persistKey, sheetKey, escenarios, allBadge) {
  const slug = toSheetSlug(sheetKey);
  const out = [];
  for (const esc of escenarios) {
    // filas del escenario (badgeCol con valor)
    const scRows = esc.badgeCol
      ? rows.filter(r => r[esc.badgeCol] != null && String(r[esc.badgeCol]).trim() !== '')
      : rows;
    const storeKey = esc.scenarioKey
      ? `${persistKey}-prf-val-${slug}-${esc.scenarioKey}`
      : `${persistKey}-prf-val-${slug}`;
    const store = lsGet(storeKey);

    // columnas = vista web (sin badge de otros escenarios ni "Comentario")
    const colSet = new Set(); const cols = [];
    scRows.forEach(r => Object.keys(r).forEach(c => {
      if (!colSet.has(c) && c !== 'Comentario' && !allBadge.has(c)) { colSet.add(c); cols.push(c); }
    }));

    const findings = scRows.map(row => {
      const rowId = fnvHash(row);
      const val = esc.badgeCol ? resolveVal(row, esc.badgeCol, store, rowId)
                               : (store[rowId]?.validacion ?? '');
      return { row, val, rowId };
    }).filter(({ val }) => esHallazgo(val));

    if (!findings.length) { out.push({ ...esc, count: 0, header: null, dataRows: [], cols }); continue; }

    const header = [...cols, 'Validación', 'Acción Correctiva', ...(esc.hasComentario ? ['Comentario'] : [])];
    const dataRows = findings.map(({ row, val, rowId }) => {
      const line = cols.map(c => toExcelDate(row[c] ?? '', c));
      line.push(val);
      line.push(displayAccion(store[rowId]?.accion));  // ← NUEVA línea
      if (esc.hasComentario) line.push(store[rowId]?.comentario ?? row['Comentiper'] ?? '');
      return line;
    });
    out.push({ ...esc, count: findings.length, header, dataRows, cols });
  }
  return out;
}

function buildWorkbook(cfg, dataByPk, form) {
  const sheets = normalizeSheets(dataByPk[cfg.persistKey]);
  const resumen = [];        // filas resumen
  const resumenLinks = [];   // { rowIdx, tabName }
  const detalleSheets = [];  // { tabName, header, dataRows, cols }

  for (const hoja of cfg.hojas) {
    // localizar filas de esta hoja del backend
    let rows = [];
    const entries = Object.entries(sheets);
    if (hoja.match) {
      const norm = s => String(s).toLowerCase().replace(/[\s_-]+/g, '');
      const hit = entries.find(([k]) => hoja.match.some(m => norm(k).includes(norm(m))));
      rows = hit ? hit[1] : [];
    } else if (entries.length) {
      rows = entries[0][1]; // GDH/Moviper: una sola colección
    }

    const det = detallesDeHoja(rows, cfg.persistKey, hoja.sheetKeyForVal || (entries[0]?.[0] ?? 'Principal'), hoja.escenarios, cfg.allBadge);

    det.forEach(d => {
      const rowIdx = resumen.length;
      resumen.push([
        hoja.categoria ?? '',
        d.label,
        d.count,
        d.count > 0 ? d.tabName : '-',
        (form?.[d.com] ?? '') || '-',
      ]);
      if (d.count > 0) {
        resumenLinks.push({ rowIdx, tabName: d.tabName });
        detalleSheets.push({ tabName: d.tabName, header: d.header, dataRows: d.dataRows, cols: d.cols });
      }
    });
  }

  if (!detalleSheets.length) return null;

  const wb = XLSX.utils.book_new();

  // Hoja Escenarios
  const escAoa = [[cfg.title || '', 'Escenarios de monitoreo', 'N° Hallazgos', 'Hallazgos', 'Comentario'], ...resumen];
  const wsEsc = XLSX.utils.aoa_to_sheet(escAoa);
  wsEsc['!cols'] = [{ wch: 18 }, { wch: 52 }, { wch: 13 }, { wch: 16 }, { wch: 70 }];
  for (let c = 0; c <= 4; c++) {
    const a = XLSX.utils.encode_cell({ r: 0, c });
    if (wsEsc[a]) wsEsc[a].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
  }
  for (const { rowIdx, tabName } of resumenLinks) {
    const a = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 3 });
    if (wsEsc[a]) wsEsc[a].l = { Target: `#'${tabName}'!A1`, Tooltip: 'Ir al detalle' };
  }
  XLSX.utils.book_append_sheet(wb, wsEsc, 'Escenarios');

  // Hojas de detalle
  const used = new Set(['Escenarios']);
  for (const d of detalleSheets) {
    let name = d.tabName, n = 1;
    while (used.has(name)) name = `${d.tabName.slice(0, 28)}_${n++}`;
    used.add(name);
    const aoa = [['VOLVER A ESCENARIOS'], [], d.header, ...d.dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (ws['A1']) ws['A1'].l = { Target: "#'Escenarios'!A1", Tooltip: 'Volver al resumen' };
    d.header.forEach((_, c) => {
      const a = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[a]) ws[a].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
    });
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    d.cols.forEach((col, ci) => {
      if (!DATE_RE.test(col)) return;
      for (let r = 3; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: ci })];
        if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'dd/mm/yyyy'; }
      }
    });
    ws['!cols'] = d.header.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return Buffer.from(ab).toString('base64');
}

// Escenarios de GDH/Moviper (roles): rol incorrecto (H1) + matriz no existe (H2)
const ESC_ROLES = [
  { tabName: 'H1_rolincorrecto', badgeCol: 'Validación Rol', scenarioKey: 'validacion-rol',
    label: 'Colaboradores con rol asignado incorrectamente', com: 'gdh_rol_incorrecto_com_perfiles', hasComentario: true },
  { tabName: 'H2_matriznoexiste', badgeCol: 'Existe en MR', scenarioKey: 'existe-en-mr',
    label: 'Rol no existe en la Matriz de Roles', com: 'gdh_matriz_noexiste_com_perfiles', hasComentario: true },
];
const ESC_MOVIPER = [
  { tabName: 'H1_rolincorrecto', badgeCol: 'Validación Rol', scenarioKey: 'validacion-rol',
    label: 'Colaboradores que cambiaron de puesto/UO con rol incorrecto', com: 'moviper_rol_incorrecto_com_perfiles', hasComentario: true },
];

// Apps/DBs: vista única (escenario combinado). badgeCol primario y scenarioKey=''.
const escUnica = (tabName, label, com, badgeCol) => ([
  { tabName, badgeCol, scenarioKey: '', label, com, hasComentario: false },
]);

const PRF_EXCEL_MAPA = {
  excel_gdh: {
    persistKey: 'prf-roles', title: '', categoria: 'Activos',
    allBadge: new Set(['Validación Rol', 'Existe en MR', 'ESCENARIO', 'Escenario']),
    hojas: [{ escenarios: ESC_ROLES }],
  },
  excel_moviper: {
    persistKey: 'prf-moviper', title: '', categoria: 'Moviper',
    allBadge: new Set(['Validación Rol', 'Existe en MR', 'ESCENARIO', 'Escenario']),
    hojas: [{ escenarios: ESC_MOVIPER }],
  },
  excel_apps: {
    persistKey: 'prf-apps', title: 'Aplicaciones Criticas',
    allBadge: new Set(['ROl + Perfil', 'Perfil No Identificado', 'ESCENARIO', 'Escenario']),
    hojas: [
      { match: ['exactus'], categoria: 'EXACTUS', sheetKeyForVal: 'App Exactus',
        escenarios: escUnica('H1', 'Usuarios con accesos adicionales en aplicaciones Críticas', 'apps_exactus_com_perfiles', 'ROl + Perfil') },
      { match: ['sdp'], categoria: 'SDP', sheetKeyForVal: 'App SDP',
        escenarios: escUnica('H2', 'Usuarios con accesos adicionales en aplicaciones Críticas', 'apps_sdp_com_perfiles', 'ROl + Perfil') },
      { match: ['npac'], categoria: 'NPAC', sheetKeyForVal: 'App NPAC',
        escenarios: escUnica('H3', 'Usuarios con accesos adicionales en aplicaciones Críticas', 'apps_npac_com_perfiles', 'ROl + Perfil') },
      { match: ['sit'], categoria: 'SIT', sheetKeyForVal: 'App SIT',
        escenarios: escUnica('H4', 'Usuarios con accesos adicionales en aplicaciones Críticas', 'apps_sit_com_perfiles', 'ROl + Perfil') },
    ],
  },
  excel_bd: {
    persistKey: 'prf-dbs', title: 'Aplicaciones Criticas',
    allBadge: new Set(['Perfil No Identificado', 'ESCENARIO', 'Escenario']),
    hojas: [
      { match: ['exactus', 'exa'], categoria: 'BD EXACTUS', sheetKeyForVal: 'BD Exactus',
        escenarios: escUnica('EXA_H1', 'Usuarios con rol de BD no identificados o sin sustento', 'bd_exactus_com_perfiles', 'Perfil No Identificado') },
      { match: ['sdp'], categoria: 'BD SDP', sheetKeyForVal: 'BD SDP',
        escenarios: escUnica('SDP_H1', 'Usuarios con rol de BD no identificados o sin sustento', 'bd_sdp_com_perfiles', 'Perfil No Identificado') },
    ],
  },
};

/**
 * Construye los 4 Excel incrustados de Perfiles.
 * @param form valores del formulario (para columna Comentario del resumen).
 * @returns { excel_gdh, excel_moviper, excel_apps, excel_bd } (sin hallazgos → ausente).
 */
export async function buildExcelPayloadsPerfiles(form = {}) {
  const pks = ['prf-roles', 'prf-moviper', 'prf-apps', 'prf-dbs'];
  const datos = await Promise.all(pks.map(pk => idbGetItem(idbKey(pk)).catch(() => null)));
  const dataByPk = {};
  pks.forEach((pk, i) => { dataByPk[pk] = datos[i]; });

  const out = {};
  for (const [campo, cfg] of Object.entries(PRF_EXCEL_MAPA)) {
    const b64 = buildWorkbook(cfg, dataByPk, form);
    if (b64) out[campo] = b64;
  }
  return out;
}
