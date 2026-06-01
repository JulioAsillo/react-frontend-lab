"use client";

/**
 * ConsolidadosPrivilegiadosPage — v24.2
 *
 * 4 tabs + Clasificación de Cuenta (componente compartido):
 *   1. Clasificación de Cuenta  → ClasificacionTab (compartido)
 *   2. DBA    → CRUD /consolidado/dba    (POST para crear y editar — backend detecta dup)
 *   3. Linux  → CRUD /consolidado/linux  (POST crear, PUT editar)
 *   4. Windows→ CRUD /consolidado/windows (POST crear, PUT editar)
 */

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClasificacionTab from "@/components/shared/ClasificacionTab";
import { ThCell } from "@/components/shared/DataTableHeader";
import { idbGetItem, idbSetItem } from "@/lib/storage";
import { getLabel } from "@/lib/utils/fieldLabels";

const API_BASE    = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE   = 20;

// ── XLSX helpers ──────────────────────────────────────────────────────────────
let _XLSX = null;
async function getXLSX() {
  if (_XLSX) return _XLSX;
  if (typeof window !== "undefined" && window.XLSX) { _XLSX = window.XLSX; return _XLSX; }
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _XLSX = window.XLSX; return _XLSX;
}
async function downloadTemplateXLSX(cols, filename) {
  const XLSX = await getXLSX();
  const ws = XLSX.utils.aoa_to_sheet([cols]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `template_${filename}.xlsx`);
}
async function parseXLSX(file) {
  const XLSX = await getXLSX();
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}
async function exportXLSX(rows, cols, filename) {
  if (!rows.length) return;
  const XLSX = await getXLSX();
  const ws = XLSX.utils.json_to_sheet(rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? ""]))));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Toast({ msg }) { return <div className="save-toast">{msg}</div>; }

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 36 }}>🗑️</div>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="modal-btn modal-cancel" onClick={onCancel}>Cancelar</button>
          <button className="modal-btn modal-confirm" onClick={onConfirm}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function EditableCell({ value, type = "text", onCommit, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");
  const ref = useRef(null);
  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  function commit() {
    setEditing(false);
    const v = typeof draft === "string" ? draft.trim() : draft;
    if (v !== (value ?? "")) onCommit(v);
  }
  function onKey(e) {
    if (e.key === "Enter" && type !== "textarea") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
  }
  const base = {
    background: "var(--bg)", border: "1px solid var(--accent2)", color: "var(--text)",
    borderRadius: 5, padding: "3px 7px", fontSize: 12.5, fontFamily: "var(--sans)",
    outline: "none", width: "100%", boxSizing: "border-box", ...style,
  };
  if (!editing) return (
    <div onDoubleClick={() => { setDraft(value ?? ""); setEditing(true); }}
      title="Doble clic para editar"
      style={{ cursor: "default", minHeight: 24, display: "flex", alignItems: "center",
        gap: 6, userSelect: "none" }}>
      <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--text2)" }}>{value || "—"}</span>
      <span style={{ fontSize: 9, color: "var(--text4)", opacity: 0.6 }}>✏</span>
    </div>
  );
  if (type === "textarea") return (
    <textarea ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={onKey} rows={3}
      style={{ ...base, resize: "vertical", lineHeight: 1.5, minHeight: 60 }} />
  );
  return (
    <input ref={ref} type="text" value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={onKey}
      style={{ ...base, height: 30 }} />
  );
}

// ── Fábrica de tab CRUD genérico ─────────────────────────────────────────────
// Todos los tabs (DBA, Linux, Windows) tienen la misma estructura.
// La diferencia son los campos y si edit es POST o PUT.
function CrudTab({ config }) {
  const {
    apiUrl, idbKey, cols, requiredCols, newDefaults,
    editMethod,  // "post" | "put"
    templateCols, exportFilename,
  } = config;

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [toast,     setToast]     = useState("");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [newVals,   setNewVals]   = useState(newDefaults);
  const [addError,  setAddError]  = useState("");
  const [adding,    setAdding]    = useState(false);
  const [sortCol,   setSortCol]   = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");
  const [colFilters,setColFilters]= useState({});
  const [openPanel, setOpenPanel] = useState(null);
  const fileRef = useRef(null);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2800); }

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(apiUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = Array.isArray(d) ? d : (d.rows || d.data || []);
      setRows(data);
      await idbSetItem(idbKey, data);
    } catch (e) {
      const cached = await idbGetItem(idbKey);
      if (Array.isArray(cached) && cached.length) { setRows(cached); showToast("Sin conexión — mostrando caché"); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, [apiUrl, idbKey]);

  useEffect(() => {
    (async () => {
      const cached = await idbGetItem(idbKey);
      if (Array.isArray(cached) && cached.length) { setRows(cached); setLoading(false); }
      else await load();
    })();
  }, [load, idbKey]);

  async function crear() {
    for (const col of requiredCols) {
      if (!String(newVals[col] ?? "").trim()) { setAddError(`«${col}» es obligatorio.`); return; }
    }
    setAdding(true); setAddError("");
    try {
      const body = Object.fromEntries(cols.map(c => [c, String(newVals[c] ?? "").trim()]));
      const res = await fetch(apiUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewVals(newDefaults);
      await load();
      showToast("✅ Registro creado correctamente");
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function patchCell(id, field, value) {
    const prev    = rows;
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(updated);
    await idbSetItem(idbKey, updated);
    try {
      const row  = updated.find(r => r.id === id);
      const body = Object.fromEntries(cols.map(c => [c, row[c] ?? ""]));
      const url  = editMethod === "put" ? `${apiUrl}/${id}` : apiUrl;
      const method = editMethod === "put" ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast("✅ Cambio guardado");
    } catch {
      setRows(prev);
      await idbSetItem(idbKey, prev);
      showToast("❌ Error al guardar — cambio revertido");
    }
  }

  async function eliminar(id) {
    try {
      const res = await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = rows.filter(r => r.id !== id);
      setRows(updated);
      await idbSetItem(idbKey, updated);
      showToast("✅ Registro eliminado");
    } catch (e) { showToast("❌ Error al eliminar: " + e.message); }
    finally { setDelTarget(null); }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    let parsed;
    try { parsed = await parseXLSX(file); } catch { showToast("❌ Error al leer el archivo"); return; }
    let ok = 0;
    for (const row of parsed) {
      const body = Object.fromEntries(cols.map(c => [c, String(row[c] ?? "").trim()]));
      const valid = requiredCols.every(c => body[c]);
      if (!valid) continue;
      try {
        const res = await fetch(apiUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) ok++;
      } catch {}
    }
    await load();
    showToast(`✅ ${ok} registro${ok !== 1 ? "s" : ""} importados`);
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!cols.some(c => String(r[c] ?? "").toLowerCase().includes(q))) return false;
    }
    for (const [col, active] of Object.entries(colFilters)) {
      if (active.size > 0 && !active.has(String(r[col] ?? "—"))) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dataCols = config.displayCols ?? cols;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && <Toast msg={toast} />}
      {delTarget !== null && (
        <ConfirmModal title="¿Eliminar registro?" message="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(delTarget)} onCancel={() => setDelTarget(null)} />
      )}
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />

      {/* Formulario nuevo */}
      <div style={{ padding: "14px 24px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase",
          letterSpacing: "0.07em", fontFamily: "var(--mono)", marginBottom: 10 }}>Nuevo Registro</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {cols.map(col => (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: 4, flex: col === "comentario" || col === "comentarios" ? 3 : 1, minWidth: 130 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>
                {getLabel(col)} {requiredCols.includes(col) ? <span style={{ color: "var(--inc)" }}>*</span> : ""}
              </label>
              <input className="search-input" placeholder={col} style={{ width: "100%" }}
                value={newVals[col] ?? ""}
                onChange={e => setNewVals(v => ({ ...v, [col]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && crear()}
                placeholder={getLabel(col)} />
            </div>
          ))}
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth: 110 }}>
            {adding
              ? <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Guardando</>
              : "+ Agregar"}
          </button>
        </div>
        {addError && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--inc-text)", background: "var(--inc-bg)",
            border: "1px solid var(--inc-border)", borderRadius: 6, padding: "6px 12px" }}>{addError}</div>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 240 }} />
          {search && <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => setColFilters({})}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>✏ doble clic para editar</span>
          <button className="btn-export-small" title="Descargar template"
            onClick={() => downloadTemplateXLSX(templateCols, exportFilename)}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={() => fileRef.current?.click()}>↑ Importar</button>
          <button className="btn-export" disabled={!filtered.length}
            onClick={() => exportXLSX(filtered, dataCols, exportFilename)}>Exportar</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ margin: "12px 20px" }}>
        {error} — <button className="btn-export-small" onClick={load}>Reintentar</button>
      </div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
          : (
            <table className="crud-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {dataCols.map((col, i) => (
                    <ThCell key={col} col={col} isSpecial={false}
                    label={getLabel(col)}
                      hasFilter={colFilters[col]?.size > 0}
                      width={i === dataCols.length - 1 ? "40%" : "20%"}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
                  ))}
                  <th style={{ width: 80, textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.id}>
                    {dataCols.map((col, i) => (
                      <td key={col} style={{ textAlign: "left" }}>
                        <EditableCell value={row[col] ?? ""}
                          type={col === "comentario" || col === "comentarios" ? "textarea" : "text"}
                          onCommit={v => patchCell(row.id, col, v)} />
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => setDelTarget(row.id)}
                        style={{ background: "var(--inc-bg)", color: "var(--inc-text)",
                          border: "1px solid var(--inc-border)", borderRadius: 8,
                          padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && !loading && (
                  <tr><td colSpan={dataCols.length + 1} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                    {search ? "Sin resultados." : "Sin registros. Agrega el primero arriba."}
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left"><span className="page-info">Página {page} de {totalPages}</span></div>
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

// ── Configuraciones de cada tab CRUD ─────────────────────────────────────────
const TAB_CONFIGS = {
  dba: {
    apiUrl: `${API_BASE}/consolidado/dba`,
    idbKey: "consolidado-priv-dba",
    cols:        ["name_db","grantee","grantee_role","comentario"],
    displayCols: ["name_db","grantee","grantee_role","comentario"],
    requiredCols: ["name_db","grantee","grantee_role"],
    newDefaults:  { name_db: "", grantee: "", grantee_role: "", comentario: "" },
    editMethod:   "post",   // backend detecta dup por (name_db, grantee, grantee_role)
    templateCols: ["name_db","grantee","grantee_role","comentario"],
    exportFilename: "consolidado-dba",
  },
  linux: {
    apiUrl: `${API_BASE}/consolidado/linux`,
    idbKey: "consolidado-priv-linux",
    cols:        ["servidor","aplicacion","cuenta","comentarios"],
    displayCols: ["servidor","aplicacion","cuenta","comentarios"],
    requiredCols: ["servidor","aplicacion","cuenta"],
    newDefaults:  { servidor: "", aplicacion: "", cuenta: "", comentarios: "" },
    editMethod:   "put",
    templateCols: ["servidor","aplicacion","cuenta","comentarios"],
    exportFilename: "consolidado-linux",
  },
  windows: {
    apiUrl: `${API_BASE}/consolidado/windows`,
    idbKey: "consolidado-priv-windows",
    cols:        ["servidor","aplicacion","cuenta","comentarios"],
    displayCols: ["servidor","aplicacion","cuenta","comentarios"],
    requiredCols: ["servidor","aplicacion","cuenta"],
    newDefaults:  { servidor: "", aplicacion: "", cuenta: "", comentarios: "" },
    editMethod:   "put",
    templateCols: ["servidor","aplicacion","cuenta","comentarios"],
    exportFilename: "consolidado-windows",
  },
};

const TABS = [
  { key: "clasificacion", label: "Clasificación de Cuenta", icon: "🏷" },
  { key: "dba",           label: "DBA",                     icon: "🗄" },
  { key: "linux",         label: "Linux",                   icon: "🐧" },
  { key: "windows",       label: "Windows",                 icon: "🪟" },
];

const NOTAS = {
  clasificacion: "Clasifica las cuentas de accesos privilegiados. Mantén la lista actualizada antes de certificar.",
  dba:     "Consolidado de roles DBA por base de datos. El backend detecta duplicados por (name_db, grantee, grantee_role) — editar re-envía como POST.",
  linux:   "Consolidado de cuentas con acceso a servidores Linux. Doble clic en cualquier celda para editar.",
  windows: "Consolidado de cuentas con acceso a servidores Windows. Doble clic en cualquier celda para editar.",
};

function ConsolidadosPrivilegiadosInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "clasificacion");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  function switchTab(key) {
    setActiveTab(key);
    router.replace(`?tab=${key}`, { scroll: false });
  }

  return (
    <div className="recopilacion-page">
      <div className="recopilacion-topbar">
        <div className="topbar-left">
          <div className="breadcrumb">privilegiados › recopilación › <span>consolidados</span></div>
          <h2 className="page-title">Consolidados — Privilegiados</h2>
        </div>
        <div className="topbar-right">
          <button className="btn-export" onClick={() => router.back()}>Volver</button>
          <button className="btn-generate" style={{ minWidth: "auto", padding: "8px 18px" }}
            onClick={() => router.push("/admin/privilegiados/hallazgos/windows")}>
            Ir a Hallazgos →
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, padding: "0 0 0 24px", background: "var(--bg3)",
        borderBottom: "2px solid var(--border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)} style={{
            padding: "8px 20px 9px", cursor: "pointer",
            background:   activeTab === t.key ? "var(--bg2)" : "transparent",
            border:       "1px solid var(--border)", borderBottom: "none",
            borderRadius: "6px 6px 0 0", marginBottom: -2,
            color:        activeTab === t.key ? "var(--accent)" : "var(--text3)",
            fontFamily:   "var(--sans)", fontSize: 13,
            fontWeight:   activeTab === t.key ? 700 : 500,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Nota contextual */}
      <div style={{ margin: "12px 24px 0", padding: "12px 18px",
        background: "linear-gradient(90deg, var(--accent-bg) 0%, var(--bg2) 100%)",
        border: "1px solid var(--accent2)", borderLeft: "4px solid var(--accent)",
        borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          {NOTAS[activeTab]}
        </p>
      </div>

      <div style={{ flex: 1, overflow: "auto", paddingTop: 4 }}>
        {activeTab === "clasificacion" && <ClasificacionTab />}
        {activeTab === "dba"           && <CrudTab config={TAB_CONFIGS.dba} />}
        {activeTab === "linux"         && <CrudTab config={TAB_CONFIGS.linux} />}
        {activeTab === "windows"       && <CrudTab config={TAB_CONFIGS.windows} />}
      </div>
    </div>
  );
}

export default function ConsolidadosPrivilegiadosPage() {
  return (
    <Suspense fallback={<div className="recopilacion-page" />}>
      <ConsolidadosPrivilegiadosInner />
    </Suspense>
  );
}
