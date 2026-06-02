/**
 * Definición de las fuentes de Base de Datos para la Recopilación.
 * v18.5 — todas las fuentes usan FuenteDetalle genérico.
 *
 * Formato de respuesta backend: { "fecha_corte": "YYYY-MM-DD", "data": { "<key>": [...] } }
 * Las fuentes con hasGroups:true tienen columna "grupos" (array[]) renderizada como chips.
 */
export const BD_SOURCES = [
  {
    id: "gdh",
    label: "GDH (Personal)",
    icon: "👤",
    endpoint: "/datos/gdh",
    cols: ["matricula","nombre","apellido_paterno","apellido_materno","dni",
           "esProveedor","cod_funcion","funcion","cod_uni_orga",
           "u_organizativa","fecha_alta","fecha_cese"],
    dateCols: ["fecha_alta","fecha_cese"],
  },
  {
    id: "entra-id",
    label: "Entra ID",
    icon: "☁",
    endpoint: "/datos/entra-id",
    cols: ["mail","upn","city","display_name","account_enabled",
           "creaction_type","created_date_time","ultimo_login"],
    dateCols: ["created_date_time","ultimo_login"],
  },
  {
    id: "ad",
    label: "Active Directory",
    icon: "🖥",
    endpoint: "/datos/ad",
    cols: ["usuario","nombre","correo","rol","isActivo",
           "fecha_creacion","fecha_ult_login","fecha_cambio"],
    dateCols: ["fecha_creacion","fecha_ult_login","fecha_cambio"],
  },
  {
    id: "db-sit",
    label: "DB_SIT",
    icon: "🗄",
    endpoint: "/datos/db_sit",
    cols: ["usuario","isActive","fecha_creacion","fecha_ult_login","fecha_cambio"],
    dateCols: ["fecha_creacion","fecha_ult_login","fecha_cambio"],
  },
  {
    id: "db-sdp",
    label: "DB_SDP",
    icon: "🗄",
    endpoint: "/datos/db_sdp",
    cols: ["usuario","isActivo","fecha_creacion","fecha_bloq","fecha_login"],
    dateCols: ["fecha_creacion","fecha_bloq","fecha_login"],
  },
  {
    id: "db-exactus",
    label: "DB_EXACTUS",
    icon: "🗄",
    endpoint: "/datos/db_exactus",
    cols: ["usuario","isActivo","fecha_creacion","fecha_bloq","fecha_login"],
    dateCols: ["fecha_creacion","fecha_bloq","fecha_login"],
  },
  {
    id: "app-sit",
    label: "APP_SIT",
    icon: "⚙",
    endpoint: "/datos/app_sit",
    cols: ["usuario","full_name","isActivo","fecha_creacion","fecha_ult_login","grupos"],
    dateCols: ["fecha_creacion","fecha_ult_login"],
    hasGroups: true,
  },
  {
    id: "app-sdp",
    label: "APP_SDP",
    icon: "⚙",
    endpoint: "/datos/app_sdp",
    cols: ["usuario","isActivo","fecha_creacion","fecha_login"],
    dateCols: ["fecha_creacion","fecha_login"],
  },
  {
    id: "app-npac",
    label: "APP_NPAC",
    icon: "⚙",
    endpoint: "/datos/app_npac",
    cols: ["usuario","full_name","isActivo","fecha_creacion","fecha_ult_login","grupos"],
    dateCols: ["fecha_creacion","fecha_ult_login"],
    hasGroups: true,
  },
  {
    id: "app-exactus",
    label: "APP_EXACTUS",
    icon: "⚙",
    endpoint: "/datos/app_exactus",
    cols: ["usuario","full_name","isActivo","fecha_creacion","fecha_ult_login","grupos"],
    dateCols: ["fecha_creacion","fecha_ult_login"],
    hasGroups: true,
    isLast: true,
  },
];
