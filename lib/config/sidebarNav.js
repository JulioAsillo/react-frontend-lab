/**
 * sidebarNav.js — Modelo declarativo de la navegación del Admin.
 *
 * Antes, AdminSidebar.jsx repetía TRES bloques de JSX casi idénticos
 * (Usuarios / Privilegiados / Perfiles), cada uno con la misma estructura:
 *   Recopilar → Base de Datos → fuentes → Consolidados → sub-tabs → Hallazgos → items → Informe
 *
 * Ahora esa estructura se describe una sola vez aquí como datos, y el sidebar
 * la renderiza con un único loop. Para agregar/quitar un hallazgo, una fuente BD
 * o un módulo, se edita ESTE archivo — no el JSX del sidebar.
 *
 * IMPORTANTE: cada item de hallazgo ahora incluye `persistKey`. Esto arregla el
 * bug por el que el spinner "cargando reporte" del sidebar nunca se activaba
 * (HallazgoNavItem leía item.persistKey, que antes no existía).
 */
import { BD_SOURCES } from "@/lib/mock/bdSources";
import { PERFILES_BD_SOURCES, PERFILES_CONSOLIDADOS } from "@/lib/mock/perfilesBDSources";
import { PRIV_BD_SOURCES, PRIV_CONSOLIDADOS } from "@/lib/mock/privBDSources";

// Sub-nav de Consolidados de Usuarios (antes inline en AdminSidebar)
const USUARIOS_CONSOLIDADOS = [
  { label: "Clasificación de Cuenta", icon: "🏷", tabParam: "clasificacion" },
  { label: "Post Ceses",              icon: "🚪", tabParam: "postCese" },
];

/** @typedef {{ label:string, icon:string, route:string, persistKey:string }} HallazgoItem */

export const ADMIN_MODULES = [
  {
    key: "usuarios",
    label: "Usuarios",
    icon: "👥",
    base: "/admin/usuarios",
    recopilacion: {
      // botón "Recopilar Información"
      recopRoute: "/admin/usuarios/recopilacion",
      // fila intermedia "Base de Datos" (Usuarios y Perfiles la tienen; Privilegiados no)
      hasBdSubButton: true,
      bdRoute: "/admin/usuarios/recopilacion/base-datos",
      bdSources: BD_SOURCES,
      consolidadosRoute: "/admin/usuarios/recopilacion/consolidados",
      consolidadosSubnav: USUARIOS_CONSOLIDADOS,
    },
    hallazgos: {
      route: "/admin/usuarios/hallazgos",
      defaultRoute: "/admin/usuarios/hallazgos/cesados",
      items: /** @type {HallazgoItem[]} */ ([
        { label: "Preliminares",     icon: "🔍", route: "/admin/usuarios/hallazgos/cesados",                persistKey: "cesados" },
        { label: "Active Directory", icon: "🖥",  route: "/admin/usuarios/hallazgos/active-directory",       persistKey: "ad" },
        { label: "Entra ID",         icon: "☁️", route: "/admin/usuarios/hallazgos/entra-id",               persistKey: "entra" },
        { label: "Apps Críticas",    icon: "📱", route: "/admin/usuarios/hallazgos/aplicaciones-criticas",  persistKey: "apps" },
        { label: "Base de Datos",    icon: "🗄",  route: "/admin/usuarios/hallazgos/base-datos",             persistKey: "bd" },
      ]),
    },
    informe: { route: "/admin/usuarios/informe", label: "Informe de Certificación" },
  },

  {
    key: "privilegiados",
    label: "Privilegiados",
    icon: "🔐",
    base: "/admin/privilegiados",
    recopilacion: {
      // En Privilegiados "Recopilar" va directo a base-datos y NO hay fila intermedia.
      recopRoute: "/admin/privilegiados/recopilacion",
      hasBdSubButton: true,
      bdRoute: "/admin/privilegiados/recopilacion/base-datos",
      bdSources: PRIV_BD_SOURCES,
      consolidadosRoute: "/admin/privilegiados/recopilacion/consolidados",
      consolidadosSubnav: PRIV_CONSOLIDADOS,
    },
    hallazgos: {
      route: "/admin/privilegiados/hallazgos",
      defaultRoute: "/admin/privilegiados/hallazgos/windows",
      items: /** @type {HallazgoItem[]} */ ([
        { label: "Windows",       icon: "🪟", route: "/admin/privilegiados/hallazgos/windows",       persistKey: "priv-windows" },
        { label: "Linux",         icon: "🐧", route: "/admin/privilegiados/hallazgos/linux",         persistKey: "priv-linux" },
        { label: "DBA",           icon: "🗄",  route: "/admin/privilegiados/hallazgos/dba",           persistKey: "priv-dba" },
        { label: "SysAdmin",      icon: "⚙️", route: "/admin/privilegiados/hallazgos/sysadmin",      persistKey: "priv-sysadmin" },
        { label: "Domain Admin",  icon: "🔑", route: "/admin/privilegiados/hallazgos/domain-admin",  persistKey: "priv-domain-admin" },
        { label: "Local Admin",   icon: "🖥",  route: "/admin/privilegiados/hallazgos/local-admin",   persistKey: "priv-local-admin" },
        { label: "Apps Críticas", icon: "📱", route: "/admin/privilegiados/hallazgos/apps-criticas", persistKey: "priv-apps" },
        { label: "MFA",           icon: "🔒", route: "/admin/privilegiados/hallazgos/mfa",           persistKey: "priv-mfa" },
      ]),
    },
    informe: { route: "/admin/privilegiados/informe", label: "Informe" },
  },

  {
    key: "perfiles",
    label: "Perfiles",
    icon: "👤",
    base: "/admin/perfiles",
    recopilacion: {
      recopRoute: "/admin/perfiles/recopilacion",
      hasBdSubButton: true,
      bdRoute: "/admin/perfiles/recopilacion/base-datos",
      bdSources: PERFILES_BD_SOURCES,
      consolidadosRoute: "/admin/perfiles/recopilacion/consolidados",
      consolidadosSubnav: PERFILES_CONSOLIDADOS,
    },
    hallazgos: {
      route: "/admin/perfiles/hallazgos",
      defaultRoute: "/admin/perfiles/hallazgos/roles",
      items: /** @type {HallazgoItem[]} */ ([
        { label: "Activos GDH", icon: "🏷", route: "/admin/perfiles/hallazgos/roles",   persistKey: "prf-roles" },
        { label: "Apps",    icon: "📱", route: "/admin/perfiles/hallazgos/apps",    persistKey: "prf-apps" },
        { label: "DBs",     icon: "🗄",  route: "/admin/perfiles/hallazgos/dbs",     persistKey: "prf-dbs" },
        { label: "Moviper", icon: "🔄", route: "/admin/perfiles/hallazgos/moviper", persistKey: "prf-moviper" },
      ]),
    },
    informe: { route: "/admin/perfiles/informe", label: "Informe" },
  },
];

// Módulos raíz siempre visibles + estado deshabilitado
export const ROOT_MODULES = [
  { key: "usuarios",      label: "Usuarios",             icon: "👥", route: "/admin/usuarios" },
  { key: "privilegiados", label: "Privilegiados",        icon: "🔐", route: "/admin/privilegiados" },
  { key: "perfiles",      label: "Perfiles",             icon: "👤", route: "/admin/perfiles" },
  { key: "herramientas",  label: "Herramientas",         icon: "🔧", disabled: true },
  { key: "politica",      label: "Política Contraseñas", icon: "🔑", route: "/admin/politica-contrasenas" },
];
