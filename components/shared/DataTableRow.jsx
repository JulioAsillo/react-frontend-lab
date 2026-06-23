"use client";

/**
 * DataTableRow — renderiza UNA fila de DataTable.
 * v16: Botón "Guardar" aparece cuando el usuario escribe en sustento
 *      (solo visual — autoguardado sigue activo; el botón da feedback).
 */

import { useState } from "react";
import Badge from "./Badge";
import { BADGE_COLS } from "@/lib/constants/badgeCols";
import { getAccionOptions } from "@/lib/constants/accionCorrectiva";

const VALIDACION_OPTS = ["Correcto", "Incorrecto", "Sustentado"];

export default function DataTableRow({
  row,
  ri,
  cols,
  colWidths,
  getVal,
  getComentario,
  setValidacion,
  setComentario,
  getAccion,
  setAccion,
  badgeCol,
  scenarioLabel,
  accionModule,
  extraEscenarioCols,
  expandedRow,
  setExpandedRow,
  rowId,
  // Ocultar columnas extra opcionales (para DataTablePrivilegiados)
  hideValidacion,
  hideComentario,
  hideAccion,
  // Props opcionales para virtualización
  trStyle,
  trRef,
  trDataIndex,
  // Callback de doble clic para modal de clasificación
  onDoubleClick,
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [localDraft, setLocalDraft] = useState(null); // null = no editing

  const badgeVal = row[badgeCol] ?? null;
  const storedVal = getVal(row);
  
  // ── Resolución de validación — cadena de fallback ────────────────────────
  // 1. storedVal      → lo que el usuario guardó explícitamente (tiene prioridad)
  // 2. escenarioVal   → columna genérica ESCENARIO (Usuarios legacy)
  // 3. extraEscCols   → columnas de escenario de Perfiles (Existe en MR, Rol Incorrecto, etc.)
  //                     Si ALGUNA es ≠ Correcto → Incorrecto
  // 4. validBadgeVal  → badgeCol (primary) si el valor es canónico
  
  const rawEscenario = row["ESCENARIO"] || row["Escenario"];
  
  let escenarioVal = null;
  if (rawEscenario !== undefined && rawEscenario !== null && String(rawEscenario).trim() !== "") {
    const v = String(rawEscenario).toUpperCase();
    escenarioVal = v === "CORRECTO" ? "Correcto" : "Incorrecto";
  }

  // Escenarios múltiples de Perfiles (extraEscenarioCols prop)
  let extraEscVal = null;
  if (!escenarioVal && extraEscenarioCols?.length) {
    const anyIncorrecto = extraEscenarioCols.some(col => {
      const v = row[col];
      if (v === undefined || v === null || String(v).trim() === "") return false;
      return String(v).trim().toUpperCase() !== "CORRECTO";
    });
    const hasAny = extraEscenarioCols.some(col =>
      row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== ""
    );
    if (hasAny) extraEscVal = anyIncorrecto ? "Incorrecto" : "Correcto";
  }

  const formatValue = (val) => {
    if (val === undefined || val === null || String(val).trim() === "") return null;
    const formatted = String(val).trim().charAt(0).toUpperCase() + String(val).trim().slice(1).toLowerCase();
    if (VALIDACION_OPTS.includes(formatted)) return formatted;
    // Si no es un valor canónico, inferimos Incorrecto/Correcto general
    return String(val).trim().toUpperCase() !== "CORRECTO" ? "Incorrecto" : "Correcto";
  };

  const validBadgeVal = formatValue(badgeVal);
  const currentVal = storedVal ?? escenarioVal ?? extraEscVal ?? validBadgeVal ?? null;
  const currentCom = getComentario(row);
  const accionOpts = getAccionOptions({ badgeCol, label: scenarioLabel, moduleKey: accionModule });
  const currentAccion = getAccion ? getAccion(row) : "";
  const isExpanded = expandedRow === rowId(row);

  // Draft local del textarea — para mostrar el botón guardar mientras se escribe
  const displayCom = localDraft !== null ? localDraft : currentCom;
  const isDirty    = localDraft !== null && localDraft !== currentCom;

  function handleComChange(e) {
    setLocalDraft(e.target.value);
    setComentario(row, e.target.value); // autoguardado inmediato
  }

  function handleGuardar() {
    // El autoguardado ya actualizó — solo damos feedback visual
    setSavedFlash(true);
    setTimeout(() => { setSavedFlash(false); setLocalDraft(null); }, 1500);
    setExpandedRow(null);
  }

  function handleBlur(e) {
    // Si el foco va al botón Guardar, no cerramos el textarea
    if (e.relatedTarget && e.relatedTarget.dataset?.guardar === "1") return;
    if (localDraft !== null) setComentario(row, localDraft);
    setLocalDraft(null);
    setExpandedRow(null);
  }

  function handleFocus() {
    setExpandedRow(rowId(row));
    if (localDraft === null) setLocalDraft(currentCom);
  }

  return (
    <tr
      ref={trRef}
      data-index={trDataIndex}
      style={{ ...(trStyle || {}), cursor: onDoubleClick ? "pointer" : undefined }}
      className={`${ri % 2 === 0 ? "row-even" : "row-odd"} ${currentVal ? "row-validated" : ""}`}
      onDoubleClick={onDoubleClick}
    >
      {cols.map((col) => (
        <td key={col} style={{ width: colWidths[col] ?? 130 }}>
          {BADGE_COLS.has(col) || col === badgeCol ? (
            <Badge value={row[col]} />
          ) : (
            <span className="cell-text">{row[col] ?? "—"}</span>
          )}
        </td>
      ))}

      {/* Validación */}
      {!hideValidacion && (
      <td
        className="td-validation"
        style={{ width: colWidths["__validacion__"] ?? 155 }}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          className={`val-select ${currentVal ? `val-select-${currentVal.toLowerCase()}` : ""}`}
          value={currentVal ?? ""}
          onChange={(e) => setValidacion(row, e.target.value || null)}
        >
          <option value="">— Seleccionar —</option>
          {VALIDACION_OPTS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>
      )}

      {/* Acción Correctiva */}
      {!hideAccion && (
      <td
        className="td-accion"
        style={{ width: colWidths["__accion__"] ?? 170 }}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          className={`val-select ${currentAccion ? "accion-select-set" : ""}`}
          value={currentAccion ?? ""}
          onChange={(e) => setAccion && setAccion(row, e.target.value || null)}
        >
          <option value="">— Seleccionar —</option>
          {accionOpts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>
      )}

      {/* Comentario / Sustento */}
      {!hideComentario && (
      <td
        className="td-comentario"
        style={{ width: colWidths["__comentario__"] ?? 230 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {isExpanded || localDraft !== null ? (
            <textarea
              className="comentario-textarea"
              value={displayCom}
              placeholder="Escribe el sustento…"
              onChange={handleComChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              rows={3}
              autoFocus={isExpanded && localDraft === null}
            />
          ) : (
            <div
              className={`comentario-preview ${currentCom ? "has-text" : ""}`}
              onClick={handleFocus}
              title={currentCom || "Clic para agregar sustento"}
            >
              {currentCom || (
                <span className="comentario-placeholder">+ Agregar sustento</span>
              )}
            </div>
          )}

          {/* Botón guardar — visible mientras se escribe */}
          {(isDirty || (isExpanded && localDraft !== null)) && (
            <button
              data-guardar="1"
              className="btn-guardar-sustento"
              style={{
                background: savedFlash ? "var(--ok)" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "3px 10px",
                fontSize: 11.5,
                fontFamily: "var(--sans)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
                alignSelf: "flex-end",
              }}
              onMouseDown={(e) => e.preventDefault()} // evita blur del textarea
              onClick={handleGuardar}
            >
              {savedFlash ? "✓ Guardado" : "💾 Guardar"}
            </button>
          )}
        </div>
      </td>
      )}
    </tr>
  );
}
