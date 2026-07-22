"use client";
import { makeUsuariosPanel } from "@/components/reportes/usuarios/makeUsuariosPanel";

// v18: backend unificado — devuelve { "AD": [...] }
export default makeUsuariosPanel({
  label:      "Active Directory",
  endpoint:   "/usuarios/hallazgos-ad",
  needsDate:  true,
  persistKey: "ad",
  breadcrumb: "active-directory",
  fieldMap: {
    usuarioCols:    ['USUARIO', 'usuario', 'samAccountName'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'],
  },
});
