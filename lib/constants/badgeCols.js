/**
 * badgeCols.js
 *
 * LEGACY: Set de columnas pintadas por nombre. Usuarios YA NO usa este
 * archivo — ver lib/constants/badgeValueMap.js (pintado por valor,
 * moduleKey === "usuarios" en Badge.jsx / DataTableRow.jsx).
 *
 * Se mantiene solo para Perfiles y Privilegiados hasta que se decida
 * migrarlos al mismo patrón por valor.
 */
export const BADGE_COLS = new Set([
  // Perfiles (Mapeo adicional)
  "Existe ROL en MR?", "Escenario", "ROl + Perfil", "Comparativo",
  "Existe en MR", "Rol Incorrecto", "Validación Rol", "Perfil No Identificado",
]);
