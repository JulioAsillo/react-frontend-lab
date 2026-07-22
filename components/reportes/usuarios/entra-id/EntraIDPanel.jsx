"use client";
import { makeUsuariosPanel } from "@/components/reportes/usuarios/makeUsuariosPanel";

export default makeUsuariosPanel({
  label:      "Entra ID",
  endpoint:   "/usuarios/hallazgos-entra-id",
  needsDate:  true,
  persistKey: "entra",
  breadcrumb: "entra-id",
  fieldMap: {
    usuarioCols:    ['UPN', 'upn', 'userPrincipalName', 'usuario'],
    matriculaCols:  ['SAM', 'sam', 'CITY', 'city', 'samAccountName', 'matricula'],
    tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'],
  },
});
