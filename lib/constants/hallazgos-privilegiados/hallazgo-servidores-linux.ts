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

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_servidores_linux().
export const hallazgoServidoresLinux: Record<string, ColumnDef[]> = {
  linux: linux,
};
