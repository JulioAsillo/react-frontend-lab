'use client';

/**
 * GenerarInformePanel — v22.0
 *
 * Formulario web → genera el informe de certificación .docx
 *
 * Cambios v21.1 (sobre v21.0):
 *  - AUTOCÁLCULO: la mayoría de los campos del informe ya NO se llenan a mano.
 *    Se calculan desde el estado real de la app:
 *      · {ad,apps_*,bd_*,entra}_<escenario>: nº de filas marcadas como
 *        "Incorrecto" en la columna VALIDACIÓN del DataTable correspondiente.
 *      · fecha_corte_*: leídas de IndexedDB (lo que devolvió el backend al
 *        cargar cada fuente en /admin/usuarios/recopilacion/base-datos/*).
 *      · mes_anio: derivado de la primera fecha de corte disponible
 *        (ej. "2026-04-30" → "ABR26").
 *      · pct_*: mockeados con "99.8%".
 *  - El formulario SOLO pide manualmente:
 *      · asunto_escalamiento
 *      · comentarios (*_com_*)
 *      · conclusiones (conclusion_1/2/3)
 *  - Los campos automáticos se muestran en modo lectura, con badge "auto",
 *    estilo distinto y tooltip que explica de dónde sale el valor.
 *  - Botón "🔄 Recalcular automáticos" para refrescar los valores derivados
 *    cuando el usuario acaba de validar más filas en otra pestaña.
 *  - Recálculo automático al montar el componente y cada vez que la pestaña
 *    recupera el foco (event "focus" del window).
 *  - Persistencia: solo se guarda en localStorage la parte MANUAL del form;
 *    los automáticos se recalculan siempre desde la fuente de verdad.
 *
 * Restricción de rol:
 *  - Certificador → ve "Acceso restringido" (no puede generar el informe).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { useAuthStore } from '@/lib/store/authStore';
import { useBDFechasCorte } from '@/lib/store/uiStore';
import {
  calcularCamposAutomaticos,
  esCampoAutomatico,
  resumenValidacionesPorHoja,
} from '@/lib/utils/informeCalculo';
import { idbGetItem } from '@/lib/storage';
import * as XLSX from 'xlsx';
import InformePreview from './InformePreview';

// ── Generador de Excel de hallazgos para incrustar en el .docx ─────────────
// Devuelve un Buffer base64 con el .xlsx del reporte completo.
// La columna VALIDACIÓN aplica la misma cadena de fallback que DataTableRow:
//   1. storedVal (lo que el usuario guardó en localStorage)
//   2. Columna ESCENARIO de la fila (para Perfiles)
//   3. Valor del badgeCol formateado (si está en VALIDACION_OPTS)
//   4. Vacío si ninguno aplica
import { ESCENARIOS_ORDEN } from '@/lib/constants/reportes';

const VALIDACION_OPTS_SET = new Set(['Correcto', 'Incorrecto', 'Sustentado']);

function resolveValidacion(row, sc, store, rowId) {
  // 1. Valor guardado por el usuario
  const storedVal = store[rowId]?.validacion;
  if (storedVal && VALIDACION_OPTS_SET.has(storedVal)) return storedVal;

  // 2. Columna ESCENARIO (usada en Perfiles)
  const rawEsc = row['ESCENARIO'] ?? row['Escenario'] ?? row['escenario'];
  if (rawEsc !== undefined && rawEsc !== null && String(rawEsc).trim() !== '') {
    const v = String(rawEsc).toUpperCase();
    return v === 'CORRECTO' ? 'Correcto' : 'Incorrecto';
  }

  // 3. Valor del badgeCol formateado
  const badgeRaw = row[sc.badgeCol];
  if (badgeRaw !== null && badgeRaw !== undefined && badgeRaw !== '') {
    const formatted = String(badgeRaw).charAt(0).toUpperCase() + String(badgeRaw).slice(1).toLowerCase();
    if (VALIDACION_OPTS_SET.has(formatted)) return formatted;
  }

  return ''; // Sin validación
}

// ── Mapa campo-formulario → (hojaKey, escenarioKey, etiqueta escenario, código H)
// Usado para construir la hoja "Escenarios" de cada Excel incrustado.
const EXCEL_MAPA = {
  ad: [
    { campo: 'ad_cesados',        hoja: 'AD',         hNum: 1, label: 'Usuarios cesados con cuenta activa',          comCampo: 'ad_com_cesados', sc: 'cesados-activos' },
    { campo: 'ad_poscese',        hoja: 'AD',         hNum: 2, label: 'Usuarios con acceso posterior al cese',        comCampo: null, sc: 'postcese' },
    { campo: 'ad_sin_uso_90',     hoja: 'AD',         hNum: 3, label: 'Usuarios sin uso más de 90 días',              comCampo: 'ad_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'ad_sin_sustento',   hoja: 'AD',         hNum: 4, label: 'Usuarios con cuenta sin sustento',             comCampo: 'ad_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'ad_deshabilitados', hoja: 'AD',         hNum: 5, label: 'Usuarios deshabilitados hace más de 1 mes',    comCampo: 'ad_com_deshabilitados', sc: 'bloqueado-30d' },
  ],
  apps: [
    { campo: 'apps_exactus_cesados',      hoja: 'App EXACTUS', hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'apps_exactus_poscese',      hoja: 'App EXACTUS', hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'apps_exactus_sin_uso',      hoja: 'App EXACTUS', hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'apps_exactus_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'apps_exactus_sin_sustento', hoja: 'App EXACTUS', hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'apps_exactus_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'apps_sdp_cesados',          hoja: 'App SDP',     hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'apps_sdp_poscese',          hoja: 'App SDP',     hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'apps_sdp_sin_uso',          hoja: 'App SDP',     hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'apps_sdp_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'apps_sdp_sin_sustento',     hoja: 'App SDP',     hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'apps_sdp_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'apps_sit_cesados',          hoja: 'App SIT',     hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'apps_sit_poscese',          hoja: 'App SIT',     hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'apps_sit_sin_uso',          hoja: 'App SIT',     hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'apps_sit_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'apps_sit_sin_sustento',     hoja: 'App SIT',     hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'apps_sit_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'apps_npac_cesados',         hoja: 'App NPAC',    hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: 'apps_npac_com_cesados', sc: 'cesados-activos' },
    { campo: 'apps_npac_poscese',         hoja: 'App NPAC',    hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'apps_npac_sin_uso',         hoja: 'App NPAC',    hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'apps_npac_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'apps_npac_sin_sustento',    hoja: 'App NPAC',    hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'apps_npac_com_sin_sustento', sc: 'sin-sustento' },
  ],
  bd: [
    { campo: 'bd_exactus_cesados',        hoja: 'DB_EXACTUS', hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'bd_exactus_poscese',        hoja: 'DB_EXACTUS', hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'bd_exactus_sin_uso',        hoja: 'DB_EXACTUS', hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'bd_exactus_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'bd_exactus_sin_sustento',   hoja: 'DB_EXACTUS', hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'bd_exactus_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'bd_exactus_deshabilitados', hoja: 'DB_EXACTUS', hNum: 5, label: 'Usuarios deshabilitados hace más de 1 mes', comCampo: 'bd_exactus_com_deshabilitados', sc: 'bloqueado-30d' },
    { campo: 'bd_sdp_cesados',            hoja: 'DB_SDP',     hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'bd_sdp_poscese',            hoja: 'DB_SDP',     hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'bd_sdp_sin_uso',            hoja: 'DB_SDP',     hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'bd_sdp_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'bd_sdp_sin_sustento',       hoja: 'DB_SDP',     hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'bd_sdp_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'bd_sdp_deshabilitados',     hoja: 'DB_SDP',     hNum: 5, label: 'Usuarios deshabilitados hace más de 1 mes', comCampo: 'bd_sdp_com_deshabilitados', sc: 'bloqueado-30d' },
    { campo: 'bd_sit_cesados',            hoja: 'DB_SIT',     hNum: 1, label: 'Usuarios cesados con cuenta activa',       comCampo: null, sc: 'cesados-activos' },
    { campo: 'bd_sit_poscese',            hoja: 'DB_SIT',     hNum: 2, label: 'Usuarios con acceso posterior al cese',     comCampo: null, sc: 'postcese' },
    { campo: 'bd_sit_sin_uso',            hoja: 'DB_SIT',     hNum: 3, label: 'Usuarios sin uso más de 90 días',           comCampo: 'bd_sit_com_sin_uso', sc: 'inactividad-90d' },
    { campo: 'bd_sit_sin_sustento',       hoja: 'DB_SIT',     hNum: 4, label: 'Usuarios con cuenta sin sustento',          comCampo: 'bd_sit_com_sin_sustento', sc: 'sin-sustento' },
    { campo: 'bd_sit_deshabilitados',     hoja: 'DB_SIT',     hNum: 5, label: 'Usuarios deshabilitados hace más de 1 mes', comCampo: 'bd_sit_com_deshabilitados', sc: 'bloqueado-30d' },
  ],
  entra: [
    { campo: 'entra_cesados',      hoja: 'Entra ID', hNum: 1, label: 'Usuarios cesados con cuenta activa',  comCampo: 'entra_com_cesados', sc: 'cesados-activos' },
    { campo: 'entra_poscese',      hoja: 'Entra ID', hNum: 2, label: 'Usuarios con acceso posterior al cese', comCampo: 'entra_com_poscese', sc: 'postcese' },
    { campo: 'entra_sin_uso_90',   hoja: 'Entra ID', hNum: 3, label: 'Usuarios sin uso más de 90 días',      comCampo: 'entra_com_sin_uso_90', sc: 'inactividad-90d' },
    { campo: 'entra_sin_sustento', hoja: 'Entra ID', hNum: 4, label: 'Usuarios con cuenta sin sustento',     comCampo: 'entra_com_sin_sustento', sc: 'sin-sustento' },
  ],
};

// ── Abreviatura de hoja para nomenclatura H{N}_{ABREV} ───────────────────
function hojaAbrev(sheetKey) {
  const k = sheetKey.toUpperCase().replace(/[\s\-]/g, '_');
  if (k === 'AD')                                          return 'AD';
  if (k === 'ENTRA_ID' || k === 'ENTRAID')                return 'ENTRA';
  if (k === 'PRINCIPAL')                                   return 'PPAL';
  const appM = k.match(/^APP[_\s]?(.+)$/);
  if (appM) { const s = appM[1].replace(/[\s_]/g,''); return s.length>4?s.slice(0,4):s; }
  const dbM  = k.match(/^DB[_\s]?(.+)$/);
  if (dbM)  { const s = dbM[1].replace(/[\s_]/g,'');  return s.length>3?s.slice(0,3):s; }
  return k.replace(/[^A-Z0-9]/g,'').slice(0,4);
}

// ── FNV-1a hash (idéntico a useValidaciones.ts) ───────────────────────────
function fnvHash(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v == null ? '' : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, '0');
}

// ── Convertir fechas a serial Excel ──────────────────────────────────────
const DATE_COL_RE3 = /(fecha|date|login|alta|cese|crea|cambio|bloqueo|time|expir|inicio|fin)/i;
function toExcelRows(rows, colsOrdered) {
  return rows.map(row => {
    const out = {};
    colsOrdered.forEach(c => {
      const val = row[c] ?? '';
      if (DATE_COL_RE3.test(c) && typeof val === 'string' && val) {
        const ddmm = val.match(/^(\d{1,2})[/\-.)](\d{1,2})[/\-.](\d{4})/);
        const iso  = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        let dt = null;
        if (ddmm) dt = new Date(+ddmm[3], +ddmm[2]-1, +ddmm[1]);
        else if (iso) dt = new Date(+iso[1], +iso[2]-1, +iso[3]);
        if (dt && !isNaN(dt.getTime())) {
          out[c] = (dt.getTime() - dt.getTimezoneOffset()*60000) / 86400000 + 25569;
          return;
        }
      }
      out[c] = val;
    });
    return out;
  });
}

function applyDateFmt(ws, colsOrdered) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  colsOrdered.forEach((col, ci) => {
    if (!DATE_COL_RE3.test(col)) return;
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({r, c: ci})];
      if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'dd/mm/yyyy'; }
    }
  });
}

function boldHeader(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({r: 0, c});
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DDEEFF' } } };
  }
}

// ── buildExcelBuffer ───────────────────────────────────────────────────────
// rawData   : datos crudos de IndexedDB para este reporte
// persistKey: 'ad' | 'apps' | 'bd' | 'entra'
// form      : objeto con todos los valores del formulario (para leer num_* y com_*)
function buildExcelBuffer(rawData, persistKey, form) {
  if (!rawData) return null;

  const sheets = Array.isArray(rawData)
    ? (rawData.length ? { Principal: rawData } : {})
    : (typeof rawData === 'object' ? rawData : {});
  if (Object.keys(sheets).length === 0) return null;

  const wb = XLSX.utils.book_new();
  const allBadgeCols = new Set(ESCENARIOS_ORDEN.map(s => s.badgeCol));
  const mapaEntradas = EXCEL_MAPA[persistKey] ?? [];

  // ── Hoja 1: "Escenarios" (resumen) ────────────────────────────────────
  // Columnas: Aplicación | Escenario de monitoreo | N° Hallazgos | Hallazgo | Comentario
  // La columna "Hallazgo" lleva hipervínculo a la hoja de detalle cuando num > 0.
  const COLS_RESUMEN = ['Aplicación / Fuente','Escenario de monitoreo','N° Hallazgos','Hallazgo','Comentario'];

  // Mapa comCampo de fallback: campos manuales que existen en INITIAL_MANUAL
  // aunque el EXCEL_MAPA tenga comCampo:null (poscese y cesados sin comentario explícito).
  const COM_FALLBACK = {
    ad_poscese:               'ad_com_poscese',
    apps_exactus_cesados:     'apps_exactus_com_cesados',
    apps_exactus_poscese:     'apps_exactus_com_poscese',
    apps_sdp_cesados:         'apps_sdp_com_cesados',
    apps_sdp_poscese:         'apps_sdp_com_poscese',
    apps_sit_cesados:         'apps_sit_com_cesados',
    apps_sit_poscese:         'apps_sit_com_poscese',
    apps_npac_poscese:        'apps_npac_com_poscese',
    bd_exactus_cesados:       'bd_exactus_com_cesados',
    bd_exactus_poscese:       'bd_exactus_com_poscese',
    bd_sdp_cesados:           'bd_sdp_com_cesados',
    bd_sdp_poscese:           'bd_sdp_com_poscese',
    bd_sit_cesados:           'bd_sit_com_cesados',
    bd_sit_poscese:           'bd_sit_com_poscese',
  };

  const resumenRows = [];
  // Guardar metadatos para los hipervínculos (índice fila → tabName destino)
  const resumenLinks = []; // { rowIdx, tabName } — solo filas con num > 0
  let lastHoja = null;

  for (const entrada of mapaEntradas) {
    const num = Number(form?.[entrada.campo] ?? 0);
    const abrev = hojaAbrev(entrada.hoja);
    // ── tabName usando el índice REAL de ESCENARIOS_ORDEN ───────────────
    // La hoja de detalle se crea con hNum = ESCENARIOS_ORDEN.indexOf(sc)+1.
    // El EXCEL_MAPA tiene hNum hardcodeado que puede diferir del índice de
    // ESCENARIOS_ORDEN cuando los escenarios no están en el mismo orden.
    // Ejemplo: EXCEL_MAPA.ad_sin_sustento tiene hNum:4, pero sin-sustento
    // está en ESCENARIOS_ORDEN[4] → la hoja de detalle se llama H5_AD.
    // Solución: calcular el hNum real buscando el escenario en ESCENARIOS_ORDEN
    // por su campo sc (que el EXCEL_MAPA mapea vía entrada.sc).
    const scIdx = entrada.sc ? ESCENARIOS_ORDEN.findIndex(s => s.key === entrada.sc) : -1;
    const hNumReal = scIdx >= 0 ? scIdx + 1 : entrada.hNum;
    const tabName = `H${hNumReal}_${abrev}`.slice(0, 31);
    const codigo = num > 0 ? tabName : '-';

    // Comentario: comCampo explícito → fallback por campo → vacío
    const comKey = entrada.comCampo ?? COM_FALLBACK[entrada.campo] ?? null;
    const comentario = comKey ? (form?.[comKey] ?? '') : '';

    const appName = lastHoja !== entrada.hoja ? entrada.hoja : '';
    lastHoja = entrada.hoja;

    const rowIdx = resumenRows.length;
    resumenRows.push({
      'Aplicación / Fuente':    appName,
      'Escenario de monitoreo': entrada.label,
      'N° Hallazgos':           num,
      'Hallazgo':               codigo,
      'Comentario':             comentario,
    });

    if (num > 0) resumenLinks.push({ rowIdx, tabName });
  }

  if (resumenRows.length > 0) {
    const wsSummary = XLSX.utils.json_to_sheet(resumenRows);
    wsSummary['!cols'] = [
      { wch: 18 }, // Aplicación
      { wch: 38 }, // Escenario
      { wch: 14 }, // N° Hallazgos
      { wch: 14 }, // Hallazgo
      { wch: 60 }, // Comentario
    ];
    boldHeader(wsSummary);

    // ── Hipervínculos en columna "Hallazgo" (col índice 3) ──────────────
    // xlsx-js soporta hipervínculos internos con Target: '#NombreHoja!A1'
    const colHallazgo = COLS_RESUMEN.indexOf('Hallazgo'); // 3
    for (const { rowIdx, tabName } of resumenLinks) {
      const addr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colHallazgo }); // +1 por header
      if (wsSummary[addr]) {
        wsSummary[addr].l = { Target: `#'${tabName}'!A1` };
      }
    }

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Escenarios');
  }

  // ── Hojas siguientes: una por escenario con hallazgos ─────────────────
  for (const [sheetKey, rows] of Object.entries(sheets)) {
    if (!rows?.length) continue;

    const abrev = hojaAbrev(sheetKey);
    const slug  = sheetKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const scenariosConHallazgos = ESCENARIOS_ORDEN.filter(sc =>
      rows.some(r => r[sc.badgeCol] != null && r[sc.badgeCol] !== '')
    );
    if (scenariosConHallazgos.length === 0) continue;

    for (const sc of scenariosConHallazgos) {
      const hNum    = ESCENARIOS_ORDEN.indexOf(sc) + 1;
      const tabName = `H${hNum}_${abrev}`.slice(0, 31);

      const scenarioRows = rows.filter(r => r[sc.badgeCol] != null && r[sc.badgeCol] !== '');
      if (scenarioRows.length === 0) continue;

      // Leer store de validaciones
      const storeKey = `${persistKey}-val-${slug}-${sc.key}`;
      let valStore = {};
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
        if (raw) valStore = JSON.parse(raw);
      } catch {}

      // Columnas: del escenario (sin badgeCols de otros escenarios)
      const otherBadgeCols = new Set([...allBadgeCols].filter(c => c !== sc.badgeCol));
      const colSet = new Set();
      const colsOrdered = [];
      scenarioRows.forEach(r =>
        Object.keys(r).forEach(c => {
          if (!colSet.has(c) && !otherBadgeCols.has(c)) { colSet.add(c); colsOrdered.push(c); }
        })
      );

      // Filas de exportación: solo hallazgos (Incorrecto)
      // Un hallazgo es Incorrecto si resolveValidacion lo resuelve como 'Incorrecto',
      // o si el badgeCol tiene cualquier valor no-canónico (postcese "Si", etc.)
      const exportRows = scenarioRows
        .map(row => {
          const out = {};
          colsOrdered.forEach(c => { out[c] = row[c] ?? ''; });
          const rowId      = fnvHash(row);
          const validacion = resolveValidacion(row, sc, valStore, rowId);
          const comentario = valStore[rowId]?.comentario ?? '';
          out['Validación'] = validacion;
          out['Comentario'] = comentario;
          out.__resolvedVal = validacion; // temporal para filtrar
          return out;
        })
        .filter(row => {
          const v = (row.__resolvedVal || '').trim().toLowerCase();
          // Incluir si: es 'incorrecto' explícito, o si no tiene validación canónica
          // (fila postcese con "Si", fila sin validar aún = hallazgo por defecto)
          const isCanonical = v === 'correcto' || v === 'sustentado';
          const result = !isCanonical && v !== ''; // tiene algún valor ≠ correcto/sustentado
          delete row.__resolvedVal;
          return result;
        });
      // Si tras el filtro no quedan hallazgos, no crear la hoja
      if (exportRows.length === 0) continue;

      const allCols = [...colsOrdered, 'Validación', 'Comentario'];
      const processed = toExcelRows(exportRows, allCols);
      const ws = XLSX.utils.json_to_sheet(processed);
      applyDateFmt(ws, allCols);
      boldHeader(ws);
      XLSX.utils.book_append_sheet(wb, ws, tabName);
    }
  }

  if (wb.SheetNames.length === 0) return null;
  const ab = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return Buffer.from(ab).toString('base64');
}

async function buildExcelPayloads(form, auto) {
  const [rawAd, rawApps, rawBd, rawEntra] = await Promise.all([
    idbGetItem('ad-data'),
    idbGetItem('apps-data'),
    idbGetItem('bd-data'),
    idbGetItem('entra-data'),
  ]);
  // Merge form + auto: auto tiene los num_* calculados, form tiene los com_*
  const merged = { ...form, ...auto };
  return {
    excel_ad:    buildExcelBuffer(rawAd,    'ad',    merged) ?? undefined,
    excel_apps:  buildExcelBuffer(rawApps,  'apps',  merged) ?? undefined,
    excel_bd:    buildExcelBuffer(rawBd,    'bd',    merged) ?? undefined,
    excel_entra: buildExcelBuffer(rawEntra, 'entra', merged) ?? undefined,
  };
}

// localStorage key para la parte MANUAL del formulario
const STORAGE_KEY_MANUAL = 'itsecops-informe-form-manual';

// ── Valores iniciales — SOLO la parte manual ──────────────────────────────
const INITIAL_MANUAL = {
  asunto_escalamiento: '',
  mes_anio_manual: '', // fallback manual cuando no hay fechas de corte en IDB
  // AD comentarios
  ad_com_cesados: '', ad_com_poscese: '-', ad_com_sin_uso_90: '',
  ad_com_sin_sustento: '', ad_com_deshabilitados: '',
  // Apps comentarios
  apps_exactus_com_cesados: '-', apps_exactus_com_poscese: '-',
  apps_exactus_com_sin_uso: '', apps_exactus_com_sin_sustento: '',
  apps_sdp_com_cesados: '-', apps_sdp_com_poscese: '-',
  apps_sdp_com_sin_uso: '', apps_sdp_com_sin_sustento: '',
  apps_sit_com_cesados: '-', apps_sit_com_poscese: '-',
  apps_sit_com_sin_uso: '', apps_sit_com_sin_sustento: '',
  apps_npac_com_cesados: '-', apps_npac_com_poscese: '-',
  apps_npac_com_sin_uso: '', apps_npac_com_sin_sustento: '',
  // BD comentarios
  bd_exactus_com_cesados: '-', bd_exactus_com_poscese: '-',
  bd_exactus_com_sin_uso: '', bd_exactus_com_sin_sustento: '', bd_exactus_com_deshabilitados: '',
  bd_sdp_com_cesados: '-', bd_sdp_com_poscese: '-',
  bd_sdp_com_sin_uso: '', bd_sdp_com_sin_sustento: '', bd_sdp_com_deshabilitados: '',
  bd_sit_com_cesados: '-', bd_sit_com_poscese: '-',
  bd_sit_com_sin_uso: '', bd_sit_com_sin_sustento: '', bd_sit_com_deshabilitados: '',
  // EntraID comentarios
  entra_com_cesados: '', entra_com_sin_sustento: '',
  entra_com_sin_uso_90: '', entra_com_poscese: '',
  // Conclusiones (campo único con saltos de línea)
  conclusiones: '',
  areas_trabajo: '',
};

// ── Generador docx ────────────────────────────────────────────────────────
async function generarDocx(valores) {
  const res = await fetch('/api/generar-informe', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(valores),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const json = await res.json(); msg = json.error || msg; } catch {}
    throw new Error(msg);
  }
  const blob     = await res.blob();
  const filename = 'Informe_Certificacion.docx';
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── UI helpers ────────────────────────────────────────────────────────────
function Section({ title, children, hint }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '2px solid var(--border)', paddingBottom: 6, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{title}</span>
        {hint && (
          <span style={{
            fontSize: 10, color: 'var(--text3)', fontWeight: 500,
            textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--mono)',
          }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Field que sabe distinguir entre manual y automático.
 * Si readOnly=true muestra el valor en un input bloqueado con fondo distinto.
 */
function Field({ label, name, value, onChange, textarea, rows: rowsProp, placeholder, readOnly, tip }) {
  const [showTip, setShowTip] = React.useState(false);
  const tipRef = React.useRef(null);

  const base = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    background: readOnly ? 'var(--bg3)' : 'var(--bg)',
    color: readOnly ? 'var(--text2)' : 'var(--text)',
    fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box',
    cursor: readOnly ? 'default' : 'text',
  };

  // Auto-grow para textareas: expande si el contenido supera el tamaño base
  function handleAutoGrow(e) {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    if (onChange) onChange(e);
  }

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{
        fontSize: 11, color: 'var(--text2)',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
      }}>
        <span style={{ flex: 1 }}>{label}</span>
        {readOnly && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 999,
            background: 'var(--accent-bg)', color: 'var(--accent)',
            fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.05em',
            cursor: 'default',
          }}>
            AUTO
          </span>
        )}
        {tip && (
          <span
            ref={tipRef}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: readOnly ? 'var(--accent-bg)' : 'var(--bg3)',
              border: '1px solid var(--border)',
              color: readOnly ? 'var(--accent)' : 'var(--text3)',
              fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'help', flexShrink: 0, userSelect: 'none', position: 'relative',
            }}
          >
            ?
            {showTip && (
              <div style={{
                position: 'absolute', bottom: '120%', right: 0,
                width: 240, padding: '8px 10px',
                background: 'var(--text)', color: 'var(--bg2)',
                fontSize: 10, lineHeight: 1.55,
                borderRadius: 6, zIndex: 999,
                fontFamily: 'var(--sans)', fontWeight: 400,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                pointerEvents: 'none', whiteSpace: 'pre-wrap',
              }}>
                {tip}
                <div style={{
                  position: 'absolute', bottom: -5, right: 5,
                  width: 8, height: 8, background: 'var(--text)',
                  transform: 'rotate(45deg)',
                }} />
              </div>
            )}
          </span>
        )}
      </label>
      {textarea
        ? <textarea
            name={name}
            value={value ?? ''}
            onChange={readOnly ? undefined : handleAutoGrow}
            placeholder={placeholder}
            rows={rowsProp ?? 4}
            readOnly={readOnly}
            style={{
              ...base,
              resize: 'vertical',
              lineHeight: 1.6,
              minHeight: rowsProp ? rowsProp * 20 : 80,
              overflow: 'auto',
            }}
          />
        : <input
            name={name}
            value={value ?? ''}
            onChange={readOnly ? undefined : onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            style={{ ...base, height: 32 }}
          />
      }
    </div>
  );
}

/**
 * Fila de números compacta para mostrar hallazgos (todos en modo lectura).
 */
function NumRowAuto({ labels, names, values, tips }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${labels.length}, 1fr)`,
      gap: 8, marginBottom: 8,
    }}>
      {labels.map((label, i) => (
        <div key={names[i]}>
          <label style={{
            fontSize: 10, color: 'var(--text3)',
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2,
          }}>
            <span>{label}</span>
          </label>
          <div title={tips?.[i] || 'Cantidad de filas validadas como Incorrecto'}
            style={{
              width: '100%', padding: '5px 8px', fontSize: 14,
              textAlign: 'center', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg3)',
              color: parseInt(values[names[i]] ?? '0', 10) > 0 ? 'var(--inc-text)' : 'var(--text3)',
              fontFamily: 'var(--mono)', fontWeight: 700,
              boxSizing: 'border-box', cursor: 'help',
            }}>
            {values[names[i]] ?? '0'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pantalla "Acceso restringido" para certificador ───────────────────────
function AccesoRestringido() {
  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">usuarios / <span>informe de certificación</span></div>
          <h2 className="page-title">Informe de Certificación</h2>
        </div>
      </div>
      <div className="empty-state" style={{ padding: '60px 24px' }}>
        <span className="empty-icon" style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Acceso restringido</p>
        <p style={{ color: 'var(--text3)', fontSize: 13, maxWidth: 460, textAlign: 'center' }}>
          La generación del informe de certificación está disponible solo
          para los roles <strong>Administrador</strong> y <strong>Usuario</strong>.
          Tu rol actual (<strong>Certificador</strong>) puede validar hallazgos,
          pero no generar el .docx final.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function GenerarInformePanel() {
  const { user } = useAuthStore();
  // bdFechas: Record<sourceId, fechaCorte> — reactivo, actualizado por cargarFuente()
  // sin IDB async, disponible desde el primer render si las BDs ya se cargaron antes.
  const bdFechas = useBDFechasCorte();

  // Estado manual persistente
  const [manual, setManual] = usePersistedState(STORAGE_KEY_MANUAL, INITIAL_MANUAL);

  // Estado de campos calculados (NO persistido — siempre re-deriva del estado de la app)
  const [auto, setAuto] = useState({});
  const [autoLastUpdate, setAutoLastUpdate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [ok,      setOk]      = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Tab activo: 'form' | 'preview'
  const [activeTab, setActiveTab] = useState('form');
  // Payload del preview — se actualiza cada vez que se recalcula el informe
  const [previewPayload, setPreviewPayload] = useState(null);

  // ── Recalcular campos automáticos ─────────────────────────────────────
  // Patrón "ref estable": todos los valores mutables se leen por ref,
  // así el useCallback queda con deps [] y no se regenera en cada keystroke.
  // Esto evita la race condition donde el retryTimer / bd-cargadas disparan
  // una versión "vieja" del callback que tenía el manual desactualizado.
  const bdFechasRef   = useRef(bdFechas);
  const manualRef     = useRef(manual);
  const recalcularRef = useRef(null);

  // Sincronizar refs con los valores reactivos (sin afectar estabilidad del callback)
  useEffect(() => { bdFechasRef.current = bdFechas; }, [bdFechas]);
  useEffect(() => { manualRef.current   = manual;   }, [manual]);

  const recalcular = useCallback(async () => {
    const next   = await calcularCamposAutomaticos(bdFechasRef.current);
    const excels = await buildExcelPayloads(manualRef.current, next);
    setAuto(next);
    setAutoLastUpdate(new Date());
    // Merge preservando lo que el usuario escribió en manual
    setPreviewPayload(prev => ({ ...prev, ...manualRef.current, ...next, ...excels }));
  }, []); // estable — no depende de manual ni de form

  // Mantener recalcularRef actualizado (ya es estable, pero se mantiene por consistencia)
  useEffect(() => { recalcularRef.current = recalcular; }, [recalcular]);

  // Cuando bdFechas cambia (una BD terminó de cargar), recalcular automáticamente.
  // Esto hace que las fechas de corte aparezcan en el formulario en tiempo real
  // sin que el usuario tenga que hacer nada.
  useEffect(() => {
    recalcularRef.current?.();
  }, [bdFechas]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount: listeners estables con [] ─────────────────────────────────
  // useEffect con [] → se registra UNA SOLA VEZ, evita la race condition
  // donde 'bd-cargadas' dispara antes del mount del panel.
  // El retry de 800 ms cubre el caso donde IDB aún no está escrito cuando
  // el panel monta (las BDs estaban cargando en paralelo en background).
  useEffect(() => {
    recalcularRef.current?.();

    // Retry corto: cubre la race condition con bd-cargadas previo al mount
    const retryTimer = setTimeout(() => { recalcularRef.current?.(); }, 800);

    function onFocus()      { recalcularRef.current?.(); }
    function onBDCargadas() { recalcularRef.current?.(); }

    window.addEventListener('focus', onFocus);
    window.addEventListener('bd-cargadas', onBDCargadas);
    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('bd-cargadas', onBDCargadas);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── form = manual + auto (lo que se envía a la API) ───────────────────
  const form = { ...manual, ...auto };

  function handleChange(e) {
    const { name, value } = e.target;
    if (esCampoAutomatico(name)) return;
    const nextManual = { ...manual, [name]: value };
    setManual(nextManual);
    // Actualizar payload de preview con el cambio manual (los autos ya están en state)
    setPreviewPayload(prev => ({ ...(prev || { ...manual, ...auto }), [name]: value }));
  }

  function handleGuardarValores() {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2200);
  }

  function handleLimpiar() {
    setManual(INITIAL_MANUAL);
    setShowClearConfirm(false);
  }

  async function handleGenerar() {
    setLoading(true); setError(null); setOk(false);
    try {
      // Recálculo fresco de valores automáticos
      const fresh = await calcularCamposAutomaticos(bdFechas);
      // Si no hay fecha de corte cargada en IDB, usar el valor manual
      if (!fresh.mes_anio && manual.mes_anio_manual) {
        fresh.mes_anio = manual.mes_anio_manual;
      }
      // Generar Excel de hallazgos para incrustar en el .docx
      const excels = await buildExcelPayloads(form, auto);
      const payload = { ...manual, ...fresh, ...excels };
      await generarDocx(payload);
      setAuto(fresh);
      setAutoLastUpdate(new Date());
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err.message || 'Error al generar el informe');
    } finally {
      setLoading(false);
    }
  }

  // Indicadores
  const camposEditados = Object.keys(INITIAL_MANUAL).filter(k => {
    const a = String(manual?.[k] ?? '');
    const b = String(INITIAL_MANUAL[k] ?? '');
    return a !== b;
  }).length;

  // Resumen visual de hallazgos automáticos
  const totalHallazgosAuto = useMemo(() => {
    let n = 0;
    for (const [k, v] of Object.entries(auto)) {
      if (k.startsWith('pct_') || k.startsWith('fecha_') || k === 'mes_anio') continue;
      n += parseInt(v || '0', 10) || 0;
    }
    return n;
  }, [auto]);

  const tipHallazgo = 'Cantidad de filas validadas como "Incorrecto" en la columna VALIDACIÓN del DataTable correspondiente. Si pones una validación distinta (Correcto/Sustentado), el número baja automáticamente.';

  return (
    <div className="panel">
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
            <div className="modal-title">¿Limpiar los campos manuales?</div>
            <div className="modal-message">
              Se borrarán los comentarios y conclusiones que ingresaste manualmente ({camposEditados} campo{camposEditados !== 1 ? 's' : ''}).
              Los valores automáticos (hallazgos, fechas) no se tocan: se recalculan desde las validaciones.
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowClearConfirm(false)}>Cancelar</button>
              <button className="modal-btn modal-confirm" onClick={handleLimpiar}>Sí, limpiar</button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">usuarios / <span>informe de certificación</span></div>
          <h2 className="page-title">
            Generar Informe de Certificación
            <span style={{
              marginLeft: 10, fontSize: 11, fontFamily: 'var(--mono)',
              padding: '2px 8px', borderRadius: 10,
              background: totalHallazgosAuto > 0 ? 'var(--inc-bg)' : 'var(--ok-bg)',
              color:      totalHallazgosAuto > 0 ? 'var(--inc-text)' : 'var(--ok-text)',
              verticalAlign: 'middle', fontWeight: 700,
            }}>
              {totalHallazgosAuto} hallazgo{totalHallazgosAuto !== 1 ? 's' : ''} automático{totalHallazgosAuto !== 1 ? 's' : ''}
            </span>
          </h2>
        </div>
        <div className="topbar-right" style={{ gap: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {error && (
            <span style={{ fontSize: 12, color: 'var(--inc-text)', marginRight: 8, maxWidth: 320 }}>
              ❌ {error}
            </span>
          )}
          <button
            className="btn-export-small"
            onClick={recalcular}
            disabled={loading}
            title="Vuelve a leer las validaciones y fechas de corte desde el navegador"
          >
            🔄 Recalcular
          </button>
          <button
            className="btn-export-small"
            onClick={async () => {
              const fresh = await calcularCamposAutomaticos(bdFechasRef.current);
              if (!fresh.mes_anio && manualRef.current.mes_anio_manual) fresh.mes_anio = manualRef.current.mes_anio_manual;
              const excels = await buildExcelPayloads(manualRef.current, fresh);
              setPreviewPayload({ ...manualRef.current, ...fresh, ...excels });
              setAuto(fresh);
            }}
            disabled={loading}
            title="Actualiza la vista previa del documento manteniendo la posición de scroll"
          >
            👁 Vista previa
          </button>
          <button
            className="btn-export-small"
            onClick={() => setShowClearConfirm(true)}
            disabled={loading || camposEditados === 0}
          >
            🗑 Limpiar manuales
          </button>
          <button
            className="btn-export"
            onClick={handleGuardarValores}
            disabled={loading}
            style={savedMsg ? {
              background: 'var(--ok-bg)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)',
            } : {}}
          >
            {savedMsg ? '✓ Guardado' : '💾 Guardar valores'}
          </button>
          <button className="btn-generate" onClick={handleGenerar} disabled={loading}>
            {loading ? <><span className="spinner" /> Generando…</>
             : ok     ? '✓ Descargado'
             : '⬇ Generar .docx'}
          </button>
        </div>
      </div>


      {/* ── Split view: Formulario (izq) + Vista Previa (der) en vivo ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Panel izquierdo: formulario */}
        <div style={{
          flex: '0 0 50%', overflow: 'auto', padding: '24px 28px',
          borderRight: '2px solid var(--border)',
        }}>

        {/* Banner explicativo */}
        <div style={{
          marginBottom: 20, padding: '10px 14px',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent2)',
          borderRadius: 'var(--radius)',
          fontSize: 12, color: 'var(--text2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div style={{ flex: 1, lineHeight: 1.55 }}>
              <strong>Modo automático:</strong> los campos marcados con
              {' '}<span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 999,
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--mono)', fontWeight: 700,
              }}>AUTO</span>{' '}
              se calculan desde tus validaciones en los DataTables. Cuenta filas
              con <strong>VALIDACIÓN = Incorrecto</strong>. Si marcas algo como
              «Correcto» o «Sustentado», el número baja. Los comentarios y
              conclusiones se siguen escribiendo a mano.
              {autoLastUpdate && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Última actualización automática: {autoLastUpdate.toLocaleTimeString('es-PE')}
                </div>
              )}
            </div>
          </div>
        </div>

        <Section title="Cabecera">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* mes_anio: automático si hay fechas de corte cargadas, manual si no */}
            {form.mes_anio ? (
              <Field label="Mes / Año" name="mes_anio" value={form.mes_anio}
                readOnly tip="Calculado de la fecha de corte de GDH/AD/Entra/Apps/BD. Ej: 30/04/2026 → ABR26" />
            ) : (
              <Field label="Mes / Año (ingresa manualmente — carga fuentes BD primero)"
                name="mes_anio_manual" value={manual.mes_anio_manual ?? ''}
                onChange={handleChange}
                placeholder="ABR26" />
            )}
          </div>
        </Section>

        <Section title="Fechas de Corte" hint="(automáticas — desde Recopilar Información)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Field label="GDH"             name="fecha_corte_gdh"   value={form.fecha_corte_gdh}   readOnly tip="Desde /admin/usuarios/recopilacion/base-datos/gdh" />
            <Field label="Apps Críticas"   name="fecha_corte_apps"  value={form.fecha_corte_apps}  readOnly tip="Desde APP_SIT (con fallback a SDP/NPAC/EXACTUS)" />
            <Field label="BD Críticas"     name="fecha_corte_bd"    value={form.fecha_corte_bd}    readOnly tip="Desde DB_SIT (con fallback a SDP/EXACTUS)" />
            <Field label="EntraID"         name="fecha_corte_entra" value={form.fecha_corte_entra} readOnly tip="Desde /admin/usuarios/recopilacion/base-datos/entra-id" />
            <Field label="Active Directory" name="fecha_corte_ad"   value={form.fecha_corte_ad}    readOnly tip="Desde /admin/usuarios/recopilacion/base-datos/ad" />
          </div>
        </Section>

        <Section title="Active Directory — Hallazgos" hint="(automáticos — Incorrectos por escenario)">
          <NumRowAuto
            labels={['Cesados activos', 'Poscese', 'Sin uso +90d', 'Sin sustento', 'Deshabilitados +1m']}
            names={['ad_cesados','ad_poscese','ad_sin_uso_90','ad_sin_sustento','ad_deshabilitados']}
            values={form}
            tips={Array(5).fill(tipHallazgo)}
          />
        </Section>

        <Section title="Active Directory — Comentarios">
          {[
            ['Cesados activos',      'ad_com_cesados',       true,  '- 1 Usuario identificado...', 'Describe los hallazgos de cuentas AD activas pertenecientes a colaboradores cesados. Incluir usuario, área y acción solicitada.'],
            ['Poscese',              'ad_com_poscese',       false, '-',                            'Comentario sobre accesos post-cese en AD. Si no hay hallazgos, dejar "-".'],
            ['Sin uso +90 días',     'ad_com_sin_uso_90',    true,  '- Se solicita la deshabilitación...', 'Describe cuentas AD sin actividad en los últimos 90 días. Indicar acción de remediación recomendada.'],
            ['Sin sustento',         'ad_com_sin_sustento',  true,  '- 11 Usuarios con Alta en PRIMA...', 'Describe cuentas AD sin justificación de negocio registrada. Mencionar usuarios y el sustento esperado.'],
            ['Deshabilitados +1 mes','ad_com_deshabilitados', true, '- Se mantendrán las cuentas...', 'Describe cuentas AD deshabilitadas hace más de un mes. Indicar si se mantienen o se eliminan.'],
          ].map(([label, name, ta, ph, hint]) => (
            <Field key={name} label={label} name={name} value={form[name]} onChange={handleChange} textarea={ta} tip={hint} />
          ))}
        </Section>

        <Section title="Aplicaciones Críticas — Hallazgos" hint="(automáticos)">
          {[
            { label: 'Cesados activos', names: ['apps_exactus_cesados','apps_sdp_cesados','apps_sit_cesados','apps_npac_cesados'] },
            { label: 'Poscese',         names: ['apps_exactus_poscese','apps_sdp_poscese','apps_sit_poscese','apps_npac_poscese'] },
            { label: 'Sin uso +90d',    names: ['apps_exactus_sin_uso','apps_sdp_sin_uso','apps_sit_sin_uso','apps_npac_sin_uso'] },
            { label: 'Sin sustento',    names: ['apps_exactus_sin_sustento','apps_sdp_sin_sustento','apps_sit_sin_sustento','apps_npac_sin_sustento'] },
          ].map(row => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{row.label}</div>
              <NumRowAuto
                labels={['EXACTUS','SDP','SIT','NPAC']}
                names={row.names}
                values={form}
                tips={Array(4).fill(tipHallazgo)}
              />
            </div>
          ))}
        </Section>

        <Section title="Aplicaciones Críticas — Comentarios">
          {['exactus','sdp','sit','npac'].map(app => (
            <div key={app} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>{app}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Cesados"      name={`apps_${app}_com_cesados`}      value={form[`apps_${app}_com_cesados`]}      onChange={handleChange} tip={`Comentario sobre cuentas de ${app.toUpperCase()} activas de colaboradores cesados. Si no aplica, dejar "-".`} />
                <Field label="Poscese"      name={`apps_${app}_com_poscese`}      value={form[`apps_${app}_com_poscese`]}      onChange={handleChange} tip={`Comentario sobre accesos post-cese en ${app.toUpperCase()}. Si no aplica, dejar "-".`} />
                <Field label="Sin uso +90d" name={`apps_${app}_com_sin_uso`}      value={form[`apps_${app}_com_sin_uso`]}      onChange={handleChange} textarea tip={`Describe los usuarios de ${app.toUpperCase()} sin actividad en 90 días. Indicar acción de remediación sugerida.`} />
                <Field label="Sin sustento" name={`apps_${app}_com_sin_sustento`} value={form[`apps_${app}_com_sin_sustento`]} onChange={handleChange} textarea tip={`Usuarios de ${app.toUpperCase()} sin justificación de negocio registrada. Indicar el sustento esperado o acción.`} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="Base de Datos — Hallazgos" hint="(automáticos)">
          {[
            { label: 'Cesados activos', names: ['bd_exactus_cesados','bd_sdp_cesados','bd_sit_cesados'] },
            { label: 'Poscese',         names: ['bd_exactus_poscese','bd_sdp_poscese','bd_sit_poscese'] },
            { label: 'Sin uso +90d',    names: ['bd_exactus_sin_uso','bd_sdp_sin_uso','bd_sit_sin_uso'] },
            { label: 'Sin sustento',    names: ['bd_exactus_sin_sustento','bd_sdp_sin_sustento','bd_sit_sin_sustento'] },
            { label: 'Deshabilitados',  names: ['bd_exactus_deshabilitados','bd_sdp_deshabilitados','bd_sit_deshabilitados'] },
          ].map(row => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{row.label}</div>
              <NumRowAuto
                labels={['BD EXACTUS','BD SDP','BD SIT']}
                names={row.names}
                values={form}
                tips={Array(3).fill(tipHallazgo)}
              />
            </div>
          ))}
        </Section>

        <Section title="Base de Datos — Comentarios">
          {['exactus','sdp','sit'].map(bd => (
            <div key={bd} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>BD {bd}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Cesados"       name={`bd_${bd}_com_cesados`}       value={form[`bd_${bd}_com_cesados`]}       onChange={handleChange} tip={`Comentario sobre usuarios de BD ${bd.toUpperCase()} activos pertenecientes a cesados. Si no aplica, "-".`} />
                <Field label="Poscese"        name={`bd_${bd}_com_poscese`}        value={form[`bd_${bd}_com_poscese`]}        onChange={handleChange} tip={`Comentario sobre accesos post-cese en BD ${bd.toUpperCase()}. Si no aplica, "-".`} />
                <Field label="Sin uso +90d"   name={`bd_${bd}_com_sin_uso`}        value={form[`bd_${bd}_com_sin_uso`]}        onChange={handleChange} textarea tip={`Usuarios de BD ${bd.toUpperCase()} sin actividad en 90 días. Indicar acción de remediación sugerida.`} />
                <Field label="Sin sustento"   name={`bd_${bd}_com_sin_sustento`}   value={form[`bd_${bd}_com_sin_sustento`]}   onChange={handleChange} textarea tip={`Usuarios de BD ${bd.toUpperCase()} sin justificación de negocio. Indicar el sustento esperado.`} />
                <Field label="Deshabilitados" name={`bd_${bd}_com_deshabilitados`} value={form[`bd_${bd}_com_deshabilitados`]} onChange={handleChange} textarea tip={`Usuarios deshabilitados en BD ${bd.toUpperCase()}. Indicar si se mantienen deshabilitados o se eliminan.`} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="EntraID — Hallazgos" hint="(automáticos)">
          <NumRowAuto
            labels={['Cesados activos','Poscese','Sin uso +90d','Sin sustento']}
            names={['entra_cesados','entra_poscese','entra_sin_uso_90','entra_sin_sustento']}
            values={form}
            tips={Array(4).fill(tipHallazgo)}
          />
        </Section>

        <Section title="EntraID — Comentarios">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Cesados"      name="entra_com_cesados"      value={form.entra_com_cesados}      onChange={handleChange} textarea tip="Describe usuarios de Entra ID pertenecientes a colaboradores cesados. Indicar acción de remediación tomada o pendiente." />
            <Field label="Poscese"      name="entra_com_poscese"      value={form.entra_com_poscese}      onChange={handleChange} textarea tip="Comentario sobre accesos Entra ID de usuarios post-cese. Si no hay hallazgos, dejar '-'." />
            <Field label="Sin uso +90d" name="entra_com_sin_uso_90"   value={form.entra_com_sin_uso_90}   onChange={handleChange} textarea tip="Usuarios de Entra ID sin inicio de sesión en 90 días. Indicar si se solicita deshabilitar o justificar." />
            <Field label="Sin sustento" name="entra_com_sin_sustento" value={form.entra_com_sin_sustento} onChange={handleChange} textarea tip="Usuarios de Entra ID sin justificación de negocio en el sistema. Indicar el sustento esperado o acción." />
          </div>
        </Section>
        
        <Section title="Unidad de Negocio">
          <Field
            label="Unidad de Negocio"
            name="areas_trabajo"
            value={form.areas_trabajo}
            onChange={handleChange}
            textarea
            rows={6}
            placeholder={"Jefe directo (Hugo Reynaldo Sanchez | Ana Lucia Bacigalupo | Ofelia Mariela Novoa)"}
            tip="Colocar los nombres de los jefes directos"
          />
        </Section>

        <Section title="Asunto de Escalamiento a Riesgos">
          <Field label="Asunto escalamiento Riesgos" name="asunto_escalamiento"
              value={form.asunto_escalamiento} onChange={handleChange}
              placeholder="FEB26 [RIESGOS] PRIMA - ..."
              tip="Texto que irá como asunto en el correo de escalamiento a Riesgos. Ejemplo: 'ABR26 [RIESGOS] PRIMA - Hallazgos de Certificación'" />
        </Section>

        <Section title="Conclusiones">
          <Field
            label="Conclusiones"
            name="conclusiones"
            value={form.conclusiones}
            onChange={handleChange}
            textarea
            rows={8}
            placeholder={"Las unidades operativas son responsables de la remediación...\nLa unidad de Riesgos es responsable de...\nSe identificó cuentas activas de colaboradores cesados..."}
            tip="Escribe las conclusiones del informe. Usa Enter (salto de línea) para separar cada conclusión — se imprimirán en el .docx respetando los saltos. Una conclusión por línea."
          />
        </Section>

        </div>
        {/* end form panel */}

        {/* Panel derecho: vista previa */}
        <div style={{
          flex: '0 0 50%', overflow: 'hidden',
          background: 'var(--bg3)',
          display: 'flex', flexDirection: 'column',
          minHeight: 0,
        }}>
          <InformePreview payload={previewPayload} visible={true} />
        </div>
        {/* end preview panel */}

      </div>
      {/* end split */}
    </div>
  );
}
