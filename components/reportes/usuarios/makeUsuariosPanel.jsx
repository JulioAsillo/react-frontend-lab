"use client";
/**
 * makeUsuariosPanel.jsx — Fábrica de paneles de hallazgos de Usuarios.
 *
 * Mismo patrón que makePrivilegiadosPanel: los paneles eran ~90% idénticos
 * (mismo GenericPanel + DataTableUsuarios + exportAllUsuarios); solo cambian
 * label/endpoint/persistKey/breadcrumb/fieldMap. Cada panel queda como un
 * objeto de configuración explícito.
 *
 * NO aplica a CesadosPanel: usa DataTableCesados y HOJA_CFG propios.
 */
import GenericPanel from "@/components/shared/GenericPanel";
import DataTableUsuarios, { exportAllUsuarios } from "@/components/shared/DataTableUsuarios";

// GenericPanel pasa rawData (no rows) cuando el TableComponent lo declara.
DataTableUsuarios.useRawData = true;

export function makeUsuariosPanel(cfg) {
  const reporte = { label: cfg.label, endpoint: cfg.endpoint, needsDate: cfg.needsDate ?? true };

  return function UsuariosPanel() {
    return (
      <GenericPanel
        reporte={reporte}
        persistKey={cfg.persistKey}
        breadcrumb={cfg.breadcrumb}
        section="usuarios / hallazgos"
        TableComponent={DataTableUsuarios}
        onExportAll={exportAllUsuarios}
        tableProps={cfg.fieldMap ? { fieldMap: cfg.fieldMap } : undefined}
      />
    );
  };
}
