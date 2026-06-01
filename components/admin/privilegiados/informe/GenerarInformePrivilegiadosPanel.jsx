'use client';

/**
 * GenerarInformePrivilegiadosPanel — v24.5
 *
 * Formulario 100% manual para el informe de certificación de Privilegiados.
 * Split-view: formulario (izq) + preview en vivo (der).
 * La preview solo se actualiza al presionar "↺ Refrescar vista previa"
 * para que el scroll del documento no se pierda al teclear.
 *
 * Variables del template cubiertas (87 campos + conclusiones):
 *   {mes_anio_priv}
 *   Fechas de corte: {fc__priv} {fc_gdh_priv} {fc_mr_priv} {fc_windows_priv}
 *     {fc_linux_priv} {fc_dba_priv} {fc_sysadmin_priv} {fc_domain_priv}
 *     {fc_local_priv} {fc_infra_priv} {fc_mfa_priv}
 *   Windows:  {windows_cesados_priv} {windows_noid_sinsus_priv}
 *             {Windows_noid_sinsus_priv} {windows_cesados_com_priv} {windows_noid_sinsus_com_priv}
 *   Linux:    {linux_cesados_priv} {linux_noid_sinsus_priv} {Linux_noid_sinsus_priv}
 *             {linux_cesados_com_priv} {linux_noid_sinsus_com_priv}
 *   DBA:      {dba_cesados_priv} {dba_sinid_priv} {dba_cesados_com_priv} {dba_sinid_com_priv}
 *   SysAdmin: {sys_cesados_priv} {sys_sinid_priv} {sys_cesados_com_priv} {sys_sinid_com_priv}
 *   Domain:   {domain_cesados_priv} {domain_noid_sinsus_priv}
 *             {domain_cesados_com_priv} {domain_noid_sinsus_com_priv}
 *   Local:    {local_cesados_priv} {local_ noid_sinsus_priv} {local_noid_sinsus_com_priv}
 *             {local_cesados_com_priv}  (typo en template: "local_ noid" con espacio)
 *   Apps x4:  {apps_{exactus|sdp|sit|npac}_{cesados|noid_sinsus}_priv}
 *             {apps_{exactus|sdp|sit|npac}_{cesados|noid_sinsus}_com_priv}
 *   MFA:      {mfa_sinac_priv} {mfa_sinac_com_priv}
 *   PCT x31:  {pct_{windows|linux|dba|sys|domain|local|apps_*|mfa}_{activos_correctos|auto|id}_priv}
 *   {conclusiones_priv}
 *
 * Excels incrustados (no generados aún — se conservan del template):
 *   rId14 → AD + Apps Críticas
 *   rId16 → Servidores Apps Críticas
 *   rId18 → Base de Datos
 *   rId20 → MFA
 *   rId22 → Infraestructura
 */

import React, { useState, useRef } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { useAuthStore } from '@/lib/store/authStore';
import { useBDFechasCorte } from '@/lib/store/uiStore';
import {
  calcularCamposAutomaticosPrivilegiados,
  CAMPOS_AUTO_PRIVILEGIADOS,
} from '@/lib/utils/informePrivilegiadosCalculo';
import { buildExcelPayloadsPrivilegiados } from '@/lib/utils/buildPrivilegiadosExcel';
import InformePrivilegiadosPreview from './InformePrivilegiadosPreview';

const STORAGE_KEY = 'itsecops-informe-privilegiados-form';

// ── Valores iniciales — todo manual ──────────────────────────────────────────
const INITIAL_FORM = {
  // Cabecera
  mes_anio_priv: '',

  // Fechas de corte (fc_ = fecha corte)
  fc__priv:        '',  // AD — nombre con doble guión en el template
  fc_gdh_priv:     '',
  fc_mr_priv:      '',
  fc_windows_priv: '',
  fc_linux_priv:   '',
  fc_dba_priv:     '',
  fc_sysadmin_priv:'',
  fc_domain_priv:  '',
  fc_local_priv:   '',
  fc_infra_priv:   '',
  fc_mfa_priv:     '',

  // Windows
  windows_cesados_priv:        '',
  windows_noid_sinsus_priv:    '',
  Windows_noid_sinsus_priv:    '',  // typo en template — mayúscula
  windows_cesados_com_priv:    '',
  windows_noid_sinsus_com_priv:'',

  // Linux
  linux_cesados_priv:          '',
  linux_noid_sinsus_priv:      '',
  Linux_noid_sinsus_priv:      '',  // typo en template — mayúscula
  linux_cesados_com_priv:      '',
  linux_noid_sinsus_com_priv:  '',

  // DBA
  dba_cesados_priv:    '',
  dba_sinid_priv:      '',
  dba_cesados_com_priv:'',
  dba_sinid_com_priv:  '',

  // SysAdmin
  sys_cesados_priv:    '',
  sys_sinid_priv:      '',
  sys_cesados_com_priv:'',
  sys_sinid_com_priv:  '',

  // Domain Admin
  domain_cesados_priv:        '',
  domain_noid_sinsus_priv:    '',
  domain_cesados_com_priv:    '',
  domain_noid_sinsus_com_priv:'',

  // Local Admin  (typo en template: "local_ noid" con espacio)
  local_cesados_priv:          '',
  'local_ noid_sinsus_priv':   '',
  local_cesados_com_priv:      '',
  local_noid_sinsus_com_priv:  '',

  // Apps Críticas — hallazgos
  apps_exactus_cesados_priv:     '',
  apps_exactus_noid_sinsus_priv: '',
  apps_sdp_cesados_priv:         '',
  apps_sdp_noid_sinsus_priv:     '',
  apps_sit_cesados_priv:         '',
  apps_sit_noid_sinsus_priv:     '',
  apps_npac_cesados_priv:        '',
  apps_npac_noid_sinsus_priv:    '',

  // Apps Críticas — comentarios
  apps_exactus_cesados_com_priv:     '',
  apps_exactus_noid_sinsus_com_priv: '',
  apps_sdp_cesados_com_priv:         '',
  apps_sdp_noid_sinsus_com_priv:     '',
  apps_sit_cesados_com_priv:         '',
  apps_sit_noid_sinsus_com_priv:     '',
  apps_npac_cesados_com_priv:        '',
  apps_npac_noid_sinsus_com_priv:    '',

  // MFA
  mfa_sinac_priv:     '',
  mfa_sinac_com_priv: '',

  // Porcentajes — Windows
  pct_windows_activos_correctos_priv: '',
  pct_windows_auto_priv:              '',
  pct_windows_id_priv:                '',
  // Linux
  pct_linux_activos_correctos_priv: '',
  pct_linux_auto_priv:              '',
  pct_linux_id_priv:                '',
  // DBA
  pct_dba_activos_correctos_priv: '',
  pct_dba_auto_priv:              '',
  pct_dba_id_priv:                '',
  // SysAdmin
  pct_sys_activos_correctos_priv: '',
  pct_sys_auto_priv:              '',
  pct_sys_id_priv:                '',
  // Domain
  pct_domain_activos_correctos_priv: '',
  pct_domain_auto_priv:              '',
  pct_domain_id_priv:                '',
  // Local
  pct_local_activos_correctos_priv: '',
  pct_local_auto_priv:              '',
  pct_local_id_priv:                '',
  // Apps
  pct_apps_exactus_activos_correctos_priv: '',
  pct_apps_exactus_auto_priv:              '',
  pct_apps_exactus_id_priv:               '',
  pct_apps_sdp_activos_correctos_priv:    '',
  pct_apps_sdp_auto_priv:                 '',
  pct_apps_sdp_id_priv:                   '',
  pct_apps_sit_activos_correctos_priv:    '',
  pct_apps_sit_auto_priv:                 '',
  pct_apps_sit_id_priv:                   '',
  pct_apps_npac_activos_correctos_priv:   '',
  pct_apps_npac_auto_priv:                '',
  pct_apps_npac_id_priv:                  '',
  // MFA
  pct_mfa_ac_co_priv: '',

  // Conclusiones
  conclusiones_priv: 'Las unidades operativas son responsables de la remediación, deben ejecutar acciones asegurando la operativa del negocio.\nLa unidad de Riesgos es responsable de la identificación de algún riesgo o posibles fraudes asociados a los accesos observados.',
};

// ── Generador docx ────────────────────────────────────────────────────────────
async function generarDocx(valores) {
  const res = await fetch('/api/generar-informe-privilegiados', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(valores),
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  const url  = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url; link.download = 'Informe_Certificacion_Privilegiados.docx';
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '2px solid var(--border)', paddingBottom: 6, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{title}</span>
        {hint && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500,
          textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--mono)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, textarea, rows: r, placeholder, tip, readOnly }) {
  const [showTip, setShowTip] = React.useState(false);
  const isAuto = readOnly || CAMPOS_AUTO_PRIVILEGIADOS.has(name);
  const base = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    background: isAuto ? 'var(--bg3)' : 'var(--bg)',
    color: isAuto ? 'var(--text2)' : 'var(--text)',
    fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box',
    cursor: isAuto ? 'default' : 'text',
  };
  function grow(e) { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; if (onChange) onChange(e); }
  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ flex: 1 }}>{label}</span>
        {isAuto && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 4,
            background: 'var(--accent-bg)', border: '1px solid var(--accent2)',
            color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--mono)',
            letterSpacing: '0.05em',
          }}>AUTO</span>
        )}
        {tip && (
          <span onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
            style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg3)',
              border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'help', flexShrink: 0, userSelect: 'none', position: 'relative' }}>
            ?
            {showTip && (
              <div style={{ position: 'absolute', bottom: '120%', right: 0, width: 240, padding: '8px 10px',
                background: 'var(--text)', color: 'var(--bg2)', fontSize: 10, lineHeight: 1.55,
                borderRadius: 6, zIndex: 999, fontFamily: 'var(--sans)', fontWeight: 400,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none', whiteSpace: 'pre-wrap' }}>
                {tip}
                <div style={{ position: 'absolute', bottom: -5, right: 5, width: 8, height: 8,
                  background: 'var(--text)', transform: 'rotate(45deg)' }} />
              </div>
            )}
          </span>
        )}
      </label>
      {textarea
        ? <textarea name={name} value={value ?? ''} onChange={isAuto ? undefined : grow}
            placeholder={placeholder} rows={r ?? 3} readOnly={isAuto}
            style={{ ...base, resize: isAuto ? 'none' : 'vertical', lineHeight: 1.6, minHeight: (r ?? 3) * 20, overflow: 'auto' }} />
        : <input name={name} value={value ?? ''} onChange={isAuto ? undefined : onChange}
            placeholder={placeholder} readOnly={isAuto}
            style={{ ...base, height: 32 }} />
      }
    </div>
  );
}

// Etiqueta «AUTO» reutilizable para campos calculados (no editables).
function AutoTag() {
  return (
    <span style={{
      fontSize: 8, padding: '0 5px', borderRadius: 4, marginLeft: 5,
      background: 'var(--accent-bg)', border: '1px solid var(--accent2)',
      color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--mono)',
      letterSpacing: '0.05em', verticalAlign: 'middle',
    }}>AUTO</span>
  );
}

function NumRow({ labels, names, values, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
      {labels.map((lbl, i) => {
        const isAuto = CAMPOS_AUTO_PRIVILEGIADOS.has(names[i]);
        return (
          <div key={names[i]}>
            <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
              {lbl}{isAuto && <AutoTag />}
            </label>
            <input name={names[i]} value={values[names[i]] ?? ''}
              onChange={isAuto ? undefined : onChange} readOnly={isAuto} placeholder="0"
              title={isAuto ? 'Valor calculado automáticamente — no editable' : undefined}
              style={{ width: '100%', padding: '5px 8px', fontSize: 14, textAlign: 'center',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: isAuto ? 'var(--bg3)' : 'var(--bg)',
                color: isAuto ? 'var(--text2)' : 'var(--text)',
                fontFamily: 'var(--mono)', fontWeight: 700,
                boxSizing: 'border-box', outline: 'none',
                cursor: isAuto ? 'not-allowed' : 'text' }} />
          </div>
        );
      })}
    </div>
  );
}

function PctRow({ labels, names, values, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
      {labels.map((lbl, i) => {
        const isAuto = CAMPOS_AUTO_PRIVILEGIADOS.has(names[i]);
        return (
          <div key={names[i]}>
            <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 2 }}>
              {lbl}{isAuto && <AutoTag />}
            </label>
            <input name={names[i]} value={values[names[i]] ?? ''}
              onChange={isAuto ? undefined : onChange} readOnly={isAuto} placeholder="99.8%"
              title={isAuto ? 'Valor calculado automáticamente — no editable' : undefined}
              style={{ width: '100%', padding: '5px 8px', fontSize: 12, textAlign: 'center',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: isAuto ? 'var(--bg3)' : 'var(--bg)',
                color: isAuto ? 'var(--text2)' : 'var(--text)',
                fontFamily: 'var(--mono)', boxSizing: 'border-box', outline: 'none',
                cursor: isAuto ? 'not-allowed' : 'text' }} />
          </div>
        );
      })}
    </div>
  );
}

function AccesoRestringido() {
  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">privilegiados / <span>informe de certificación</span></div>
          <h2 className="page-title">Informe de Certificación — Privilegiados</h2>
        </div>
      </div>
      <div className="empty-state" style={{ padding: '60px 24px' }}>
        <span className="empty-icon" style={{ fontSize: 48 }}>🔒</span>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Acceso restringido</p>
        <p style={{ color: 'var(--text3)', fontSize: 13, maxWidth: 460, textAlign: 'center' }}>
          Solo disponible para <strong>Administrador</strong> y <strong>Usuario</strong>.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GenerarInformePrivilegiadosPanel() {
  const { user } = useAuthStore();
  const bdFechas = useBDFechasCorte();
  const [form, setForm] = usePersistedState(STORAGE_KEY, INITIAL_FORM);
  const [auto, setAuto] = React.useState({});

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [ok,      setOk]      = useState(false);
  const [savedMsg,setSavedMsg]= useState(false);
  const [showClear, setShowClear] = useState(false);

  // Preview — solo se actualiza con botón explícito
  const [previewPayload, setPreviewPayload] = useState(null);
  const formRef = useRef(form);
  const autoRef = useRef(auto);
  React.useEffect(() => { formRef.current = form; }, [form]);
  React.useEffect(() => { autoRef.current = auto; }, [auto]);

  // Recalcular campos automáticos cuando bdFechas cambia
  React.useEffect(() => {
    calcularCamposAutomaticosPrivilegiados(bdFechas).then(campos => {
      setAuto(campos);
      setForm(prev => ({ ...prev, ...campos }));
      // Mostrar el informe ya previsualizado al entrar a la vista.
      setPreviewPayload(prev => prev ?? { ...formRef.current, ...campos });
    });
  }, [bdFechas]);

  if (user && user.role === 'certificador') return <AccesoRestringido />;

  function handleChange(e) {
    const { name, value } = e.target;
    if (CAMPOS_AUTO_PRIVILEGIADOS.has(name)) return; // ignorar cambios a campos auto
    setForm(prev => ({ ...prev, [name]: value }));
    setPreviewPayload(prev => ({ ...(prev || formRef.current), [name]: value }));
  }

  function handleGuardar() { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2200); }
  function handleLimpiar() { setForm(INITIAL_FORM); setShowClear(false); }
  async function handleRefresh() {
    // Recalcular hallazgos/porcentajes/fechas desde IDB + validaciones antes de refrescar.
    let campos = {};
    try { campos = await calcularCamposAutomaticosPrivilegiados(bdFechas); } catch {}
    setAuto(campos);
    setForm(prev => ({ ...prev, ...campos }));
    setPreviewPayload({ ...formRef.current, ...campos });
  }

  async function handleGenerar() {
    setLoading(true); setError(null); setOk(false);
    try {
      // Asegurar valores automáticos frescos (hallazgos/% recién generados).
      let campos = {};
      try { campos = await calcularCamposAutomaticosPrivilegiados(bdFechas); } catch {}
      const payload = { ...formRef.current, ...campos };
      setForm(payload);
      // Construir los Excel incrustados (por hallazgo/hoja/escenario con hallazgos).
      let excels = {};
      try { excels = await buildExcelPayloadsPrivilegiados(payload); } catch (e) { console.warn('[informe-priv] excels:', e); }
      await generarDocx({ ...payload, ...excels });
      setOk(true); setTimeout(() => setOk(false), 3000);
    } catch (err) { setError(err.message || 'Error al generar el informe'); }
    finally { setLoading(false); }
  }

  const camposEditados = Object.keys(INITIAL_FORM)
    .filter(k => String(form?.[k] ?? '') !== String(INITIAL_FORM[k] ?? '')).length;

  return (
    <div className="panel">
      {showClear && (
        <div className="modal-overlay" onClick={() => setShowClear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ fontSize: 36 }}>⚠️</div>
            <div className="modal-title">¿Limpiar todos los campos?</div>
            <div className="modal-message">Se borrarán los {camposEditados} campo{camposEditados !== 1 ? 's' : ''} modificados.</div>
            <div className="modal-actions">
              <button className="modal-btn modal-cancel" onClick={() => setShowClear(false)}>Cancelar</button>
              <button className="modal-btn modal-confirm" onClick={handleLimpiar}>Sí, limpiar</button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">privilegiados / <span>informe de certificación</span></div>
          <h2 className="page-title">Generar Informe de Certificación — Privilegiados</h2>
        </div>
        <div className="topbar-right" style={{ gap: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {error && <span style={{ fontSize: 12, color: 'var(--inc-text)', maxWidth: 300 }}>❌ {error}</span>}
          <button
            className="btn-export-small"
            onClick={handleRefresh}
            disabled={loading}
            title="Actualiza la vista previa manteniendo la posición de scroll"
          >👁 Vista previa</button>
          <button className="btn-export-small" onClick={() => setShowClear(true)}
            disabled={loading || camposEditados === 0}>🗑 Limpiar</button>
          <button className="btn-export" onClick={handleGuardar} disabled={loading}
            style={savedMsg ? { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' } : {}}>
            {savedMsg ? '✓ Guardado' : '💾 Guardar valores'}
          </button>
          <button className="btn-generate" onClick={handleGenerar} disabled={loading}>
            {loading ? <><span className="spinner" /> Generando…</> : ok ? '✓ Descargado' : '⬇ Generar .docx'}
          </button>
        </div>
      </div>

      {/* Split view */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Formulario */}
        <div style={{ flex: '0 0 50%', overflow: 'auto', padding: '24px 28px', borderRight: '2px solid var(--border)' }}>

          {/* Banner */}
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--accent-bg)',
            border: '1px solid var(--accent2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <div style={{ flex: 1, lineHeight: 1.55 }}>
                <strong>Modo manual:</strong> completa todos los campos. Los valores se guardan en el navegador.
                Haz clic en <strong>↺ Refrescar vista previa</strong> (panel derecho) para ver el documento.
                <br />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Nota: dos variables tienen typo en el template — <code>Windows_noid_sinsus_priv</code> (mayúscula) y <code>Linux_noid_sinsus_priv</code> (mayúscula) y <code>local_ noid_sinsus_priv</code> (espacio). Se replican exactas.
                </span>
              </div>
            </div>
          </div>

          {/* Cabecera */}
          <Section title="Cabecera">
            <Field label="Mes / Año" name="mes_anio_priv" value={form.mes_anio_priv}
              onChange={handleChange} placeholder="ABR26" tip="Periodo de certificación. Ej: ABR26." />
          </Section>

          {/* Fechas de corte */}
          <Section title="Fechas de Corte">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                ['AD',          'fc__priv',        'Fecha de corte de Active Directory (campo fc__priv con doble guión en el template).'],
                ['GDH',         'fc_gdh_priv',     ''],
                ['Matriz Roles','fc_mr_priv',      ''],
                ['Windows',     'fc_windows_priv', ''],
                ['Linux',       'fc_linux_priv',   ''],
                ['DBA',         'fc_dba_priv',     ''],
                ['SysAdmin',    'fc_sysadmin_priv',''],
                ['Domain',      'fc_domain_priv',  ''],
                ['Local',       'fc_local_priv',   ''],
                ['Infra',       'fc_infra_priv',   ''],
                ['MFA',         'fc_mfa_priv',     ''],
              ].map(([lbl, name, tip]) => (
                <Field key={name} label={lbl} name={name} value={form[name]}
                  onChange={handleChange} placeholder="30/04/2026" tip={tip || undefined} />
              ))}
            </div>
          </Section>

          {/* Windows */}
          <Section title="Windows — Hallazgos">
            <NumRow
              labels={['Cesados activos', 'Sin ID / Sin sustento', 'Sin ID / Sin sustento (alt)']}
              names={['windows_cesados_priv', 'windows_noid_sinsus_priv', 'Windows_noid_sinsus_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="Windows — Comentarios">
            <Field label="Cesados activos"     name="windows_cesados_com_priv"     value={form.windows_cesados_com_priv}     onChange={handleChange} textarea />
            <Field label="Sin ID / Sin sustento" name="windows_noid_sinsus_com_priv" value={form.windows_noid_sinsus_com_priv} onChange={handleChange} textarea />
          </Section>
          <Section title="Windows — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_windows_activos_correctos_priv', 'pct_windows_auto_priv', 'pct_windows_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* Linux */}
          <Section title="Linux — Hallazgos">
            <NumRow
              labels={['Cesados activos', 'Sin ID / Sin sustento', 'Sin ID / Sin sustento (alt)']}
              names={['linux_cesados_priv', 'linux_noid_sinsus_priv', 'Linux_noid_sinsus_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="Linux — Comentarios">
            <Field label="Cesados activos"      name="linux_cesados_com_priv"     value={form.linux_cesados_com_priv}     onChange={handleChange} textarea />
            <Field label="Sin ID / Sin sustento" name="linux_noid_sinsus_com_priv" value={form.linux_noid_sinsus_com_priv} onChange={handleChange} textarea />
          </Section>
          <Section title="Linux — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_linux_activos_correctos_priv', 'pct_linux_auto_priv', 'pct_linux_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* DBA */}
          <Section title="DBA — Hallazgos">
            <NumRow labels={['Cesados', 'Sin ID']}
              names={['dba_cesados_priv', 'dba_sinid_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="DBA — Comentarios">
            <Field label="Cesados" name="dba_cesados_com_priv" value={form.dba_cesados_com_priv} onChange={handleChange} textarea />
            <Field label="Sin ID"  name="dba_sinid_com_priv"   value={form.dba_sinid_com_priv}   onChange={handleChange} textarea />
          </Section>
          <Section title="DBA — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_dba_activos_correctos_priv', 'pct_dba_auto_priv', 'pct_dba_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* SysAdmin */}
          <Section title="SysAdmin — Hallazgos">
            <NumRow labels={['Cesados', 'Sin ID']}
              names={['sys_cesados_priv', 'sys_sinid_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="SysAdmin — Comentarios">
            <Field label="Cesados" name="sys_cesados_com_priv" value={form.sys_cesados_com_priv} onChange={handleChange} textarea />
            <Field label="Sin ID"  name="sys_sinid_com_priv"   value={form.sys_sinid_com_priv}   onChange={handleChange} textarea />
          </Section>
          <Section title="SysAdmin — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_sys_activos_correctos_priv', 'pct_sys_auto_priv', 'pct_sys_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* Domain Admin */}
          <Section title="Domain Admin — Hallazgos">
            <NumRow labels={['Cesados', 'Sin ID / Sin sustento']}
              names={['domain_cesados_priv', 'domain_noid_sinsus_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="Domain Admin — Comentarios">
            <Field label="Cesados"           name="domain_cesados_com_priv"     value={form.domain_cesados_com_priv}     onChange={handleChange} textarea />
            <Field label="Sin ID / Sin sust." name="domain_noid_sinsus_com_priv" value={form.domain_noid_sinsus_com_priv} onChange={handleChange} textarea />
          </Section>
          <Section title="Domain Admin — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_domain_activos_correctos_priv', 'pct_domain_auto_priv', 'pct_domain_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* Local Admin */}
          <Section title="Local Admin — Hallazgos"
            hint="(typo en template: «local_ noid» con espacio)">
            <NumRow labels={['Cesados', 'Sin ID / Sin sustento']}
              names={['local_cesados_priv', 'local_ noid_sinsus_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="Local Admin — Comentarios">
            <Field label="Cesados"           name="local_cesados_com_priv"     value={form.local_cesados_com_priv}     onChange={handleChange} textarea />
            <Field label="Sin ID / Sin sust." name="local_noid_sinsus_com_priv" value={form.local_noid_sinsus_com_priv} onChange={handleChange} textarea />
          </Section>
          <Section title="Local Admin — % Cumplimiento">
            <PctRow labels={['Activos correctos', 'Auto', 'ID']}
              names={['pct_local_activos_correctos_priv', 'pct_local_auto_priv', 'pct_local_id_priv']}
              values={form} onChange={handleChange} />
          </Section>

          {/* Apps Críticas */}
          <Section title="Apps Críticas — Hallazgos">
            {['exactus', 'sdp', 'sit', 'npac'].map(app => (
              <div key={app} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 700 }}>{app}</div>
                <NumRow labels={['Cesados', 'Sin ID / Sin sust.']}
                  names={[`apps_${app}_cesados_priv`, `apps_${app}_noid_sinsus_priv`]}
                  values={form} onChange={handleChange} />
              </div>
            ))}
          </Section>
          <Section title="Apps Críticas — Comentarios">
            {['exactus', 'sdp', 'sit', 'npac'].map(app => (
              <div key={app} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase' }}>{app}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field label="Cesados"           name={`apps_${app}_cesados_com_priv`}     value={form[`apps_${app}_cesados_com_priv`]}     onChange={handleChange} textarea />
                  <Field label="Sin ID / Sin sust." name={`apps_${app}_noid_sinsus_com_priv`} value={form[`apps_${app}_noid_sinsus_com_priv`]} onChange={handleChange} textarea />
                </div>
              </div>
            ))}
          </Section>
          <Section title="Apps Críticas — % Cumplimiento">
            {['exactus', 'sdp', 'sit', 'npac'].map(app => (
              <div key={app} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3, textTransform: 'uppercase', fontWeight: 700 }}>{app}</div>
                <PctRow labels={['Activos correctos', 'Auto', 'ID']}
                  names={[`pct_apps_${app}_activos_correctos_priv`, `pct_apps_${app}_auto_priv`, `pct_apps_${app}_id_priv`]}
                  values={form} onChange={handleChange} />
              </div>
            ))}
          </Section>

          {/* MFA */}
          <Section title="MFA — Hallazgos">
            <NumRow labels={['Sin activar']}
              names={['mfa_sinac_priv']}
              values={form} onChange={handleChange} />
          </Section>
          <Section title="MFA — Comentarios">
            <Field label="Sin activar" name="mfa_sinac_com_priv" value={form.mfa_sinac_com_priv} onChange={handleChange} textarea />
          </Section>
          <Section title="MFA — % Cumplimiento">
            <div style={{ maxWidth: 200 }}>
              <Field label="% MFA activado" name="pct_mfa_ac_co_priv" value={form.pct_mfa_ac_co_priv} onChange={handleChange} placeholder="99.8%" />
            </div>
          </Section>

          {/* Conclusiones */}
          <Section title="Conclusiones">
            <Field label="Conclusiones" name="conclusiones_priv" value={form.conclusiones_priv}
              onChange={handleChange} textarea rows={8}
              tip="Usa Enter para separar cada conclusión. Se respetan los saltos de línea en el .docx." />
          </Section>

        </div>

        {/* Preview */}
        <div style={{ flex: '0 0 50%', overflow: 'hidden', background: 'var(--bg3)',
          display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <InformePrivilegiadosPreview payload={previewPayload} visible={true} />
        </div>

      </div>
    </div>
  );
}
