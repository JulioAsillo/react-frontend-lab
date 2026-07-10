/**
 * hallazgo-app-criticas.ts — Certificación de Privilegiados / Apps Críticas
 * persistKey: "priv-apps"  |  fuente: hallazgos_app_criticas.py (generar_hallazgos_app_criticas)
 *
 * Las 4 hojas (EXACTUS/NPAC/SDP/SIT) tienen exactamente las mismas columnas
 * en este backend (misma función _hoja() para las 4) — se ve repetitivo
 * a propósito, cada columna escrita a mano por hoja.
 */
import type { ColumnDef } from "./types";

const exactus: ColumnDef[] = [
  { key: "Usuario",          header: "Usuario",             group: "" },
  { key: "Nombre Usuario",   header: "Nombre Usuario",      group: "" },
  { key: "Tipo de Personal", header: "Tipo de Personal",    group: "" },
  { key: "Función",          header: "Función",              group: "" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",       group: "" },
  { key: "Estado",           header: "Estado",               group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",           header: "Rol AD",                group: "" },
  { key: "Rol GDH",          header: "Rol GDH",               group: "" },
  { key: "Rol Final",        header: "Rol Final",             group: "" },
  { key: "Perfil",           header: "Perfil",                group: "" },
  { key: "Rol + Perfil",     header: "Rol + Perfil",          group: "" },
  { key: "Regla Negocio MR", header: "Regla de Negocio MR",  group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",         group: "" },
  { key: "No Identificado",  header: "No Identificado",       group: "" },
];

const npac: ColumnDef[] = [
  { key: "Usuario",          header: "Usuario",             group: "" },
  { key: "Nombre Usuario",   header: "Nombre Usuario",      group: "" },
  { key: "Tipo de Personal", header: "Tipo de Personal",    group: "" },
  { key: "Función",          header: "Función",              group: "" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",       group: "" },
  { key: "Estado",           header: "Estado",               group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",           header: "Rol AD",                group: "" },
  { key: "Rol GDH",          header: "Rol GDH",               group: "" },
  { key: "Rol Final",        header: "Rol Final",             group: "" },
  { key: "Perfil",           header: "Perfil",                group: "" },
  { key: "Rol + Perfil",     header: "Rol + Perfil",          group: "" },
  { key: "Regla Negocio MR", header: "Regla de Negocio MR",  group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",         group: "" },
  { key: "No Identificado",  header: "No Identificado",       group: "" },
];

const sdp: ColumnDef[] = [
  { key: "Usuario",          header: "Usuario",             group: "" },
  { key: "Nombre Usuario",   header: "Nombre Usuario",      group: "" },
  { key: "Tipo de Personal", header: "Tipo de Personal",    group: "" },
  { key: "Función",          header: "Función",              group: "" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",       group: "" },
  { key: "Estado",           header: "Estado",               group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",           header: "Rol AD",                group: "" },
  { key: "Rol GDH",          header: "Rol GDH",               group: "" },
  { key: "Rol Final",        header: "Rol Final",             group: "" },
  { key: "Perfil",           header: "Perfil",                group: "" },
  { key: "Rol + Perfil",     header: "Rol + Perfil",          group: "" },
  { key: "Regla Negocio MR", header: "Regla de Negocio MR",  group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",         group: "" },
  { key: "No Identificado",  header: "No Identificado",       group: "" },
];

const sit: ColumnDef[] = [
  { key: "Usuario",          header: "Usuario",             group: "" },
  { key: "Nombre Usuario",   header: "Nombre Usuario",      group: "" },
  { key: "Tipo de Personal", header: "Tipo de Personal",    group: "" },
  { key: "Función",          header: "Función",              group: "" },
  { key: "Tipo Cuenta",      header: "Tipo de Cuenta",       group: "" },
  { key: "Estado",           header: "Estado",               group: "" },
  { key: "Activo GDH",       header: "Activo en GDH",        group: "" },
  { key: "Cesado GDH",       header: "Cesado en GDH",        group: "" },
  { key: "Rol AD",           header: "Rol AD",                group: "" },
  { key: "Rol GDH",          header: "Rol GDH",               group: "" },
  { key: "Rol Final",        header: "Rol Final",             group: "" },
  { key: "Perfil",           header: "Perfil",                group: "" },
  { key: "Rol + Perfil",     header: "Rol + Perfil",          group: "" },
  { key: "Regla Negocio MR", header: "Regla de Negocio MR",  group: "" },
  { key: "Cesado Activo",    header: "Cesado Activo",         group: "" },
  { key: "No Identificado",  header: "No Identificado",       group: "" },
];

// Nombres de hoja = keys exactas del dict que devuelve generar_hallazgos_app_criticas().
export const hallazgoAppCriticas: Record<string, ColumnDef[]> = {
  EXACTUS: exactus,
  NPAC: npac,
  SDP: sdp,
  SIT: sit,
};
