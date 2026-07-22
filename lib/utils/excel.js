import * as XLSX from "xlsx";
import { displayAccion } from "@/lib/constants/accionCorrectiva";
import { rowIdFnv } from '@/lib/utils/rowId';

/**
 * Detector y parser de fechas para export Excel (v11).
 *
 * Problemas resueltos:
 *   - new Date("21/03/2024") devuelve Invalid Date en Chrome y NaN en Firefox.
 *     Antes el toExcelDate retornaba el string crudo, perdiendo la posibilidad
 *     de filtrar por año/mes en Excel.
 *   - Detección de columnas por nombre se ampliará, y se valida adicionalmente
 *     que al menos algunas filas tengan valores parseables.
 *   - El formato Excel se aplica sobre las celdas que SÍ resultaron numéricas
 *     (no sobre todas las de la columna detectada), evitando que celdas vacías
 *     o no-fecha aparezcan como "0/1/1900".
 */

// Patrones aceptados (en orden de prueba):
//   1. ISO 8601: 2024-03-21, 2024-03-21T10:30:00Z, 2024-03-21 10:30:00
//   2. DD/MM/YYYY o DD-MM-YYYY (formato peruano/europeo)
//   3. YYYY/MM/DD
//   4. Fallback: new Date(val) (timestamps numéricos, etc.)
const ISO_RE      = /^(\d{4})-(\d{2})-(\d{2})([T ](\d{2}):(\d{2})(:(\d{2}))?)?/;
const DDMMYYYY_RE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})([ T](\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
const YYYYMMDD_RE = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/;

function parseAsDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    // Heurística: si es número grande, asumimos timestamp ms; pequeño,
    // probablemente es un campo numérico cualquiera (no fecha).
    if (val > 1e10) return new Date(val);
    return null;
  }
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (!s) return null;

  let m;
  if ((m = s.match(ISO_RE))) {
    const [_, y, mo, d, , h = "0", mi = "0", , se = "0"] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d),
                        Number(h), Number(mi), Number(se));
    return isNaN(dt.getTime()) ? null : dt;
  }
  if ((m = s.match(DDMMYYYY_RE))) {
    const [_, d, mo, y, , h = "0", mi = "0", , se = "0"] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d),
                        Number(h), Number(mi), Number(se));
    return isNaN(dt.getTime()) ? null : dt;
  }
  if ((m = s.match(YYYYMMDD_RE))) {
    const [_, y, mo, d] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  // Último recurso: dejar al motor del navegador. Solo aceptamos si no es Invalid.
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function toExcelSerial(date) {
  // Excel: serial = días desde 1900-01-01 (con bug del día 60 de Lotus 1-2-3,
  // por eso el offset 25569 funciona para 1970+ que es nuestro caso real).
  // Compensamos el offset de zona horaria local para que el día visualizado
  // en Excel coincida con la fecha del usuario.
  const utcMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return utcMs / 86400000 + 25569;
}

const DATE_COL_RE = /(fecha|date|login|alta|cese|crea|cambio|bloqueo|time|expir|inicio|fin|nacim)/i;

function detectDateCols(rows) {
  if (!rows || rows.length === 0) return [];
  const firstRow = rows[0] ?? {};
  const candidates = Object.keys(firstRow).filter((k) => DATE_COL_RE.test(k));
  if (candidates.length === 0) return [];
  // Confirmar que al menos una fila tiene un valor parseable como fecha.
  // Esto evita formatear como fecha columnas que solo coinciden por nombre
  // pero contienen texto (ej. "Tipo de Login" → "SSO"/"Local").
  return candidates.filter((col) => {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      if (parseAsDate(rows[i]?.[col]) !== null) return true;
    }
    return false;
  });
}

/**
 * Procesa un array de filas convirtiendo columnas de fecha a serial Excel.
 */
function processRowsForExcel(rows) {
  if (!rows || rows.length === 0) return rows;
  const dateCols = detectDateCols(rows);
  if (dateCols.length === 0) return rows;

  return rows.map((row) => {
    const out = { ...row };
    dateCols.forEach((col) => {
      const dt = parseAsDate(row[col]);
      if (dt) out[col] = toExcelSerial(dt);
      // Si no es parseable, dejamos el valor crudo intacto (puede ser texto
      // tipo "Sin actividad") en la celda — Excel lo mostrará como texto.
    });
    return out;
  });
}

/**
 * Aplica formato de fecha a las celdas numéricas de columnas-fecha.
 */
function applyDateFormat(ws, rows) {
  if (!rows || rows.length === 0) return;
  const firstRow = rows[0];
  const cols = Object.keys(firstRow);
  const dateCols = detectDateCols(rows);
  if (dateCols.length === 0) return;

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  dateCols.forEach((col) => {
    const colIdx = cols.indexOf(col);
    if (colIdx < 0) return;
    for (let r = 1; r <= range.e.r; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: colIdx });
      const cell = ws[cellAddr];
      // Solo aplicamos formato a celdas que SÍ resultaron numéricas tras el
      // parser. Las que quedaron como string se respetan como texto.
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = "dd/mm/yyyy";
      }
    }
  });
}

export function exportToExcel(rows, filename) {
  if (!rows || rows.length === 0) return;
  const processed = processRowsForExcel(rows);
  const ws = XLSX.utils.json_to_sheet(processed);
  applyDateFormat(ws, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, filename);
}

/**
 * exportAllToExcel — multi-hoja para reportes con escenarios.
 *
 * v12: ya no es un dump crudo. Cada escenario disponible se exporta en su
 * propia hoja con las columnas del escenario + Validación + Comentario.
 * La validación respeta el mismo orden que en pantalla:
 *   manual (localStorage) → auto desde badgeCol → vacío.
 *
 * Parámetros:
 *   rows: array plano de filas (flattenData ya aplicado).
 *   persistKey: clave del reporte para leer las validaciones del usuario.
 *   scenarios: array de { key, label, badgeCol } a exportar (filtrado a los
 *              que realmente tienen filas — el caller decide).
 *   reportLabel: nombre del archivo final.
 *
 * Por compatibilidad con código que aún espera la firma vieja, si scenarios
 * NO se pasa (undefined) se mantiene el comportamiento legacy.
 */
export function exportAllToExcel(rows, scenarios, reportLabel, persistKey) {
  const wb = XLSX.utils.book_new();

  // Modo legacy (sin escenarios): un dump crudo en una sola hoja.
  if (!scenarios || scenarios.length === 0) {
    const flatRows = Array.isArray(rows) ? rows : [];
    if (flatRows.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "Reporte");
    } else {
      const processed = processRowsForExcel(flatRows);
      const ws = XLSX.utils.json_to_sheet(processed);
      applyDateFormat(ws, flatRows);
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    }
    XLSX.writeFile(wb, `${reportLabel}.xlsx`);
    return { ok: true, sheets: 1, filename: `${reportLabel}.xlsx` };
  }

  // Modo nuevo (multi-hoja con validaciones por escenario)
  // v16: cada hoja solo incluye la badgeCol de SU escenario,
  // no las de los otros escenarios (fix de columnas extra en Excel).
  const allScenarioBadgeCols = new Set(scenarios.map((s) => s.badgeCol));

  let sheetsAdded = 0;
  scenarios.forEach((scenario) => {
    const badgeCol = scenario.badgeCol;
    const scenarioRows = rows.filter((r) => r[badgeCol] != null && r[badgeCol] !== "");
    if (scenarioRows.length === 0) return;

    // Leer validaciones guardadas en localStorage para este escenario
    const valStoreKey = `${persistKey}-val-${scenario.key}`;
    let valStore = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(valStoreKey) : null;
      if (raw) valStore = JSON.parse(raw);
    } catch {}

    // Columnas de la hoja: todas las presentes en este escenario,
    // EXCEPTO las badgeCols de OTROS escenarios (no pertenecen a esta hoja).
    const otherBadgeCols = new Set([...allScenarioBadgeCols].filter((c) => c !== badgeCol));
    const colSet = new Set();
    const colsOrdered = [];
    scenarioRows.forEach((r) =>
      Object.keys(r).forEach((c) => {
        if (!colSet.has(c) && !otherBadgeCols.has(c)) {
          colSet.add(c);
          colsOrdered.push(c);
        }
      })
    );

    const exportRows = scenarioRows.map((row) => {
      const out = {};
      colsOrdered.forEach((c) => { out[c] = row[c] ?? ""; });
      const id = rowIdForExport(row);
      const stored = valStore[id] ?? {};
      const manual = stored.validacion ?? null;
      let fallback = null;
      const rawEscenario = row["ESCENARIO"] || row["Escenario"] || row["escenario"];
      if (rawEscenario !== undefined && rawEscenario !== null && String(rawEscenario).trim() !== "") {
        const v = String(rawEscenario).toUpperCase();
        fallback = v === "CORRECTO" ? "Correcto" : "Incorrecto";
      } else if (badgeCol) {
        const badgeVal = String(row[badgeCol] || "");
        const bvText = badgeVal.trim().toLowerCase();
        if (bvText === "correcto") fallback = "Correcto";
        else if (bvText === "incorrecto") fallback = "Incorrecto";
        else if (bvText === "sustentado") fallback = "Sustentado";
      }
      let resolved = manual ?? fallback ?? "";
      out["Validación"] = resolved;
      out["Acción Correctiva"] = displayAccion(stored.accion);
      out["Comentario"] = stored.comentario ?? "";
      return out;
    });

    const processed = processRowsForExcel(exportRows);
    const ws = XLSX.utils.json_to_sheet(processed);
    applyDateFormat(ws, exportRows);
    const safeName = scenario.label.slice(0, 31).replace(/[:\\/?*[\]]/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, safeName);
    sheetsAdded++;
  });

  if (sheetsAdded === 0) {
    // No había escenarios con filas: caer al dump crudo
    const flatRows = Array.isArray(rows) ? rows : [];
    const processed = processRowsForExcel(flatRows);
    const ws = XLSX.utils.json_to_sheet(processed);
    applyDateFormat(ws, flatRows);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    sheetsAdded = 1;
  }

  const filename = `${reportLabel}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, sheets: sheetsAdded, filename };
}

// Hash determinista de fila para reconciliar con localStorage.
// Canónico en lib/utils/rowId (util puro, sin dependencias de React).
const rowIdForExport = rowIdFnv;

// Para exportar vista de sheet con validaciones
//
// Auto-validación al exportar (v10):
//   La tabla en pantalla pre-popula el dropdown de Validación cuando la columna
//   pivote del escenario (badgeCol) contiene un valor que es una opción válida
//   (Correcto / Incorrecto / Sustentado). El usuario puede sobreescribirlo.
//
//   Antes de v10, el export solo guardaba lo que el usuario tocó manualmente,
//   dejando vacías las celdas que en pantalla SÍ mostraban un valor. Ahora
//   replicamos exactamente la misma lógica que DataTableRow:
//     - Si hay valor manual (getVal != null) → ese gana.
//     - Si no, y el badgeCol está en VALIDACION_OPTS → ese se exporta.
//     - Si no → vacío.
const VALIDACION_OPTS = ["Correcto", "Incorrecto", "Sustentado"];

export function exportSheetValidaciones(rows, cols, getVal, getComentario, getAccion, scenario, persistKey) {
  if (!rows || rows.length === 0) return { ok: false };
  const badgeCol = scenario?.badgeCol;
  const exportRows = rows.map(row => {
    const out = {};
    cols.forEach(c => { out[c] = row[c] ?? ""; });
    // Misma resolución que en pantalla: manual → auto desde badge → vacío
    const manual = getVal(row);
    let fallback = null;
    const rawEscenario = row["ESCENARIO"] || row["Escenario"] || row["escenario"];
    if (rawEscenario !== undefined && rawEscenario !== null && String(rawEscenario).trim() !== "") {
      const v = String(rawEscenario).toUpperCase();
      fallback = v === "CORRECTO" ? "Correcto" : "Incorrecto";
    } else if (badgeCol) {
      const badgeVal = String(row[badgeCol] || "");
      const bvText = badgeVal.trim().toLowerCase();
      if (bvText === "correcto") fallback = "Correcto";
      else if (bvText === "incorrecto") fallback = "Incorrecto";
      else if (bvText === "sustentado") fallback = "Sustentado";
    }
    let resolved = manual ?? fallback ?? "";
    out["Validación"]        = resolved;
    out["Acción Correctiva"] = displayAccion(getAccion ? getAccion(row) : null);
    out["Comentario"]        = getComentario(row) ?? "";
    return out;
  });
  const processed = processRowsForExcel(exportRows);
  const ws = XLSX.utils.json_to_sheet(processed);
  applyDateFormat(ws, exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, scenario.label.slice(0, 31));
  const filename = `${persistKey}-${scenario.key}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, filename, rowCount: exportRows.length };
}

/**
 * exportSheetPlano — export para tablas sin escenarios ni validación.
 *
 * Descarga las filas tal cual con las columnas crudas del backend. No agrega
 * ni Validación ni Comentario. Usado por DataTablePlano (Hallazgos Preliminares
 * desde v10).
 */
export function exportSheetPlano(rows, cols, persistKey, labelResolver) {
  if (!rows) return { ok: false };
  const wb = XLSX.utils.book_new();
  let totalRows = 0;

  const addSheet = (sheetRows, sheetName) => {
    if (!sheetRows || sheetRows.length === 0) return;
    // Se construyen las filas con las KEYS crudas para que la detección de
    // fechas (por índice de columna) siga funcionando igual.
    const exportRows = sheetRows.map(row => {
      const out = {};
      cols.forEach(c => { out[c] = row[c] ?? ""; });
      return out;
    });
    const processed = processRowsForExcel(exportRows);
    const ws = XLSX.utils.json_to_sheet(processed);
    applyDateFormat(ws, exportRows);
    // Renombramos solo la fila de cabecera (r:0) al label legible. No toca los
    // datos ni el formato de fecha (que ya se aplicó por índice).
    if (typeof labelResolver === "function") {
      cols.forEach((c, idx) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c: idx });
        if (ws[addr]) ws[addr].v = labelResolver(c);
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    totalRows += exportRows.length;
  };

  if (Array.isArray(rows)) {
    addSheet(rows, persistKey);
  } else if (typeof rows === "object") {
    Object.keys(rows).forEach(key => {
      addSheet(rows[key], key);
    });
  }

  if (wb.SheetNames.length === 0) return { ok: false };

  const filename = `${persistKey}-vista.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, filename, rowCount: totalRows };
}
