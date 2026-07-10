/**
 * hallazgo-base-datos.ts — Certificación de Usuarios / Base de Datos
 * persistKey: "bd"  |  fuente: hallazgos_base_datos.py
 *
 * Ojo: acá la matrícula es "Matricula" (SIN tilde) — en Apps Críticas es
 * "Matrícula" (CON tilde). Es así en el backend real, no un typo nuestro.
 */
import type { ColumnDef } from "./types";

const dbSdp: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "SDP" },
  { key: "Matricula",           header: "Matrícula",            group: "SDP" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "SDP" },
  { key: "Nombre",              header: "Nombre",                group: "SDP" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "SDP" },
  { key: "Estado",              header: "Estado",                group: "SDP" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "SDP" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "SDP" },
  { key: "Ultimo Login",        header: "Último Login",          group: "SDP" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",       header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

const dbExactus: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "EXACTUS" },
  { key: "Matricula",           header: "Matrícula",            group: "EXACTUS" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "EXACTUS" },
  { key: "Nombre",              header: "Nombre",                group: "EXACTUS" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "EXACTUS" },
  { key: "Estado",              header: "Estado",                group: "EXACTUS" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "EXACTUS" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "EXACTUS" },
  { key: "Ultimo Login",        header: "Último Login",          group: "EXACTUS" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",       header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

const dbSit: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "SIT" },
  { key: "Matricula",           header: "Matrícula",            group: "SIT" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "SIT" },
  { key: "Nombre",              header: "Nombre",                group: "SIT" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "SIT" },
  { key: "Estado",              header: "Estado",                group: "SIT" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "SIT" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "SIT" },
  { key: "Ultimo Login",        header: "Último Login",          group: "SIT" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",       header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve el backend.
export const hallazgoBaseDatos: Record<string, ColumnDef[]> = {
  "DB_SDP":     dbSdp,
  "DB_EXACTUS": dbExactus,
  "DB_SIT":     dbSit,
};
