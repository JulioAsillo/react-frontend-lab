import { create } from 'zustand';
import { lsGet, lsSet } from '@/lib/storage';
import { idbSetItem } from '@/lib/storage';
import { findFechaCorte, resolveCollectionRows } from '@/lib/utils/payload';
import { isUploadSource } from '@/lib/constants/uploadSources';

type BDStatus = 'idle' | 'loading' | 'ok' | 'error';

const BDSTATUSKEY   = 'itsecops-bd-status';
const BDCOUNTSKEY   = 'itsecops-bd-counts';
const BDFECHAKEY    = 'itsecops-bd-fechas';   // ← NUEVO: fechas de corte en localStorage

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface BDSource {
  id: string;
  endpoint: string;
  label?: string;
  cols?: string[];
}

interface UIState {
  reportLoading:    Record<string, boolean>;
  bdStatus:         Record<string, BDStatus>;
  bdCounts:         Record<string, number>;
  bdErrors:         Record<string, string>;
  bdFechaCorte:     Record<string, string>;   // ← NUEVO: { gdh: '2026-04-30', ad: '...', ... }
  bdStatusHydrated: boolean;

  setReportLoading:  (key: string, loading: boolean) => void;
  setBDStatus:       (id: string, status: BDStatus) => void;
  setBDCount:        (id: string, count: number) => void;
  setBDError:        (id: string, msg: string | null) => void;
  setBDFechaCorte:   (id: string, fc: string) => void;       // ← NUEVO
  hydrateBDStatus:   () => void;

  cargarFuente: (src: BDSource, dataKeyPrefix?: string) => Promise<void>;
  cargarTodas:  (sources: BDSource[], dataKeyPrefix?: string) => void;
}

// ── Inicialización SSR-safe ────────────────────────────────────────────────
// Todo se precarga desde localStorage al crear el módulo → primer render ya
// tiene los valores correctos, sin esperar useEffect ni IDB.
const _isBrowser   = typeof window !== 'undefined';
const _initStatus  = _isBrowser ? lsGet<Record<string, BDStatus>>(BDSTATUSKEY, {}) : {};
const _initCounts  = _isBrowser ? lsGet<Record<string, number>>(BDCOUNTSKEY, {})   : {};
const _initFechas  = _isBrowser ? lsGet<Record<string, string>>(BDFECHAKEY, {})    : {};

export const useUIStore = create<UIState>((set, get) => ({
  reportLoading:    {},
  bdStatus:         _initStatus,
  bdCounts:         _initCounts,
  bdErrors:         {},
  bdFechaCorte:     _initFechas,   // ← precargado desde localStorage
  bdStatusHydrated: _isBrowser,

  setReportLoading: (key, loading) =>
    set(s => ({ reportLoading: { ...s.reportLoading, [key]: loading } })),

  setBDStatus: (id, status) =>
    set(s => {
      const next = { ...s.bdStatus, [id]: status };
      lsSet(BDSTATUSKEY, next);
      return { bdStatus: next };
    }),

  setBDCount: (id, count) =>
    set(s => {
      const next = { ...s.bdCounts, [id]: count };
      lsSet(BDCOUNTSKEY, next);
      return { bdCounts: next };
    }),

  setBDError: (id, msg) =>
    set(s => ({
      bdErrors: msg
        ? { ...s.bdErrors, [id]: msg }
        : (() => { const n = { ...s.bdErrors }; delete n[id]; return n; })(),
    })),

  // ← NUEVO: guarda fc en el store Y en localStorage para sobrevivir F5
  setBDFechaCorte: (id, fc) =>
    set(s => {
      const next = { ...s.bdFechaCorte, [id]: fc };
      lsSet(BDFECHAKEY, next);
      return { bdFechaCorte: next };
    }),

  hydrateBDStatus: () => {
    // No-op: el store ya se inicializa desde localStorage en la creación del módulo.
    // Se mantiene para compatibilidad con componentes que la llaman.
  },

  cargarFuente: async (src, dataKeyPrefix = 'bd-data') => {
    const { id } = src;
    const store = get();

    store.setBDStatus(id, 'loading');
    store.setBDError(id, null);

    try {
      const res = await fetch(`${API_BASE}${src.endpoint}`, { method: 'GET' });
      if (!res.ok) {
        let detail = `Error ${res.status} (${res.statusText})`;
        try {
          const e = await res.json();
          detail = (e as { detail?: string; message?: string }).detail
                || (e as { detail?: string; message?: string }).message
                || detail;
        } catch {}
        throw new Error(detail);
      }

      const json: unknown = await res.json();
      // Debug: mostrar la respuesta completa en desarrollo para inspección
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        try { console.debug('[cargarFuente] respuesta:', src.id, json); } catch {}
      }
      const data = resolveCollectionRows(json);

      // Fecha de corte: viene del backend o fallback a hoy
      const fc = findFechaCorte(json) ?? new Date().toISOString().slice(0, 10);
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        try { console.debug('[cargarFuente] fecha_corte resuelta:', src.id, fc); } catch {}
      }

      const count = Array.isArray(data)
        ? data.length
        : Object.values(data as Record<string, unknown[]>).reduce((a, v) => a + v.length, 0);

      // 1. Persistir datos pesados en IDB (sobrevive recargas)
      await idbSetItem(`${dataKeyPrefix}-${id}`, data);

      // 2. Guardar fc en el STORE + localStorage (reactivo e inmediato)
      get().setBDFechaCorte(id, fc);

      // 2b. Compatibilidad atrás: también escribir la clave `-fc` en IDB
      //     porque componentes existentes (FuenteDetalle) aún la leen desde IDB.
      try {
        await idbSetItem(`${dataKeyPrefix}-${id}-fc`, fc);
      } catch (err) {
        // No fatal — si falla IDB, al menos el store/localStorage tiene la fc
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
          console.warn('[cargarFuente] no se pudo escribir fc en IDB', id, err);
        }
      }

      // 3. Notificar (por compatibilidad con FuenteDetalle que escucha este evento)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bd-cargadas'));
      }

      get().setBDCount(id, count);

      // v26: para fuentes de carga manual, "sin datos" (backend devuelve vacío,
      // sin error) se trata igual que falta de info → estado error para que la
      // UI muestre el panel de subida en lugar de una tabla con 0 registros.
      if (count === 0 && isUploadSource(id)) {
        get().setBDError(id, 'Aún no se ha cargado información para esta fuente.');
        get().setBDStatus(id, 'error');
      } else {
        get().setBDStatus(id, 'ok');
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      const friendly = (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed'))
        ? 'No se pudo conectar con el servidor. Verifica que el backend esté activo.'
        : msg;
      get().setBDError(id, friendly);
      get().setBDStatus(id, 'idle');
    }
  },

  cargarTodas: (sources, dataKeyPrefix = 'bd-data') => {
    void Promise.allSettled(
      sources.map(src => get().cargarFuente(src, dataKeyPrefix))
    ).then(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bd-cargadas'));
      }
    });
  },
}));

// ── Helpers externos ──────────────────────────────────────────────────────
export const setBDStatus = (id: string, status: BDStatus) =>
  useUIStore.getState().setBDStatus(id, status);

export const setBDCount = (id: string, count: number) =>
  useUIStore.getState().setBDCount(id, count);

export const setBDFechaCorte = (id: string, fc: string) =>
  useUIStore.getState().setBDFechaCorte(id, fc);

export const setReportLoading = (key: string, loading: boolean) =>
  useUIStore.getState().setReportLoading(key, loading);

// ── Hooks reactivos ───────────────────────────────────────────────────────
export const useBDStatus = (id: string): BDStatus =>
  useUIStore(s => s.bdStatus[id] ?? 'idle');

export const useBDCount = (id: string): number =>
  useUIStore(s => s.bdCounts[id] ?? 0);

export const useBDError = (id: string): string | undefined =>
  useUIStore(s => s.bdErrors[id]);

export const useIsReportLoading = (key: string): boolean =>
  useUIStore(s => s.reportLoading[key] ?? false);

// ← NUEVO: hook para leer TODAS las fechas de corte de recopilación
export const useBDFechasCorte = (): Record<string, string> =>
  useUIStore(s => s.bdFechaCorte);
