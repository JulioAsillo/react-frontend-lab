"use client";
import GenericPanel from "@/components/shared/GenericPanel";
import DataTableUsuarios, { exportAllUsuarios } from "@/components/shared/DataTableUsuarios";

// v18: backend unificado — devuelve { "AD": [...] }
DataTableUsuarios.useRawData = true;

const REPORTE = {
  label:     "Active Directory",
  needsDate: true,
  endpoint:  "/usuarios/hallazgos-ad",
};

export default function ADPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="ad"
      breadcrumb="active-directory"
      section="usuarios / hallazgos"
      TableComponent={DataTableUsuarios}
      onExportAll={exportAllUsuarios}
      tableProps={{ fieldMap: { usuarioCols: ['USUARIO', 'usuario', 'samAccountName'], matriculaCols: ['MATRICULA', 'Matricula', 'matricula'], tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'] } }}
    />
  );
}
