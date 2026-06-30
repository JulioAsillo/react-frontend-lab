"use client";

/**
 * UsuariosHub
 *
 * Hub principal del módulo Usuarios.
 * Muestra 3 tarjetas para admin: Recopilar, Hallazgos, Informe.
 * Muestra 2 tarjetas para certificador: Recopilar, Hallazgos.
 * (El certificador no puede generar el informe — restricción de negocio.)
 */

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function UsuariosHub() {
  const router = useRouter();
  const { user } = useAuthStore();
  const canGenerarInforme = user?.role !== "certificador";

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, background: "var(--bg)", padding: "48px 24px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Módulo: Usuarios
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>
          ¿Qué deseas hacer?
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        <HubCard
          icon="📥"
          label="Recopilar Información"
          desc={<>Carga los datos desde las fuentes:<br />BD, AD, Entra ID, Apps</>}
          onClick={() => router.push("/admin/usuarios/recopilacion")}
        />
        <HubCard
          icon="🔍"
          label="Hallazgos"
          desc={<>Revisa y certifica los hallazgos<br />por escenario</>}
          onClick={() => router.push("/admin/usuarios/hallazgos/cesados")}
        />
        {canGenerarInforme && (
          <HubCard
            icon="📄"
            label="Informe de Certificación"
            desc={<>Genera el informe mensual<br />de certificación en .docx</>}
            onClick={() => router.push("/admin/usuarios/informe")}
          />
        )}
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
