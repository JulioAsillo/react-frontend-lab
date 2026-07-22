"use client";
import { makeUsuariosPanel } from "@/components/reportes/usuarios/makeUsuariosPanel";

// v18: backend devuelve { "App EXACTUS": [...], "App SDP": [...], "App SIT": [...], "App NPAC": [...] }
export default makeUsuariosPanel({
  label:      "Aplicaciones Críticas",
  endpoint:   "/usuarios/hallazgos-aplicaciones-criticas",
  needsDate:  true,
  persistKey: "apps",
  breadcrumb: "aplicaciones-criticas",
  fieldMap: {
    usuarioCols:    ['USUARIO', 'usuario'],
    matriculaCols:  ['MATRICULA', 'Matricula', 'matricula'],
    tipoCuentaCols: ['TIPO DE CUENTA', 'Tipo de Cuenta', 'tipo_cuenta'],
  },
});
