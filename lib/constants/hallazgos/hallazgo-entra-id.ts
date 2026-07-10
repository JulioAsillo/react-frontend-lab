/**
 * hallazgo-entra-id.ts — Certificación de Usuarios / Entra ID
 * persistKey: "entra"  |  fuente: hallazgos_entra_id.py (generar_reporte_hallazgos_entra_id)
 */
import type { ColumnDef } from "./types";

export const hallazgoEntraId: ColumnDef[] = [
  { key: "Upn",                   header: "UPN",                   group: "ENTRA" },
  { key: "Correo",                header: "Correo",                group: "ENTRA" },
  { key: "Matricula (SAM/City)",  header: "Matrícula (SAM/City)",  group: "ENTRA" },
  { key: "Tipo Creación",         header: "Tipo de Creación",      group: "ENTRA" },
  { key: "Tipo de Cuenta",        header: "Tipo de Cuenta",        group: "ENTRA" },
  { key: "Nombre",                header: "Nombre",                group: "ENTRA" },
  { key: "Unidad organizativa",   header: "Unidad Organizativa",  group: "ENTRA" },
  { key: "Estado",                header: "Estado",                group: "ENTRA" },
  { key: "Fecha Creación",        header: "Fecha Creación",        group: "ENTRA" },
  { key: "Fecha Ultimo Login",    header: "Fecha Último Login",   group: "ENTRA" },

  { key: "activoGDH",             header: "Activo en GDH",         group: "GDH" },
  { key: "cesadoGDH",             header: "Cesado en GDH",         group: "GDH" },
  { key: "Fecha Cese",            header: "Fecha de Cese",         group: "GDH" },

  { key: "sinUso>90d",            header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",          header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",     header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",          header: "Sin Sustento",          group: "VALIDACION" },
];
