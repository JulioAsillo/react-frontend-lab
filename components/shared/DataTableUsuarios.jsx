"use client";

/**
 * DataTableUsuarios — tabla multi-nivel para los 4 reportes de usuarios
 * con backend unificado (v18).
 *
 * Estructura de navegación:
 *   SUPERIOR (tabs de hoja)  → claves del backend: "AD", "Entra ID", "DB_SDP", etc.
 *   INFERIOR (tabs escenario) → ESCENARIOS_ORDEN filtrados por badgeCol
 *
 * El backend ahora devuelve { data: { "AD": [...], "Entra ID": [...] } }
 * o { "DB_SDP": [...], "DB_EXACTUS": [...], "DB_SIT": [...] }.
 * rawData ya llega normalizado desde fetchReporte (sin wrapper data).
 *
 * Export completo:
 *   Por cada hoja del backend → por cada escenario disponible en esa hoja
 *   → 1 hoja Excel llamada "{hojaBackend} - {escenario.label}"
 *   con columnas: [...columnas_datos, Validación, Comentario]
 *
 * Export vista:
 *   Solo las filas visibles del escenario + hoja activos.
 */

import { useMemo, useState, useRef, useCallback } from "react";
import { displayAccion } from "@/lib/constants/accionCorrectiva";
import { BADGE_COLS } from "@/lib/constants/badgeCols";
import { ESCENARIOS_ORDEN } from "@/lib/constants/reportes";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useValidaciones } from "@/lib/hooks/useValidaciones";
import { exportSheetValidaciones } from "@/lib/utils/excel";
import Badge from "./Badge";
import DataTableRow from "./DataTableRow";
import { ThCell } from "./DataTableHeader";
import * as XLSX from "xlsx";
import ClasificacionModal from "./ClasificacionModal";

// ── Constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZES       = [5, 15, 25, 50, 100, "TODOS"];
const DEFAULT_SIZE     = 50;
const VALIDACION_OPTS  = ["Correcto", "Incorrecto", "Sustentado"];
const ALL_SCENARIO_COLS = new Set(ESCENARIOS_ORDEN.map(s => s.badgeCol));

// ── Normalizar rawData → { sheetKey: rows[] } ─────────────────────────────────
function normalizeSheets(rawData) {
  if (!rawData) return {};
  // Array plano → una sola hoja "Principal"
  if (Array.isArray(rawData)) return rawData.length ? { Principal: rawData } : {};
  if (typeof rawData !== "object") return {};
  const result = {};
  for (const [k, v] of Object.entries(rawData)) {
    if (Array.isArray(v)) result[k] = v;
  }
  return result;
}

// ── Hash determinista (igual que useValidaciones) ─────────────────────────────
function rowIdFnv(row) {
  let h = 0x811c9dc5;
  for (const k of Object.keys(row).sort()) {
    const v = row[k];
    const s = `${k}\u0001${v === null || v === undefined ? "" : String(v)}\u0002`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  }
  return h.toString(16).padStart(8, "0");
}

// ── Export completo: todas las hojas × todos los escenarios ──────────────────
export function exportAllUsuarios(sheets, persistKey, reportLabel) {
  /**
   * v27 — una hoja Excel por (fuente × escenario), MISMO patrón que
   * exportAllPerfiles / exportAllPrivilegiados.
   *
   * Orden: agrupado por fuente y luego por escenario →
   *   Fuente1 - Esc1, Fuente1 - Esc2, …, Fuente2 - Esc1, Fuente2 - Esc2, …
   *
   * Cada hoja contiene SOLO las filas de ese escenario (las que tienen valor en
   * su badgeCol), con las columnas base + Validación + Acción Correctiva +
   * Comentario, igual que la exportación "por vista" de un escenario.
   */
  const wb = XLSX.utils.book_new();
  let n = 0;
  const allBadgeColsGlobal = new Set(ESCENARIOS_ORDEN.map(s => s.badgeCol));

  // Nombre de hoja válido (≤31, sin caracteres prohibidos) y único en el libro.
  function addSheet(baseName, rowsForSheet) {
    let name = String(baseName).replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
    if (wb.SheetNames.includes(name)) {
      let i = 2, candidate;
      do { candidate = `${name.slice(0, 28)}_${i++}`; } while (wb.SheetNames.includes(candidate));
      name = candidate;
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsForSheet), name);
    n++;
  }

  for (const [sheetKey, rows] of Object.entries(sheets)) {
    if (!rows?.length) continue;

    const sheetSlug = sheetKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Escenarios con al menos 1 fila con dato en esta fuente
    const scenariosInSheet = ESCENARIOS_ORDEN.filter(s =>
      rows.some(r => r[s.badgeCol] != null && r[s.badgeCol] !== "")
    );

    // Fuente sin escenarios → una sola hoja con las columnas base
    if (scenariosInSheet.length === 0) {
      const baseSet = new Set();
      const baseCols = [];
      rows.forEach(r => Object.keys(r).forEach(c => {
        if (!baseSet.has(c) && !allBadgeColsGlobal.has(c)) { baseSet.add(c); baseCols.push(c); }
      }));
      const exportRows = rows.map(row => {
        const out = {};
        baseCols.forEach(c => { out[c] = row[c] ?? ""; });
        return out;
      });
      addSheet(sheetKey, exportRows);
      continue;
    }

    // Una hoja por escenario de esta fuente (bucle interno = escenarios)
    for (const scenario of scenariosInSheet) {
      const { badgeCol, key, label } = scenario;

      // Solo las filas que pertenecen a este escenario
      const scenarioRows = rows.filter(r => r[badgeCol] != null && r[badgeCol] !== "");
      if (scenarioRows.length === 0) continue;

      // Validaciones guardadas de este escenario
      let valStore = {};
      try {
        const raw = typeof window !== "undefined"
          ? localStorage.getItem(`${persistKey}-val-${sheetSlug}-${key}`)
          : null;
        valStore = raw ? JSON.parse(raw) : {};
      } catch { valStore = {}; }

      // Columnas: todas menos las badgeCols de OTROS escenarios (se conserva la propia)
      const otherBadge = new Set([...allBadgeColsGlobal].filter(c => c !== badgeCol));
      const colSet = new Set();
      const cols = [];
      scenarioRows.forEach(r => Object.keys(r).forEach(c => {
        if (!colSet.has(c) && !otherBadge.has(c)) { colSet.add(c); cols.push(c); }
      }));

      const exportRows = scenarioRows.map(row => {
        const out = {};
        cols.forEach(c => { out[c] = row[c] ?? ""; });
        const stored   = valStore[rowIdFnv(row)] ?? {};
        const manual   = stored.validacion ?? null;
        const badgeVal = String(row[badgeCol] || "").trim().toLowerCase();
        let fallback = null;
        if (badgeVal === "correcto")        fallback = "Correcto";
        else if (badgeVal === "incorrecto") fallback = "Incorrecto";
        else if (badgeVal === "sustentado") fallback = "Sustentado";
        out["Validación"]        = manual ?? fallback ?? "";
        out["Acción Correctiva"] = displayAccion(stored.accion);
        out["Comentario"]        = stored.comentario ?? "";
        return out;
      });

      addSheet(`${sheetKey} - ${label}`, exportRows);
    }
  }

  if (n === 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "Vacío");
  const filename = `${reportLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  return { ok: true, sheets: n, filename };
}


// ── StatsRow ──────────────────────────────────────────────────────────────────
function StatsRow({ totalSheetRows, scenarioRows, countModificados, badgeCol }) {
  const incRows = scenarioRows.filter(r => {
    const v = String(r[badgeCol] || "").trim().toLowerCase();
    return v && v !== "correcto";
  }).length;
  return (
    <div className="stats-row">
      {[
        { label: "Total filas",   val: scenarioRows.length,          cls: "s-total", sub: "filas con dato"      },
        { label: "Sin hallazgo",  val: scenarioRows.length - incRows, cls: "s-ok",   sub: "valor correcto"     },
        { label: "Con hallazgo",  val: incRows,                      cls: "s-inc",   sub: "requieren revisión" },
        { label: "Validados",     val: countModificados,             cls: "s-pend",  sub: "validación cambiada" },
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

// ── ScenarioSheet — interior de una hoja×escenario ───────────────────────────
function ScenarioSheet({ allSheetRows, sheetKey, persistKey, scenario, onExportSuccess, onRowDoubleClick }) {
  const { badgeCol } = scenario;

  // Clave única por hoja + escenario para persistencia
  const sheetSlug   = sheetKey.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const scenarioKey = `${sheetSlug}-${scenario.key}`;
  const pfx         = `${persistKey}-${scenarioKey}`;

  const scenarioRows = useMemo(() =>
    allSheetRows.filter(r => r[badgeCol] !== undefined && r[badgeCol] !== null),
    [allSheetRows, badgeCol]
  );

  const { getVal, getComentario, getAccion, setValidacion, setComentario, setAccion, countValidated, countModificados, flush, rowId } =
    useValidaciones(persistKey, scenarioKey, scenarioRows, badgeCol);

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
  const [exportOk,   setExportOk]   = useState(null);
  const [saveMsg,    setSaveMsg]    = useState(null);
  const resizeRef = useRef({ active: false });

  const allDataCols = useMemo(() =>
    scenarioRows.length > 0 ? Object.keys(scenarioRows[0]) : [],
    [scenarioRows]
  );

  // Excluir badgeCols de OTROS escenarios
  const cols = useMemo(() =>
    allDataCols.filter(c => !ALL_SCENARIO_COLS.has(c) || c === badgeCol),
    [allDataCols, badgeCol]
  );
  const allCols = [...cols, "__validacion__", "__accion__", "__comentario__"];

  const hallazgosCount = useMemo(() =>
    scenarioRows.filter(r => {
      const v = String(r[badgeCol] || "").trim().toLowerCase();
      return v && v !== "correcto";
    }).length,
    [scenarioRows, badgeCol]
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
      const v = String(r[badgeCol] || "").trim().toLowerCase();
      return v && v !== "correcto";
    });
    return res;
  }, [scenarioRows, filter, colFilters, chips, cols, badgeCol, getVal]);

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

  function handleExportVista() {
    // Filename limpio: "{persistKey}_{sheetKey}_{scenarioLabel}" sin dobles slugs
    const safeName = `${persistKey}_${sheetKey}_${scenario.label}`
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "");
    const r = exportSheetValidaciones(sorted, cols, getVal, getComentario, getAccion, scenario, safeName);
    if (r.ok) setExportOk(r);
  }

  if (!scenarioRows.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <p>No hay filas para el escenario <strong>{scenario.label}</strong> en <strong>{sheetKey}</strong>.</p>
      </div>
    );
  }


  return (
    <div className="table-wrapper" onClick={() => setOpenPanel(null)}>
      {exportOk && (
        <div className="modal-overlay" onClick={() => setExportOk(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-ok-icon">📥</div>
            <div className="modal-ok-title">¡Exportación exitosa!</div>
            <div className="modal-ok-sub"><strong>{exportOk.filename}</strong> · {exportOk.rowCount?.toLocaleString()} filas</div>
            <button className="modal-btn modal-success" onClick={() => setExportOk(null)} style={{ marginTop: 4 }}>Entendido</button>
          </div>
        </div>
      )}

      <StatsRow
        totalSheetRows={allSheetRows.length}
        scenarioRows={scenarioRows}
        countModificados={countModificados}
        badgeCol={badgeCol}
      />

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
                    hasFilter={!isSpecial && colFilters[col]?.length > 0}
                    width={colWidths[col] ?? (col === "__validacion__" ? 184 : col === "__accion__" ? 184 : col === "__comentario__" ? 230 : 130)}
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
              <DataTableRow key={rowId(row)} row={row} ri={ri} cols={cols} colWidths={colWidths}
                getVal={getVal} getComentario={getComentario} getAccion={getAccion}
                setValidacion={setValidacion} setComentario={setComentario} setAccion={setAccion}
                badgeCol={badgeCol} scenarioLabel={scenario.label} accionModule="usuarios"
                expandedRow={expandedRow} setExpandedRow={setExpandedRow} rowId={rowId}
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
          {countValidated} de {scenarioRows.length} validados · <strong>{sheetKey} › {scenario.label}</strong>
          <span className="save-autosave-hint" title="Los cambios se guardan automáticamente">· guardado automático activo</span>
        </span>
        <button className="btn-save"
          onClick={() => { flush(); setSaveMsg("✓ Progreso confirmado"); setTimeout(() => setSaveMsg(null), 2500); }}>
          💾 Guardar progreso
        </button>
      </div>
      {saveMsg && <div className="save-toast">{saveMsg}</div>}
    </div>
  );
}

// ── DataTableUsuarios root ─────────────────────────────────────────────────────
export default function DataTableUsuarios({ rawData, persistKey, fieldMap }) {
  const sheets   = useMemo(() => normalizeSheets(rawData), [rawData]);
  const sheetKeys = Object.keys(sheets);

  // Tab superior: hoja del backend
  const [activeSheet, setActiveSheet] = usePersistedState(`${persistKey}-active-sheet`, "");
  const currentSheet = sheetKeys.includes(activeSheet) ? activeSheet : (sheetKeys[0] ?? "");

  // Tab inferior: escenario canónico
  const currentRows = sheets[currentSheet] ?? [];

  // Modal de clasificación de cuenta (doble clic en fila)
  const [modalRow, setModalRow] = useState(null);

  const availableScenarios = useMemo(() =>
    ESCENARIOS_ORDEN.filter(s =>
      currentRows.some(r => r[s.badgeCol] != null && r[s.badgeCol] !== "")
    ),
    [currentRows]
  );

  const [activeScenario, setActiveScenario] = usePersistedState(`${persistKey}-active-scenario`, "");
  const currentScenario = availableScenarios.find(s => s.key === activeScenario) ?? availableScenarios[0];

  if (!sheetKeys.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <p>El reporte no contiene datos.</p>
      </div>
    );
  }

  // Conteo de hallazgos por hoja (para badge en tab superior)
  // v21.1: cuenta filas donde la validación EFECTIVA es "Incorrecto".
  // La validación efectiva = storedVal (lo que el usuario guardó) ??
  //   badgeCol. Si el usuario marcó Correcto/Sustentado ya no cuenta.
  function hallazgosBySheet(key) {
    const rows = sheets[key] ?? [];
    let count = 0;
    for (const s of ESCENARIOS_ORDEN) {
      const sheetSlug = key.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      let store = {};
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`${persistKey}-val-${sheetSlug}-${s.key}`) : null;
        if (raw) store = JSON.parse(raw);
      } catch { /* noop */ }
      count += rows.filter(r => {
        if (r[s.badgeCol] == null) return false;
        const rowId = rowIdFnv(r);
        const storedVal = store[rowId]?.validacion;
        if (storedVal) {
          return String(storedVal).trim().toLowerCase() === "incorrecto";
        }
        // Fallback al valor del badgeCol
        const v = String(r[s.badgeCol] || "").trim().toLowerCase();
        return v && v !== "correcto";
      }).length;
    }
    return count;
  }

  // Conteo de hallazgos por escenario en la hoja activa
  // v21.1: igual que hallazgosBySheet pero para el escenario individual.
  function hallazgosByScenario(s) {
    const sheetSlug = currentSheet.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let store = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`${persistKey}-val-${sheetSlug}-${s.key}`) : null;
      if (raw) store = JSON.parse(raw);
    } catch { /* noop */ }
    return currentRows.filter(r => {
      if (r[s.badgeCol] == null) return false;
      const rowId = rowIdFnv(r);
      const storedVal = store[rowId]?.validacion;
      if (storedVal) {
        return String(storedVal).trim().toLowerCase() === "incorrecto";
      }
      const v = String(r[s.badgeCol] || "").trim().toLowerCase();
      return v && v !== "correcto";
    }).length;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Modal de clasificación de cuenta (doble clic en fila) */}
      {modalRow && (
        <ClasificacionModal row={modalRow} onClose={() => setModalRow(null)} fieldMap={fieldMap} />
      )}

      {/* Aviso de doble clic para clasificar — solo hallazgos (no preliminares) */}
      {persistKey !== "cesados" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 16px",
          background: "var(--accent-bg)",
          borderBottom: "1px solid var(--accent2)",
          fontSize: 12, color: "var(--accent)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span>
            <strong>Doble clic en cualquier fila</strong> para editar el{" "}
            <strong>Tipo de Cuenta</strong> y la <strong>Matrícula</strong> de ese usuario.
          </span>
        </div>
      )}

      {/* ── TABS SUPERIORES: hojas del backend ── */}
      <div
        className="scenario-tabs-bar"
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0 12px",
          display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
          background: "var(--bg2)", flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Hoja
        </span>
        {sheetKeys.map(key => {
          const hCount = hallazgosBySheet(key);
          return (
            <button
              key={key}
              className={`scenario-tab ${key === currentSheet ? "scenario-tab-active" : ""}`}
              onClick={() => setActiveSheet(key)}
              style={{ position: "relative" }}
            >
              {key}
              <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                ({(sheets[key] ?? []).length})
              </span>
              {hCount > 0 && <span className="scenario-tab-badge">{hCount}</span>}
            </button>
          );
        })}
      </div>

      {/* ── CONTENIDO CENTRAL ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {availableScenarios.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <p>No se encontraron escenarios con datos en <strong>{currentSheet}</strong>.</p>
          </div>
        ) : currentScenario ? (
          <ScenarioSheet
            key={`${currentSheet}-${currentScenario.key}`}
            allSheetRows={currentRows}
            sheetKey={currentSheet}
            persistKey={persistKey}
            scenario={currentScenario}
            onRowDoubleClick={persistKey !== "cesados" ? setModalRow : undefined}
          />
        ) : null}
      </div>

      {/* ── TABS INFERIORES: escenarios canónicos ── */}
      {availableScenarios.length > 0 && (
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
          {availableScenarios.map(s => {
            const hCount = hallazgosByScenario(s);
            return (
              <button
                key={s.key}
                className={`scenario-tab ${s.key === currentScenario?.key ? "scenario-tab-active" : ""}`}
                onClick={() => setActiveScenario(s.key)}
                style={{ position: "relative" }}
              >
                {s.label}
                {hCount > 0 && <span className="scenario-tab-badge">{hCount}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
