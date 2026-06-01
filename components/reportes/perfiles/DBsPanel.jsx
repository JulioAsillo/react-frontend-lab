'use client';
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePerfiles, { exportAllPerfiles } from '@/components/shared/DataTablePerfiles';
import { makeHandleExport } from '@/lib/utils/reportExport';

const REPORTE = {
  label:    'Hallazgos de DBs',
  endpoint: '/perfiles/hallazgos-dbs',
  needsDate: false,
};

const handleExport = makeHandleExport(exportAllPerfiles);

export default function DBsPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="prf-dbs"
      breadcrumb="dbs"
      section="perfiles / hallazgos"
      TableComponent={DataTablePerfiles}
      onExportAll={handleExport}
      tableProps={{ fieldMap: {
        usuarioCols:    ['GRANTEE', 'grantee', 'usuario'],
        matriculaCols:  ['Matricula', 'matricula', 'MATRICULA'],
        tipoCuentaCols: ['Tipo de Cuenta', 'TIPO CUENTA', 'tipo_cuenta'],
      } }}
    />
  );
}
