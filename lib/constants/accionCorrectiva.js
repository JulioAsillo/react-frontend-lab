/**
 * Acción Correctiva — opciones de remediación por escenario.
 *
 * Columna tipo Select (igual que "Validación") que aparece en TODOS los
 * hallazgos de TODAS las certificaciones EXCEPTO Hallazgos Preliminares de
 * Usuarios (esos usan DataTablePlano, sin validación).
 *
 * Es puramente visual + persistente: el valor seleccionado se guarda junto a
 * la validación/comentario (mismo store de useValidaciones) y se vuelca en los
 * exports (vista y "exportar todo"). No dispara ninguna acción a backend.
 *
 * Resolución de opciones (getAccionOptions):
 *   1. Coincidencia exacta por badgeCol (clave canónica del backend).
 *   2. Coincidencia por label/badgeCol normalizado (sin tildes, lowercase).
 *   3. Fallback DEFAULT_OPTS — así un escenario nuevo NUNCA queda sin opciones.
 *
 * Para agregar/ajustar un escenario: edita BY_BADGE_COL (preferido) o BY_LABEL.
 */

export const ACCION_HEADER = "Acción Correctiva";

// Opción por defecto para cualquier escenario aún no mapeado explícitamente.
// Mayoría de escenarios usan este par; los que difieren se sobreescriben abajo.
const DEFAULT_OPTS = ["Ninguna", "Dar de Baja"];

// Indexado por la badgeCol/columna pivote que cada DataTable pasa a la fila.
// (Usuarios usa keys tipo "cesadoActivo"; Privilegiados usa el label "Cesado
//  Activo" como badgeCol; Perfiles usa "Perfil No Identificado", etc.)
const BY_BADGE_COL = {
  // ── Usuarios (ESCENARIOS_ORDEN canónicos) ──
  "cesadoActivo":      ["Ninguna", "Dar de Baja"],
  "actividadPostCese": ["Ninguna", "Dar de Baja"],
  "sinUso>90d":        ["Ninguna", "Deshabilitar"],
  "bloqueado>30d":     ["Ninguna", "Eliminar"],
  "Sin Sustento":      ["Ninguna", "Dar de Baja"],
  // ── Perfiles ──
  "Perfil No Identificado": ["Ninguna", "Dar de Baja"],
  // ── Privilegiados (badgeCol = label del backend) ──
  "Cesado Activo":     ["Ninguna", "Dar de Baja"],
  "No Identificado":   ["Ninguna", "Dar de Baja"],
};

// Fallback por nombre legible normalizado (cubre variaciones de label/badgeCol).
const BY_LABEL = {
  "cesados activos":         ["Ninguna", "Dar de Baja"],
  "cesado activo":           ["Ninguna", "Dar de Baja"],
  "post cese":               ["Ninguna", "Dar de Baja"],
  "inactividad 90 dias":     ["Ninguna", "Deshabilitar"],
  "bloqueado 30 dias":       ["Ninguna", "Eliminar"],
  "sin sustento":            ["Ninguna", "Dar de Baja"],
  "perfil no identificado":  ["Ninguna", "Dar de Baja"],
  "no identificado":         ["Ninguna", "Dar de Baja"],
};

function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Devuelve las opciones del Select de Acción Correctiva para un escenario.
 * @param {{ badgeCol?: string, label?: string }} scenario
 * @returns {string[]}
 */
export function getAccionOptions(scenario = {}) {
  const { badgeCol, label } = scenario;
  if (badgeCol && BY_BADGE_COL[badgeCol]) return BY_BADGE_COL[badgeCol];
  const nl = norm(label);
  if (nl && BY_LABEL[nl]) return BY_LABEL[nl];
  const nb = norm(badgeCol);
  if (nb && BY_LABEL[nb]) return BY_LABEL[nb];
  return DEFAULT_OPTS;
}
