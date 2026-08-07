/**
 * hallazgo-dba.ts — Certificación de Privilegiados / DBA
 * persistKey: "priv-dba"  |  fuente: hallazgos_dba.py (generar_hallazgos_dba)
 *
 * "DB SDP" y "DB Exactus" tienen las mismas columnas (mismas funciones
 * _sdp/_exactus, estructura idéntica).
 */
import type { ColumnDef } from "./types";

const dbSdp: ColumnDef[] = [
  { key: "DB Name",             header: "DB Name",               group: "C1" },
  { key: "Usuario",             header: "Usuario",               group: "C1" },
  { key: "Grantee Role",        header: "Rol Otorgado (DB)",     group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Tipo Cuenta",         header: "Tipo de Cuenta",        group: "C1" },
  { key: "Matricula",           header: "Matrícula",             group: "C1" },
  { key: "Nombre Colaborador",  header: "Nombre Colaborador",    group: "C1" },
  { key: "Activo GDH",          header: "Activo en GDH",         group: "C1" },
  { key: "Cesado GDH",          header: "Cesado en GDH",         group: "C1" },
  { key: "Rol AD",              header: "Rol AD",                group: "C1" },
  { key: "Existe en App",       header: "Existe en App",         group: "C1" },
  { key: "Cesado Activo",       header: "Cesado Activo",         group: "VALIDACION" },
  { key: "No Identificado",     header: "No Identificado",       group: "VALIDACION" },
  { key: "Comentario",          header: "Comentario",            group: "VALIDACION" },
];

const dbExactus: ColumnDef[] = [
  { key: "DB Name",             header: "DB Name",              group: "C1" },
  { key: "Usuario",             header: "Usuario",              group: "C1" },
  { key: "Grantee Role",        header: "Rol Otorgado (DB)",    group: "C1" },
  { key: "Estado",              header: "Estado",               group: "C1" },
  { key: "Tipo Cuenta",         header: "Tipo de Cuenta",       group: "C1" },
  { key: "Matricula",           header: "Matrícula",            group: "C1" },
  { key: "Nombre Colaborador",  header: "Nombre Colaborador",   group: "C1" },
  { key: "Activo GDH",          header: "Activo en GDH",        group: "C1" },
  { key: "Cesado GDH",          header: "Cesado en GDH",        group: "C1" },
  { key: "Rol AD",              header: "Rol AD",               group: "C1" },
  { key: "Existe en App",       header: "Existe en App",        group: "C1" },
  { key: "Cesado Activo",       header: "Cesado Activo",         group: "VALIDACION" },
  { key: "No Identificado",     header: "No Identificado",       group: "VALIDACION" },
  { key: "Comentario",          header: "Comentario",            group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_hallazgos_dba().
export const hallazgoDba: Record<string, ColumnDef[]> = {
  "DB SDP": dbSdp,
  "DB Exactus": dbExactus,
};
