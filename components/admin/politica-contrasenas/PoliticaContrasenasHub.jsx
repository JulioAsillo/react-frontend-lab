"use client";

import { useRouter } from "next/navigation";

const ITEMS = [
  {
    id: "informe",
    icon: "📄",
    label: "Informe de Certificación",
    sub: "Carga de imágenes y generación del informe de política de contraseñas",
    route: "/admin/politica-contrasenas/informe",
    available: true,
  },
];

export default function PoliticaContrasenasHub() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: "48px 24px",
        gap: 40,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            fontSize: 36,
            marginBottom: 12,
          }}
        >
          🔑
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Política de Contraseñas
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            lineHeight: 1.6,
          }}
        >
          Módulo de revisión y certificación de políticas de contraseñas
          corporativas. Permite cargar evidencia fotográfica y generar el
          informe de certificación correspondiente.
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 640,
        }}
      >
        {ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => item.available && router.push(item.route)}
            style={{
              background: "var(--bg2)",
              border: "2px solid var(--border)",
              borderRadius: 16,
              padding: "28px 28px 24px",
              cursor: item.available ? "pointer" : "default",
              opacity: item.available ? 1 : 0.65,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.18s ease",
              position: "relative",
              width: 280,
            }}
            onMouseEnter={(e) => {
              if (!item.available) return;
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(59,130,246,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <div style={{ fontSize: 32 }}>{item.icon}</div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text3)",
                  marginTop: 4,
                  lineHeight: 1.55,
                }}
              >
                {item.sub}
              </div>
            </div>
            {item.badge && (
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--mono)",
                  color: "var(--text4)",
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  padding: "2px 8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div
        style={{
          maxWidth: 480,
          padding: "12px 16px",
          background: "var(--accent-bg)",
          border: "1px solid var(--accent2)",
          borderRadius: "var(--radius)",
          fontSize: 11,
          color: "var(--accent)",
          fontFamily: "var(--mono)",
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        📌 El Informe de Certificación de este módulo se generará a partir de
        imágenes capturadas desde una carpeta interna.
      </div>
    </div>
  );
}
