"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, homeFor } from "@/lib/store/authStore";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const role   = params.get("role") ?? "certificador";

  const { user, login, ready } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(homeFor(user.role));
  }, [ready, user, router]);

  const isAdmin    = role === "admin";
  const isUsuario  = role === "usuario";
  const accentCol  = isAdmin ? "#3b82f6" : isUsuario ? "#7c3aed" : "#10b981";
  const roleLabel  = isAdmin ? "Administrador" : isUsuario ? "Usuario Visualizador" : "Usuario Certificador";
  const roleIcon   = isAdmin ? "🔑" : isUsuario ? "📊" : "👤";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await login(username.trim(), password);
      if (!ok) {
        setError("Usuario o contraseña incorrectos.");
        setLoading(false);
      }
    } catch {
      setError("Ocurrió un error al iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} style={{ gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "linear-gradient(135deg,#2563eb,#60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 11, color: "#fff",
          }}>ISO</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>ITSecOps</div>
            <div style={{ fontSize: 10, color: "var(--text4)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Security Operations</div>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 10,
          background: `${accentCol}14`, border: `1px solid ${accentCol}30`,
        }}>
          <span style={{ fontSize: 16 }}>{roleIcon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: accentCol }}>{roleLabel}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>Ingresa tus credenciales para continuar</div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }} />

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="iso-user">Usuario</label>
          <input id="iso-user" className="auth-input" type="text"
            placeholder="tu.usuario" value={username}
            onChange={e => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="iso-pass">Contraseña</label>
          <input id="iso-pass" className="auth-input" type="password"
            placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} />
        </div>

        <button className="auth-btn" type="submit" disabled={loading}
          style={{ background: isAdmin ? "var(--accent)" : "#10b981" }}>
          {loading ? "Verificando…" : "Ingresar"}
        </button>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button type="button"
            onClick={() => router.push("/select-role")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "var(--text4)", fontFamily: "var(--sans)",
              textDecoration: "underline",
            }}>
            ← Cambiar perfil
          </button>
        </div>

        <div className="auth-hint">
          <strong>Demo:</strong>&nbsp; admin/admin123 &nbsp;·&nbsp; certificador/cert123 &nbsp;·&nbsp; usuario/usu123
        </div>
      </form>
    </div>
  );
}

export default function LoginScreen() {
  return (
    <Suspense fallback={<div className="auth-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
