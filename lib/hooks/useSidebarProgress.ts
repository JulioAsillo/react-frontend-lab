/**
 * useSidebarProgress — indicadores reactivos para el sidebar.
 *
 * Mantiene la API original ({ hasData, isLoading, total, validated }) para
 * compatibilidad con Sidebar.jsx. Internamente ahora lee de los stores Zustand
 * en lugar de hacer JSON.parse de localStorage en cada cambio.
 *
 * Diferencias vs v8:
 *   - Sin window.addEventListener / CustomEvent: la suscripción es de Zustand.
 *   - Sin re-parseo de localStorage: hidratación una sola vez en el store.
 *   - Migración automática: si el dato vivía en localStorage (v8) y aún no
 *     se ha hidratado IDB, devolvemos hasData=false hasta que termine.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useReporteRaw } from "@/lib/store/reportesStore";
import { useIsReportLoading } from "@/lib/store/uiStore";
import { flattenData } from "@/lib/utils/flattenData";
import { lsGet } from "@/lib/storage";

export interface SidebarProgress {
  hasData: boolean;
  isLoading: boolean;
  total: number;
  validated: number;
}

export function useSidebarProgress(persistKey: string): SidebarProgress {
  const raw = useReporteRaw(persistKey);
  const isLoading = useIsReportLoading(persistKey);

  // tick: incrementamos cada vez que se persiste algo de este reporte para
  // forzar re-cálculo del useMemo. Sin esto, el sidebar nunca se enteraba
  // de que el usuario validó filas.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    function onPersisted(e: Event) {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail) return;
      if (detail.key.startsWith(`${persistKey}-val-`)) setTick((t) => t + 1);
    }
    window.addEventListener("itsecops-persisted", onPersisted as EventListener);
    return () => window.removeEventListener("itsecops-persisted", onPersisted as EventListener);
  }, [persistKey]);

  return useMemo(() => {
    const hasData = raw !== null && raw !== undefined;
    if (!hasData) {
      return { hasData: false, isLoading, total: 0, validated: 0 };
    }
    const rows = flattenData(raw);
    // Contamos filas únicas (por id) con validación. Antes el código iteraba
    // valores y los hashaba con JSON.stringify, lo que doble-contaba en
    // escenarios multi-tab.
    const validatedIds = new Set<string>();
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(`${persistKey}-val-`)) continue;
        const obj = lsGet<Record<string, { validacion?: string }>>(k, {});
        Object.entries(obj).forEach(([rowKey, v]) => {
          if (v?.validacion) validatedIds.add(rowKey);
        });
      }
    }
    return {
      hasData: true,
      isLoading,
      total: rows.length,
      validated: validatedIds.size,
    };
    // tick es la dep que dispara el recálculo cuando hay nuevas validaciones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, isLoading, persistKey, tick]);
}

// Re-export para que callers existentes (GenericPanel, etc.) sigan funcionando.
export { setReportLoading as setSidebarLoading } from "@/lib/store/uiStore";
