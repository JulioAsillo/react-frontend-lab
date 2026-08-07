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
  { key: "Name DB",          header: "DB Name",           group: "C1" },
  { key: "loginName",        header: "Login Name",        group: "C1" },
  { key: "Usuario",          header: "Usuario",           group: "C1" },
  { key: "ServerRole",       header: "Server Role",       group: "C1" },
  { key: "Estado",           header: "Estado",            group: "C1" },
  { key: "Fech Creación",    header: "Fecha Creación",    group: "C1" }, // typo real del backend (sin "a")
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",    group: "C1" },
  { key: "Matricula",        header: "Matrícula",         group: "C1" },
  { key: "Nombre",           header: "Nombre",            group: "C1" },
  { key: "Activo GDH",       header: "Activo en GDH",     group: "C1" },
  { key: "Cesado GDH",       header: "Cesado en GDH",     group: "C1" },
  { key: "Cesado Activo",    header: "Cesado Activo",     group: "VALIDACION" },
  { key: "No Identificado",  header: "No Identificado",   group: "VALIDACION" },
  { key: "Comentario",       header: "Comentario",        group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_sysadmin().
export const hallazgoSysadmin: Record<string, ColumnDef[]> = {
  SysAdmin: sysAdmin,
};
