/**
 * hallazgo-cesados.ts — Certificación de Usuarios / Hallazgos Preliminares
 * persistKey: "cesados"  |  fuente: hallazgos_cesados_v2.py
 *
 * 2 hojas con columnas totalmente distintas entre sí.
 */
import type { ColumnDef } from "./types";

const preliminares: ColumnDef[] = [
  { key: "Matricula",                 header: "Matrícula",                 group: "C1" },
  { key: "Nombre",                    header: "Nombre",                    group: "C1" },
  { key: "UPN",                       header: "UPN",                       group: "C1" },
  { key: "Unidad organizativa",       header: "Unidad Organizativa",      group: "C1" },
  { key: "Fecha de Cese",             header: "Fecha de Cese",             group: "C1" },

  { key: "AD",                        header: "AD",                        group: "C2" },
  { key: "Ultimo Login AD",           header: "Último Login AD",          group: "C2" },
  { key: "PostCese AD",               header: "Post Cese AD",              group: "C2" },

  { key: "Entra ID",                  header: "Entra ID",                  group: "C3" },
  { key: "Entra ID Ultimo Login",     header: "Entra ID Último Login",    group: "C3" },
  { key: "PostCese Entra ID",         header: "Post Cese Entra ID",        group: "C3" },

  { key: "Usr Exactus",               header: "Usr Exactus",               group: "C4" },
  { key: "Usr Exactus Ultimo Login",  header: "Usr Exactus Último Login", group: "C4" },
  { key: "PostCese Exactus App",      header: "Post Cese Exactus App",     group: "C4" },
  { key: "DB Exactus",                header: "DB Exactus",                group: "C5" },
  { key: "DB Exactus Ultimo Login",   header: "DB Exactus Último Login",  group: "C5" },
  { key: "PostCese DB Exactus",       header: "Post Cese DB Exactus",      group: "C5" },

  { key: "Usr SDP",                   header: "Usr SDP",                   group: "C6" },
  { key: "Usr SDP Ultimo Login",      header: "Usr SDP Último Login",     group: "C6" },
  { key: "PostCese SDP App",          header: "Post Cese SDP App",         group: "C6" },
  { key: "DB SDP",                    header: "DB SDP",                    group: "C7" },
  { key: "DB SDP Ultimo Login",       header: "DB SDP Último Login",      group: "C7" },
  { key: "PostCese DB SDP",           header: "Post Cese DB SDP",          group: "C7" },

  { key: "Usr SIT",                   header: "Usr SIT",                   group: "C8" },
  { key: "DB SIT",                    header: "DB SIT",                    group: "C8" },
  { key: "DB SIT Ultimo Login",       header: "DB SIT Último Login",      group: "C8" },
  { key: "PostCese DB SIT",           header: "Post Cese DB SIT",          group: "C8" },

  { key: "Usr NPAC",                  header: "Usr NPAC",                  group: "C9" },

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
