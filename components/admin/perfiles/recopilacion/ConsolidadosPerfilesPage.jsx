"use client";

/**
 * ConsolidadosPerfilesPage — v24.5
 *
 * Cuatro tabs:
 *   1. Clasificación de Cuenta  → ClasificacionTab
 *   2. DB-Roles                 → CRUD /consolidado/db-roles
 *   3. DB-Sustentos             → CRUD /consolidado/db-sustentos
 *   4. App-Sustentos            → CRUD /consolidado/app-sustentos  ← NUEVO
 */

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClasificacionTab from "@/components/shared/ClasificacionTab";
import { ThCell } from "@/components/shared/DataTableHeader";
import { idbGetItem, idbSetItem } from "@/lib/storage";
import { getLabel } from "@/lib/utils/fieldLabels";

const API_BASE              = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_DB_ROLES          = `${API_BASE}/consolidado/db-roles`;
const API_DB_SUSTENTOS      = `${API_BASE}/consolidado/db-sustentos`;
const API_DB_SUSTENTOS_BULK = `${API_BASE}/consolidado/db-sustentos/bulk`;
const API_APP_SUSTENTOS      = `${API_BASE}/consolidado/app-sustentos`;
const API_APP_SUSTENTOS_BULK = `${API_BASE}/consolidado/app-sustentos/bulk`;

const IDB_KEY_ROLES        = "consolidado-perfiles-dbroles";
const IDB_KEY_SUSTENTOS    = "consolidado-perfiles-dbsustentos";
const IDB_KEY_APP_SUST     = "consolidado-perfiles-appsustentos";

const DB_NAME_OPTIONS  = ["EXACTUS", "SDP"];
const APP_NAME_OPTIONS = ["SDP", "NPAC", "EXACTUS", "SIT"];
const PAGE_SIZE = 20;

// ── XLSX helpers (CDN lazy-load) ─────────────────────────────────────────────
let _XLSX = null;
async function getXLSX() {
  if (_XLSX) return _XLSX;
  _XLSX = await import('xlsx');
  return _XLSX;
}
async function downloadTemplateXLSX(cols, filename) {
  const XLSX = await getXLSX();
  const ws = XLSX.utils.aoa_to_sheet([cols]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `template_${filename}.xlsx`);
}
async function exportViewXLSX(rows, cols, filename) {
  const XLSX = await getXLSX();
  const data = rows.map(r => {
    const out = {};
    cols.forEach(c => { out[c] = r[c] ?? ""; });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vista");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
// Normaliza una cabecera de Excel a la clave canónica que espera el código:
// minúsculas, sin acentos, espacios → "_". Así "Sustento", "Descripción",
// "DB Role" o "Matrícula" mapean a sustento / descripcion / db_role / matricula.
function normHeader(k) {
  return String(k)
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}
async function parseXLSX(file) {
  const XLSX  = await getXLSX();
  const buf   = await file.arrayBuffer();
  const wb    = XLSX.read(buf, { type: "array" });
  const ws    = wb.Sheets[wb.SheetNames[0]];
  const raw   = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return raw.map(row => {
    const out = {};
    for (const k of Object.keys(row)) out[normHeader(k)] = row[k];
    return out;
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Toast({ msg }) { return <div className="save-toast">{msg}</div>; }

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>🗑️</div>
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

function EditableCell({ value, type = "text", options = [], onCommit, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = typeof draft === "string" ? draft.trim() : draft;
    if (trimmed !== (value ?? "")) onCommit(trimmed);
  }
  function handleKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
  }
  const base = {
    background: "var(--bg)", border: "1px solid var(--accent2)", color: "var(--text)",
    borderRadius: 5, padding: "3px 7px", fontSize: 12.5, fontFamily: "var(--sans)",
    outline: "none", width: "100%", boxSizing: "border-box", ...style,
  };
  if (!editing) {
    return (
      <div onDoubleClick={() => { setDraft(value ?? ""); setEditing(true); }}
        title="Doble clic para editar"
        style={{ cursor: "default", minHeight: 24, display: "flex", alignItems: "center",
          gap: 6, userSelect: "none" }}>
        <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--text2)" }}>
          {value || "—"}
        </span>
        <span style={{ fontSize: 9, color: "var(--text4)", opacity: 0.6, flexShrink: 0 }}>✏</span>
      </div>
    );
  }
  if (type === "select") {
    return (
      <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={handleKeyDown} style={base}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (type === "textarea") {
    return (
      <textarea ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
        rows={3}
        style={{ ...base, resize: "vertical", lineHeight: 1.5, minHeight: 60 }} />
    );
  }
  return (
    <input ref={inputRef} type="text" value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={handleKeyDown} style={{ ...base, height: 30 }} />
  );
}

// ── Tab DB-Roles ──────────────────────────────────────────────────────────────
function DBRolesTab() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [toast,     setToast]     = useState("");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [sortCol,   setSortCol]   = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");
  const [colFilters,setColFilters]= useState({});
  const [openPanel, setOpenPanel] = useState(null);

  const [newDbName,  setNewDbName]  = useState("EXACTUS");
  const [newDbRole,  setNewDbRole]  = useState("");
  const [newDesc,    setNewDesc]    = useState("");
  const [addError,   setAddError]   = useState("");
  const [adding,     setAdding]     = useState(false);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const rolesFileRef = useRef(null);

  async function handleRolesImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    let parsed;
    try { parsed = await parseXLSX(file); } catch { showToast("❌ Error al leer el archivo"); return; }
    let ok = 0;
    for (const row of parsed) {
      const db_name = DB_NAME_OPTIONS.includes(String(row.db_name ?? "").trim().toUpperCase())
        ? String(row.db_name).trim().toUpperCase() : null;
      if (!db_name || !String(row.db_role ?? "").trim() || !String(row.descripcion ?? "").trim()) continue;
      try {
        const res = await fetch(API_DB_ROLES, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ db_name, db_role: String(row.db_role).trim().toUpperCase(), descripcion: String(row.descripcion).trim() }),
        });
        if (res.ok) ok++;
      } catch {}
    }
    await load();
    showToast(`${ok} registro${ok !== 1 ? "s" : ""} importados`);
  }

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(API_DB_ROLES);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = d.rows || d.data || [];
      setRows(data);
      await idbSetItem(IDB_KEY_ROLES, data);
    } catch (e) {
      const cached = await idbGetItem(IDB_KEY_ROLES);
      if (Array.isArray(cached) && cached.length) { setRows(cached); showToast("Sin conexión — mostrando caché"); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await idbGetItem(IDB_KEY_ROLES);
      if (Array.isArray(cached) && cached.length) { setRows(cached); setLoading(false); }
      else await load();
    })();
  }, [load]);

  async function crear() {
    if (!newDbRole.trim()) { setAddError("El rol de BD es obligatorio."); return; }
    if (!newDesc.trim())   { setAddError("La descripción es obligatoria."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(API_DB_ROLES, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db_name: newDbName, db_role: newDbRole.trim().toUpperCase(), descripcion: newDesc.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewDbRole(""); setNewDesc("");
      await load(); showToast("Registro creado");
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function patchCell(id, field, value) {
    const prev = rows;
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_ROLES, updated);
    try {
      const row = updated.find(r => r.id === id);
      const res = await fetch(`${API_DB_ROLES}/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db_name: row.db_name, db_role: row.db_role, descripcion: row.descripcion }),
      });
      if (!res.ok) throw new Error();
      showToast("Cambio guardado");
    } catch {
      setRows(prev); await idbSetItem(IDB_KEY_ROLES, prev);
      showToast("❌ Error al guardar — cambio revertido");
    }
  }

  async function eliminar(id) {
    try {
      const res = await fetch(`${API_DB_ROLES}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = rows.filter(r => r.id !== id);
      setRows(updated); await idbSetItem(IDB_KEY_ROLES, updated);
      showToast("Registro eliminado");
    } catch (e) { showToast("❌ Error al eliminar: " + e.message); }
    finally { setDelTarget(null); }
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![r.db_name, r.db_role, r.descripcion].some(v => String(v ?? "").toLowerCase().includes(q))) return false;
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
  const COLS_ROLES = ["db_name", "db_role", "descripcion"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && <Toast msg={toast} />}
      {delTarget !== null && (
        <ConfirmModal title="¿Eliminar registro?" message="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(delTarget)} onCancel={() => setDelTarget(null)} />
      )}
      <input ref={rolesFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleRolesImport} />

      <div style={{ padding: "14px 24px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase",
          letterSpacing: "0.07em", fontFamily: "var(--mono)", marginBottom: 10 }}>Nuevo Rol de BD</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Base de Datos *</label>
            <select className="date-pill" value={newDbName} onChange={e => setNewDbName(e.target.value)}
              style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
              {DB_NAME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Rol *</label>
            <input className="search-input" placeholder="Ej: DBA" value={newDbRole}
              onChange={e => setNewDbRole(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && crear()}
              style={{ fontFamily: "var(--mono)", textTransform: "uppercase" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 3, minWidth: 240 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Descripción *</label>
            <input className="search-input" placeholder="Descripción del rol…" value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && crear()} />
          </div>
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth: 120 }}>
            {adding ? <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Guardando</> : "+ Agregar"}
          </button>
        </div>
        {addError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--inc-text)", background: "var(--inc-bg)",
          border: "1px solid var(--inc-border)", borderRadius: 6, padding: "6px 12px" }}>{addError}</div>}
      </div>

      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar DB, rol, descripción…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 280 }} />
          {search && <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => setColFilters({})}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>✏ doble clic para editar</span>
          <button className="btn-export-small"
            onClick={() => exportViewXLSX(sorted, COLS_ROLES, "db-roles-vista")}>↓ Exportar vista</button>
          <button className="btn-export-small" title="Descargar template .xlsx"
            onClick={() => downloadTemplateXLSX(COLS_ROLES, "db-roles")}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={() => rolesFileRef.current?.click()}>↑ Importar (.xlsx)</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ margin: "12px 20px" }}>
        Error: {error} — <button className="btn-export-small" onClick={load}>Reintentar</button>
      </div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
          : (
            <table className="crud-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {[
                    { key: "db_name",    label: "Base de Datos", width: "12%" },
                    { key: "db_role",    label: "Rol",           width: "15%" },
                    { key: "descripcion",label: "Descripción",   width: "63%" },
                  ].map(col => (
                    <ThCell key={col.key} col={col.key} isSpecial={false}
                      label={getLabel(col.key)}
                      hasFilter={colFilters[col.key]?.size > 0} width={col.width}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
                  ))}
                  <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.id}>
                    <td><EditableCell value={row.db_name} type="select" options={DB_NAME_OPTIONS}
                      onCommit={v => patchCell(row.id, "db_name", v)} /></td>
                    <td><EditableCell value={row.db_role}
                      onCommit={v => patchCell(row.id, "db_role", v.toUpperCase())} /></td>
                    <td><EditableCell value={row.descripcion} type="textarea"
                      onCommit={v => patchCell(row.id, "descripcion", v)} /></td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => setDelTarget(row.id)}
                        style={{ background: "var(--inc-bg)", color: "var(--inc-text)",
                          border: "1px solid var(--inc-border)", borderRadius: 8,
                          padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && !loading && (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                    {search ? "Sin resultados." : "No hay registros. Agrega el primero arriba."}
                  </td></tr>
                )}
              </tbody>
            </table>
          )
        }
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left"><span className="page-info">Página {page} de {totalPages}</span></div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-size-btn ${p === page ? "ps-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab DB-Sustentos ──────────────────────────────────────────────────────────
function DBSustentosTab() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [toast,     setToast]     = useState("");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [sortCol,   setSortCol]   = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");
  const [colFilters,setColFilters]= useState({});
  const [openPanel, setOpenPanel] = useState(null);

  const [newMat,     setNewMat]     = useState("");
  const [newDb,      setNewDb]      = useState("EXACTUS");
  const [newDbRole,  setNewDbRole]  = useState("");
  const [newSustento,setNewSustento]= useState("");
  const [addError,   setAddError]   = useState("");
  const [adding,     setAdding]     = useState(false);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const sustFileRef = useRef(null);

  async function handleSustImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    let parsed;
    try { parsed = await parseXLSX(file); } catch { showToast("❌ Error al leer el archivo"); return; }
    const payload = parsed
      .filter(row => String(row.matricula ?? "").trim() && String(row.sustento ?? "").trim())
      .map(row => ({
        matricula: String(row.matricula).trim(),
        db:        DB_NAME_OPTIONS.includes(String(row.db ?? "").trim().toUpperCase())
                    ? String(row.db).trim().toUpperCase() : "EXACTUS",
        db_role:   String(row.db_role ?? "").trim(),
        sustento:  String(row.sustento).trim(),
      }));
    if (!payload.length) { showToast("Sin filas válidas en el archivo"); return; }
    try {
      const res = await fetch(API_DB_SUSTENTOS_BULK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      await load();
      showToast(`${d.creados?.length ?? payload.length} sustento(s) importados`);
    } catch (err) { showToast("❌ Error en importación: " + err.message); }
  }

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(API_DB_SUSTENTOS);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = d.rows || d.data || [];
      setRows(data);
      await idbSetItem(IDB_KEY_SUSTENTOS, data);
    } catch (e) {
      const cached = await idbGetItem(IDB_KEY_SUSTENTOS);
      if (Array.isArray(cached) && cached.length) { setRows(cached); showToast("Sin conexión — mostrando caché"); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await idbGetItem(IDB_KEY_SUSTENTOS);
      if (Array.isArray(cached) && cached.length) { setRows(cached); setLoading(false); }
      else await load();
    })();
  }, [load]);

  async function crear() {
    if (!newMat.trim())      { setAddError("La matrícula es obligatoria."); return; }
    if (!newDbRole.trim())   { setAddError("El rol de BD es obligatorio."); return; }
    if (!newSustento.trim()) { setAddError("El sustento es obligatorio."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(API_DB_SUSTENTOS, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: newMat.trim(), db: newDb, db_role: newDbRole.trim(), sustento: newSustento.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewMat(""); setNewDbRole(""); setNewSustento("");
      await load(); showToast("Sustento guardado");
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function patchCell(id, field, value) {
    const prev = rows;
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_SUSTENTOS, updated);
    try {
      const row = updated.find(r => r.id === id);
      const res = await fetch(`${API_DB_SUSTENTOS}/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: row.matricula, db: row.db, db_role: row.db_role, sustento: row.sustento }),
      });
      if (!res.ok) throw new Error();
      showToast("Cambio guardado");
    } catch {
      setRows(prev); await idbSetItem(IDB_KEY_SUSTENTOS, prev);
      showToast("❌ Error al guardar — cambio revertido");
    }
  }

  async function eliminar(id) {
    try {
      const res = await fetch(`${API_DB_SUSTENTOS}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = rows.filter(r => r.id !== id);
      setRows(updated); await idbSetItem(IDB_KEY_SUSTENTOS, updated);
      showToast("Registro eliminado");
    } catch (e) { showToast("❌ Error al eliminar: " + e.message); }
    finally { setDelTarget(null); }
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![r.matricula, r.db, r.db_role, r.sustento].some(v => String(v ?? "").toLowerCase().includes(q))) return false;
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
  const COLS_SUST  = ["matricula", "db", "db_role", "sustento"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && <Toast msg={toast} />}
      {delTarget !== null && (
        <ConfirmModal title="¿Eliminar sustento?" message="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(delTarget)} onCancel={() => setDelTarget(null)} />
      )}
      <input ref={sustFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleSustImport} />

      <div style={{ padding: "14px 24px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase",
          letterSpacing: "0.07em", fontFamily: "var(--mono)", marginBottom: 10 }}>Nuevo Sustento BD</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Matrícula *</label>
            <input className="search-input" placeholder="Ej: P00033" value={newMat}
              onChange={e => setNewMat(e.target.value)} style={{ fontFamily: "var(--mono)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Base de Datos *</label>
            <select className="date-pill" value={newDb} onChange={e => setNewDb(e.target.value)}
              style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
              {DB_NAME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Rol de BD *</label>
            <input className="search-input" placeholder="Ej: DBA" value={newDbRole}
              onChange={e => setNewDbRole(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Sustento *</label>
            <input className="search-input" placeholder="Descripción del sustento…" value={newSustento}
              onChange={e => setNewSustento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && crear()} />
          </div>
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth: 120 }}>
            {adding ? <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Guardando</> : "+ Agregar"}
          </button>
        </div>
        {addError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--inc-text)", background: "var(--inc-bg)",
          border: "1px solid var(--inc-border)", borderRadius: 6, padding: "6px 12px" }}>{addError}</div>}
      </div>

      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar matrícula, DB, rol, sustento…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 300 }} />
          {search && <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => setColFilters({})}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>✏ doble clic para editar</span>
          <button className="btn-export-small"
            onClick={() => exportViewXLSX(sorted, COLS_SUST, "db-sustentos-vista")}>↓ Exportar vista</button>
          <button className="btn-export-small" title="Descargar template .xlsx"
            onClick={() => downloadTemplateXLSX(COLS_SUST, "db-sustentos")}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={() => sustFileRef.current?.click()}>↑ Importar bulk (.xlsx)</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ margin: "12px 20px" }}>
        Error: {error} — <button className="btn-export-small" onClick={load}>Reintentar</button>
      </div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
          : (
            <table className="crud-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {[
                    { key: "matricula", label: "Matrícula",    width: "10%" },
                    { key: "db",        label: "Base de Datos", width: "10%" },
                    { key: "db_role",   label: "Rol",           width: "12%" },
                    { key: "sustento",  label: "Sustento",      width: "58%" },
                  ].map(col => (
                    <ThCell key={col.key} col={col.key} isSpecial={false}
                      label={getLabel(col.key)}
                      hasFilter={colFilters[col.key]?.size > 0} width={col.width}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
                  ))}
                  <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.id}>
                    <td><EditableCell value={row.matricula} onCommit={v => patchCell(row.id, "matricula", v)} /></td>
                    <td><EditableCell value={row.db} type="select" options={DB_NAME_OPTIONS}
                      onCommit={v => patchCell(row.id, "db", v)} /></td>
                    <td><EditableCell value={row.db_role} onCommit={v => patchCell(row.id, "db_role", v)} /></td>
                    <td><EditableCell value={row.sustento} type="textarea" onCommit={v => patchCell(row.id, "sustento", v)} /></td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => setDelTarget(row.id)}
                        style={{ background: "var(--inc-bg)", color: "var(--inc-text)",
                          border: "1px solid var(--inc-border)", borderRadius: 8,
                          padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                    {search ? "Sin resultados." : "No hay sustentos. Agrega el primero arriba."}
                  </td></tr>
                )}
              </tbody>
            </table>
          )
        }
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left"><span className="page-info">Página {page} de {totalPages}</span></div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-size-btn ${p === page ? "ps-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab App-Sustentos ─────────────────────────────────────────────────────────
function AppSustentosTab() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [toast,     setToast]     = useState("");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [sortCol,   setSortCol]   = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");
  const [colFilters,setColFilters]= useState({});
  const [openPanel, setOpenPanel] = useState(null);

  // Nuevo registro
  const [newApp,     setNewApp]     = useState("SDP");
  const [newMat,     setNewMat]     = useState("");
  const [newPerfil,  setNewPerfil]  = useState("");
  const [newSustento,setNewSustento]= useState("");
  const [addError,   setAddError]   = useState("");
  const [adding,     setAdding]     = useState(false);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const importFileRef = useRef(null);

  // Importar bulk desde xlsx
  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    let parsed;
    try { parsed = await parseXLSX(file); } catch { showToast("❌ Error al leer el archivo"); return; }
    const payload = parsed
      .filter(row => String(row.matricula ?? "").trim() && String(row.sustento ?? "").trim())
      .map(row => ({
        app:       APP_NAME_OPTIONS.includes(String(row.app ?? "").trim().toUpperCase())
                    ? String(row.app).trim().toUpperCase() : "SDP",
        matricula: String(row.matricula).trim(),
        perfil:    String(row.perfil ?? "").trim(),
        sustento:  String(row.sustento).trim(),
      }));
    if (!payload.length) { showToast("Sin filas válidas en el archivo"); return; }
    try {
      const res = await fetch(API_APP_SUSTENTOS_BULK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      showToast(`${payload.length} sustento(s) importados`);
    } catch (err) { showToast("❌ Error en importación: " + err.message); }
  }

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(API_APP_SUSTENTOS);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = d.rows || d.data || [];
      setRows(data);
      await idbSetItem(IDB_KEY_APP_SUST, data);
    } catch (e) {
      const cached = await idbGetItem(IDB_KEY_APP_SUST);
      if (Array.isArray(cached) && cached.length) { setRows(cached); showToast("Sin conexión — mostrando caché"); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await idbGetItem(IDB_KEY_APP_SUST);
      if (Array.isArray(cached) && cached.length) { setRows(cached); setLoading(false); }
      else await load();
    })();
  }, [load]);

  async function crear() {
    if (!newMat.trim())     { setAddError("La matrícula es obligatoria."); return; }
    if (!newPerfil.trim())  { setAddError("El perfil es obligatorio."); return; }
    if (!newSustento.trim()){ setAddError("El sustento es obligatorio."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(API_APP_SUSTENTOS, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: newApp, matricula: newMat.trim(), perfil: newPerfil.trim(), sustento: newSustento.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewMat(""); setNewPerfil(""); setNewSustento("");
      await load(); showToast("Sustento guardado");
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function patchCell(id, field, value) {
    const prev = rows;
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_APP_SUST, updated);
    try {
      const row = updated.find(r => r.id === id);
      const res = await fetch(`${API_APP_SUSTENTOS}/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: row.app, matricula: row.matricula, perfil: row.perfil, sustento: row.sustento }),
      });
      if (!res.ok) throw new Error();
      showToast("Cambio guardado");
    } catch {
      setRows(prev); await idbSetItem(IDB_KEY_APP_SUST, prev);
      showToast("❌ Error al guardar — cambio revertido");
    }
  }

  async function eliminar(id) {
    try {
      const res = await fetch(`${API_APP_SUSTENTOS}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = rows.filter(r => r.id !== id);
      setRows(updated); await idbSetItem(IDB_KEY_APP_SUST, updated);
      showToast("Registro eliminado");
    } catch (e) { showToast("❌ Error al eliminar: " + e.message); }
    finally { setDelTarget(null); }
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![r.app, r.matricula, r.perfil, r.sustento].some(v => String(v ?? "").toLowerCase().includes(q))) return false;
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
  const COLS_APP   = ["app", "matricula", "perfil", "sustento"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {toast && <Toast msg={toast} />}
      {delTarget !== null && (
        <ConfirmModal title="¿Eliminar sustento?" message="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(delTarget)} onCancel={() => setDelTarget(null)} />
      )}
      <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />

      {/* Formulario nuevo registro */}
      <div style={{ padding: "14px 24px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase",
          letterSpacing: "0.07em", fontFamily: "var(--mono)", marginBottom: 10 }}>Nuevo Sustento de App</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* App — select con valores validados */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 120 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>App *</label>
            <select className="date-pill" value={newApp} onChange={e => setNewApp(e.target.value)}
              style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
              {APP_NAME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Matrícula *</label>
            <input className="search-input" placeholder="Ej: P00033" value={newMat}
              onChange={e => setNewMat(e.target.value)} style={{ fontFamily: "var(--mono)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Perfil *</label>
            <input className="search-input" placeholder="Ej: Administrador" value={newPerfil}
              onChange={e => setNewPerfil(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 2, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>Sustento *</label>
            <input className="search-input" placeholder="Justificación del acceso…" value={newSustento}
              onChange={e => setNewSustento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && crear()} />
          </div>
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth: 120 }}>
            {adding ? <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Guardando</> : "+ Agregar"}
          </button>
        </div>
        {addError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--inc-text)", background: "var(--inc-bg)",
          border: "1px solid var(--inc-border)", borderRadius: 6, padding: "6px 12px" }}>{addError}</div>}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar app, matrícula, perfil, sustento…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 320 }} />
          {search && <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => setColFilters({})}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>✏ doble clic para editar</span>
          <button className="btn-export-small"
            onClick={() => exportViewXLSX(sorted, COLS_APP, "app-sustentos-vista")}>↓ Exportar vista</button>
          <button className="btn-export-small" title="Descargar template .xlsx"
            onClick={() => downloadTemplateXLSX(COLS_APP, "app-sustentos")}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={() => importFileRef.current?.click()}>↑ Importar bulk (.xlsx)</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ margin: "12px 20px" }}>
        Error: {error} — <button className="btn-export-small" onClick={load}>Reintentar</button>
      </div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
          : (
            <table className="crud-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {[
                    { key: "app",       label: "App",       width: "10%" },
                    { key: "matricula", label: "Matrícula", width: "10%" },
                    { key: "perfil",    label: "Perfil",    width: "18%" },
                    { key: "sustento",  label: "Sustento",  width: "52%" },
                  ].map(col => (
                    <ThCell key={col.key} col={col.key} isSpecial={false}
                      label={getLabel(col.key) || col.label}
                      hasFilter={colFilters[col.key]?.size > 0} width={col.width}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
                  ))}
                  <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.id}>
                    {/* App — select inline con los 4 valores permitidos */}
                    <td>
                      <EditableCell value={row.app} type="select" options={APP_NAME_OPTIONS}
                        onCommit={v => patchCell(row.id, "app", v)} />
                    </td>
                    <td><EditableCell value={row.matricula} onCommit={v => patchCell(row.id, "matricula", v)} /></td>
                    <td><EditableCell value={row.perfil} onCommit={v => patchCell(row.id, "perfil", v)} /></td>
                    <td><EditableCell value={row.sustento} type="textarea" onCommit={v => patchCell(row.id, "sustento", v)} /></td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => setDelTarget(row.id)}
                        style={{ background: "var(--inc-bg)", color: "var(--inc-text)",
                          border: "1px solid var(--inc-border)", borderRadius: 8,
                          padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                    {search ? "Sin resultados." : "No hay sustentos de app. Agrega el primero arriba."}
                  </td></tr>
                )}
              </tbody>
            </table>
          )
        }
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left"><span className="page-info">Página {page} de {totalPages}</span></div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-size-btn ${p === page ? "ps-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contenedor principal ──────────────────────────────────────────────────────
const TABS = [
  { key: "clasificacion", label: "Clasificación de Cuenta" },
  { key: "db-roles",      label: "DB-Roles"               },
  { key: "db-sustentos",  label: "DB-Sustentos"           },
  { key: "app-sustentos", label: "App-Sustentos"          },
];

const NOTAS = {
  "clasificacion": "Los registros aquí listados clasifican cuentas para los reportes de Hallazgos de Perfiles. Mantén la lista actualizada antes de ejecutar la certificación.",
  "db-roles":      "Catálogo de roles de base de datos por sistema (EXACTUS / SDP). Los roles aquí registrados se usan como referencia en la certificación de perfiles de BD.",
  "db-sustentos":  "Sustentos por matrícula, base de datos y rol. Un sustento registrado aquí justifica el acceso del colaborador en el proceso de certificación.",
  "app-sustentos": "Sustentos de acceso por aplicación (SDP, NPAC, EXACTUS, SIT). Cada sustento justifica el perfil de un colaborador en la aplicación indicada.",
};

function ConsolidadosPerfilesInner() {
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
          <div className="breadcrumb">perfiles › recopilación › <span>consolidados</span></div>
          <h2 className="page-title">Consolidados — Perfiles</h2>
        </div>
        <div className="topbar-right">
          <button className="btn-export" onClick={() => router.back()}>Volver</button>
          <button className="btn-generate" style={{ minWidth: "auto", padding: "8px 18px" }}
            onClick={() => router.push("/admin/perfiles/hallazgos/roles")}>Ir a Hallazgos →</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, padding: "0 0 0 24px", background: "var(--bg3)",
        borderBottom: "2px solid var(--border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            style={{
              padding: "8px 20px 9px", cursor: "pointer",
              background:  activeTab === t.key ? "var(--bg2)" : "transparent",
              border:      "1px solid var(--border)", borderBottom: "none",
              borderRadius: "6px 6px 0 0", marginBottom: -2,
              color:       activeTab === t.key ? "var(--accent)" : "var(--text3)",
              fontFamily:  "var(--sans)", fontSize: 13,
              fontWeight:  activeTab === t.key ? 700 : 500,
            }}>
            {t.label}
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
        {activeTab === "clasificacion"  && <ClasificacionTab />}
        {activeTab === "db-roles"       && <DBRolesTab />}
        {activeTab === "db-sustentos"   && <DBSustentosTab />}
        {activeTab === "app-sustentos"  && <AppSustentosTab />}
      </div>
    </div>
  );
}

export default function ConsolidadosPerfilesPage() {
  return (
    <Suspense fallback={<div className="recopilacion-page" />}>
      <ConsolidadosPerfilesInner />
    </Suspense>
  );
}
