'use client';

/**
 * GenerarInformePerfilesPanel — v24.5
 *
 * Cambios sobre v1.0:
 *  - Split-view: formulario izq + InformePreview der (igual que Usuarios).
 *  - Preview se actualiza con botón "↺ Refrescar" — NO se auto-dispara en
 *    cada keystroke para no perder la posición de scroll del usuario.
 *  - Fechas de corte automáticas (leídas de uiStore.bdFechaCorte):
 *      fecha_corte_gdh_perfiles     → prf-gdh
 *      fecha_corte_moviper_perfiles → prf-moviper
 *      fecha_corte_mr_perfiles      → prf-matriz-rol
 *      fecha_corte_apps_perfiles    → primer valor no vacío entre prf-app-{exactus,sdp,sit,npac}
 *      fecba_corte_bd_perfiles      → primer valor no vacío entre prf-db-{sdp,exactus}
 *      fecha_corte_ad_perfiles      → prf-ad
 *  - {mes_anio_perfiles} permanece 100% manual.
 *  - Los campos de fecha AUTO se muestran con badge AUTO + tooltip (igual que Usuarios).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { useAuthStore } from '@/lib/store/authStore';
import { useBDFechasCorte } from '@/lib/store/uiStore';
import {
  calcularCamposAutomaticosPerfiles,
  CAMPOS_AUTO_PERFILES,
} from '@/lib/utils/informePerfilesCalculo';
import { buildExcelPayloadsPerfiles } from '@/lib/utils/buildPerfilesExcel';
import InformePerfilesPreview from './InformePerfilesPreview';

const STORAGE_KEY = 'itsecops-informe-perfiles-form';

const INITIAL_FORM = {
  // Cabecera — 100% manual
  mes_anio_perfiles: '',

  // Fechas de corte — automáticas (se sobreescriben con uiStore)
  fecha_corte_gdh_perfiles:     '',
  fecha_corte_ad_perfiles:      '',
  fecha_corte_apps_perfiles:    '',
  fecha_corte_mr_perfiles:      '',
  fecha_corte_moviper_perfiles: '',
  fecba_corte_bd_perfiles:      '',

  // GDH
  gdh_rol_incorrecto_perfiles: '',
  gdh_mr_no_existe_perfiles:   '',
  gdh_com_rol_perfiles:        '',
  gdh_com_matriz_perfiles:     '',

  // Moviper
  mov_rol_incorrecto_perfiles: '',
  mov_mr_no_existe_perfiles:   '',
  mov_com_ri_perfiles:         '',
  mov_com_mr_perfiles:         '',

  // Apps Críticas — hallazgos
  apps_exactus_perfiles: '',
  apps_sdp_perfiles:     '',
  apps_sit_perfiles:     '',
  apps_npac_perfiles:    '',

  // Apps Críticas — comentarios
  apps_exactus_com_perfiles: '',
  apps_sdp_com_perfiles:     '',
  apps_sit_com_perfiles:     '',
  apps_npac_com_perfiles:    '',

  // Base de Datos — hallazgos
  bd_exactus_perfiles: '',
  bd_sdp_perfiles:     '',

  // Base de Datos — comentarios
  bd_exactus_com_perfiles: '',
  bd_sdp_com_perfiles:     '',

  // Porcentajes de cumplimiento
  pct_gdh_perfiles:          '',
  pct_mov_perfiles:          '',
  pct_apps_exactus_perfiles: '',
  pct_apps_sdp_perfiles:     '',
  pct_apps_sit_perfiles:     '',
  pct_apps_npac_perfiles:    '',
  pct_bd_exactus_perfiles:   '',
  pct_bd_sdp_perfiles:       '',

  // Conclusiones
  conclusiones_perfiles: 'Las unidades operativas son responsables de la remediación, deben ejecutar acciones asegurando la operativa del negocio.\nLa unidad de Riesgos es responsable de la identificación de algún riesgo o posibles fraudes asociados a los accesos observados.',
};

// CAMPOS_AUTO_PERFILES imported from informePerfilesCalculo

// Cálculo de campos automáticos delegado a informePerfilesCalculo.js

// ── Generador docx ────────────────────────────────────────────────────────
async function generarDocx(valores) {
  const res = await fetch('/api/generar-informe-perfiles', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(valores),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const json = await res.json(); msg = json.error || msg; } catch {}
    throw new Error(msg);
  }
  const blob     = await res.blob();
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = 'Informe_Certificacion_Perfiles.docx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── UI helpers ────────────────────────────────────────────────────────────
function Section({ title, children, hint }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '2px solid var(--border)', paddingBottom: 6, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{title}</span>
        {hint && (
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500,
            textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--mono)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, textarea, rows: rowsProp, placeholder, readOnly, tip }) {
  const [showTip, setShowTip] = React.useState(false);

  const base = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    background: readOnly ? 'var(--bg3)' : 'var(--bg)',
    color: readOnly ? 'var(--text2)' : 'var(--text)',
    fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box',
    cursor: readOnly ? 'default' : 'text',
  };

  function handleAutoGrow(e) {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    if (onChange) onChange(e);
  }

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{ fontSize: 11, color: 'var(--text2)',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ flex: 1 }}>{label}</span>
        {readOnly && (
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999,
            background: 'var(--accent-bg)', color: 'var(--accent)',
            fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.05em', cursor: 'default' }}>
            AUTO
          </span>
        )}
        {tip && (
          <span onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
            style={{ width: 16, height: 16, borderRadius: '50%',
              background: readOnly ? 'var(--accent-bg)' : 'var(--bg3)',
              border: '1px solid var(--border)',
              color: readOnly ? 'var(--accent)' : 'var(--text3)',
              fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'help', flexShrink: 0, userSelect: 'none', position: 'relative' }}>
            ?
            {showTip && (
              <div style={{ position: 'absolute', bottom: '120%', right: 0, width: 240,
                padding: '8px 10px', background: 'var(--text)', color: 'var(--bg2)',
                fontSize: 10, lineHeight: 1.55, borderRadius: 6, zIndex: 999,
                fontFamily: 'var(--sans)', fontWeight: 400,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                pointerEvents: 'none', whiteSpace: 'pre-wrap' }}>
                {tip}
                <div style={{ position: 'absolute', bottom: -5, right: 5, width: 8, height: 8,
                  background: 'var(--text)', transform: 'rotate(45deg)' }} />
              </div>
            )}
          </span>
        )}
      </label>
      {textarea
        ? <textarea name={name} value={value ?? ''} onChange={readOnly ? undefined : handleAutoGrow}
            placeholder={placeholder} rows={rowsProp ?? 4} readOnly={readOnly}
            style={{ ...base, resize: 'vertical', lineHeight: 1.6,
              minHeight: rowsProp ? rowsProp * 20 : 80, overflow: 'auto' }} />
        : <input name={name} value={value ?? ''} onChange={readOnly ? undefined : onChange}
            placeholder={placeholder} readOnly={readOnly}
            style={{ ...base, height: 32 }} />
      }
    </div>
  );
}

function NumRow({ labels, names, values, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
      {labels.map((label, i) => (
        <div key={names[i]}>
          <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 2 }}>{label}</label>
          <input name={names[i]} value={values[names[i]] ?? ''} onChange={onChange} placeholder="0"
            style={{ width: '100%', padding: '5px 8px', fontSize: 14, textAlign: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--mono)',
              fontWeight: 700, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      ))}
    </div>
  );
}

function NumRowAuto({ labels, names, values }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
      {labels.map((label, i) => (
        <div key={names[i]}>
          <label style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center',
            gap: 4, marginBottom: 2 }}>
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 999,
              background: 'var(--accent-bg)', color: 'var(--accent)',
              fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.05em' }}>AUTO</span>
          </label>
          <div title="Calculado automáticamente desde los hallazgos validados"
            style={{ width: '100%', padding: '5px 8px', fontSize: 14, textAlign: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--bg3)',
              color: parseInt(values[names[i]] ?? '0', 10) > 0 ? 'var(--inc-text)' : 'var(--text3)',
              fontFamily: 'var(--mono)', fontWeight: 700, boxSizing: 'border-box', cursor: 'help' }}>
            {values[names[i]] ?? '0'}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccesoRestringido() {
  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">perfiles / <span>informe de certificación</span></div>
          <h2 className="page-title">Informe de Certificación — Perfiles</h2>
        </div>
      </div>
      <div className="empty-state" style={{ padding: '60px 24px' }}>
        <span className="empty-icon" style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Acceso restringido</p>
        <p style={{ color: 'var(--text3)', fontSize: 13, maxWidth: 460, textAlign: 'center' }}>
          La generación del informe está disponible solo para los roles{' '}
          <strong>Administrador</strong> y <strong>Usuario</strong>.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function GenerarInformePerfilesPanel() {
  const { user }   = useAuthStore();
  const bdFechas   = useBDFechasCorte();   // reactivo — se actualiza cuando una BD carga

  const [manual, setManual] = usePersistedState(STORAGE_KEY, INITIAL_FORM);

  // Campos automáticos (fechas) — siempre derivados de uiStore, nunca persistidos
  const [auto, setAuto] = useState({});

  const [loading, setLoading]               = useState(false);
  const [error,   setError]                 = useState(null);
  const [ok,      setOk]                    = useState(false);
  const [savedMsg, setSavedMsg]             = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Preview: payload explícito — solo se actualiza con botón "Refrescar"
  const [previewPayload, setPreviewPayload] = useState(null);

  // Refs para preview sin perder scroll (no re-renderiza automáticamente al teclear)
  const manualRef   = useRef(manual);
  const autoRef     = useRef(auto);
  useEffect(() => { manualRef.current = manual;     }, [manual]);
  useEffect(() => { autoRef.current = auto; }, [auto]);

  // Recalcular campos automáticos cuando bdFechas cambia (una BD terminó de cargar)
  useEffect(() => {
    calcularCamposAutomaticosPerfiles(bdFechas).then(campos => {
      setAuto(campos);
      // Mostrar el informe ya previsualizado al entrar a la vista.
      setPreviewPayload(prev => prev ?? { ...manualRef.current, ...campos });
    });
  }, [bdFechas, user]);

  // form = manual sobreescrito con fechas auto
  const form = { ...manual, ...auto };

  function handleChange(e) {
    const { name, value } = e.target;
    if (CAMPOS_AUTO_PERFILES.has(name)) return;   // ignorar cambios a campos auto
    setManual(prev => ({ ...prev, [name]: value }));
    // Vista previa en vivo (debounced en InformePreview)
    setPreviewPayload(prev => ({ ...(prev || { ...manual, ...auto }), [name]: value }));
  }

  function handleGuardar() { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2200); }

  function handleLimpiar() { setManual(INITIAL_FORM); setShowClearConfirm(false); }

  function handleRefreshPreview() {
    calcularCamposAutomaticosPerfiles(bdFechas).then(campos => {
      setAuto(campos);
      setPreviewPayload({ ...manualRef.current, ...campos });
    });
  }

  async function handleGenerar() {
    setLoading(true); setError(null); setOk(false);
    try {
      const campos = await calcularCamposAutomaticosPerfiles(bdFechas);
      const payload = { ...manual, ...campos };
      // Construir los Excel incrustados (por hallazgo/hoja/escenario con hallazgos).
      let excels = {};
      try { excels = await buildExcelPayloadsPerfiles(payload); } catch (e) { console.warn('[informe-perfiles] excels:', e); }
      await generarDocx({ ...payload, ...excels });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err.message || 'Error al generar el informe');
    } finally {
      setLoading(false);
    }
  }

  const camposEditados = Object.keys(INITIAL_FORM)
    .filter(k => !CAMPOS_AUTO_PERFILES.has(k))
    .filter(k => String(manual?.[k] ?? '') !== String(INITIAL_FORM[k] ?? '')).length;

  return (
    <div className="panel">
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
            <div className="modal-title">¿Limpiar los campos manuales?</div>
            <div className="modal-message">
              Se borrarán los {camposEditados} campo{camposEditados !== 1 ? 's' : ''} que modificaste.
              Las fechas automáticas no se tocan.
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowClearConfirm(false)}>Cancelar</button>
              <button className="modal-btn modal-confirm" onClick={handleLimpiar}>Sí, limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">perfiles / <span>informe de certificación</span></div>
          <h2 className="page-title">Generar Informe de Certificación — Perfiles</h2>
        </div>
        <div className="topbar-right" style={{ gap: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {error && <span style={{ fontSize: 12, color: 'var(--inc-text)', marginRight: 8, maxWidth: 320 }}>❌ {error}</span>}
          <button
            className="btn-export-small"
            onClick={handleRefreshPreview}
            disabled={loading}
            title="Actualiza la vista previa manteniendo la posición de scroll"
          >👁 Vista previa</button>
          <button className="btn-export-small" onClick={() => setShowClearConfirm(true)}
            disabled={loading || camposEditados === 0}>🗑 Limpiar manuales</button>
          <button className="btn-export" onClick={handleGuardar} disabled={loading}
            style={savedMsg ? { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' } : {}}>
            {savedMsg ? '✓ Guardado' : '💾 Guardar valores'}
          </button>
          <button className="btn-generate" onClick={handleGenerar} disabled={loading}>
            {loading ? <><span className="spinner" /> Generando…</>
             : ok     ? '✓ Descargado'
             : '⬇ Generar .docx'}
          </button>
        </div>
      </div>

      {/* ── Split view ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Panel izquierdo — formulario */}
        <div style={{ flex: '0 0 50%', overflow: 'auto', padding: '24px 28px', borderRight: '2px solid var(--border)' }}>

          {/* Banner */}
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--accent-bg)',
            border: '1px solid var(--accent2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <div style={{ flex: 1, lineHeight: 1.55 }}>
                Los campos marcados con{' '}
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 999,
                  background: 'var(--accent)', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700 }}>AUTO</span>{' '}
                se leen de las fuentes BD cargadas en Recopilación de Información. Carga primero las fuentes para
                que aparezcan las fechas. El resto de campos se llenan manualmente.
              </div>
            </div>
          </div>

          {/* Cabecera */}
          <Section title="Cabecera">
            <Field label="Mes / Año" name="mes_anio_perfiles" value={form.mes_anio_perfiles}
              onChange={handleChange} placeholder="ABR26"
              tip="Periodo de certificación. Ejemplo: ABR26, MAR26. Campo manual." />
          </Section>

          {/* Fechas de corte */}
          <Section title="Fechas de Corte" hint="(automáticas — desde Recopilar Información)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Field label="GDH"            name="fecha_corte_gdh_perfiles"     value={form.fecha_corte_gdh_perfiles}
                readOnly tip="Fecha de corte de la fuente GDH (prf-gdh) en Recopilación de Perfiles." />
              <Field label="Active Directory" name="fecha_corte_ad_perfiles"     value={form.fecha_corte_ad_perfiles}
                readOnly tip="Fecha de corte de la fuente Active Directory (prf-ad) en Recopilación de Perfiles." />
              <Field label="Apps Críticas"  name="fecha_corte_apps_perfiles"    value={form.fecha_corte_apps_perfiles}
                readOnly tip="Primera fecha disponible entre App Exactus, SDP, SIT y NPAC de Perfiles." />
              <Field label="Matriz de Roles" name="fecha_corte_mr_perfiles"     value={form.fecha_corte_mr_perfiles}
                readOnly tip="Fecha de corte de la fuente Matriz de Rol (prf-matriz-rol)." />
              <Field label="Moviper"        name="fecha_corte_moviper_perfiles" value={form.fecha_corte_moviper_perfiles}
                readOnly tip="Fecha de corte de la fuente Moviper (prf-moviper)." />
              <Field label="Base de Datos"  name="fecba_corte_bd_perfiles"      value={form.fecba_corte_bd_perfiles}
                readOnly tip={'Primera fecha disponible entre DB SDP y DB Exactus de Perfiles.\n(El nombre de este campo en el template tiene un typo: «fecba» en lugar de «fecha».)'} />
            </div>
          </Section>

          {/* GDH */}
          <Section title="Activos GDH — Hallazgos" hint="(automáticos — desde hallazgos GDH)">
            <NumRowAuto
              labels={['Existe en MR (Incorrecto)', 'Rol Incorrecto']}
              names={['gdh_rol_incorrecto_perfiles', 'gdh_mr_no_existe_perfiles']}
              values={form}
            />
          </Section>
          <Section title="Activos GDH — Comentarios">
            <Field label="Comentario Rol Incorrecto" name="gdh_com_rol_perfiles" value={form.gdh_com_rol_perfiles}
              onChange={handleChange} textarea placeholder="- Se identificaron X perfiles con rol incorrecto..." />
            <Field label="Comentario Matriz de Roles" name="gdh_com_matriz_perfiles" value={form.gdh_com_matriz_perfiles}
              onChange={handleChange} textarea placeholder="- Se identificaron X perfiles sin matriz de roles..." />
          </Section>
          <Section title="Activos GDH — % Cumplimiento">
            <div style={{ maxWidth: 200 }}>
              <Field label="% Cumplimiento GDH" name="pct_gdh_perfiles" value={form.pct_gdh_perfiles}
                onChange={handleChange} placeholder="99.8%" />
            </div>
          </Section>

          {/* Moviper */}
          <Section title="Moviper — Hallazgos" hint="(automáticos — desde hallazgos Moviper)">
            <NumRowAuto
              labels={['Rol Incorrecto', 'Existe en MR (Incorrecto)']}
              names={['mov_rol_incorrecto_perfiles', 'mov_mr_no_existe_perfiles']}
              values={form}
            />
          </Section>
          <Section title="Moviper — Comentarios">
            <Field label="Comentario Rol Incorrecto" name="mov_com_ri_perfiles" value={form.mov_com_ri_perfiles}
              onChange={handleChange} textarea placeholder="- Se identificaron X perfiles Moviper con rol incorrecto..." />
            <Field label="Comentario Matriz de Roles" name="mov_com_mr_perfiles" value={form.mov_com_mr_perfiles}
              onChange={handleChange} textarea placeholder="- Se identificaron X perfiles Moviper sin matriz de roles..." />
          </Section>
          <Section title="Moviper — % Cumplimiento">
            <div style={{ maxWidth: 200 }}>
              <Field label="% Cumplimiento Moviper" name="pct_mov_perfiles" value={form.pct_mov_perfiles}
                onChange={handleChange} placeholder="99.8%" />
            </div>
          </Section>

          {/* Aplicaciones Críticas */}
          <Section title="Aplicaciones Críticas — Hallazgos" hint="(automáticos — Perfil No Identificado)">
            <NumRowAuto
              labels={['EXACTUS', 'SDP', 'SIT', 'NPAC']}
              names={['apps_exactus_perfiles', 'apps_sdp_perfiles', 'apps_sit_perfiles', 'apps_npac_perfiles']}
              values={form}
            />
          </Section>
          <Section title="Aplicaciones Críticas — Comentarios">
            {['exactus', 'sdp', 'sit', 'npac'].map(app => (
              <div key={app} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>{app}</div>
                <Field label={`Comentario ${app.toUpperCase()}`} name={`apps_${app}_com_perfiles`}
                  value={form[`apps_${app}_com_perfiles`]} onChange={handleChange} textarea
                  placeholder={`- Se identificaron X perfiles con hallazgo en ${app.toUpperCase()}...`} />
              </div>
            ))}
          </Section>
          <Section title="Aplicaciones Críticas — % Cumplimiento">
            <NumRow labels={['% EXACTUS', '% SDP', '% SIT', '% NPAC']}
              names={['pct_apps_exactus_perfiles', 'pct_apps_sdp_perfiles', 'pct_apps_sit_perfiles', 'pct_apps_npac_perfiles']}
              values={form} onChange={handleChange} />
          </Section>

          {/* Base de Datos */}
          <Section title="Base de Datos — Hallazgos" hint="(automáticos — Perfil No Identificado)">
            <NumRowAuto
              labels={['BD EXACTUS', 'BD SDP']}
              names={['bd_exactus_perfiles', 'bd_sdp_perfiles']}
              values={form}
            />
          </Section>
          <Section title="Base de Datos — Comentarios">
            {['exactus', 'sdp'].map(bd => (
              <div key={bd} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>BD {bd}</div>
                <Field label={`Comentario BD ${bd.toUpperCase()}`} name={`bd_${bd}_com_perfiles`}
                  value={form[`bd_${bd}_com_perfiles`]} onChange={handleChange} textarea
                  placeholder={`- Se identificaron X perfiles con hallazgo en BD ${bd.toUpperCase()}...`} />
              </div>
            ))}
          </Section>
          <Section title="Base de Datos — % Cumplimiento">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 400 }}>
              <Field label="% BD EXACTUS" name="pct_bd_exactus_perfiles" value={form.pct_bd_exactus_perfiles} onChange={handleChange} placeholder="99.8%" />
              <Field label="% BD SDP"     name="pct_bd_sdp_perfiles"     value={form.pct_bd_sdp_perfiles}     onChange={handleChange} placeholder="99.8%" />
            </div>
          </Section>

          {/* Conclusiones */}
          <Section title="Conclusiones">
            <Field label="Conclusiones" name="conclusiones_perfiles" value={form.conclusiones_perfiles}
              onChange={handleChange} textarea rows={8}
              tip="Usa Enter para separar cada conclusión — se imprimirán respetando los saltos de línea." />
          </Section>

        </div>
        {/* end form panel */}

        {/* Panel derecho — vista previa */}
        <div style={{ flex: '0 0 50%', overflow: 'hidden', background: 'var(--bg3)',
          display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <InformePerfilesPreview payload={previewPayload} visible={true} />
        </div>
        {/* end preview panel */}

      </div>
      {/* end split */}
    </div>
  );
}
