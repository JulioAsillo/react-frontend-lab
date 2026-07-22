'use client';

/**
 * BDDashboardPerfiles — configuración del módulo Perfiles para el
 * BDDashboard compartido (components/admin/shared/BDDashboard).
 */

import BDDashboard from '@/components/admin/shared/BDDashboard';
import { PERFILES_BD_SOURCES } from '@/lib/mock/perfilesBDSources';

const CONFIG = {
  sources:            PERFILES_BD_SOURCES,
  savedKey:           'itsecops-prf-bd-saved',
  dataKeyPrefix:      'prf-bd-data',
  routeBase:          '/admin/perfiles/recopilacion/base-datos',
  breadcrumbPrefix:   'perfiles / recopilación / ',
  title:              'Recopilación de Base de Datos — Perfiles',
  loadAllLabel:       'Cargar a Todos',
  multiFileUploadId:  'prf-gdh',
  showColsInOkMeta:   true,
  okDotTitle:         'Cargada',
  idleDotTitle:       'Pendiente',
  showIdleDotOnError: false,
};

export default function BDDashboardPerfiles() {
  return <BDDashboard config={CONFIG} />;
}
