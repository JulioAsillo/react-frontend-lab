/**
 * hallazgo-mfa.ts — Certificación de Privilegiados / MFA (cuentas genéricas Entra)
 * persistKey: "priv-mfa"  |  fuente: hallazgos_mfa.py (generar_hallazgos_mfa)
 */
import type { ColumnDef } from "./types";

const mfaGenerics: ColumnDef[] = [
  { key: "Grupo",         header: "Grupo",            group: "C1" },
  { key: "UPN",           header: "UPN",              group: "C1" },
  { key: "Mail",          header: "Mail",             group: "C1" },
  { key: "Display Name",  header: "Nombre Mostrado",  group: "C1" },
  { key: "Estado Cuenta", header: "Estado de Cuenta", group: "C1" },
  { key: "City",          header: "City",             group: "C1" },
  { key: "Tipo Cuenta",   header: "Tipo de Cuenta",   group: "C1" },
  { key: "Validación",    header: "Validación",       group: "VALIDACION" },
];

// Nombre de hoja = key exacta del dict que devuelve generar_hallazgos_mfa().
export const hallazgoMfa: Record<string, ColumnDef[]> = {
  mfa_generics: mfaGenerics,
};
