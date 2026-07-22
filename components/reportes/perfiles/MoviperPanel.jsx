'use client';
import { makePerfilesPanel } from '@/components/reportes/perfiles/makePerfilesPanel';

export default makePerfilesPanel({
  label:      'Hallazgos Moviper',
  endpoint:   '/perfiles/hallazgos-moviper',
  needsDate:  false,
  persistKey: 'prf-moviper',
  breadcrumb: 'moviper',
});
