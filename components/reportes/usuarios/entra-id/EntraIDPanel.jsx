"use client";
import { useMemo } from "react";
import GenericPanel from "@/components/shared/GenericPanel";
import DataTableUsuarios, { exportAllUsuarios } from "@/components/shared/DataTableUsuarios";
import { useFechaCorte } from "@/lib/store/reportesStore";

DataTableUsuarios.useRawData = true;

/*function useFechaCorteConFallback(persistKey) {
  const fechaBackend = useFechaCorte(persistKey);
  const fallbackMock = useMemo(() => {
    const hoy   = new Date();
    const corte = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return corte.toISOString().slice(0, 10);
  }, []);
  return fechaBackend ?? fallbackMock;
}*/

const REPORTE = {
  label:     "Entra ID",
  needsDate: true,
  endpoint:  "/usuarios/hallazgos-entra-id",
};

export default function EntraIDPanel() {
  return (
    <GenericPanel
      reporte={REPORTE}
      persistKey="entra"
      breadcrumb="entra-id"
      section="usuarios / hallazgos"
      TableComponent={DataTableUsuarios}
      onExportAll={exportAllUsuarios}
      tableProps={{ fieldMap: { usuarioCols: ['UPN', 'upn', 'userPrincipalName', 'usuario'], matriculaCols: ['SAM', 'sam', 'CITY', 'city', 'samAccountName', 'matricula'], tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'] } }}
      //useFechaCorteOverride={useFechaCorteConFallback}
    />
  );
}
