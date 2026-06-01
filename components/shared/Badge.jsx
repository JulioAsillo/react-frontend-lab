export default function Badge({ value }) {
  if (!value || value === "—") return <span style={{ color: "var(--text4)", fontSize: 12 }}>—</span>;

  const compareVal = String(value).toLowerCase();

  if (compareVal === "incorrecto") return <span className="badge badge-inc">{value}</span>;
  if (compareVal === "correcto")   return <span className="badge badge-ok">{value}</span>;
  if (compareVal === "activo")     return <span className="badge badge-activo">{value}</span>;
  if (compareVal === "bloqueado")  return <span className="badge badge-bloq">{value}</span>;
  if (compareVal === "sustentado") return <span className="badge badge-sust">{value}</span>;

  // Valor por defecto (no matcheó nada conocido) → badge anaranjado (sustentado fallback)
  return <span className="badge badge-sust">{value}</span>;
}
