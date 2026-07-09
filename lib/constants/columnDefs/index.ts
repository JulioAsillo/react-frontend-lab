/**
 * index.ts — ColumnDefs de Certificación de Usuarios.
 *
 * `key`    → nombre exacto de columna tal como lo devuelve el backend (los
 *            5 .py que me pasaste). Si el backend cambia un nombre, se
 *            actualiza acá y en ningún otro lado.
 * `header` → texto legible mostrado en la cabecera de la tabla.
 * `group`  → grupo semántico usado para colorear (ver GROUP_COLORS abajo,
 *            clases reales en app/globals.css).
 *
 * AD, Entra ID y Cesados no tienen ambigüedad de nombres repetidos entre
 * hojas, así que se indexan solo por persistKey ("ad", "entra", "cesados").
 * Apps Críticas y Base de Datos SÍ reutilizan nombres entre hojas
 * (Usuario, Nombre, Estado, Fecha Creación...), así que se indexan por
 * persistKey + sheetKey exacto (el que devuelve el backend:
 * "App Exactus" / "App SDP" / "App SIT" / "App NPAC" y
 * "DB_SDP" / "DB_EXACTUS" / "DB_SIT").
 */
import { buildSheetColumns, type ColumnDef } from "./builders";

// ── Colores por grupo semántico (clases th-src-N de app/globals.css) ───────
export const GROUP_COLORS: Record<string, string> = {
  AD:         "th-src-9",   // celeste
  ENTRA:      "th-src-10",  // azul
  EXACTUS:    "th-src-6",   // verde
  SDP:        "th-src-12",  // violeta
  SIT:        "th-src-3",   // naranja
  NPAC:       "th-src-14",  // fucsia
  GDH:        "th-src-5",   // lima — campos cruzados desde GDH
  VALIDACION: "th-src-2",   // rojo — columnas de resultado de validación
};

// ── AD (persistKey: "ad") ───────────────────────────────────────────────────
export const adColumns: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "AD" },
  { key: "Matricula",           header: "Matrícula",             group: "AD" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "AD" },
  { key: "Nombre",              header: "Nombre",                group: "AD" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "AD" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "AD" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "AD" },
  { key: "Ultimo Login",        header: "Último Login",          group: "AD" },
  { key: "Estado",              header: "Estado",                group: "AD" },
  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },
  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",       header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

// ── Entra ID (persistKey: "entra") ──────────────────────────────────────────
export const entraColumns: ColumnDef[] = [
  { key: "Upn",                     header: "UPN",                   group: "ENTRA" },
  { key: "Correo",                  header: "Correo",                group: "ENTRA" },
  { key: "Matricula (SAM/City)",    header: "Matrícula (SAM/City)",  group: "ENTRA" },
  { key: "Tipo Creación",           header: "Tipo de Creación",      group: "ENTRA" },
  { key: "Tipo de Cuenta",          header: "Tipo de Cuenta",        group: "ENTRA" },
  { key: "Nombre",                  header: "Nombre",                group: "ENTRA" },
  { key: "Unidad organizativa",     header: "Unidad Organizativa",  group: "ENTRA" },
  { key: "Estado",                  header: "Estado",                group: "ENTRA" },
  { key: "Fecha Creación",          header: "Fecha Creación",        group: "ENTRA" },
  { key: "Fecha Ultimo Login",      header: "Fecha Último Login",   group: "ENTRA" },
  { key: "activoGDH",               header: "Activo en GDH",        group: "GDH" },
  { key: "cesadoGDH",               header: "Cesado en GDH",        group: "GDH" },
  { key: "Fecha Cese",              header: "Fecha de Cese",        group: "GDH" },
  { key: "sinUso>90d",              header: "Sin Uso >90d",         group: "VALIDACION" },
  { key: "cesadoActivo",            header: "Cesado Activo",        group: "VALIDACION" },
  { key: "actividadPostCese",       header: "Actividad Post Cese",  group: "VALIDACION" },
  { key: "Sin Sustento",            header: "Sin Sustento",         group: "VALIDACION" },
];

// ── Apps Críticas (persistKey: "apps", 4 hojas) ─────────────────────────────
export const appExactusColumns = buildSheetColumns({ group: "EXACTUS" });
export const appSdpColumns     = buildSheetColumns({ group: "SDP" });
export const appSitColumns     = buildSheetColumns({ group: "SIT",  hasEstado: false, hasGrupo: true, dateStyle: "ad" });
export const appNpacColumns    = buildSheetColumns({ group: "NPAC", hasGrupo: true, dateStyle: "ad" });

// ── Base de Datos (persistKey: "bd", 3 hojas) ───────────────────────────────
const BD_BASE = { matriculaKey: "Matricula", hasFechaBloqueo: true, hasBlq30: true } as const;
export const dbSdpColumns     = buildSheetColumns({ ...BD_BASE, group: "SDP" });
export const dbExactusColumns = buildSheetColumns({ ...BD_BASE, group: "EXACTUS" });
export const dbSitColumns     = buildSheetColumns({ ...BD_BASE, group: "SIT" });

// ── Preliminares (persistKey: "cesados", hoja "Preliminares") ──────────────
export const cesadosPreliminaresColumns: ColumnDef[] = [
  { key: "Matricula",             header: "Matrícula",              group: "" },
  { key: "Nombre",                header: "Nombre",                 group: "" },
  { key: "UPN",                   header: "UPN",                    group: "" },
  { key: "Unidad organizativa",   header: "Unidad Organizativa",   group: "" },
  { key: "Fecha de Cese",         header: "Fecha de Cese",          group: "GDH" },

  { key: "AD",                    header: "AD",                     group: "AD" },
  { key: "Ultimo Login AD",       header: "Último Login AD",       group: "AD" },
  { key: "PostCese AD",           header: "Post Cese AD",           group: "AD" },

  { key: "Entra ID",              header: "Entra ID",               group: "ENTRA" },
  { key: "Entra ID Ultimo Login", header: "Entra ID Último Login", group: "ENTRA" },
  { key: "PostCese Entra ID",     header: "Post Cese Entra ID",     group: "ENTRA" },

  { key: "Usr Exactus",              header: "Usr Exactus",              group: "EXACTUS" },
  { key: "Usr Exactus Ultimo Login", header: "Usr Exactus Último Login", group: "EXACTUS" },
  { key: "PostCese Exactus App",     header: "Post Cese Exactus App",    group: "EXACTUS" },
  { key: "DB Exactus",               header: "DB Exactus",               group: "EXACTUS" },
  { key: "DB Exactus Ultimo Login",  header: "DB Exactus Último Login",  group: "EXACTUS" },
  { key: "PostCese DB Exactus",      header: "Post Cese DB Exactus",     group: "EXACTUS" },

  { key: "Usr SDP",              header: "Usr SDP",              group: "SDP" },
  { key: "Usr SDP Ultimo Login", header: "Usr SDP Último Login", group: "SDP" },
  { key: "PostCese SDP App",     header: "Post Cese SDP App",    group: "SDP" },
  { key: "DB SDP",               header: "DB SDP",               group: "SDP" },
  { key: "DB SDP Ultimo Login",  header: "DB SDP Último Login",  group: "SDP" },
  { key: "PostCese DB SDP",      header: "Post Cese DB SDP",     group: "SDP" },

  { key: "Usr SIT",              header: "Usr SIT",              group: "SIT" },
  { key: "DB SIT",               header: "DB SIT",               group: "SIT" },
  { key: "DB SIT Ultimo Login",  header: "DB SIT Último Login",  group: "SIT" },
  { key: "PostCese DB SIT",      header: "Post Cese DB SIT",     group: "SIT" },

  { key: "Usr NPAC",             header: "Usr NPAC",             group: "NPAC" },

  { key: "Validación Cesado Activo", header: "Validación Cesado Activo", group: "VALIDACION" },
  { key: "Validación Post Cese",     header: "Validación Post Cese",     group: "VALIDACION" },
  { key: "Validación Final",         header: "Validación Final",         group: "VALIDACION" },
];

// ── SinCity (persistKey: "cesados", hoja "SinCity") — columnas totalmente
// distintas a Preliminares, por eso van indexadas por hoja también. ────────
export const cesadosSinCityColumns: ColumnDef[] = [
  { key: "Nombre",        header: "Nombre",         group: "" },
  { key: "Mail",          header: "Mail",           group: "ENTRA" },
  { key: "UPN",           header: "UPN",            group: "ENTRA" },
  { key: "Estado",        header: "Estado",         group: "ENTRA" },
  { key: "Creado",        header: "Fecha Creación", group: "ENTRA" },
  { key: "ultimo login",  header: "Último Login",   group: "ENTRA" },
  { key: "City",          header: "City",           group: "" },
  { key: "Observación",   header: "Observación",    group: "" },
];

// ── Índices de búsqueda ──────────────────────────────────────────────────────
const FLAT_COLUMN_DEFS: Record<string, ColumnDef[]> = {
  ad: adColumns,
  entra: entraColumns,
};

const SHEET_COLUMN_DEFS: Record<string, ColumnDef[]> = {
  "apps:App Exactus": appExactusColumns,
  "apps:App SDP":     appSdpColumns,
  "apps:App SIT":     appSitColumns,
  "apps:App NPAC":    appNpacColumns,
  "bd:DB_SDP":        dbSdpColumns,
  "bd:DB_EXACTUS":    dbExactusColumns,
  "bd:DB_SIT":        dbSitColumns,
  "cesados:Preliminares": cesadosPreliminaresColumns,
  "cesados:SinCity":      cesadosSinCityColumns,
};

/**
 * Busca el ColumnDef de una columna dada.
 * @param persistKey  "ad" | "entra" | "apps" | "bd" | "cesados"
 * @param sheetKey    nombre de hoja exacto (solo aplica a "apps"/"bd"; ignorado en los demás)
 * @param col         nombre de columna tal como viene en la fila
 */
export function getColumnMeta(persistKey: string, sheetKey: string | undefined, col: string): ColumnDef | undefined {
  const bySheet = sheetKey ? SHEET_COLUMN_DEFS[`${persistKey}:${sheetKey}`] : undefined;
  const list = bySheet ?? FLAT_COLUMN_DEFS[persistKey];
  return list?.find(c => c.key === col);
}

/** Clase CSS de color para una columna, o undefined si no tiene grupo asignado. */
export function getHeaderColorClass(persistKey: string, sheetKey: string | undefined, col: string): string | undefined {
  const group = getColumnMeta(persistKey, sheetKey, col)?.group;
  return group ? GROUP_COLORS[group] : undefined;
}

/** Header legible para una columna, o el nombre crudo si no está mapeada. */
export function getColumnLabel(persistKey: string, sheetKey: string | undefined, col: string): string {
  return getColumnMeta(persistKey, sheetKey, col)?.header ?? col;
}
