"use client";
import GenericPanel from "@/components/shared/GenericPanel";
import DataTableUsuarios, { exportAllUsuarios } from "@/components/shared/DataTableUsuarios";

// v18: backend devuelve { "App EXACTUS": [...], "App SDP": [...], "App SIT": [...], "App NPAC": [...] }
DataTableUsuarios.useRawData = true;

const REPORTE = {
  label:     "Aplicaciones Críticas",
  needsDate: true,
  endpoint:  "/usuarios/hallazgos-aplicaciones-criticas",
};

export default function AppsPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="apps"
      breadcrumb="aplicaciones-criticas"
      section="usuarios / hallazgos"
      TableComponent={DataTableUsuarios}
      onExportAll={exportAllUsuarios}
      tableProps={{ fieldMap: { usuarioCols: ['USUARIO', 'usuario'], matriculaCols: ['MATRICULA', 'Matricula', 'matricula'], tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'] } }}
    />
  );
}
