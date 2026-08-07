/**
 * hallazgo-servidores-windows.ts — Certificación de Privilegiados / Servidores Windows
 * persistKey: "priv-windows"  |  fuente: hallazgos_servidores_windows.py (generar_hallazgos_servidores_windows)
 *
 * Mismas columnas que hallazgo-servidores-linux.ts (backend estructuralmente
 * idéntico, incluida la misma inconsistencia de casing en "No Identificado").
 */
import type { ColumnDef } from "./types";

const windows: ColumnDef[] = [
  { key: "Tipo",             header: "Tipo",             group: "C1" },
  { key: "Servidor",         header: "Servidor",         group: "C1" },
  { key: "Aplicación",       header: "Aplicación",       group: "C1" },
  { key: "Usuario",          header: "Usuario",          group: "C1" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",   group: "C1" },
  { key: "Activo GDH",       header: "Activo en GDH",    group: "C1" },
  { key: "Cesado GDH",       header: "Cesado en GDH",    group: "C1" },
  { key: "Fecha Cese",       header: "Fecha de Cese",    group: "C1" },
  { key: "Cesado Activo",    header: "Cesado Activo",    group: "VALIDACION" },
  { key: "No Identificado",  header: "No Identificado",  group: "VALIDACION" },
  { key: "Comentario",       header: "Comentario",       group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_servidores_windows().
export const hallazgoServidoresWindows: Record<string, ColumnDef[]> = {
  windows: windows,
};
