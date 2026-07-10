/**
 * hallazgo-servidores-windows.ts — Certificación de Privilegiados / Servidores Windows
 * persistKey: "priv-windows"  |  fuente: hallazgos_servidores_windows.py (generar_hallazgos_servidores_windows)
 *
 * Mismas columnas que hallazgo-servidores-linux.ts (backend estructuralmente
 * idéntico, incluida la misma inconsistencia de casing en "No Identificado").
 */
import type { ColumnDef } from "./types";

const windows: ColumnDef[] = [
  { key: "Tipo",             header: "Tipo",             group: "" },
  { key: "Servidor",         header: "Servidor",         group: "" },
  { key: "Aplicación",       header: "Aplicación",       group: "" },
  { key: "Usuario",          header: "Usuario",          group: "" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",   group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",    group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",    group: "" },
  { key: "Fecha Cese",       header: "Fecha de Cese",    group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",    group: "" },
  { key: "No Identificado",  header: "No Identificado",  group: "" },
  { key: "Comentario",       header: "Comentario",       group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_servidores_windows().
export const hallazgoServidoresWindows: Record<string, ColumnDef[]> = {
  windows: windows,
};
