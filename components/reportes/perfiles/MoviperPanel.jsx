'use client';
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePerfiles, { exportAllPerfiles } from '@/components/shared/DataTablePerfiles';
import { makeHandleExport } from '@/lib/utils/reportExport';

const REPORTE = {
  label:    'Hallazgos Moviper',
  endpoint: '/perfiles/hallazgos-moviper',
  needsDate: false,
};

const handleExport = makeHandleExport(exportAllPerfiles);

export default function MoviperPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="prf-moviper"
      breadcrumb="moviper"
      section="perfiles / hallazgos"
      TableComponent={DataTablePerfiles}
      onExportAll={handleExport}
    />
  );
}
