"use client";

/**
 * ClasificacionModal
 *
 * Modal flotante para editar TIPO DE CUENTA, MATRÍCULA y USUARIO
 * de una fila de hallazgo. Se abre con doble clic en la fila.
 *
 * Notas:
 * - Acepta `fieldMap` prop para configurar qué columnas de la fila
 * se usan como fuente de usuario/matrícula/tipoCuenta, según el
 * módulo y hallazgo (Usuarios, Perfiles, Privilegiados).
 * - `fieldMap` es un objeto con claves opcionales:
 * { usuarioCols, matriculaCols, tipoCuentaCols }
 * Cada valor es un array de nombres de columna a buscar en orden.
 * Si no se pasa `fieldMap`, se usa el resolver genérico anterior.
 * - El campo USUARIO puede ser read-only cuando proviene de una columna
 * específica (ej. GRANTEE en DBA), controlado por `usuarioReadOnly`.
 *
 * Endpoint:
 * POST http://localhost:8000/consolidado/clasificacion-cuentas
 * Body: { usuario, tipo_cuenta, matricula }
 */

import { useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TIPO_OPTIONS = [
  { value: "",          label: "— Seleccionar —" },
  { value: "Cuenta PA", label: "Cuenta PA" },
  { value: "Servicio",  label: "Servicio"  },
  { value: "Usuario",   label: "Usuario"   },
  { value: "Proxy",     label: "Proxy"     },
];

// Normaliza un valor (de columna o backend) a la opción EXACTA del select.
// Tolera casing/espacios distintos. "Sin Clasificar" y vacíos → "" (no preselecciona).
function canonicalizeTipo(v) {
  if (!v) return "";
  const norm = String(v).toLowerCase().replace(/\s+/g, " ").trim();
  if (["sin clasificar", "sin_clasificar", "sinclasificar", "n/a", "nd", "-", "none", "null"].includes(norm)) return "";
  const hit = TIPO_OPTIONS.find(o => o.value && o.value.toLowerCase() === norm);
  return hit ? hit.value : String(v).trim();
}

// Busca el primer valor no vacío entre los nombres de columna candidatos.
// Case-insensitive y tolerante a espacios: los nombres reales del backend
// varían en casing ("Usuarios" vs "USUARIO", "Tipo de cuenta" vs "TIPO CUENTA").
function pickFirst(row, candidates = []) {
  if (!row) return "";
  // 1) match exacto (rápido)
  for (const col of candidates) {
    const v = row?.[col];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  // 2) match case-insensitive / sin espacios extra
  const norm = s => String(s).toLowerCase().replace(/\s+/g, " ").trim();
  const rowKeys = Object.keys(row);
  for (const col of candidates) {
    const target = norm(col);
    const hit = rowKeys.find(k => norm(k) === target);
    if (hit) {
      const v = row[hit];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

// Normaliza el tipo de cuenta: "sin clasificar" y variantes → vacío
function normalizeTipoCuenta(v) {
  if (!v) return "";
  const lower = String(v).toLowerCase().trim();
  if (
    lower === "sin clasificar" || lower === "sin_clasificar" ||
    lower === "sinclasificar"  || lower === "n/a" ||
    lower === "nd"             || lower === "-"   ||
    lower === "none"           || lower === "null"
  ) return "";
  return String(v).trim();
}

// Resolver genérico de usuario (fallback cuando no hay fieldMap)
function resolveUsuarioGeneric(row) {
  return pickFirst(row, [
    "usuario", "Usuario", "user", "samAccountName",
    "UPN", "upn", "userPrincipalName", "GRANTEE",
    "USUARIOS", "USUARIO", "USERS", "Users", "users",
  ]);
}

function resolveNombre(row) {
  return pickFirst(row, [
    "full_name", "nombre", "displayName", "Nombre",
    "Nombre Personal", "Nombre Completo", "Nombre del personal",
  ]) || null;
}

export default function ClasificacionModal({ row, onClose, fieldMap }) {
  // fieldMap = { usuarioCols, matriculaCols, tipoCuentaCols, usuarioReadOnly }
  const fm = fieldMap || {};

  const detectedUsuario = fm.usuarioCols
    ? pickFirst(row, fm.usuarioCols)
    : resolveUsuarioGeneric(row);

  const initialMatricula = fm.matriculaCols
    ? pickFirst(row, fm.matriculaCols)
    : (row?.matricula ?? row?.Matricula ?? "");

  const initialTipo = canonicalizeTipo(
    fm.tipoCuentaCols
      ? pickFirst(row, fm.tipoCuentaCols)
      : (row?.tipo_cuenta ?? "")
  );

  const usuarioReadOnly = fm.usuarioReadOnly ?? true;

  const [usuario,     setUsuario]     = useState(detectedUsuario);
  const [tipoCuenta,  setTipoCuenta]  = useState(initialTipo);
  const [matricula,   setMatricula]   = useState(initialMatricula);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const [error,       setError]       = useState("");
  const [saved,       setSaved]       = useState(false);
  const prevTipo = useRef(initialTipo);
  const matriculaRef = useRef(null);

  // Resincronizar cuando se hace doble clic en otra fila (row cambia)
  useEffect(() => { setUsuario(detectedUsuario); }, [detectedUsuario]);

  // Pre-cargar clasificación existente desde el API
  useEffect(() => {
    if (!usuario) return;
    setFetching(true);
    fetch(`${API_BASE}/consolidado/clasificacion-cuentas?usuario=${encodeURIComponent(usuario)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const arr = Array.isArray(data) ? data
          : Array.isArray(data?.data?.consolidado_cuentas) ? data.data.consolidado_cuentas
          : Array.isArray(data?.rows) ? data.rows : [];
        const match = arr.find(r => String(r.usuario ?? "").toLowerCase() === usuario.toLowerCase());
        if (match) {
          setTipoCuenta(canonicalizeTipo(match.tipo_cuenta ?? ""));
          setMatricula(match.matricula   ?? "");
          prevTipo.current = canonicalizeTipo(match.tipo_cuenta ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Auto-completar matrícula al cambiar a "Servicio"
  useEffect(() => {
    if (tipoCuenta === "Servicio" && tipoCuenta !== prevTipo.current) {
      setMatricula(usuario);
    }
    prevTipo.current = tipoCuenta;
  }, [tipoCuenta, usuario]);

  useEffect(() => {
    if (matriculaRef.current) matriculaRef.current.focus();
  }, []);

  function matriculaRequired() {
    return tipoCuenta === "Cuenta PA" || tipoCuenta === "Usuario";
  }

  function validate() {
    if (!usuario || !String(usuario).trim()) {
      return "No se detectó el usuario de esta fila (columna USUARIOS). No se puede guardar vacío.";
    }
    if (!tipoCuenta) return "Selecciona un tipo de cuenta.";
    if (matriculaRequired() && !matricula.trim()) {
      return `La matrícula es obligatoria para tipo "${tipoCuenta}".`;
    }
    return "";
  }

  async function handleGuardar() {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/consolidado/clasificacion-cuentas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, tipo_cuenta: tipoCuenta, matricula: matricula.trim() }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); msg = j.detail || j.error || msg; } catch {}
        throw new Error(msg);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e) {
      setError(e.message || "No se pudo guardar. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(e) { if (e.target === e.currentTarget) onClose(); }
  function handleKeyDown(e) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && !loading) handleGuardar();
  }

  return (
    <div onMouseDown={handleOverlayClick} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(2px)",
    }}>
      <div onKeyDown={handleKeyDown} style={{
        background: "var(--bg2)", border: "1px solid var(--border)",
        borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        width: 440, maxWidth: "94vw", padding: "24px 28px",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
              Clasificar cuenta
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, fontFamily: "var(--mono)" }}>
              Doble clic en otra fila para cambiar la selección
            </div>
          </div>
          <button onClick={onClose} title="Cerrar (Esc)"
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 18, color: "var(--text3)", lineHeight: 1, padding: "2px 6px" }}>
            ✕
          </button>
        </div>

        {/* Info del usuario */}
        <div style={{
          background: "var(--bg3)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "10px 14px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Usuario seleccionado
          </div>
          {detectedUsuario ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              {usuario || "—"}
            </div>
          ) : (
            <input type="text" value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(""); }}
              placeholder="No se detectó automáticamente — escríbelo"
              style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)",
                background: "var(--bg)", border: "1px solid var(--inc-border)",
                borderRadius: 6, padding: "6px 10px", outline: "none" }} />
          )}
          {row?.UPN && row.UPN !== usuario && (
            <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>
              UPN: {row.UPN}
            </div>
          )}
          {resolveNombre(row) && (
            <div style={{ fontSize: 12, color: "var(--text2)" }}>{resolveNombre(row)}</div>
          )}
          {(row?.email || row?.mail) && (
            <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
              {row.email || row.mail}
            </div>
          )}
        </div>

        {/* Tipo de cuenta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)",
            display: "flex", alignItems: "center", gap: 6 }}>
            Tipo de cuenta <span style={{ color: "var(--inc)" }}>*</span>
            {fetching && <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />}
            {!fetching && tipoCuenta && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ok-text)",
                background: "var(--ok-bg)", border: "1px solid var(--ok-border)",
                borderRadius: 4, padding: "1px 6px", marginLeft: 4 }}>
                valor actual: {tipoCuenta}
              </span>
            )}
          </label>
          <select value={tipoCuenta} onChange={e => { setTipoCuenta(e.target.value); setError(""); }}
            style={{
              padding: "7px 10px", borderRadius: 6, fontSize: 13,
              border: `1px solid ${error && !tipoCuenta ? "var(--inc)" : tipoCuenta ? "var(--ok-border)" : "var(--border)"}`,
              background: "var(--bg)", color: "var(--text)", outline: "none", fontFamily: "var(--sans)",
            }}>
            {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Matrícula */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>
            Matrícula
            {matriculaRequired() && <span style={{ color: "var(--inc)" }}> *</span>}
            {tipoCuenta === "Servicio" && (
              <span style={{ fontWeight: 400, color: "var(--text3)", fontSize: 11, marginLeft: 6 }}>
                (auto-completado con usuario)
              </span>
            )}
          </label>
          <input ref={matriculaRef} type="text" value={matricula}
            onChange={e => { setMatricula(e.target.value); setError(""); }}
            readOnly={tipoCuenta === "Servicio"}
            placeholder={
              tipoCuenta === "Servicio" ? "Igual al usuario"
              : matriculaRequired() ? "Obligatorio" : "Opcional"
            }
            style={{
              padding: "7px 10px", borderRadius: 6, fontSize: 13,
              border: `1px solid ${error && matriculaRequired() && !matricula.trim()
                ? "var(--inc)" : "var(--border)"}`,
              background: tipoCuenta === "Servicio" ? "var(--bg3)" : "var(--bg)",
              color: tipoCuenta === "Servicio" ? "var(--text3)" : "var(--text)",
              outline: "none", fontFamily: "var(--mono)",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 12px", background: "var(--inc-bg)",
            border: "1px solid var(--inc-border)", borderRadius: 6,
            fontSize: 12, color: "var(--inc-text)" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ fontSize: 10, color: "var(--text4)", fontFamily: "var(--mono)" }}>
          Enter para guardar · Esc para cancelar
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: "8px 18px", borderRadius: 6, fontSize: 13,
              border: "1px solid var(--border)", background: "var(--bg3)",
              color: "var(--text2)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading || saved || !usuario}
            style={{ padding: "8px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600,
              border: "none", background: saved ? "var(--ok)" : "var(--accent)",
              color: "white", cursor: loading ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s" }}>
            {loading && <span className="spinner" style={{ width: 13, height: 13,
              borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />}
            {saved ? "✓ Guardado" : loading ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
