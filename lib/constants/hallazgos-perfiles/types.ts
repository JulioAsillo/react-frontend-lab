/**
 * types.ts — mismo tipo que en hallazgos-usuarios/types.ts, duplicado a
 * propósito para que esta carpeta sea autocontenida (no depende de otra
 * certificación).
 */
export type ColumnDef = {
  key: string;     // nombre exacto tal como lo devuelve el backend (.py)
  header: string;  // texto legible mostrado en la cabecera de la tabla
  group: string;   // grupo de color (ver groupColors.ts). "" = sin asignar todavía
};
