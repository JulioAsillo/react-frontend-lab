/**
 * hallazgo-dba.ts — Certificación de Privilegiados / DBA
 * persistKey: "priv-dba"  |  fuente: hallazgos_dba.py (generar_hallazgos_dba)
 *
 * "DB SDP" y "DB Exactus" tienen las mismas columnas (mismas funciones
 * _sdp/_exactus, estructura idéntica).
 */
import type { ColumnDef } from "./types";

const dbSdp: ColumnDef[] = [
  { key: "DB Name",             header: "DB Name",              group: "" },
  { key: "Usuario",             header: "Usuario",              group: "" },
  { key: "Grantee Role",        header: "Rol Otorgado (DB)",    group: "" },
  { key: "Estado",              header: "Estado",                group: "" },
  { key: "Tipo Cuenta",         header: "Tipo de Cuenta",        group: "" },
  { key: "Matricula",           header: "Matrícula",            group: "" },
  { key: "Nombre Colaborador",  header: "Nombre Colaborador",   group: "" },
  { key: "Activo GDH",          header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",          header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",              header: "Rol AD",                 group: "" },
  { key: "Existe en App",       header: "Existe en App",         group: "" },
  { key: "Cesado Activo",       header: "Cesado Activo",         group: "" },
  { key: "No Identificado",     header: "No Identificado",       group: "" },
  { key: "Comentario",          header: "Comentario",            group: "" },
];

const dbExactus: ColumnDef[] = [
  { key: "DB Name",             header: "DB Name",              group: "" },
  { key: "Usuario",             header: "Usuario",              group: "" },
  { key: "Grantee Role",        header: "Rol Otorgado (DB)",    group: "" },
  { key: "Estado",              header: "Estado",                group: "" },
  { key: "Tipo Cuenta",         header: "Tipo de Cuenta",        group: "" },
  { key: "Matricula",           header: "Matrícula",            group: "" },
  { key: "Nombre Colaborador",  header: "Nombre Colaborador",   group: "" },
  { key: "Activo GDH",          header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",          header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",              header: "Rol AD",                 group: "" },
  { key: "Existe en App",       header: "Existe en App",         group: "" },
  { key: "Cesado Activo",       header: "Cesado Activo",         group: "" },
  { key: "No Identificado",     header: "No Identificado",       group: "" },
  { key: "Comentario",          header: "Comentario",            group: "" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_hallazgos_dba().
export const hallazgoDba: Record<string, ColumnDef[]> = {
  "DB SDP": dbSdp,
  "DB Exactus": dbExactus,
};
