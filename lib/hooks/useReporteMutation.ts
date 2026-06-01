/**
 * useReporteMutation — gestiona el ciclo de vida de generar un reporte.
 *
 * Decisión de diseño: en este proyecto los reportes NO se fetchean al montar
 * (no son lecturas idempotentes — son operaciones costosas en backend que el
 * usuario dispara con un botón). Por eso usamos SWR en su modo "mutation"
 * (useSWRMutation) en lugar del modo declarativo `useSWR(key, fetcher)`.
 *
 * Beneficios sobre v8:
 *   - Cancelación automática: si el usuario navega antes de que termine,
 *     SWR maneja el unmount limpiamente.
 *   - Deduplicación: si dos componentes disparan el mismo reporte simultánea-
 *     mente, SWR los une en un solo request.
 *   - Estados estandarizados: { trigger, isMutating, error, data, reset }.
 *   - Persistencia: el resultado va al store + IndexedDB en `onSuccess`.
 *
 * Si en el futuro se quiere refresh automático de un reporte, se puede mover
 * a `useSWR` declarativo sin tocar componentes — solo este archivo.
 */

"use client";

import useSWRMutation from "swr/mutation";
import { fetchReporte } from "@/lib/api/reportes";
import { flattenData } from "@/lib/utils/flattenData";
import { useReportesStore } from "@/lib/store/reportesStore";
import { setReportLoading } from "@/lib/store/uiStore";

interface TriggerArg {
  endpoint: string;
  needsDate?: boolean;
  fecha?: string;
}

async function reporteMutator(_persistKey: string, { arg }: { arg: TriggerArg }) {
  const result = await fetchReporte(arg.endpoint, arg.needsDate, arg.fecha);
  return result; // { data, fechaCorte }
}

export function useReporteMutation(persistKey: string) {
  const setRaw = useReportesStore((s) => s.setRaw);
  const clearReporte = useReportesStore((s) => s.clearReporte);

  const { trigger, isMutating, error, reset } = useSWRMutation(
    persistKey,
    reporteMutator,
    {
      revalidate: false,
    }
  );

  /** Dispara el fetch y persiste el resultado. Retorna el rowCount o lanza. */
  async function generar(arg: TriggerArg): Promise<number> {
    setReportLoading(persistKey, true);
    try {
      await clearReporte(persistKey);
      const result = await trigger(arg);
      if (result === undefined) {
        throw new Error("La operación fue cancelada o no devolvió datos.");
      }
      // result = { data, fechaCorte }
      const { data, fechaCorte } = result as { data: unknown; fechaCorte?: string };
      setRaw(persistKey, data, fechaCorte);
      return flattenData(data).length;
    } finally {
      setReportLoading(persistKey, false);
    }
  }

  return {
    generar,
    isMutating,
    error: error as Error | undefined,
    reset,
  };
}
