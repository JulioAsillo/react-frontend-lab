/**
 * hallazgo-ad.ts — Certificación de Usuarios / Active Directory
 * persistKey: "ad"  |  fuente: hallazgos_ad.py (generar_reporte_hallazgos_ad)
 */
import type { ColumnDef } from "./types";

export const hallazgoAd: ColumnDef[] = [
  { key: "Usuario",              header: "Usuario",              group: "C1" },
  { key: "Matricula",            header: "Matrícula",            group: "C1" },
  { key: "Tipo de Cuenta",       header: "Tipo de Cuenta",        group: "C1" },
  { key: "Nombre",               header: "Nombre",                group: "C1" },
  { key: "Unidad organizativa",  header: "Unidad Organizativa",  group: "C1" },
  { key: "Fecha Creación",       header: "Fecha Creación",        group: "C1" },
  { key: "Fecha Bloqueo",        header: "Fecha Bloqueo",         group: "C1" },
  { key: "Ultimo Login",         header: "Último Login",          group: "C1" },
  { key: "Estado",               header: "Estado",                group: "C1" },

  { key: "activoGDH",            header: "Activo en GDH",         group: "C1" },
  { key: "cesadoGDH",            header: "Cesado en GDH",         group: "C1" },
  { key: "Fecha Cese",           header: "Fecha de Cese",         group: "C1" },

  { key: "sinUso>90d",           header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",        header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",         header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",    header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",         header: "Sin Sustento",          group: "VALIDACION" },
];
