/**
 * index.ts — agrega los 8 mapeadores de columnas de Certificación de
 * Privilegiados y expone el lookup que usará DataTablePrivilegiados.jsx
 * (mismo patrón que hallazgos-usuarios/index.ts y hallazgos-perfiles/index.ts).
 */
import { hallazgoAppCriticas } from "./hallazgo-app-criticas";
import { hallazgoDba } from "./hallazgo-dba";
import { hallazgoDomainAdmin } from "./hallazgo-domain-admin";
import { hallazgoLocalAdmin } from "./hallazgo-local-admin";
import { hallazgoMfa } from "./hallazgo-mfa";
import { hallazgoServidoresLinux } from "./hallazgo-servidores-linux";
import { hallazgoServidoresWindows } from "./hallazgo-servidores-windows";
import { hallazgoSysadmin } from "./hallazgo-sysadmin";
import { GROUP_COLORS } from "./groupColors";
import type { ColumnDef } from "./types";

export { GROUP_COLORS };
export type { ColumnDef };

// Los 8 reportes de Privilegiados tienen hoja(s) nombrada(s) — todos se
// indexan por persistKey + sheetKey (nombre de hoja exacto del backend).
const BY_SHEET: Record<string, Record<string, ColumnDef[]>> = {
  "priv-apps":         hallazgoAppCriticas,
  "priv-dba":          hallazgoDba,
  "priv-domain-admin": hallazgoDomainAdmin,
  "priv-local-admin":  hallazgoLocalAdmin,
  "priv-mfa":          hallazgoMfa,
  "priv-linux":        hallazgoServidoresLinux,
  "priv-windows":      hallazgoServidoresWindows,
  "priv-sysadmin":     hallazgoSysadmin,
};

export function getColumnMeta(persistKey: string, sheetKey: string | undefined, col: string): ColumnDef | undefined {
  const list = sheetKey ? BY_SHEET[persistKey]?.[sheetKey] : undefined;
  return list?.find(c => c.key === col);
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
