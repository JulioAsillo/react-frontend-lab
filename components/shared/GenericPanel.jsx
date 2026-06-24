"use client";

/**
 * GenericPanel — orquesta la generación y exportación de un reporte.
 *
 * Cambios v9 vs v8:
 *   - El raw del reporte vive en reportesStore (Zustand + IndexedDB), no en
 *     usePersistedState. Esto soporta datasets de varios MB sin pegar el
 *     límite de localStorage.
 *   - El fetch va a useReporteMutation (SWR mutation): cancelación,
 *     deduplicación y estados estandarizados gratis.
 *   - El flag de loading se publica al uiStore (en lugar de un CustomEvent
 *     manual sobre localStorage). El sidebar reacciona automáticamente.
 *
 * La UX es idéntica: misma topbar, mismos modales, mismo empty state.
 */

import { useState, useMemo, useEffect } from "react";
import { useReporteRaw, useReportesStore, useFechaCorte } from "@/lib/store/reportesStore";
import { useReporteMutation } from "@/lib/hooks/useReporteMutation";
import { flattenData } from "@/lib/utils/flattenData";
import { exportAllToExcel } from "@/lib/utils/excel";
import { ESCENARIOS_ORDEN } from "@/lib/constants/reportes";
import { useAuthStore } from "@/lib/store/authStore";
import DataTable from "@/components/shared/DataTable";
import TableSkeleton from "@/components/shared/TableSkeleton";
import ConfirmModal from "@/components/shared/ConfirmModal";

function formatCutoff(iso) {
  if (!iso) return "";
  // Acepta "YYYY-MM-DD" o ISO completo. Devuelve "DD/MM/YYYY".
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(iso);
}

function GenerateResultModal({ result, onClose, consolidadoRoute }) {
  if (!result) return null;
  const isOk = result.type === "success";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>{isOk ? "✅" : "❌"}</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em",
          color: isOk ? "var(--ok-text)" : "var(--inc-text)" }}>
          {isOk ? "¡Reporte generado!" : "No se pudo generar el reporte"}
        </div>
        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65,
          textAlign: "center", maxWidth: 320 }}>
          {isOk
            ? <>Se cargaron <strong>{result.rowCount.toLocaleString()} registros</strong> correctamente. Revisa los escenarios en las hojas de abajo.</>
            : result.message}
        </div>
        {isOk && (
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
            <span>📊 {result.rowCount} filas</span>
            <span>✔ Listo para certificar</span>
          </div>
        )}
        <button className={`modal-btn ${isOk ? "modal-success" : "modal-confirm"}`}
          onClick={onClose} style={{ width: "100%", marginTop: 4 }}>
          {isOk ? "Ver reporte" : "Entendido"}
        </button>
        {isOk && consolidadoRoute && (
          <a href={consolidadoRoute}
            style={{
              display: "block", width: "100%", marginTop: 8,
              padding: "9px 0", borderRadius: "var(--radius)",
              background: "var(--bg3)", border: "1px solid var(--border)",
              textAlign: "center", fontSize: 13, color: "var(--accent)",
              fontWeight: 600, cursor: "pointer", textDecoration: "none",
            }}>
            📋 Ir a Consolidado →
          </a>
        )}
      </div>
    </div>
  );
}

function ExportOkModal({ label, rowCount, onClose, isSheets }) {
  // label puede ser el filename completo (con .xlsx) o el nombre del reporte
  const displayName = String(label).endsWith(".xlsx") ? label : `${label}.xlsx`;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-ok-icon">📥</div>
        <div className="modal-ok-title">¡Exportación exitosa!</div>
        <div className="modal-ok-sub">
          Se descargó <strong>{displayName}</strong> con{" "}
          {isSheets
            ? <><strong>{rowCount}</strong> hoja(s) de Excel.</>
            : <><strong>{typeof rowCount === "number" ? rowCount.toLocaleString() : rowCount} filas</strong>.</>
          }
        </div>
        <button className="modal-btn modal-success" onClick={onClose} style={{ marginTop: 4 }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

function friendlyError(raw) {
  if (!raw) return "Ocurrió un error desconocido. Intenta nuevamente.";
  const lower = raw.toLowerCase();
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("failed to fetch"))
    return "No se pudo conectar con el servidor. Verifica que el backend esté activo en localhost:8000.";
  if (lower.includes("404")) return "El endpoint del reporte no existe en el servidor.";
  if (lower.includes("500") || lower.includes("internal"))
    return "El servidor tuvo un error interno al procesar el reporte. Intenta más tarde.";
  if (lower.includes("401") || lower.includes("403"))
    return "No tienes permisos para ver este reporte.";
  if (raw.length < 180) return raw;
  return "Ocurrió un error al generar el reporte. Intenta nuevamente.";
}

/**
 * GenericPanel soporta dos modos de TableComponent:
 *
 *   Modo "rows" (default, DataTable):
 *     Recibe { rows, persistKey } — rawData aplanado con flattenData.
 *     Export: multi-hoja por escenario canónico.
 *
 *   Modo "rawData" (DataTableUsuarios, DataTablePerfiles):
 *     Recibe { rawData, persistKey } — estructura { sheetKey: rows[] } intacta.
 *     Identificado por la prop estática useRawData=true en el componente.
 *     Export: delega al exportFn del panel (pasado como prop "onExportAll").
 */
export default function GenericPanel({
  reporte,
  persistKey,
  breadcrumb,
  TableComponent,
  tableProps,
  useFechaCorteOverride,
  onExportAll,          // fn(rawData, persistKey, label) → { ok, sheets, filename }
  section,              // prefijo del breadcrumb (ej. "usuarios", "perfiles", "privilegiados")
  consolidadoRoute,     // si se pasa, el modal post-generación muestra botón "Ir a Consolidado"
}) {
  const Table = TableComponent ?? DataTable;
  // Si el componente de tabla usa rawData directamente (no rows planos)
  const tableUsesRaw = Boolean(TableComponent?.useRawData);

  const [fecha,       setFecha]       = useState(new Date().toISOString().slice(0, 10));
  const [mounted,     setMounted]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [genResult,   setGenResult]   = useState(null);
  const [exportOk,    setExportOk]    = useState(null);
  // localLoading: se activa en el mismo tick del clic para feedback visual inmediato
  // (isMutating de SWR puede tardar un frame en actualizarse)
  const [localLoading, setLocalLoading] = useState(false);

  const { user } = useAuthStore();
  const isCertificador = user?.role === "certificador";

  const rawData  = useReporteRaw(persistKey);
  const hydrated = useReportesStore(s => s.hydrated[persistKey] ?? false);
  const fechaCorteStore    = useFechaCorte(persistKey);
  const fechaCorteOverride = useFechaCorteOverride ? useFechaCorteOverride(persistKey) : undefined;
  const fechaCorte         = fechaCorteStore ?? fechaCorteOverride;
  const { generar, isMutating } = useReporteMutation(persistKey);

  useEffect(() => { setMounted(true); }, []);

  // Restaurar la fecha seleccionada desde la fecha de corte cacheada (IDB →
  // reportesStore). useFechaCorte hidrata async: cuando llega un valor, el
  // input de fecha deja de mostrar "hoy" y refleja el corte real con el que se
  // generó el reporte. Solo dispara cuando fechaCorte cambia, así no pisa una
  // selección manual en curso del usuario (que aún no ha regenerado).
  useEffect(() => {
    if (fechaCorte) setFecha(fechaCorte);
  }, [fechaCorte]);

  const rows = useMemo(() => flattenData(rawData), [rawData]);
  const hasData     = rawData !== null && rawData !== undefined;
  const isHydrating = mounted && !hydrated;

  // Para mostrar el botón de export: rows.length en modo rows, o al menos una
  // clave con datos en modo rawData.
  const hasVisibleData = tableUsesRaw
    ? hasData && typeof rawData === "object" && Object.values(rawData).some(v => Array.isArray(v) && v.length > 0)
    : rows.length > 0;

  function handleGenerarClick() {
    if (hasData) setShowConfirm(true);
    else doFetch();
  }

  async function doFetch() {
    setShowConfirm(false);
    setGenResult(null);
    setLocalLoading(true);
    try {
      const rowCount = await generar({
        endpoint: reporte.endpoint,
        needsDate: reporte.needsDate,
        fecha,
      });
      setGenResult({ type: "success", rowCount });
    } catch (e) {
      setGenResult({ type: "error", message: friendlyError(e?.message) });
    } finally {
      setLocalLoading(false);
    }
  }

  function handleExport() {
    if (!hasData) return;

    // Modo rawData: delegar al exportFn del panel
    if (tableUsesRaw && onExportAll) {
      const result = onExportAll(rawData, persistKey, reporte.label);
      if (result?.ok) setExportOk(result);
      return;
    }

    // Modo rows: export multi-hoja por escenario (comportamiento original)
    if (rows.length === 0) return;
    const isFlat = TableComponent && TableComponent.name === "DataTablePlano";
    if (isFlat) {
      exportAllToExcel(rows, null, reporte.label, persistKey);
    } else {
      const availableScenarios = ESCENARIOS_ORDEN.filter((s) =>
        rows.some((r) => r[s.badgeCol] != null && r[s.badgeCol] !== "")
      );
      exportAllToExcel(rows, availableScenarios, reporte.label, persistKey);
    }
    setExportOk({ ok: true, filename: `${reporte.label}.xlsx`, sheets: null });
  }

  return (
    <div className="panel">
      {showConfirm && (
        <ConfirmModal
          title="¿Regenerar reporte?"
          message="Se borrarán todas las validaciones, filtros y configuración guardados. Esta acción no se puede deshacer."
          onConfirm={doFetch}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {genResult && <GenerateResultModal result={genResult} onClose={() => setGenResult(null)} consolidadoRoute={consolidadoRoute} />}
      {exportOk && (
        <ExportOkModal
          label={exportOk.filename ?? reporte.label}
          rowCount={tableUsesRaw ? (exportOk.sheets ?? 0) : rows.length}
          onClose={() => setExportOk(null)}
          isSheets={tableUsesRaw}
        />
      )}

      {(isMutating || localLoading) && <div className="loading-bar"><div className="loading-bar-fill" /></div>}

      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">{section ? <>{section} / </> : null}<span>{breadcrumb}</span></div>
          <h2 className="page-title">
            {reporte.label}
            {!reporte.needsDate && fechaCorte && (
              <span className="cutoff-pill" title="Fecha de corte de los datos">
                📅 Datos al {formatCutoff(fechaCorte)}
              </span>
            )}
          </h2>
        </div>
        <div className="topbar-right">
          {!reporte.needsDate && (fechaCorte || fechaCorteOverride) && (
            <div className="cutoff-pill-static" title="Fecha de corte de los datos">
              <span style={{ fontSize: 13 }}>📅</span>
              <span>Corte: <strong>{fechaCorte ?? fechaCorteOverride}</strong></span>
            </div>
          )}
          {reporte.needsDate && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {hasVisibleData && (
                <span className="cutoff-pill-static" title="Fecha de corte seleccionada">
                  <span style={{ fontSize: 12 }}>📅</span>
                  <span style={{ fontSize: 12 }}>
                    Corte: <strong>{formatCutoff(fecha)}</strong>
                  </span>
                </span>
              )}
              <input type="date" className="date-pill" value={fecha}
                onChange={e => setFecha(e.target.value)} />
            </div>
          )}
          {mounted && hasVisibleData && (
            <button className="btn-export" onClick={handleExport}>Exportar reporte</button>
          )}
          {isCertificador ? (
            // Certificador: puede generar reporte con fecha si needsDate=true,
            // y siempre tiene botón Guardar validaciones
            <>
              {reporte.needsDate && (
                <button className="btn-generate" onClick={handleGenerarClick}
                  disabled={isMutating || localLoading}
                  style={{ background: "var(--accent2)", borderColor: "var(--accent2)" }}>
                  {(isMutating || localLoading)
                    ? <><span className="spinner" />Cargando…</>
                    : "Generar reporte"}
                </button>
              )}
            </>
          ) : (
            <button className="btn-generate" onClick={handleGenerarClick} disabled={isMutating || localLoading}>
              {(isMutating || localLoading) ? <><span className="spinner" />Cargando…</> : "Generar reporte"}
            </button>
          )}
        </div>
      </div>

      {(!mounted || isHydrating) && <TableSkeleton cols={8} rows={6} />}

      {mounted && !isHydrating && !hasData && !isMutating && (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>{reporte.needsDate
            ? "Selecciona una fecha y haz clic en «Generar reporte»."
            : "Haz clic en «Generar reporte» para cargar los datos."}</p>
        </div>
      )}
      {(isMutating || localLoading) && !hasData && <TableSkeleton cols={8} rows={12} />}

      {/* Tabla en modo rawData */}
      {mounted && !isHydrating && hasData && tableUsesRaw && (
        <Table rawData={rawData} persistKey={persistKey} {...(tableProps || {})} />
      )}

      {/* Tabla en modo rows */}
      {mounted && !tableUsesRaw && rows.length > 0 && (
        <Table rows={rows} persistKey={persistKey} {...(tableProps || {})} />
      )}
      {mounted && !tableUsesRaw && hasData && rows.length === 0 && !isMutating && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>El reporte se generó pero no contiene filas con datos.</p>
        </div>
      )}
    </div>
  );
}
