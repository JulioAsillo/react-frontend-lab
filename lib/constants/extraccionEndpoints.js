/**
 * extraccionEndpoints — endpoints del bot de extracción ("Extraer Información").
 *
 * Mapa por módulo → sourceId → ruta POST (relativa; el componente antepone
 * NEXT_PUBLIC_API_URL). El botón hace POST a esta ruta, espera la respuesta y,
 * solo si status === "SUCCESS", vuelve a consultar la fuente (recarga).
 *
 * Las fuentes de carga manual (GDH, Matriz de Rol, Moviper, Local/Domain Admin,
 * servidores) NO aparecen aquí: se alimentan subiendo Excel, no por el bot.
 *
 * Fuentes con extracción PENDIENTE (sin endpoint aún): DB_SIT (Usuarios) y
 * DBA SIT (Privilegiados). Al no estar mapeadas, el botón sale deshabilitado.
 */
export const EXTRACCION_ENDPOINTS = {
  usuarios: {
    "entra-id":    "/extrac-entraid/ejecutar-entra-id?target=data",
    "ad":          "/extrac-ad/ejecutar-ad?script_name=get_ad_users.ps1",
    // "db-sit":   PENDIENTE
    "db-sdp":      "/extrac-p2kprod/ejecutar-extraccion?query_id=DB_SDP_CUENTAS",
    "db-exactus":  "/extrac-exactus/ejecutar-extraccion?query_id=DB_EXACTUS_CUENTAS",
    "app-sit":     "/extrac-ad/ejecutar-ad?script_name=extract_ad_sit_usuarios.ps1",
    "app-sdp":     "/extrac-p2kprod/ejecutar-extraccion?query_id=APP_SDP_USUARIOS",
    "app-npac":    "/extrac-ad/ejecutar-ad?script_name=extract_ad_npac_usuarios.ps1",
    "app-exactus": "/extrac-exactus/ejecutar-extraccion?query_id=APP_EXACTUS_USUARIOS",
  },
  privilegiados: {
    "app-exactus": "/extrac-exactus/ejecutar-extraccion?query_id=APP_EXACTUS_USUARIOS_PRIVILEGIADOS",
    "app-npac":    "/extrac-ad/ejecutar-ad?script_name=extract_ad_npac_privileged_apps.ps1",
    "app-sdp":     "/extrac-p2kprod/ejecutar-extraccion?query_id=APP_SDP_USUARIOS_PRIVILEGIADOS",
    "app-sit":     "/extrac-ad/ejecutar-ad?script_name=extract_ad_sit_privileged_apps.ps1",
    "dba-exactus": "/extrac-exactus/ejecutar-extraccion?query_id=DB_EXACTUS_CUENTAS_DBA",
    "dba-sdp":     "/extrac-p2kprod/ejecutar-extraccion?query_id=DB_SDP_CUENTAS_DBA",
    // "dba-sit":  PENDIENTE
    "mfa":         "/extrac-entraid/ejecutar-entra-id?target=generics",
  },
  perfiles: {
    "prf-ad":          "/extrac-ad/ejecutar-ad?script_name=get_ad_users.ps1",
    "prf-app-exactus": "/extrac-exactus/ejecutar-extraccion?query_id=APP_EXACTUS_USUARIOS_PERFILES",
    "prf-app-sdp":     "/extrac-p2kprod/ejecutar-extraccion?query_id=APP_SDP_USUARIOS_PERFILES",
    "prf-app-sit":     "/extrac-ad/ejecutar-ad?script_name=extract_ad_sit_usuarios.ps1",
    "prf-app-npac":    "/extrac-ad/ejecutar-ad?script_name=extract_ad_npac_usuarios.ps1",
    "prf-db-sdp":      "/extrac-p2kprod/ejecutar-extraccion?query_id=DB_SDP_CUENTAS_PERFILES",
    "prf-db-exactus":  "/extrac-exactus/ejecutar-extraccion?query_id=DB_EXACTUS_CUENTAS_PERFILES",
  },
};

/** Devuelve la ruta de extracción para (módulo, fuente) o null si no aplica/está pendiente. */
export function getBotEndpoint(modulo, sourceId) {
  return EXTRACCION_ENDPOINTS[modulo]?.[sourceId] ?? null;
}
