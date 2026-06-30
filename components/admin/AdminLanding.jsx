"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

const MODULES = [
  { id: "usuarios",     icon: "👥", label: "Usuarios",      sub: "Recopilación, hallazgos y certificación de accesos", route: "/admin/usuarios",     available: true  },
  { id: "privilegiados",icon: "🔒", label: "Privilegiados", sub: "Gestión de cuentas con acceso privilegiado",         route: "/admin/privilegiados", available: true },
  { id: "perfiles",     icon: "🗂", label: "Perfiles",      sub: "Administración de perfiles y roles de usuario",      route: "/admin/perfiles",     available: true  },
  { id: "herramientas",         icon: "🛠",  label: "Herramientas",          sub: "Utilidades y configuración del sistema",                              route: "/admin/herramientas",         available: false },
  { id: "politica-contrasenas", icon: "🔑", label: "Política de Contraseñas", sub: "Revisión y certificación de políticas de contraseñas corporativas",    route: "/admin/politica-contrasenas", available: true  },
];

export default function AdminLanding() {
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh",
      padding: "40px 24px", gap: 36,
    }}>
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Panel de Administración
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
          Hola, {user?.name} — selecciona un módulo para continuar
        </div>
      </div>

      {/* Grid de módulos */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 260px)",
        gap: 20,
      }}>
        {MODULES.map(m => (
          <div key={m.id}
            onClick={() => m.available && router.push(m.route)}
            style={{
              background: "var(--bg2)", border: "2px solid var(--border)",
              borderRadius: 16, padding: "28px 28px 24px",
              cursor: m.available ? "pointer" : "default",
              opacity: m.available ? 1 : 0.6,
              display: "flex", flexDirection: "column", gap: 10,
              boxShadow: "var(--shadow-sm)", transition: "all 0.18s ease",
              position: "relative",
            }}
            onMouseEnter={e => {
              if (!m.available) return;
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,130,246,0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <div style={{ fontSize: 32 }}>{m.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{m.label}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, lineHeight: 1.55 }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
