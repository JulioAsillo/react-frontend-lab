/**
 * hallazgo-sysadmin.ts — Certificación de Privilegiados / SysAdmin (DB SIT)
 * persistKey: "priv-sysadmin"  |  fuente: hallazgos_sysadmin.py (generar_hallazgos_sysadmin)
 *
 * OJO — typo real del backend: la key es "Fech Creación" (sin la "a" de
 * "Fecha"). El `header` sí dice "Fecha Creación" (correcto, es solo texto
 * mostrado), pero la `key` respeta el typo porque tiene que matchear exacto.
 */
import type { ColumnDef } from "./types";

const sysAdmin: ColumnDef[] = [
  { key: "Name DB",          header: "DB Name",          group: "" },
  { key: "loginName",        header: "Login Name",        group: "" },
  { key: "Usuario",          header: "Usuario",           group: "" },
  { key: "ServerRole",       header: "Server Role",       group: "" },
  { key: "Estado",           header: "Estado",             group: "" },
  { key: "Fech Creación",    header: "Fecha Creación",    group: "" }, // typo real del backend (sin "a")
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",    group: "" },
  { key: "Matricula",        header: "Matrícula",         group: "" },
  { key: "Nombre",           header: "Nombre",            group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",     group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",     group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",     group: "" },
  { key: "No Identificado",  header: "No Identificado",   group: "" },
  { key: "Comentario",       header: "Comentario",        group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_sysadmin().
export const hallazgoSysadmin: Record<string, ColumnDef[]> = {
  SysAdmin: sysAdmin,
};
