'use client';

/**
 * BDDashboardPriv — configuración del módulo Privilegiados para el
 * BDDashboard compartido (components/admin/shared/BDDashboard).
 */

import BDDashboard from '@/components/admin/shared/BDDashboard';
import { PRIV_BD_SOURCES } from '@/lib/mock/privBDSources';

const CONFIG = {
  sources:            PRIV_BD_SOURCES,
  savedKey:           'itsecops-priv-bd-saved',
  dataKeyPrefix:      'priv-data',
  routeBase:          '/admin/privilegiados/recopilacion/base-datos',
  breadcrumbPrefix:   'privilegiados › recopilación › ',
  title:              'Recopilación — Base de Datos Privilegiados',
  loadAllLabel:       'Cargar Todas',
  multiFileUploadId:  'gdh',
  showColsInOkMeta:   false,
  iconFontSize:       22,
  okDotTitle:         'Disponible',
  idleDotTitle:       'Pendiente de carga',
  showIdleDotOnError: true,
};

export default function BDDashboardPriv() {
  return <BDDashboard config={CONFIG} />;
}
