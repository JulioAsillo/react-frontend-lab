/**
 * specialColumnColors.ts
 *
 * Validación, Acción Correctiva y Comentario NO vienen del backend — las
 * agrega el frontend en toda tabla de hallazgos (Usuarios, Perfiles,
 * Privilegiados). Por eso este archivo es único y compartido (no vive
 * dentro de hallazgos-usuarios/, hallazgos-perfiles/ ni
 * hallazgos-privilegiados/): el color de estas 3 columnas es el mismo sin
 * importar la certificación.
 *
 * Clases reales en app/globals.css (th-src-1 .. th-src-15). Cambia estas 3
 * líneas si prefieres otros colores — es el único lugar que hay que tocar.
 */
export const SPECIAL_COLUMN_HEADER_CLASS: Record<string, string> = {
  __validacion__: "th-src-8",   // Validación
  __accion__:     "th-src-11",  // Acción Correctiva
  __comentario__: "th-src-4",   // Comentario
};

export function getSpecialColumnHeaderClass(col: string): string | undefined {
  return SPECIAL_COLUMN_HEADER_CLASS[col];
}
