/**
 * hallazgo-local-admin.ts — Certificación de Privilegiados / Local Admin
 * persistKey: "priv-local-admin"  |  fuente: hallazgos_local_admin.py (generar_hallazgos_local_admin)
 *
 * Mismas columnas que hallazgo-domain-admin.ts (backend estructuralmente
 * idéntico), pero se escribe aparte porque son reportes/hojas distintos.
 */
import type { ColumnDef } from "./types";

const localAdmin: ColumnDef[] = [
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

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_local_admin().
export const hallazgoLocalAdmin: Record<string, ColumnDef[]> = {
  "local-admin": localAdmin,
};
