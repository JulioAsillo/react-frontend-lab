"use client";

/**
 * ClasificacionTab — v23.5
 *
 * Componente compartido que expone la vista CRUD de Clasificación de Cuentas
 * (consolidado/clasificacion-cuentas) reutilizable en los módulos:
 *   - Usuarios   → ConsolidadosPage.jsx (tab "clasificacion")
 *   - Perfiles   → ConsolidadosPerfilesPage.jsx
 *   - Privilegiados → ConsolidadosPrivilegiadosPage.jsx (nuevo)
 *
 * Props:
 *   breadcrumb?: string  — prefijo para el toast de contexto (por defecto "")
 *
 * La lógica es idéntica al ClasificacionTab que vivía en ConsolidadosPage.jsx
 * (Usuarios). Se extrae aquí para no duplicar ~300 líneas en cada módulo.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { idbGetItem, idbSetItem } from "@/lib/storage";
import { getLabel } from "@/lib/utils/fieldLabels";
import { ThCell } from "@/components/shared/DataTableHeader";

const API_BASE      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_HISTORICO = `${API_BASE}/consolidado/clasificacion-cuentas`;
const IDB_KEY_HIST  = "consolidado-historico-rows";

const TIPO_CUENTA_OPTIONS = [
  { value: "sin clasificar", label: "Sin clasificar" },
  { value: "Cuenta PA",      label: "Cuenta PA"      },
  { value: "Servicio",       label: "Servicio"        },
  { value: "Usuario",        label: "Usuario"         },
  { value: "Proxy",          label: "Proxy"           },
];

// ── SheetJS (CDN lazy) ────────────────────────────────────────────────────────
let _XLSX = null;
async function getXLSX() {
  if (_XLSX) return _XLSX;
  _XLSX = await import('xlsx');
  return _XLSX;
}
async function exportXLSX(rows, filename) {
  if (!rows.length) return;
  const XLSX = await getXLSX();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
async function downloadTemplateXLSX(cols, filename) {
  const XLSX = await getXLSX();
  const ws = XLSX.utils.aoa_to_sheet([cols]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `template_${filename}.xlsx`);
}
async function importFile(file) {
  const XLSX = await getXLSX();
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: "array", cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const raw  = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return raw.map(row => {
    const out = {};
    for (const k of Object.keys(row)) {
      const key = k.trim().toLowerCase();
      const val = row[k];
      if (val instanceof Date && !isNaN(val.getTime())) {
        const y = val.getFullYear();
        const mo = String(val.getMonth()+1).padStart(2,"0");
        const d  = String(val.getDate()).padStart(2,"0");
        out[key] = `${y}-${mo}-${d}`;
      } else { out[key] = val; }
    }
    return out;
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function tipoBadge(val) {
  const MAP = {
    "sin clasificar": { bg:"var(--warn-bg)",  color:"var(--warn)",    border:"var(--sust-border)" },
    pa:               { bg:"#dbeafe",          color:"#1d4ed8",        border:"#bfdbfe" },
    servicio:         { bg:"#ede9fe",          color:"#6d28d9",        border:"#ddd6fe" },
    usuario:          { bg:"var(--ok-bg)",     color:"var(--ok-text)", border:"var(--ok-border)" },
    proxy:            { bg:"#f5f3ff",          color:"#6d28d9",        border:"#ddd6fe" },
  };
  const key = String(val ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const s = MAP[key] ?? MAP["sin clasificar"];
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:"nowrap" }}>
      {val}
    </span>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:360 }}>
        <div style={{ fontSize:36, lineHeight:1 }}>🗑️</div>
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
function Toast({ msg }) { return <div className="save-toast">{msg}</div>; }

function EditableCell({ value, type = "text", options = [], onCommit, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function activate() { setDraft(value); setEditing(true); }
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }
  function handleKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  }
  const inputStyle = {
    background:"var(--bg)", border:"1px solid var(--accent2)", color:"var(--text)",
    borderRadius:5, padding:"3px 7px", fontSize:12.5, fontFamily:"var(--sans)",
    outline:"none", width:"100%", ...style,
  };
  function displayValue() {
    if (!value) return "—";
    if (type === "select") {
      const found = options.some(o => (typeof o === "object" ? o.value : o) === value);
      return found
        ? tipoBadge(value)
        : <span style={{ fontFamily:"var(--mono)", fontSize:12 }}>{value}</span>;
    }
    return <span>{value}</span>;
  }
  if (!editing) {
    return (
      <div onDoubleClick={activate} title="Doble clic para editar"
        style={{ cursor:"default", minHeight:24, display:"flex", alignItems:"center",
          gap:6, userSelect:"none", ...style }}>
        {displayValue()}
        <span style={{ fontSize:9, color:"var(--text4)", opacity:0.6, flexShrink:0 }}>✏</span>
      </div>
    );
  }
  if (type === "select") {
    return (
      <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={handleKeyDown} style={inputStyle}>
        {options.map(o => {
          const v = typeof o === "object" ? o.value : o;
          const l = typeof o === "object" ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    );
  }
  return (
    <input ref={inputRef} type="text" value={draft ?? ""} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={handleKeyDown} style={inputStyle} />
  );
}

// ── Componente principal exportado ────────────────────────────────────────────
export default function ClasificacionTab() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [toast,     setToast]     = useState("");
  const [newUsuario,   setNewUsuario]   = useState("");
  const [newTipo,      setNewTipo]      = useState("sin clasificar");
  const [newMatricula, setNewMatricula] = useState("");
  const [addError,     setAddError]     = useState("");
  const [adding,       setAdding]       = useState(false);
  const [sortCol,  setSortCol]  = useState(null);
  const [sortDir,  setSortDir]  = useState("desc");
  const [colFilters, setColFilters] = useState({});
  const [openPanel,  setOpenPanel]  = useState(null);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({...prev, [col]: set})); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function handleResizeStart(e) { e.preventDefault(); }
  const fileRef = useRef();
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setRows(prev => { if (!prev.length) setLoading(true); return prev; });
    setError("");
    try {
      const r = await fetch(API_HISTORICO);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = d.data?.consolidado_cuentas || d.rows || [];
      setRows(data);
      await idbSetItem(IDB_KEY_HIST, data);
    } catch (e) {
      const cached = await idbGetItem(IDB_KEY_HIST);
      if (Array.isArray(cached) && cached.length > 0) {
        setRows(cached);
        showToast("Sin conexión — mostrando caché");
      } else { setError(e.message); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Siempre re-consultar al backend al entrar a la vista, para reflejar las
    // cuentas recién clasificadas desde los Hallazgos. Mientras llega la
    // respuesta mostramos la caché (si hay) para evitar parpadeo en blanco.
    (async () => {
      const cached = await idbGetItem(IDB_KEY_HIST);
      if (Array.isArray(cached) && cached.length > 0) setRows(cached);
      await load();
    })();
  }, [load]);

  async function crear() {
    if (!newUsuario.trim()) { setAddError("El usuario es obligatorio."); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(API_HISTORICO, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ usuario:newUsuario.trim(), tipo_cuenta:newTipo, matricula:newMatricula.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewUsuario(""); setNewTipo("sin clasificar"); setNewMatricula("");
      await load(); showToast("Registro creado");
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function patchCell(rowid, field, value) {
    const prev = rows;
    const updated = rows.map(r => r.__rowid === rowid ? { ...r, [field]: value } : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_HIST, updated);
    try {
      const row = updated.find(r => r.__rowid === rowid);
      const res = await fetch(`${API_HISTORICO}/${rowid}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ usuario:row.usuario, tipo_cuenta:row.tipo_cuenta, matricula:row.matricula }),
      });
      if (!res.ok) throw new Error();
      showToast("Cambio guardado");
    } catch {
      setRows(prev);
      await idbSetItem(IDB_KEY_HIST, prev);
      showToast("❌ Error al guardar — cambio revertido");
    }
  }

  async function eliminar(rowid) {
    try {
      await fetch(`${API_HISTORICO}/${rowid}`, { method:"DELETE" });
      const updated = rows.filter(r => r.__rowid !== rowid);
      setRows(updated);
      await idbSetItem(IDB_KEY_HIST, updated);
      showToast("Registro eliminado");
    } catch (e) { alert("Error: " + e.message); }
    finally { setDelTarget(null); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    const parsed = await importFile(file);
    let ok = 0;
    for (const row of parsed) {
      if (!row.usuario) continue;
      try {
        const res = await fetch(API_HISTORICO, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ usuario:row.usuario, tipo_cuenta:row.tipo_cuenta||"sin clasificar", matricula:row.matricula||"" }),
        });
        if (res.ok) ok++;
      } catch {}
    }
    await load();
    showToast(`${ok} registro${ok!==1?"s":""} importados`);
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      if (![r.usuario, r.tipo_cuenta, r.matricula].some(v => String(v??"").toLowerCase().includes(search.toLowerCase()))) return false;
    }
    for (const col of Object.keys(colFilters)) {
      const active = colFilters[col];
      if (active.size > 0 && !active.has(String(r[col] ?? "—"))) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const col = sortCol ?? "__rowid";
    const dir = sortCol ? sortDir : "desc";
    const av = a[col]??"", bv = b[col]??"";
    const cmp = typeof av==="number"&&typeof bv==="number" ? av-bv : String(av).localeCompare(String(bv),"es",{numeric:true});
    return dir==="asc" ? cmp : -cmp;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {toast && <Toast msg={toast} />}
      {delTarget !== null && (
        <ConfirmModal title="¿Eliminar registro?" message="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(delTarget)} onCancel={() => setDelTarget(null)} />
      )}
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={handleImport} />

      {/* Form nuevo registro */}
      <div style={{ padding:"14px 24px", background:"var(--bg2)", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase",
          letterSpacing:"0.07em", fontFamily:"var(--mono)", marginBottom:10 }}>Nuevo Registro</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--text2)" }}>Usuario *</label>
            <input className="search-input" style={{ width:"100%" }} placeholder="Ej: USR001"
              value={newUsuario} onChange={e=>setNewUsuario(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&crear()} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--text2)" }}>Tipo de Cuenta</label>
            <select className="date-pill" style={{ width:"100%" }} value={newTipo} onChange={e=>setNewTipo(e.target.value)}>
              {TIPO_CUENTA_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:140 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--text2)" }}>Matrícula</label>
            <input className="search-input" style={{ width:"100%" }} placeholder="Ej: M001"
              value={newMatricula} onChange={e=>setNewMatricula(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&crear()} />
          </div>
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth:120 }}>
            {adding ? <><span className="spinner" style={{ borderColor:"rgba(255,255,255,0.3)", borderTopColor:"#fff" }} /> Guardando</> : "+ Agregar"}
          </button>
        </div>
        {addError && (
          <div style={{ marginTop:8, fontSize:12, color:"var(--inc-text)", background:"var(--inc-bg)",
            border:"1px solid var(--inc-border)", borderRadius:6, padding:"6px 12px" }}>{addError}</div>
        )}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar usuario, tipo, matrícula…"
            value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{ width:260 }} />
          {search && <button className="btn-export-small" onClick={()=>{setSearch("");setPage(1);}}>✕</button>}
          {Object.values(colFilters).some(s=>s.size>0) && (
            <button className="btn-export-small" style={{ color:"var(--accent)" }}
              onClick={()=>setColFilters({})}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right" style={{ gap:8 }}>
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)" }}
            title="Doble clic en cualquier celda para editar">✏ doble clic para editar</span>
          <button className="btn-export-small" title="Descargar template .xlsx"
            onClick={()=>downloadTemplateXLSX(["usuario","tipo_cuenta","matricula"],"clasificacion")}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={()=>fileRef.current?.click()}>↑ Importar (.csv / .xlsx)</button>
          <button className="btn-export" disabled={!filtered.length}
            onClick={()=>exportXLSX(filtered.map(r=>({usuario:r.usuario,tipo_cuenta:r.tipo_cuenta,matricula:r.matricula})),"consolidado-historico")}>
            Exportar vista
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ margin:"12px 20px" }}>
          Error: {error} — <button className="btn-export-small" onClick={load}>Reintentar</button>
        </div>
      )}

      <div style={{ flex:1, overflow:"auto" }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }} /></div>
          : (
            <table className="crud-table" style={{ width:"100%" }}>
              <thead>
                <tr>
                  {[
                    { key:"usuario",     label:"Usuario",        width:"30%" },
                    { key:"tipo_cuenta", label:"Tipo de Cuenta", width:"30%" },
                    { key:"matricula",   label:"Matrícula",      width:"30%" },
                  ].map(col => (
                    <ThCell key={col.key} col={col.key}
                      isSpecial={false}
                      label={getLabel(col.key)}
                      hasFilter={colFilters[col.key]?.size > 0} width={col.width}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={handleResizeStart} />
                  ))}
                  <th style={{ width:80, textAlign:"center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.__rowid}>
                    <td>
                      <EditableCell value={row.usuario ?? ""} type="text"
                        onCommit={v => patchCell(row.__rowid, "usuario", v)} />
                    </td>
                    <td>
                      <EditableCell value={row.tipo_cuenta ?? "sin clasificar"} type="select"
                        options={TIPO_CUENTA_OPTIONS}
                        onCommit={v => patchCell(row.__rowid, "tipo_cuenta", v)} />
                    </td>
                    <td>
                      <EditableCell value={row.matricula ?? ""} type="text"
                        onCommit={v => patchCell(row.__rowid, "matricula", v)}
                        style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--text3)" }} />
                    </td>
                    <td style={{ textAlign:"center" }}>
                      <button title="Eliminar" onClick={()=>setDelTarget(row.__rowid)}
                        style={{ background:"var(--inc-bg)", color:"var(--inc-text)",
                          border:"1px solid var(--inc-border)", borderRadius:8,
                          padding:"4px 10px", fontSize:13, cursor:"pointer" }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {pageRows.length===0 && !loading && (
                  <tr><td colSpan={4} style={{ textAlign:"center", padding:40, color:"var(--text3)" }}>
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
            <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
              <button key={p} className={`page-size-btn ${p===page?"ps-active":""}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
