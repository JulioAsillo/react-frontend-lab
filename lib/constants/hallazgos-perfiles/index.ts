/**
 * index.ts — agrega los 4 mapeadores de columnas de Certificación de
 * Perfiles y expone el lookup que usará DataTablePerfiles.jsx (mismo
 * patrón que lib/constants/hallazgos-usuarios/index.ts).
 */
import { hallazgoApps } from "./hallazgo-apps";
import { hallazgoDb } from "./hallazgo-db";
import { hallazgoMoviper } from "./hallazgo-moviper";
import { hallazgoRoles } from "./hallazgo-roles";
import { GROUP_COLORS } from "./groupColors";
import type { ColumnDef } from "./types";

export { GROUP_COLORS };
export type { ColumnDef };

// Los 4 reportes de Perfiles tienen hoja(s) nombrada(s) — todos se indexan
// por persistKey + tabKey (nombre de hoja exacto del backend).
const BY_SHEET: Record<string, Record<string, ColumnDef[]>> = {
  "prf-apps":    hallazgoApps,
  "prf-dbs":     hallazgoDb,
  "prf-moviper": hallazgoMoviper,
  "prf-roles":   hallazgoRoles,
};

export function getColumnMeta(persistKey: string, tabKey: string | undefined, col: string): ColumnDef | undefined {
  const list = tabKey ? BY_SHEET[persistKey]?.[tabKey] : undefined;
  return list?.find(c => c.key === col);
}

/** Clase CSS de color para una columna, o undefined si no tiene grupo asignado. */
export function getHeaderColorClass(persistKey: string, tabKey: string | undefined, col: string): string | undefined {
  const group = getColumnMeta(persistKey, tabKey, col)?.group;
  return group ? GROUP_COLORS[group] : undefined;
}

/** Header legible para una columna, o el nombre crudo si no está mapeada. */
export function getColumnLabel(persistKey: string, tabKey: string | undefined, col: string): string {
  return getColumnMeta(persistKey, tabKey, col)?.header ?? col;
}
