"use client";

/**
 * FuenteDetalle
 *
 * Componente único para TODAS las fuentes de la recopilación BD.
 * Absorbe FuenteDetalleEntraID.jsx (eliminado). Entra ID ahora usa
 * este mismo componente con sourceId="entra-id".
 *
 * Features consolidados:
 * - Resize de columnas drag-to-drop + persistido en localStorage (de )
 * - Paginación (100 registros/página, de FuenteDetalleEntraID)
 * - Búsqueda rápida inline (de FuenteDetalleEntraID)
 * - Modal de confirmación en Recargar (de FuenteDetalleEntraID)
 * - Parser JSON robusto: findFechaCorte recursivo + resolveCollectionRows (de )
 * - fecha_corte mostrada como pill en topbar
 * - Chips de grupos para fuentes con hasGroups: true
 * - Badges semánticos para isActivo y booleanos
 * - Fechas formateadas DD/MM/YYYY con ícono
 * - Banner de estadísticas rápidas
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BD_SOURCES } from "@/lib/mock/bdSources";
import { PERFILES_BD_SOURCES } from "@/lib/mock/perfilesBDSources";
import { useBDStatus, useBDError, useUIStore, useBDFechasCorte } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import ExtraerInfoButton from "@/components/shared/ExtraerInfoButton";
import { getBotEndpoint } from "@/lib/constants/extraccionEndpoints";
import { idbGetItem, idbSetItem, idbDelItem } from "@/lib/storage";
import { exportSheetPlano } from "@/lib/utils/excel";
import { ThCell } from "@/components/shared/DataTableHeader";
import { getLabel } from "@/lib/utils/fieldLabels";
import { findFechaCorte, resolveCollectionRows } from "@/lib/utils/payload";
import FuenteUploadPanel from "@/components/admin/shared/FuenteUploadPanel";
import { isUploadSource, getUploadConfig } from "@/lib/constants/uploadSources";

// ── Fix v21.1: hidratar status desde localStorage al montar directamente
// en esta ruta (sin pasar por BDDashboard). El store lleva la bandera
// bdStatusHydrated para no re-hidratar más de una vez por sesión.
function useHydrateBDStatus() {
  const hydrate = useUIStore(s => s.hydrateBDStatus);
  useEffect(() => { hydrate(); }, [hydrate]);
}

const DATA_KEY  = (id, prefix = "bd-data") => `${prefix}-${id}`;
const WIDTH_KEY = (id) => `bd-widths-${id}`;
const PAGE_SIZE = 100;

// ── Helpers de ancho por defecto ──────────────────────────────────────────────

function buildDefaultWidths(cols) {
  return Object.fromEntries(
    cols.map((col) => [
      col,
      col === "grupos"      ? 320
      : col === "id"        ? 280
      : col === "upn"       ? 240
      : col === "mail"      ? 220
      : col === "display_name" || col === "full_name" || col === "nombre" ? 200
      : col === "u_organizativa" || col === "funcion" ? 190
      : col.length >= 18    ? 220
      : col.length >= 12    ? 180
      : 150,
    ])
  );
}

// ── Parsers de respuesta backend ──────────────────────────────────────────────

// ── Formateo de fechas ────────────────────────────────────────────────────────

function fmtDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  // Acepta YYYY-MM-DD o YYYY-MM-DDTHH:MM[:SS] o YYYY-MM-DD HH:MM[:SS]
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const yyyy = m[1], mm = m[2], dd = m[3];
    const hh = m[4], mi = m[5], ss = m[6];
    if (hh !== undefined) {
      const sec = ss ?? '00';
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${sec}`;
    }
    return `${dd}/${mm}/${yyyy}`;
  }
  // Fallback: quitar Z, reemplazar T por espacio y devolver tal cual
  return s.replace("T", " ").replace("Z", "");
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ActiveBadge({ val }) {
  const s = String(val).trim().toLowerCase();
  const on = val === true || val === 1
    || s === "1" || s === "true" || s === "t"
    || s === "sí" || s === "si" || s === "yes" || s === "y"
    || s === "activo";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: on ? "var(--ok-bg)" : "var(--inc-bg)",
      color:      on ? "var(--ok-text)" : "var(--inc-text)",
      border:     `1px solid ${on ? "var(--ok-border)" : "var(--inc-border)"}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
        background: on ? "var(--ok)" : "var(--inc)" }} />
      {on ? "Activo" : "Inactivo"}
    </span>
  );
}

function BoolBadge({ val }) {
  const on = val === true || val === 1 || val === "1" || val === "True";
  return (
    <span className={`badge ${on ? "badge-ok" : "badge-inc"}`} style={{ fontSize: 11 }}>
      {on ? "Sí" : "No"}
    </span>
  );
}

function GruposCell({ grupos }) {
  const [expanded, setExpanded] = useState(false);
  if (!Array.isArray(grupos) || grupos.length === 0)
    return <span style={{ color: "var(--text4)", fontSize: 12 }}>—</span>;

  const items   = grupos.filter(g => g != null && String(g).trim() !== "");
  const preview = expanded ? items : items.slice(0, 3);
  const rem     = items.length - 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)" }}>
        {items.length} {items.length === 1 ? "grupo" : "grupos"}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {preview.map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 8px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--bg2)",
            color: "var(--text2)", fontSize: 11, lineHeight: 1.2,
            whiteSpace: "normal", wordBreak: "break-word",
          }}>
            {item}
          </span>
        ))}
        {items.length > 3 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 8px", borderRadius: 999,
            background: "var(--accent-bg)", color: "var(--accent)",
            border: "1px solid var(--accent-bg2)", fontSize: 11, fontWeight: 700,
            cursor: "pointer",
          }}>
            {expanded ? "▲ menos" : `+${rem} más`}
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="modal-btn modal-cancel" onClick={onCancel}>Cancelar</button>
          <button className="modal-btn modal-confirm" onClick={onConfirm}>Sí, continuar</button>
        </div>
      </div>
    </div>
  );
}

function StatsBanner({ rows, src }) {
  const stats = useMemo(() => {
    const flat  = Array.isArray(rows) ? rows : Object.values(rows).flat();
    const total = flat.length;
    const hasBool = flat.some(r => r.isActivo !== undefined);
    const activos   = hasBool ? flat.filter(r => r.isActivo === true || r.isActivo === 1).length : null;
    const inactivos = hasBool ? total - activos : null;
    const hasGroups = src?.cols?.includes("grupos");
    const conGrupos   = hasGroups ? flat.filter(r => Array.isArray(r.grupos) && r.grupos.length > 0).length : null;
    const totalGroups = hasGroups ? flat.reduce((a, r) => a + (Array.isArray(r.grupos) ? r.grupos.length : 0), 0) : null;
    return { total, activos, inactivos, conGrupos, totalGroups };
  }, [rows, src]);

  return (
    <div style={{
      padding: "9px 20px", background: "var(--ok-bg)",
      borderBottom: "1px solid var(--ok-border)",
      display: "flex", alignItems: "center", gap: 20, flexShrink: 0, flexWrap: "wrap",
    }}>
      <StatNum label="Total" value={stats.total} color="var(--accent)" />
      {stats.activos   != null && <StatNum label="Activos"   value={stats.activos}   color="var(--ok)" />}
      {stats.inactivos != null && <StatNum label="Inactivos" value={stats.inactivos} color="var(--inc)" />}
      {stats.conGrupos != null && <StatNum label="Con grupos" value={stats.conGrupos} color="var(--accent2)" />}
      {stats.totalGroups != null && <StatNum label="Asignaciones" value={stats.totalGroups} color="var(--sust)" />}
      <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", marginLeft: "auto" }}>
        · {src?.cols?.length ?? 0} columnas
      </span>
    </div>
  );
}

function StatNum({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color, fontFamily: "var(--mono)", lineHeight: 1 }}>
        {value?.toLocaleString("es-PE") ?? 0}
      </span>
      <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FuenteDetalle({
  sourceId,
  sources    = BD_SOURCES,
  routeBase  = "/admin/usuarios/recopilacion/base-datos",
  consolidadosRoute = "/admin/usuarios/recopilacion/consolidados",
  dataKeyPrefix     = "bd-data",
  breadcrumbSection = "usuarios / recopilación / base de datos",
}) {
  const router   = useRouter();
  const src      = sources.find(s => s.id === sourceId);
  // Este FuenteDetalle lo comparten Usuarios y Perfiles; el módulo se infiere de
  // la ruta para resolver el endpoint de extracción correcto por sourceId.
  const moduloExtrac = routeBase.includes("/perfiles/")
    ? "perfiles"
    : routeBase.includes("/privilegiados/")
      ? "privilegiados"
      : "usuarios";
  const resizeRef = useRef(null);
  const { user } = useAuthStore();
  const isCertificador = user?.role === "certificador";

  // Hidrata el status desde localStorage cuando se entra directo a esta ruta
  // (sin pasar por BDDashboard). Sin esto, status siempre es 'idle' al refrescar.
  useHydrateBDStatus();

  const status       = useBDStatus(sourceId);
  const errorBackend  = useBDError(sourceId);
  const cargarFuente  = useUIStore(s => s.cargarFuente);
  const setBDStatus   = useUIStore(s => s.setBDStatus);

  const [rows,         setRows]         = useState(null);
  const [fechaCorte,   setFechaCorte]   = useState(null);
  const [activeTab,    setActiveTab]    = useState("");
  const [saved,        setSaved]        = useState(false);
  // Persistencia del acuerdo del certificador — se guarda en localStorage
  const ACUERDO_KEY = `cert-acuerdo-bd-${sourceId}`;
  const [certConfirm, setCertConfirm] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ACUERDO_KEY) === "1";
  });
  const [hydrated,     setHydrated]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [reupload,     setReupload]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [columnWidths, setColumnWidths] = useState(() => src ? buildDefaultWidths(src.cols) : {});
  const [sortCol,      setSortCol]      = useState(null);
  const [sortDir,      setSortDir]      = useState("asc");
  const [colFilters,   setColFilters]   = useState({});
  const [openPanel,    setOpenPanel]    = useState(null);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir)  { setSortCol(col); setSortDir(dir); setPage(1); }

  // Hidratar desde IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored   = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix));
      const storedFc = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix) + "-fc");
      if (!cancelled && stored) {
        const isArr = Array.isArray(stored);
        const isEmpty = isArr ? stored.length === 0 : Object.keys(stored).length === 0;
        if (!isEmpty) {
          setRows(stored);
          if (!isArr && typeof stored === "object") {
            const keys = Object.keys(stored);
            if (keys.length > 0) setActiveTab(keys[0]);
          }
          // Bug fix v25.1: si IDB tiene datos pero el store dice idle (nueva sesión),
          // sincronizar el status para que el UI muestre los datos y no el empty state.
          const currentStatus = useUIStore.getState().bdStatus[sourceId] ?? "idle";
          if (currentStatus === "idle" || currentStatus === "error") {
            setBDStatus(sourceId, "ok");
          }
        }
      }
      if (!cancelled && storedFc) setFechaCorte(storedFc);
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [sourceId, dataKeyPrefix]);

  // Re-hidratar desde IDB cuando status cambia a 'ok' desde fuera del componente.
  // Caso: el usuario hace "Cargar a Todos" en BDDashboard, luego navega a FuenteDetalle.
  // El useEffect de hidratación inicial ya corrió (IDB estaba vacío), el evento
  // 'bd-cargadas' ya se disparó antes de montar este componente → nada se escuchó.
  // Este efecto detecta el cambio de status→'ok' y re-lee IDB.
  useEffect(() => {
    if (status !== 'ok') return;
    let cancelled = false;
    (async () => {
      const stored   = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix));
      const storedFc = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix) + '-fc');
      if (!cancelled && stored) {
        setRows(stored);
        if (!Array.isArray(stored) && typeof stored === 'object') {
          const keys = Object.keys(stored);
          if (keys.length > 0) setActiveTab(k => k || keys[0]);
        }
      }
      if (!cancelled && storedFc) setFechaCorte(storedFc);
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [status, sourceId, dataKeyPrefix]);

  // Si IDB no tiene la fecha de corte (ej. la carga previa la dejó solo en
  // uiStore.localStorage), usar el valor reactivo de uiStore.bdFechaCorte.
  const bdFechas = useBDFechasCorte();
  useEffect(() => {
    const fcFromStore = bdFechas?.[sourceId];
    if (fcFromStore && fcFromStore !== fechaCorte) setFechaCorte(fcFromStore);
  }, [bdFechas, sourceId]);

  // Re-leer IDB cuando cargarTodas termina (evento 'bd-cargadas').
  // Necesario cuando el usuario navega a FuenteDetalle mientras una carga
  // masiva está en curso: el useEffect de hidratación ya corrió antes de que
  // la fc quedara escrita en IDB.
  useEffect(() => {
    let cancelled = false;
    async function onBDCargadas() {
      const storedFc = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix) + "-fc");
      if (!cancelled && storedFc) setFechaCorte(storedFc);
      // También refrescar rows si se cargaron en background
      const stored = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix));
      if (!cancelled && stored) {
        setRows(stored);
        if (!Array.isArray(stored) && typeof stored === "object") {
          const keys = Object.keys(stored);
          if (keys.length > 0) setActiveTab(k => k || keys[0]);
        }
      }
    }
    window.addEventListener("bd-cargadas", onBDCargadas);
    return () => { cancelled = true; window.removeEventListener("bd-cargadas", onBDCargadas); };
  }, [sourceId, dataKeyPrefix]);

  // Cargar anchos de columna persistidos
  useEffect(() => {
    if (!src) return;
    try {
      const stored = window.localStorage.getItem(WIDTH_KEY(sourceId));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setColumnWidths({ ...buildDefaultWidths(src.cols), ...parsed });
          return;
        }
      }
    } catch { /* noop */ }
    setColumnWidths(buildDefaultWidths(src.cols));
  }, [sourceId, src]);

  // Persistir anchos al cambiar
  useEffect(() => {
    if (!src || !hydrated) return;
    try { window.localStorage.setItem(WIDTH_KEY(sourceId), JSON.stringify(columnWidths)); }
    catch { /* noop */ }
  }, [columnWidths, hydrated, sourceId, src]);

  const srcIdx  = sources.findIndex(s => s.id === sourceId);
  const nextSrc = sources[srcIdx + 1];
  const isLast  = !nextSrc;

  if (!src) return <div className="empty-state"><p>Fuente no encontrada.</p></div>;

  // ── Fetch — delega al store para que sobreviva la navegación ────────────
  async function handleCargar() {
    setPage(1);
    await cargarFuente(src, dataKeyPrefix);
    // Después del fetch el store ya actualizó IDB y bdStatus.
    // El useEffect de hidratación detecta el cambio de status y re-lee IDB.
    const stored = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix));
    if (stored) {
      setRows(stored);
      if (!Array.isArray(stored) && typeof stored === "object") {
        const keys = Object.keys(stored);
        if (keys.length > 0) setActiveTab(keys[0]);
      }
      const storedFc = await idbGetItem(DATA_KEY(sourceId, dataKeyPrefix) + "-fc");
      if (storedFc) setFechaCorte(storedFc);
    }
  }

  // UX v26: al entrar a una fuente de carga manual sin datos, intentar el GET
  // automáticamente para que aparezca el panel de subida.
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (autoTriedRef.current) return;
    const _isUpload = isUploadSource(sourceId);
    const _hasData = rows && (Array.isArray(rows) ? rows.length > 0 : Object.keys(rows).length > 0);
    if (_isUpload && !isCertificador && !_hasData && status !== "loading" && status !== "ok") {
      autoTriedRef.current = true;
      handleCargar();
    }
  }, [sourceId, isCertificador, rows, status]);

  async function handleReset() {
    setShowConfirm(false);
    setRows(null);
    setActiveTab("");
    setFechaCorte(null);
    setSaved(false);
    setSearch("");
    setPage(1);
    await idbDelItem(DATA_KEY(sourceId, dataKeyPrefix));
    await idbDelItem(DATA_KEY(sourceId, dataKeyPrefix) + "-fc");
    await handleCargar();
  }

  function handleGuardar() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push(nextSrc
        ? `${routeBase}/${nextSrc.id}`
        : consolidadosRoute);
    }, 600);
  }

  function handleExportar() {
    if (!rows) return;
    const isObj = !Array.isArray(rows) && typeof rows === "object";
    if (isObj && Object.keys(rows).length === 0) return;
    if (!isObj && rows.length === 0) return;
    exportSheetPlano(rows, src.cols, `bd-${src.id}`);
  }

  // ── Resize de columnas ────────────────────────────────────────────────────
  const startResize = useCallback((col, event) => {
    event.preventDefault();
    event.stopPropagation();
    const state = { col, startX: event.clientX, startWidth: columnWidths[col] ?? 150 };
    resizeRef.current = state;

    function onMove(e) {
      const cur = resizeRef.current;
      if (!cur) return;
      const nextW = Math.max(80, cur.startWidth + (e.clientX - cur.startX));
      setColumnWidths(prev => ({ ...prev, [cur.col]: nextW }));
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [columnWidths]);

  // ── Render de celdas ──────────────────────────────────────────────────────
  function renderCell(val, col) {
    if (col === "isActivo")        return <ActiveBadge val={val} />;
    if (col === "account_enabled") return <BoolBadge val={val} />;
    if (col === "exist_entra" || col === "esProveedor") return <BoolBadge val={val} />;
    if (col === "grupos")          return <GruposCell grupos={val} />;
    if (src.dateCols?.includes(col)) {
      const f = fmtDate(val);
      return f
        ? <span style={{ fontFamily: "var(--mono)", fontSize: 12, whiteSpace: "nowrap" }}>{f}</span>
        : <span style={{ color: "var(--text4)", fontSize: 12 }}>—</span>;
    }
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (val === null || val === undefined || val === "") return <span style={{ color: "var(--text4)" }}>—</span>;
    return String(val);
  }

  // ── Datos visibles según tab activa + búsqueda + paginación ──────────────
  const flatRows = useMemo(() => {
    if (!rows) return [];
    return Array.isArray(rows) ? rows : (rows[activeTab] || []);
  }, [rows, activeTab]);

  const filtered = useMemo(() => {
    let rows2 = flatRows;
    // Búsqueda global
    if (search.trim()) {
      const q = search.toLowerCase();
      rows2 = rows2.filter(row =>
        src.cols.some(col => {
          const v = row[col];
          if (Array.isArray(v)) return v.some(s => String(s).toLowerCase().includes(q));
          return String(v ?? "").toLowerCase().includes(q);
        })
      );
    }
    // Filtros por columna (Excel-style)
    for (const [col, active] of Object.entries(colFilters)) {
      if (active.size > 0) {
        rows2 = rows2.filter(r => {
          const v = r[col];
          // Normalizar booleanos igual que el ColPanel
          let normalized;
          if (v === true  || v === 1 || v === "1" || v === "True"  || v === "true"
              || v === "Si" || v === "si" || v === "Sí" || v === "sí"
              || v === "YES" || v === "yes") normalized = "Activo";
          else if (v === false || v === 0 || v === "0" || v === "False" || v === "false"
              || v === "No" || v === "no" || v === "NO") normalized = "Inactivo";
          else normalized = String(v ?? "—");
          return active.has(normalized);
        });
      }
    }
    return rows2;
  }, [flatRows, search, src, colFilters]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? "", bv = b[sortCol] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formattedFechaCorte = useMemo(() => {
    if (!fechaCorte) return null;
    const d = new Date(fechaCorte);
    if (!isNaN(d.getTime()) && String(fechaCorte).includes("T")) {
      return d.toLocaleString("es-PE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
      }).replace(",", "");
    }
    return fmtDate(fechaCorte);
  }, [fechaCorte]);
  const hasData = rows && (Array.isArray(rows) ? rows.length > 0 : Object.keys(rows).length > 0);
  const uploadCfg = isUploadSource(sourceId) ? getUploadConfig(sourceId) : null;
  const isMultiTab = rows && !Array.isArray(rows) && typeof rows === "object";

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Modal confirmación recarga */}
      {showConfirm && (
        uploadCfg ? (
          <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
            <div className="modal modal-reload" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
              <div className="modal-title">Actualizar información</div>
              <div className="reload-options">
                <button className="reload-option"
                  onClick={() => { setShowConfirm(false); handleReset(); }}>
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
            </div>
          </div>
        ) : (
          <ConfirmModal
            title="¿Recargar datos?"
            message={`Si recargas perderás la información actual de ${src.label}. Esta acción no se puede deshacer.`}
            onConfirm={handleReset}
            onCancel={() => setShowConfirm(false)}
          />
        )
      )}

      {/* Topbar */}
      <div className="topbar" style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div className="topbar-left">
          <div className="breadcrumb">
            {breadcrumbSection} / <span>{src.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 className="page-title" style={{ fontSize: 17, margin: 0 }}>
              {src.icon} {src.label}
            </h2>
            {formattedFechaCorte && (
              <span className="cutoff-pill-static" title="Fecha de corte del backend">
                Corte: <strong>{formattedFechaCorte}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="topbar-right" style={{ gap: 8 }}>
          <ExtraerInfoButton esManual={!!uploadCfg} botEndpoint={getBotEndpoint(moduloExtrac, sourceId)} reloadFn={handleCargar} />
          {status === "ok" && (
            <>
              {/*
                Botón "Recargar":
                  - Admin/usuario: siempre disponible cuando hay datos cargados.
                  - Certificador: NO se muestra. Para el certificador la fuente
                    queda inmutable una vez cargada — no debe re-disparar fetches
                    contra el backend desde la vista de validación.
              */}
              {!isCertificador && (
                <button className="btn-export" onClick={() => setShowConfirm(true)}>↺ Recargar</button>
              )}
              <button className="btn-export" onClick={handleExportar}
                disabled={!hasData}>
                ↓ Exportar
              </button>
            </>
          )}
          {status === "idle" && (
            <button className="btn-generate" onClick={handleCargar}>
              ↓ {isCertificador ? "Cargar para validar" : "Cargar información"}
            </button>
          )}
          {status === "loading" && (
            <button className="btn-generate" disabled>
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
              Cargando…
            </button>
          )}
          {status === "ok" && !isCertificador && (
            <button className="btn-generate" onClick={handleGuardar}
              style={{ background: saved ? "var(--ok)" : undefined }}>
              {saved ? "✓ Guardado"
                : isLast ? "Guardar y pasar a Consolidados →"
                : `Guardar y continuar → ${nextSrc?.label}`}
            </button>
          )}
          {status === "ok" && isCertificador && (
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
                    next ? localStorage.setItem(ACUERDO_KEY, "1")
                         : localStorage.removeItem(ACUERDO_KEY);
                  }
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1800);
                }}
                style={{
                  background: certConfirm ? "var(--ok)" : undefined,
                  minWidth: 150,
                }}>
                {certConfirm
                  ? (saved ? "✓ Guardado" : "Desmarcar acuerdo")
                  : (saved ? "✓ Registrado" : "Estoy de acuerdo")}
              </button>
            </div>
          )}
        </div>
      </div>

      {status === "loading" && <div className="loading-bar"><div className="loading-bar-fill" /></div>}

      {/* Error de backend: en fuentes de upload mostramos el panel de carga */}
      {errorBackend && uploadCfg && !isCertificador && !reupload && (
        <div style={{ padding: "0 4px" }}>
          <FuenteUploadPanel config={uploadCfg} onUploaded={handleCargar} />
        </div>
      )}

      {/* Re-subida manual (desde "Subir archivo nuevo" del modal) */}
      {reupload && uploadCfg && !isCertificador && (
        <div style={{ padding: "0 4px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 20px 0" }}>
            <button className="btn-export-small" onClick={() => setReupload(false)}>
              Cancelar y volver a la tabla
            </button>
          </div>
          <FuenteUploadPanel config={uploadCfg} onUploaded={() => { setReupload(false); handleReset(); }} />
        </div>
      )}

      {/* Error */}
      {errorBackend && !uploadCfg && (
        <div style={{
          margin: "16px 20px", padding: "12px 16px",
          background: "var(--inc-bg)", border: "1px solid var(--inc-border)",
          borderRadius: "var(--radius)", color: "var(--inc-text)", fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>❌</span>
          <span style={{ flex: 1 }}>{errorBackend}</span>
          <button onClick={() => useUIStore.getState().setBDError(sourceId, null)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--inc-text)", fontWeight: 700, fontSize: 14,
          }}>✕</button>
        </div>
      )}

      {/* Empty state idle */}
      {status === "idle" && !errorBackend && (
        <div className="empty-state">
          <span className="empty-icon" style={{ fontSize: 40 }}>{src.icon}</span>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{src.label}</p>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>
            Haz clic en «Cargar información» para obtener los datos de esta fuente.
          </p>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center",
            maxWidth: 500, marginTop: 10,
          }}>
            {src.cols.map(c => (
              <span key={c} className="source-col-pill"
                style={c === "grupos" ? { color: "var(--sust-text)", background: "var(--sust-bg)" }
                  : src.dateCols?.includes(c) ? { color: "var(--accent)", background: "var(--accent-bg)" }
                  : {}}>
                {c === "grupos" ? "grupos" : c}
                {src.dateCols?.includes(c) && ""}
              </span>
            ))}
          </div>
        </div>
      )}

      
      {/* v21.2 — Skeleton mientras status=ok pero IDB todavía no terminó de leer. */}
      {status === "ok" && !hydrated && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "20px 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "var(--bg3)",
            borderRadius: "var(--radius)", border: "1px solid var(--border)",
          }}>
            <span className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--text2)" }}>
              Leyendo datos almacenados…
            </span>
          </div>
          {[80, 100, 90, 85, 95, 70].map((w, i) => (
            <div key={i} style={{
              height: 34, borderRadius: "var(--radius)",
              background: i % 2 === 0 ? "var(--bg3)" : "var(--bg4)",
              opacity: 1 - i * 0.08,
            }} />
          ))}
        </div>
      )}

      {/* Tabla */}
      {status === "ok" && hydrated && hasData && !reupload && (
        <>
          {/* Banner estadísticas */}
          <StatsBanner rows={rows} src={src} />

          {/* Tabs multi-fuente (si aplica) */}
          {isMultiTab && (
            <div style={{
              display: "flex", gap: 6, padding: "8px 20px",
              borderBottom: "1px solid var(--border)", background: "var(--bg2)",
              overflowX: "auto", flexShrink: 0,
            }}>
              {Object.keys(rows).map(key => (
                <button key={key} onClick={() => { setActiveTab(key); setPage(1); setSearch(""); }}
                  style={{
                    padding: "5px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    border: activeTab === key ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: activeTab === key ? "var(--accent-bg)" : "transparent",
                    color: activeTab === key ? "var(--accent)" : "var(--text2)",
                  }}>
                  {key} ({rows[key].length})
                </button>
              ))}
            </div>
          )}

          {/* Toolbar búsqueda + paginación info */}
          <div className="table-toolbar" style={{ flexShrink: 0 }}>
            <div className="toolbar-left" style={{ gap: 8 }}>
              <input
                className="search-input"
                placeholder={`Buscar en ${src.label}…`}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 280 }}
              />
              {search && (
                <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>
                  Limpiar
                </button>
              )}
              {Object.values(colFilters).some(s => s.size > 0) && (
                <button className="btn-export-small" style={{ color: "var(--accent)" }}
                  onClick={() => { setColFilters({}); setPage(1); }}>
                  Quitar filtros
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <span className="row-count">
                <span className="row-count-num">{sorted.length}</span> de {flatRows.length}
                {totalPages > 1 && ` · pág. ${page}/${totalPages}`}
              </span>
            </div>
          </div>

          {/* Tabla scrollable */}
          <div style={{ flex: 1, overflow: "auto", padding: "0 24px 16px 0" }}>
            <table className="data-table" style={{ minWidth: "max-content", width: "100%", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 48 }} />
                {src.cols.map(col => (
                  <col key={col} style={{ width: `${columnWidths[col] ?? 150}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={{
                    padding: "8px 10px", textAlign: "center", fontSize: 10,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "var(--text4)", background: "var(--bg2)",
                    borderBottom: "2px solid var(--border)",
                    position: "sticky", top: 0, zIndex: 1,
                  }}>#</th>
                  {src.cols.map(col => (
                    <ThCell
                      key={col}
                      col={col}
                      label={getLabel(col)}
                      isSpecial={false}
                      hasFilter={colFilters[col]?.size > 0}
                      width={`${columnWidths[col] ?? 150}px`}
                      openPanel={openPanel}
                      setOpenPanel={setOpenPanel}
                      sortCol={sortCol}
                      sortDir={sortDir}
                      rows={flatRows}
                      getColFilterSet={getColFilterSet}
                      setColFilterSet={setColFilterSet}
                      handleSort={handleSort}
                      onResizeStart={(e, c) => startResize(c, e)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => {
                  const globalIdx = (page - 1) * PAGE_SIZE + ri + 1;
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? "row-even" : "row-odd"}>
                      <td style={{
                        padding: "6px 10px", textAlign: "center",
                        fontSize: 11, color: "var(--text4)", fontFamily: "var(--mono)",
                        borderRight: "1px solid var(--border)",
                      }}>
                        {globalIdx}
                      </td>
                      {src.cols.map(col => {
                        const val = row[col];
                        const isArr = Array.isArray(val);
                        return (
                          <td key={col} style={{
                            padding: "7px 14px",
                            verticalAlign: isArr ? "top" : "middle",
                            overflow: "hidden",
                          }}>
                            <div className="cell-text" style={isArr
                              ? { whiteSpace: "normal", overflowWrap: "anywhere" }
                              : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {renderCell(val, col)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={src.cols.length + 1} style={{
                      textAlign: "center", padding: "40px 20px",
                      color: "var(--text3)", fontSize: 13,
                    }}>
                      {search ? `Sin resultados para «${search}»` : "Sin datos."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-left">
                <span className="page-info">
                  Página {page} de {totalPages}
                  {" "}· mostrando {pageRows.length} de {filtered.length} registros
                </span>
              </div>
              <div className="pagination-right">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 6, page - 3)) + i;
                  return p <= totalPages ? (
                    <button key={p}
                      className={`page-size-btn ${p === page ? "ps-active" : ""}`}
                      onClick={() => setPage(p)}>{p}</button>
                  ) : null;
                })}
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ok pero sin filas */}
      {status === "ok" && hydrated && !hasData && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Los datos se cargaron pero la fuente no devolvió registros.</p>
        </div>
      )}
    </div>
  );
}
