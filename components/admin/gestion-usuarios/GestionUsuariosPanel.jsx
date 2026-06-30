"use client";

/**
 * GestionUsuariosPanel — CRUD mockeado de usuarios.
 * columnas redimensionables, acciones siempre visibles.
 */

import { useState, useEffect, useCallback } from "react";
import { lsGet, lsSet } from "@/lib/storage";
import ConfirmModal from "@/components/shared/ConfirmModal";

const STORAGE_KEY = "itsecops-usuarios-mock";

const SEED = [
  { id: 1, username: "admin",        name: "Administrador",         email: "admin@empresa.com",        role: "admin",        active: true },
  { id: 2, username: "certificador", name: "Usuario Certificador",  email: "cert@empresa.com",         role: "certificador", active: true },
  { id: 3, username: "usuario",      name: "Usuario Visualizador",  email: "usuario@empresa.com",      role: "usuario",      active: true },
];

const ROLES = [
  { value: "admin",        label: "Administrador",   icon: "🔑", color: "#3b82f6" },
  { value: "certificador", label: "Certificador",    icon: "👤", color: "#10b981" },
  { value: "usuario",      label: "Usuario",         icon: "📊", color: "#7c3aed" },
];

// Definición de columnas con anchos iniciales
const COL_DEFS = [
  { key: "id",       label: "ID",       width: 60  },
  { key: "username", label: "Usuario",  width: 140 },
  { key: "name",     label: "Nombre",   width: 200 },
  { key: "email",    label: "Email",    width: 220 },
  { key: "role",     label: "Rol",      width: 160 },
  { key: "active",   label: "Estado",   width: 110 },
  { key: "__actions__", label: "Acciones", width: 155 },
];

function roleMeta(role) { return ROLES.find(r => r.value === role) ?? ROLES[1]; }

export default function GestionUsuariosPanel() {
  const [users,    setUsers]    = useState(SEED);
  const [hydrated, setHydrated] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [filter,   setFilter]   = useState("");
  const [colWidths, setColWidths] = useState(
    Object.fromEntries(COL_DEFS.map(c => [c.key, c.width]))
  );

  useEffect(() => {
    const stored = lsGet(STORAGE_KEY, null);
    if (Array.isArray(stored) && stored.length > 0) setUsers(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    lsSet(STORAGE_KEY, users);
  }, [users, hydrated]);

  // Resize de columnas
  const startResize = useCallback((colKey, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colKey];
    function onMove(ev) {
      setColWidths(prev => ({ ...prev, [colKey]: Math.max(55, startW + ev.clientX - startX) }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

  function handleSave(data) {
    if (data.id) {
      setUsers(prev => prev.map(u => u.id === data.id ? data : u));
    } else {
      const id = (users.reduce((m, u) => Math.max(m, u.id), 0) || 0) + 1;
      setUsers(prev => [...prev, { ...data, id }]);
    }
    setEditing(null);
  }

  function handleDelete() {
    if (!delTarget) return;
    setUsers(prev => prev.filter(u => u.id !== delTarget.id));
    setDelTarget(null);
  }

  const filtered = users.filter(u => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [u.username, u.name, u.email, u.role].some(v => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="panel">
      {editing && (
        <UserFormModal
          initial={editing === "new" ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          existingUsernames={users.filter(u => editing === "new" || u.id !== editing.id).map(u => u.username)}
        />
      )}
      {delTarget && (
        <ConfirmModal
          title={`¿Eliminar a "${delTarget.name}"?`}
          message="Esta acción es local (mock). El usuario no podrá acceder al sistema."
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">admin / <span>gestión de usuarios</span></div>
          <h2 className="page-title">Gestión de Usuarios y Accesos</h2>
        </div>
        <div className="topbar-right">
          <button className="btn-generate" onClick={() => setEditing("new")}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--border)" }}>
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por usuario, nombre, email o rol…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: "100%", maxWidth: 380 }}
        />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 28px" }}>
        <table className="data-table" style={{ minWidth: "max-content", width: "100%" }}>
          <colgroup>
            {COL_DEFS.map(c => <col key={c.key} style={{ width: colWidths[c.key] }} />)}
          </colgroup>
          <thead>
            <tr>
              {COL_DEFS.map(c => (
                <th key={c.key} style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <div className="th-wrap">
                    <div className="th-label">
                      <span className="th-label-text">{c.label}</span>
                    </div>
                    {/* Handle de resize en todas excepto Acciones */}
                    {c.key !== "__actions__" && (
                      <div className="resize-handle" onMouseDown={e => startResize(c.key, e)} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, ri) => {
              const meta = roleMeta(u.role);
              return (
                <tr key={u.id} className={ri % 2 === 0 ? "row-even" : "row-odd"}>
                  <td style={{ width: colWidths.id }}>
                    <span className="cell-text" style={{ fontFamily: "var(--mono)", color: "var(--text3)" }}>#{u.id}</span>
                  </td>
                  <td style={{ width: colWidths.username }}>
                    <span className="cell-text" style={{ fontWeight: 600 }}>{u.username}</span>
                  </td>
                  <td style={{ width: colWidths.name }}>
                    <span className="cell-text">{u.name}</span>
                  </td>
                  <td style={{ width: colWidths.email }}>
                    <span className="cell-text" style={{ fontSize: 12.5, color: "var(--text2)" }}>{u.email}</span>
                  </td>
                  <td style={{ width: colWidths.role }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 10px", borderRadius: 999,
                      background: `${meta.color}18`, color: meta.color,
                      fontWeight: 700, fontSize: 11.5,
                    }}>
                      <span>{meta.icon}</span>{meta.label}
                    </span>
                  </td>
                  <td style={{ width: colWidths.active }}>
                    {u.active
                      ? <span style={{ color: "var(--ok-text)", fontWeight: 600, fontSize: 12 }}>● Activo</span>
                      : <span style={{ color: "var(--text3)", fontWeight: 600, fontSize: 12 }}>○ Inactivo</span>}
                  </td>
                  {/* Acciones — min-width para evitar que se comprima */}
                  <td style={{ width: colWidths.__actions__, minWidth: 140 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                      <button className="btn-export-small" onClick={() => setEditing(u)}>✏️ Editar</button>
                      <button className="btn-export-small"
                        style={{ color: "var(--inc-text)", borderColor: "var(--inc-border)" }}
                        onClick={() => setDelTarget(u)}>🗑️ Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={COL_DEFS.length} style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                No se encontraron usuarios con ese filtro.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserFormModal({ initial, onSave, onCancel, existingUsernames }) {
  const [form, setForm] = useState(initial ?? {
    username: "", name: "", email: "", role: "certificador", active: true,
  });
  const [error, setError] = useState(null);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function submit() {
    if (!form.username.trim() || !form.name.trim() || !form.email.trim()) {
      setError("Usuario, nombre y email son obligatorios."); return;
    }
    if (existingUsernames.includes(form.username.trim().toLowerCase())) {
      setError("Ya existe un usuario con ese username."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Formato de email inválido."); return;
    }
    onSave({ ...form, username: form.username.trim().toLowerCase(), email: form.email.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, alignItems: "stretch", textAlign: "left" }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>
          {initial ? "Editar usuario" : "Crear usuario"}
        </div>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field" style={{ marginTop: 4 }}>
          <label className="auth-label">Usuario</label>
          <input className="auth-input" type="text" value={form.username}
            onChange={e => set("username", e.target.value)}
            disabled={!!initial} placeholder="ej: jperez"
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Nombre completo</label>
          <input className="auth-input" type="text" value={form.name}
            onChange={e => set("name", e.target.value)} placeholder="ej: Juan Pérez" />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" type="email" value={form.email}
            onChange={e => set("email", e.target.value)} placeholder="usuario@empresa.com" />
        </div>
        <div className="auth-field">
          <label className="auth-label">Rol</label>
          <select className="auth-input" value={form.role} onChange={e => set("role", e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
          <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} />
          <span>Usuario activo</span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="modal-btn modal-cancel" onClick={onCancel} style={{ flex: 1 }}>Cancelar</button>
          <button className="modal-btn modal-success" onClick={submit} style={{ flex: 1 }}>
            {initial ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}
