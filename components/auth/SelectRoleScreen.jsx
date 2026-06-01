"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore, homeFor } from "@/lib/store/authStore";

export default function SelectRoleScreen() {
  const router = useRouter();
  const { user, ready } = useAuthStore();

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace(homeFor(user.role));
  }, [ready, user, router]);

  if (!ready) return null;

  return (
    <div className="auth-screen">
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 36, padding: "48px 24px", width: "100%", maxWidth: 920,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg,#2563eb,#60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "#fff",
            boxShadow: "0 4px 18px rgba(37,99,235,0.35)",
          }}>ISO</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>ITSecOps</div>
            <div style={{ fontSize: 11, color: "var(--text4)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Security Operations Platform
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            ¿Cómo deseas ingresar?
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
            Selecciona tu perfil para continuar
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          <RoleCard
            icon="🔑"
            label="Administrador"
            desc="Gestión de usuarios, accesos y todas las operaciones del sistema"
            accent="#3b82f6"
            onClick={() => router.push("/login?role=admin")}
          />
          <RoleCard
            icon="👤"
            label="Certificador"
            desc="Revisión y validación de hallazgos de seguridad asignados"
            accent="#10b981"
            onClick={() => router.push("/login?role=certificador")}
          />
          <RoleCard
            icon="📊"
            label="Usuario"
            desc="Visualización del histórico de hallazgos y KPIs en dashboards"
            accent="#7c3aed"
            onClick={() => router.push("/login?role=usuario")}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, label, desc, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg2)", border: "2px solid var(--border)",
        borderRadius: 16, padding: "28px 28px", minWidth: 230, maxWidth: 270, flex: 1,
        cursor: "pointer", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        boxShadow: "var(--shadow-sm)", transition: "all 0.18s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 8px 28px ${accent}28`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `${accent}18`, border: `1.5px solid ${accent}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{desc}</div>
      </div>
      <div style={{
        marginTop: 4, fontSize: 12, fontWeight: 600,
        color: accent, fontFamily: "var(--mono)",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        Continuar →
      </div>
    </div>
  );
}
