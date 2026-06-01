"use client";

/**
 * UsuarioSidebar — v21.0
 * Sidebar para el rol `usuario` (visualizador).
 *
 * Cambios v21:
 *   - Se añade enlace "Informe de Certificación" → /usuario/informe
 *     El rol usuario puede generar el informe en .docx desde aquí.
 */

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

const NAV = [
  { key: "dashboard", label: "Dashboard KPIs",            icon: "📊", route: "/usuario/dashboard" },
  { key: "historico", label: "Histórico Hallazgos",       icon: "📈", route: "/usuario/historico" },
  { key: "informe",   label: "Informe de Certificación",  icon: "📄", route: "/usuario/informe"   },
];

export default function UsuarioSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.replace("/select-role");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">▪</span>
          <span className="sidebar-brand-text">ITSecOps</span>
        </div>
        <div className="sidebar-role-badge sidebar-role-usuario">Usuario</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const active = pathname === item.route || pathname.startsWith(item.route + "/");
          return (
            <button
              key={item.key}
              className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
              onClick={() => router.push(item.route)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{user?.name ?? "—"}</div>
          <div className="sidebar-user-meta">@{user?.username}</div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
        <span className="sidebar-version">v24.0.0 · ITSecOps</span>
      </div>
    </aside>
  );
}
