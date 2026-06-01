'use client';
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePerfiles, { exportAllPerfiles } from '@/components/shared/DataTablePerfiles';
import { makeHandleExport } from '@/lib/utils/reportExport';

// v24.6: renombrado de "Hallazgos de Roles" → "Hallazgos GDH"
// El endpoint sigue siendo /perfiles/hallazgos-roles (sin cambios en backend)
// Escenarios en el JSON: "Existe en MR" y "Rol Incorrecto"

const REPORTE = {
  label:    'Hallazgos Activos GDH',
  endpoint: '/perfiles/hallazgos-roles',
  needsDate: false,
};

const handleExport = makeHandleExport(exportAllPerfiles);

export default function RolesPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="prf-roles"
      breadcrumb="gdh"
      section="perfiles / hallazgos"
      TableComponent={DataTablePerfiles}
      onExportAll={handleExport}
    />
  );
}
