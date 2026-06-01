'use client';

/**
 * BDDashboard — v21.0
 * Vista de resumen de las 10 fuentes BD de Usuarios.
 *
 * Cambios v21 — visibilidad por rol:
 *   - El rol `certificador` NO ve los botones de carga ("Cargar a Todos",
 *     "Cargar/Recargar", "Guardar") en esta pantalla. Solo ve el botón
 *     "Validar" (que lo lleva al detalle de cada fuente).
 *   - Para `admin`/`usuario` se mantienen todos los botones.
 *   - El estado de carga (status: ok/loading/idle) sigue siendo visible
 *     para todos, así el certificador puede saber qué está disponible.
 *
 * El fetch de cada fuente vive en uiStore.cargarFuente (no en este
 * componente). Si el usuario hace clic en "Cargar a Todos" y navega a
 * otra vista, las cargas continúan en background.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BD_SOURCES } from '@/lib/mock/bdSources';
import { useUIStore, useBDStatus, useBDCount, useBDError } from '@/lib/store/uiStore';
import { isUploadSource } from '@/lib/constants/uploadSources';
import { useAuthStore } from '@/lib/store/authStore';
import { lsGet, lsSet } from '@/lib/storage';

const SAVEDKEY = 'itsecops-bd-saved';

export default function BDDashboard() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const isCertificador = user?.role === 'certificador';

  const hydrate      = useUIStore(s => s.hydrateBDStatus);
  const cargarTodas  = useUIStore(s => s.cargarTodas);
  const cargarFuente = useUIStore(s => s.cargarFuente);

  const [saved,    setSaved]    = useState({});
  const [hydrated, setHydrated] = useState(false);

  const anyLoading = useUIStore(s =>
    BD_SOURCES.some(src => s.bdStatus[src.id] === 'loading')
  );

  useEffect(() => {
    hydrate();
    setSaved(lsGet(SAVEDKEY, {}));
    setHydrated(true);
  }, [hydrate]);

  function handleCargarTodos() {
    cargarTodas(BD_SOURCES);
  }

  function handleGuardar(id) {
    const next = { ...saved, [id]: new Date().toISOString() };
    setSaved(next);
    lsSet(SAVEDKEY, next);
  }

  const savedCount = hydrated ? Object.keys(saved).length : null;
  const okCount    = useUIStore(s =>
    BD_SOURCES.filter(src => s.bdStatus[src.id] === 'ok').length
  );

  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">recopilación › <span>base de datos</span></div>
          <h2 className="page-title">Recopilación de Base de Datos</h2>
        </div>
        <div className="topbar-right">
          {isCertificador ? (
            // Certificador: solo ve resumen, no carga datos desde acá
            <span className="row-count">
              <span className="row-count-num">{okCount}</span>
              {' '}de {BD_SOURCES.length} disponibles
            </span>
          ) : (
            <>
              <span className="row-count" style={{ marginRight: 8 }}>
                <span className="row-count-num">{savedCount ?? '—'}</span>
                {' '}de {BD_SOURCES.length} guardadas
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
          {BD_SOURCES.map(src => (
            <BDSourceCard
              key={src.id}
              src={src}
              savedAt={saved[src.id]}
              isCertificador={isCertificador}
              onValidar={() => router.push(`/admin/usuarios/recopilacion/base-datos/${src.id}`)}
              onCargar={() => cargarFuente(src)}
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
  // Para fuentes de carga por archivo: hubo intento y falló → falta subir info.
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

      {/* Falta subir archivo (fuente de carga manual) */}
      {needsUpload && (
        <div className="bd-card-upload-hint">
          📋 Aún no hay información cargada. Entra para subir {src.id === 'gdh' ? 'los archivos (Activos y Cesados)' : 'el archivo'} .xlsx/.xls e indicar la fecha de corte.
        </div>
      )}

      {/* Error normal (fuentes no-upload) */}
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
          // Certificador: solo botón Validar. No carga, no guarda.
          <button
            className="btn-export-small"
            onClick={onValidar}
            disabled={!isOk}
            style={{ flex: 1 }}
            title={isOk
              ? 'Ver y validar los datos de esta fuente'
              : 'Esta fuente aún no ha sido cargada por el administrador'
            }
          >
            ✓ Validar
          </button>
        ) : needsUpload ? (
          // Fuente de carga manual sin datos: CTA claro para entrar a subir.
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
