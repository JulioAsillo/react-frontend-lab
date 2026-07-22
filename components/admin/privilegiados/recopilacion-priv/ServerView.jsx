"use client";

/**
 * ServerView — Vista plana de servidores Linux/Windows (Privilegiados).
 * Extraída de FuenteDetallePriv.jsx sin cambios de comportamiento.
 *
 * Expande cada registro dentro de cada servidor como una fila independiente.
 *   Linux:   servidor | aplicaciones | usuario | descripción | home | grupos | último login
 *   Windows: servidor | aplicaciones | usuario/grupo
 */

import { useState } from "react";
import { ThCell } from "@/components/shared/DataTableHeader";
import { getLabel } from "@/lib/utils/fieldLabels";

// Expande cada registro dentro de cada servidor como una fila independiente.
// Linux:   servidor | tipo | aplicaciones | usuario | descripción | home | grupos | último login
// Windows: servidor | tipo | aplicaciones | usuario/grupo
export default function ServerView({ rows, tipo }) {
  const [search,     setSearch]     = useState("");
  const [colFilters, setColFilters] = useState({});
  const [openPanel,  setOpenPanel]  = useState(null);
  const [sortCol,    setSortCol]    = useState(null);
  const [sortDir,    setSortDir]    = useState("asc");
  const [page,       setPage]       = useState(1);
  const PAGE_SZ = 100;

  const isLinux = tipo === "server-linux";
  const servers = Array.isArray(rows) ? rows : [];

  // Aplanar: un registro (string de user) por fila.
  // Backend devuelve srv.users como array de strings planos (no objetos en srv.registros).
  const flatRows = servers.flatMap(srv => {
    const apps = (srv.aplicaciones ?? []).join(", ");
    const users = Array.isArray(srv.users) ? srv.users : [];
    return users.map(u => {
      const raw = String(u ?? "");
      if (isLinux) {
        // Formato: usuario:descripción:home
        const parts = raw.split(":");
        return {
          servidor:     srv.server_name ?? "",
          tipo:         srv.tipo ?? "linux",
          aplicaciones: apps,
          usuario:      parts[0] ?? "",
          descripcion:  parts[1] ?? "",
          home:         parts[2] ?? "",
          grupos:       "",
          ultimo_login: "",
        };
      }
      // Windows: el string es directamente el usuario/grupo (ej. "ADPRIMA\\Domain Admins")
      return {
        servidor:     srv.server_name ?? "",
        tipo:         srv.tipo ?? "windows",
        aplicaciones: apps,
        usuario:      raw,
      };
    });
  });

  const cols = isLinux
    ? ["servidor","aplicaciones","usuario","descripcion","home","grupos","ultimo_login"]
    : ["servidor","aplicaciones","usuario"];

  function getColFilterSet(col) { return colFilters[col] || new Set(); }
  function setColFilterSet(col, set) { setColFilters(prev => ({ ...prev, [col]: set })); setPage(1); }
  function handleSort(col, dir) { setSortCol(col); setSortDir(dir); setPage(1); }

  const filtered = flatRows.filter(row => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!cols.some(c => String(row[c] ?? "").toLowerCase().includes(q))) return false;
    }
    for (const [col, active] of Object.entries(colFilters)) {
      if (active.size > 0 && !active.has(String(row[col] ?? "—"))) return false;
    }
    return true;
  });

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const cmp = String(a[sortCol] ?? "").localeCompare(String(b[sortCol] ?? ""), "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SZ));
  const pageRows   = sorted.slice((page - 1) * PAGE_SZ, page * PAGE_SZ);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Buscar servidor, usuario…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }} />
          {search && (
            <button className="btn-export-small" onClick={() => { setSearch(""); setPage(1); }}>✕ Limpiar</button>
          )}
          {Object.values(colFilters).some(s => s.size > 0) && (
            <button className="btn-export-small" style={{ color: "var(--accent)" }}
              onClick={() => { setColFilters({}); setPage(1); }}>✕ Quitar filtros</button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="row-count">
            <span className="row-count-num">{sorted.length}</span> de {flatRows.length} registros
            {totalPages > 1 && ` · pág. ${page}/${totalPages}`}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="scroll-x">
        <table className="data-table" style={{ minWidth: "max-content", width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              {cols.map(col => (
                <ThCell key={col} col={col} label={getLabel(col)} isSpecial={false}
                  hasFilter={colFilters[col]?.size > 0}
                  width={
                    col === "servidor"    ? "180px"
                    : col === "grupos"   ? "340px"
                    : col === "descripcion" ? "220px"
                    : col === "ultimo_login" ? "180px"
                    : col === "aplicaciones" ? "140px"
                    : col === "home"     ? "180px"
                    : "160px"
                  }
                  openPanel={openPanel} setOpenPanel={setOpenPanel}
                  sortCol={sortCol} sortDir={sortDir} rows={flatRows}
                  getColFilterSet={getColFilterSet} setColFilterSet={setColFilterSet}
                  handleSort={handleSort} onResizeStart={e => e.preventDefault()} />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg2)" : "var(--bg)" }}>
                {cols.map(col => (
                  <td key={col} style={{
                    padding: "7px 10px", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                    borderBottom: "1px solid var(--border)",
                    fontFamily: col === "servidor" || col === "usuario" ? "var(--mono)" : "var(--sans)",
                    fontSize: 12.5,
                    color: col === "servidor" ? "var(--accent)" : "var(--text2)",
                    fontWeight: col === "servidor" ? 600 : 400,
                  }}>
                    <span title={String(row[col] ?? "")}>
                      {String(row[col] ?? "") || "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                Sin resultados
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-left">
            <span className="page-info">Página {page} de {totalPages}</span>
          </div>
          <div className="pagination-right">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-size-btn ${p === page ? "ps-active" : ""}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
