import { resolveValueBadgeClass } from "@/lib/constants/badgeValueMap";

/**
 * Badge — pintado de celdas.
 *
 * Dos modos:
 * 1. moduleKey === "usuarios" (patrón nuevo, value-based): la celda se pinta
 *    si su valor coincide con uno conocido (badgeValueMap.js). Si no
 *    coincide, se muestra como texto plano — ya NO cae en un color por
 *    defecto adivinado.
 * 2. Cualquier otro moduleKey (o sin moduleKey): comportamiento legacy sin
 *    cambios, usado hoy por Perfiles y Privilegiados vía BADGE_COLS.
 */
export default function Badge({ value, moduleKey }) {
  if (value === undefined || value === null || value === "" || value === "—") {
    return <span style={{ color: "var(--text4)", fontSize: 12 }}>—</span>;
  }

  if (moduleKey === "usuarios") {
    const cls = resolveValueBadgeClass(value);
    return cls
      ? <span className={`badge badge-${cls}`}>{value}</span>
      : <span className="cell-text">{value}</span>;
  }

  // ── Legacy (Perfiles / Privilegiados) — comportamiento sin cambios ───────
  const compareVal = String(value).toLowerCase();

  if (compareVal === "incorrecto") return <span className="badge badge-inc">{value}</span>;
  if (compareVal === "correcto")   return <span className="badge badge-ok">{value}</span>;
  if (compareVal === "activo")     return <span className="badge badge-activo">{value}</span>;
  if (compareVal === "bloqueado")  return <span className="badge badge-bloq">{value}</span>;
  if (compareVal === "sustentado") return <span className="badge badge-sust">{value}</span>;

  // Valor por defecto (no matcheó nada conocido) → badge anaranjado (sustentado fallback)
  return <span className="badge badge-sust">{value}</span>;
}
