'use client';

import GenericPanel from '@/components/shared/GenericPanel';
import DataTableCesados, { exportAllCesados } from '@/components/shared/DataTableCesados';

const HOJA_CFG = {
  "Preliminares": {
    columnas: [
      "Matricula", "Nombre", "Unidad organizativa", "Fecha de Cese",
      "AD", "Ultimo Login AD", "PostCese AD",
      "Entra ID", "Entra ID Ultimo Login", "PostCese Entra ID",
      "Usr Exactus", "Usr Exactus Ultimo Login", "PostCese Exactus App",
      "DB Exactus", "DB Exactus Ultimo Login", "PostCese DB Exactus",
      "Usr SDP", "Usr SDP Ultimo Login", "PostCese SDP App",
      "DB SDP", "DB SDP Ultimo Login", "PostCese DB SDP",
      "DB SIT", "DB SIT Ultimo Login", "PostCese DB SIT",
      "Usr SIT", "Usr NPAC",
      "Validación Cesado Activo", "Validación Post Cese", "Validación Final",
    ],
  },
  "SinCity": {
    columnas: [
      "Nombre", "Mail", "UPN", "Estado", "Creado",
      "ultimo login", "City", "Observación",
    ],
  },
};

const REPORTE = {
  label:     'Hallazgos Preliminares',
  needsDate: true,
  endpoint:  '/usuarios/hallazgos-cesados',
};

function TableCesados({ rawData, persistKey }) {
  return (
    <DataTableCesados
      rawData={rawData}
      persistKey={persistKey}
      hojaCfg={HOJA_CFG}
    />
  );
}
TableCesados.useRawData = true;

function handleExport(rawData, persistKey, label) {
  return exportAllCesados(rawData, HOJA_CFG, label);
}

export default function CesadosPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="cesados"
      breadcrumb="hallazgos preliminares"
      section="usuarios / hallazgos"
      TableComponent={TableCesados}
      onExportAll={handleExport}
    />
  );
}
