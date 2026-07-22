'use client';

/**
 * BDDashboard — Dashboard de recopilación de fuentes BD, compartido por los
 * módulos Usuarios, Perfiles y Privilegiados.
 *
 * Antes existían 3 copias casi idénticas (BDDashboardUsuarios / Perfiles /
 * Priv, ~215 líneas c/u). Este componente recibe la configuración del módulo
 * de forma EXPLÍCITA — cada wrapper declara sus fuentes, claves, rutas y
 * textos; aquí no se infiere nada.
 *
 * Paridad admin/certificador: AMBOS roles tienen los mismos botones
 * (Cargar a Todos/Todas, Cargar/Recargar, Validar, Guardar). El botón
 * "Guardar" marca la conformidad de la fuente y la persiste EN MEMORIA
 * (localStorage), registrando QUIÉN la marcó (admin o certificador) y la
 * fecha. La tarjeta lo muestra como "Conforme por {rol}".
 *
 * El fetch de cada fuente vive en uiStore.cargarFuente (no aquí).
 *
 * config = {
 *   sources:          BDSource[]   — fuentes del módulo
 *   savedKey:         string       — clave localStorage de conformidades
 *   dataKeyPrefix:    string       — prefijo IDB ('bd-data' | 'prf-bd-data' | 'priv-data')
 *   routeBase:        string       — ruta base de FuenteDetalle del módulo
 *   breadcrumbPrefix: string       — texto antes de <span>base de datos</span>
 *   title:            string       — título del topbar
 *   loadAllLabel:     string       — 'Cargar a Todos' | 'Cargar Todas'
 *   multiFileUploadId:string       — id de la fuente con varios archivos (GDH)
 *   showColsInOkMeta: boolean      — incluir '· N columnas' en meta cuando ok
 *   iconFontSize?:    number       — fontSize del ícono de la tarjeta
 *   okDotTitle:       string       — tooltip del punto verde
 *   idleDotTitle:     string       — tooltip del punto gris
 *   showIdleDotOnError: boolean    — mostrar punto gris también en status error
 * }
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore, useBDStatus, useBDCount, useBDError } from '@/lib/store/uiStore';
import { isUploadSource } from '@/lib/constants/uploadSources';
import { useAuthStore } from '@/lib/store/authStore';
import { formatFechaDDMMYYYY } from '@/lib/utils/formatFecha';
import { lsGet, lsSet } from '@/lib/storage';

function roleLabel(by) {
  return by === 'admin' ? 'Administrador'
    : by === 'certificador' ? 'Certificador'
    : by === 'usuario' ? 'Usuario' : '—';
}

// Normaliza el valor guardado. Compat con el formato viejo ({ id: ISOstring }).
function savedInfo(v) {
  if (!v) return null;
  if (typeof v === 'string') return { at: v, by: null };
  return v;
}

function BDSourceCard({ src, config, saved, onCargar, onValidar, onGuardar }) {
  const status     = useBDStatus(src.id);
  const rowCount   = useBDCount(src.id);
  const errorMsg   = useBDError(src.id);
  const fechaCorte = useUIStore(s => s.bdFechaCorte[src.id]);
  const isLoading  = status === 'loading';
  const isOk       = status === 'ok';
  const isUpload   = isUploadSource(src.id);
  const needsUpload = isUpload && !!errorMsg && !isOk;

  const showIdleDot = config.showIdleDotOnError
    ? (!isOk && !isLoading && !needsUpload)
    : (status === 'idle' && !needsUpload);

  const okMeta = `${(rowCount ?? 0).toLocaleString('es-PE')} registros`
    + (config.showColsInOkMeta ? ` · ${src.cols.length} columnas` : '');
  const idleMeta = src.cols.length > 0 ? `${src.cols.length} columnas` : 'Vista especial';

  return (
    <div className={`bd-card${isOk ? ' bd-card-ok' : ''}${needsUpload ? ' bd-card-needs-upload' : ''}`}>
      <div className="bd-card-head">
        <div className="bd-card-icon" style={{
          background: isOk ? 'var(--ok-bg)' : 'var(--bg3)',
          ...(config.iconFontSize ? { fontSize: config.iconFontSize } : {}),
        }}>
          {src.icon}
        </div>
        <div className="bd-card-title-block">
          <div className="bd-card-title">
            {src.label}
            {isUpload && <span className="bd-card-upload-tag" title="Esta fuente se alimenta subiendo archivos .xlsx/.xls">carga manual</span>}
          </div>
          <div className="bd-card-meta">
            {isLoading ? 'Cargando…' : isOk ? okMeta : idleMeta}
          </div>
        </div>
        <div className="bd-card-status">
          {isLoading   && <span className="spinner" />}
          {isOk        && <span className="bd-status-dot" title={config.okDotTitle} />}
          {needsUpload && <span className="bd-status-dot bd-status-dot-warn" title="Falta subir archivo" />}
          {showIdleDot && <span className="bd-status-dot bd-status-dot-idle" title={config.idleDotTitle} />}
        </div>
      </div>

      {fechaCorte && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
          margin: "2px 0 4px", padding: "3px 10px", borderRadius: 999,
          background: "var(--accent-bg)", border: "1px solid var(--accent2)",
          color: "var(--accent)", fontSize: 11.5, fontWeight: 600 }}>
          Fecha de corte: {formatFechaDDMMYYYY(fechaCorte)}
        </div>
      )}
      {needsUpload && (
        <div className="bd-card-upload-hint">
          Aún no hay información cargada. Entra para subir {src.id === config.multiFileUploadId ? 'los archivos (Activos y Cesados)' : 'el archivo'} .xlsx/.xls e indicar la fecha de corte.
        </div>
      )}

      {errorMsg && !needsUpload && (
        <div style={{
          margin: '6px 0 2px', padding: '6px 10px', fontSize: 11,
          background: 'var(--inc-bg)', border: '1px solid var(--inc-border)',
          borderRadius: 'var(--radius)', color: 'var(--inc-text)', lineHeight: 1.4,
        }}>
          {errorMsg}
        </div>
      )}

      {saved && (
        <div className="bd-card-saved">
          ✓ Conforme{saved.by ? ` por ${roleLabel(saved.by)}` : ''}
          {saved.at ? ` · ${new Date(saved.at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
        </div>
      )}

      <div className="bd-card-actions">
        {needsUpload ? (
          <>
            <button className="btn-export-small" onClick={onCargar} disabled={isLoading}>
              Reintentar
            </button>
            <button className="btn-generate bd-card-upload-btn" onClick={onValidar} style={{ flex: 1 }}>
              Subir archivo
            </button>
          </>
        ) : (
          <>
            <button className="btn-export-small" onClick={onCargar} disabled={isLoading}>
              {isOk ? 'Recargar' : 'Cargar'}
            </button>
            <button className="btn-export-small" onClick={onValidar} disabled={!isOk}>
              Validar
            </button>
            <button
              className="btn-export-small"
              onClick={onGuardar}
              disabled={!isOk}
              style={saved ? { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' } : {}}
            >
              {saved ? 'Conforme ✓' : 'Guardar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function BDDashboard({ config }) {
  const router   = useRouter();
  const { user } = useAuthStore();

  const hydrate      = useUIStore(s => s.hydrateBDStatus);
  const cargarTodas  = useUIStore(s => s.cargarTodas);
  const cargarFuente = useUIStore(s => s.cargarFuente);

  const [saved,    setSaved]    = useState({});
  const [hydrated, setHydrated] = useState(false);

  const anyLoading = useUIStore(s =>
    config.sources.some(src => s.bdStatus[src.id] === 'loading')
  );

  useEffect(() => {
    hydrate();
    setSaved(lsGet(config.savedKey, {}));
    setHydrated(true);
  }, [hydrate, config.savedKey]);

  function handleCargarTodas() {
    cargarTodas(config.sources, config.dataKeyPrefix);
  }

  // Guarda conformidad EN MEMORIA con el rol y nombre de quien hace clic.
  function handleGuardar(id) {
    const next = {
      ...saved,
      [id]: { at: new Date().toISOString(), by: user?.role ?? null, name: user?.name ?? null },
    };
    setSaved(next);
    lsSet(config.savedKey, next);
  }

  const savedCount = hydrated ? Object.keys(saved).length : null;

  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">{config.breadcrumbPrefix}<span>base de datos</span></div>
          <h2 className="page-title">{config.title}</h2>
        </div>
        <div className="topbar-right">
          <span className="row-count" style={{ marginRight: 8 }}>
            <span className="row-count-num">{savedCount ?? '—'}</span>
            {' '}de {config.sources.length} conformes
          </span>
          <button className="btn-generate" onClick={handleCargarTodas} disabled={anyLoading}>
            {anyLoading ? <><span className="spinner" />Cargando…</> : config.loadAllLabel}
          </button>
        </div>
      </div>

      {anyLoading && <div className="loading-bar"><div className="loading-bar-fill" /></div>}

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <div className="bd-grid">
          {config.sources.map(src => (
            <BDSourceCard
              key={src.id}
              src={src}
              config={config}
              saved={savedInfo(saved[src.id])}
              onValidar={() => router.push(`${config.routeBase}/${src.id}`)}
              onCargar={() => cargarFuente(src, config.dataKeyPrefix)}
              onGuardar={() => handleGuardar(src.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
