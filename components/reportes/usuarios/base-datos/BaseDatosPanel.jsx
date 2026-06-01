"use client";
import GenericPanel from "@/components/shared/GenericPanel";
import DataTableUsuarios, { exportAllUsuarios } from "@/components/shared/DataTableUsuarios";

// v18: backend devuelve { "DB_SDP": [...], "DB_EXACTUS": [...], "DB_SIT": [...] }
DataTableUsuarios.useRawData = true;

const REPORTE = {
  label:     "Base de Datos",
  needsDate: true,
  endpoint:  "/usuarios/hallazgos-base-datos",
};

export default function BaseDatosPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="bd"
      breadcrumb="base-de-datos"
      section="usuarios / hallazgos"
      TableComponent={DataTableUsuarios}
      onExportAll={exportAllUsuarios}
      tableProps={{ fieldMap: { usuarioCols: ['USUARIO', 'usuario'], matriculaCols: ['MATRICULA', 'Matricula', 'matricula'], tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'] } }}
    />
  );
}
