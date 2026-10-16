"use client";
/**
 * FuenteUploadPanel
 *
 * UI de carga de archivos para una fuente de Recopilar Información cuando el
 * GET falla (aún no hay info subida en el backend). Se muestra dentro de la
 * vista de la fuente (FuenteDetalle / FuenteDetallePriv).
 *
 * - Una o varias zonas de archivo (GDH = Activos + Cesados).
 * - UNA fecha de corte manual compartida (obligatoria, formato ISO al enviar).
 * - Valida columnas en el front (normalizadas, match exacto) antes de subir.
 * - POST multipart por zona; al terminar todas OK, dispara onUploaded() para
 * que el contenedor re-haga el GET.
 *
 * Props:
 * config → { titulo, zonas:[{ label, endpoint, cols }] }
 * onUploaded → callback tras subir todo correctamente
 */
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { validarColumnas, normalizeColName } from "@/lib/constants/uploadSources";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Formatos aceptados (Excel y texto delimitado)
const EXT_OK = /\.(xlsx|xlsm|xlsb|xls|csv|txt|tsv|ods)$/i;
const ACCEPT = ".xlsx,.xlsm,.xlsb,.xls,.csv,.txt,.tsv,.ods";

// Decodifica texto: UTF-8 y, si trae caracteres inválidos, Windows-1252
// (los CSV exportados por Excel en español suelen venir en ANSI).
function decodeText(buf) {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("\uFFFD") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

// Lee el archivo y devuelve la fila de cabeceras.
// No asume que las cabeceras estén en la fila 1: revisa las primeras 20 filas
// de cada hoja y elige la que contiene más columnas requeridas.
async function leerCabeceras(file, reqCols) {
  const buf = await file.arrayBuffer();
  const esTexto = /\.(csv|txt|tsv)$/i.test(file.name);
  const wb = esTexto
    ? XLSX.read(decodeText(buf), { type: "string", raw: true })
    : XLSX.read(buf, { type: "array" });

  const req = new Set(reqCols.map(normalizeColName));
  let best = [], bestScore = -1;
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", blankrows: false });
    for (const row of aoa.slice(0, 20)) {
      const cells = row.map(c => String(c).trim()).filter(Boolean);
      const score = cells.filter(c => req.has(normalizeColName(c))).length;
      if (score > bestScore) { best = cells; bestScore = score; }
      if (score === req.size) return best;
    }
  }
  return best;
}

function ZonaCarga({ zona, estado, onPick }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const { file, validation, error } = estado;
  const ok = validation?.ok;

  // Acepta Excel y CSV al soltar
  function esExcel(f) {
    return EXT_OK.test(f?.name || "");
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && esExcel(f)) onPick(f);
  }

  return (
    <div className="upload-zone">
      <div className="upload-zone-head">
        <span className="upload-zone-label">{zona.label}</span>
        {file && ok && <span className="upload-badge upload-badge-ok">✓ Columnas válidas</span>}
        {file && validation && !ok && <span className="upload-badge upload-badge-err">✗ Revisar columnas</span>}
      </div>

      <div
        className={`upload-dropzone${dragging ? " dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!dragging) setDragging(true); }}
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        {file
          ? <span className="upload-filename">📄 {file.name}</span>
          : <span className="upload-hint">
              {dragging ? "Suelta el archivo aquí" : "Arrastra un archivo .xlsx / .xls / .csv o haz clic para seleccionarlo"}
            </span>}
      </div>

      {/* Columnas requeridas */}
      <details className="upload-cols" open={!file || (validation && !ok)}>
        <summary>Columnas requeridas ({zona.cols.length})</summary>
        <div className="upload-cols-list">
          {zona.cols.map(c => {
            const present = validation
              ? !validation.faltan.includes(c)
              : null;
            return (
              <span key={c} className={`upload-col-chip ${present === true ? "col-ok" : present === false ? "col-missing" : ""}`}>
                {c}
              </span>
            );
          })}
        </div>
      </details>

      {validation && !ok && (
        <div className="upload-val-error">
          {validation.faltan.length > 0 && (
            <div>Faltan columnas: <strong>{validation.faltan.join(", ")}</strong></div>
          )}</strong></div>
          )}
        </div>
      )}
      {error && <div className="upload-val-error">{error}</div>}
    </div>
  );
}

export default function FuenteUploadPanel({ config, onUploaded }) {
  // estado por zona: { file, validation, error }
  const [zonas, setZonas] = useState(() => config.zonas.map(() => ({ file: null, validation: null, error: "" })));
  const [fecha, setFecha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState("");

  async function handlePick(idx, file) {
    setGlobalError("");
    const next = [...zonas];
    next[idx] = { file, validation: null, error: "" };
    setZonas(next);
    try {
      const header = await leerCabeceras(file, config.zonas[idx].cols);
      const validation = validarColumnas(header, config.zonas[idx].cols);
      const upd = [...next];
      upd[idx] = { file, validation, error: "" };
      setZonas(upd);
    } catch {
      const upd = [...next];
      upd[idx] = { file, validation: null, error: "No se pudo leer el archivo. ¿Es un .xlsx / .xls / .csv válido?" };
      setZonas(upd);
    }
  }

  const allFilesReady = zonas.every(z => z.file && z.validation?.ok);
  const canSubmit = allFilesReady && !!fecha && !submitting;

  async function handleSubmit() {
    if (!fecha) { setGlobalError("Ingresa la fecha de corte."); return; }
    if (!allFilesReady) { setGlobalError("Carga todos los archivos con columnas válidas."); return; }

    setSubmitting(true); setGlobalError("");
    // ISO con hora a medianoche
    const fechaISO = fecha.length === 16 ? `${fecha}:00` : fecha;

    try {
      for (let i = 0; i < config.zonas.length; i++) {
        const z = config.zonas[i];
        const fd = new FormData();
        fd.append("file", zonas[i].file);
        fd.append("fecha_corte", fechaISO);
        const res = await fetch(`${API_BASE}${z.endpoint}`, { method: "POST", body: fd });
        if (!res.ok) {
          let detail = `Error ${res.status}`;
          try { const e = await res.json(); detail = e.detail || e.message || detail; } catch {}
          throw new Error(`${z.label}: ${detail}`);
        }
      }
      onUploaded?.();
    } catch (e) {
      setGlobalError(e.message || "Error al subir los archivos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="upload-panel">
      <div className="upload-panel-head">
        <h3 className="upload-panel-title">Subir información — {config.titulo}</h3>
        <p className="upload-panel-sub">
          Aún no hay datos cargados para esta fuente. Sube {config.zonas.length > 1 ? "los archivos" : "el archivo"} en
          formato <strong>.xlsx / .xls / .csv</strong> e indica la fecha de corte.
        </p>
      </div>

      <div className="upload-zones">
        {config.zonas.map((z, i) => (
          <ZonaCarga key={z.label} zona={z} estado={zonas[i]} onPick={f => handlePick(i, f)} />
        ))}
      </div>

      <div className="upload-footer">
        <label className="upload-fecha">
          <span>Fecha y hora de corte <span style={{ color: "var(--inc)" }}>*</span></span>
          <input type="datetime-local" step="1" value={fecha} onChange={e => setFecha(e.target.value)} />
        </label>
        <button className="btn-generate" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? <><span className="spinner" /> Subiendo…</> : "Subir y cargar"}
        </button>
      </div>

      {globalError && <div className="upload-global-error">{globalError}</div>}
    </div>
  );
}
