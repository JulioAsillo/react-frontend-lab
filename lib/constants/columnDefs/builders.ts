/**
 * builders.ts
 *
 * Apps Críticas (App Exactus/SDP/SIT/NPAC) y Base de Datos (DB_SDP/DB_EXACTUS/
 * DB_SIT) comparten casi todos sus campos entre hojas — verificado línea por
 * línea contra los .py de backend. Las diferencias reales son:
 *   - SIT y NPAC no tienen "Fecha Bloqueo"; usan "Fecha Creación AD" /
 *     "Ultimo Login AD" en vez de "Fecha Creación" / "Ultimo Login", y sí
 *     tienen "Grupo".
 *   - SIT no devuelve "Estado" (NPAC sí, hardcodeado en el backend).
 *   - Apps (los 4) no tienen "bloqueado>30d"; Base de Datos (los 3) sí.
 *   - Apps usa la key "Matrícula" (con tilde); Base de Datos usa "Matricula"
 *     (sin tilde) — inconsistencia real del backend, no un typo nuestro.
 *
 * Por eso una sola función parametrizada cubre las 7 hojas sin duplicar
 * arrays.
 */

export type ColumnDef = { key: string; header: string; group: string };

export type SheetOpts = {
  group: string;
  matriculaKey?: string;      // "Matrícula" (Apps) | "Matricula" (BD)
  hasEstado?: boolean;        // SIT no trae Estado
  hasGrupo?: boolean;         // solo SIT / NPAC
  hasFechaBloqueo?: boolean;  // solo Base de Datos
  dateStyle?: "std" | "ad";   // "ad" → "Fecha Creación AD" / "Ultimo Login AD"
  hasBlq30?: boolean;         // solo Base de Datos
};

function buildIdentidadCols({
  group, matriculaKey = "Matrícula", hasEstado = true, hasGrupo = false,
  hasFechaBloqueo = false, dateStyle = "std",
}: SheetOpts): ColumnDef[] {
  const [creKey, creHeader, logKey, logHeader] = dateStyle === "ad"
    ? ["Fecha Creación AD", "Fecha Creación AD", "Ultimo Login AD", "Último Login AD"]
    : ["Fecha Creación", "Fecha Creación", "Ultimo Login", "Último Login"];

  return [
    { key: "Usuario",              header: "Usuario",             group },
    { key: matriculaKey,           header: "Matrícula",            group },
    { key: "Tipo de Cuenta",       header: "Tipo de Cuenta",       group },
    { key: "Nombre",               header: "Nombre",               group },
    { key: "Unidad organizativa",  header: "Unidad Organizativa", group },
    ...(hasGrupo ? [{ key: "Grupo", header: "Grupo", group }] : []),
    ...(hasEstado ? [{ key: "Estado", header: "Estado", group }] : []),
    { key: creKey, header: creHeader, group },
    ...(hasFechaBloqueo ? [{ key: "Fecha Bloqueo", header: "Fecha Bloqueo", group }] : []),
    { key: logKey, header: logHeader, group },
  ];
}

const GDH_COLS: ColumnDef[] = [
  { key: "activoGDH", header: "Activo en GDH",  group: "GDH" },
  { key: "cesadoGDH", header: "Cesado en GDH",  group: "GDH" },
  { key: "Fecha Cese", header: "Fecha de Cese", group: "GDH" },
];

function buildValidacionCols(hasBlq30: boolean): ColumnDef[] {
  return [
    ...(hasBlq30 ? [{ key: "bloqueado>30d", header: "Bloqueado >30d", group: "VALIDACION" }] : []),
    { key: "sinUso>90d",        header: "Sin Uso >90d",        group: "VALIDACION" },
    { key: "cesadoActivo",      header: "Cesado Activo",       group: "VALIDACION" },
    { key: "actividadPostCese", header: "Actividad Post Cese", group: "VALIDACION" },
    { key: "Sin Sustento",      header: "Sin Sustento",        group: "VALIDACION" },
  ];
}

export function buildSheetColumns(opts: SheetOpts): ColumnDef[] {
  return [...buildIdentidadCols(opts), ...GDH_COLS, ...buildValidacionCols(!!opts.hasBlq30)];
}
