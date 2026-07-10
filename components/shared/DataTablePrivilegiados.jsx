"use client";

/**
 * DataTablePrivilegiados
 *
 * Tabla para todos los hallazgos del módulo Privilegiados.
 * Diferencias vs DataTablePerfiles:
 *
 * - Los escenarios son columnas badge propias del backend (ej. "Cesado Activo",
 * "No Identificado", "Sin Sustento") — NO usan ESCENARIOS_ORDEN canónicos.
 * - Configuración por reporte (scenarioCfg):
 * escenarios: [{ key, badgeCol, hasValidacion, hasComentario }]
 * · hasValidacion: siempre true para todos los escenarios actuales
 * · hasComentario: true en los escenarios que deben mostrar comentario editable
 * - Comentario: pre-cargado del campo "Comentario" que viene del backend,
 * editable en todas las filas independientemente del escenario.
 * - Validación: pre-cargada del valor del escenario badge correspondiente.
 * - La navegación SUPERIOR son las hojas del backend (tabs de hoja).
 * - La navegación INFERIOR son los escenarios (tabs de escenario tipo sheet Excel).
 * - Export completo: por hoja × por escenario, con columnas Validación y Comentario.
 */

import { useMemo, useState, useRef, useCallback } from "react";
import { displayAccion } from "@/lib/constants/accionCorrectiva";
import { getHeaderColorClass, getColumnLabel } from "@/lib/constants/hallazgos-privilegiados";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useValidaciones }   from "@/lib/hooks/useValidaciones";
import DataTableRow          from "./DataTableRow";
import { ThCell }            from "./DataTableHeader";
import ClasificacionModal    from "./ClasificacionModal";
import * as XLSX             from "xlsx";

const PAGE_SIZES   = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE = 50;
const VALIDACION_OPTS = ["Correcto", "Incorrecto", "Sustentado"];

// ── Normalizar rawData → { sheetKey: rows[] } ─────────────────────────────────
function normalizeSheets(rawData) {
  if (!rawData) return {};
  if (Array.isArray(rawData)) return rawData.length ? { Principal: rawData } : {};
  if (typeof rawData !== "object") return {};
  const result = {};
  for (const [k, v] of Object.entries(rawData)) {
    if (Array.isArray(v)) result[k] = v;
  }
  return result;
}

// ── Hash FNV-1a (igual que useValidaciones) ───────────────────────────────────
function rowIdFnv(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? "" : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, "0");
}

// ── Valor inicial de Validación a partir del badge del escenario ──────────────
function resolveValidacion(row, badgeCol, stored) {
  if (stored) return stored;
  const raw = row[badgeCol];
  if (!raw) return null;
  const v = String(raw).trim();
  const norm = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  return VALIDACION_OPTS.includes(norm) ? norm : null;
}

// ── Export completo multi-hoja × multi-escenario ─────────────────────────────
export function exportAllPrivilegiados(sheets, persistKey, reportLabel, scenarioCfg) {
  const wb = XLSX.utils.book_new();
  let n = 0;

  for (const [sheetKey, rows] of Object.entries(sheets)) {
    if (!rows?.length) continue;
    const sheetSlug = sheetKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    for (const sc of scenarioCfg.escenarios) {
      const scRows = rows.filter(r => r[sc.badgeCol] !== undefined && r[sc.badgeCol] !== null && r[sc.badgeCol] !== "");
      if (!scRows.length) continue;

      const storeKey = `${persistKey}-priv-val-${sheetSlug}-${sc.key}`;
      let valStore = {};
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null;
        if (raw) valStore = JSON.parse(raw);
      } catch {}

      const baseCols = Object.keys(scRows[0]).filter(c =>
        !scenarioCfg.escenarios.some(s => s.badgeCol === c) && c !== "Comentario"
      );

      const exportRows = scRows.map(row => {
        const out = {};
        baseCols.forEach(c => { out[c] = row[c] ?? ""; });
        const stored   = valStore[rowIdFnv(row)] ?? {};
        const manual   = stored.validacion ?? null;
        const resolved = resolveValidacion(row, sc.badgeCol, manual);
        if (sc.hasValidacion) out["Validación"] = resolved ?? "";
        if (sc.hasValidacion) out["Acción Correctiva"] = displayAccion(stored.accion);
        if (sc.hasComentario) {
          out["Comentario"] = stored.comentario ?? row["Comentario"] ?? "";
        }
        return out;
      });

      const wsName = sheetKey === "Principal"
        ? sc.key.slice(0, 31)
        : `${sheetKey} - ${sc.key}`.slice(0, 31);

      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, wsName.replace(/[:\\/?*[\]]/g, "_"));
      n++;
    }
  }

  if (!n) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "Vacío");
  const filename = `${reportLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, sheets: n, filename };
}

// ── Modal export ok ───────────────────────────────────────────────────────────
function ExportModal({ filename, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-ok-icon">📥</div>
        <div className="modal-ok-title">¡Exportación exitosa!</div>
        <div className="modal-ok-sub"><strong>{filename}</strong></div>
        <button className="modal-btn modal-success" onClick={onClose} style={{ marginTop: 4 }}>Entendido</button>
      </div>
    </div>
  );
}

// ── StatsRow ─────────────────────────────────────────────────────────────────
function StatsRow({ totalRows, hallazgosCount, countModificados }) {
  return (
    <div className="stats-row">
      {[
        { label: "Total filas",   val: totalRows,                  cls: "s-total", sub: "filas con dato"      },
        { label: "Sin hallazgo",  val: totalRows - hallazgosCount, cls: "s-ok",    sub: "valor correcto"     },
        { label: "Con hallazgo",  val: hallazgosCount,             cls: "s-inc",   sub: "requieren revisión" },
        { label: "Validados",     val: countModificados,           cls: "s-pend",  sub: "validación cambiada" },
      ].map(({ label, val, cls, sub }) => (
        <div key={label} className="stat-card">
          <div className="stat-label">{label}</div>
          <div className={`stat-val ${cls}`}>{val.toLocaleString()}</div>
          <div className="stat-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── RowPriv — fila con Validación + Comentario condicionales ─────────────────
function RowPriv({ row, ri, cols, colWidths, sc, pfxVal, rowId }) {
  const storeKey = pfxVal;
  // Usamos el hook directamente — cada fila tiene su propio scope de validación
  // a través de rowId + sc.key. Aquí accedemos al store mediante usePersistedState.
  // Para no instanciar useValidaciones (que necesita todos los rows), manejamos
  // el store de esta fila inline.
  // NOTA: El componente padre (ScenarioSheet) pasa getVal/getComentario/setValidacion/setComentario
  // como props (delegación al hook del padre).
  return null; // placeholder — ver ScenarioSheet
}

// ── ScenarioSheet — una hoja de escenario ────────────────────────────────────
function ScenarioSheet({ rows, sheetKey, sc, persistKey, onRowDoubleClick, allBadgeCols }) {
  const sheetSlug = sheetKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const pfx       = `${persistKey}-priv-${sheetSlug}-${sc.key}`;
  const valPfx    = `${persistKey}-priv-val-${sheetSlug}`;

  // Las filas de este escenario: las que tienen el badgeCol definido
  const scenarioRows = useMemo(() =>
    rows.filter(r => r[sc.badgeCol] !== undefined && r[sc.badgeCol] !== null && r[sc.badgeCol] !== ""),
    [rows, sc.badgeCol]
  );

  const { getVal, getComentario, getAccion, setValidacion, setComentario, setAccion, countValidated, countModificados, flush, rowId } =
    useValidaciones(valPfx, sc.key, scenarioRows, sc.badgeCol);

  const [sortCol,    setSortCol]    = usePersistedState(`${pfx}-sort-col`,    null);
  const [sortDir,    setSortDir]    = usePersistedState(`${pfx}-sort-dir`,    "asc");
  const [filter,     setFilter]     = usePersistedState(`${pfx}-filter`,      "");
  const [page,       setPage]       = usePersistedState(`${pfx}-page`,        0);
  const [pageSize,   setPageSize]   = usePersistedState(`${pfx}-pagesize`,    DEFAULT_SIZE);
  const [colFilters, setColFilters] = usePersistedState(`${pfx}-col-filters`, {});
  const [chips,      setChips]      = usePersistedState(`${pfx}-chips`,       []);
  const [colWidths,  setColWidths]  = usePersistedState(`${pfx}-col-widths`,  {});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [exportOk,   setExportOk]  = useState(null);
  const [saveMsg,    setSaveMsg]    = useState(null);
  const resizeRef = useRef({ active: false });

  // Columnas de datos: excluir TODOS los badgeCols de todos los escenarios y "Comentario".
  // Así cuando se cambia de escenario, solo se ve la columna badge del escenario activo.
  // Excluir badgeCols de OTROS escenarios, pero CONSERVAR la del escenario activo
  // (igual que Usuarios) para que su columna se muestre en la tabla.
  const cols = useMemo(() => {
    if (!scenarioRows.length) return [];
    const badgeSet = new Set(allBadgeCols ?? []);
    return Object.keys(scenarioRows[0]).filter(c =>
      c !== "Comentario" && (!badgeSet.has(c) || c === sc.badgeCol));
  }, [scenarioRows, allBadgeCols, sc.badgeCol]);

  // Columnas especiales para ThCell
  const allCols = useMemo(() => {
    const extras = [];
    if (sc.hasValidacion) extras.push("__validacion__");
    if (sc.hasValidacion) extras.push("__accion__");
    if (sc.hasComentario) extras.push("__comentario__");
    return [...cols, ...extras];
  }, [cols, sc]);

  const hallazgosCount = useMemo(() =>
    scenarioRows.filter(r => {
      const v = String(r[sc.badgeCol] ?? "").trim().toUpperCase();
      return v && v !== "CORRECTO";
    }).length,
    [scenarioRows, sc.badgeCol]
  );

  function toggleChip(chip) {
    setChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
    setPage(0);
  }

  const filtered = useMemo(() => {
    let res = scenarioRows;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      res = res.filter(r => cols.some(c => String(r[c] ?? "").toLowerCase().includes(q)));
    }
    Object.entries(colFilters).forEach(([col, vals]) => {
      if (vals?.length) { const s = new Set(vals); res = res.filter(r => s.has(String(r[col] ?? "—"))); }
    });
    if (chips.includes("hallazgos")) res = res.filter(r => {
      const v = String(r[sc.badgeCol] ?? "").trim().toUpperCase();
      return v && v !== "CORRECTO";
    });
    return res;
  }, [scenarioRows, filter, colFilters, chips, cols, sc.badgeCol, getVal]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? ""), bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortDir]);

  const effectiveSize = pageSize === "TODOS" ? Math.max(sorted.length, 1) : pageSize;
  const totalPages    = Math.max(1, Math.ceil(sorted.length / effectiveSize));
  const safePage      = Math.min(page, totalPages - 1);
  const pageRows      = sorted.slice(safePage * effectiveSize, (safePage + 1) * effectiveSize);

  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(0); setOpenPanel(null); }
  function getColFilterSet(col) { return colFilters[col] ? new Set(colFilters[col]) : new Set(); }
  function setColFilterSet(col, set) {
    setColFilters(prev => { const n = { ...prev }; if (set.size === 0) delete n[col]; else n[col] = [...set]; return n; });
    setPage(0);
  }
  const onResizeStart = useCallback((e, col) => {
    e.preventDefault(); e.stopPropagation();
    const th = e.target.closest("th");
    resizeRef.current = { active: true, col, startX: e.clientX, startW: th?.offsetWidth ?? 120 };
    function onMove(ev) {
      if (!resizeRef.current.active) return;
      setColWidths(prev => ({ ...prev, [resizeRef.current.col]: Math.max(40, resizeRef.current.startW + ev.clientX - resizeRef.current.startX) }));
    }
    function onUp() { resizeRef.current.active = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Export vista (escenario activo)
  function handleExportVista() {
    if (!sorted.length) return;
    const exportRows = sorted.map(row => {
      const out = {};
      cols.forEach(c => { out[c] = row[c] ?? ""; });
      if (sc.hasValidacion) {
        const stored  = getVal(row);
        out["Validación"] = resolveValidacion(row, sc.badgeCol, stored) ?? "";
        out["Acción Correctiva"] = getAccion(row) ?? "";
      }
      if (sc.hasComentario) {
        const storedCom = getComentario(row);
        out["Comentario"] = storedCom || row["Comentario"] || "";
      }
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sc.key.slice(0, 31));
    const filename = `${persistKey}-${sc.key}-vista.xlsx`;
    XLSX.writeFile(wb, filename);
    setExportOk({ filename });
  }

  if (!scenarioRows.length) return (
    <div className="empty-state">
      <span className="empty-icon">🔍</span>
      <p>No hay filas para el escenario <strong>{sc.key}</strong> en esta hoja.</p>
    </div>
  );

  // Para DataTableRow necesitamos pasarle un getComentario que pre-cargue del backend
  // si no hay valor en localStorage aún
  const getComentarioCombined = useCallback((row) => {
    const stored = getComentario(row);
    if (stored) return stored;
    // Pre-cargar desde el campo "Comentario" del backend si existe
    return row["Comentario"] ? String(row["Comentario"]) : "";
  }, [getComentario]);


  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      {exportOk && <ExportModal filename={exportOk.filename} onClose={() => setExportOk(null)} />}

      <StatsRow totalRows={scenarioRows.length} hallazgosCount={hallazgosCount}
        countModificados={countModificados} />

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar en tabla…" value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0); }} />
          {Object.values(colFilters).some(a => a?.length > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(0); }}>✕ Quitar filtros</button>
          )}
          <div className="chips-bar">
            <button className={`chip ${chips.includes("hallazgos") ? "chip-on" : ""}`} onClick={() => toggleChip("hallazgos")}>
              Solo hallazgos {hallazgosCount > 0 && <span className="chip-count">{hallazgosCount}</span>}
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{sorted.length}</span> filas</span>
          <button className="btn-export-small" onClick={handleExportVista}>↓ Exportar vista</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="scroll-x" onClick={e => e.stopPropagation()}>
        <table className="data-table">
          <thead>
            <tr>
              {allCols.map(col => {
                const isSpecial = col === "__validacion__" || col === "__accion__" || col === "__comentario__";
                return (
                  <ThCell key={col} col={col} isSpecial={isSpecial}
                    label={isSpecial ? undefined : getColumnLabel(persistKey, sheetKey, col)}
                    headerClass={isSpecial ? undefined : getHeaderColorClass(persistKey, sheetKey, col)}
                    hasFilter={!isSpecial && colFilters[col]?.length > 0}
                    width={colWidths[col] ?? (col === "__validacion__" ? 184 : col === "__accion__" ? 184 : col === "__comentario__" ? 260 : 130)}
                    openPanel={openPanel} setOpenPanel={setOpenPanel}
                    sortCol={sortCol} sortDir={sortDir}
                    rows={scenarioRows}
                    getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                    handleSort={handleSort} onResizeStart={onResizeStart}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <DataTableRow
                key={rowId(row)}
                row={row} ri={ri} cols={cols} colWidths={colWidths}
                getVal={getVal}
                getComentario={getComentarioCombined}
                getAccion={getAccion}
                setValidacion={sc.hasValidacion ? setValidacion : () => {}}
                setComentario={sc.hasComentario ? setComentario : () => {}}
                setAccion={sc.hasValidacion ? setAccion : () => {}}
                badgeCol={sc.badgeCol} scenarioLabel={sc.label} accionModule="privilegiados"
                expandedRow={expandedRow} setExpandedRow={setExpandedRow} rowId={rowId}
                hideComentario={!sc.hasComentario}
                hideValidacion={!sc.hasValidacion}
                hideAccion={!sc.hasValidacion}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="pagination">
        <div className="pagination-left">
          <div className="page-size-bar">
            {PAGE_SIZES.map(s => (
              <button key={s} className={`page-size-btn ${pageSize === s ? "active" : ""}`}
                onClick={() => { setPageSize(s); setPage(0); }}>{s}</button>
            ))}
          </div>
        </div>
        <div className="pagination-right">
          <button className="page-btn" onClick={() => setPage(0)} disabled={safePage === 0}>«</button>
          <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}>‹</button>
          <span className="page-info">{safePage + 1} / {totalPages}</span>
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>›</button>
          <button className="page-btn" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>»</button>
        </div>
      </div>

      {/* Save bar */}
      <div className="save-bar">
        <span className="save-info">
          {countValidated} de {scenarioRows.length} validados · <strong>{sc.key}</strong>
          <span className="save-autosave-hint"> · guardado automático activo</span>
        </span>
        <button className="btn-save"
          onClick={() => { flush(); setSaveMsg("✓ Progreso confirmado"); setTimeout(() => setSaveMsg(null), 2500); }}>
          Guardar progreso
        </button>
      </div>
      {saveMsg && <div className="save-toast">{saveMsg}</div>}
    </div>
  );
}

// ── SheetTabs — tabs de hojas del backend (superior) ─────────────────────────
// ── ScenarioTabs — tabs de escenarios (inferior, tipo sheet Excel) ────────────

// ── DataTablePrivilegiados root ───────────────────────────────────────────────
export default function DataTablePrivilegiados({ rawData, persistKey, scenarioCfg, fieldMap }) {
  const sheets    = useMemo(() => normalizeSheets(rawData), [rawData]);
  const sheetKeys = Object.keys(sheets);

  const [activeSheet,    setActiveSheet]    = usePersistedState(`${persistKey}-priv-active-sheet`, "");
  const [modalRow, setModalRow] = useState(null);
  const [activeScenario, setActiveScenario] = usePersistedState(`${persistKey}-priv-active-sc`,    "");

  const currentSheet = sheetKeys.includes(activeSheet) ? activeSheet : (sheetKeys[0] ?? "");
  const scKeys       = scenarioCfg.escenarios.map(s => s.key);
  const currentSc    = scKeys.includes(activeScenario) ? activeScenario : (scKeys[0] ?? "");
  const currentScObj = scenarioCfg.escenarios.find(s => s.key === currentSc) ?? scenarioCfg.escenarios[0];

  if (!sheetKeys.length) return (
    <div className="empty-state">
      <span className="empty-icon">📋</span>
      <p>El reporte no contiene datos.</p>
    </div>
  );

  const currentRows = sheets[currentSheet] ?? [];

  function hallazgosForSheet(key) {
    const rows = sheets[key] ?? [];
    return scenarioCfg.escenarios.reduce((acc, sc) => {
      return acc + rows.filter(r => {
        const v = String(r[sc.badgeCol] ?? "").trim().toUpperCase();
        return v && v !== "CORRECTO";
      }).length;
    }, 0);
  }

  function hallazgosForScenario(rows, sc) {
    return rows.filter(r => {
      const v = String(r[sc.badgeCol] ?? "").trim().toUpperCase();
      return v && v !== "CORRECTO";
    }).length;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {modalRow && (
        <ClasificacionModal row={modalRow} onClose={() => setModalRow(null)} fieldMap={fieldMap} />
      )}

      {/* Tabs de hojas del backend — solo si hay más de una */}
      {sheetKeys.length > 1 && (
        <div className="scenario-tabs-bar" style={{
          borderBottom: "1px solid var(--border)", padding: "0 12px",
          display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
          background: "var(--bg3)", flexShrink: 0,
        }}>
          {sheetKeys.map(key => {
            const hCount = hallazgosForSheet(key);
            return (
              <button key={key}
                className={`scenario-tab ${key === currentSheet ? "scenario-tab-active" : ""}`}
                onClick={() => setActiveSheet(key)}
                style={{ position: "relative" }}>
                {key}
                <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                  ({(sheets[key] ?? []).length})
                </span>
                {hCount > 0 && <span className="scenario-tab-badge">{hCount}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido del escenario activo */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <ScenarioSheet
          key={`${currentSheet}-${currentSc}`}
          rows={currentRows}
          sheetKey={currentSheet}
          sc={currentScObj}
          persistKey={persistKey}
          allBadgeCols={scenarioCfg.escenarios.map(s => s.badgeCol)}
          onRowDoubleClick={setModalRow}
        />
      </div>
      
      {/* Tabs de escenarios — abajo de la hoja, estilo sheet Excel */}
      <div className="priv-scenario-tabs">
        {scenarioCfg.escenarios.map(sc => {
          const hCount = hallazgosForScenario(currentRows, sc);
          const isActive = sc.key === currentSc;
          return (
            <button key={sc.key}
              onClick={() => setActiveScenario(sc.key)}
              className={`priv-scenario-tab ${isActive ? "priv-scenario-tab-active" : ""}`}>
              {sc.key}
              {hCount > 0 && <span className="priv-scenario-tab-badge">{hCount}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
