'use client';
import { makePerfilesPanel } from '@/components/reportes/perfiles/makePerfilesPanel';

export default makePerfilesPanel({
  label:      'Hallazgos de Apps',
  endpoint:   '/perfiles/hallazgos-apps',
  needsDate:  false,
  persistKey: 'prf-apps',
  breadcrumb: 'apps',
  fieldMap: {
    usuarioCols:    ['Usuario', 'usuario', 'USUARIO'],
    matriculaCols:  [], // no hay columna fuente; se ingresa manualmente
    tipoCuentaCols: ['Tipo Cuenta', 'TIPO CUENTA', 'tipo_cuenta', 'Tipo de cuenta'],
  },
});
