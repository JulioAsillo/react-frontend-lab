'use client';
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePerfiles, { exportAllPerfiles } from '@/components/shared/DataTablePerfiles';
import { makeHandleExport } from '@/lib/utils/reportExport';

const REPORTE = {
  label:    'Hallazgos de Apps',
  endpoint: '/perfiles/hallazgos-apps',
  needsDate: false,
};

const handleExport = makeHandleExport(exportAllPerfiles);

export default function AppsPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="prf-apps"
      breadcrumb="apps"
      section="perfiles / hallazgos"
      TableComponent={DataTablePerfiles}
      onExportAll={handleExport}
      tableProps={{ fieldMap: {
        usuarioCols:    ['Usuario', 'usuario', 'USUARIO'],
        matriculaCols:  [], // no hay columna fuente; se ingresa manualmente
        tipoCuentaCols: ['Tipo Cuenta', 'TIPO CUENTA', 'tipo_cuenta', 'Tipo de cuenta'],
      } }}
    />
  );
}
