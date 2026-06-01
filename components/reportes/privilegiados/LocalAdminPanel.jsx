'use client';
import { CFG_C, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const LocalAdminPanel = makePrivilegiadosPanel({
  label:      'Hallazgos Local Admin',
  endpoint:   '/privilegiados/local-admin',
  persistKey: 'priv-local-admin',
  breadcrumb: 'local admin',
  scenarioCfg: CFG_C,
  consolidadoRoute: '/admin/privilegiados/recopilacion/consolidados?tab=clasificacion',
  fieldMap: {
    // Domain/Local Admin: usuario real = SamAccountName / "Usuario de Red".
    usuarioCols:    ['SamAccountName', 'Usuario de Red', 'USUARIO', 'usuario', 'Usuario'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});

export default LocalAdminPanel;
