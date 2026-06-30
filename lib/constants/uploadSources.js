/**
 * uploadSources
 *
 * Configuración de carga por archivo (.xlsx/.xls) para las fuentes de
 * Recopilar Información que el backend alimenta vía upload.
 *
 * Flujo (definido con Julio):
 * 1. "Cargar información" → GET normal (cargarFuente).
 * 2. Si el GET trae datos → tabla + fecha de corte del backend (no editable).
 * 3. Si el GET da CUALQUIER error → se asume que aún no hay info subida:
 * se muestra la UI de upload (zona[s] de archivo + fecha de corte manual).
 * 4. Validación de columnas en el front: se normalizan (MAYÚSCULAS, sin
 * tildes, sin puntos ni espacios extra) y deben coincidir EXACTO con las
 * requeridas (sin columnas de más ni de menos).
 * 5. POST multipart: campo de archivo + `fecha_corte` (ISO).
 * 6. Tras subir OK → re-GET → la fecha de corte ya la devuelve el backend.
 *
 * El mapeo es por `sourceId`. Un sourceId con varias "zonas" (GDH: activos +
 * cesados) sube varios archivos pero comparte UNA sola fecha de corte.
 */

// Normaliza un nombre de columna para comparar: MAYÚSCULAS, sin tildes,
// sin puntos, colapsa espacios. "CÓDIGO DE UN.ORG." → "CODIGO DE UNORG"
export function normalizeColName(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toUpperCase()
    .replace(/\./g, '')        // quita puntos
    .replace(/\s+/g, ' ')      // colapsa espacios
    .trim();
}

// Definición de una "zona" de carga (un archivo + su endpoint + columnas req.)
// label: texto visible · endpoint: ruta POST · cols: columnas obligatorias
const zona = (label, endpoint, cols) => ({ label, endpoint, cols });

// Columnas requeridas (tal cual las pasó Julio; se normalizan al comparar)
const COLS_ACTIVOS_GDH = [
  'ID SISTEMA', 'NOMBRES', 'APELLIDO PATERNO', 'APELLIDO MATERNO', 'NÚMERO ID',
  'GRUPO DE PERSONAL', 'CÓDIGO DE FUNCIÓN', 'FUNCIÓN', 'CÓDIGO DE UN.ORG.',
  'UNIDAD ORGANIZATIVA', 'FECHA',
];
const COLS_CESADOS_GDH = [
  'ID SISTEMA', 'NOMBRES', 'APELLIDO PATERNO', 'APELLIDO MATERNO', 'NÚMERO ID',
  'GRUPO DE PERSONAL', 'FUNCIÓN', 'UNIDAD ORGANIZATIVA', 'FECHA',
];
const COLS_MATRIZ = [
  'ROL VIGENTE', 'TIPO DE ROL', 'CODIGO FUNCION', 'NOMBRE FUNCION',
  'CODIGO UNIDAD ORGANIZATIVA', 'NOMBRE UNIDAD ORGANIZATIVA', 'NOMBRE MODULO',
  'NOMBRE APLICATIVO', 'GRUPO', 'REGLA DE NEGOCIO', 'TIPO DE ELEMENTO',
];
const COLS_MOVIPER = [
  'MATRICULA', 'FECHA DE MOVIPER', 'NOMBRE Y APELLIDOS',
  'COD FUNCION DESTINO', 'CÓDIGO UO DESTINO',
];
const COLS_LOCAL_ADMIN = [
  'URED CON PRIVILEGIOS NIPA', 'URED SIN PRIVILEGIOS', 'TICKET CREADO', 'ESTADO',
];
const COLS_DOMAIN_ADMIN = [
  'URED CON PRIVILEGIOS', 'URED SIN PRIVILEGIOS', 'GRUPO ASOCIADO',
  'TICKET CREADO', 'ESTADO', 'NOMBRE COMPLETO',
];
const COLS_SERVER = ['SERVER NAME', 'USUARIO'];

// Config de GDH (2 zonas, 1 fecha de corte). Reutilizable por los 3 módulos.
const GDH_UPLOAD = {
  titulo: 'GDH — Personal',
  zonas: [
    zona('Activos GDH', '/upload/activos-gdh', COLS_ACTIVOS_GDH),
    zona('Cesados GDH', '/upload/cesados-gdh', COLS_CESADOS_GDH),
  ],
};

/**
 * Mapa sourceId → config de upload.
 * Solo las fuentes aquí listadas usan el flujo de upload; el resto se queda
 * con el fetch normal y la fecha de corte del backend.
 */
export const UPLOAD_SOURCES = {
  // GDH (Usuarios y Privilegiados comparten id "gdh"; Perfiles usa "prf-gdh")
  'gdh':     GDH_UPLOAD,
  'prf-gdh': GDH_UPLOAD,

  // Matriz de Roles (Perfiles: prf-matriz-rol; Privilegiados: prf-matriz-rol)
  'prf-matriz-rol': {
    titulo: 'Matriz de Roles',
    zonas: [zona('Matriz de Roles', '/upload/matrizroles', COLS_MATRIZ)],
  },

  // Moviper (Perfiles)
  'prf-moviper': {
    titulo: 'Moviper',
    zonas: [zona('Moviper', '/upload/moviper', COLS_MOVIPER)],
  },

  // Local / Domain Admin accesos (Privilegiados)
  'local-admin': {
    titulo: 'Local Admin — Accesos',
    zonas: [zona('Local Admin Accesos', '/upload/local-admins-accesos', COLS_LOCAL_ADMIN)],
  },
  'domain-admin': {
    titulo: 'Domain Admin — Accesos',
    zonas: [zona('Domain Admin Accesos', '/upload/domain-admins-accesos', COLS_DOMAIN_ADMIN)],
  },

  // Servidores Linux / Windows (Privilegiados)
  'server-linux': {
    titulo: 'Servidores Linux',
    zonas: [zona('Servidores Linux', '/upload/servers-linux', COLS_SERVER)],
  },
  'server-windows': {
    titulo: 'Servidores Windows',
    zonas: [zona('Servidores Windows', '/upload/servers-windows', COLS_SERVER)],
  },
};

// ¿Esta fuente usa el flujo de upload?
export function isUploadSource(sourceId) {
  return Object.prototype.hasOwnProperty.call(UPLOAD_SOURCES, sourceId);
}

export function getUploadConfig(sourceId) {
  return UPLOAD_SOURCES[sourceId] ?? null;
}

/**
 * Valida que las columnas del Excel coincidan EXACTO con las requeridas.
 * @param fileCols  array de nombres de columna leídos del Excel
 * @param reqCols   array de columnas requeridas (sin normalizar)
 * @returns { ok, faltan: string[], sobran: string[] }  (faltan/sobran en forma original)
 */
export function validarColumnas(fileCols, reqCols) {
  const normFile = new Map(); // normalizado → original del archivo
  for (const c of fileCols) {
    const n = normalizeColName(c);
    if (n) normFile.set(n, c);
  }
  const normReq = new Map(); // normalizado → original requerido
  for (const c of reqCols) normReq.set(normalizeColName(c), c);

  const faltan = [];
  for (const [n, orig] of normReq) if (!normFile.has(n)) faltan.push(orig);

  const sobran = [];
  for (const [n, orig] of normFile) if (!normReq.has(n)) sobran.push(orig);

  return { ok: faltan.length === 0, faltan, sobran };
}
