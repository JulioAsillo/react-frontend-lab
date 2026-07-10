/**
 * hallazgo-ad.ts — Certificación de Usuarios / Active Directory
 * persistKey: "ad"  |  fuente: hallazgos_ad.py (generar_reporte_hallazgos_ad)
 */
import type { ColumnDef } from "./types";

export const hallazgoAd: ColumnDef[] = [
  { key: "Usuario",              header: "Usuario",              group: "AD" },
  { key: "Matricula",            header: "Matrícula",            group: "AD" },
  { key: "Tipo de Cuenta",       header: "Tipo de Cuenta",        group: "AD" },
  { key: "Nombre",               header: "Nombre",                group: "AD" },
  { key: "Unidad organizativa",  header: "Unidad Organizativa",  group: "AD" },
  { key: "Fecha Creación",       header: "Fecha Creación",        group: "AD" },
  { key: "Fecha Bloqueo",        header: "Fecha Bloqueo",         group: "AD" },
  { key: "Ultimo Login",         header: "Último Login",          group: "AD" },
  { key: "Estado",               header: "Estado",                group: "AD" },

  { key: "activoGDH",            header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",            header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",           header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",           header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",        header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",         header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",    header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",         header: "Sin Sustento",          group: "VALIDACION" },
];
