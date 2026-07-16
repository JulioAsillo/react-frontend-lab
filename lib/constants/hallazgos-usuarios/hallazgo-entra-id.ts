/**
 * hallazgo-entra-id.ts — Certificación de Usuarios / Entra ID
 * persistKey: "entra"  |  fuente: hallazgos_entra_id.py (generar_reporte_hallazgos_entra_id)
 */
import type { ColumnDef } from "./types";

export const hallazgoEntraId: ColumnDef[] = [
  { key: "Upn",                   header: "UPN",                   group: "C9" },
  { key: "Correo",                header: "Correo",                group: "C9" },
  { key: "Matricula (SAM/City)",  header: "Matrícula (SAM/City)",  group: "C9" },
  { key: "Tipo Creación",         header: "Tipo de Creación",      group: "C9" },
  { key: "Tipo de Cuenta",        header: "Tipo de Cuenta",        group: "C9" },
  { key: "Nombre",                header: "Nombre",                group: "C9" },
  { key: "Unidad organizativa",   header: "Unidad Organizativa",  group: "C9" },
  { key: "Estado",                header: "Estado",                group: "C9" },
  { key: "Fecha Creación",        header: "Fecha Creación",        group: "C9" },
  { key: "Fecha Ultimo Login",    header: "Fecha Último Login",   group: "C9" },

  { key: "activoGDH",             header: "Activo en GDH",         group: "C9" },
  { key: "cesadoGDH",             header: "Cesado en GDH",         group: "C9" },
  { key: "Fecha Cese",            header: "Fecha de Cese",         group: "C9" },

  { key: "sinUso>90d",            header: "Sin Uso >90d",          group: "VALIDACION" },
  { key: "cesadoActivo",          header: "Cesado Activo",         group: "VALIDACION" },
  { key: "actividadPostCese",     header: "Actividad Post Cese",   group: "VALIDACION" },
  { key: "Sin Sustento",          header: "Sin Sustento",          group: "VALIDACION" },
];
