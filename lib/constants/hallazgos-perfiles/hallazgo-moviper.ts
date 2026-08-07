/**
 * hallazgo-moviper.ts — Certificación de Perfiles / Moviper
 * persistKey: "prf-moviper"  |  fuente: hallazgos_moviper.py (generar_reporte_hallazgos_moviper)
 */
import type { ColumnDef } from "./types";

const moviper: ColumnDef[] = [
  { key: "Fecha Moviper",     header: "Fecha Moviper",     group: "C1" },
  { key: "Usuario",           header: "Usuario",           group: "C1" },
  { key: "Matricula",         header: "Matrícula",         group: "C1" },
  { key: "Nombre Personal",   header: "Nombre Personal",   group: "C1" },
  { key: "Tipo de personal",  header: "Tipo de Personal",  group: "C1" },
  { key: "Rol_AD",            header: "Rol AD",            group: "C1" },
  { key: "Rol destino GDH",   header: "Rol Destino GDH",   group: "C1" },
  { key: "Activo GDH",        header: "Activo en GDH",     group: "C1" },
  { key: "Cesado GDH",        header: "Cesado en GDH",     group: "C1" },
  { key: "Existe en MR",      header: "Existe en MR",      group: "C1" },
  { key: "Validación Rol",    header: "Validación Rol",    group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_reporte_hallazgos_moviper().
export const hallazgoMoviper: Record<string, ColumnDef[]> = {
  Moviper: moviper,
};
