"use client";

/**
 * FuenteDetallePriv — v26.2
 *
 * Vista individual de cada fuente de Recopilación de Privilegiados.
 * Sigue el mismo patrón de FuenteDetalle (Usuarios):
 *  - Carga vía cargarFuente() del uiStore
 *  - Persiste en IndexedDB con prefijo "priv-data"
 *  - Paginación, búsqueda, filtros Excel (ThCell), resize de columnas
 *  - Vistas especiales para server-linux y server-windows
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PRIV_BD_SOURCES } from "@/lib/mock/privBDSources";
import { useBDStatus, useBDError, useUIStore } from "@/lib/store/uiStore";
import FuenteUploadPanel from "@/components/admin/shared/FuenteUploadPanel";
import { isUploadSource, getUploadConfig } from "@/lib/constants/uploadSources";
import { idbGetItem, idbDelItem, idbSetItem } from "@/lib/storage";
import { exportSheetPlano } from "@/lib/utils/excel";
import { ThCell } from "@/components/shared/DataTableHeader";
import { getLabel } from "@/lib/utils/fieldLabels";
import { useAuthStore } from "@/lib/store/authStore";
import ExtraerInfoButton from "@/components/shared/ExtraerInfoButton";
import { getBotEndpoint } from "@/lib/constants/extraccionEndpoints";

const API_BASE  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DATA_KEY  = (id) => `priv-data-${id}`;
const PAGE_SIZE = 100;

// Formatea ISO "YYYY-MM-DDTHH:MM:SS" → "DD/MM/YYYY HH:MM:SS" (o solo fecha si no hay hora)
function fmtFechaHora(val) {
  if (!val) return "";
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return s;
  const [, yyyy, mm, dd, hh, mi, ss] = m;
  if (hh !== undefined) return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss ?? "00"}`;
  return `${dd}/${mm}/${yyyy}`;
}

function buildDefaultWidths(cols) {
  return Object.fromEntries(cols.map(col => [col, col.length > 20 ? 220 : 150]));
}

// ── Server Linux / Windows — tabla plana con filtros ─────────────────────────
// Expande cada registro dentro de cada servidor como una fila independiente.
// Linux:   servidor | tipo | aplicaciones | usuario | descripción | home | grupos | último login
// Windows: servidor | tipo | aplicaciones | usuario/grupo
function ServerView({ rows, tipo }) {
  const [search,     setSearch]     = useState("");
  const [colFilters, setColFilters] = useState({});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [sortCol,    setSortCol]    = useState(null);
  const [sortDir,    setSortDir]    = useState("asc");
  const [page,       setPage]       = useState(1);
  const PAGE_SZ = 100;

  const isLinux = tipo === "server-linux";
  const servers = Array.isArray(rows) ? rows : [];

  // Aplanar: un registro (string de user) por fila.
  // Backend devuelve srv.users como array de strings planos (no objetos en srv.registros).
  const flatRows = servers.flatMap(srv => {
    const apps = (srv.aplicaciones ?? []).join(", ");
    const users = Array.isArray(srv.users) ? srv.users : [];
    return users.map(u => {
      const raw = String(u ?? "");
      if (isLinux) {
        // Formato: usuario:descripción:home
        const parts = raw.split(":");
        return {
          servidor:     srv.server_name ?? "",
          tipo:         srv.tipo ?? "linux",
          aplicaciones: apps,
          usuario:      parts[0] ?? "",
          descripcion:  parts[1] ?? "",
          home:         parts[2] ?? "",
          grupos:       "",
          ultimo_login: "",
        };
      }
      // Windows: el string es directamente el usuario/grupo (ej. "ADPRIMA\\Domain Admins")
      return {
        servidor:     srv.server_name ?? "",
        tipo:         srv.tipo ?? "windows",
        aplicaciones: apps,
        usuario:      raw,
      };
    });
  });

  const cols = isLinux
    ? ["servidor","aplicaciones","usuario","descripcion","home","grupos","ultimo_login"]
    : ["servidor","aplicaciones","usuario"];

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }

  const filtered = flatRows.filter(row => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!cols.some(c => String(row[c] ?? "").toLowerCase().includes(q))) return false;
    }
    for (const [col, active] of Object.entries(colFilters)) {
      if (active.size > 0 && !active.has(String(row[col] ?? "—"))) return false;
    }
    return true;
  });

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SZ));
  const pageRows   = sorted.slice((page - 1) * PAGE_SZ, page * PAGE_SZ);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar servidor, usuario…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }} />
          {search && (
            <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕ Limpiar</button>
          )}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(1); }}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count">
            <span className="row-count-num">{sorted.length}</span> de {flatRows.length} registros
            {totalPages > 1 && ` · pág. ${page}/${totalPages}`}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="scroll-x">
        <table className="data-table" style={{ minWidth: "max-content", width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              {cols.map(col => (
                <ThCell key={col} col={col} label={getLabel(col)} isSpecial={false}
                  hasFilter={colFilters[col]?.size > 0}
                  width={
                    col === "servidor"    ? "180px"
                    : col === "grupos"   ? "340px"
                    : col === "descripcion" ? "220px"
                    : col === "ultimo_login" ? "180px"
                    : col === "aplicaciones" ? "140px"
                    : col === "home"     ? "180px"
                    : "160px"
                  }
                  openPanel={openPanel} setOpenPanel={setOpenPanel}
                  sortCol={sortCol} sortDir={sortDir} rows={flatRows}
                  getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                  handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg2)" : "var(--bg)" }}>
                {cols.map(col => (
                  <td key={col} style={{
                    padding: "7px 10px", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                    borderBottom: "1px solid var(--border)",
                    fontFamily: col === "servidor" || col === "usuario" ? "var(--mono)" : "var(--sans)",
                    fontSize: 12.5,
                    color: col === "servidor" ? "var(--accent)" : "var(--text2)",
                    fontWeight: col === "servidor" ? 600 : 400,
                  }}>
                    <span title={String(row[col] ?? "")}>
                      {String(row[col] ?? "") || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
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


// ── Vista de tabla estándar ────────────────────────────────────────────────────
function StandardTableView({ rows, src }) {
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [sortCol,      setSortCol]      = useState(null);
  const [sortDir,      setSortDir]      = useState("asc");
  const [colFilters,   setColFilters]   = useState({});
  const [openPanel,    setOpenPanel]    = useState(null);
  const [columnWidths, setColumnWidths] = useState(() => buildDefaultWidths(src.cols));

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
            onClick={() => exportSheetPlano(rows, src.cols, `priv-${src.id}`)}>
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
                  label={getLabel(col)}
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

// ── Componente principal ───────────────────────────────────────────────────────
// Deriva { rows, collections } de los datos guardados en IDB.
//   array              → { rows, collections:null }
//   { key:[...] } (1)  → { rows:[...], collections:null }
//   { a:[...], b:[...] }→ { rows:primera, collections:{a,b} }  (ej. GDH activos/cesados)
function splitStored(stored, src) {
  if (Array.isArray(stored)) return { rows: stored, collections: null };
  if (!stored || typeof stored !== "object") return { rows: [], collections: null };
  if (typeof src?.dataKey === "string" && Array.isArray(stored[src.dataKey])) {
    return { rows: stored[src.dataKey], collections: null };
  }
  const entries = Object.entries(stored).filter(([, v]) => Array.isArray(v));
  if (entries.length === 0) return { rows: [], collections: null };
  if (entries.length === 1) return { rows: entries[0][1], collections: null };
  return { rows: entries[0][1], collections: Object.fromEntries(entries) };
}

// Etiqueta legible de una colección (gdh_activos → Activos)
function prettyColl(k) {
  return String(k).replace(/^gdh[_\s-]?/i, "").replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase()).trim() || String(k);
}

export default function FuenteDetallePriv({ sourceId }) {
  const router = useRouter();
  const src    = PRIV_BD_SOURCES.find(s => s.id === sourceId);

  const status       = useBDStatus(sourceId);
  const errorMsg     = useBDError(sourceId);
  const cargarFuente = useUIStore(s => s.cargarFuente);
  const setBDStatus  = useUIStore(s => s.setBDStatus);
  const { user }     = useAuthStore();
  const isCertificador = user?.role === "certificador";

  const [rows,       setRows]       = useState([]);
  // Soporte multi-colección (ej. GDH: gdh_activos + gdh_cesados).
  // collections = { nombreColeccion: filas[] } | null  ·  activeColl = clave activa
  const [collections, setCollections] = useState(null);
  const [activeColl,  setActiveColl]  = useState(null);
  const [fechaCorte, setFechaCorte] = useState(null);
  const [hydrated,   setHydrated]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reupload,    setReupload]    = useState(false);
  const [savedCert,  setSavedCert]  = useState(false);
  const ACUERDO_KEY_PRIV = `cert-acuerdo-priv-bd-${sourceId}`;
  const [certConfirm, setCertConfirm] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`cert-acuerdo-priv-bd-${sourceId}`) === "1";
  });

  const srcIdx = PRIV_BD_SOURCES.findIndex(s => s.id === sourceId);
  const nextSrc = PRIV_BD_SOURCES[srcIdx + 1];

  // Hidratar desde IDB
  useEffect(() => {
    if (!src) { setHydrated(true); return; }
    (async () => {
      const stored = await idbGetItem(DATA_KEY(sourceId));
      const storedFc = await idbGetItem(DATA_KEY(sourceId) + "-fc");
      if (stored) {
        const { rows: r, collections: coll } = splitStored(stored, src);
        setRows(r);
        setCollections(coll);
        setActiveColl(coll ? Object.keys(coll)[0] : null);
        // Fix v25.1: si IDB tiene datos pero el store dice idle (nueva sesión), sincronizar
        const currentStatus = useUIStore.getState().bdStatus[sourceId] ?? "idle";
        const anyData = r.length > 0 || (coll && Object.values(coll).some(v => v.length > 0));
        if (anyData && (currentStatus === "idle" || currentStatus === "error")) {
          setBDStatus(sourceId, "ok");
        }
      }
      if (storedFc) setFechaCorte(storedFc);
      setHydrated(true);
    })();
  }, [sourceId, src]);

  // Cuando status vuelve a "ok" leer IDB
  useEffect(() => {
    if (status !== "ok" || !src) return;
    (async () => {
      const stored = await idbGetItem(DATA_KEY(sourceId));
      const storedFc = await idbGetItem(DATA_KEY(sourceId) + "-fc");
      const { rows: r, collections: coll } = splitStored(stored, src);
      setRows(r);
      setCollections(coll);
      setActiveColl(coll ? Object.keys(coll)[0] : null);
      if (storedFc) setFechaCorte(storedFc);
    })();
  }, [status, sourceId, src]);

  if (!src) return (
    <div className="empty-state">
      <span style={{ fontSize: 36 }}>❓</span>
      <p>Fuente no encontrada: <code>{sourceId}</code></p>
    </div>
  );

  const isLoading = status === "loading";
  const uploadCfg = isUploadSource(sourceId) ? getUploadConfig(sourceId) : null;
  const hasData   = rows.length > 0 ||
    (collections && Object.values(collections).some(v => v.length > 0));

  async function handleCargar() {
    await cargarFuente(
      { ...src, endpoint: src.endpoint },
      "priv-data"
    );
  }

  // UX v26: al entrar a una fuente de carga manual sin datos, intentamos el GET
  // automáticamente para que aparezca el panel de subida (en vez de "Cargar
  // información"). Solo una vez, tras hidratar, y si no es certificador.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!hydrated || autoTried.current) return;
    if (uploadCfg && !isCertificador && !hasData && status !== "loading" && status !== "ok") {
      autoTried.current = true;
      handleCargar();
    }
  }, [hydrated, uploadCfg, isCertificador, hasData, status]);

  async function handleRecargar() {
    setShowConfirm(false);
    await idbDelItem(DATA_KEY(sourceId));
    await idbDelItem(DATA_KEY(sourceId) + "-fc");
    setBDStatus(sourceId, "idle");
    setRows([]);
    setCollections(null);
    setActiveColl(null);
    setFechaCorte(null);
    await cargarFuente({ ...src, endpoint: src.endpoint }, "priv-data");
  }

  function handleContinuar() {
    if (nextSrc) {
      router.push(`/admin/privilegiados/recopilacion/base-datos/${nextSrc.id}`);
    } else {
      router.push("/admin/privilegiados/recopilacion/consolidados");
    }
  }

  return (
    <div className="recopilacion-page" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Modal de recarga */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className={`modal${uploadCfg ? " modal-reload" : ""}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            {uploadCfg ? (
              <>
                <div className="modal-title">Actualizar información</div>
                <div className="reload-options">
                  <button className="reload-option"
                    onClick={() => { setShowConfirm(false); handleRecargar(); }}>
                    <span className="reload-option-icon">↺</span>
                    <span className="reload-option-text">
                      <strong>Volver a consultar</strong>
                      <small>Trae lo más reciente sin cambiar el archivo</small>
                    </span>
                  </button>
                  <button className="reload-option"
                    onClick={() => { setShowConfirm(false); setReupload(true); }}>
                    <span className="reload-option-icon">📤</span>
                    <span className="reload-option-text">
                      <strong>Subir archivo nuevo</strong>
                      <small>Reemplaza con un Excel y su fecha de corte</small>
                    </span>
                  </button>
                </div>
                <button className="modal-link-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36 }}>🔄</div>
                <div className="modal-title">¿Recargar datos?</div>
                <div className="modal-message">Se eliminarán los datos actuales y se volverá a consultar la información.</div>
                <div className="modal-actions">
                  <button className="modal-btn modal-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
                  <button className="modal-btn modal-confirm" onClick={handleRecargar}>Sí, recargar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="recopilacion-topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            privilegiados › recopilación › base de datos › <span>{src.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 className="page-title" style={{ margin: 0 }}>{src.icon} {src.label}</h2>
            {fechaCorte && (
              <span className="cutoff-pill-static">
                Corte: <strong>{fmtFechaHora(fechaCorte)}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="topbar-right">
          <ExtraerInfoButton esManual={!!uploadCfg} botEndpoint={getBotEndpoint("privilegiados", sourceId)} reloadFn={handleRecargar} />
          {!hasData && !isLoading && (
            <button className="btn-generate" onClick={handleCargar}>
              {isCertificador ? "Cargar para validar" : "Cargar información"}
            </button>
          )}
          {hasData && !isLoading && (
            <>
              {!isCertificador && (
                <button className="btn-export" onClick={() => setShowConfirm(true)}>↺ Recargar</button>
              )}
              {isCertificador ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {certConfirm && (
                    <span style={{
                      fontSize: 11, fontFamily: "var(--mono)",
                      color: "var(--ok-text)", background: "var(--ok-bg)",
                      border: "1px solid var(--ok-border)",
                      padding: "3px 10px", borderRadius: 999,
                    }}>✓ Conforme</span>
                  )}
                  <button className="btn-generate"
                    onClick={() => {
                      const next = !certConfirm;
                      setCertConfirm(next);
                      if (typeof window !== "undefined") {
                        next ? localStorage.setItem(ACUERDO_KEY_PRIV, "1")
                             : localStorage.removeItem(ACUERDO_KEY_PRIV);
                      }
                      setSavedCert(true); setTimeout(() => setSavedCert(false), 1800);
                    }}
                    style={{ background: certConfirm ? "var(--ok)" : undefined, minWidth: 150 }}>
                    {certConfirm
                      ? (savedCert ? "✓ Guardado" : "↩ Desmarcar acuerdo")
                      : (savedCert ? "✓ Registrado" : "Estoy de acuerdo")}
                  </button>
                </div>
              ) : (
                <button className="btn-generate" onClick={handleContinuar}>
                  {nextSrc ? `Continuar → ${nextSrc.label}` : "Ir a Consolidados →"}
                </button>
              )}
            </>
          )}
          {isLoading && (
            <button className="btn-generate" disabled>
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
              Cargando…
            </button>
          )}
        </div>
      </div>

      {/* Error: si la fuente es de upload, mostramos el panel de carga;
          si no, el error normal con reintentar. */}
      {errorMsg && !uploadCfg && (
        <div className="error-box" style={{ margin: "0 24px 12px" }}>
          {errorMsg} —{" "}
          <button className="btn-export-small" onClick={handleCargar}>Reintentar</button>
        </div>
      )}

      {/* Cuerpo */}
      {!hydrated || isLoading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ marginTop: 12, color: "var(--text3)" }}>
            {isLoading ? "Cargando datos del servidor…" : "Iniciando…"}
          </p>
        </div>
      ) : ((reupload || (!hasData && errorMsg)) && uploadCfg && !isCertificador) ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {reupload && hasData && (
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "10px 24px 0",
            }}>
              <button className="btn-export-small" onClick={() => setReupload(false)}>
                ✕ Cancelar y volver a la tabla
              </button>
            </div>
          )}
          <FuenteUploadPanel config={uploadCfg} onUploaded={() => { setReupload(false); handleRecargar(); }} />
        </div>
      ) : !hasData ? (
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>{src.icon}</span>
          <p style={{ color: "var(--text3)", marginTop: 12 }}>
            Haz clic en «Cargar información» para obtener los datos de <strong>{src.label}</strong>.
          </p>
        </div>
      ) : (src.isSpecial === "server-linux" || src.isSpecial === "server-windows") ? (
        <ServerView rows={rows} tipo={src.isSpecial} />
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {collections && Object.keys(collections).length > 1 && (
            <div className="scenario-tabs-bar" style={{
              borderBottom: "1px solid var(--border)", padding: "0 12px",
              display: "flex", gap: 4, background: "var(--bg3)", flexShrink: 0,
            }}>
              {Object.keys(collections).map(k => (
                <button key={k}
                  className={`scenario-tab ${k === activeColl ? "scenario-tab-active" : ""}`}
                  onClick={() => { setActiveColl(k); setRows(collections[k]); }}>
                  {prettyColl(k)}
                  <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                    ({collections[k].length})
                  </span>
                </button>
              ))}
            </div>
          )}
          <StandardTableView key={activeColl || "single"} rows={rows} src={src} />
        </div>
      )}
    </div>
  );
}
