'use client';
import { makePerfilesPanel } from '@/components/reportes/perfiles/makePerfilesPanel';

// v24.6: renombrado de "Hallazgos de Roles" → "Hallazgos GDH"
// El endpoint sigue siendo /perfiles/hallazgos-roles (sin cambios en backend)
// Escenarios en el JSON: "Existe en MR" y "Rol Incorrecto"
export default makePerfilesPanel({
  label:      'Hallazgos Activos GDH',
  endpoint:   '/perfiles/hallazgos-roles',
  needsDate:  false,
  persistKey: 'prf-roles',
  breadcrumb: 'gdh',
});
