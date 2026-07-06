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

// Valor "sin acción de remediación". Es la opción por defecto del Select y el
// valor que se imprime en TODOS los exports cuando la fila no tiene una acción
// explícita. Reemplaza al antiguo literal "Ninguna" (que se exportaba vacío).
export const ACCION_NONE = "Sin Acción";

/**
 * Normaliza el valor de Acción Correctiva para mostrar/exportar.
 * - null/undefined/"" → "Sin Acción"
 * - "Ninguna" (valor legacy ya guardado en localStorage) → "Sin Acción"
 * - cualquier otra acción → se respeta tal cual
 * Garantiza retrocompatibilidad con validaciones guardadas antes del cambio.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function displayAccion(value) {
  if (value == null) return ACCION_NONE;
  const v = String(value).trim();
  if (v === "" || v === "Ninguna" || v === ACCION_NONE) return ACCION_NONE;
  return v;
}

// Opción por defecto para cualquier escenario aún no mapeado explícitamente.
const DEFAULT_OPTS = [ACCION_NONE, "Dar de Baja"];

const SHEET_OVERRIDES = {
  usuarios: {
    "sinUso>90d": {
      "App SIT": [ACCION_NONE, "Retirar Perfil"],
      "App NPAC": [ACCION_NONE, "Retirar Perfil"],
    },
  },
};

const ACCION_ALIASES = {
  "Deshabilitar": "Retirar Perfil",
};

// { módulo → { badgeCol/columna pivote → opciones } }
const BY_MODULE = {
  usuarios: {  
    "cesadoActivo":      [ACCION_NONE, "Dar de Baja"],
    "actividadPostCese": [ACCION_NONE, "Dar de Baja"],
    "sinUso>90d":        [ACCION_NONE, "Deshabilitar"],
    "bloqueado>30d":     [ACCION_NONE, "Eliminar"],
    "Sin Sustento":      [ACCION_NONE, "Dar de Baja"],
  },
  perfiles: {
    "Existe en MR":           [ACCION_NONE, "Crear Rol"],
    "Validación Rol":         [ACCION_NONE, "Corregir Rol", "Validar Asignación de Rol"],
    "Perfil No Identificado": [ACCION_NONE, "Corregir Rol", "Validar Asignación de Rol"],
    // "ROl + Perfil" (pivote de prf-apps) → sin mapeo explícito: cae a DEFAULT_OPTS.
  },
  privilegiados: {
    "Cesado Activo":   [ACCION_NONE, "Dar de Baja"],
    "No Identificado": [ACCION_NONE, "Dar de Baja"],
    "Sin Sustento":    [ACCION_NONE, "Retirar Perfil"],
    "Validación":      [ACCION_NONE, "Corregir MFA"], // Hallazgos MFA (badgeCol = "Validación")
  },
};

export function normalizeAccionToOptions(value, options = []){
  const v = displayAccion(value);
  if (v === ACCION_NONE || options.includes(v)) return v;
  const alias = ACCION_ALIASES[v];
  if (alias && options.includes(alias)) return alias;
  return v;
}

/**
 * Devuelve las opciones del Select de Acción Correctiva para un escenario.
 * @param {{ badgeCol?: string, label?: string, moduleKey?: string }} scenario
 * @returns {string[]}
 */
export function getAccionOptions(scenario = {}) {
  const { badgeCol, label, moduleKey, sheetKey } = scenario;
  const mod = moduleKey ? BY_MODULE[moduleKey] : null;

  if (moduleKey && badgeCol && sheetKey){
    const sheetOpts = SHEET_OVERRIDES[moduleKey]?.[badgeCol]?.[sheetKey];
    if (sheetOpts) return sheetOpts;
  }
  if (mod && badgeCol && mod[badgeCol]) return mod[badgeCol];
  if (mod && label && mod[label]) return mod[label];
  // Fallback global (solo si no llegó moduleKey): primera coincidencia por badgeCol.
  const all = { ...BY_MODULE.usuarios, ...BY_MODULE.perfiles, ...BY_MODULE.privilegiados };
  if (badgeCol && all[badgeCol]) return all[badgeCol];
  return DEFAULT_OPTS;
}
