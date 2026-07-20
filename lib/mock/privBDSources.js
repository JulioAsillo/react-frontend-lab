/**
 * Fuentes de recopilación para el módulo Privilegiados
 *
 * Cada fuente sigue el mismo contrato que BD_SOURCES de Usuarios:
 * { id, label, icon, endpoint, cols, dateCols?, dataKey?, isSpecial? }
 *
 * isSpecial:true → la vista usa un componente propio (ServerLinux/Windows)
 * dataKey → clave dentro de data:{} en la respuesta JSON
 */
export const PRIV_BD_SOURCES = [
  {
    id:       "app-exactus",
    label:    "App Exactus",
    icon:     "📦",
    endpoint: "/datos/privilegiados/app-exactus",
    dataKey:  "app_user",
    cols:     ["usuario","full_name","group","isActive","app_name"],
  },
  {
    id:       "app-npac",
    label:    "App NPAC",
    icon:     "📦",
    endpoint: "/datos/privilegiados/app-npac",
    dataKey:  "app_user",
    cols:     ["usuario","full_name","group","isActive","app_name"],
  },
  {
    id:       "app-sdp",
    label:    "App SDP",
    icon:     "📦",
    endpoint: "/datos/privilegiados/app-sdp",
    dataKey:  "app_user",
    cols:     ["usuario","full_name","group","isActive","app_name"],
  },
  {
    id:       "app-sit",
    label:    "App SIT",
    icon:     "📦",
    endpoint: "/datos/privilegiados/app-sit",
    dataKey:  "app_user",
    cols:     ["usuario","full_name","group","isActive","app_name"],
  },
  {
    id:       "local-admin",
    label:    "Local Admin (Inventario de Accesos)",
    icon:     "🔑",
    endpoint: "/datos/privilegiados/local-admin",
    dataKey:  "local_admin",
    cols:     ["usuario","group_ad","estado_ad","fecha_creacion","ultimo_login","fuente","matricula","grp_accesos","estado_accesos"],
    dateCols: ["fecha_creacion","ultimo_login"],
  },
  {
    id:       "domain-admin",
    label:    "Domain Admin (Inventario de Accesos)",
    icon:     "🔑",
    endpoint: "/datos/privilegiados/domain-admin",
    dataKey:  "domain_admin",
    cols:     ["group_ad","full_name","object_type","usuario","fuente","matricula","estado_ad","grp_accesos","fecha_creacion","ultimo_login","estado_accesos"],
    dateCols: ["fecha_creacion","ultimo_login"],
  },
  {
    id:        "server-linux",
    label:     "Servidores Linux",
    icon:      "🐧",
    endpoint:  "/datos/privilegiados/server-linux",
    dataKey:   "server_linux",
    cols:      [],
    isSpecial: "server-linux",
  },
  {
    id:        "server-windows",
    label:     "Servidores Windows",
    icon:      "🪟",
    endpoint:  "/datos/privilegiados/server-windows",
    dataKey:   "server_windows",
    cols:      [],
    isSpecial: "server-windows",
  },
  {
    id:       "dba-exactus",
    label:    "DBA Exactus",
    icon:     "🗄",
    endpoint: "/datos/privilegiados/dba-exactus",
    dataKey:  "dba_exactus",
    cols:     ["name_db","grantee","grantee_role","isActive"],
  },
  {
    id:       "dba-sdp",
    label:    "DBA SDP",
    icon:     "🗄",
    endpoint: "/datos/privilegiados/dba-sdp",
    dataKey:  "dba_sdp",
    cols:     ["name_db","grantee","grantee_role","isActive"],
  },
  {
    id:       "dba-sit",
    label:    "DBA SIT",
    icon:     "🗄",
    endpoint: "/datos/privilegiados/dba-sit",
    dataKey:  "dba_sit",
    cols:     ["name_db","loginname","usuario","isActive","serverRole","fecha_creacion","fecha_ult_login","fecha_cambio"],
    dateCols: ["fecha_creacion","fecha_ult_login","fecha_cambio"],
  },
  // ── Fuentes compartidas con otros módulos (mismo endpoint) ───────────────
  // GDH: idéntico endpoint que Usuarios. El id "gdh" se comparte con la fecha
  // de corte del uiStore (bdFechaCorte['gdh']) → alimenta fc_gdh_priv.
  {
    id:       "mfa",
    label:    "MFA (Cuentas Genéricas)",
    icon:     "🔐",
    endpoint: "/datos/mfa",
    dataKey:  "mfa",
    cols:     ["id","upn","mail","display_name","isActive","city","created_date","grupo"],
    dateCols: ["created_date"],
  },
  {
    id:       "gdh",
    label:    "GDH (Personal)",
    icon:     "👤",
    endpoint: "/datos/gdh",
    cols:     ["matricula","nombre","apellido_paterno","apellido_materno","dni",
               "esProveedor","cod_funcion","funcion","cod_uni_orga",
               "u_organizativa","fecha_alta","fecha_cese"],
    dateCols: ["fecha_alta","fecha_cese"],
  },
  // Matriz de Rol: idéntico endpoint que Perfiles. El id "prf-matriz-rol" se
  // comparte con bdFechaCorte['prf-matriz-rol'] → alimenta fc_mr_priv.
  {
    id:       "prf-matriz-rol",
    label:    "Matriz de Rol",
    icon:     "🏷",
    endpoint: "/datos/matriz_rol",
    dataKey:  "matriz_rol",
    cols:     ["rol_vigente","tipo_rol","nombre_rol","responsable",
               "cod_fun","nombre_fun","cod_unid_orga","nombre_unid_org",
               "nombre_modulo","nombre_aplicativo","grupo",
               "permisos_adicionales","idm","descripcion",
               "regla_ngocio","nombre_responsable","rol_historico","tipo_elemento"],
    dateCols: [],
  },
  {
    id:       "local-admin-ad",
    label:    "Local Admin AD",
    icon:     "🖥",
    endpoint: "/datos/privilegiados/local-admin/ad",
    dataKey:  "local_admin_ad",
    cols:     ["SAMACCOUNTNAME", "NAME", "GROUP", "ENABLED", "FECHA_CREACION", "ULTIMO_LOGIN"],
    dateCols: ["FECHA_CREACION","ULTIMO_LOGIN"],
  },
  {
    id:       "domain-admin-ad",
    label:    "Domain Admin AD",
    icon:     "🖥",
    endpoint: "/datos/privilegiados/domain-admin/ad",
    dataKey:  "domain_admin_ad",
    cols:     ["TIPOOBJETO", "USUARIORED", "GRUPO", "ENABLED", "FECHA_CREACION", "ULTIMO_LOGIN"],
    dateCols: ["FECHA_CREACION","ULTIMO_LOGIN"],
  }
];

export const PRIV_CONSOLIDADOS = [
  { label: "Clasificación de Cuenta", icon: "🏷",  tabParam: "clasificacion" },
  { label: "DBA",                     icon: "🗄",   tabParam: "dba"           },
  { label: "Linux",                   icon: "🐧",   tabParam: "linux"         },
  { label: "Windows",                 icon: "🪟",   tabParam: "windows"       },
];
