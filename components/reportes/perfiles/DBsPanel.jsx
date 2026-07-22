'use client';
import { makePerfilesPanel } from '@/components/reportes/perfiles/makePerfilesPanel';

export default makePerfilesPanel({
  label:      'Hallazgos de DBs',
  endpoint:   '/perfiles/hallazgos-dbs',
  needsDate:  false,
  persistKey: 'prf-dbs',
  breadcrumb: 'dbs',
  fieldMap: {
    usuarioCols:    ['GRANTEE', 'grantee', 'usuario'],
    matriculaCols:  ['Matricula', 'matricula', 'MATRICULA'],
    tipoCuentaCols: ['Tipo de Cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
  },
});
