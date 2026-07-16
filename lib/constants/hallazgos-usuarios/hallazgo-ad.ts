/**
 * hallazgo-ad.ts — Certificación de Usuarios / Active Directory
 * persistKey: "ad"  |  fuente: hallazgos_ad.py (generar_reporte_hallazgos_ad)
 */
import type { ColumnDef } from "./types";

export const hallazgoAd: ColumnDef[] = [
  { key: "Usuario",              header: "Usuario",              group: "C9" },
  { key: "Matricula",            header: "Matrícula",            group: "C9" },
  { key: "Correo",               header: "Correo",               group: "C9" },
  { key: "Tipo de Cuenta",       header: "Tipo de Cuenta",        group: "C9" },
  { key: "Nombre",               header: "Nombre",                group: "C9" },
  { key: "Unidad organizativa",  header: "Unidad Organizativa",  group: "C9" },
  { key: "Fecha Creación",       header: "Fecha Creación",        group: "C9" },
  { key: "Fecha Bloqueo",        header: "Fecha Bloqueo",         group: "C9" },
  { key: "Ultimo Login",         header: "Último Login",          group: "C9" },
  { key: "Estado",               header: "Estado",                group: "C9" },

  { key: "activoGDH",            header: "Activo en GDH",         group: "C9" },
  { key: "cesadoGDH",            header: "Cesado en GDH",         group: "C9" },
  { key: "Fecha Cese",           header: "Fecha de Cese",         group: "C9" },

  { key: "sinUso>90d",           header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "bloqueado>30d",        header: "Bloqueado >30d",        group: "VALIDACION" },
  { key: "cesadoActivo",         header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",    header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",         header: "Sin Sustento",          group: "VALIDACION" },
  { key: "Validación",            header: "Validación",             group: "VALIDACION" },
];
