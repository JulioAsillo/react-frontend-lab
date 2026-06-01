const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * fetchReporte — GET al endpoint del backend con fecha_ref como query param.
 *
 * v15: el backend FastAPI expone todos los endpoints de hallazgos como GET
 * con ?fecha_ref=YYYY-MM-DD. La versión anterior usaba POST con FormData,
 * lo que causaba 405 Method Not Allowed en todos los reportes.
 *
 * Formas de respuesta soportadas (todas válidas):
 *   - Array directo:        [...]
 *   - Wrapper:              { data: [...] }
 *   - Wrapper con corte:    { data: [...], fechaCorte: "2026-04-30" }
 *   - Multi-tab:            { DB_SDP: [...], DB_EXACTUS: [...] }
 *
 * El campo fechaCorte acepta alias snake_case (fecha_corte) por compatibilidad
 * con FastAPI / Python.
 */
export async function fetchReporte(endpoint, needsDate, fecha) {
  // Construir URL con query param si el reporte requiere fecha de corte
  let url = `${API_BASE}${endpoint}`;
  if (needsDate && fecha) {
    url += `?fecha_ref=${encodeURIComponent(fecha)}`;
  }

  let res;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (networkErr) {
    throw new Error(`No se pudo conectar con el servidor: ${networkErr.message}`);
  }

  if (!res.ok) {
    let detail = `Error ${res.status} (${res.statusText})`;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {}
    throw new Error(detail);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido.");
  }

  // Normalizar al formato { data, fechaCorte }
  let data;
  let fechaCorte;

  if (Array.isArray(json)) {
    data = json;
  } else if (json && typeof json === "object" && "data" in json) {
    data = json.data;
    fechaCorte = json.fechaCorte ?? json.fecha_corte ?? json.cutoff ?? undefined;
  } else {
    // Multi-tab sin wrapper: { DB_SDP: [...], "App Exactus": [...], ... }
    data = json;
  }

  if (data === null || data === undefined) {
    throw new Error("El servidor devolvió una respuesta vacía.");
  }

  return { data, fechaCorte };
}
