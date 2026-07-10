/**
 * hallazgo-db.ts — Certificación de Perfiles / Base de Datos
 * persistKey: "prf-dbs"  |  fuente: hallazgos_db.py (generar_reporte_auditoria_dbs)
 *
 * SDP y EXACTUS tienen exactamente las mismas columnas en este backend
 * (a diferencia de Apps Críticas de Perfiles, que sí varía el spelling de
 * "Activo/Acivo GDH" entre hojas). Acá no hay typos entre hojas.
 */
import type { ColumnDef } from "./types";

const sdp: ColumnDef[] = [
  { key: "DB Name",                header: "DB Name",                 group: "" },
  { key: "Usuario",                header: "Usuario",                 group: "" },
  { key: "GRANTED_ROLE",           header: "Rol Otorgado (DB)",       group: "" },
  { key: "Tipo de Cuenta",         header: "Tipo de Cuenta",           group: "" },
  { key: "Matricula",              header: "Matrícula",               group: "" },
  { key: "Nombre Colaborador",     header: "Nombre Colaborador",      group: "" },
  { key: "Funcion",                header: "Función",                 group: "" },
  { key: "ACTIVO GDH",             header: "Activo en GDH",           group: "" },
  { key: "CESADO GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Descripcion ROL DB",     header: "Descripción Rol DB",     group: "" },
  { key: "ROL_AD",                 header: "Rol AD",                  group: "" },
  { key: "Existe en App",          header: "Existe en App",           group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

const exactus: ColumnDef[] = [
  { key: "DB Name",                header: "DB Name",                 group: "" },
  { key: "Usuario",                header: "Usuario",                 group: "" },
  { key: "GRANTED_ROLE",           header: "Rol Otorgado (DB)",       group: "" },
  { key: "Tipo de Cuenta",         header: "Tipo de Cuenta",           group: "" },
  { key: "Matricula",              header: "Matrícula",               group: "" },
  { key: "Nombre Colaborador",     header: "Nombre Colaborador",      group: "" },
  { key: "Funcion",                header: "Función",                 group: "" },
  { key: "ACTIVO GDH",             header: "Activo en GDH",           group: "" },
  { key: "CESADO GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Descripcion ROL DB",     header: "Descripción Rol DB",     group: "" },
  { key: "ROL_AD",                 header: "Rol AD",                  group: "" },
  { key: "Existe en App",          header: "Existe en App",           group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_reporte_auditoria_dbs().
export const hallazgoDb: Record<string, ColumnDef[]> = {
  SDP: sdp,
  EXACTUS: exactus,
};
