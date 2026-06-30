"use client";

import { useRouter } from "next/navigation";

export default function RecopilacionUsuariosHub() {
  const router = useRouter();
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, background: "var(--bg)", padding: "48px 24px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Recopilar Información
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
          Selecciona el tipo de carga de datos
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <HubCard
          icon="🗄"
          label="Base de Datos"
          desc={<>Carga las 10 fuentes:<br />GDH, Entra ID, AD, DBs y Apps</>}
          onClick={() => router.push("/admin/usuarios/recopilacion/base-datos")}
        />
        <HubCard
          icon="📊"
          label="Consolidados"
          desc={<>Clasificación de cuentas<br />y registro de Post Ceses</>}
          onClick={() => router.push("/admin/usuarios/recopilacion/consolidados")}
        />
      </div>
    </div>
  );
}

function HubCard({ icon, label, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg2)", border: "2px solid var(--border)",
        borderRadius: 16, padding: "36px 40px", minWidth: 220,
        textAlign: "center", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        boxShadow: "var(--shadow-sm)", transition: "all 0.18s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}
