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
 * ── Por qué el mapa está scopeado por módulo ──
 * "Sin Sustento" existe como columna pivote tanto en Usuarios como en
 * Privilegiados, pero con opciones distintas (Dar de Baja vs Retirar Perfil).
 * Por eso se indexa por { módulo → badgeCol }, no globalmente.
 *
 * Resolución (getAccionOptions):
 *   1. BY_MODULE[moduleKey][badgeCol]  (preferido)
 *   2. BY_MODULE[moduleKey][label]
 *   3. Fallback global por badgeCol (por si llegara sin módulo)
 *   4. DEFAULT_OPTS — así un escenario nuevo NUNCA queda sin opciones.
 *
 * Para agregar/ajustar un escenario: edita el módulo correspondiente abajo.
 */

export const ACCION_HEADER = "Acción Correctiva";

// Opción por defecto para cualquier escenario aún no mapeado explícitamente.
const DEFAULT_OPTS = ["Ninguna", "Dar de Baja"];

// { módulo → { badgeCol/columna pivote → opciones } }
const BY_MODULE = {
  usuarios: {
    "cesadoActivo":      ["Ninguna", "Dar de Baja"],
    "actividadPostCese": ["Ninguna", "Dar de Baja"],
    "sinUso>90d":        ["Ninguna", "Deshabilitar"],
    "bloqueado>30d":     ["Ninguna", "Eliminar"],
    "Sin Sustento":      ["Ninguna", "Dar de Baja"],
  },
  perfiles: {
    "Existe en MR":           ["Ninguna", "Crear Rol"],
    "Validación Rol":         ["Ninguna", "Corregir Rol", "Validar Asignación de Rol"],
    "Perfil No Identificado": ["Ninguna", "Corregir Rol", "Validar Asignación de Rol"],
    // "ROl + Perfil" (pivote de prf-apps) → sin mapeo explícito: cae a DEFAULT_OPTS.
  },
  privilegiados: {
    "Cesado Activo":   ["Ninguna", "Dar de Baja"],
    "No Identificado": ["Ninguna", "Dar de Baja"],
    "Sin Sustento":    ["Ninguna", "Retirar Perfil"],
    "Validación":      ["Ninguna", "Corregir MFA"], // Hallazgos MFA (badgeCol = "Validación")
  },
};

/**
 * Devuelve las opciones del Select de Acción Correctiva para un escenario.
 * @param {{ badgeCol?: string, label?: string, moduleKey?: string }} scenario
 * @returns {string[]}
 */
export function getAccionOptions(scenario = {}) {
  const { badgeCol, label, moduleKey } = scenario;
  const mod = moduleKey ? BY_MODULE[moduleKey] : null;
  if (mod && badgeCol && mod[badgeCol]) return mod[badgeCol];
  if (mod && label && mod[label]) return mod[label];
  // Fallback global (solo si no llegó moduleKey): primera coincidencia por badgeCol.
  const all = { ...BY_MODULE.usuarios, ...BY_MODULE.perfiles, ...BY_MODULE.privilegiados };
  if (badgeCol && all[badgeCol]) return all[badgeCol];
  return DEFAULT_OPTS;
}
