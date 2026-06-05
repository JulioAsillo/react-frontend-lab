"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import ConfirmModal from "@/components/shared/ConfirmModal";

/**
 * ExtraerInfoButton — botón "Extraer Información" con ícono de bot.
 *
 * Visibilidad:
 *   - Solo rol ADMIN (el certificador y otros roles nunca lo ven).
 *   - Solo en fuentes NO manuales (esManual = false).
 *
 * Acción (al confirmar el modal):
 *   PASO 1 → POST al endpoint de extracción (botEndpoint) y esperar respuesta.
 *   PASO 2 → solo si la respuesta trae status === "SUCCESS", vuelve a consultar
 *            la fuente (reloadFn = la misma recarga que el botón "Recargar").
 *   Si no es SUCCESS o falla, NO recarga y avisa con un toast.
 *
 * Si la fuente no tiene endpoint asignado (extracción PENDIENTE), el botón se
 * muestra deshabilitado con un tooltip explicativo.
 */
export default function ExtraerInfoButton({ botEndpoint, reloadFn, esManual = false, disabled = false, style = {} }) {
  const { user } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null); // { tipo: 'ok' | 'error', msg }

  if (user?.role !== "admin") return null;
  if (esManual) return null;

  const pendiente = !botEndpoint;

  function flash(tipo, msg) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3800);
  }

  async function handleExtraer() {
    setShowConfirm(false);
    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // PASO 1 — activar el bot (POST) y esperar la respuesta
      const res  = await fetch(`${base}${botEndpoint}`, { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.status !== "SUCCESS") {
        flash("error", `No se pudo extraer la información${data?.status ? ` (${data.status})` : ""}.`);
        return;
      }

      // PASO 2 — SUCCESS: volver a consultar la fuente (igual que "Recargar")
      const totReg = Array.isArray(data.ejecutados)
        ? data.ejecutados.reduce((a, e) => a + (Number(e.registros) || 0), 0)
        : null;
      await reloadFn?.();
      flash("ok", totReg != null
        ? `Extracción completada: ${totReg.toLocaleString("es-PE")} registros.`
        : "Extracción completada.");
    } catch (e) {
      console.error("[Extraer Información] error:", e);
      flash("error", "Error de conexión al ejecutar la extracción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="btn-export"
        onClick={() => setShowConfirm(true)}
        disabled={busy || disabled || pendiente}
        title={pendiente
          ? "Extracción aún no habilitada para esta fuente"
          : "Activar el bot y extraer la información actualizada"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden>🤖</span>
        {busy ? "Extrayendo…" : "Extraer Información"}
      </button>

      {showConfirm && (
        <ConfirmModal
          title="¿Extraer información actualizada?"
          message="Esta acción ejecutará el bot y traerá información más actualizada, con una nueva fecha de corte, reemplazando la información actual. ¿Desea proceder?"
          onConfirm={handleExtraer}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {toast && (
        <div className="save-toast" style={toast.tipo === "error"
          ? { background: "var(--inc)", borderColor: "var(--inc)" } : undefined}>
          {toast.tipo === "error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}
    </>
  );
}
