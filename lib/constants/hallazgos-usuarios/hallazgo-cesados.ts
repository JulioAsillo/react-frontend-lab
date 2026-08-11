/**
 * hallazgo-cesados.ts — Certificación de Usuarios / Hallazgos Preliminares
 * persistKey: "cesados"  |  fuente: hallazgos_cesados_v2.py
 *
 * 2 hojas con columnas totalmente distintas entre sí.
 */
import type { ColumnDef } from "./types";

const preliminares: ColumnDef[] = [
  { key: "Matricula",                 header: "Matrícula",                 group: "" },
  { key: "Nombre",                    header: "Nombre",                    group: "" },
  { key: "UPN",                       header: "UPN",                       group: "" },
  { key: "Email",                     header: "Email",                     group: "" },
  { key: "Unidad organizativa",       header: "Unidad Organizativa",       group: "" },
  { key: "Fecha de Cese",             header: "Fecha de Cese",             group: "GDH" },

  { key: "AD",                        header: "AD",                        group: "AD" },
  { key: "Ultimo Login AD",           header: "Último Login AD",          group: "AD" },
  { key: "PostCese AD",               header: "Post Cese AD",              group: "AD" },

  { key: "Entra ID",                  header: "Entra ID",                  group: "ENTRA" },
  { key: "Entra ID Ultimo Login",     header: "Entra ID Último Login",    group: "ENTRA" },
  { key: "PostCese Entra ID",         header: "Post Cese Entra ID",        group: "ENTRA" },

  { key: "Usr Exactus",               header: "Usr Exactus",               group: "EXACTUS" },
  { key: "Usr Exactus Ultimo Login",  header: "Usr Exactus Último Login", group: "EXACTUS" },
  { key: "PostCese Exactus App",      header: "Post Cese Exactus App",     group: "EXACTUS" },
  { key: "DB Exactus",                header: "DB Exactus",                group: "EXACTUS" },
  { key: "DB Exactus Ultimo Login",   header: "DB Exactus Último Login",  group: "EXACTUS" },
  { key: "PostCese DB Exactus",       header: "Post Cese DB Exactus",      group: "EXACTUS" },

  { key: "Usr SDP",                   header: "Usr SDP",                   group: "SDP" },
  { key: "Usr SDP Ultimo Login",      header: "Usr SDP Último Login",     group: "SDP" },
  { key: "PostCese SDP App",          header: "Post Cese SDP App",         group: "SDP" },
  { key: "DB SDP",                    header: "DB SDP",                    group: "SDP" },
  { key: "DB SDP Ultimo Login",       header: "DB SDP Último Login",      group: "SDP" },
  { key: "PostCese DB SDP",           header: "Post Cese DB SDP",          group: "SDP" },

  { key: "Usr SIT",                   header: "Usr SIT",                   group: "SIT" },
  { key: "DB SIT",                    header: "DB SIT",                    group: "SIT" },
  { key: "DB SIT Ultimo Login",       header: "DB SIT Último Login",      group: "SIT" },
  { key: "PostCese DB SIT",           header: "Post Cese DB SIT",          group: "SIT" },

  { key: "Usr NPAC",                  header: "Usr NPAC",                  group: "NPAC" },

  { key: "Validación Cesado Activo",  header: "Validación Cesado Activo",  group: "VALIDACION" },
  { key: "Validación Post Cese",      header: "Validación Post Cese",      group: "VALIDACION" },
  { key: "Validación Final",          header: "Validación Final",          group: "VALIDACION" },
];

const sinCity: ColumnDef[] = [
  { key: "Nombre",       header: "Nombre",         group: "" },
  { key: "Mail",         header: "Mail",           group: "ENTRA" },
  { key: "UPN",          header: "UPN",            group: "ENTRA" },
  { key: "Estado",       header: "Estado",         group: "ENTRA" },
  { key: "Creado",       header: "Fecha Creación", group: "ENTRA" },
  { key: "ultimo login", header: "Último Login",   group: "ENTRA" },
  { key: "City",         header: "City",           group: "" },
  { key: "Observación",  header: "Observación",    group: "" },
];

// Nombres de hoja = keys exactas del dict que devuelve el backend.
export const hallazgoCesados: Record<string, ColumnDef[]> = {
  "Preliminares": preliminares,
  "SinCity":      sinCity,
};
