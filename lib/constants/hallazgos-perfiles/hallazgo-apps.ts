/**
 * hallazgo-apps.ts — Certificación de Perfiles / Apps Críticas
 * persistKey: "prf-apps"  |  fuente: hallazgos_apps.py (generar_hallazgos_apps)
 *
 * OJO — typo real del backend, no es error nuestro: la key "Activo GDH"
 * (con "t") solo aparece en la hoja EXACTUS. Las hojas SDP, SIT y NPAC usan
 * "Acivo GDH" (sin la "t"). Si el backend corrige el typo, hay que
 * actualizar la key acá también.
 *
 * `group: ""` en todas — pendiente de que Julio asigne los grupos/colores.
 */
import type { ColumnDef } from "./types";

const exactus: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "Nombre del personal",    header: "Nombre del Personal",     group: "C1" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "C1" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Activo GDH",             header: "Activo en GDH",           group: "C1" },
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "C1" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "C1" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "C1" },
  { key: "Perfil",                 header: "Perfil",                  group: "C1" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "C1" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

const sdp: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "Nombre del personal",    header: "Nombre del Personal",     group: "C1" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "C1" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "C1" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "C1" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "C1" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "C1" },
  { key: "Perfil",                 header: "Perfil",                  group: "C1" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "C1" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

const sit: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "Nombre del personal",    header: "Nombre del Personal",     group: "C1" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "C1" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "C1" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "C1" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "C1" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "C1" },
  { key: "Perfil",                 header: "Perfil",                  group: "C1" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "C1" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

const npac: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                 group: "C1" },
  { key: "Nombre del personal",    header: "Nombre del Personal",     group: "C1" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "C1" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "C1" },
  { key: "Estado",                 header: "Estado",                  group: "C1" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "C1" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "C1" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "C1" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "C1" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "C1" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "C1" },
  { key: "Perfil",                 header: "Perfil",                  group: "C1" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "C1" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "C1" },
  { key: "Sustento Historico",     header: "Sustento Histórico",      group: "C1" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado",  group: "VALIDACION" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_hallazgos_apps().
export const hallazgoApps: Record<string, ColumnDef[]> = {
  EXACTUS: exactus,
  SDP: sdp,
  SIT: sit,
  NPAC: npac,
};
