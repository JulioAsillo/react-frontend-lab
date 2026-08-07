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
  { key: "DB Name",                header: "DB Name",                 group: "C1" },
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "GRANTED_ROLE",           header: "Rol Otorgado (DB)",       group: "C1" },
  { key: "Tipo de Cuenta",         header: "Tipo de Cuenta",          group: "C1" },
  { key: "Matricula",              header: "Matrícula",               group: "C1" },
  { key: "Nombre Colaborador",     header: "Nombre Colaborador",      group: "C1" },
  { key: "Funcion",                header: "Función",                 group: "C1" },
  { key: "ACTIVO GDH",             header: "Activo en GDH",           group: "C1" },
  { key: "CESADO GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Descripcion ROL DB",     header: "Descripción Rol DB",      group: "C1" },
  { key: "ROL_AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Existe en App",          header: "Existe en App",           group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

const exactus: ColumnDef[] = [
  { key: "DB Name",                header: "DB Name",                 group: "C1" },
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "GRANTED_ROLE",           header: "Rol Otorgado (DB)",       group: "C1" },
  { key: "Tipo de Cuenta",         header: "Tipo de Cuenta",          group: "C1" },
  { key: "Matricula",              header: "Matrícula",               group: "C1" },
  { key: "Nombre Colaborador",     header: "Nombre Colaborador",      group: "C1" },
  { key: "Funcion",                header: "Función",                 group: "C1" },
  { key: "ACTIVO GDH",             header: "Activo en GDH",           group: "C1" },
  { key: "CESADO GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Descripcion ROL DB",     header: "Descripción Rol DB",      group: "C1" },
  { key: "ROL_AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Existe en App",          header: "Existe en App",           group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_reporte_auditoria_dbs().
export const hallazgoDb: Record<string, ColumnDef[]> = {
  SDP: sdp,
  EXACTUS: exactus,
};
