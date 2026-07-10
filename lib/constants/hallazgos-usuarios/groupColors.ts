/**
 * groupColors.ts
 *
 * Un solo lugar para cambiar qué color de la paleta (app/globals.css,
 * clases .th-src-1 .. .th-src-15, ver también headerPalette.js) le
 * corresponde a cada grupo semántico. Los hallazgo-*.ts solo escriben el
 * NOMBRE del grupo (ej. "AD", "GDH"); el color real se resuelve acá.
 *
 * Cambiar un color = cambiar una línea acá, no tocar los 5 archivos de
 * columnas.
 */
export const GROUP_COLORS: Record<string, string> = {
  AD:         "th-src-9",   // celeste
  ENTRA:      "th-src-10",  // azul
  EXACTUS:    "th-src-6",   // verde
  SDP:        "th-src-12",  // violeta
  SIT:        "th-src-3",   // naranja
  NPAC:       "th-src-14",  // fucsia
  GDH:        "th-src-5",   // lima — campos cruzados desde GDH
  VALIDACION: "th-src-2",   // rojo — columnas de resultado de validación
};
