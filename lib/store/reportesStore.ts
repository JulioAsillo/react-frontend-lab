/**
 * reportesStore — estado global de reportes con persistencia en IndexedDB.
 *
 * Reemplaza el patrón anterior de:
 *   usePersistedState(`${persistKey}-data`, null)
 *
 * Diferencias clave vs v8:
 *   - Los datos crudos (que pueden ser MB) viven en IndexedDB, no localStorage.
 *   - El estado en memoria es selectivo: solo se hidrata al primer acceso.
 *   - La suscripción es reactiva (Zustand) — nada de eventos custom.
 *
 * API pública:
 *   useReporteRaw(persistKey)        → [raw, setRaw, clearRaw]
 *   useReporteHasData(persistKey)    → boolean
 *   getReporteRaw(persistKey)        → leer fuera de React (sidebar, etc.)
 */

"use client";

import { create } from "zustand";
import { idbGetItem, idbSetItem, idbDelItem, idbDelByPrefix, lsDelByPrefix } from "@/lib/storage";

// Tipo del raw: el backend puede devolver array, {data:[]} o {tab:[]}.
// Lo dejamos como unknown para no mentir en los tipos. flattenData lo normaliza.
export type ReporteRaw = unknown;

interface ReportesState {
  /** Datos crudos por persistKey. Solo lo cargado en esta sesión vive aquí. */
  raw: Record<string, ReporteRaw | null>;
  /** Fecha de corte por persistKey. La trae el backend en la respuesta. */
  fechaCorte: Record<string, string | undefined>;
  /** Flags de hidratación: ¿ya intentamos leer este persistKey de IDB? */
  hydrated: Record<string, boolean>;

  /** Pide hidratación desde IndexedDB para un persistKey (idempotente). */
  hydrate: (persistKey: string) => Promise<void>;

  /** Setea el raw en memoria y persiste en IndexedDB en background. */
  setRaw: (persistKey: string, raw: ReporteRaw, fechaCorte?: string) => void;

  /** Limpia raw + fechaCorte + todas las claves derivadas (val-*, sort, etc.). */
  clearReporte: (persistKey: string) => Promise<void>;
}

export const useReportesStore = create<ReportesState>((set, get) => ({
  raw: {},
  fechaCorte: {},
  hydrated: {},

  hydrate: async (persistKey) => {
    if (get().hydrated[persistKey]) return;
    set((s) => ({ hydrated: { ...s.hydrated, [persistKey]: true } }));
    const stored = await idbGetItem<ReporteRaw>(`${persistKey}-data`);
    const storedFC = await idbGetItem<string>(`${persistKey}-fechaCorte`);
    set((s) => ({
      raw: stored !== null ? { ...s.raw, [persistKey]: stored } : s.raw,
      fechaCorte: storedFC !== null ? { ...s.fechaCorte, [persistKey]: storedFC } : s.fechaCorte,
    }));
  },

  setRaw: (persistKey, raw, fechaCorte) => {
    set((s) => ({
      raw: { ...s.raw, [persistKey]: raw },
      fechaCorte: { ...s.fechaCorte, [persistKey]: fechaCorte },
    }));
    void idbSetItem(`${persistKey}-data`, raw);
    if (fechaCorte) void idbSetItem(`${persistKey}-fechaCorte`, fechaCorte);
    else void idbDelItem(`${persistKey}-fechaCorte`);
  },

  clearReporte: async (persistKey) => {
    set((s) => {
      const { [persistKey]: _r, ...restRaw } = s.raw;
      const { [persistKey]: _f, ...restFC } = s.fechaCorte;
      return { raw: restRaw, fechaCorte: restFC };
    });
    await idbDelItem(`${persistKey}-data`);
    await idbDelItem(`${persistKey}-fechaCorte`);
    await idbDelByPrefix(`${persistKey}-`);
    lsDelByPrefix(`${persistKey}-`);
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Hooks "ergonómicos" para componentes
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";

/**
 * Lee el raw de un reporte. Hidrata desde IDB en el primer mount.
 * Retorna null mientras hidrata o si no hay datos.
 */
export function useReporteRaw(persistKey: string): ReporteRaw | null {
  const raw = useReportesStore((s) => s.raw[persistKey] ?? null);
  const hydrate = useReportesStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate(persistKey);
  }, [persistKey, hydrate]);
  return raw;
}

/**
 * Indica si un reporte tiene datos cargados (post-hidratación).
 * Útil para mostrar/ocultar elementos del UI sin tener que leer todo el raw.
 */
export function useReporteHasData(persistKey: string): boolean {
  const raw = useReporteRaw(persistKey);
  return raw !== null && raw !== undefined;
}

/** Acceso imperativo (fuera de React) — útil en utilidades o eventos. */
export function getReporteRaw(persistKey: string): ReporteRaw | null {
  return useReportesStore.getState().raw[persistKey] ?? null;
}

/** Lee la fecha de corte de un reporte. Retorna undefined si no la trajo el backend. */
export function useFechaCorte(persistKey: string): string | undefined {
  const fc = useReportesStore((s) => s.fechaCorte[persistKey]);
  const hydrate = useReportesStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate(persistKey);
  }, [persistKey, hydrate]);
  return fc;
}
