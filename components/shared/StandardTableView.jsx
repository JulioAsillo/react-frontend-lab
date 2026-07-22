"use client";

/**
 * StandardTableView — Tabla estándar de una fuente BD: búsqueda global,
 * filtros por columna (ThCell), sort, paginación (100/pág), resize de
 * columnas y export a Excel.
 *
 * Extraída de FuenteDetallePriv.jsx sin cambios de comportamiento; vive en
 * shared porque no depende de nada específico de Privilegiados. El prefijo
 * del archivo exportado se parametriza con `exportPrefix` (default "priv"
 * para preservar el comportamiento del módulo que la originó).
 */

import { useState, useRef, useMemo } from "react";
import { ThCell } from "@/components/shared/DataTableHeader";
import { labelFor } from "@/lib/utils/fieldLabels";
import { exportSheetPlano } from "@/lib/utils/excel";
import { formatFechaHora } from "@/lib/utils/formatFecha";
import { buildSimpleWidths } from "@/lib/utils/columnWidths";

const PAGE_SIZE = 100;

export default function StandardTableView({ rows, src, exportPrefix = "priv" }) {
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [sortCol,      setSortCol]      = useState(null);
  const [sortDir,      setSortDir]      = useState("asc");
  const [colFilters,   setColFilters]   = useState({});
  const [openPanel,    setOpenPanel]    = useState(null);
  const [columnWidths, setColumnWidths] = useState(() => buildSimpleWidths(src.cols));

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }

  // Resize
  const resizeRef = useRef({});
  function startResize(col, e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = columnWidths[col] ?? 150;
    resizeRef.current = { col, startX, startW };
    function onMove(ev) {
      const delta = ev.clientX - resizeRef.current.startX;
      setColumnWidths(w => ({ ...w, [resizeRef.current.col]: Math.max(60, resizeRef.current.startW + delta) }));
    }
    function onUp() { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(row => src.cols.some(col => String(row[col] ?? "").toLowerCase().includes(q)));
    }
    for (const [col, active] of Object.entries(colFilters)) {
      if (active.size > 0) r = r.filter(row => {
        const v = row[col];
        let n;
        if (v === true  || v === 1 || v === "1" || v === "True"  || v === "true"
            || v === "Si" || v === "si" || v === "Sí" || v === "sí"
            || v === "YES" || v === "yes") n = "Activo";
        else if (v === false || v === 0 || v === "0" || v === "False" || v === "false"
            || v === "No" || v === "no" || v === "NO") n = "Inactivo";
        else n = String(v ?? "—");
        return active.has(n);
      });
    }
    return r;
  }, [rows, search, colFilters, src.cols]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 240 }} />
          {search && <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕ Limpiar</button>}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(1); }}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count">
            <span className="row-count-num">{sorted.length}</span> de {rows.length}
          </span>
          <button className="btn-export" disabled={!rows.length}
            onClick={() => exportSheetPlano(rows, src.cols, `${exportPrefix}-${src.id}`, (k) => labelFor(src, k))}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="scroll-x">
        <table className="data-table">
          <thead>
            <tr>
              {src.cols.map(col => (
                <ThCell key={col} col={col} isSpecial={false}
                  label={labelFor(src, col)}
                  hasFilter={colFilters[col]?.size > 0}
                  width={`${columnWidths[col] ?? 150}px`}
                  openPanel={openPanel} setOpenPanel={setOpenPanel}
                  sortCol={sortCol} sortDir={sortDir} rows={rows}
                  getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                  handleSort={handleSort}
                  onResizeStart={(e, c) => startResize(c, e)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                {src.cols.map(col => {
                  const val = row[col];
                  let display;
                  if (typeof val === "boolean") {
                    display = (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                        background: val ? "var(--ok-bg)"  : "var(--inc-bg)",
                        color:      val ? "var(--ok-text)": "var(--inc-text)",
                        border:     `1px solid ${val ? "var(--ok-border)" : "var(--inc-border)"}`,
                      }}>{val ? "Activo" : "Inactivo"}</span>
                    );
                  } else if (src.dateCols?.includes(col)) {
                    display = <span className="cell-text">{val ? formatFechaHora(val) : "—"}</span>;
                  } else {
                    display = <span className="cell-text">{String(val ?? "—")}</span>;
                  }
                  return <td key={col} style={{ width: columnWidths[col] ?? 150 }}>{display}</td>;
                })}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={src.cols.length} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                Sin resultados
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left">
            <span className="page-info">Página {page} de {totalPages}</span>
          </div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-size-btn ${p === page ? "ps-active" : ""}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
