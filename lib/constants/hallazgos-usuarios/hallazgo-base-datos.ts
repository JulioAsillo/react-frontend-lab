/**
 * hallazgo-base-datos.ts — Certificación de Usuarios / Base de Datos
 * persistKey: "bd"  |  fuente: hallazgos_base_datos.py
 *
 * Ojo: acá la matrícula es "Matricula" (SIN tilde) — en Apps Críticas es
 * "Matrícula" (CON tilde). Es así en el backend real, no un typo nuestro.
 */
import type { ColumnDef } from "./types";

const dbSdp: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",               group: "C1" },
  { key: "Matricula",           header: "Matrícula",             group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",   group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "C1" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "C1" },
  { key: "Ultimo Login",        header: "Último Login",          group: "C1" },

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
  { key: "Usuario",             header: "Usuario",               group: "C1" },
  { key: "Matricula",           header: "Matrícula",             group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",   group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "C1" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "C1" },
  { key: "Ultimo Login",        header: "Último Login",          group: "C1" },

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
  { key: "Usuario",             header: "Usuario",               group: "C1" },
  { key: "Matricula",           header: "Matrícula",             group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",   group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "C1" },
  { key: "Fecha Bloqueo",       header: "Fecha Bloqueo",         group: "C1" },
  { key: "Ultimo Login",        header: "Último Login",          group: "C1" },

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
