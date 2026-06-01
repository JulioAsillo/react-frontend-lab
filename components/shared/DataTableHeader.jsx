"use client";

/**
 * DataTableHeader — piezas de header reutilizables entre DataTable y DataTablePlano.
 *
 * ColPanel: el panel flotante con sort + checkboxes de filtro por valor.
 * ThCell:   el <th> que abre el ColPanel y soporta resize de columna.
 *
 * Cambios v11:
 *   - useLayoutEffect (en lugar de useEffect) para posicionar el panel ANTES
 *     del paint. Elimina el flash arriba-izquierda.
 *   - Visibility hidden hasta que pos quede calculado (defensa adicional para
 *     navegadores que no respetan el orden esperado).
 *   - Iconos sutiles en headers: chevron unicode más limpio + icono de filtro
 *     activo cuando la columna tiene filtros aplicados.
 */

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";

// ── ColPanel — fixed position, NO cierra al seleccionar checkbox ───────────
export function ColPanel({ col, rows, activeVals, sortCol, sortDir, onSort, onChange, onClose, anchorRef }) {
  const [search, setSearch] = useState("");
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null); // null hasta calcular

  // Normaliza valores booleanos a "Activo"/"Inactivo" para mostrar en el filtro
  function normalizeVal(v) {
    if (v === true  || v === 1 || v === "1" || v === "True"  || v === "true"
        || v === "Si" || v === "si" || v === "Sí" || v === "sí"
        || v === "YES" || v === "yes" || v === "Y" || v === "y") return "Activo";
    if (v === false || v === 0 || v === "0" || v === "False" || v === "false"
        || v === "No" || v === "no"
        || v === "NO" || v === "N"  || v === "n") return "Inactivo";
    return String(v ?? "—");
  }

  const uniqueVals = useMemo(() => {
    const s = new Set(rows.map(r => normalizeVal(r[col])));
    return [...s].sort();
  }, [rows, col]);

  const visible = uniqueVals.filter(v => v.toLowerCase().includes(search.toLowerCase()));
  const allSelected = uniqueVals.length > 0 && uniqueVals.every(v => activeVals.has(v));

  // useLayoutEffect: posiciona ANTES del paint para evitar flash arriba-izquierda
  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    const PANEL_W = 272, PANEL_H = 400;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.left, top = rect.bottom + 3;
    if (left + PANEL_W > vw - 8) left = vw - PANEL_W - 8;
    if (left < 8) left = 8;
    if (top + PANEL_H > vh - 8) top = rect.top - PANEL_H - 3;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handle); };
  }, [onClose, anchorRef]);

  function toggle(val) {
    const next = new Set(activeVals);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(next);
  }
  function toggleAll() { onChange(allSelected ? new Set() : new Set(uniqueVals)); }

  return (
    <div className="col-panel" ref={panelRef}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        minWidth: 272,
        zIndex: 9999,
        // Hasta tener posición real, ocultamos. useLayoutEffect debería haberse
        // ejecutado antes del primer paint, pero esta es la defensa final.
        visibility: pos ? "visible" : "hidden",
      }}
      onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <div className="col-panel-section">
        <button className={`col-panel-sort ${sortCol === col && sortDir === "asc" ? "col-sort-active" : ""}`}
          onClick={() => { onSort("asc"); onClose(); }}>
          <span className="col-sort-icon">↑</span> Ordenar A → Z
        </button>
        <button className={`col-panel-sort ${sortCol === col && sortDir === "desc" ? "col-sort-active" : ""}`}
          onClick={() => { onSort("desc"); onClose(); }}>
          <span className="col-sort-icon">↓</span> Ordenar Z → A
        </button>
      </div>
      <div className="col-panel-divider" />
      <div className="col-panel-section">
        <div className="col-panel-search-wrap">
          <span className="col-panel-search-icon">⌕</span>
          <input className="col-panel-search" placeholder="Buscar valor…"
            value={search} onChange={e => setSearch(e.target.value)}
            autoFocus onClick={e => e.stopPropagation()} />
        </div>
        <label className="col-panel-item col-panel-all"
          onClick={e => { e.stopPropagation(); toggleAll(); }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll}
            onClick={e => e.stopPropagation()} />
          <span>(Seleccionar todo)</span>
        </label>
        <div className="col-panel-list">
          {visible.map(val => (
            <div
              key={val}
              className="col-panel-item"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={e => { e.stopPropagation(); toggle(val); }}
            >
              <input
                type="checkbox"
                checked={activeVals.has(val)}
                onChange={() => toggle(val)}
                onClick={e => e.stopPropagation()}
                style={{ pointerEvents: 'none' }}
              />
              <span>{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-panel-footer">
        <button className="col-panel-clear"
          onClick={e => { e.stopPropagation(); onChange(new Set()); }}>Limpiar filtro</button>
        <button className="col-panel-close"
          onClick={e => { e.stopPropagation(); onClose(); }}>Cerrar</button>
      </div>
    </div>
  );
}

// ── ThCell — header con sort + filtro + resize ─────────────────────────────
export function ThCell({ col, isSpecial, hasFilter, width, openPanel, setOpenPanel,
  sortCol, sortDir, rows, getColFilterSet, setColFilterSet, handleSort, onResizeStart,
  label }) {
  const thRef = useRef(null);
  return (
    <th ref={thRef}
      style={{ width: width ?? 120, position: "relative",
               cursor: isSpecial ? "default" : "pointer",
               overflow: "hidden" }}
      onClick={e => { e.stopPropagation(); if (!isSpecial) setOpenPanel(openPanel === col ? null : col); }}
    >
      {isSpecial ? (
        <div className="th-wrap th-special">
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {col === "__validacion__" ? "✓ Validación" : "✎ Comentario"}
          </span>
        </div>
      ) : (
        <div className="th-wrap">
          <span className="th-label">
            {label ?? col}
            {sortCol === col && (
              <span className="th-icon th-sort-icon" title={sortDir === "asc" ? "Asc" : "Desc"}>
                {sortDir === "asc" ? "▲" : "▼"}
              </span>
            )}
            {hasFilter && (
              <span className="th-icon th-filter-icon" title="Filtro aplicado">⚲</span>
            )}
          </span>
          <span className="th-chevron" aria-hidden>{openPanel === col ? "▴" : "▾"}</span>
          {openPanel === col && (
            <ColPanel col={col} rows={rows}
              activeVals={getColFilterSet(col)} sortCol={sortCol} sortDir={sortDir}
              onSort={dir => handleSort(col, dir)}
              onChange={set => setColFilterSet(col, set)}
              onClose={() => setOpenPanel(null)} anchorRef={thRef} />
          )}
        </div>
      )}
      <div
        style={{
          position: "absolute", right: 0, top: 0, height: "100%", width: 6,
          cursor: "col-resize", zIndex: 5, userSelect: "none",
        }}
        onMouseDown={e => onResizeStart(e, col)}
        onClick={e => e.stopPropagation()}
        title="Arrastrar para cambiar ancho"
      >
        <div style={{
          width: 2, height: "50%", margin: "25% auto 0",
          background: "transparent", borderRadius: 1, transition: "background 0.12s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--accent2)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        />
      </div>
    </th>
  );
}
