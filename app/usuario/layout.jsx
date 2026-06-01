"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import UsuarioSidebar from "@/components/layout/UsuarioSidebar";

export default function UsuarioLayout({ children }) {
  return (
    <RoleGuard>
      <div className="app">
        <UsuarioSidebar />
        <main className="main">{children}</main>
      </div>
    </RoleGuard>
  );
}
