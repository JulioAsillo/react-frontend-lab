'use client';
import { CFG_C, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const DomainAdminPanel = makePrivilegiadosPanel({
  label:      'Hallazgos Domain Admin',
  endpoint:   '/privilegiados/domain-admin',
  persistKey: 'priv-domain-admin',
  breadcrumb: 'domain admin',
  scenarioCfg: CFG_C,
  consolidadoRoute: '/admin/privilegiados/recopilacion/consolidados?tab=clasificacion',
  fieldMap: {
    // Domain/Local Admin: usuario real = SamAccountName / "Usuario de Red".
    usuarioCols:    ['SamAccountName', 'Usuario de Red', 'USUARIO', 'usuario', 'Usuario'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});

export default DomainAdminPanel;
