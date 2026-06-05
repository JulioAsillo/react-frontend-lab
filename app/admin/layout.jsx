"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { useSidebarHidden, useToggleSidebar } from "@/lib/store/prefsStore";

/**
 * AdminLayout — sirve a dos roles (admin / certificador).
 * Ambos usan el MISMO AdminSidebar (navegación idéntica). El sidebar oculta
 * internamente solo "Gestión de Usuarios" para el certificador. Así no hay
 * dos sidebars que mantener en paralelo y la paridad es por construcción.
 * El sidebar se puede ocultar a gusto del usuario (persistido en prefsStore);
 * cuando está oculto aparece un botón flotante «☰» para reabrirlo.
 */
function AdminLayoutInner({ children }) {
  const hidden = useSidebarHidden();
  const toggleSidebar = useToggleSidebar();

  return (
    <div className="app">
      {!hidden && <AdminSidebar />}
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
