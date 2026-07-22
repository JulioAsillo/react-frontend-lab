'use client';
/**
 * buildPrivilegiadosExcel
 *
 * Construye en el CLIENTE los Excel incrustados del informe de Privilegiados,
 * siguiendo el MÉTODO de Usuarios (GenerarInformePanel.buildExcelBuffer) y el
 * FORMATO de los Excel de referencia (Hallazgo_Servidores / Apps_Criticas /
 * Hallazgo_BDs):
 *
 * Hoja "Escenarios" (resumen):
 * [ <Categoría> | "Escenarios de monitoreo" | "N° Hallazgos" | "Hallazgos" | "Comentario" ]
 * · una fila por (hoja × escenario), con etiqueta descriptiva
 * · "N° Hallazgos" = nº real de hallazgos (Incorrecto/no-canónico)
 * · "Hallazgos" = código H{idx+1}_{ABREV} (hipervínculo) si >0, si no "-"
 * · "Comentario" = texto del formulario (*_com_priv)
 *
 * Hojas de detalle H{idx+1}_{ABREV} (solo si tienen hallazgos):
 * fila 0: "VOLVER A ESCENARIOS" (hipervínculo a #Escenarios!A1)
 * fila 1: en blanco
 * fila 2: cabeceras = MISMAS columnas de la vista web (DataTablePrivilegiados):
 * columnas de datos (sin badgeCols ni "Comentario") + "Validación"
 * (+ "Comentario" si el escenario lo usa)
 * fila 3+: filas de hallazgos
 *
 * Mapeo a slots del template (.docx real):
 * excel_domain_local → rId14 (Domain Admin + Local Admin)
 * excel_apps → rId16 (Apps Críticas)
 * excel_servidores → rId18 (Windows + Linux)
 * excel_dba → rId20 (SQL Server / SysAdmin + Oracle / DBA)
 * excel_mfa → rId22 (MFA Cuentas Genéricas)
 *
 * Validaciones manuales: localStorage `${persistKey}-priv-val-${slug}-val-${escenario}`.
 */
import * as XLSX from 'xlsx';
import { displayAccion } from '@/lib/constants/accionCorrectiva';
import { idbGetItem } from '@/lib/storage';
import { rowIdFnv } from '@/lib/utils/rowId';
import { normalizeSheets, toSheetSlug } from '@/lib/utils/sheets';

// ── Escenarios canónicos ─────────────────────────────────────────────────────
const CESADO = 'Cesado Activo';
const NOID   = 'No Identificado';
const SINSUS = 'Sin Sustento';

// ── MAPA de Excel → categoría + hojas + escenarios descriptivos ─────────────
// hoja: { abrev, label, persistKey, match? , combine?, escenarios:[{key,label,com,hasComentario}] }
//   match    : palabras clave para ubicar la hoja del backend dentro del reporte
//   combine  : true → fusiona todas las hojas del reporte en una sola
//   escenarios[i].key define el índice → tabName = H{i+1}_{ABREV}
const LBL_CESADOS = 'Colaboradores Cesados con cuenta activa';

const PRIV_EXCEL_MAPA = {
  excel_servidores: {
    title: 'Servidores Aplicaciones Críticas',
    hojas: [
      { abrev: 'WINDOWS', label: 'Windows', persistKey: 'priv-windows', escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'windows_cesados_com_priv' },
        { key: NOID,   label: 'Adm. Locales no identificados o sin sustento', com: 'windows_noid_sinsus_com_priv', hasComentario: true },
      ]},
      { abrev: 'LINUX', label: 'Linux', persistKey: 'priv-linux', escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'linux_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios sudoers o root no identificados o sin sustento', com: 'linux_noid_sinsus_com_priv', hasComentario: true },
      ]},
    ],
  },
  excel_apps: {
    title: 'Aplicaciones Criticas',
    hojas: [
      { abrev: 'EXACTUS', label: 'EXACTUS', persistKey: 'priv-apps', match: ['exactus'], escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'apps_exactus_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios privilegiados no identificados o sin sustento', com: 'apps_exactus_noid_sinsus_com_priv' },
      ]},
      { abrev: 'SDP', label: 'SDP', persistKey: 'priv-apps', match: ['sdp'], escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'apps_sdp_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios privilegiados no identificados o sin sustento', com: 'apps_sdp_noid_sinsus_com_priv' },
      ]},
      { abrev: 'NPAC', label: 'NPAC', persistKey: 'priv-apps', match: ['npac'], escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'apps_npac_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios privilegiados no identificados o sin sustento', com: 'apps_npac_noid_sinsus_com_priv' },
      ]},
      { abrev: 'SIT', label: 'SIT', persistKey: 'priv-apps', match: ['sit'], escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'apps_sit_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios privilegiados no identificados o sin sustento', com: 'apps_sit_noid_sinsus_com_priv' },
      ]},
    ],
  },
  excel_dba: {
    title: 'Base de datos Aplicaciones criticas',
    hojas: [
      { abrev: 'SQLSERVER', label: 'SQL Server', persistKey: 'priv-sysadmin', escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'sys_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios Sysadmin no identificados o sin sustento', com: 'sys_sinid_com_priv' },
      ]},
      { abrev: 'ORACLE', label: 'Oracle', persistKey: 'priv-dba', combine: true, escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'dba_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios DBA no identificados o sin sustento', com: 'dba_sinid_com_priv' },
      ]},
    ],
  },
  excel_domain_local: {
    title: 'Active Directory',
    hojas: [
      { abrev: 'DA', label: 'Domain Admin', persistKey: 'priv-domain-admin', escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'domain_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios no identificados o sin sustento', com: 'domain_noid_sinsus_com_priv' },
        { key: SINSUS, label: 'Usuarios sin sustento', com: 'domain_noid_sinsus_com_priv' },
      ]},
      { abrev: 'LA', label: 'Local Admin', persistKey: 'priv-local-admin', escenarios: [
        { key: CESADO, label: LBL_CESADOS, com: 'local_cesados_com_priv' },
        { key: NOID,   label: 'Usuarios no identificados o sin sustento', com: 'local_noid_sinsus_com_priv' },
        { key: SINSUS, label: 'Usuarios sin sustento', com: 'local_noid_sinsus_com_priv' },
      ]},
    ],
  },
  // excel_mfa → rId22: 1 hoja "MFA", 1 escenario "Validación". Layout 4 columnas.
  excel_mfa: {
    title: 'MFA', layout: '4col',
    hojas: [
      { abrev: 'MFA', label: 'MFA', persistKey: 'priv-mfa', escenarios: [
        { key: 'Validación', label: 'Usuarios con privilegios sin acceso condicional MFA configurado', com: 'mfa_sinac_com_priv' },
      ]},
    ],
  },
};

const idbKey = pk => `${pk}-data`;

// ── Helpers (idénticos a DataTablePrivilegiados / Usuarios) ─────────────────
const OPTS = new Set(['Correcto', 'Incorrecto', 'Sustentado']);
const CANON = new Set(['correcto', 'sustentado']);

// normalizeSheets canónico en lib/utils/sheets.

// toSheetSlug y fnvHash (=rowIdFnv) canónicos en lib/utils/sheets y lib/utils/rowId.
const fnvHash = rowIdFnv;
function resolveVal(row, badge, store, rowId) {
  const stored = store[rowId]?.validacion;
  if (stored && OPTS.has(stored)) return stored;
  const raw = row[badge];
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
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
const DATE_RE = /(fecha|date|login|alta|cese|crea|cambio|bloqueo|time|expir|inicio|fin|ult)/i;
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

// Devuelve las filas (combinando hojas del backend si combine=true) de una hoja del MAPA.
function rowsParaHoja(dataByPk, hoja) {
  const sheets = normalizeSheets(dataByPk[hoja.persistKey]);
  const entries = Object.entries(sheets);
  if (!entries.length) return [];
  if (hoja.combine) return entries.flatMap(([, rows]) => rows);
  if (hoja.match) {
    const norm = s => String(s).toLowerCase().replace(/[\s_-]+/g, '');
    const hit = entries.find(([k]) => hoja.match.some(m => norm(k).includes(norm(m))));
    return hit ? hit[1] : [];
  }
  // por defecto: primera hoja (reportes de array → Principal)
  return entries[0][1];
}
// slug para clave de validaciones: combine → primera hoja real; match → su sheetKey; default → Principal
function slugParaHoja(dataByPk, hoja) {
  const sheets = normalizeSheets(dataByPk[hoja.persistKey]);
  const keys = Object.keys(sheets);
  if (!keys.length) return 'principal';
  if (hoja.combine) return toSheetSlug(keys[0]);
  if (hoja.match) {
    const norm = s => String(s).toLowerCase().replace(/[\s_-]+/g, '');
    const hit = keys.find(k => hoja.match.some(m => norm(k).includes(norm(m))));
    return toSheetSlug(hit || keys[0]);
  }
  return toSheetSlug(keys[0]);
}

// Construye un workbook (base64) para un Excel del MAPA. null si no hay hallazgos.
function buildWorkbook(cfg, dataByPk, form) {
  // Excluir de las columnas de datos: los escenarios canónicos + TODAS las
  // claves de escenario declaradas en la config (cubre MFA, cuyo escenario se
  // llama "Validación" e igual debe excluirse para no duplicar esa columna).
  const allBadge = new Set([CESADO, NOID, SINSUS]);
  for (const hoja of cfg.hojas) for (const sc of hoja.escenarios) allBadge.add(sc.key);
  const resumen = [];          // filas de la hoja "Escenarios"
  const resumenLinks = [];     // { rowIdx, tabName }
  const detalles = [];         // { tabName, header, rows }

  for (const hoja of cfg.hojas) {
    const rows = rowsParaHoja(dataByPk, hoja);
    const slug = slugParaHoja(dataByPk, hoja);
    let primera = true;

    hoja.escenarios.forEach((sc, idx) => {
      const scRows = rows.filter(r =>
        r[sc.key] !== undefined && r[sc.key] !== null && String(r[sc.key]).trim() !== '');

      const store = lsGet(`${hoja.persistKey}-priv-val-${slug}-val-${sc.key}`);

      // columnas = vista web (sin badgeCols ni "Comentario")
      const colSet = new Set(); const cols = [];
      scRows.forEach(r => Object.keys(r).forEach(c => {
        if (!colSet.has(c) && c !== 'Comentario' && !allBadge.has(c)) { colSet.add(c); cols.push(c); }
      }));

      const findings = scRows.map(row => {
        const rowId = fnvHash(row);
        const val = resolveVal(row, sc.key, store, rowId);
        const rec = { __row: row, __val: val, __id: rowId };
        return rec;
      }).filter(rec => {
        const v = String(rec.__val || '').trim().toLowerCase();
        return v !== '' && !CANON.has(v);
      });

      const count = findings.length;
      const tabName = `H${idx + 1}_${hoja.abrev}`.slice(0, 31);

      // fila de resumen — layout '4col' (MFA: sin columna de categoría) o 5col
      const rowIdx = resumen.length;
      if (cfg.layout === '4col') {
        resumen.push([ sc.label, count, count > 0 ? tabName : '-', (form?.[sc.com] ?? '') || '-' ]);
      } else {
        resumen.push([ primera ? hoja.label : '', sc.label, count, count > 0 ? tabName : '-', (form?.[sc.com] ?? '') || '-' ]);
      }
      primera = false;
      if (count > 0) resumenLinks.push({ rowIdx, tabName });

      if (count === 0) return;

      // hoja de detalle (aoa con banner VOLVER)
      const header = [...cols, 'Validación', 'Acción Correctiva', ...(sc.hasComentario ? ['Comentario'] : [])];
      const dataRows = findings.map(({ __row, __val, __id }) => {
        const line = cols.map(c => toExcelDate(__row[c] ?? '', c));
        line.push(__val);
        line.push(displayAccion(store[__id]?.accion));  // ← NUEVA línea
        if (sc.hasComentario) line.push(store[__id]?.comentario ?? __row['Comentario'] ?? '');
        return line;
      });
      detalles.push({ tabName, header, dataRows, cols });
    });
  }

  if (detalles.length === 0) return null;

  const wb = XLSX.utils.book_new();

  // ── Hoja "Escenarios" ──────────────────────────────────────────────────
  let wsEsc, hallazgosColIdx;
  if (cfg.layout === '4col') {
    // Layout MFA: fila título centrada + header de 4 columnas (sin categoría).
    const escAoa = [
      ['', cfg.title || ''],
      ['Escenarios de monitoreo', 'N° Hallazgos', 'Hallazgos', 'Comentario'],
      ...resumen,
    ];
    wsEsc = XLSX.utils.aoa_to_sheet(escAoa);
    wsEsc['!cols'] = [{ wch: 60 }, { wch: 13 }, { wch: 14 }, { wch: 70 }];
    for (let c = 0; c <= 3; c++) {
      const a = XLSX.utils.encode_cell({ r: 1, c });
      if (wsEsc[a]) wsEsc[a].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
    }
    if (wsEsc['B1']) wsEsc['B1'].s = { font: { bold: true } };
    hallazgosColIdx = 2;            // col "Hallazgos" en layout 4col
    var resumenRowOffset = 2;      // datos empiezan en fila índice 2
  } else {
    const escAoa = [[cfg.title, 'Escenarios de monitoreo', 'N° Hallazgos', 'Hallazgos', 'Comentario'], ...resumen];
    wsEsc = XLSX.utils.aoa_to_sheet(escAoa);
    wsEsc['!cols'] = [{ wch: 22 }, { wch: 46 }, { wch: 13 }, { wch: 14 }, { wch: 70 }];
    for (let c = 0; c <= 4; c++) {
      const a = XLSX.utils.encode_cell({ r: 0, c });
      if (wsEsc[a]) wsEsc[a].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
    }
    hallazgosColIdx = 3;
    var resumenRowOffset = 1;
  }
  // hipervínculos en col "Hallazgos"
  for (const { rowIdx, tabName } of resumenLinks) {
    const a = XLSX.utils.encode_cell({ r: rowIdx + resumenRowOffset, c: hallazgosColIdx });
    if (wsEsc[a]) wsEsc[a].l = { Target: `#'${tabName}'!A1`, Tooltip: 'Ir al detalle' };
  }
  XLSX.utils.book_append_sheet(wb, wsEsc, 'Escenarios');

  // ── Hojas de detalle ───────────────────────────────────────────────────
  const used = new Set(['Escenarios']);
  for (const d of detalles) {
    let name = d.tabName, n = 1;
    while (used.has(name)) name = `${d.tabName.slice(0, 28)}_${n++}`;
    used.add(name);

    const aoa = [['VOLVER A ESCENARIOS'], [], d.header, ...d.dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // hipervínculo "volver"
    if (ws['A1']) ws['A1'].l = { Target: "#'Escenarios'!A1", Tooltip: 'Volver al resumen' };
    if (ws['A1']) ws['A1'].s = { font: { bold: true, color: { rgb: '1F4E79' }, underline: true } };
    // negrita en cabeceras (fila índice 2)
    d.header.forEach((_, c) => {
      const a = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[a]) ws[a].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
    });
    // formato fecha en columnas de fecha (datos empiezan en fila 3)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    d.cols.forEach((col, ci) => {
      if (!DATE_RE.test(col)) return;
      for (let r = 3; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: ci })];
        if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'dd/mm/yyyy'; }
      }
    });
    // anchos aproximados
    ws['!cols'] = d.header.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return Buffer.from(ab).toString('base64');
}

/**
 * Construye los 5 Excel incrustados de Privilegiados (incluye Apps y MFA).
 * @param form — valores del formulario (para la columna Comentario del resumen).
 * @returns { excel_domain_local, excel_apps, excel_servidores, excel_dba }
 *          (campos sin hallazgos → ausentes).
 */
export async function buildExcelPayloadsPrivilegiados(form = {}) {
  const pks = ['priv-windows', 'priv-linux', 'priv-dba', 'priv-sysadmin',
               'priv-domain-admin', 'priv-local-admin', 'priv-apps', 'priv-mfa'];
  const datos = await Promise.all(pks.map(pk => idbGetItem(idbKey(pk)).catch(() => null)));
  const dataByPk = {};
  pks.forEach((pk, i) => { dataByPk[pk] = datos[i]; });

  const out = {};
  for (const [campo, cfg] of Object.entries(PRIV_EXCEL_MAPA)) {
    const b64 = buildWorkbook(cfg, dataByPk, form);
    if (b64) out[campo] = b64;
  }
  return out;
}
