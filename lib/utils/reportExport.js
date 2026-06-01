/**
 * reportExport.js — Fábrica de handlers de exportación para los paneles de hallazgos.
 *
 * PROBLEMA QUE RESUELVE:
 * La función `handleExport` estaba copiada BYTE A BYTE (mismo md5) en 12 paneles:
 *   - 7 paneles de privilegiados
 *   - 4 paneles de perfiles
 *   - CesadosPanel
 *
 * Todas hacían exactamente lo mismo:
 *   const tabs = Array.isArray(rawData) ? { Principal: rawData } : rawData ?? {};
 *   return exportFn(tabs, persistKey, label, scenarioCfg);
 *
 * Ahora cada panel hace:
 *   import { makeHandleExport } from "@/lib/utils/reportExport";
 *   const handleExport = makeHandleExport(exportAllPrivilegiados, SCENARIO_CFG);
 *
 * @param {(tabs: Record<string, any[]>, persistKey: string, label: string, scenarioCfg?: any) => any} exportFn
 *        El exportador específico de la tabla (exportAllPrivilegiados, exportAllPerfiles, exportAllCesados…).
 * @param {any} [scenarioCfg]  Config de escenarios; se reenvía al exportador si aplica.
 * @returns {(rawData: any, persistKey: string, label: string) => any}
 */
export function makeHandleExport(exportFn, scenarioCfg) {
  return function handleExport(rawData, persistKey, label) {
    const tabs = Array.isArray(rawData) ? { Principal: rawData } : (rawData ?? {});
    return exportFn(tabs, persistKey, label, scenarioCfg);
  };
}
