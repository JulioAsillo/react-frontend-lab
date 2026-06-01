/**
 * usePersistedState — estado UI persistente en localStorage.
 *
 * Diseño v11 (fix crítico de persistencia):
 *
 * El bug en v9/v10 era un race condition entre dos useEffect que tocaban la
 * misma clave: el primer effect hidrata desde storage, el segundo escribe
 * cualquier cambio. Cuando la `key` cambiaba (al rotar de tab/escenario),
 * el effect de escritura disparaba ANTES del de hidratación con el state del
 * escenario anterior, pisando el valor del nuevo en localStorage.
 *
 * Solución v11:
 *   1. Inicializador lazy de useState: lee síncronamente del storage. En SSR
 *      retorna defaultValue (lsGet ya es SSR-safe).
 *   2. Cuando la `key` cambia, re-hidratamos manualmente y bloqueamos la
 *      escritura hasta que el state se sincronice con la nueva clave.
 *   3. Una sola fuente de verdad para "¿debo escribir?": el ref keyRef que
 *      compara la key actual con la del último render.
 *
 * Lectura desde otra parte de la app: emit("storage") + listener para
 * que componentes hermanos se enteren cuando otro escribe la misma clave.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { lsGet, lsSet, lsDelByPrefix } from "@/lib/storage";

type Updater<T> = T | ((prev: T) => T);

const STORAGE_EVENT = "itsecops-persisted";

function emit(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (v: Updater<T>) => void] {
  // Lazy init: lee del storage síncronamente. SSR-safe (lsGet retorna fallback).
  const [state, setState] = useState<T>(() => lsGet<T>(key, defaultValue));

  // Trackeamos qué key corresponde al state actual. Esto evita que cuando
  // la key cambia, el effect de escritura corra con el state anterior.
  const keyRef = useRef(key);

  // Re-hidratar cuando la key cambia (cambio de escenario/tab)
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    setState(lsGet<T>(key, defaultValue));
    // No queremos que defaultValue dispare re-hidratación: si el caller pasa
    // un objeto literal nuevo cada render, se reinicializaría infinitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persistir solo cuando el state corresponde a la key actual.
  useEffect(() => {
    // Si keyRef quedó desincronizado (key acaba de cambiar y aún no corrió
    // el effect de hidratación), no escribimos nada para no pisar.
    if (keyRef.current !== key) return;
    lsSet(key, state);
    emit(key);
  }, [key, state]);

  // Escuchar escrituras a la misma key desde otros componentes (mismo tab)
  useEffect(() => {
    function onPersisted(e: Event) {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key !== key) return;
      // Otro componente escribió en NUESTRA key. Re-leer para sincronizarse.
      const fresh = lsGet<T>(key, defaultValue);
      setState((prev) => {
        // Evitar loops: solo actualizar si realmente cambió
        if (JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
        return fresh;
      });
    }
    function onStorage(e: StorageEvent) {
      // Cambio en otra pestaña
      if (e.key !== key) return;
      const fresh = lsGet<T>(key, defaultValue);
      setState(fresh);
    }
    window.addEventListener(STORAGE_EVENT, onPersisted as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onPersisted as EventListener);
      window.removeEventListener("storage", onStorage);
    };
    // defaultValue intencionalmente fuera de deps por la misma razón de antes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((valOrFn: Updater<T>) => {
    setState((prev) =>
      typeof valOrFn === "function" ? (valOrFn as (p: T) => T)(prev) : valOrFn
    );
  }, []);

  return [state, set];
}

/**
 * Borra todas las claves de localStorage que empiezan con el prefijo dado.
 */
export function clearPersistedPrefix(prefix: string): void {
  lsDelByPrefix(prefix);
}
