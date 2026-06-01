export const BADGE_COLS = new Set([
  // Escenarios estándar
  "sinUso>90d", "bloqueado>30d", "cesadoActivo", "actividadPostCese",
  "Sin Sustento", "Estado",
  // Columnas de presencia en sistemas
  "AD Nipa", "Entra ID", "Usr Exactus", "DB Exactus",
  "Usr SDP", "DB SDP", "Usr SIT", "DB SIT", "Usr NPAC",
  // PostCese por sistema (Hallazgos Preliminares)
  "PostCese AD Nipa", "PostCese Entra ID", "PostCese Exactus App", "PostCese DB Exactus",
  "PostCese SDP App", "PostCese DB SDP", "PostCese DB SIT",
  // Validaciones finales (Hallazgos Preliminares)
  "Validación Cesado Activo", "Validación Post Cese",
  // Perfiles (Mapeo adicional)
  "Existe ROL en MR?", "Escenario", "ROl + Perfil", "Comparativo",
  "Existe en MR", "Rol Incorrecto", "Validación Rol", "Perfil No Identificado",
]);

// Columnas que son badgeCol "pivote" en los escenarios estándar
export const SCENARIO_BADGE_COLS = new Set([
  "cesadoActivo", "actividadPostCese", "sinUso>90d", "bloqueado>30d", "Sin Sustento",
]);

// SCENARIO_CESADOS_COLS fue eliminado en v10: Hallazgos Preliminares ahora usa
// DataTablePlano (tabla única, sin escenarios). Las columnas badge siguen
// renderizándose con color en el Set BADGE_COLS de arriba.
