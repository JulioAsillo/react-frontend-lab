/**
 * hallazgo-domain-admin.ts — Certificación de Privilegiados / Domain Admin
 * persistKey: "priv-domain-admin"  |  fuente: hallazgos_domain_admin.py (generar_hallazgos_dom_admin)
 */
import type { ColumnDef } from "./types";

const domainAdmin: ColumnDef[] = [
  { key: "Usuario",         header: "Usuario",               group: "C1" },
  { key: "Matricula",       header: "Matrícula",             group: "C1" },
  { key: "Nombre Usuario",  header: "Nombre Usuario",        group: "C1" },
  { key: "Tipo Cuenta",     header: "Tipo de Cuenta",        group: "C1" },
  { key: "Grupo AD",        header: "Grupo AD",              group: "C1" },
  { key: "Grupo Accesos",   header: "Grupo Accesos",         group: "C1" },
  { key: "Estado AD",       header: "Estado AD",             group: "C1" },
  { key: "Estado Accesos",  header: "Estado Accesos",        group: "C1" },
  { key: "Fecha Creación",  header: "Fecha Creación",        group: "C1" },
  { key: "Ultimo Login",    header: "Último Login",          group: "C1" },
  { key: "Activo GDH",      header: "Activo en GDH",         group: "C1" },
  { key: "Cesado GDH",      header: "Cesado en GDH",         group: "C1" },
  { key: "Fuente",          header: "Fuente",                group: "C1" },
  { key: "Cesado Activo",   header: "Cesado Activo",         group: "VALIDACION" },
  { key: "No Identificado", header: "No Identificado",       group: "VALIDACION" },
  { key: "Sin Sustento",    header: "Sin Sustento",          group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_dom_admin().
export const hallazgoDomainAdmin: Record<string, ColumnDef[]> = {
  "domain-admin": domainAdmin,
};
