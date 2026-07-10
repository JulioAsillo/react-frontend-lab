/**
 * hallazgo-mfa.ts — Certificación de Privilegiados / MFA (cuentas genéricas Entra)
 * persistKey: "priv-mfa"  |  fuente: hallazgos_mfa.py (generar_hallazgos_mfa)
 */
import type { ColumnDef } from "./types";

const mfaGenerics: ColumnDef[] = [
  { key: "Grupo",         header: "Grupo",          group: "" },
  { key: "UPN",           header: "UPN",            group: "" },
  { key: "Mail",          header: "Mail",           group: "" },
  { key: "Display Name",  header: "Nombre Mostrado", group: "" },
  { key: "Estado Cuenta", header: "Estado de Cuenta", group: "" },
  { key: "City",          header: "City",           group: "" },
  { key: "Tipo Cuenta",   header: "Tipo de Cuenta", group: "" },
  { key: "Validación",    header: "Validación",     group: "" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_mfa().
export const hallazgoMfa: Record<string, ColumnDef[]> = {
  mfa_generics: mfaGenerics,
};
