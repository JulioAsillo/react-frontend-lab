/**
 * headerColumnMap.js
 *
 * Acá se asigna manualmente qué clase de color (th-src-1 .. th-src-15, ver
 * headerPalette.js) le corresponde a cada columna, agrupado por módulo.
 * Vacío a propósito — llenar según el criterio de cada fuente/sistema.
 *
 * Ejemplo:
 *   usuarios: {
 *     "AD":               "th-src-9",   // Active Directory → celeste
 *     "Entra ID":         "th-src-10",  // Entra ID → azul
 *     "Usr Exactus":      "th-src-6",   // Exactus → verde
 *     "DB Exactus":       "th-src-6",
 *     "Usr SDP":          "th-src-12",  // SDP → violeta
 *     "DB SDP":           "th-src-12",
 *     "Usr SIT":          "th-src-3",   // SIT → naranja
 *     "DB SIT":           "th-src-3",
 *     "Usr NPAC":         "th-src-14",  // NPAC → fucsia
 *   },
 *
 * Uso (ya conectado en DataTableUsuarios.jsx y DataTableCesados.jsx):
 *   <ThCell ... headerClass={HEADER_COLUMN_MAP[moduleKey]?.[col]} />
 *
 * Columnas sin entrada aquí quedan sin color (header normal).
 */
export const HEADER_COLUMN_MAP = {
  usuarios: {
    // completar
  },
  perfiles: {
    // completar
  },
  privilegiados: {
    // completar
  },
};
