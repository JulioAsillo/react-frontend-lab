'use client';
/**
 * makePerfilesPanel.jsx — Fábrica de paneles de hallazgos de Perfiles.
 *
 * Mismo patrón que makePrivilegiadosPanel: los paneles eran ~90% idénticos
 * (mismo GenericPanel + DataTablePerfiles + makeHandleExport); solo cambian
 * label/endpoint/persistKey/breadcrumb/fieldMap. Cada panel queda como un
 * objeto de configuración explícito.
 */
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePerfiles, { exportAllPerfiles } from '@/components/shared/DataTablePerfiles';
import { makeHandleExport } from '@/lib/utils/reportExport';

export function makePerfilesPanel(cfg) {
  const reporte = { label: cfg.label, endpoint: cfg.endpoint, needsDate: cfg.needsDate ?? false };
  const handleExport = makeHandleExport(exportAllPerfiles);

  return function PerfilesPanel() {
    return (
      <GenericPanel
        reporte={reporte}
        persistKey={cfg.persistKey}
        breadcrumb={cfg.breadcrumb}
        section="perfiles / hallazgos"
        TableComponent={DataTablePerfiles}
        onExportAll={handleExport}
        tableProps={cfg.fieldMap ? { fieldMap: cfg.fieldMap } : undefined}
      />
    );
  };
}
