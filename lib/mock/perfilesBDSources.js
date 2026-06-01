/**
 * perfilesBDSources.js — Fuentes de datos del módulo Perfiles.
 * v23.1 — fuentes reales mapeadas desde los endpoints del backend.
 *
 * Formato de respuesta: { "fecha_corte": "...", "data": { "<key>": [...] } }
 * GDH tiene dos colecciones (gdh_activos + gdh_cesados) bajo el mismo endpoint.
 */

export const PERFILES_BD_SOURCES = [
  {
    id: "prf-ad",
    label: "Active Directory",
    icon: "🖥",
    endpoint: "/datos/ad",
    dataKey: "ad_users",
    cols: ["usuario", "nombre", "correo", "rol", "isActivo", "clasificacion",
           "fecha_creacion", "fecha_ult_login", "fecha_cambio"],
    dateCols: ["fecha_creacion", "fecha_ult_login", "fecha_cambio"],
  },
  {
    id: "prf-gdh",
    label: "GDH (Personal)",
    icon: "👤",
    endpoint: "/datos/gdh",
    dataKey: ["gdh_activos", "gdh_cesados"],
    cols: ["matricula", "nombre", "apellido_paterno", "apellido_materno", "dni",
           "esProveedor", "cod_funcion", "funcion", "cod_uni_orga",
           "u_organizativa", "fecha_alta", "fecha_cese", "isActivo", "isCesado"],
    dateCols: ["fecha_alta", "fecha_cese"],
  },
  {
    id: "prf-moviper",
    label: "MOVIPER",
    icon: "🔄",
    endpoint: "/datos/moviper",
    dataKey: "moviper",
    cols: ["fecha_moviper", "usuario", "matricula", "nombre_personal", "rol_dest_gdh"],
    dateCols: ["fecha_moviper"],
  },
  {
    id: "prf-matriz-rol",
    label: "Matriz de Rol",
    icon: "🏷",
    endpoint: "/datos/matriz_rol",
    dataKey: "matriz_rol",
    cols: ["rol_vigente", "tipo_rol", "nombre_rol", "responsable",
           "cod_fun", "nombre_fun", "cod_unid_orga", "nombre_unid_org",
           "nombre_modulo", "nombre_aplicativo", "grupo",
           "permisos_adicionales", "idm", "descripcion",
           "regla_ngocio", "nombre_responsable", "rol_historico", "tipo_elemento"],
    dateCols: [],
  },
  {
    id: "prf-app-exactus",
    label: "App Exactus",
    icon: "⚙",
    endpoint: "/datos/app-prf-exactus",
    dataKey: "app_prf_exactus",
    cols: ["grupo", "nombre_grupo", "usuario", "user_nombre", "isActive"],
    dateCols: [],
  },
  {
    id: "prf-app-sdp",
    label: "App SDP",
    icon: "⚙",
    endpoint: "/datos/app-prf-sdp",
    dataKey: "app_prf_sdp",
    cols: ["usuario", "cod_rol", "des_rol", "isActive"],
    dateCols: [],
  },
  {
    id: "prf-app-sit",
    label: "App SIT",
    icon: "⚙",
    endpoint: "/datos/app-prf-sit",
    dataKey: "app_prf_sit",
    cols: ["usuario", "full_name", "isActive", "grupo"],
    dateCols: [],
  },
  {
    id: "prf-app-npac",
    label: "App NPAC",
    icon: "⚙",
    endpoint: "/datos/app-prf-npac",
    dataKey: "app_prf_npac",
    cols: ["usuario", "full_name", "isActive", "grupo"],
    dateCols: [],
  },
  {
    id: "prf-db-sdp",
    label: "DB SDP",
    icon: "🗄",
    endpoint: "/datos/app-db-prf-sdp",
    dataKey: "app_db_prf_sdp",
    cols: ["grantee", "grantee_role", "isActive"],
    dateCols: [],
  },
  {
    id: "prf-db-exactus",
    label: "DB Exactus",
    icon: "🗄",
    endpoint: "/datos/app-db-prf-exactus",
    dataKey: "app_db_prf_exactus",
    cols: ["grantee", "grantee_role", "isActive"],
    dateCols: [],
    isLast: true,
  },
];

export const PERFILES_CONSOLIDADOS = [
  { label: "Clasificación de Cuenta", icon: "🏷",  tabParam: "clasificacion" },
  { label: "DB-Roles",                icon: "🗄",   tabParam: "db-roles"      },
  { label: "DB-Sustentos",            icon: "📝",  tabParam: "db-sustentos"  },
  { label: "App-Sustentos",           icon: "📱",  tabParam: "app-sustentos" },
];
