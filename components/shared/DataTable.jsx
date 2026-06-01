"use client";

/**
 * DataTable — tabla principal de certificación.
 *
 * Arquitectura interna:
 *   DataTable (root)
 *     ├── availableScenarios  ← calculado dinámicamente desde las columnas reales del dataset
 *     ├── ScenarioSheet       ← contenido de la hoja activa
 *     │     ├── StatsRow
 *     │     ├── Toolbar (search + chips + exportar vista)
 *     │     ├── <table> con resize en TODAS las columnas (incluye Validación y Comentario)
 *     │     ├── Pagination con pills (5,15,25,50,100,TODOS)
 *     │     └── SaveBar
 *     └── scenario-tabs-bar   ← tabs Excel en la parte inferior
 *
 * Lógica de escenarios:
 *   ESCENARIOS_ORDEN define los 5 escenarios canónicos.
 *   availableScenarios filtra solo los que tienen al menos 1 fila
 *   con la badgeCol correspondiente en los datos actuales.
 *   → Entra ID sin PostCese no mostrará ese tab.
 *   → Hallazgos Preliminares solo mostrará los tabs de sus columnas presentes.
 */

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { BADGE_COLS } from "@/lib/constants/badgeCols";
import { ESCENARIOS_ORDEN } from "@/lib/constants/reportes";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useValidaciones } from "@/lib/hooks/useValidaciones";
import { exportSheetValidaciones } from "@/lib/utils/excel";
import Badge from "./Badge";
import TableSkeleton from "./TableSkeleton";
import DataTableRow from "./DataTableRow";
import VirtualTableBody from "./VirtualTableBody";
import { ThCell } from "./DataTableHeader";

// Umbral a partir del cual usamos virtualización. Debajo de esto, render
// clásico (más simple, mismo comportamiento que v8 para los casos comunes).
const VIRTUAL_THRESHOLD = 200;

const PAGE_SIZES   = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE = 50;
const VALIDACION_OPTS     = ["Correcto", "Incorrecto", "Sustentado"];
const ALL_SCENARIO_COLS   = new Set(ESCENARIOS_ORDEN.map(s => s.badgeCol));

function ExportSuccessModal({ filename, rowCount, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-ok-icon">📥</div>
        <div className="modal-ok-title">¡Vista exportada!</div>
        <div className="modal-ok-sub">
          Se descargó <strong>{filename}</strong> con{" "}
          <strong>{rowCount.toLocaleString()} filas</strong> incluyendo columnas de Validación y Comentario.
        </div>
        <button className="modal-btn modal-success" onClick={onClose} style={{ marginTop: 4 }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── StatsRow ───────────────────────────────────────────────────────────────
function StatsRow({ totalRows, scenarioRows, countValidated, badgeCol }) {
  const incRows = scenarioRows.filter(r => r[badgeCol] === "Incorrecto").length;
  return (
    <div className="stats-row">
      {[
        { label: "Total reporte",  val: totalRows,                   cls: "s-total", sub: "filas totales"       },
        { label: "Este escenario", val: scenarioRows.length,         cls: "s-total", sub: "filas con dato"      },
        { label: "Sin hallazgos",  val: scenarioRows.length - incRows, cls: "s-ok",  sub: "valor correcto"      },
        { label: "Con hallazgos",  val: incRows,                     cls: "s-inc",   sub: "requieren revisión"  },
        { label: "Validados",      val: countValidated,              cls: "s-pend",  sub: "validación asignada" },
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

// ── ScenarioSheet ──────────────────────────────────────────────────────────
function ScenarioSheet({ allRows, persistKey, scenario, onSave, onExportSuccess }) {
  const { badgeCol } = scenario;

  // Filas de este escenario: solo las que tienen la columna badgeCol
  const scenarioRows = useMemo(() => {
    if (!allRows) return [];
    return allRows.filter(r => r[badgeCol] !== undefined && r[badgeCol] !== null);
  }, [allRows, badgeCol]);

  const { getVal, getComentario, setValidacion, setComentario, countValidated, flush, rowId } =
    useValidaciones(persistKey, scenario.key, scenarioRows, badgeCol);

  const [sortCol,    setSortCol]    = usePersistedState(`${persistKey}-${scenario.key}-sort-col`,    null);
  const [sortDir,    setSortDir]    = usePersistedState(`${persistKey}-${scenario.key}-sort-dir`,    "asc");
  const [filter,     setFilter]     = usePersistedState(`${persistKey}-${scenario.key}-filter`,      "");
  const [page,       setPage]       = usePersistedState(`${persistKey}-${scenario.key}-page`,        0);
  const [pageSize,   setPageSize]   = usePersistedState(`${persistKey}-${scenario.key}-pagesize`,    DEFAULT_SIZE);
  const [colFilters, setColFilters] = usePersistedState(`${persistKey}-${scenario.key}-col-filters`, {});
  const [chips,      setChips]      = usePersistedState(`${persistKey}-${scenario.key}-chips`,       []);
  const [colWidths,  setColWidths]  = usePersistedState(`${persistKey}-${scenario.key}-col-widths`,  {});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const resizeRef = useRef({ active: false });
  const scrollParentRef = useRef(null);

  // Cols visibles: excluir badgeCols de OTROS escenarios; mostrar solo la propia
  const allDataCols = useMemo(() =>
    scenarioRows.length > 0 ? Object.keys(scenarioRows[0]) : [], [scenarioRows]);

  const cols = useMemo(() =>
    allDataCols.filter(c => !ALL_SCENARIO_COLS.has(c) || c === badgeCol),
    [allDataCols, badgeCol]);

  const allCols = [...cols, "__validacion__", "__comentario__"];

  function toggleChip(chip) {
    setChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
    setPage(0);
  }

  const incCount = useMemo(
    () => scenarioRows.filter(r => r[badgeCol] === "Incorrecto").length,
    [scenarioRows, badgeCol]);

  const filtered = useMemo(() => {
    let result = scenarioRows;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      result = result.filter(r => cols.some(c => String(r[c] ?? "").toLowerCase().includes(q)));
    }
    Object.entries(colFilters).forEach(([col, vals]) => {
      if (vals?.length > 0) {
        const set = new Set(vals);
        result = result.filter(r => set.has(String(r[col] ?? "—")));
      }
    });
    if (chips.includes("hallazgos"))   result = result.filter(r => r[badgeCol] === "Incorrecto");
    if (chips.includes("sin-validar")) result = result.filter(r => !getVal(r));
    if (chips.includes("validados"))   result = result.filter(r => !!getVal(r));
    return result;
  }, [scenarioRows, filter, colFilters, chips, cols, badgeCol]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? ""), bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortDir]);

  const effectiveSize = pageSize === "TODOS" ? Math.max(sorted.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(sorted.length / effectiveSize));
  const safePage   = Math.min(page, totalPages - 1);
  const pageRows   = sorted.slice(safePage * effectiveSize, (safePage + 1) * effectiveSize);

  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(0); setOpenPanel(null); }
  function getColFilterSet(col) { return colFilters[col] ? new Set(colFilters[col]) : new Set(); }
  function setColFilterSet(col, set) {
    setColFilters(prev => {
      const next = { ...prev };
      if (set.size === 0) delete next[col]; else next[col] = [...set];
      return next;
    });
    setPage(0);
  }

  const onResizeStart = useCallback((e, col) => {
    e.preventDefault(); e.stopPropagation();
    const th = e.target.closest("th");
    resizeRef.current = { active: true, col, startX: e.clientX, startW: th?.offsetWidth ?? 120 };
    function onMove(ev) {
      if (!resizeRef.current.active) return;
      const newW = Math.max(40, resizeRef.current.startW + ev.clientX - resizeRef.current.startX);
      setColWidths(prev => ({ ...prev, [resizeRef.current.col]: newW }));
    }
    function onUp() {
      resizeRef.current.active = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  function handleExportVista() {
    const result = exportSheetValidaciones(sorted, cols, getVal, getComentario, scenario, persistKey);
    if (result.ok) onExportSuccess(result.filename, result.rowCount);
  }

  // Virtualización: solo si la página actual supera el umbral.
  // En la práctica esto se activa con pageSize="TODOS" en datasets grandes.
  // Para 50, 100 filas paginadas no aporta — es mejor render simple.
  const useVirtual = pageRows.length > VIRTUAL_THRESHOLD;

  if (scenarioRows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <p>No hay filas con datos para <strong>{scenario.label}</strong> en este reporte.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      <StatsRow totalRows={allRows?.length ?? 0} scenarioRows={scenarioRows}
        countValidated={countValidated} badgeCol={badgeCol} />

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar en tabla…"
            value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} />
          {Object.values(colFilters).filter(v => v?.length).length > 0 && (
            <button
              className="btn-export-small"
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
              onClick={() => { setColFilters({}); setPage(0); }}
            >
              ⊙ {Object.values(colFilters).filter(v => v?.length).length} filtro{Object.values(colFilters).filter(v => v?.length).length > 1 ? 's' : ''} activo{Object.values(colFilters).filter(v => v?.length).length > 1 ? 's' : ''} — limpiar
            </button>
          )}
          <div className="chips-bar">
            <button className={`chip ${chips.includes("hallazgos") ? "chip-on" : ""}`}
              onClick={() => toggleChip("hallazgos")}>
              Solo hallazgos {incCount > 0 && <span className="chip-count">{incCount}</span>}
            </button>
            <button className={`chip ${chips.includes("sin-validar") ? "chip-on" : ""}`}
              onClick={() => toggleChip("sin-validar")}>
              No Modificados
              {(scenarioRows.length - countValidated) > 0 && (
                <span className="chip-count">{scenarioRows.length - countValidated}</span>
              )}
            </button>
            <button className={`chip ${chips.includes("validados") ? "chip-on" : ""}`}
              onClick={() => toggleChip("validados")}>
              Modificados
              {countValidated > 0 && <span className="chip-count">{countValidated}</span>}
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <span className="row-count">
            <span className="row-count-num">{sorted.length}</span> filas
          </span>
          <button className="btn-export-small" onClick={handleExportVista}>
            ↓ Exportar vista
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="scroll-x" ref={scrollParentRef} onClick={e => e.stopPropagation()}>
        <table className="data-table">
          <thead>
            <tr>
              {allCols.map(col => {
                const isSpecial = col === "__validacion__" || col === "__comentario__";
                return (
                  <ThCell key={col} col={col} isSpecial={isSpecial}
                    hasFilter={colFilters[col]?.length > 0}
                    width={colWidths[col] ?? (col === "__validacion__" ? 155 : col === "__comentario__" ? 230 : 130)}
                    openPanel={openPanel} setOpenPanel={setOpenPanel}
                    sortCol={sortCol} sortDir={sortDir}
                    rows={scenarioRows}
                    getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                    handleSort={handleSort} onResizeStart={onResizeStart} />
                );
              })}
            </tr>
          </thead>
          {useVirtual ? (
            <VirtualTableBody
              rows={pageRows}
              scrollParentRef={scrollParentRef}
              cols={cols}
              colWidths={colWidths}
              getVal={getVal}
              getComentario={getComentario}
              setValidacion={setValidacion}
              setComentario={setComentario}
              badgeCol={badgeCol}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
              rowId={rowId}
            />
          ) : (
            <tbody>
              {pageRows.map((row, ri) => (
                <DataTableRow
                  key={ri}
                  row={row}
                  ri={ri}
                  cols={cols}
                  colWidths={colWidths}
                  getVal={getVal}
                  getComentario={getComentario}
                  setValidacion={setValidacion}
                  setComentario={setComentario}
                  badgeCol={badgeCol}
                  expandedRow={expandedRow}
                  setExpandedRow={setExpandedRow}
                  rowId={rowId}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Paginación con pills */}
      <div className="pagination">
        <div className="pagination-left">
          <div className="page-size-bar">
            <span className="page-size-label">Filas:</span>
            {PAGE_SIZES.map(ps => (
              <button key={ps}
                className={`page-size-btn ${pageSize === ps ? "ps-active" : ""}`}
                onClick={() => { setPageSize(ps); setPage(0); }}>{ps}</button>
            ))}
          </div>
        </div>
        <div className="pagination-right">
          <span className="page-info">{sorted.length.toLocaleString()} registros</span>
          {pageSize !== "TODOS" && (
            <>
              <button className="page-btn" disabled={safePage === 0} onClick={() => setPage(0)}>«</button>
              <button className="page-btn" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p-1))}>‹</button>
              <span className="page-num">{safePage + 1} / {totalPages}</span>
              <button className="page-btn" disabled={safePage >= totalPages-1} onClick={() => setPage(p => p+1)}>›</button>
              <button className="page-btn" disabled={safePage >= totalPages-1} onClick={() => setPage(totalPages-1)}>»</button>
            </>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="save-bar">
        <span className="save-info">
          {countValidated} de {scenarioRows.length} validados · <strong>{scenario.label}</strong>
          <span className="save-autosave-hint" title="Los cambios se guardan automáticamente">
            · guardado automático activo
          </span>
        </span>
        <button className="btn-save" onClick={() => { flush(); onSave(); }}>💾 Guardar progreso</button>
      </div>
    </div>
  );
}

// ── DataTable root ─────────────────────────────────────────────────────────
export default function DataTable({ rows, persistKey = "table" }) {
  const [activeScenario, setActiveScenario] = usePersistedState(
    `${persistKey}-active-scenario`, ESCENARIOS_ORDEN[0].key);
  const [saveMsg,     setSaveMsg]     = useState(null);
  const [exportModal, setExportModal] = useState(null);

  /**
   * hallazgos por escenario — cuenta Incorrecto para badge en tabs
   */
  const scenarioIncCounts = useMemo(() => {
    if (!rows || rows.length === 0) return {};
    const counts = {};
    ESCENARIOS_ORDEN.forEach(s => {
      counts[s.key] = rows.filter(r => r[s.badgeCol] === "Incorrecto").length;
    });
    return counts;
  }, [rows]);

  /**
   * availableScenarios — filtra dinámicamente los escenarios
   * que tienen al menos 1 fila con su badgeCol en el dataset actual.
   * Esto permite que Entra ID (sin PostCese/Inactividad/Bloqueado) solo
   * muestre los tabs de CesadosActivos y SinSustento.
   */
  const availableScenarios = useMemo(() => {
    if (!rows || rows.length === 0) return ESCENARIOS_ORDEN;
    return ESCENARIOS_ORDEN.filter(s =>
      rows.some(r => r[s.badgeCol] !== undefined && r[s.badgeCol] !== null)
    );
  }, [rows]);

  const currentScenario = useMemo(() => {
    return availableScenarios.find(s => s.key === activeScenario)
      ?? availableScenarios[0]
      ?? ESCENARIOS_ORDEN[0];
  }, [availableScenarios, activeScenario]);

  return (
    <div className="dt-root">
      {saveMsg && <div className="save-toast">{saveMsg}</div>}
      {exportModal && (
        <ExportSuccessModal filename={exportModal.filename} rowCount={exportModal.rowCount}
          onClose={() => setExportModal(null)} />
      )}

      <div className="dt-body">
        <ScenarioSheet
          key={`${persistKey}-${currentScenario.key}`}
          allRows={rows}
          persistKey={persistKey}
          scenario={currentScenario}
          onSave={() => { setSaveMsg("✓ Progreso confirmado"); setTimeout(() => setSaveMsg(null), 2500); }}
          onExportSuccess={(filename, rowCount) => setExportModal({ filename, rowCount })}
        />
      </div>

      {/* Tabs estilo Excel — bottom — solo escenarios con datos */}
      <div className="scenario-tabs-bar">
        {availableScenarios.map((s, i) => (
          <button key={s.key}
            className={`scenario-tab ${currentScenario.key === s.key ? "scenario-tab-active" : ""}`}
            onClick={() => setActiveScenario(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
