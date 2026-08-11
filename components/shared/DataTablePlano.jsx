"use client";

/**
 * DataTablePlano — tabla única para reportes que NO se separan en escenarios.
 *
 * Diferencias con DataTable:
 * - No hay escenarios (sin tabs en la parte inferior).
 * - No hay columnas Validación ni Comentario.
 * - Muestra TODAS las columnas crudas que devuelve el backend.
 * - El export de vista descarga las mismas columnas tal cual.
 *
 * Comparte con DataTable:
 * - ColPanel y ThCell (filtros por columna + sort + resize) — desde DataTableHeader.
 * - DataTableRow no aplica (lleva validación/comentario embebidos). Aquí
 * renderizamos celdas directamente con Badge para columnas conocidas.
 * - VirtualTableBody no aplica directamente (asume validación). Para
 * mantenemos render clásico — el threshold es alto y los Preliminares no
 * suelen ser datasets enormes. Si en el futuro lo son, se puede extender.
 *
 * Persistencia: las prefs UI (sort, filtros, anchos, paginación) usan claves
 * con sufijo "-flat-" para no colisionar con DataTable si comparten persistKey.
 */

import { useMemo, useState, useRef, useCallback } from "react";
import { BADGE_COLS } from "@/lib/constants/badgeCols";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { exportSheetPlano } from "@/lib/utils/excel";
import Badge from "./Badge";
import { ThCell } from "./DataTableHeader";
import { formatFechaDDMMYYYY } from "@/lib/utils/formatFecha";

const PAGE_SIZES   = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE = 50;

function ExportSuccessModal({ filename, rowCount, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-ok-icon">📥</div>
        <div className="modal-ok-title">¡Vista exportada!</div>
        <div className="modal-ok-sub">
          Se descargó <strong>{filename}</strong> con{" "}
          <strong>{rowCount.toLocaleString()} filas</strong>.
        </div>
        <button className="modal-btn modal-success" onClick={onClose} style={{ marginTop: 4 }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function DataTablePlano({ rows, persistKey = "table" }) {
  const FLAT = `${persistKey}-flat`;

  const [sortCol,    setSortCol]    = usePersistedState(`${FLAT}-sort-col`,    null);
  const [sortDir,    setSortDir]    = usePersistedState(`${FLAT}-sort-dir`,    "asc");
  const [filter,     setFilter]     = usePersistedState(`${FLAT}-filter`,      "");
  const [page,       setPage]       = usePersistedState(`${FLAT}-page`,        0);
  const [pageSize,   setPageSize]   = usePersistedState(`${FLAT}-pagesize`,    DEFAULT_SIZE);
  const [colFilters, setColFilters] = usePersistedState(`${FLAT}-col-filters`, {});
  const [colWidths,  setColWidths]  = usePersistedState(`${FLAT}-col-widths`,  {});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [exportModal, setExportModal] = useState(null);
  const resizeRef = useRef({ active: false });

  // Columnas: TODAS las que devuelve el backend (primera fila como referencia)
  const cols = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  // Filtrado: búsqueda global + filtros por columna
  const filtered = useMemo(() => {
    let result = rows ?? [];
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
    return result;
  }, [rows, filter, colFilters, cols]);

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
  }, [setColWidths]);

  function handleExportVista() {
    const result = exportSheetPlano(sorted, cols, persistKey);
    if (result.ok) setExportModal({ filename: result.filename, rowCount: result.rowCount });
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <p>El reporte no contiene filas.</p>
      </div>
    );
  }

  return (
    <div className="dt-root">
      {exportModal && (
        <ExportSuccessModal filename={exportModal.filename} rowCount={exportModal.rowCount}
          onClose={() => setExportModal(null)} />
      )}

      <div className="dt-body">
        <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
          {/* Toolbar — mismo patrón que DataTable, sin chips de validación */}
          <div className="table-toolbar">
            <div className="toolbar-left">
              <input className="search-input" placeholder="Buscar en tabla…"
                value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} />
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
          <div className="scroll-x" onClick={e => e.stopPropagation()}>
            <table className="data-table">
              <thead>
                <tr>
                  {cols.map(col => (
                    <ThCell key={col} col={col} isSpecial={false}
                      hasFilter={colFilters[col]?.length > 0}
                      width={colWidths[col] ?? 130}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir}
                      rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={onResizeStart} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "row-even" : "row-odd"}>
                    {cols.map(col => (
                      <td key={col} style={{ width: colWidths[col] ?? 130 }}>
                        {BADGE_COLS.has(col)
                          ? <Badge value={formatFechaDDMMYYYY(row[col])} />
                          : <span className="cell-text">{formatFechaDDMMYYYY(row[col]) ?? "—"}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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
        </div>
      </div>
    </div>
  );
}
