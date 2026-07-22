"use client";

/**
 * FuenteDetallePriv
 *
 * Vista individual de cada fuente de Recopilación de Privilegiados.
 * Sigue el mismo patrón del FuenteDetalle compartido (components/shared):
 * - Carga vía cargarFuente() del uiStore
 * - Persiste en IndexedDB con prefijo "priv-data"
 * - Paginación, búsqueda, filtros Excel (ThCell), resize de columnas
 * - Vistas especiales para server-linux y server-windows
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PRIV_BD_SOURCES } from "@/lib/mock/privBDSources";
import { normalizeSource } from "@/lib/mock/sourceCols";
import { useBDStatus, useBDError, useUIStore } from "@/lib/store/uiStore";
import FuenteUploadPanel from "@/components/admin/shared/FuenteUploadPanel";
import { isUploadSource, getUploadConfig } from "@/lib/constants/uploadSources";
import { idbGetItem, idbDelItem } from "@/lib/storage";
import { formatFechaHora } from "@/lib/utils/formatFecha";
import { useAuthStore } from "@/lib/store/authStore";
import ExtraerInfoButton from "@/components/shared/ExtraerInfoButton";
import { getBotEndpoint } from "@/lib/constants/extraccionEndpoints";
import { splitStored, prettyColl } from "@/lib/utils/collections";
import ServerView from "./ServerView";
import StandardTableView from "@/components/shared/StandardTableView";

const DATA_KEY  = (id) => `priv-data-${id}`;

// Fuentes que el backend ya trae completas: el bot "Extraer Información" no aplica
// y por eso el botón no se muestra (ni deshabilitado).
const SIN_EXTRACCION_BOT = new Set(["local-admin-ad", "domain-admin-ad"]);



// ── Componente principal ───────────────────────────────────────────────────────
// splitStored y prettyColl canónicos en lib/utils/collections.

export default function FuenteDetallePriv({ sourceId }) {
  const router = useRouter();
  // Memoizado por la misma razón que en FuenteDetalle: normalizeSource
  // retorna un objeto nuevo por llamada y hay efectos con `src` en deps.
  const src = useMemo(
    () => normalizeSource(PRIV_BD_SOURCES.find(s => s.id === sourceId)),
    [sourceId]
  );

  const status       = useBDStatus(sourceId);
  const errorMsg     = useBDError(sourceId);
  const cargarFuente = useUIStore(s => s.cargarFuente);
  const setBDStatus  = useUIStore(s => s.setBDStatus);
  const { user }     = useAuthStore();
  const isCertificador = user?.role === "certificador";

  const [rows,       setRows]       = useState([]);
  // Soporte multi-colección (ej. GDH: gdh_activos + gdh_cesados).
  // collections = { nombreColeccion: filas[] } | null  ·  activeColl = clave activa
  const [collections, setCollections] = useState(null);
  const [activeColl,  setActiveColl]  = useState(null);
  const [fechaCorte, setFechaCorte] = useState(null);
  const [hydrated,   setHydrated]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reupload,    setReupload]    = useState(false);
  const [savedCert,  setSavedCert]  = useState(false);
  const ACUERDO_KEY_PRIV = `cert-acuerdo-priv-bd-${sourceId}`;
  const [certConfirm, setCertConfirm] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`cert-acuerdo-priv-bd-${sourceId}`) === "1";
  });

  const srcIdx = PRIV_BD_SOURCES.findIndex(s => s.id === sourceId);
  const nextSrc = PRIV_BD_SOURCES[srcIdx + 1];

  // Hidratar desde IDB
  useEffect(() => {
    if (!src) { setHydrated(true); return; }
    (async () => {
      const stored = await idbGetItem(DATA_KEY(sourceId));
      const storedFc = await idbGetItem(DATA_KEY(sourceId) + "-fc");
      if (stored) {
        const { rows: r, collections: coll } = splitStored(stored, src);
        setRows(r);
        setCollections(coll);
        setActiveColl(coll ? Object.keys(coll)[0] : null);
        // Fix v25.1: si IDB tiene datos pero el store dice idle (nueva sesión), sincronizar
        const currentStatus = useUIStore.getState().bdStatus[sourceId] ?? "idle";
        const anyData = r.length > 0 || (coll && Object.values(coll).some(v => v.length > 0));
        if (anyData && (currentStatus === "idle" || currentStatus === "error")) {
          setBDStatus(sourceId, "ok");
        }
      }
      if (storedFc) setFechaCorte(storedFc);
      setHydrated(true);
    })();
  }, [sourceId, src]);

  // Cuando status vuelve a "ok" leer IDB
  useEffect(() => {
    if (status !== "ok" || !src) return;
    (async () => {
      const stored = await idbGetItem(DATA_KEY(sourceId));
      const storedFc = await idbGetItem(DATA_KEY(sourceId) + "-fc");
      const { rows: r, collections: coll } = splitStored(stored, src);
      setRows(r);
      setCollections(coll);
      setActiveColl(coll ? Object.keys(coll)[0] : null);
      if (storedFc) setFechaCorte(storedFc);
    })();
  }, [status, sourceId, src]);

  if (!src) return (
    <div className="empty-state">
      <span style={{ fontSize: 36 }}>❓</span>
      <p>Fuente no encontrada: <code>{sourceId}</code></p>
    </div>
  );

  const isLoading = status === "loading";
  const uploadCfg = isUploadSource(sourceId) ? getUploadConfig(sourceId) : null;
  const hasData   = rows.length > 0 ||
    (collections && Object.values(collections).some(v => v.length > 0));

  async function handleCargar() {
    await cargarFuente(
      { ...src, endpoint: src.endpoint },
      "priv-data"
    );
  }

  // UX v26: al entrar a una fuente de carga manual sin datos, intentamos el GET
  // automáticamente para que aparezca el panel de subida (en vez de "Cargar
  // información"). Solo una vez, tras hidratar, y si no es certificador.
  const autoTried = useRef(false);
  useEffect(() => {
    if (!hydrated || autoTried.current) return;
    if (uploadCfg && !hasData && status !== "loading" && status !== "ok") {
      autoTried.current = true;
      handleCargar();
    }
  }, [hydrated, uploadCfg, isCertificador, hasData, status]);

  async function handleRecargar() {
    setShowConfirm(false);
    await idbDelItem(DATA_KEY(sourceId));
    await idbDelItem(DATA_KEY(sourceId) + "-fc");
    setBDStatus(sourceId, "idle");
    setRows([]);
    setCollections(null);
    setActiveColl(null);
    setFechaCorte(null);
    await cargarFuente({ ...src, endpoint: src.endpoint }, "priv-data");
  }

  function handleContinuar() {
    if (nextSrc) {
      router.push(`/admin/privilegiados/recopilacion/base-datos/${nextSrc.id}`);
    } else {
      router.push("/admin/privilegiados/recopilacion/consolidados");
    }
  }

  return (
    <div className="recopilacion-page" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Modal de recarga */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className={`modal${uploadCfg ? " modal-reload" : ""}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            {uploadCfg ? (
              <>
                <div className="modal-title">Actualizar información</div>
                <div className="reload-options">
                  <button className="reload-option"
                    onClick={() => { setShowConfirm(false); handleRecargar(); }}>
                    <span className="reload-option-icon">↺</span>
                    <span className="reload-option-text">
                      <strong>Volver a consultar</strong>
                      <small>Trae lo más reciente sin cambiar el archivo</small>
                    </span>
                  </button>
                  <button className="reload-option"
                    onClick={() => { setShowConfirm(false); setReupload(true); }}>
                    <span className="reload-option-icon">📤</span>
                    <span className="reload-option-text">
                      <strong>Subir archivo nuevo</strong>
                      <small>Reemplaza con un Excel y su fecha de corte</small>
                    </span>
                  </button>
                </div>
                <button className="modal-link-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36 }}>🔄</div>
                <div className="modal-title">¿Recargar datos?</div>
                <div className="modal-message">Se eliminarán los datos actuales y se volverá a consultar la información.</div>
                <div className="modal-actions">
                  <button className="modal-btn modal-cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
                  <button className="modal-btn modal-confirm" onClick={handleRecargar}>Sí, recargar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="recopilacion-topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            privilegiados › recopilación › base de datos › <span>{src.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 className="page-title" style={{ margin: 0 }}>{src.icon} {src.label}</h2>
            {fechaCorte && (
              <span className="cutoff-pill-static">
                Corte: <strong>{fechaCorte ? formatFechaHora(fechaCorte) : ""}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="topbar-right">
          {!SIN_EXTRACCION_BOT.has(sourceId) && (
            <ExtraerInfoButton esManual={!!uploadCfg} botEndpoint={getBotEndpoint("privilegiados", sourceId)} reloadFn={handleRecargar} />
          )}
          {!hasData && !isLoading && (
            <button className="btn-generate" onClick={handleCargar}>
              {isCertificador ? "Cargar para validar" : "Cargar información"}
            </button>
          )}
          {hasData && !isLoading && (
            <>
              <button className="btn-export" onClick={() => setShowConfirm(true)}>↺ Recargar</button>
              {isCertificador ? (
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
                        next ? localStorage.setItem(ACUERDO_KEY_PRIV, "1")
                             : localStorage.removeItem(ACUERDO_KEY_PRIV);
                      }
                      setSavedCert(true); setTimeout(() => setSavedCert(false), 1800);
                    }}
                    style={{ background: certConfirm ? "var(--ok)" : undefined, minWidth: 150 }}>
                    {certConfirm
                      ? (savedCert ? "✓ Guardado" : "↩ Desmarcar acuerdo")
                      : (savedCert ? "✓ Registrado" : "Estoy de acuerdo")}
                  </button>
                </div>
              ) : (
                <button className="btn-generate" onClick={handleContinuar}>
                  {nextSrc ? `Continuar → ${nextSrc.label}` : "Ir a Consolidados →"}
                </button>
              )}
            </>
          )}
          {isLoading && (
            <button className="btn-generate" disabled>
              <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
              Cargando…
            </button>
          )}
        </div>
      </div>

      {/* Error: si la fuente es de upload, mostramos el panel de carga;
          si no, el error normal con reintentar. */}
      {errorMsg && !uploadCfg && (
        <div className="error-box" style={{ margin: "0 24px 12px" }}>
          {errorMsg} —{" "}
          <button className="btn-export-small" onClick={handleCargar}>Reintentar</button>
        </div>
      )}

      {/* Cuerpo */}
      {!hydrated || isLoading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ marginTop: 12, color: "var(--text3)" }}>
            {isLoading ? "Cargando datos del servidor…" : "Iniciando…"}
          </p>
        </div>
      ) : ((reupload || (!hasData && errorMsg)) && uploadCfg) ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {reupload && hasData && (
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "10px 24px 0",
            }}>
              <button className="btn-export-small" onClick={() => setReupload(false)}>
                ✕ Cancelar y volver a la tabla
              </button>
            </div>
          )}
          <FuenteUploadPanel config={uploadCfg} onUploaded={() => { setReupload(false); handleRecargar(); }} />
        </div>
      ) : !hasData ? (
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>{src.icon}</span>
          <p style={{ color: "var(--text3)", marginTop: 12 }}>
            Haz clic en «Cargar información» para obtener los datos de <strong>{src.label}</strong>.
          </p>
        </div>
      ) : (src.isSpecial === "server-linux" || src.isSpecial === "server-windows") ? (
        <ServerView rows={rows} tipo={src.isSpecial} />
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {collections && Object.keys(collections).length > 1 && (
            <div className="scenario-tabs-bar" style={{
              borderBottom: "1px solid var(--border)", padding: "0 12px",
              display: "flex", gap: 4, background: "var(--bg3)", flexShrink: 0,
            }}>
              {Object.keys(collections).map(k => (
                <button key={k}
                  className={`scenario-tab ${k === activeColl ? "scenario-tab-active" : ""}`}
                  onClick={() => { setActiveColl(k); setRows(collections[k]); }}>
                  {prettyColl(k)}
                  <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                    ({collections[k].length})
                  </span>
                </button>
              ))}
            </div>
          )}
          <StandardTableView key={activeColl || "single"} rows={rows} src={src} />
        </div>
      )}
    </div>
  );
}
