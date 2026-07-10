/**
 * hallazgo-servidores-linux.ts — Certificación de Privilegiados / Servidores Linux
 * persistKey: "priv-linux"  |  fuente: hallazgos_servidores_linux.py (generar_hallazgos_servidores_linux)
 *
 * Ojo: "No Identificado" viene en minúscula ("correcto") cuando hay
 * sustento histórico, y "Incorrecto" (con mayúscula) por defecto — es así
 * en el backend real (inconsistencia de casing entre valores de la misma
 * columna), no un typo nuestro. No afecta este archivo (es de columnas,
 * no de valores) pero puede afectar el pintado por valor si se usa.
 */
import type { ColumnDef } from "./types";

const linux: ColumnDef[] = [
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

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_servidores_linux().
export const hallazgoServidoresLinux: Record<string, ColumnDef[]> = {
  linux: linux,
};
