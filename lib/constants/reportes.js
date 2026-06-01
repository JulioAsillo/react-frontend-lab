/**
 * REPORTES — definición de cada reporte del sidebar de Certificación
 */
export const REPORTES = [
  {
    id:         "hallazgos-cesados",
    label:      "Hallazgos Preliminares",
    icon:       "📋",
    persistKey: "cesados",
  },
  {
    id:         "hallazgos-ad",
    label:      "Hallazgos Active Directory",
    icon:       "🖥",
    persistKey: "ad",
  },
  {
    id:         "hallazgos-entra-id",
    label:      "Hallazgos Entra ID",
    icon:       "☁",
    persistKey: "entra",
  },
  {
    id:         "hallazgos-aplicaciones-criticas",
    label:      "Hallazgos Apps Críticas",
    icon:       "⚙",
    persistKey: "apps",
  },
  {
    id:         "hallazgos-base-datos",
    label:      "Hallazgos Base de Datos",
    icon:       "🗄",
    persistKey: "bd",
  },
];

/**
 * ESCENARIOS_ORDEN — escenarios canónicos para AD, Entra ID, Apps y BD.
 * Cada fila del backend trae UNA columna badge (ej. cesadoActivo, sinUso>90d).
 * DataTable filtra dinámicamente cuáles existen en los datos reales.
 */
export const ESCENARIOS_ORDEN = [
  { key: "cesados-activos",  label: "Cesados Activos",     badgeCol: "cesadoActivo"      },
  { key: "postcese",         label: "Post Cese",            badgeCol: "actividadPostCese" },
  { key: "inactividad-90d",  label: "Inactividad 90 días",  badgeCol: "sinUso>90d"        },
  { key: "bloqueado-30d",    label: "Bloqueado 30 días",    badgeCol: "bloqueado>30d"     },
  { key: "sin-sustento",     label: "Sin Sustento",         badgeCol: "Sin Sustento"      },
];

