"use client";

/**
 * FuenteDetallePerfiles
 * @TODO v19: unificar con FuenteDetalle pasando `sources` y `routeBase` como props.
 * FuenteDetalle ya tiene resize, paginación y búsqueda — esta versión no.
 * Mientras tanto conviven sin duplicar lógica de negocio. — vista individual de una fuente BD del módulo Perfiles.
 * Igual que FuenteDetalle de Usuarios pero apunta a PERFILES_BD_SOURCES y
 * rutas /admin/perfiles/...
 * Datos: mockeados (getMockData) hasta que el backend esté disponible.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PERFILES_BD_SOURCES } from "@/lib/mock/perfilesBDSources";
import { useBDStatus, setBDStatus, setBDCount, setBDFechaCorte, useUIStore, useBDFechasCorte } from "@/lib/store/uiStore";
import { idbGetItem, idbSetItem, idbDelItem } from "@/lib/storage";
import { exportSheetPlano } from "@/lib/utils/excel";
import { makeRows } from "@/lib/mock/mockData";
import { useAuthStore } from "@/lib/store/authStore";
import FuenteUploadPanel from "@/components/admin/shared/FuenteUploadPanel";
import { isUploadSource, getUploadConfig } from "@/lib/constants/uploadSources";

const DATA_KEY = (id) => `prf-bd-data-${id}`;

export default function FuenteDetallePerfiles({ sourceId }) {
  const router = useRouter();
  const src = PERFILES_BD_SOURCES.find(s => s.id === sourceId);

  const status  = useBDStatus(sourceId);
  const { user } = useAuthStore();
  const isCertificador = user?.role === "certificador";
  const [rows,     setRows]     = useState(null);
  const [saved,    setSaved]    = useState(false);
  const ACUERDO_KEY = `cert-acuerdo-prf-bd-${sourceId}`;
  const [certConfirm, setCertConfirm] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`cert-acuerdo-prf-bd-${sourceId}`) === "1";
  });
  const [hydrated, setHydrated] = useState(false);
  const [error,    setError]    = useState(null);

  // Hidratar desde IndexedDB al montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await idbGetItem(DATA_KEY(sourceId));
      if (!cancelled && stored) {
        const hasRows = Array.isArray(stored) ? stored.length > 0 : Object.keys(stored).length > 0;
        setRows(stored);
        // Fix v25.1: si IDB tiene datos pero store dice idle (nueva sesión), sincronizar
        const currentStatus = useUIStore.getState().bdStatus[sourceId] ?? "idle";
        if (hasRows && (currentStatus === "idle" || currentStatus === "error")) {
          setBDStatus(sourceId, "ok");
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [sourceId]);

  const srcIdx  = PERFILES_BD_SOURCES.findIndex(s => s.id === sourceId);
  const nextSrc = PERFILES_BD_SOURCES[srcIdx + 1];
  const isLast  = !nextSrc;

  if (!src) return <div className="empty-state"><p>Fuente no encontrada.</p></div>;

  const uploadCfg = isUploadSource(sourceId) ? getUploadConfig(sourceId) : null;
  const fechaCorteSrc = useBDFechasCorte()[sourceId];

  async function handleCargar() {
    setBDStatus(sourceId, "loading");
    setError(null);
    // Fuentes mapeadas a backend real (GDH, matriz, moviper, …): GET real vía store.
    // Si falla, mostramos el panel de upload.
    if (uploadCfg) {
      try {
        await useUIStore.getState().cargarFuente(src, "prf-bd-data");
        const stored = await idbGetItem(DATA_KEY(sourceId));
        const arr = Array.isArray(stored) ? stored
          : stored && typeof stored === "object" ? (Object.values(stored).find(Array.isArray) || []) : [];
        setRows(arr);
        const st = useUIStore.getState().bdStatus[sourceId];
        if (st === "error" || !arr.length) {
          setError("Aún no se ha cargado información para esta fuente.");
        }
      } catch {
        setError("Aún no se ha cargado información para esta fuente.");
        setBDStatus(sourceId, "error");
      }
      return;
    }
    try {
      // Mock: simula carga con delay (fuentes aún no conectadas)
      await new Promise(r => setTimeout(r, 900));
      const data = makeRows(src.cols, 20);
      const today = new Date().toISOString().slice(0, 10);
      setBDFechaCorte(sourceId, today);
      setRows(data);
      setBDCount(sourceId, data.length);
      await idbSetItem(DATA_KEY(sourceId), data);
      setBDStatus(sourceId, "ok");
    } catch (err) {
      setError("Error al cargar los datos de la fuente.");
      setBDStatus(sourceId, "idle");
    }
  }

  // UX v26: al entrar a una fuente de carga manual sin datos, intentar el GET
  // automáticamente para que aparezca el panel de subida.
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (autoTriedRef.current) return;
    const _hasData = rows && rows.length > 0;
    if (uploadCfg && !isCertificador && !_hasData && status !== "loading" && status !== "ok") {
      autoTriedRef.current = true;
      handleCargar();
    }
  }, [uploadCfg, isCertificador, rows, status]);

  function handleGuardar() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (nextSrc) {
        router.push(`/admin/perfiles/recopilacion/base-datos/${nextSrc.id}`);
      } else {
        router.push("/admin/perfiles/recopilacion/consolidados");
      }
    }, 600);
  }

  function handleExportar() {
    if (!rows || rows.length === 0) return;
    exportSheetPlano(rows, src.cols, `prf-${src.id}`);
  }

  async function handleReset() {
    setRows(null);
    setSaved(false);
    setError(null);
    setBDStatus(sourceId, "idle");
    await idbDelItem(DATA_KEY(sourceId));
  }

  const cols = src.cols;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Topbar */}
      <div className="topbar" style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div className="topbar-left">
          <div className="breadcrumb">
            perfiles / recopilación / base de datos / <span>{src.label}</span>
          </div>
          <h2 className="page-title" style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>{src.icon} {src.label}</span>
            {fechaCorteSrc && (
              <span className="cutoff-pill-static" title="Fecha de corte del backend">
                📅 Corte: <strong>{String(fechaCorteSrc).split("T")[0]}</strong>
              </span>
            )}
            {!uploadCfg && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: "var(--accent)", background: "var(--accent-bg)",
                padding: "2px 8px", borderRadius: 4, fontFamily: "var(--mono)",
              }}>MOCK</span>
            )}
          </h2>
        </div>
        <div className="topbar-right" style={{ gap: 8 }}>
          {status === "ok" && (
            <>
              {!isCertificador && (
                <button className="btn-export" onClick={handleReset}>↺ Recargar</button>
              )}
              <button className="btn-export" onClick={handleExportar} disabled={!rows || rows.length === 0}>
                ↓ Exportar vista
              </button>
            </>
          )}
          {status === "idle" && (
            <button className="btn-generate" onClick={handleCargar}>
              ↓ {isCertificador ? "Cargar para validar" : "Cargar información"}
            </button>
          )}
          {status === "loading" && (
            <button className="btn-generate" disabled>
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
              Cargando…
            </button>
          )}
          {status === "ok" && !isCertificador && (
            <button
              className="btn-generate"
              onClick={handleGuardar}
              style={{ background: saved ? "var(--ok)" : undefined }}
            >
              {saved ? "✓ Guardado" : isLast
                ? "💾 Guardar y pasar a Consolidados →"
                : `💾 Guardar y continuar → ${nextSrc?.label}`}
            </button>
          )}
          {status === "ok" && isCertificador && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {certConfirm && (
                <span style={{
                  fontSize: 11, fontFamily: "var(--mono)",
                  color: "var(--ok-text)", background: "var(--ok-bg)",
                  border: "1px solid var(--ok-border)",
                  padding: "3px 10px", borderRadius: 999,
                }}>✓ Conforme</span>
              )}
              <button className="btn-generate"
                onClick={() => {
                  const next = !certConfirm;
                  setCertConfirm(next);
                  if (typeof window !== "undefined") {
                    next ? localStorage.setItem(ACUERDO_KEY, "1")
                         : localStorage.removeItem(ACUERDO_KEY);
                  }
                  setSaved(true); setTimeout(() => setSaved(false), 1800);
                }}
                style={{ background: certConfirm ? "var(--ok)" : undefined, minWidth: 150 }}>
                {certConfirm
                  ? (saved ? "✓ Guardado" : "↩ Desmarcar acuerdo")
                  : (saved ? "✓ Registrado" : "💾 Estoy de acuerdo")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {status === "loading" && (
        <div className="loading-bar"><div className="loading-bar-fill" /></div>
      )}

      {/* Error */}
      {/* Panel de upload para fuentes mapeadas cuando falta info */}
      {error && uploadCfg && !isCertificador && (
        <FuenteUploadPanel config={uploadCfg} onUploaded={handleCargar} />
      )}

      {error && !uploadCfg && (
        <div style={{
          margin: "16px 20px", padding: "12px 16px",
          background: "var(--inc-bg)", border: "1px solid var(--inc-border)",
          borderRadius: "var(--radius)", color: "var(--inc-text)", fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>❌</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", background: "none", border: "none",
              cursor: "pointer", color: "var(--inc-text)", fontWeight: 700, fontSize: 14 }}
          >✕</button>
        </div>
      )}

      {/* Empty state idle */}
      {status === "idle" && !error && (
        <div className="empty-state">
          <span className="empty-icon">{src.icon}</span>
          <p style={{ fontWeight: 600, color: "var(--text2)" }}>{src.label}</p>
          <p>Haz clic en «Cargar información» para obtener los datos de esta fuente.</p>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center",
            maxWidth: 480, marginTop: 8,
          }}>
            {src.cols.map(c => (
              <span key={c} className="source-col-pill"
                style={src.dateCols?.includes(c) ? { color: "var(--accent)", background: "var(--accent-bg)" } : {}}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      {status === "ok" && hydrated && rows && rows.length > 0 && (
        <>
          <div style={{
            padding: "8px 20px", background: "var(--ok-bg)",
            borderBottom: "1px solid var(--ok-border)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: "var(--ok-text)", fontWeight: 600 }}>
              ✓ {rows.length} registros cargados
            </span>
            <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
              · {cols.length} columnas
            </span>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "0 0 16px 0" }}>
            <table className="data-table" style={{ minWidth: "max-content", width: "100%" }}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <th key={col} style={{
                      padding: "8px 14px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "var(--text3)",
                      background: "var(--bg2)", borderBottom: "2px solid var(--border)",
                      whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
                    }}>
                      {col}
                      {src.dateCols?.includes(col) && (
                        <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 10 }}>📅</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "row-even" : "row-odd"}>
                    {cols.map(col => (
                      <td key={col} style={{ padding: "7px 14px", whiteSpace: "nowrap" }}>
                        <span className="cell-text">{row[col] ?? "—"}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {status === "ok" && hydrated && rows && rows.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Los datos se cargaron pero la fuente no devolvió registros.</p>
        </div>
      )}
    </div>
  );
}
