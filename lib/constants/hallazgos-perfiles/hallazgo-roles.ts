/**
 * hallazgo-roles.ts — Certificación de Perfiles / Validación de Roles
 * persistKey: "prf-roles"  |  fuente: validacion_roles.py (generar_reporte_validacion_roles)
 *
 * OJO — typo real del backend: la key es "U. Organizatia" (sin la "v" de
 * "Organizativa"). Si lo corrigen en el backend, actualizar acá también.
 */
import type { ColumnDef } from "./types";

const roles: ColumnDef[] = [
  { key: "Matricula",             header: "Matrícula",               group: "C1" },
  { key: "Nombre Completo",       header: "Nombre Completo",         group: "C1" },
  { key: "Tipo de Personal",      header: "Tipo de Personal",        group: "C1" },
  { key: "Cod Función",           header: "Cód. Función",            group: "C1" },
  { key: "Función",               header: "Función",                 group: "C1" },
  { key: "Cod U. Organizativa",   header: "Cód. U. Organizativa",    group: "C1" },
  { key: "U. Organizatia",        header: "U. Organizativa",         group: "C1" }, // typo real del backend (sin "v")
  { key: "Rol GDH",               header: "Rol GDH",                 group: "C1" },
  { key: "Rol AD",                header: "Rol AD",                  group: "C1" },
  { key: "Existe en MR",          header: "Existe en MR",            group: "C1" },
  { key: "Validación Rol",        header: "Validación Rol",          group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_reporte_validacion_roles().
export const hallazgoRoles: Record<string, ColumnDef[]> = {
  Roles: roles,
};
