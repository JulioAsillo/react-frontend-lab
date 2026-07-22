'use client';

/**
 * BDDashboardUsuarios — configuración del módulo Usuarios para el
 * BDDashboard compartido (components/admin/shared/BDDashboard).
 */

import BDDashboard from '@/components/admin/shared/BDDashboard';
import { BD_SOURCES } from '@/lib/mock/bdSources';

const CONFIG = {
  sources:            BD_SOURCES,
  savedKey:           'itsecops-bd-saved',
  dataKeyPrefix:      'bd-data',
  routeBase:          '/admin/usuarios/recopilacion/base-datos',
  breadcrumbPrefix:   'recopilación › ',
  title:              'Recopilación de Base de Datos',
  loadAllLabel:       'Cargar a Todos',
  multiFileUploadId:  'gdh',
  showColsInOkMeta:   true,
  okDotTitle:         'Cargada',
  idleDotTitle:       'Pendiente',
  showIdleDotOnError: false,
};

export default function BDDashboardUsuarios() {
  return <BDDashboard config={CONFIG} />;
}
