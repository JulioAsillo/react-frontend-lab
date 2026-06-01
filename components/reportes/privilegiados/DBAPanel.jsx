'use client';
import { CFG_A, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const DBAPanel = makePrivilegiadosPanel({
  label:      'Hallazgos DBA',
  endpoint:   '/privilegiados/hallazgos-dba',
  persistKey: 'priv-dba',
  breadcrumb: 'dba',
  scenarioCfg: CFG_A,
  fieldMap: { usuarioCols: ['GRANTEE', 'grantee', 'Usuario'], matriculaCols: ['MATRICULA', 'Matricula', 'matricula'], tipoCuentaCols: ['Tipo de cuenta', 'TIPO CUENTA', 'tipo_cuenta'] },
});

export default DBAPanel;
