/**
 * hallazgo-roles.ts — Certificación de Perfiles / Validación de Roles
 * persistKey: "prf-roles"  |  fuente: validacion_roles.py (generar_reporte_validacion_roles)
 *
 * OJO — typo real del backend: la key es "U. Organizatia" (sin la "v" de
 * "Organizativa"). Si lo corrigen en el backend, actualizar acá también.
 */
import type { ColumnDef } from "./types";

const roles: ColumnDef[] = [
  { key: "Matricula",             header: "Matrícula",              group: "" },
  { key: "Nombre Completo",       header: "Nombre Completo",        group: "" },
  { key: "Tipo de Personal",      header: "Tipo de Personal",        group: "" },
  { key: "Cod Función",           header: "Cód. Función",           group: "" },
  { key: "Función",               header: "Función",                group: "" },
  { key: "Cod U. Organizativa",   header: "Cód. U. Organizativa",   group: "" },
  { key: "U. Organizatia",        header: "U. Organizativa",        group: "" }, // typo real del backend (sin "v")
  { key: "Rol GDH",               header: "Rol GDH",                 group: "" },
  { key: "Rol AD",                header: "Rol AD",                  group: "" },
  { key: "Existe en MR",          header: "Existe en MR",            group: "" },
  { key: "Validación Rol",        header: "Validación Rol",          group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_reporte_validacion_roles().
export const hallazgoRoles: Record<string, ColumnDef[]> = {
  Roles: roles,
};
