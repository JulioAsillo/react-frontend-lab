'use client';

/**
 * GenerarInformePoliticaPanel
 *
 * Formulario MANUAL con VALIDACIÓN y CUMPLIMIENTO AUTOMÁTICO.
 *
 * Reglas por campo (una plataforma "Cumple" solo si pasa las 5):
 * - Longitud mínima : número, ≥ 8
 * - Complejidad : Habilitado | No Habilitado → cumple si "Habilitado"
 * - Intentos fallidos: número, ≤ 5
 * - Historial : número, ≤ 12
 * - Caducidad : número (días), ≤ 60
 *
 * Cuadro de Resultados (auto, en la sección 3 "Alcance" del Word). Cada app se
 * valida contra AD si autentica con AD (Cuadro 1), con un AND lógico:
 * cumple_sit = AD ∧ SIT
 * cumple_sdp = SDP
 * cumple_exactus = Exactus ∧ Exactus AD
 * cumple_plat_back = AD
 * cumple_azad = AD ∧ EntraID
 * cumple_devops = AD ∧ DevOps
 * cumple_github = AD ∧ GitHub
 * cumple_guardium = Guardium
 * cumple_snow = Service Now
 * (AD = la política configurada en Active Directory, sección propia editable)
 *
 * Un campo vacío/ inválido ⇒ esa plataforma NO cumple ⇒ arrastra el AND.
 * Los cumple_XXXX se envían como texto "Sí Cumple" / "No Cumple".
 */

import React, { useState, useMemo, useCallback } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { useAuthStore } from '@/lib/store/authStore';
import InformePreview from '@/components/shared/InformePreview';

// Texto exacto que se inserta en el Word para cada resultado (cámbialo aquí si
// el cuadro espera otra cadena, p. ej. "Cumple" / "No Cumple").
const TXT_SI = 'Sí Cumple';
const TXT_NO = 'No Cumple';

// ── Reglas por campo ────────────────────────────────────────────────────────
const POLICY_FIELDS = [
  { suf: 'long_min',     label: 'Longitud mínima',           kind: 'number', unit: 'caracteres', hint: '≥ 8',        ok: (n) => n >= 8 },
  { suf: 'cmplj_contra', label: 'Complejidad de contraseña', kind: 'select', hint: 'Habilitado', ok: (v) => v === 'Habilitado' },
  { suf: 'int_fall',     label: 'Intentos fallidos',         kind: 'number', unit: 'intentos',   hint: '≤ 5',        ok: (n) => n <= 5 },
  { suf: 'histo_contra', label: 'Historial de contraseñas',  kind: 'number', unit: 'contraseñas',hint: '≤ 12',       ok: (n) => n <= 12 },
  { suf: 'cadu_contra',  label: 'Caducidad de contraseña',   kind: 'number', unit: 'días',       hint: '≤ 60 días',  ok: (n) => n <= 60 },
];

// Secciones por plataforma (todas tienen los 5 campos, incl. Active Directory)
const SECCIONES = [
  { id: 'sit',           label: 'Sistema Integral de Tesorería – SIT' },
  { id: 'ad',            label: 'Active Directory' },
  { id: 'exactus',       label: 'Exactus (Módulo Propio)' },
  { id: 'exactus_ad',    label: 'Exactus AD' },
  { id: 'sdp',           label: 'Sistema de Pensiones – SDP' },
  { id: 'azad_entra_id', label: 'Azure Active Directory (EntraID)' },
  { id: 'devops',        label: 'Azure DevOps' },
  { id: 'github',        label: 'GitHub' },
  { id: 'guardium',      label: 'Guardium' },
  { id: 'snow',          label: 'Service Now' },
];

// Cuadro de Resultados: fórmula de cada cumple_XXXX en función del cumplimiento
// por sección (c = { [id]: boolean }).
const RESULT_ROWS = [
  { key: 'cumple_sit',       label: 'SIT',                desc: 'AD ∧ SIT',              fn: (c) => c.ad && c.sit },
  { key: 'cumple_sdp',       label: 'SDP',                desc: 'SDP',                   fn: (c) => c.sdp },
  { key: 'cumple_exactus',   label: 'Exactus',            desc: 'Exactus ∧ Exactus AD',  fn: (c) => c.exactus && c.exactus_ad },
  { key: 'cumple_plat_back', label: 'Plataforma Back',    desc: 'AD',                    fn: (c) => c.ad },
  { key: 'cumple_azad',      label: 'Azure AD (EntraID)', desc: 'AD ∧ EntraID',          fn: (c) => c.ad && c.azad_entra_id },
  { key: 'cumple_devops',    label: 'Azure DevOps',       desc: 'AD ∧ DevOps',           fn: (c) => c.ad && c.devops },
  { key: 'cumple_github',    label: 'GitHub',             desc: 'AD ∧ GitHub',           fn: (c) => c.ad && c.github },
  { key: 'cumple_guardium',  label: 'Guardium',           desc: 'Guardium',              fn: (c) => c.guardium },
  { key: 'cumple_snow',      label: 'Service Now',        desc: 'Service Now',           fn: (c) => c.snow },
];

const GLOBALES = [
  { key: 'acciones_correctivas', label: 'Acciones correctivas' },
  { key: 'Conclusiones',         label: 'Conclusiones' },
  { key: 'Seguimiento',          label: 'Seguimiento' },
];

const STORAGE_KEY = 'politica-contrasenas-informe-text';

function buildInitialText() {
  const t = {};
  for (const s of SECCIONES) for (const f of POLICY_FIELDS) t[`${f.suf}_${s.id}`] = '';
  for (const g of GLOBALES) t[g.key] = '';
  return t;
}

// ── Estado de un campo: 'empty' | 'ok' | 'bad' ─────────────────────────────
function fieldState(field, raw) {
  if (raw == null || raw === '') return 'empty';
  if (field.kind === 'select') return field.ok(raw) ? 'ok' : 'bad';
  const n = Number(raw);
  if (Number.isNaN(n)) return 'bad';
  return field.ok(n) ? 'ok' : 'bad';
}

// ── Lectura de archivos → { name, src(dataURL), b64 } ──────────────────────
function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const b64 = src.includes(',') ? src.split(',')[1] : src;
      resolve({ name: file.name, src, b64, id: `${file.name}-${Date.now()}-${Math.random()}` });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Zona de carga de imágenes (drag & drop + click, múltiples) ─────────────
function ImageDropzone({ imgs, onAdd, onRemove, onClear }) {
  const [over, setOver] = useState(false);
  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFileAsImage));
    onAdd(loaded);
  }, [onAdd]);

  return (
    <div style={{ marginTop: 10 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById(`file-${onAdd.dzId}`)?.click()}
        style={{
          border: `2px dashed ${over ? 'var(--accent)' : 'var(--border)'}`,
          background: over ? 'var(--accent-bg)' : 'var(--bg3)', borderRadius: 'var(--radius)',
          padding: '16px', textAlign: 'center', cursor: 'pointer', fontSize: 12,
          color: 'var(--text3)', transition: 'all 0.15s ease',
        }}
      >
        <div style={{ fontSize: 20, marginBottom: 2 }}>🖼️</div>
        Arrastra imágenes o haz clic · se apilan en orden
        <input id={`file-${onAdd.dzId}`} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {imgs.length > 0 && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {imgs.map((im, idx) => (
              <div key={im.id} style={{ position: 'relative', width: 96 }}>
                <img src={im.src} alt={im.name}
                  style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9, fontFamily: 'var(--mono)', color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '0 4px' }}>{idx + 1}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(im.id); }} title="Quitar"
                  style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--inc)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: '20px', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={onClear} style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Quitar todas ({imgs.length})
          </button>
        </>
      )}
    </div>
  );
}

// ── Campo (number con unidad y validación, o select) ───────────────────────
const COLORS = {
  empty: { border: 'var(--border)',     hint: 'var(--text4)' },
  ok:    { border: 'var(--ok-border)',  hint: 'var(--ok-text)' },
  bad:   { border: 'var(--inc-border)', hint: 'var(--inc-text)' },
};

function PolicyField({ field, value, onChange }) {
  const st = fieldState(field, value);
  const c = COLORS[st];
  const base = {
    width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 'var(--radius)',
    background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--sans)',
    border: `1px solid ${c.border}`, outline: 'none',
  };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{field.label}</span>
      {field.kind === 'select' ? (
        <select style={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="Habilitado">Habilitado</option>
          <option value="No Habilitado">No Habilitado</option>
        </select>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            type="number" inputMode="numeric" min={0} step={1}
            style={{ ...base, paddingRight: field.unit ? 84 : 10 }}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
          />
          {field.unit && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text4)', pointerEvents: 'none' }}>
              {field.unit}
            </span>
          )}
        </div>
      )}
      <span style={{ fontSize: 10.5, color: c.hint, fontFamily: 'var(--mono)', minHeight: 13 }}>
        {st === 'bad' ? `Requerido: ${field.hint}` : st === 'ok' ? `✓ ${field.hint}` : field.hint}
      </span>
    </label>
  );
}

// ── Badge de cumplimiento por sección ──────────────────────────────────────
function CumpleBadge({ state }) {
  const map = {
    cumple:     { txt: '✓ Cumple',     bg: 'var(--ok-bg)',  fg: 'var(--ok-text)',  bd: 'var(--ok-border)' },
    no:         { txt: '✗ No cumple',  bg: 'var(--inc-bg)', fg: 'var(--inc-text)', bd: 'var(--inc-border)' },
    incompleto: { txt: '— incompleto', bg: 'var(--bg3)',    fg: 'var(--text4)',    bd: 'var(--border)' },
  };
  const m = map[state];
  return (
    <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', fontWeight: 700, color: m.fg, background: m.bg, border: `1px solid ${m.bd}`, borderRadius: 20, padding: '1px 9px' }}>
      {m.txt}
    </span>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border)', paddingBottom: 6, marginBottom: 14, marginTop: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1 }}>{children}</span>
      {right}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--sans)',
};

function AccesoRestringido() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Acceso restringido</p>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
        La generación del informe está disponible para los roles <strong>Administrador</strong> y <strong>Usuario</strong>.
      </p>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function GenerarInformePoliticaPanel() {
  const { user } = useAuthStore();

  const [text, setText] = usePersistedState(STORAGE_KEY, buildInitialText());
  const [imgs, setImgs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const setField = (key, val) => setText((prev) => ({ ...prev, [key]: val }));

  const imgKeyFor = (id) => `imagenes_${id}`;
  const getImgs = (id) => imgs[imgKeyFor(id)] || [];
  const addImgs = (id, loaded) => setImgs((p) => ({ ...p, [imgKeyFor(id)]: [...(p[imgKeyFor(id)] || []), ...loaded] }));
  const removeImg = (id, imgId) => setImgs((p) => ({ ...p, [imgKeyFor(id)]: (p[imgKeyFor(id)] || []).filter((x) => x.id !== imgId) }));
  const clearImgs = (id) => setImgs((p) => ({ ...p, [imgKeyFor(id)]: [] }));
  const totalImgs = Object.values(imgs).reduce((a, arr) => a + (arr?.length || 0), 0);

  // Estado de cumplimiento por sección: 'cumple' | 'no' | 'incompleto'
  const sectionStates = useMemo(() => {
    const out = {};
    for (const s of SECCIONES) {
      const states = POLICY_FIELDS.map((f) => fieldState(f, text[`${f.suf}_${s.id}`]));
      if (states.some((x) => x === 'empty')) out[s.id] = 'incompleto';
      else out[s.id] = states.every((x) => x === 'ok') ? 'cumple' : 'no';
    }
    return out;
  }, [text]);

  // Booleano por sección (incompleto ⇒ false) y resultados cumple_XXXX
  const sectionBool = useMemo(() => {
    const c = {};
    for (const s of SECCIONES) c[s.id] = sectionStates[s.id] === 'cumple';
    return c;
  }, [sectionStates]);

  const resultados = useMemo(() => {
    const r = {};
    for (const row of RESULT_ROWS) r[row.key] = row.fn(sectionBool);
    return r;
  }, [sectionBool]);

  // Payload reactivo (textos + cumple_XXXX como texto + imágenes)
  const payload = useMemo(() => {
    const p = { ...text };
    for (const row of RESULT_ROWS) p[row.key] = resultados[row.key] ? TXT_SI : TXT_NO;
    for (const [key, arr] of Object.entries(imgs)) p[key] = (arr || []).map((im) => ({ img: im.b64 }));
    return p;
  }, [text, resultados, imgs]);

  async function handleGenerar() {
    setLoading(true); setError(null); setOk(false);
    try {
      const res = await fetch('/api/generar-informe-politica', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'Informe_Politica_Contrasenas.docx';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setOk(true);
    } catch (err) {
      setError(err.message || 'No se pudo generar el informe.');
    } finally {
      setLoading(false);
    }
  }

  function dz(id) { const add = (loaded) => addImgs(id, loaded); add.dzId = id; return add; }

  if (user?.role === 'certificador') return <div className="panel"><AccesoRestringido /></div>;

  return (
    <div className="panel">
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">política de contraseñas / <span>informe de certificación</span></div>
          <h2 className="page-title">
            Informe de Política de Contraseñas
            <span style={{ marginLeft: 10, fontSize: 11, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)', verticalAlign: 'middle', fontWeight: 700 }}>
              {totalImgs} imagen{totalImgs === 1 ? '' : 'es'}
            </span>
          </h2>
        </div>
        <div className="topbar-right" style={{ gap: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {error && <span style={{ fontSize: 12, color: 'var(--inc-text)', marginRight: 8, maxWidth: 320 }}>{error}</span>}
          <button className="btn-generate" onClick={handleGenerar} disabled={loading}>
            {loading ? <><span className="spinner" /> Generando…</> : ok ? '✓ Descargado' : 'Generar .docx'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Formulario (scroll) */}
        <div style={{ flex: '0 0 50%', overflow: 'auto', padding: '24px 28px', borderRight: '2px solid var(--border)', minHeight: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 4 }}>
            Valores por plataforma (solo números). El cumplimiento y el cuadro de
            resultados se calculan solos y se reflejan en la vista previa.
          </div>

          {SECCIONES.map((s) => (
            <div key={s.id}>
              <SectionTitle right={<CumpleBadge state={sectionStates[s.id]} />}>{s.label}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                {POLICY_FIELDS.map((f) => {
                  const key = `${f.suf}_${s.id}`;
                  return <PolicyField key={key} field={f} value={text[key]} onChange={(v) => setField(key, v)} />;
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text4)' }}>
                Evidencia ({getImgs(s.id).length})
              </div>
              <ImageDropzone imgs={getImgs(s.id)} onAdd={dz(s.id)} onRemove={(i) => removeImg(s.id, i)} onClear={() => clearImgs(s.id)} />
            </div>
          ))}

          {/* Cuadro de Resultados (auto, solo lectura) */}
          <SectionTitle>Cuadro de Resultados (automático)</SectionTitle>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {RESULT_ROWS.map((row, i) => {
              const val = resultados[row.key];
              return (
                <div key={row.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: i % 2 ? 'var(--bg3)' : 'var(--bg2)', fontSize: 12.5,
                }}>
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--text)' }}>{row.label}</span>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text4)' }}>{row.desc}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', borderRadius: 20, padding: '2px 10px',
                    color: val ? 'var(--ok-text)' : 'var(--inc-text)',
                    background: val ? 'var(--ok-bg)' : 'var(--inc-bg)',
                    border: `1px solid ${val ? 'var(--ok-border)' : 'var(--inc-border)'}`,
                  }}>
                    {val ? TXT_SI : TXT_NO}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text4)', lineHeight: 1.5 }}>
            Las apps que autentican con AD heredan su cumplimiento (AND). Un campo vacío deja la sección como «No cumple».
          </div>

          {/* Globales */}
          <SectionTitle>Acciones, conclusiones y seguimiento</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
            {GLOBALES.map((g) => (
              <label key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{g.label}</span>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
                  value={text[g.key] ?? ''} onChange={(e) => setField(g.key, e.target.value)}
                  placeholder="Cada salto de línea se respeta en el documento."
                />
              </label>
            ))}
          </div>
        </div>

        {/* Vista previa en vivo */}
        <div style={{ flex: '0 0 50%', overflow: 'hidden', background: 'var(--bg3)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <InformePreview payload={payload} visible={true} endpoint="/api/generar-informe-politica" debounceMs={800} />
        </div>

      </div>
    </div>
  );
}
