"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import CertificadorSidebar from "@/components/layout/CertificadorSidebar";

export default function CertificadorLayout({ children }) {
  return (
    <RoleGuard>
      <div className="app">
        <CertificadorSidebar />
        <main className="main">{children}</main>
      </div>
    </RoleGuard>
  );
}
