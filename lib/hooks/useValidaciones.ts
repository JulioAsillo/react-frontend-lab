/**
 * useValidaciones — estado de validaciones y comentarios por fila/escenario.
 *
 * Cambios v11:
 *   - rowId() ahora es un hash FNV-1a de los valores de la fila (orden de
 *     claves ordenado alfabéticamente). Esto evita dos bugs de v9/v10:
 *       a) Colisiones cuando dos filas comparten los primeros 120 chars del
 *          JSON.stringify (frecuente con datasets de auditoría que repiten
 *          username/email al inicio).
 *       b) Pérdida de validaciones si el backend devuelve los mismos datos
 *          en distinto orden de propiedades (cambia el JSON, cambia el id).
 *   - countValidated cuenta correctamente: se incluye en el conteo cualquier
 *     fila con un valor de Validación seleccionado, sin importar si es manual
 *     o auto-resuelto desde el badge. Se respeta la decisión del label
 *     "Validados" porque significa "rows que tienen validación asignada".
 *   - Persistencia inmediata por keystroke (autosave): cada llamada a
 *     setValidacion/setComentario dispara escritura. El componente padre
 *     puede además mostrar un botón "Guardar progreso" para feedback UX,
 *     pero no es necesario para que los datos sobrevivan recargas.
 */

"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "./usePersistedState";

type ValEntry = { validacion?: string; comentario?: string };
type ValStore = Record<string, ValEntry>;

export interface UseValidacionesReturn {
  getVal: (row: Record<string, unknown>) => string | null;
  getComentario: (row: Record<string, unknown>) => string;
  setValidacion: (row: Record<string, unknown>, value: string | null) => void;
  setComentario: (row: Record<string, unknown>, text: string) => void;
  countValidated: number;
  /**
   * Nº de filas cuyo valor de Validación fue CAMBIADO por el usuario respecto
   * al valor inicial (auto-resuelto del badgeCol al cargar). Empieza en 0.
   */
  countModificados: number;
  /** Útil para el botón "Guardar progreso": forzar un re-emit del store. */
  flush: () => void;
  /** Hash determinista de una fila — usar también para keys de React. */
  rowId: (row: Record<string, unknown>) => string;
}

/**
 * Hash FNV-1a 32-bit. Determinista, sin colisiones prácticas para nuestro
 * dominio (decenas de miles de filas distintas). 8 chars hex.
 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Genera un id estable para una fila: ordena las claves alfabéticamente,
 * concatena valores con un separador no ambiguo, y hashea.
 */
function rowId(row: Record<string, unknown>): string {
  const keys = Object.keys(row).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = row[k];
    parts.push(k);
    parts.push("\u0001");
    parts.push(v === null || v === undefined ? "" : String(v));
    parts.push("\u0002");
  }
  return fnv1a(parts.join(""));
}

export function useValidaciones(
  persistKey: string,
  scenarioKey: string,
  rows: Record<string, unknown>[] | undefined,
  /**
   * Columna pivote del escenario. Si se pasa y la fila tiene un valor en
   * esta columna que es una opción válida (Correcto/Incorrecto/Sustentado),
   * cuenta como validada incluso si el usuario no la tocó.
   * Mantiene la coherencia con lo que se ve en pantalla y se exporta.
   */
  badgeCol?: string
): UseValidacionesReturn {
  const storeKey = `${persistKey}-val-${scenarioKey}`;
  const [store, setStore] = usePersistedState<ValStore>(storeKey, {});

  const getVal = useCallback(
    (row: Record<string, unknown>) => store[rowId(row)]?.validacion ?? null,
    [store]
  );
  const getComentario = useCallback(
    (row: Record<string, unknown>) => store[rowId(row)]?.comentario ?? "",
    [store]
  );

  const setValidacion = useCallback(
    (row: Record<string, unknown>, value: string | null) => {
      const id = rowId(row);
      setStore((prev) => {
        const current = prev[id] ?? {};
        // Si el usuario "limpia" la validación (value === null o ""),
        // borramos el campo validacion pero mantenemos comentario si lo tiene.
        if (value === null || value === "") {
          if (!current.comentario) {
            const { [id]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [id]: { comentario: current.comentario } };
        }
        return { ...prev, [id]: { ...current, validacion: value } };
      });
    },
    [setStore]
  );

  const setComentario = useCallback(
    (row: Record<string, unknown>, text: string) => {
      const id = rowId(row);
      setStore((prev) => {
        const current = prev[id] ?? {};
        if (!text && !current.validacion) {
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: { ...current, comentario: text } };
      });
    },
    [setStore]
  );

  const countValidated = useMemo(() => {
    if (!rows) return 0;
    return rows.filter((r) => {
      const stored = store[rowId(r)]?.validacion;
      if (stored) return true;
      const rawEscenario = r["ESCENARIO"] || r["Escenario"] || r["escenario"];
      if (rawEscenario !== undefined && rawEscenario !== null && String(rawEscenario).trim() !== "") {
        return true;
      }
      if (badgeCol) {
        const v = String(r[badgeCol] || "").trim().toLowerCase();
        if (v === "correcto" || v === "incorrecto" || v === "sustentado") return true;
      }
      return false;
    }).length;
  }, [rows, store, badgeCol]);

  // countModificados: filas donde el usuario guardó una validación DISTINTA
  // del valor inicial (el que se auto-resolvía del badgeCol al cargar la fila).
  // Empieza en 0 y sube solo cuando hay un cambio real.
  const countModificados = useMemo(() => {
    if (!rows) return 0;
    const initialOf = (r: Record<string, unknown>) => {
      if (!badgeCol) return "";
      const raw = String(r[badgeCol] ?? "").trim();
      if (!raw) return "";
      const f = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      return ["Correcto", "Incorrecto", "Sustentado"].includes(f) ? f : "";
    };
    return rows.filter((r) => {
      const stored = store[rowId(r)]?.validacion;
      if (stored === undefined || stored === null || String(stored).trim() === "") return false;
      return String(stored).trim() !== initialOf(r);
    }).length;
  }, [rows, store, badgeCol]);

  // flush es un no-op semántico: la persistencia ya es inmediata. Pero como
  // disparamos setStore con una identidad, el efecto del usePersistedState se
  // re-ejecuta y emite el evento storage para que otros componentes puedan
  // refrescar (ej. badge de "Guardado" en topbar).
  const flush = useCallback(() => {
    setStore((prev) => ({ ...prev }));
  }, [setStore]);

  return { getVal, getComentario, setValidacion, setComentario, countValidated, countModificados, flush, rowId };
}
