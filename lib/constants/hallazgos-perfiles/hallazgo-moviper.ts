/**
 * hallazgo-moviper.ts — Certificación de Perfiles / Moviper
 * persistKey: "prf-moviper"  |  fuente: hallazgos_moviper.py (generar_reporte_hallazgos_moviper)
 */
import type { ColumnDef } from "./types";

const moviper: ColumnDef[] = [
  { key: "Fecha Moviper",     header: "Fecha Moviper",     group: "" },
  { key: "Usuario",           header: "Usuario",           group: "" },
  { key: "Matricula",         header: "Matrícula",        group: "" },
  { key: "Nombre Personal",   header: "Nombre Personal",   group: "" },
  { key: "Tipo de personal",  header: "Tipo de Personal",  group: "" },
  { key: "Rol_AD",            header: "Rol AD",            group: "" },
  { key: "Rol destino GDH",   header: "Rol Destino GDH",   group: "" },
  { key: "Activo GDH",        header: "Activo en GDH",     group: "" },
  { key: "Cesado GDH",        header: "Cesado en GDH",     group: "" },
  { key: "Existe en MR",      header: "Existe en MR",      group: "" },
  { key: "Validación Rol",    header: "Validación Rol",    group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_reporte_hallazgos_moviper().
export const hallazgoMoviper: Record<string, ColumnDef[]> = {
  Moviper: moviper,
};
