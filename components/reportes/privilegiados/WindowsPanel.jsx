'use client';
import { CFG_A, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const WindowsPanel = makePrivilegiadosPanel({
  label:      'Hallazgos Windows',
  endpoint:   '/privilegiados/hallazgos-servidores-windows',
  persistKey: 'priv-windows',
  breadcrumb: 'windows',
  scenarioCfg: CFG_A,
  consolidadoRoute: '/admin/privilegiados/recopilacion/consolidados?tab=windows',
  fieldMap: {
    // Backend Windows: la columna de usuario es "Usuarios" (vista) / "USUARIOS".
    usuarioCols:    ['Usuarios', 'USUARIOS', 'USUARIO', 'usuario', 'Users', 'users'],
    matriculaCols:  ['Matricula', 'matricula', 'MATRICULA'],
    tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});

export default WindowsPanel;
