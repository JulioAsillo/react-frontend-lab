/**
 * index.ts — agrega los 5 mapeadores de columnas y expone el lookup que usan
 * DataTableUsuarios.jsx y DataTableCesados.jsx. Cada hallazgo-*.ts es
 * autocontenido y explícito (ver ese archivo para las columnas reales); acá
 * solo se resuelve "qué archivo/hoja corresponde según persistKey+sheetKey".
 */
import { hallazgoAd } from "./hallazgo-ad";
import { hallazgoEntraId } from "./hallazgo-entra-id";
import { hallazgoAppsCriticas } from "./hallazgo-apps-criticas";
import { hallazgoBaseDatos } from "./hallazgo-base-datos";
import { hallazgoCesados } from "./hallazgo-cesados";
import { GROUP_COLORS } from "./groupColors";
import type { ColumnDef } from "./types";

export { GROUP_COLORS };
export type { ColumnDef };

// AD y Entra ID: una sola tabla, se indexan directo por persistKey.
const FLAT: Record<string, ColumnDef[]> = {
  ad: hallazgoAd,
  entra: hallazgoEntraId,
};

// Apps Críticas, Base de Datos y Cesados: varias hojas, se indexan por
// persistKey y luego por sheetKey (nombre de hoja exacto del backend).
const BY_SHEET: Record<string, Record<string, ColumnDef[]>> = {
  apps: hallazgoAppsCriticas,
  bd: hallazgoBaseDatos,
  cesados: hallazgoCesados,
};

function resolveColumns(persistKey: string, sheetKey?: string): ColumnDef[] | undefined {
  if (FLAT[persistKey]) return FLAT[persistKey];
  if (sheetKey && BY_SHEET[persistKey]) return BY_SHEET[persistKey][sheetKey];
  return undefined;
}

export function getColumnMeta(persistKey: string, sheetKey: string | undefined, col: string): ColumnDef | undefined {
  return resolveColumns(persistKey, sheetKey)?.find(c => c.key === col);
}

/** Clase CSS de color para una columna, o undefined si no tiene grupo asignado. */
export function getHeaderColorClass(persistKey: string, sheetKey: string | undefined, col: string): string | undefined {
  const group = getColumnMeta(persistKey, sheetKey, col)?.group;
  return group ? GROUP_COLORS[group] : undefined;
}

/** Header legible para una columna, o el nombre crudo si no está mapeada. */
export function getColumnLabel(persistKey: string, sheetKey: string | undefined, col: string): string {
  return getColumnMeta(persistKey, sheetKey, col)?.header ?? col;
}
