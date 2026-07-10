/**
 * hallazgo-apps-criticas.ts — Certificación de Usuarios / Apps Críticas
 * persistKey: "apps"  |  fuente: hallazgos_aplicaciones_criticas.py
 *
 * 4 hojas, cada una con sus propias columnas (nombres de hoja EXACTOS
 * como los devuelve el backend, son las keys del dict de retorno).
 */
import type { ColumnDef } from "./types";

const appExactus: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "EXACTUS" },
  { key: "Matrícula",           header: "Matrícula",            group: "EXACTUS" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "EXACTUS" },
  { key: "Nombre",              header: "Nombre",                group: "EXACTUS" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "EXACTUS" },
  { key: "Estado",              header: "Estado",                group: "EXACTUS" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "EXACTUS" },
  { key: "Ultimo Login",        header: "Último Login",          group: "EXACTUS" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

const appSdp: ColumnDef[] = [
  { key: "Usuario",             header: "Usuario",              group: "SDP" },
  { key: "Matrícula",           header: "Matrícula",            group: "SDP" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "SDP" },
  { key: "Nombre",              header: "Nombre",                group: "SDP" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "SDP" },
  { key: "Estado",              header: "Estado",                group: "SDP" },
  { key: "Fecha Creación",      header: "Fecha Creación",        group: "SDP" },
  { key: "Ultimo Login",        header: "Último Login",          group: "SDP" },

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
  { key: "Usuario",             header: "Usuario",              group: "SIT" },
  { key: "Matrícula",           header: "Matrícula",            group: "SIT" },
  { key: "Grupo",               header: "Grupo",                 group: "SIT" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "SIT" },
  { key: "Nombre",              header: "Nombre",                group: "SIT" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "SIT" },
  { key: "Fecha Creación AD",   header: "Fecha Creación AD",     group: "SIT" },
  { key: "Ultimo Login AD",     header: "Último Login AD",       group: "SIT" },

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
  { key: "Usuario",             header: "Usuario",              group: "NPAC" },
  { key: "Matrícula",           header: "Matrícula",            group: "NPAC" },
  { key: "Grupo",               header: "Grupo",                 group: "NPAC" },
  { key: "Tipo de Cuenta",      header: "Tipo de Cuenta",        group: "NPAC" },
  { key: "Nombre",              header: "Nombre",                group: "NPAC" },
  { key: "Unidad organizativa", header: "Unidad Organizativa",  group: "NPAC" },
  { key: "Estado",              header: "Estado",                group: "NPAC" },
  { key: "Fecha Creación AD",   header: "Fecha Creación AD",     group: "NPAC" },
  { key: "Ultimo Login AD",     header: "Último Login AD",       group: "NPAC" },

  { key: "activoGDH",           header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",           header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",          header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",          header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",        header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",   header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",        header: "Sin Sustento",          group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve el backend.
export const hallazgoAppsCriticas: Record<string, ColumnDef[]> = {
  "App Exactus": appExactus,
  "App SDP":     appSdp,
  "App SIT":     appSit,
  "App NPAC":    appNpac,
};
