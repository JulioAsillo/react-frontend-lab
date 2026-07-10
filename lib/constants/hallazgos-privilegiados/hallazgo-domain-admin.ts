/**
 * hallazgo-domain-admin.ts — Certificación de Privilegiados / Domain Admin
 * persistKey: "priv-domain-admin"  |  fuente: hallazgos_domain_admin.py (generar_hallazgos_dom_admin)
 */
import type { ColumnDef } from "./types";

const domainAdmin: ColumnDef[] = [
  { key: "Usuario",         header: "Usuario",              group: "" },
  { key: "Matricula",       header: "Matrícula",            group: "" },
  { key: "Nombre Usuario",  header: "Nombre Usuario",       group: "" },
  { key: "Tipo Cuenta",     header: "Tipo de Cuenta",       group: "" },
  { key: "Grupo AD",        header: "Grupo AD",              group: "" },
  { key: "Grupo Accesos",   header: "Grupo Accesos",         group: "" },
  { key: "Estado AD",       header: "Estado AD",             group: "" },
  { key: "Estado Accesos",  header: "Estado Accesos",        group: "" },
  { key: "Fecha Creación",  header: "Fecha Creación",        group: "" },
  { key: "Ultimo Login",    header: "Último Login",         group: "" },
  { key: "Activo GDH",      header: "Activo en GDH",         group: "" },
  { key: "Cesado GDH",      header: "Cesado en GDH",         group: "" },
  { key: "Fuente",          header: "Fuente",                group: "" },
  { key: "Cesado Activo",   header: "Cesado Activo",         group: "" },
  { key: "No Identificado", header: "No Identificado",       group: "" },
  { key: "Sin Sustento",    header: "Sin Sustento",          group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_dom_admin().
export const hallazgoDomainAdmin: Record<string, ColumnDef[]> = {
  "domain-admin": domainAdmin,
};
