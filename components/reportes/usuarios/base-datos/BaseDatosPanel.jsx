"use client";
import { makeUsuariosPanel } from "@/components/reportes/usuarios/makeUsuariosPanel";

// v18: backend devuelve { "DB_SDP": [...], "DB_EXACTUS": [...], "DB_SIT": [...] }
export default makeUsuariosPanel({
  label:      "Base de Datos",
  endpoint:   "/usuarios/hallazgos-base-datos",
  needsDate:  true,
  persistKey: "bd",
  breadcrumb: "base-de-datos",
  fieldMap: {
    usuarioCols:    ['USUARIO', 'usuario'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'],
  },
});
