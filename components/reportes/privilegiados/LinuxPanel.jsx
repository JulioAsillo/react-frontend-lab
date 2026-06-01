'use client';
import { CFG_A, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const LinuxPanel = makePrivilegiadosPanel({
  label:      'Hallazgos Linux',
  endpoint:   '/privilegiados/hallazgos-servidores-linux',
  persistKey: 'priv-linux',
  breadcrumb: 'linux',
  scenarioCfg: CFG_A,
  fieldMap: {
    usuarioCols:    ['USERS', 'users', 'Usuarios', 'USUARIO', 'usuario'],
    matriculaCols:  ['Matricula', 'matricula', 'MATRICULA'],
    tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});

export default LinuxPanel;
