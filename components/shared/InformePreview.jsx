"use client";
/**
 * InformePreview (compartido)
 *
 * Render en vivo del informe .docx vía docx-preview. Antes existían 3 copias casi
 * idénticas (usuarios/privilegiados/perfiles) que solo diferían en el endpoint.
 * Ahora es UN solo componente parametrizado por `endpoint`.
 *
 * Vista previa en TIEMPO REAL con debounce:
 * - Cuando `payload` cambia (el usuario escribe), se espera `debounceMs`
 * antes de pedir el documento. Así se actualiza solo, sin clic, pero sin
 * disparar un fetch por cada tecla.
 * - El botón "Vista previa" del padre sigue funcionando como refresco manual
 * inmediato (fuerza un nuevo payload → render sin esperar el debounce sería
 * ideal; aquí el cambio de payload simplemente reinicia el temporizador).
 *
 * Props:
 * payload {object} valores del formulario (lo arma el padre)
 * visible {boolean}
 * endpoint {string} ruta API que genera el .docx
 * debounceMs {number} espera tras el último cambio (default 700)
 */
import { useEffect, useRef, useState, useCallback } from "react";

const RENDER_OPTIONS = {
  className: "docx-preview-content", inWrapper: true,
  ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
  breakPages: true, renderHeaders: true, renderFooters: true,
  renderFootnotes: true, experimental: true, trimXmlDeclaration: true,
};

export default function InformePreview({ payload, visible, endpoint = "/api/generar-informe", debounceMs = 700 }) {
  const containerRef = useRef(null);
  const scrollRef    = useRef(null);
  const abortRef     = useRef(null);
  const debounceRef  = useRef(null);

  const [status,     setStatus]     = useState("idle");
  const [errorMsg,   setErrorMsg]   = useState("");
  const [lastRender, setLastRender] = useState(null);

  const renderPreview = useCallback(async (values) => {
    if (!containerRef.current) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const savedScroll = scrollRef.current?.scrollTop ?? 0;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const { renderAsync } = await import("docx-preview");
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current, null, RENDER_OPTIONS);
        setStatus("ok");
        setLastRender(new Date());
        if (scrollRef.current && savedScroll > 0) scrollRef.current.scrollTop = savedScroll;
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setStatus("error");
      setErrorMsg(err.message || "Error al previsualizar");
    }
  }, [endpoint]);

  // Debounce: re-render cuando el payload cambia, esperando a que el usuario
  // deje de escribir. Tiempo real sin saturar el backend.
  useEffect(() => {
    if (!visible || !payload) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { renderPreview(payload); }, debounceMs);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [payload, visible, debounceMs, renderPreview]);

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  if (!visible) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "var(--bg3)", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {status === "loading" && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text2)" }}>
            <span className="spinner" style={{ width: 12, height: 12 }} /> Actualizando vista previa…
          </span>
        )}
        {status === "ok" && lastRender && (
          <span style={{ fontSize: 11, color: "var(--ok-text)", fontFamily: "var(--mono)" }}>
            ✓ En vivo · {lastRender.toLocaleTimeString("es-PE")}
          </span>
        )}
        {status === "idle" && (
          <span style={{ fontSize: 11, color: "var(--text4)", fontStyle: "italic" }}>
            Empieza a escribir o pulsa «👁 Vista previa» para cargar
          </span>
        )}
        {status === "error" && (
          <span style={{ fontSize: 11, color: "var(--inc-text)" }}>❌ {errorMsg}</span>
        )}
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "20px", minHeight: 0 }}>
        <style>{`
          .docx-preview-content section.docx { background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); margin: 0 auto 20px auto; border-radius: 2px; }
          .docx-preview-content { font-family: var(--sans); }
        `}</style>
        <div ref={containerRef} />
      </div>
    </div>
  );
}
