"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import AdminSidebar from "@/components/layout/AdminSidebar";
import CertificadorSidebar from "@/components/layout/CertificadorSidebar";
import { useAuthStore } from "@/lib/store/authStore";
import { useSidebarHidden, useToggleSidebar } from "@/lib/store/prefsStore";

/**
 * AdminLayout — sirve a dos roles (admin / certificador).
 * El sidebar se puede ocultar a gusto del usuario (persistido en prefsStore);
 * cuando está oculto aparece un botón flotante «☰» para reabrirlo.
 */
function AdminLayoutInner({ children }) {
  const { user } = useAuthStore();
  const hidden = useSidebarHidden();
  const toggleSidebar = useToggleSidebar();
  const Sidebar = user?.role === "certificador" ? CertificadorSidebar : AdminSidebar;

  return (
    <div className="app">
      {!hidden && <Sidebar />}
      {hidden && (
        <button className="sidebar-reopen" onClick={toggleSidebar} title="Mostrar menú" aria-label="Mostrar menú">
          ☰
        </button>
      )}
      <main className="main">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <RoleGuard>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </RoleGuard>
  );
}
