'use client';

/**
 * ConsolidadosUsuariosPage.jsx — v18.3
 *
 * Cambios:
 *   - Edición inline por doble clic en celda (sin botón Editar).
 *     Clic fuera de la celda → PUT automático al endpoint.
 *   - Comentario en Post Ceses: botón Guardar explícito → PUT /api/post-ceses/{id}.
 *   - Import fila por fila para ambas tabs (ya era así, ahora el comentario
 *     también se envía al endpoint via PUT después del POST).
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { idbGetItem, idbSetItem } from '@/lib/storage';
import ClasificacionTabShared from '@/components/shared/ClasificacionTab';
import { ThCell } from '@/components/shared/DataTableHeader';

const API_BASE      = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_HISTORICO = `${API_BASE}/consolidado/clasificacion-cuentas`;
const API_POSTCESES = `${API_BASE}/consolidado/post-ceses`;
const IDB_KEY_HIST  = 'consolidado-historico-rows';
const IDB_KEY_POST  = 'consolidado-postceses-rows';

const APP_OR_DB_OPTIONS = [
  'DB_SDP','DB_EXACTUS','DB_SIT','Active_Directory',
  'APP_Exactus','APP_SDP','APP_SIT','APP_NPAC','APP_ENTRAID',
];
const TIPO_CUENTA_OPTIONS = [
  { value: 'sin clasificar', label: 'Sin clasificar' },
  { value: 'Cuenta PA',      label: 'Cuenta PA'      },
  { value: 'Servicio',       label: 'Servicio'        },
  { value: 'Usuario',        label: 'Usuario'         },
  { value: 'Proxy',          label: 'Proxy'           },
];

// ── SheetJS (CDN) ─────────────────────────────────────────────────────────────
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
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
async function downloadTemplateXLSX(cols, filename) {
  const XLSX = await getXLSX();
  const ws = XLSX.utils.aoa_to_sheet([cols]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `template_${filename}.xlsx`);
}
/**
 * normalizarFechaHora — normaliza cualquier valor a "YYYY-MM-DD HH:mm:ss.mmm".
 * Si no tiene parte de hora se añade "23:59:59.999" como fallback.
 */
function normalizarFechaHora(val) {
  if (!val) return '';
  // Serial Excel numérico → Date
  if (typeof val === 'number' && val > 1000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return `${d.toISOString().slice(0, 10)} 23:59:59.999`;
    }
  }
  // Date object (cellDates:true de SheetJS)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const iso = val.toISOString(); // "2024-05-20T14:05:10.456Z"
    return iso.slice(0,10) + ' ' + iso.slice(11,23);
  }
  const s = String(val).trim();
  // Ya tiene formato completo "YYYY-MM-DD HH:mm:ss..."
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:/.test(s)) {
    return s.replace('T', ' ').slice(0, 23);
  }
  // Solo fecha "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 23:59:59.999`;
  // DD/MM/YYYY o similar
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')} 23:59:59.999`;
  return s;
}

// Alias mantenido por compatibilidad con importFile genérico
const normalizarFecha = normalizarFechaHora;
async function importFile(file) {
  const XLSX = await getXLSX();
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return raw.map(row => {
    const out = {};
    for (const k of Object.keys(row)) {
      const key = k.trim().toLowerCase();
      const val = row[k];
      if (val instanceof Date && !isNaN(val.getTime())) {
        const y = val.getFullYear();
        const mo = String(val.getMonth()+1).padStart(2,'0');
        const d  = String(val.getDate()).padStart(2,'0');
        out[key] = `${y}-${mo}-${d}`;
      } else { out[key] = val; }
    }
    return out;
  });
}

// ── UI pequeños ───────────────────────────────────────────────────────────────
function tipoBadge(val) {
  const MAP = {
    'sin clasificar': { bg:'var(--warn-bg)',  color:'var(--warn)',    border:'var(--sust-border)' },
    pa:               { bg:'#dbeafe',          color:'#1d4ed8',        border:'#bfdbfe' },
    servicio:         { bg:'#ede9fe',          color:'#6d28d9',        border:'#ddd6fe' },
    usuario:          { bg:'var(--ok-bg)',     color:'var(--ok-text)', border:'var(--ok-border)' },
    proxy:            { bg:'#f5f3ff',          color:'#6d28d9',        border:'#ddd6fe' },
  };
  const s = MAP[val] ?? MAP['sin clasificar'];
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>
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
function NotaBanner({ text }) {
  return (
    <div style={{ margin:'12px 24px 0', padding:'12px 18px',
      background:'linear-gradient(90deg, var(--accent-bg) 0%, var(--bg2) 100%)',
      border:'1px solid var(--accent2)', borderLeft:'4px solid var(--accent)',
      borderRadius:10, display:'flex', alignItems:'flex-start', gap:10 }}>
      <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>ℹ️</span>
      <p style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.6, margin:0, fontWeight:500 }}>{text}</p>
    </div>
  );
}

// ── EditableCell — doble clic para editar, blur para guardar ─────────────────
/**
 * Celda editable inline.
 *   - onDoubleClick → activa input/select
 *   - onBlur (clic afuera) → llama onCommit(newValue) → el caller hace el PUT
 *   - Escape → cancela sin guardar
 *   - Enter → confirma (mismo que blur)
 *
 * type: "text" | "select" | "date"
 * options: array de strings (solo para type="select")
 */
function EditableCell({ value, type = 'text', options = [], onCommit, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef(null);

  // Sincronizar si el valor externo cambia (tras un reload)
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function activate() {
    setDraft(value);
    setEditing(true);
  }

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  }

  const inputStyle = {
    background:'var(--bg)', border:'1px solid var(--accent2)', color:'var(--text)',
    borderRadius:5, padding:'3px 7px', fontSize:12.5, fontFamily:'var(--sans)',
    outline:'none', width:'100%', ...style,
  };

  // Formatea el valor para mostrar según el tipo
  function displayValue() {
    if (!value) return '—';
    if (type === 'select') {
      const found = options.some(o => (typeof o === 'object' ? o.value : o) === value);
      return found
        ? tipoBadge(value)
        : <span style={{ fontFamily:'var(--mono)', fontSize:12 }}>{value}</span>;
    }
    if (type === 'datetime') {
      // Mostrar "YYYY-MM-DD HH:mm:ss"
      const s = String(value).replace('T', ' ');
      return (
        <span style={{ fontFamily:'var(--mono)', fontSize:11.5 }}>
          {s.slice(0, 10)}{' '}
          <span style={{ color:'var(--text3)' }}>{s.slice(11, 19)}</span>
        </span>
      );
    }
    return <span>{value}</span>;
  }

  if (!editing) {
    return (
      <div
        onDoubleClick={activate}
        title="Doble clic para editar"
        style={{ cursor:'default', minHeight:24, display:'flex', alignItems:'center',
          gap:6, userSelect:'none', ...style }}
      >
        {displayValue()}
        <span style={{ fontSize:9, color:'var(--text4)', opacity:0.6, flexShrink:0 }} title="Doble clic para editar">✏</span>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={handleKeyDown} style={inputStyle}>
        {options.map(o => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    );
  }
  if (type === 'date') {
    return (
      <input ref={inputRef} type="date" value={draft ?? ''} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={handleKeyDown} style={{ ...inputStyle, fontFamily:'var(--mono)' }} />
    );
  }
  // datetime — input datetime-local + normalizar al commit
  if (type === 'datetime') {
    // datetime-local necesita "YYYY-MM-DDTHH:mm:ss" como value
    const toInputVal = v => {
      if (!v) return '';
      const s = String(v).trim().replace(' ', 'T');
      return s.length >= 16 ? s.slice(0, 19) : s;
    };
    const fromInputVal = v => {
      // "YYYY-MM-DDTHH:mm:ss" → "YYYY-MM-DD HH:mm:ss.000"
      if (!v) return '';
      const [datePart, timePart = ''] = v.split('T');
      const time = timePart || '23:59:59';
      return `${datePart} ${time.length === 5 ? time + ':00' : time}.000`;
    };
    return (
      <input ref={inputRef} type="datetime-local" step="1"
        value={toInputVal(draft ?? '')}
        onChange={e => setDraft(fromInputVal(e.target.value))}
        onBlur={commit} onKeyDown={handleKeyDown}
        style={{ ...inputStyle, fontFamily:'var(--mono)', minWidth:190 }} />
    );
  }
  return (
    <input ref={inputRef} type="text" value={draft ?? ''} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={handleKeyDown} style={inputStyle} />
  );
}

// ── ComentarioCell — textarea con botón Guardar explícito ────────────────────
/**
 * Solo para la columna Comentario de Post Ceses.
 * El botón Guardar aparece cuando el texto es diferente al guardado.
 * Al hacer clic en Guardar → onSave(newValue) → caller hace PUT.
 */
function ComentarioCell({ value, onSave }) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const isDirty = draft !== (value ?? '');

  async function handleGuardar() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:180 }}>
      <textarea
        rows={1}
        placeholder="Agregar comentario…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        style={{
          width:'100%', resize:'vertical',
          background:'var(--bg)', border:'1px solid var(--border2)',
          color:'var(--text)', borderRadius:6, padding:'5px 9px',
          fontSize:12.5, fontFamily:'var(--sans)', outline:'none',
          lineHeight:1.45, minHeight:32,
        }}
      />
      {isDirty && (
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={handleGuardar}
          disabled={saving}
          style={{
            background: saved ? 'var(--ok)' : 'var(--accent)',
            color:'#fff', border:'none', borderRadius:5,
            padding:'3px 10px', fontSize:11.5, fontFamily:'var(--sans)',
            fontWeight:600, cursor:'pointer', transition:'background 0.2s',
            alignSelf:'flex-end',
          }}
        >
          {saving ? '…' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      )}
    </div>
  );
}

// ── Tab 1: Clasificación de Cuenta — reutiliza ClasificacionTab compartido ─────
// La lógica completa vive en components/shared/ClasificacionTab.jsx.
// Se usa el mismo componente en Perfiles y Privilegiados.
function ClasificacionTab() { return <ClasificacionTabShared />; }
// ── Tab 2: Post Ceses ──────────────────────────────────────────────────────────
function PostCesesTab() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [delTarget, setDelTarget] = useState(null);
  const [toast,     setToast]     = useState('');
  const [newU, setNewU] = useState('');
  const [newA, setNewA] = useState('DB_SDP');
  const [newF, setNewF] = useState('');
  const [addError, setAddError] = useState('');
  const [adding,   setAdding]   = useState(false);
  const [sortCol,  setSortCol]  = useState(null);
  const [sortDir,  setSortDir]  = useState('desc');
  const [colFilters, setColFilters] = useState({});
  const [openPanel,  setOpenPanel]  = useState(null);

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({...prev, [col]: set})); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }
  function handleResizeStart(e, col) { e.preventDefault(); }
  const fileRef = useRef();
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(API_POSTCESES);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const data = d.data?.post_ceses || d.rows || [];
      setRows(data);
      await idbSetItem(IDB_KEY_POST, data);
    } catch (e) {
      const cached = await idbGetItem(IDB_KEY_POST);
      if (Array.isArray(cached) && cached.length > 0) { setRows(cached); showToast('Sin conexión — mostrando caché'); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const cached = await idbGetItem(IDB_KEY_POST);
      if (Array.isArray(cached) && cached.length > 0) { setRows(cached); setLoading(false); }
      else await load();
    })();
  }, [load]);

  function rowId(row) { return row.__rowid ?? row.id; }

  async function crear() {
    if (!newU.trim()) { setAddError('El usuario es obligatorio.'); return; }
    if (!newF)        { setAddError('La fecha es obligatoria.'); return; }
    setAdding(true); setAddError('');
    try {
      const res = await fetch(API_POSTCESES, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ usuario:newU.trim(), app_or_db:newA, fecha_login:normalizarFechaHora(newF) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewU(''); setNewA('DB_SDP'); setNewF('');
      await load(); showToast('Registro creado');
    } catch (e) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  // Patch de una celda de datos (usuario / app_or_db / fecha_login)
  async function patchCell(rid, field, value) {
    const prev = rows;
    const updated = rows.map(r => rowId(r)===rid ? {...r, [field]:value} : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_POST, updated);
    try {
      const row = updated.find(r => rowId(r)===rid);
      const res = await fetch(`${API_POSTCESES}/${rid}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ usuario:row.usuario, app_or_db:row.app_or_db, fecha_login:row.fecha_login, comentario:row.comentario??'' }),
      });
      if (!res.ok) throw new Error();
      showToast('Cambio guardado');
    } catch {
      setRows(prev);
      await idbSetItem(IDB_KEY_POST, prev);
      showToast('Error al guardar — cambio revertido');
    }
  }

  // Guardar comentario — botón explícito en ComentarioCell
  async function saveComentario(rid, comentario) {
    const prev = rows;
    const updated = rows.map(r => rowId(r)===rid ? {...r, comentario} : r);
    setRows(updated);
    await idbSetItem(IDB_KEY_POST, updated);
    try {
      const row = updated.find(r => rowId(r)===rid);
      const res = await fetch(`${API_POSTCESES}/${rid}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ usuario:row.usuario, app_or_db:row.app_or_db, fecha_login:row.fecha_login, comentario }),
      });
      if (!res.ok) throw new Error();
      showToast('Comentario guardado');
    } catch {
      setRows(prev);
      await idbSetItem(IDB_KEY_POST, prev);
      showToast('Error al guardar comentario');
    }
  }

  async function eliminar(rid) {
    try {
      await fetch(`${API_POSTCESES}/${rid}`, { method:'DELETE' });
      const updated = rows.filter(r => rowId(r)!==rid);
      setRows(updated);
      await idbSetItem(IDB_KEY_POST, updated);
      showToast('Registro eliminado');
    } catch (e) { alert('Error: '+e.message); }
    finally { setDelTarget(null); }
  }

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2500); }

  // Import fila por fila; el comentario viaja en el mismo POST (el backend lo acepta)
  async function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value='';
    const parsed = await importFile(file);
    let ok = 0, fail = 0, conComentario = 0;
    for (const row of parsed) {
      const usuario = String(row.usuario??'').trim();
      if (!usuario) continue;
      const fechaNorm = normalizarFecha(row.fecha_login);
      const comentario = row.comentario != null ? String(row.comentario).trim() : '';
      try {
        const res = await fetch(API_POSTCESES, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ usuario, app_or_db:row.app_or_db||'DB_SDP', fecha_login:fechaNorm, comentario }),
        });
        if (!res.ok) { fail++; continue; }
        ok++;
        if (comentario) conComentario++;
      } catch { fail++; }
    }
    await load();
    const partes = [`${ok} registro${ok!==1?'s':''} importado${ok!==1?'s':''}`];
    if (conComentario) partes.push(`${conComentario} con comentario`);
    if (fail) partes.push(`${fail} con error`);
    showToast(partes.join(' · '));
  }

  const filtered = rows.filter(r => {
    if (search.trim()) {
      if (![r.usuario, r.app_or_db, r.fecha_login].some(v => String(v??'').toLowerCase().includes(search.toLowerCase()))) return false;
    }
    for (const col of Object.keys(colFilters)) {
      const active = colFilters[col];
      if (active.size > 0 && !active.has(String(r[col] ?? '—'))) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol] ?? '';
    const bv = b[sortCol] ?? '';
    const cmp = typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),'es',{numeric:true});
    return sortDir==='asc' ? cmp : -cmp;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {toast && <Toast msg={toast} />}
      {delTarget!==null && <ConfirmModal title="¿Eliminar registro?" message="Esta acción no se puede deshacer." onConfirm={()=>eliminar(delTarget)} onCancel={()=>setDelTarget(null)} />}
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={handleImport} />

      {/* Form nuevo */}
      <div style={{ padding:'14px 24px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)', marginBottom:10 }}>Nuevo Registro</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:150 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)' }}>Usuario *</label>
            <input className="search-input" style={{ width:'100%' }} placeholder="Ej: USR001" value={newU} onChange={e=>setNewU(e.target.value)} onKeyDown={e=>e.key==='Enter'&&crear()} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:170 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)' }}>Sistema / Base de Datos</label>
            <select className="date-pill" style={{ width:'100%' }} value={newA} onChange={e=>setNewA(e.target.value)}>
              {APP_OR_DB_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:200 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)' }}>Fecha y hora último acceso *</label>
            <input 
              type="datetime-local" 
              className="date-pill" 
              style={{ width:'100%', fontFamily:'var(--mono)', cursor: 'pointer' }}
              value={newF} 
              onChange={e=>setNewF(e.target.value)} 
              onClick={e => e.target.showPicker && e.target.showPicker()}
              step="1" 
            />
          </div>
          <button className="btn-generate" onClick={crear} disabled={adding} style={{ minWidth:120 }}>
            {adding ? <><span className="spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} /> Guardando</> : '+ Agregar'}
          </button>
        </div>
        {addError && <div style={{ marginTop:8, fontSize:12, color:'var(--inc-text)', background:'var(--inc-bg)', border:'1px solid var(--inc-border)', borderRadius:6, padding:'6px 12px' }}>{addError}</div>}
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar usuario, sistema, fecha…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{ width:260 }} />
          {search && <button className="btn-export-small" onClick={()=>{setSearch('');setPage(1);}}>✕</button>}
        </div>
        <div className="toolbar-right" style={{ gap:8 }}>
          <span className="row-count"><span className="row-count-num">{filtered.length}</span> registros</span>
          <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }} title="Doble clic en celda para editar">doble clic para editar</span>
          <button className="btn-export-small" title="Descargar template .xlsx" onClick={()=>downloadTemplateXLSX(['usuario','app_or_db','fecha_login','comentario'],'post-ceses')}>↓ Template .xlsx</button>
          <button className="btn-export-small" onClick={()=>fileRef.current?.click()}>↑ Importar (.csv / .xlsx)</button>
          <button className="btn-export" disabled={!filtered.length}
            onClick={()=>exportXLSX(filtered.map(r=>({ usuario:r.usuario, app_or_db:r.app_or_db, fecha_login:r.fecha_login, comentario:r.comentario??'' })),'consolidado-postceses')}>
            Exportar vista
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ margin:'12px 20px' }}>Error: {error} — <button className="btn-export-small" onClick={load}>Reintentar</button></div>}

      <div style={{ flex:1, overflow:'auto' }}>
        {loading
          ? <div className="empty-state"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }} /></div>
          : (
            <table className="crud-table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  {[
                    { key:'usuario',     label:'Usuario',                 width:'20%' },
                    { key:'app_or_db',   label:'Sistema / Base de Datos', width:'20%' },
                    { key:'fecha_login', label:'Fecha último acceso',     width:'25%' },
                    { key:'comentario',  label:'Comentario',              width:'25%' },
                  ].map(col => (
                    <ThCell key={col.key} col={col.key} 
                      isSpecial={col.key==='comentario'}
                      hasFilter={colFilters[col.key]?.size > 0} width={col.width}
                      openPanel={openPanel} setOpenPanel={setOpenPanel}
                      sortCol={sortCol} sortDir={sortDir} rows={rows}
                      getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                      handleSort={handleSort} onResizeStart={handleResizeStart} />
                  ))}
                  <th style={{ width:80, textAlign:'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => {
                  const rid = rowId(row);
                  return (
                    <tr key={rid}>
                      <td>
                        <EditableCell value={row.usuario??''} type="text"
                          onCommit={v=>patchCell(rid,'usuario',v)} />
                      </td>
                      <td>
                        <EditableCell value={row.app_or_db??''} type="select" options={APP_OR_DB_OPTIONS}
                          onCommit={v=>patchCell(rid,'app_or_db',v)} />
                      </td>
                      <td>
                        <EditableCell value={row.fecha_login??''} type="datetime"
                          onCommit={v=>patchCell(rid,'fecha_login',v)}
                          style={{ fontFamily:'var(--mono)', fontSize:12 }} />
                      </td>
                      <td>
                        <ComentarioCell
                          value={row.comentario??''}
                          onSave={comentario=>saveComentario(rid,comentario)}
                        />
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <button title="Eliminar" onClick={()=>setDelTarget(rid)}
                          style={{ background:'var(--inc-bg)', color:'var(--inc-text)', border:'1px solid var(--inc-border)',
                            borderRadius:8, padding:'4px 10px', fontSize:13, cursor:'pointer' }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length===0 && !loading && (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
                    {search?'Sin resultados.':'No hay registros. Agrega el primero arriba.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          )
        }
      </div>

      {totalPages>1 && (
        <div className="pagination">
          <div className="pagination-left"><span className="page-info">Página {page} de {totalPages}</span></div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
              <button key={p} className={`page-size-btn ${p===page?'ps-active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contenedor principal ───────────────────────────────────────────────────────
function ConsolidadosInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab')?? 'clasificacion');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setActiveTab(t);
  }, [searchParams]);

  const tabs = [
    { id:'clasificacion', label:'Clasificación de Cuenta' },
    { id:'postCese',      label:'Post Ceses' },
  ];
  const NOTAS = {
    clasificacion: 'Los registros aquí listados aparecerán en los reportes de Hallazgos como Correcto, Incorrecto o Sustentado según la clasificación asignada. Mantén esta lista actualizada antes de ejecutar la certificación.',
    postCese:      'Los registros de Post Ceses identifican accesos detectados luego del cese del colaborador. Agrega el comentario correspondiente por cada hallazgo y guárdalo antes de exportar la vista.',
  };

  return (
    <div className="recopilacion-page">
      <div className="recopilacion-topbar">
        <div className="topbar-left">
          <div className="breadcrumb">usuarios › recopilación › <span>consolidados</span></div>
          <h2 className="page-title">Consolidados</h2>
        </div>
        <div className="topbar-right">
          <button className="btn-export" onClick={()=>router.back()}>Volver</button>
          <button className="btn-generate" style={{ minWidth:'auto', padding:'8px 18px' }} onClick={()=>router.push('/admin/usuarios/hallazgos/cesados')}>Ir a Hallazgos →</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:2, padding:'0 0 0 24px', background:'var(--bg3)', borderBottom:'2px solid var(--border)' }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setActiveTab(t.id);router.replace(`?tab=${t.id}`,{scroll:false});}}
            style={{ padding:'8px 20px 9px', background:activeTab===t.id?'var(--bg2)':'transparent',
              border:'1px solid var(--border)', borderBottom:'none', borderRadius:'6px 6px 0 0',
              marginBottom:-2, color:activeTab===t.id?'var(--accent)':'var(--text3)',
              fontFamily:'var(--sans)', fontSize:13, fontWeight:activeTab===t.id?700:500, cursor:'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      <NotaBanner text={NOTAS[activeTab]} />

      <div style={{ flex:1, overflow:'auto', paddingTop:4 }}>
        {activeTab==='clasificacion' ? <ClasificacionTab /> : <PostCesesTab />}
      </div>
    </div>
  );
}

export default function ConsolidadosUsuariosPage() {
  return (
    <Suspense fallback={<div className="recopilacion-page" />}>
      <ConsolidadosInner />
    </Suspense>
  );
}
