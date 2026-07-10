/**
 * types.ts — único archivo compartido entre los mapeadores de columnas.
 * No hay lógica acá, solo el tipo. Cada hallazgo-*.ts es autocontenido.
 */
export type ColumnDef = {
  key: string;     // nombre exacto tal como lo devuelve el backend (.py)
  header: string;  // texto legible mostrado en la cabecera de la tabla
  group: string;   // grupo de color (ver GROUP_COLORS en groupColors.ts). "" = sin color
};
