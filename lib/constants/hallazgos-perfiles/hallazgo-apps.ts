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
  { key: "Usuario",                header: "Usuario",                group: "" },
  { key: "Nombre del personal",    header: "Nombre del Personal",    group: "" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Activo GDH",             header: "Activo en GDH",           group: "" },
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "" },
  { key: "Perfil",                 header: "Perfil",                  group: "" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

const sdp: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                group: "" },
  { key: "Nombre del personal",    header: "Nombre del Personal",    group: "" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "" },
  { key: "Perfil",                 header: "Perfil",                  group: "" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

const sit: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                group: "" },
  { key: "Nombre del personal",    header: "Nombre del Personal",    group: "" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "" },
  { key: "Perfil",                 header: "Perfil",                  group: "" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

const npac: ColumnDef[] = [
  { key: "Usuario",                header: "Usuario",                group: "" },
  { key: "Nombre del personal",    header: "Nombre del Personal",    group: "" },
  { key: "Tipo de Personal",       header: "Tipo de Personal",        group: "" },
  { key: "Tipo Cuenta",            header: "Tipo de Cuenta",          group: "" },
  { key: "Estado",                 header: "Estado",                  group: "" },
  { key: "Acivo GDH",              header: "Activo en GDH",           group: "" }, // typo real del backend (sin "t")
  { key: "Cesado GDH",             header: "Cesado en GDH",           group: "" },
  { key: "Rol GDH",                header: "Rol GDH",                 group: "" },
  { key: "Rol AD",                 header: "Rol AD",                  group: "" },
  { key: "Clasificación AD",       header: "Clasificación AD",        group: "" },
  { key: "Rol Final (AD)",         header: "Rol Final (AD)",          group: "" },
  { key: "Perfil",                 header: "Perfil",                  group: "" },
  { key: "ROl + Perfil",           header: "Rol + Perfil",            group: "" },
  { key: "Regla de Nego en MR",    header: "Regla de Negocio en MR",  group: "" },
  { key: "Sustento Historico",     header: "Sustento Histórico",     group: "" },
  { key: "Perfil No Identificado", header: "Perfil No Identificado", group: "" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_hallazgos_apps().
export const hallazgoApps: Record<string, ColumnDef[]> = {
  EXACTUS: exactus,
  SDP: sdp,
  SIT: sit,
  NPAC: npac,
};
