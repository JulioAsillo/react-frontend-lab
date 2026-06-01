'use client';

/**
 * BDDashboardPerfiles — v23.1
 * Vista de resumen de las 10 fuentes BD del módulo Perfiles.
 * Espeja BDDashboard de Usuarios, usando PERFILES_BD_SOURCES y
 * dataKeyPrefix="prf-bd-data".
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERFILES_BD_SOURCES } from '@/lib/mock/perfilesBDSources';
import { useUIStore, useBDStatus, useBDCount, useBDError } from '@/lib/store/uiStore';
import { isUploadSource } from '@/lib/constants/uploadSources';
import { useAuthStore } from '@/lib/store/authStore';
import { lsGet, lsSet } from '@/lib/storage';

const SAVEDKEY = 'itsecops-prf-bd-saved';
const DATA_KEY_PREFIX = 'prf-bd-data';

export default function BDDashboardPerfiles() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const isCertificador = user?.role === 'certificador';

  const hydrate      = useUIStore(s => s.hydrateBDStatus);
  const cargarTodas  = useUIStore(s => s.cargarTodas);
  const cargarFuente = useUIStore(s => s.cargarFuente);

  const [saved,    setSaved]    = useState({});
  const [hydrated, setHydrated] = useState(false);

  const anyLoading = useUIStore(s =>
    PERFILES_BD_SOURCES.some(src => s.bdStatus[src.id] === 'loading')
  );

  useEffect(() => {
    hydrate();
    setSaved(lsGet(SAVEDKEY, {}));
    setHydrated(true);
  }, [hydrate]);

  function handleCargarTodos() {
    cargarTodas(PERFILES_BD_SOURCES, DATA_KEY_PREFIX);
  }

  function handleGuardar(id) {
    const next = { ...saved, [id]: new Date().toISOString() };
    setSaved(next);
    lsSet(SAVEDKEY, next);
  }

  const savedCount = hydrated ? Object.keys(saved).length : null;
  const okCount    = useUIStore(s =>
    PERFILES_BD_SOURCES.filter(src => s.bdStatus[src.id] === 'ok').length
  );

  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">perfiles / recopilación / <span>base de datos</span></div>
          <h2 className="page-title">Recopilación de Base de Datos — Perfiles</h2>
        </div>
        <div className="topbar-right">
          {isCertificador ? (
            <span className="row-count">
              <span className="row-count-num">{okCount}</span>
              {' '}de {PERFILES_BD_SOURCES.length} disponibles
            </span>
          ) : (
            <>
              <span className="row-count" style={{ marginRight: 8 }}>
                <span className="row-count-num">{savedCount ?? '—'}</span>
                {' '}de {PERFILES_BD_SOURCES.length} guardadas
              </span>
              <button
                className="btn-generate"
                onClick={handleCargarTodos}
                disabled={anyLoading}
              >
                {anyLoading
                  ? <><span className="spinner" />Cargando…</>
                  : 'Cargar a Todos'
                }
              </button>
            </>
          )}
        </div>
      </div>

      {anyLoading && <div className="loading-bar"><div className="loading-bar-fill" /></div>}

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        <div className="bd-grid">
          {PERFILES_BD_SOURCES.map(src => (
            <BDSourceCard
              key={src.id}
              src={src}
              savedAt={saved[src.id]}
              isCertificador={isCertificador}
              onValidar={() => router.push(`/admin/perfiles/recopilacion/base-datos/${src.id}`)}
              onCargar={() => cargarFuente(src, DATA_KEY_PREFIX)}
              onGuardar={() => handleGuardar(src.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BDSourceCard({ src, savedAt, onCargar, onValidar, onGuardar, isCertificador }) {
  const status   = useBDStatus(src.id);
  const rowCount = useBDCount(src.id);
  const errorMsg = useBDError(src.id);
  const isLoading = status === 'loading';
  const isOk      = status === 'ok';
  const isUpload  = isUploadSource(src.id);
  const needsUpload = isUpload && !isCertificador && !!errorMsg && !isOk;

  return (
    <div className={`bd-card${isOk ? ' bd-card-ok' : ''}${needsUpload ? ' bd-card-needs-upload' : ''}`}>
      <div className="bd-card-head">
        <div className="bd-card-icon" style={{ background: isOk ? 'var(--ok-bg)' : 'var(--bg3)' }}>
          {src.icon}
        </div>
        <div className="bd-card-title-block">
          <div className="bd-card-title">
            {src.label}
            {isUpload && <span className="bd-card-upload-tag" title="Esta fuente se alimenta subiendo archivos .xlsx/.xls">📤 carga manual</span>}
          </div>
          <div className="bd-card-meta">
            {isLoading
              ? 'Cargando…'
              : isOk
                ? `${rowCount.toLocaleString('es-PE')} registros · ${src.cols.length} columnas`
                : `${src.cols.length} columnas`
            }
          </div>
        </div>
        <div className="bd-card-status">
          {isLoading && <span className="spinner" />}
          {isOk      && <span className="bd-status-dot" title="Cargada" />}
          {needsUpload && <span className="bd-status-dot bd-status-dot-warn" title="Falta subir archivo" />}
          {status === 'idle' && !needsUpload && <span className="bd-status-dot bd-status-dot-idle" title="Pendiente" />}
        </div>
      </div>

      {needsUpload && (
        <div className="bd-card-upload-hint">
          📋 Aún no hay información cargada. Entra para subir {src.id === 'prf-gdh' ? 'los archivos (Activos y Cesados)' : 'el archivo'} .xlsx/.xls e indicar la fecha de corte.
        </div>
      )}

      {errorMsg && !needsUpload && !isCertificador && (
        <div style={{
          margin: '6px 0 2px', padding: '6px 10px', fontSize: 11,
          background: 'var(--inc-bg)', border: '1px solid var(--inc-border)',
          borderRadius: 'var(--radius)', color: 'var(--inc-text)', lineHeight: 1.4,
        }}>
          ❌ {errorMsg}
        </div>
      )}

      {savedAt && !isCertificador && (
        <div className="bd-card-saved">
          Guardado {new Date(savedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      )}

      <div className="bd-card-actions">
        {isCertificador ? (
          <button
            className="btn-export-small"
            onClick={onValidar}
            disabled={!isOk}
            style={{ flex: 1 }}
          >
            ✓ Validar
          </button>
        ) : needsUpload ? (
          <>
            <button className="btn-export-small" onClick={onCargar} disabled={isLoading}>
              Reintentar
            </button>
            <button className="btn-generate bd-card-upload-btn" onClick={onValidar} style={{ flex: 1 }}>
              📤 Subir archivo
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
              style={savedAt ? { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' } : {}}
            >
              {savedAt ? 'Guardado ✓' : 'Guardar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
