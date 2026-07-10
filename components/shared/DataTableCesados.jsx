"use client";

/**
 * DataTableCesados
 *
 * Tabla multi-hoja para Hallazgos Preliminares.
 *
 * Notas:
 * - Filtro por header estilo Excel: ahora usa `ThCell` del módulo
 * `DataTableHeader.jsx` (el mismo que usa `DataTableUsuarios`).
 * Esto reemplaza el header custom de que tenía un panel inline
 * con UX inconsistente. Ahora el panel flotante de filtro/orden es
 * idéntico al resto de las tablas de la app.
 * - Limpieza: se eliminan los ~110 líneas de markup de header custom.
 * - Mismo set de features: orden A→Z/Z→A, búsqueda en valores únicos,
 * selección por checkboxes, sticky positioning, resize de columnas.
 *
 * Estructura externa idéntica a :
 * - Tabs superiores (scenario-tabs-bar) por hoja del backend.
 * - Toolbar con búsqueda + chip de filtros activos + Exportar.
 * - Paginación inferior con botones de tamaño.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { ThCell } from "./DataTableHeader";
import Badge from "./Badge";
import { getHeaderColorClass, getColumnLabel } from "@/lib/constants/hallazgos";
import * as XLSX from "xlsx";

const PAGE_SIZES   = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE = 50;

// ── Export todas las hojas ─────────────────────────────────────────────────
export function exportAllCesados(rawData, hojaCfg, reportLabel) {
  const wb = XLSX.utils.book_new();
  let n = 0;
  for (const [hoja, cfg] of Object.entries(hojaCfg)) {
    const rows = rawData?.[hoja] ?? [];
    if (!rows.length) continue;
    const cols       = cfg.columnas ?? Object.keys(rows[0]);
    const exportRows = rows.map(row => {
      const out = {};
      cols.forEach(c => { out[c] = row[c] ?? ""; });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31).replace(/[:\\/?*[\]]/g, "_"));
    n++;
  }
  if (!n) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "Vacío");
  const filename = `${reportLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, sheets: n, filename };
}

// ── Modal export ───────────────────────────────────────────────────────────
function ExportModal({ filename, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div className="modal-ok-icon">📥</div>
        <div className="modal-ok-title">Exportación exitosa</div>
        <div className="modal-ok-sub"><strong>{filename}</strong></div>
        <button className="modal-btn modal-success" onClick={onClose} style={{ marginTop: 4 }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── Hoja individual ────────────────────────────────────────────────────────
function HojaSheet({ rows, hojaKey, columnas, persistKey }) {
  const pfx = `${persistKey}-ces-${hojaKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;

  const [filter,     setFilter]     = usePersistedState(`${pfx}-filter`,      "");
  const [sortCol,    setSortCol]    = usePersistedState(`${pfx}-sort-col`,    null);
  const [sortDir,    setSortDir]    = usePersistedState(`${pfx}-sort-dir`,    "asc");
  const [page,       setPage]       = usePersistedState(`${pfx}-page`,        0);
  const [pageSize,   setPageSize]   = usePersistedState(`${pfx}-pagesize`,    DEFAULT_SIZE);
  const [colFilters, setColFilters] = usePersistedState(`${pfx}-col-filters`, {});
  const [colWidths,  setColWidths]  = usePersistedState(`${pfx}-col-widths`,  {});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [exportOk,   setExportOk]   = useState(null);
  const resizeRef = useRef({ active: false });

  // ── Resize columnas (mismo patrón que DataTableUsuarios) ───────────────
  const onResizeStart = useCallback((e, col) => {
    e.preventDefault(); e.stopPropagation();
    const th = e.target.closest("th");
    resizeRef.current = { active: true, col, startX: e.clientX, startW: th?.offsetWidth ?? 120 };
    function onMove(ev) {
      if (!resizeRef.current.active) return;
      setColWidths(prev => ({
        ...prev,
        [resizeRef.current.col]: Math.max(40, resizeRef.current.startW + ev.clientX - resizeRef.current.startX),
      }));
    }
    function onUp() {
      resizeRef.current.active = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [setColWidths]);

  // ── Filtrado: búsqueda global + filtros por columna ────────────────────
  const filtered = useMemo(() => {
    let res = rows;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      res = res.filter(r => columnas.some(c => String(r[c] ?? "").toLowerCase().includes(q)));
    }
    Object.entries(colFilters).forEach(([col, vals]) => {
      if (vals?.length) {
        const s = new Set(vals);
        res = res.filter(r => s.has(String(r[col] ?? "—")));
      }
    });
    return res;
  }, [rows, filter, colFilters, columnas]);

  // ── Sort ──────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? ""), bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortDir]);

  // ── Paginación ─────────────────────────────────────────────────────────
  const effectiveSize = pageSize === "TODOS" ? Math.max(sorted.length, 1) : pageSize;
  const totalPages    = Math.max(1, Math.ceil(sorted.length / effectiveSize));
  const safePage      = Math.min(page, totalPages - 1);
  const pageRows      = sorted.slice(safePage * effectiveSize, (safePage + 1) * effectiveSize);

  // ── Handlers requeridos por ThCell ─────────────────────────────────────
  function handleSort(col, dir) {
    setSortCol(col);
    setSortDir(dir);
    setPage(0);
    setOpenPanel(null);
  }
  function getColFilterSet(col) {
    return colFilters[col] ? new Set(colFilters[col]) : new Set();
  }
  function setColFilterSet(col, set) {
    setColFilters(prev => {
      const n = { ...prev };
      if (set.size === 0) delete n[col];
      else n[col] = [...set];
      return n;
    });
    setPage(0);
  }

  // ── Export vista ───────────────────────────────────────────────────────
  function handleExport() {
    if (!sorted.length) return;
    const exportRows = sorted.map(row => {
      const out = {};
      columnas.forEach(c => { out[c] = row[c] ?? ""; });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, hojaKey.slice(0, 31));
    const filename = `${pfx}-vista.xlsx`;
    XLSX.writeFile(wb, filename);
    setExportOk({ filename });
  }

  const activeFiltersCount = Object.values(colFilters).filter(v => v?.length).length;

  if (!rows.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <p>No hay filas en <strong>{hojaKey}</strong>.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      {exportOk && <ExportModal filename={exportOk.filename} onClose={() => setExportOk(null)} />}

      {/* Toolbar — alineado con DataTableUsuarios */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input
            className="search-input"
            placeholder="Buscar en tabla…"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0); }}
          />
          {activeFiltersCount > 0 && (
            <button
              className="btn-export-small"
              style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(0); }}
            >
              ⊙ {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} activo{activeFiltersCount > 1 ? "s" : ""} — limpiar
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count">
            <span className="row-count-num">{sorted.length}</span> filas
            {sorted.length !== rows.length && (
              <span style={{ color: "var(--text3)", marginLeft: 4 }}>de {rows.length}</span>
            )}
          </span>
          <button className="btn-export-small" onClick={handleExport} disabled={!sorted.length}>
            ↓ Exportar vista
          </button>
        </div>
      </div>

      {/* Tabla con ThCell (filtro por header estilo Excel) */}
      <div className="scroll-x" onClick={e => e.stopPropagation()}>
        <table className="data-table">
          <thead>
            <tr>
              {columnas.map(col => (
                <ThCell
                  key={col}
                  col={col}
                  isSpecial={false}
                  hasFilter={colFilters[col]?.length > 0}
                  width={colWidths[col] ?? 130}
                  openPanel={openPanel}
                  setOpenPanel={setOpenPanel}
                  sortCol={sortCol}
                  sortDir={sortDir}
                  rows={rows}
                  getColFilterSet={getColFilterSet}
                  setColFilterSet={setColFilterSet}
                  handleSort={handleSort}
                  onResizeStart={onResizeStart}
                  headerClass={getHeaderColorClass(persistKey, hojaKey, col)}
                  label={getColumnLabel(persistKey, hojaKey, col)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className="data-row"
                style={{
                  background: i % 2 === 0 ? "var(--bg2)" : "var(--bg)",
                }}
              >
                {columnas.map(col => (
                  <td key={col} style={{
                    padding: "7px 10px", color: "var(--text2)", fontSize: 13,
                    fontFamily: "var(--sans)", whiteSpace: "nowrap",
                    maxWidth: colWidths[col] ?? 130,
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    <Badge value={row[col]} moduleKey="usuarios" />
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
            {PAGE_SIZES.map(s => (
              <button key={s}
                className={`page-size-btn ${pageSize === s ? "active" : ""}`}
                onClick={() => { setPageSize(s); setPage(0); }}>
                {s}
              </button>
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
    </div>
  );
}

// ── DataTableCesados root ──────────────────────────────────────────────────
export default function DataTableCesados({ rawData, persistKey, hojaCfg }) {
  const hojas = Object.keys(hojaCfg);
  const [activeTab, setActiveTab] = usePersistedState(`${persistKey}-ces-active-tab`, hojas[0] ?? "");

  const currentTab = hojas.includes(activeTab) ? activeTab : (hojas[0] ?? "");

  if (!hojas.length || !rawData) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <p>El reporte no contiene datos.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Tabs por hoja — estilo unificado con scenario-tabs-bar */}
      <div className="scenario-tabs-bar">
        {hojas.map(hoja => {
          const count    = rawData?.[hoja]?.length ?? 0;
          const isActive = hoja === currentTab;
          return (
            <button
              key={hoja}
              onClick={() => setActiveTab(hoja)}
              className={`scenario-tab ${isActive ? "scenario-tab-active" : ""}`}
            >
              {hoja}
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: isActive ? "var(--accent)" : "var(--bg3)",
                color: isActive ? "#fff" : "var(--text3)",
                borderRadius: 10, padding: "1px 7px",
                fontFamily: "var(--mono)", fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hoja activa */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <HojaSheet
          key={currentTab}
          rows={rawData?.[currentTab] ?? []}
          hojaKey={currentTab}
          columnas={hojaCfg[currentTab]?.columnas ?? []}
          persistKey={persistKey}
        />
      </div>
    </div>
  );
}
