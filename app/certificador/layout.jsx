"use client";

import RoleGuard from "@/components/auth/RoleGuard";

export default function CertificadorLayout({ children }) {
  return (
    <RoleGuard>
      <div className="app">
        <main className="main">{children}</main>
      </div>
    </RoleGuard>
  );
}
