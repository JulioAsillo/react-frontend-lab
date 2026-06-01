/**
 * fieldLabels.js — v24.2
 *
 * Mapeo de nombres de campo del backend → etiquetas en español
 * para mostrar en tablas de recopilación y consolidados.
 *
 * Uso:
 *   import { getLabel } from "@/lib/utils/fieldLabels";
 *   getLabel("isActive")      // → "Activo"
 *   getLabel("grantee_role")  // → "Rol Otorgado"
 */

const LABELS = {
  // ── Comunes ──────────────────────────────────────────────────────────────
  usuario:          "Usuario",
  Usuario:          "Usuario",
  user:             "Usuario",
  full_name:        "Nombre Completo",
  nombre:           "Nombre",
  apellido_paterno: "Apellido Paterno",
  apellido_materno: "Apellido Materno",
  matricula:        "Matrícula",
  Matricula:        "Matrícula",
  correo:           "Correo",
  mail:             "Correo",
  email:            "Correo",
  dni:              "DNI",
  isActive:         "Activo",
  isActivo:         "Activo",
  account_enabled:  "Cuenta Activa",
  estado_ad:        "Estado AD",
  estado_accesos:   "Estado Accesos",
  fuente:           "Fuente",
  tipo_cuenta:      "Tipo de Cuenta",

  // ── Fechas ────────────────────────────────────────────────────────────────
  fecha_alta:        "Fecha de Alta",
  fecha_cese:        "Fecha de Cese",
  fecha_creacion:    "Fecha de Creación",
  fecha_ult_login:   "Último Login",
  fecha_cambio:      "Último Cambio",
  ultimo_login:      "Último Login",
  last_login:        "Último Login",
  created_date_time: "Fecha de Creación",

  // ── GDH ───────────────────────────────────────────────────────────────────
  esProveedor:    "Es Proveedor",
  cod_funcion:    "Código Función",
  funcion:        "Función",
  cod_uni_orga:   "Cód. Unidad Organizativa",
  u_organizativa: "Unidad Organizativa",

  // ── Entra ID / AD ─────────────────────────────────────────────────────────
  upn:              "UPN",
  UPN:              "UPN",
  city:             "Ciudad",
  display_name:     "Nombre para Mostrar",
  displayName:      "Nombre para Mostrar",
  creaction_type:   "Tipo de Creación",
  rol:              "Rol",
  samAccountName:   "Cuenta SAM",

  // ── Apps Privilegiados ────────────────────────────────────────────────────
  group:       "Grupo",
  group_ad:    "Grupo AD",
  grp_accesos: "Grupo de Accesos",
  app_name:    "Aplicación",

  // ── Local Admin / Domain Admin ────────────────────────────────────────────
  object_type: "Tipo de Objeto",

  // ── Servidores Linux ──────────────────────────────────────────────────────
  server_name:  "Servidor",
  tipo:         "Tipo",
  aplicaciones: "Aplicaciones",
  registros:    "Registros",
  users:        "Usuario",
  groups:       "Grupos",

  // ── DBA ───────────────────────────────────────────────────────────────────
  name_db:      "Base de Datos",
  grantee:      "Cuenta",
  grantee_role: "Rol Otorgado",
  loginname:    "Login Name",
  serverRole:   "Rol de Servidor",

  // ── DB Roles (Perfiles) ───────────────────────────────────────────────────
  db_name:     "Base de Datos",
  db_role:     "Rol de BD",
  descripcion: "Descripción",

  // ── DB Sustentos (Perfiles) ───────────────────────────────────────────────
  db:       "Base de Datos",
  sustento: "Sustento",

  // ── Consolidados Privilegiados ────────────────────────────────────────────
  servidor:    "Servidor",
  aplicacion:  "Aplicación",
  cuenta:      "Cuenta",
  comentario:  "Comentario",
  comentarios: "Comentarios",

  // ── Clasificación ─────────────────────────────────────────────────────────
  tipo_de_cuenta: "Tipo de Cuenta",
  // ── Matriz de Rol (compartida con Perfiles) ──────────────────────────────
  rol_vigente:          "Rol Vigente",
  tipo_rol:             "Tipo de Rol",
  nombre_rol:           "Nombre del Rol",
  responsable:          "Responsable",
  cod_fun:              "Cód. Función",
  nombre_fun:           "Función",
  cod_unid_orga:        "Cód. Unidad Org.",
  nombre_unid_org:      "Unidad Organizativa",
  nombre_modulo:        "Módulo",
  nombre_aplicativo:    "Aplicativo",
  grupo:                "Grupo",
  permisos_adicionales: "Permisos Adicionales",
  idm:                  "IDM",
  regla_ngocio:         "Regla de Negocio",
  nombre_responsable:   "Nombre Responsable",
  rol_historico:        "Rol Histórico",
  tipo_elemento:        "Tipo de Elemento",
};

/**
 * Devuelve la etiqueta en español para un campo dado.
 * Si no existe mapeo, aplica un formateo automático:
 * snake_case → "Snake Case" con palabras capitalizadas.
 */
export function getLabel(field) {
  if (LABELS[field]) return LABELS[field];
  // Autoformat: snake_case o camelCase → palabras
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")          // camelCase → "camel Case"
    .replace(/_/g, " ")                             // snake_case → "snake case"
    .replace(/\b\w/g, c => c.toUpperCase())         // capitalizar
    .trim();
}
