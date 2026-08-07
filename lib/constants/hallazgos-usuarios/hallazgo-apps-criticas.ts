/**
 * hallazgo-apps-criticas.ts — Certificación de Usuarios / Apps Críticas
 * persistKey: "apps"  |  fuente: hallazgos_aplicaciones_criticas.py
 *
 * 4 hojas, cada una con sus propias columnas (nombres de hoja EXACTOS
 * como los devuelve el backend, son las keys del dict de retorno).
 */
import type { ColumnDef } from "./types";

const appExactus: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "C1" },
  { key: "Matrícula",           header: "Matrícula",            group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "C1" },
  { key: "Ultimo Login",        header: "Último Login",          group: "C1" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

const appSdp: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "C1" },
  { key: "Matrícula",           header: "Matrícula",            group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "C1" },
  { key: "Estado",              header: "Estado",                group: "C1" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "C1" },
  { key: "Ultimo Login",        header: "Último Login",          group: "C1" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

// SIT no trae "Estado" (el backend no lo incluye en este reporte).
const appSit: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "C1" },
  { key: "Matrícula",           header: "Matrícula",            group: "C1" },
  { key: "Grupo",               header: "Grupo",                 group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",              header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "C1" },
  { key: "Fecha Creación AD",   header: "Fecha Creación AD",     group: "C1" },
  { key: "Ultimo Login AD",     header: "Último Login AD",       group: "C1" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

// NPAC sí trae "Estado" (hardcodeado "Activo" en el backend).
const appNpac: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",                group: "C1" },
  { key: "Matrícula",           header: "Matrícula",              group: "C1" },
  { key: "Grupo",               header: "Grupo",                  group: "C1" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",         group: "C1" },
  { key: "Nombre",              header: "Nombre",                 group: "C1" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",    group: "C1" },
  { key: "Estado",              header: "Estado",                 group: "C1" },
  { key: "Fecha Creación AD",   header: "Fecha Creación AD",      group: "C1" },
  { key: "Ultimo Login AD",     header: "Último Login AD",        group: "C1" },

  { key: "activoGDH",           header: "Activo en GDH",          group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",          group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",          group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",           group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",          group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",    group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",           group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve el backend.
export const hallazgoAppsCriticas: Record<string, ColumnDef[]> = {
  "App Exactus": appExactus,
  "App SDP":     appSdp,
  "App SIT":     appSit,
  "App NPAC":    appNpac,
};
