'use client';
import { CFG_B, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const AppsCriticasPrivPanel = makePrivilegiadosPanel({
  label:      'Hallazgos Apps Críticas',
  endpoint:   '/privilegiados/app_criticas',
  persistKey: 'priv-apps',
  breadcrumb: 'apps críticas',
  scenarioCfg: CFG_B,
  fieldMap: {
    // Apps mezcla hojas: SDP/Exactus usan COD_USUARIO; NPAC/SIT usan SamAccountName.
    usuarioCols:    ['SamAccountName', 'COD_USUARIO', 'USUARIO', 'usuario', 'Usuario'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});

export default AppsCriticasPrivPanel;
