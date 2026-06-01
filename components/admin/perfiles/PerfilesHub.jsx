"use client";

import { useRouter } from "next/navigation";

export default function PerfilesHub() {
  const router = useRouter();
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, background: "var(--bg)", padding: "48px 24px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Módulo Perfiles
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
          Selecciona una sección para comenzar
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <HubCard
          icon="📥"
          label="Recopilar Información"
          desc={<>Carga las 5 fuentes de base<br />de datos y consolidados</>}
          onClick={() => router.push("/admin/perfiles/recopilacion")}
        />
        <HubCard
          icon="🚨"
          label="Hallazgos"
          desc={<>GDH, Apps, DBs<br />y Moviper</>}
          onClick={() => router.push("/admin/perfiles/hallazgos/roles")}
        />
        <HubCard
          icon="📄"
          label="Informe"
          desc={<>Genera el informe .docx<br />de certificación de Perfiles</>}
          onClick={() => router.push("/admin/perfiles/informe")}
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
        transition: "all 0.18s",
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
