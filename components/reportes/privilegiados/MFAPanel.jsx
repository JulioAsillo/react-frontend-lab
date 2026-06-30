'use client';
/**
 * MFAPanel — Hallazgo "MFA Genéricas" de Privilegiados.
 *
 * Particularidades:
 * - Un solo escenario: "Validación" (la propia columna del backend trae
 * "Correcto" / "Incorrecto"). Una sola hoja (mfa_generics).
 * - Tiene columna "Tipo Cuenta" → al doble clic abre el modal de
 * clasificación usando UPN como usuario (matrícula la valida el backend).
 *
 * Respuesta backend (GET /privilegiados/mfa-generics):
 * { "data": { "mfa_generics": [ { ...UPN, Tipo Cuenta, Validación } ] } }
 * fetchReporte desempaqueta `data` → { mfa_generics: [...] } (1 hoja).
 */
import { makePrivilegiadosPanel } from './makePrivilegiadosPanel';

// Escenario único basado en la columna "Validación".
const CFG_MFA = {
  escenarios: [
    { key: 'Validación', badgeCol: 'Validación', hasValidacion: true, hasComentario: false },
  ],
};

const MFAPanel = makePrivilegiadosPanel({
  label:      'Hallazgos MFA',
  endpoint:   '/privilegiados/mfa-generics',
  persistKey: 'priv-mfa',
  breadcrumb: 'mfa',
  scenarioCfg: CFG_MFA,
  consolidadoRoute: '/admin/privilegiados/recopilacion/consolidados?tab=clasificacion',
  fieldMap: {
    // El usuario a editar es el UPN. La matrícula no viene en la tabla;
    // el endpoint de clasificación la valida en el put/post.
    usuarioCols:    ['UPN', 'upn'],
    matriculaCols:  [],
    tipoCuentaCols: ['Tipo Cuenta', 'tipo_cuenta'],
  },
});

export default MFAPanel;
