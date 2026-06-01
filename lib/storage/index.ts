/**
 * Capa de storage unificada para ITSecOps.
 *
 * Decide entre IndexedDB y localStorage según la naturaleza del dato:
 *   - IndexedDB (vía idb-keyval): datos pesados de reportes que pueden superar
 *     los ~5 MB de localStorage (filas crudas de AD, Entra ID, Apps).
 *   - localStorage: metadata ligera (filtros, sort, prefs UI, validaciones).
 *
 * Todas las funciones son SSR-safe: si se llaman en server retornan null/undefined
 * en lugar de explotar.
 */

import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys, createStore } from "idb-keyval";

// Store dedicado dentro de la BD del navegador. No mezclamos con default.
const reportesStore = createStore("itsecops-db", "reportes");

const isBrowser = typeof window !== "undefined";

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB — datos pesados (reportes crudos, datasets de fuentes BD)
// ─────────────────────────────────────────────────────────────────────────────

export async function idbGetItem<T = unknown>(key: string): Promise<T | null> {
  if (!isBrowser) return null;
  try {
    const v = await idbGet<T>(key, reportesStore);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function idbSetItem<T = unknown>(key: string, value: T): Promise<void> {
  if (!isBrowser) return;
  try {
    await idbSet(key, value, reportesStore);
  } catch (err) {
    // Cuota o BD bloqueada: log silencioso, el caller decide qué hacer
    console.warn("[storage] idbSet falló", key, err);
  }
}

export async function idbDelItem(key: string): Promise<void> {
  if (!isBrowser) return;
  try {
    await idbDel(key, reportesStore);
  } catch {}
}

export async function idbDelByPrefix(prefix: string): Promise<void> {
  if (!isBrowser) return;
  try {
    const allKeys = await idbKeys(reportesStore);
    await Promise.all(
      allKeys
        .filter((k): k is string => typeof k === "string" && k.startsWith(prefix))
        .map((k) => idbDel(k, reportesStore))
    );
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage — metadata ligera (síncrono, SSR-safe)
// ─────────────────────────────────────────────────────────────────────────────

export function lsGet<T = unknown>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function lsSet<T = unknown>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    // Si nos quedamos sin cuota, al menos no rompemos la app
    console.warn("[storage] lsSet falló (¿cuota?)", key, err);
  }
}

export function lsDel(key: string): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function lsDelByPrefix(prefix: string): void {
  if (!isBrowser) return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Wipe total (migración v8 → v9)
// ─────────────────────────────────────────────────────────────────────────────

const WIPE_FLAG = "itsecops-wiped-v9";

/**
 * Limpia los rastros de la versión anterior (v8) la primera vez que el usuario
 * carga v9. Idempotente: solo corre una vez por navegador.
 *
 * Estrategia: borrar TODAS las claves de v8 (datos crudos, validaciones, prefs
 * de tabla, flags de sidebar, status de fuentes BD). Luego marcar el flag para
 * no volver a ejecutarlo.
 *
 * No toca: itsecops-user (sesión), ni el flag mismo.
 */
export function runV9MigrationOnce(): void {
  if (!isBrowser) return;
  try {
    if (localStorage.getItem(WIPE_FLAG) === "1") return;

    const PRESERVE = new Set(["itsecops-user", WIPE_FLAG]);
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !PRESERVE.has(k)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(WIPE_FLAG, "1");
  } catch {}
}
