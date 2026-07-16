"use client";

/**
 * DataTablePerfiles
 *
 * Tabla multi-tab para hallazgos del módulo Perfiles.
 *
 * Dos niveles de tabs:
 * NIVEL 1 (superior) — claves de hoja del backend: "Roles", "SDP", "EXACTUS", etc.
 * NIVEL 2 (escenarios) — solo para persistKeys con escenarios nombrados:
 * prf-roles → "Existe en MR" · "Validación Rol"
 * prf-moviper → "Existe en MR" · "Validación Rol"
 * Los demás (prf-dbs, prf-apps) → vista única sin sub-tabs de escenario
 *
 * Cada sub-tab de escenario tiene su propio VALIDACIÓN + COMENTARIO independiente,
 * persistido bajo: {persistKey}-prf-val-{scKey}-{scenarioKey}
 */

import { useMemo, useState, useRef, useCallback } from "react";
import { displayAccion } from "@/lib/constants/accionCorrectiva";
import { getHeaderColorClass, getColumnLabel } from "@/lib/constants/hallazgos-perfiles";
import { getSpecialColumnHeaderClass } from "@/lib/constants/specialColumnColors";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useValidaciones } from "@/lib/hooks/useValidaciones";
import DataTableRow from "./DataTableRow";
import { ThCell } from "./DataTableHeader";
import ClasificacionModal from "./ClasificacionModal";
import * as XLSX from "xlsx";

const PAGE_SIZES   = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE = 50;
const VALIDACION_OPTS = ["Correcto", "Incorrecto", "Sustentado"];

// ── Mapa de escenarios nombrados por persistKey ──────────────────────────────
// Para GDH y Moviper: dos escenarios independientes, cada uno con VALIDACIÓN propia.
// key   = slug usado como sufijo en localStorage
// label = nombre visible en el tab
// col   = columna del JSON que actúa como badgeCol para este escenario
const SCENARIO_DEFS = {
  "prf-roles": [
    { key: "existe-en-mr",    label: "Existe en MR",    col: "Existe en MR"   },
    { key: "validacion-rol",  label: "Validación Rol",  col: "Validación Rol" },
  ],
  "prf-moviper": [
    { key: "existe-en-mr",    label: "Existe en MR",    col: "Existe en MR"   },
    { key: "validacion-rol",  label: "Validación Rol",  col: "Validación Rol" },
  ],
};

// Para persistKeys sin escenarios nombrados — escenario único derivado de estas columnas
const ESCENARIO_COLS_BY_KEY = {
  "prf-dbs":  ["Perfil No Identificado"],
  "prf-apps": ["ROl + Perfil", "Perfil No Identificado"],
};

function getScenarioDefs(persistKey) {
  return SCENARIO_DEFS[persistKey] ?? null;
}
function getEscenarioCols(persistKey) {
  return ESCENARIO_COLS_BY_KEY[persistKey] ?? null;
}

// Una fila ES hallazgo en el escenario badgeCol si el valor ≠ "Correcto"
function isHallazgoBadge(row, badgeCol) {
  const v = row[badgeCol];
  if (v === undefined || v === null || String(v).trim() === "") return false;
  return String(v).trim().toUpperCase() !== "CORRECTO";
}

// Para reportes sin escenarios nombrados: hallazgo si ALGUNA col de escenario ≠ Correcto
function isHallazgoCombined(row, escCols) {
  if (!escCols?.length) {
    const e = row["ESCENARIO"] || row["Escenario"] || row["escenario"] || "";
    return String(e).toUpperCase() !== "CORRECTO" && String(e).trim() !== "";
  }
  return escCols.some(col => isHallazgoBadge(row, col));
}

// FNV-1a
function rowIdFnv(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? "" : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, "0");
}

// Normaliza rawData → { tabKey: rows[] }
function normalizeTabs(rawData) {
  if (!rawData) return {};
  if (Array.isArray(rawData)) return rawData.length ? { Principal: rawData } : {};
  if (typeof rawData === "object") {
    const result = {};
    for (const [k, v] of Object.entries(rawData)) if (Array.isArray(v)) result[k] = v;
    return result;
  }
  return {};
}

// Export multi-hoja — soporta ambos modos
export function exportAllPerfiles(tabs, persistKey, reportLabel) {
  const wb = XLSX.utils.book_new();
  const scenarioDefs = getScenarioDefs(persistKey);
  const escCols      = getEscenarioCols(persistKey);
  let n = 0;

  for (const [tabKey, rows] of Object.entries(tabs)) {
    if (!rows?.length) continue;
    const sheetSlug = tabKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (scenarioDefs) {
      // Una hoja Excel por escenario
      for (const sc of scenarioDefs) {
        const storeKey = `${persistKey}-prf-val-${sheetSlug}-${sc.key}`;
        let store = {};
        try { const r = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null; if (r) store = JSON.parse(r); } catch {}
        const allCols = rows.length ? Object.keys(rows[0]) : [];
        const data = rows.map(row => {
          const id = rowIdFnv(row);
          const sv = store[id]?.validacion;
          const bv = row[sc.col];
          let validacion = sv || null;
          if (!validacion && bv !== undefined && bv !== null && String(bv).trim() !== "") {
            const f = String(bv).charAt(0).toUpperCase() + String(bv).slice(1).toLowerCase();
            validacion = VALIDACION_OPTS.includes(f) ? f : (String(bv).toUpperCase() !== "CORRECTO" ? "Incorrecto" : "Correcto");
          }
          const out = {};
          allCols.forEach(c => { out[c] = row[c] ?? ""; });
          out["Validación"] = validacion ?? "";
          out["Acción Correctiva"] = displayAccion(store[id]?.accion);
          out["Comentario"] = store[id]?.comentario ?? "";
          return out;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const sheetName = `${tabKey}_${sc.label}`.slice(0, 31).replace(/[\\/*?[\]:]/g, "_");
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        n++;
      }
    } else {
      const storeKey = `${persistKey}-prf-val-${sheetSlug}`;
      let store = {};
      try { const r = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null; if (r) store = JSON.parse(r); } catch {}
      const allCols = rows.length ? Object.keys(rows[0]) : [];
      const data = rows.map(row => {
        const id = rowIdFnv(row);
        const out = {};
        allCols.forEach(c => { out[c] = row[c] ?? ""; });
        out["Validación"] = store[id]?.validacion ?? "";
        out["Acción Correctiva"] = displayAccion(store[id]?.accion);
        out["Comentario"] = store[id]?.comentario ?? "";
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, tabKey.slice(0, 31).replace(/[\\/*?[\]:]/g, "_"));
      n++;
    }
  }
  if (!n) return;
  XLSX.writeFile(wb, `${reportLabel ?? persistKey}.xlsx`);
}

// Stats bar
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

// ── ScenarioSheet — vista de UN escenario (GDH/Moviper) ──────────────────────
function ScenarioSheet({ rows, tabKey, persistKey, scenario, onRowDoubleClick }) {
  const sheetSlug = tabKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const pfx       = `${persistKey}-prf-${sheetSlug}-${scenario.key}`;

  const scenarioRows = useMemo(() =>
    rows.filter(r => r[scenario.col] !== undefined && r[scenario.col] !== null && String(r[scenario.col]).trim() !== ""),
    [rows, scenario.col]
  );

  const { getVal, getComentario, getAccion, setValidacion, setComentario, setAccion, countValidated, countModificados, flush, rowId } =
    useValidaciones(`${persistKey}-prf`, `${sheetSlug}-${scenario.key}`, scenarioRows, scenario.col);

  const [sortCol,    setSortCol]    = usePersistedState(`${pfx}-sort-col`,    null);
  const [sortDir,    setSortDir]    = usePersistedState(`${pfx}-sort-dir`,    "asc");
  const [filter,     setFilter]     = usePersistedState(`${pfx}-filter`,      "");
  const [page,       setPage]       = usePersistedState(`${pfx}-page`,        0);
  const [pageSize,   setPageSize]   = usePersistedState(`${pfx}-pagesize`,    DEFAULT_SIZE);
  const [colFilters, setColFilters] = usePersistedState(`${pfx}-col-filters`, {});
  const [colWidths,  setColWidths]  = usePersistedState(`${pfx}-col-widths`,  {});
  const [chips,      setChips]      = usePersistedState(`${pfx}-chips`,       []);
  const [openPanel,  setOpenPanel]  = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [exportOk,   setExportOk]  = useState(null);
  const resizeRef = useRef({ active: false });

  const scenarioDefs = getScenarioDefs(persistKey) || [];
  const otherScenarioCols = useMemo(() => new Set(scenarioDefs.filter(s => s.key !== scenario.key).map(s => s.col)), [scenarioDefs, scenario.key]);

  const cols = useMemo(() => {
    const allDataCols = scenarioRows.length > 0 ? Object.keys(scenarioRows[0]) : [];
    const baseCols = allDataCols.filter(c => !otherScenarioCols.has(c) && c !== scenario.col);
    if (allDataCols.includes(scenario.col)) {
      return [...baseCols, scenario.col];
    }
    return baseCols;
  }, [scenarioRows, otherScenarioCols, scenario.col]);

  const allCols = useMemo(() => [...cols, "__validacion__", "__accion__", "__comentario__"], [cols]);

  const hallazgosCount = useMemo(() => {
    return scenarioRows.filter(r => {
      if (r[scenario.col] == null || String(r[scenario.col]).trim() === "") return false;
      const id = rowId(r);
      const storedVal = getVal(r);
      if (storedVal) {
        return String(storedVal).trim().toLowerCase() === "incorrecto";
      }
      return isHallazgoBadge(r, scenario.col);
    }).length;
  }, [scenarioRows, scenario.col, getVal, rowId]);

  function getColFilterSet(col) { return colFilters[col] ? new Set(colFilters[col]) : new Set(); }
  function setColFilterSet(col, set) {
    setColFilters(prev => { const n = {...prev}; if (set.size === 0) delete n[col]; else n[col] = [...set]; return n; });
    setPage(0);
  }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(0); }
  function toggleChip(chip) {
    setChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
    setPage(0);
  }

  const onResizeStart = useCallback((e, col) => {
    e.preventDefault();
    const sx = e.clientX, sw = colWidths[col] ?? 140;
    resizeRef.current = { active: true, col, sx, sw };
    const onM = ev => { if (!resizeRef.current.active) return; setColWidths(p => ({...p, [resizeRef.current.col]: Math.max(60, resizeRef.current.sw + ev.clientX - resizeRef.current.sx)})); };
    const onU = () => { resizeRef.current.active = false; window.removeEventListener("mousemove", onM); window.removeEventListener("mouseup", onU); };
    window.addEventListener("mousemove", onM); window.addEventListener("mouseup", onU);
  }, [colWidths, setColWidths]);

  const hasColFilter = Object.values(colFilters).some(a => a?.length > 0);

  const filtered = useMemo(() => {
    let res = scenarioRows;
    if (filter.trim()) { const q = filter.toLowerCase(); res = res.filter(r => cols.some(c => String(r[c] ?? "").toLowerCase().includes(q))); }
    for (const [col, active] of Object.entries(colFilters)) { const s = new Set(active); if (s.size > 0) res = res.filter(r => s.has(String(r[col] ?? "—"))); }
    if (chips.includes("hallazgos")) res = res.filter(r => {
      const storedVal = getVal(r);
      if (storedVal) return String(storedVal).trim().toLowerCase() === "incorrecto";
      return isHallazgoBadge(r, scenario.col);
    });
    return res;
  }, [scenarioRows, filter, colFilters, cols, chips, getVal, scenario.col]);

  const filteredSorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const eff = pageSize === "TODOS" ? filteredSorted.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / eff));
  const safePage   = Math.min(page, totalPages - 1);
  const pageRows   = filteredSorted.slice(safePage * eff, (safePage + 1) * eff);

  async function handleExportVista() {
    const data = filteredSorted.map(row => {
      const out = {}; cols.forEach(c => { out[c] = row[c] ?? ""; });
      out["Validación"] = getVal(row) ?? ""; out["Acción Correctiva"] = getAccion(row) ?? ""; out["Comentario"] = getComentario(row) ?? "";
      return out;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${tabKey}_${scenario.label}`.slice(0, 31));
    XLSX.writeFile(wb, `${persistKey}_${tabKey}_${scenario.key}.xlsx`);
    setExportOk({ filename: `${persistKey}_${tabKey}_${scenario.key}.xlsx`, rowCount: data.length });
    setTimeout(() => setExportOk(null), 3000);
  }

  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      {exportOk && (
        <div className="modal-ok" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
          <div className="modal-ok-icon">📥</div>
          <div className="modal-ok-title">Exportación exitosa</div>
          <div className="modal-ok-sub"><strong>{exportOk.filename}</strong> · {exportOk.rowCount?.toLocaleString()} filas</div>
        </div>
      )}

      <StatsRow totalRows={scenarioRows.length} hallazgosCount={hallazgosCount} countModificados={countModificados} />

      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder={`Buscar en ${tabKey} — ${scenario.label}…`}
            value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} style={{ width: 300 }} />
          {filter && <button className="btn-export-small" onClick={() => { setFilter(""); setPage(0); }}>✕</button>}
          {hasColFilter && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(0); }}>✕ Quitar filtros</button>
          )}
          <button className={`chip ${chips.includes("hallazgos") ? "chip-on" : ""}`}
            onClick={() => toggleChip("hallazgos")}>
            Solo hallazgos {hallazgosCount > 0 && <span className="chip-count">{hallazgosCount}</span>}
          </button>
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filteredSorted.length}</span> / {scenarioRows.length} filas</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>doble clic para clasificar</span>
          <button className="btn-export-small" onClick={handleExportVista}>↓ Exportar vista</button>
          <button className="btn-export-small" onClick={() => flush()}>Guardar</button>
        </div>
      </div>

      <div className="scroll-x" onClick={e => e.stopPropagation()}>
        <table className="data-table">
          <thead>
            <tr>
              {allCols.map(col => {
                const isSpecial = col === "__validacion__" || col === "__accion__" || col === "__comentario__";
                return (
                  <ThCell key={col} col={col} isSpecial={isSpecial}
                    label={isSpecial ? (col === "__validacion__" ? "Validación" : col === "__accion__" ? "Acción Correctiva" : "Comentario") : getColumnLabel(persistKey, tabKey, col)}
                    headerClass={isSpecial ? getSpecialColumnHeaderClass(col) : getHeaderColorClass(persistKey, tabKey, col)}
                    hasFilter={!isSpecial && getColFilterSet(col).size > 0}
                    width={colWidths[col]}
                    openPanel={openPanel} setOpenPanel={setOpenPanel}
                    sortCol={sortCol} sortDir={sortDir} rows={rows}
                    getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                    handleSort={handleSort} onResizeStart={onResizeStart}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <DataTableRow key={rowId(row)} row={row} ri={ri} cols={cols} colWidths={colWidths}
                getVal={getVal} getComentario={getComentario} getAccion={getAccion}
                setValidacion={setValidacion} setComentario={setComentario} setAccion={setAccion}
                badgeCol={scenario.col} scenarioLabel={scenario.label} accionModule="perfiles"
                expandedRow={expandedRow} setExpandedRow={setExpandedRow} rowId={rowId}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
              />
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={allCols.length} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                {filter || hasColFilter ? "Sin resultados con los filtros actuales." : "No hay datos en este escenario."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-left">
          <div className="page-size-bar">
            {PAGE_SIZES.map(s => (
              <button key={s} className={`page-size-btn ${pageSize === s ? "ps-active" : ""}`}
                onClick={() => { setPageSize(s); setPage(0); }}>{s}</button>
            ))}
          </div>
          <span className="page-info">Página {safePage + 1} de {totalPages}</span>
        </div>
        <div className="pagination-right">
          <button className="page-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map(p => (
            <button key={p} className={`page-size-btn ${p === safePage ? "ps-active" : ""}`}
              onClick={() => setPage(p)}>{p + 1}</button>
          ))}
          <button className="page-btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>›</button>
        </div>
      </div>
    </div>
  );
}

// ── TabSheet — vista de una hoja del backend ───────────────────────────────────
// Si el persistKey tiene SCENARIO_DEFS → muestra sub-tabs de escenario
// Si no → vista única combinada con validaciones
function TabSheet({ rows, tabKey, persistKey, onRowDoubleClick }) {
  const scenarioDefs = getScenarioDefs(persistKey);
  const escCols      = getEscenarioCols(persistKey);
  const sheetSlug    = tabKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const pfx          = `${persistKey}-prf-${sheetSlug}`;

  const [activeScenario, setActiveScenario] = usePersistedState(`${pfx}-active-sc`, "");

  // ── MODO A: persistKey con escenarios nombrados (GDH, Moviper) ───────────
  if (scenarioDefs) {
    const currentSc = scenarioDefs.find(s => s.key === activeScenario) ?? scenarioDefs[0];

    function hallazgosForSc(sc) {
      let store = {};
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`${persistKey}-prf-val-${sheetSlug}-${sc.key}`) : null;
        if (raw) store = JSON.parse(raw);
      } catch { /* noop */ }
      return rows.filter(r => {
        if (r[sc.col] == null || String(r[sc.col]).trim() === "") return false;
        const id = rowIdFnv(r);
        const storedVal = store[id]?.validacion;
        if (storedVal) {
          return String(storedVal).trim().toLowerCase() === "incorrecto";
        }
        return isHallazgoBadge(r, sc.col);
      }).length;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* Contenido del escenario activo */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ScenarioSheet
            key={`${tabKey}-${currentSc.key}`}
            rows={rows} tabKey={tabKey}
            persistKey={persistKey} scenario={currentSc}
            onRowDoubleClick={onRowDoubleClick}
          />
        </div>

        {/* TABS INFERIORES: escenarios canónicos */}
        {scenarioDefs.length > 0 && (
          <div
            className="scenario-tabs-bar"
            style={{
              borderTop: "2px solid var(--border)",
              padding: "0 12px",
              display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
              background: "var(--bg2)", flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Escenario
            </span>
            {scenarioDefs.map(sc => {
              const hc = hallazgosForSc(sc);
              return (
                <button
                  key={sc.key}
                  className={`scenario-tab ${sc.key === activeScenario || (!activeScenario && currentSc.key === sc.key) ? "scenario-tab-active" : ""}`}
                  onClick={() => setActiveScenario(sc.key)}
                  style={{ position: "relative" }}
                >
                  {sc.label}
                  {hc > 0 && <span className="scenario-tab-badge">{hc}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── MODO B: vista única combinada (DBs, Apps) ─────────────────────────────
  const primaryBadgeCol = escCols ? escCols[0] : "ESCENARIO";

  const { getVal, getComentario, getAccion, setValidacion, setComentario, setAccion, countValidated, countModificados, flush, rowId } =
    useValidaciones(`${persistKey}-prf`, sheetSlug, rows, primaryBadgeCol);

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
  const resizeRef = useRef({ active: false });

  const cols    = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);
  const allCols = useMemo(() => [...cols, "__validacion__", "__accion__", "__comentario__"], [cols]);

  const hallazgosCount = useMemo(() => {
    return rows.filter(r => {
      const id = rowId(r);
      const storedVal = getVal(r);
      if (storedVal) {
        return String(storedVal).trim().toLowerCase() === "incorrecto";
      }
      return isHallazgoCombined(r, escCols);
    }).length;
  }, [rows, escCols, getVal, rowId]);

  function getColFilterSet(col) { return colFilters[col] ? new Set(colFilters[col]) : new Set(); }
  function setColFilterSet(col, set) {
    setColFilters(prev => { const n = {...prev}; if (set.size === 0) delete n[col]; else n[col] = [...set]; return n; });
    setPage(0);
  }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(0); }

  const onResizeStart = useCallback((e, col) => {
    e.preventDefault();
    const sx = e.clientX, sw = colWidths[col] ?? 140;
    resizeRef.current = { active: true, col, sx, sw };
    const onM = ev => { if (!resizeRef.current.active) return; setColWidths(p => ({...p, [resizeRef.current.col]: Math.max(60, resizeRef.current.sw + ev.clientX - resizeRef.current.sx)})); };
    const onU = () => { resizeRef.current.active = false; window.removeEventListener("mousemove", onM); window.removeEventListener("mouseup", onU); };
    window.addEventListener("mousemove", onM); window.addEventListener("mouseup", onU);
  }, [colWidths, setColWidths]);

  function toggleChip(c) { setChips(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]); setPage(0); }
  const hasColFilter = Object.values(colFilters).some(a => a?.length > 0);

  const filtered = useMemo(() => {
    let res = rows;
    if (filter.trim()) { const q = filter.toLowerCase(); res = res.filter(r => cols.some(c => String(r[c] ?? "").toLowerCase().includes(q))); }
    if (chips.includes("hallazgos")) res = res.filter(r => {
      const storedVal = getVal(r);
      if (storedVal) return String(storedVal).trim().toLowerCase() === "incorrecto";
      return isHallazgoCombined(r, escCols);
    });
    for (const [col, active] of Object.entries(colFilters)) { const s = new Set(active); if (s.size > 0) res = res.filter(r => s.has(String(r[col] ?? "—"))); }
    return res;
  }, [rows, filter, chips, colFilters, cols, escCols, getVal]);

  const filteredSorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const eff = pageSize === "TODOS" ? filteredSorted.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / eff));
  const safePage   = Math.min(page, totalPages - 1);
  const pageRows   = filteredSorted.slice(safePage * eff, (safePage + 1) * eff);

  async function handleExportVista() {
    const data = filteredSorted.map(row => {
      const out = {}; cols.forEach(c => { out[c] = row[c] ?? ""; });
      out["Validación"] = getVal(row) ?? ""; out["Acción Correctiva"] = getAccion(row) ?? ""; out["Comentario"] = getComentario(row) ?? "";
      return out;
    });
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, tabKey.slice(0, 31));
    XLSX.writeFile(wb, `${persistKey}_${sheetSlug}_vista.xlsx`);
    setExportOk({ filename: `${persistKey}_${sheetSlug}_vista.xlsx`, rowCount: data.length });
    setTimeout(() => setExportOk(null), 3000);
  }

  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      {exportOk && (
        <div className="modal-ok" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999 }}>
          <div className="modal-ok-icon">📥</div>
          <div className="modal-ok-sub"><strong>{exportOk.filename}</strong> · {exportOk.rowCount?.toLocaleString()} filas</div>
        </div>
      )}

      <StatsRow totalRows={rows.length} hallazgosCount={hallazgosCount} countModificados={countModificados} />

      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar en todas las columnas…"
            value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} style={{ width: 280 }} />
          {filter && <button className="btn-export-small" onClick={() => { setFilter(""); setPage(0); }}>✕</button>}
          <button className={`chip ${chips.includes("hallazgos") ? "chip-on" : ""}`}
            onClick={() => toggleChip("hallazgos")}>
            Solo hallazgos {hallazgosCount > 0 && <span className="chip-count">{hallazgosCount}</span>}
          </button>
          {hasColFilter && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(0); }}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filteredSorted.length}</span> / {rows.length} filas</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>doble clic para clasificar</span>
          <button className="btn-export-small" onClick={handleExportVista}>↓ Exportar vista</button>
          <button className="btn-export-small" onClick={() => flush()}>Guardar</button>
        </div>
      </div>

      <div className="scroll-x" onClick={e => e.stopPropagation()}>
        <table className="data-table">
          <thead>
            <tr>
              {allCols.map(col => {
                const isSp = col === "__validacion__" || col === "__accion__" || col === "__comentario__";
                return (
                  <ThCell key={col} col={col} isSpecial={isSp}
                    label={isSp ? (col === "__validacion__" ? "Validación" : col === "__accion__" ? "Acción Correctiva" : "Comentario") : getColumnLabel(persistKey, tabKey, col)}
                    headerClass={isSp ? getSpecialColumnHeaderClass(col) : getHeaderColorClass(persistKey, tabKey, col)}
                    hasFilter={!isSp && getColFilterSet(col).size > 0}
                    width={colWidths[col]}
                    openPanel={openPanel} setOpenPanel={setOpenPanel}
                    sortCol={sortCol} sortDir={sortDir} rows={rows}
                    getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                    handleSort={handleSort} onResizeStart={onResizeStart}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <DataTableRow key={rowId(row)} row={row} ri={ri} cols={cols} colWidths={colWidths}
                getVal={getVal} getComentario={getComentario} getAccion={getAccion}
                setValidacion={setValidacion} setComentario={setComentario} setAccion={setAccion}
                badgeCol={primaryBadgeCol} scenarioLabel={escCols ? escCols[0] : undefined} accionModule="perfiles"
                extraEscenarioCols={escCols ?? undefined}
                expandedRow={expandedRow} setExpandedRow={setExpandedRow} rowId={rowId}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
              />
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={allCols.length} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                {filter || chips.length || hasColFilter ? "Sin resultados." : "No hay datos en esta hoja."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-left">
          <div className="page-size-bar">
            {PAGE_SIZES.map(s => (
              <button key={s} className={`page-size-btn ${pageSize === s ? "ps-active" : ""}`}
                onClick={() => { setPageSize(s); setPage(0); }}>{s}</button>
            ))}
          </div>
          <span className="page-info">Página {safePage + 1} de {totalPages}</span>
        </div>
        <div className="pagination-right">
          <button className="page-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map(p => (
            <button key={p} className={`page-size-btn ${p === safePage ? "ps-active" : ""}`}
              onClick={() => setPage(p)}>{p + 1}</button>
          ))}
          <button className="page-btn" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>›</button>
        </div>
      </div>
    </div>
  );
}

// ── DataTablePerfiles — raíz ───────────────────────────────────────────────────
export default function DataTablePerfiles({ rawData, persistKey, fieldMap }) {
  const tabs    = useMemo(() => normalizeTabs(rawData), [rawData]);
  const tabKeys = Object.keys(tabs);
  const [activeTab, setActiveTab] = usePersistedState(`${persistKey}-prf-active-tab`, "");
  const [modalRow,  setModalRow]  = useState(null);

  const currentTab = tabKeys.includes(activeTab) ? activeTab : (tabKeys[0] ?? "");

  if (!tabKeys.length) return (
    <div className="empty-state">
      <span className="empty-icon">📋</span><p>El reporte no contiene datos.</p>
    </div>
  );

  const scenarioDefs = getScenarioDefs(persistKey);
  const escCols      = getEscenarioCols(persistKey);

  function hallazgosForTab(key) {
    const rows = tabs[key] ?? [];
    const sheetSlug = key.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (scenarioDefs) {
      // Cargar stores para los escenarios
      const stores = {};
      scenarioDefs.forEach(sc => {
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem(`${persistKey}-prf-val-${sheetSlug}-${sc.key}`) : null;
          if (raw) stores[sc.key] = JSON.parse(raw);
        } catch { stores[sc.key] = {}; }
      });
      // Deduplicar: si tiene hallazgo final en AL MENOS un escenario
      return rows.filter(r => {
        return scenarioDefs.some(sc => {
          if (r[sc.col] == null || String(r[sc.col]).trim() === "") return false;
          const id = rowIdFnv(r);
          const storedVal = stores[sc.key]?.[id]?.validacion;
          if (storedVal) {
            return String(storedVal).trim().toLowerCase() === "incorrecto";
          }
          return isHallazgoBadge(r, sc.col);
        });
      }).length;
    }

    let store = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`${persistKey}-prf-val-${sheetSlug}`) : null;
      if (raw) store = JSON.parse(raw);
    } catch { /* noop */ }
    
    return rows.filter(r => {
      const id = rowIdFnv(r);
      const storedVal = store[id]?.validacion;
      if (storedVal) {
        return String(storedVal).trim().toLowerCase() === "incorrecto";
      }
      return isHallazgoCombined(r, escCols);
    }).length;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {modalRow && (
        <ClasificacionModal row={modalRow} onClose={() => setModalRow(null)} fieldMap={fieldMap} />
      )}

      {/* Tabs superiores — hojas del backend */}
      <div className="scenario-tabs-bar" style={{
        borderBottom: "1px solid var(--border)", padding: "0 12px",
        display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
        background: "var(--bg2)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
          {tabKeys.map(key => {
            const hc = hallazgosForTab(key);
            return (
              <button key={key}
                className={`scenario-tab ${key === currentTab ? "scenario-tab-active" : ""}`}
                onClick={() => setActiveTab(key)} style={{ position: "relative" }}>
                {key}
                <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                  ({(tabs[key] ?? []).length})
                </span>
                {hc > 0 && <span className="scenario-tab-badge">{hc}</span>}
              </button>
            );
          })}
        </div>
        {/* Indicador de escenarios */}
        {scenarioDefs && (
          <span style={{ fontSize: 10, color: "var(--text4)", fontFamily: "var(--mono)", paddingRight: 8 }}>
            escenarios: {scenarioDefs.map(s => s.label).join(" · ")}
          </span>
        )}
      </div>

      {/* Tab activo */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <TabSheet key={currentTab} rows={tabs[currentTab] ?? []} tabKey={currentTab}
          persistKey={persistKey}
          onRowDoubleClick={
            // GDH y Moviper no tienen clasificación de cuentas → deshabilitar modal
            ["prf-roles", "prf-moviper"].includes(persistKey) ? undefined : setModalRow
          } />
      </div>
    </div>
  );
}

DataTablePerfiles.useRawData = true;
