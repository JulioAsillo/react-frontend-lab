"use client";

/**
 * VirtualTableBody — tbody virtualizado para datasets grandes.
 *
 * Estrategia: usamos @tanstack/react-virtual con measureElement. Los <tr>
 * fuera de la ventana visible NO se renderizan, lo que mantiene fluido el
 * scroll incluso con 20.000 filas.
 *
 * Cómo encaja con el resto:
 *   - El componente recibe `scrollParentRef`: el div con overflow auto
 *     que rodea a la <table>. Es el viewport que el virtualizer mide.
 *   - Renderiza filas dentro de un <tbody> con `position: relative` y un
 *     espaciador (single tr con height = totalSize) que reserva el alto.
 *   - Las filas reales van con `position: absolute` y transform: translateY.
 *
 * Esta técnica preserva semántica HTML (sigue siendo <table>) y permite que
 * el <thead> sticky funcione sin cambios.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import DataTableRow from "./DataTableRow";

const ROW_ESTIMATE = 36; // px aprox por fila — tras measureElement se ajusta

export default function VirtualTableBody({
  rows,
  scrollParentRef,
  cols,
  colWidths,
  getVal,
  getComentario,
  setValidacion,
  setComentario,
  badgeCol,
  expandedRow,
  setExpandedRow,
  rowId,
}) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8, // pre-rendera 8 filas fuera de la ventana — scroll fluido
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Espaciadores top/bottom — técnica clásica para virtualizar dentro de <table>
  // sin romper la semántica. paddingTop = offset del primer item visible.
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr aria-hidden style={{ height: paddingTop }} />
      )}
      {items.map((vi) => {
        const row = rows[vi.index];
        return (
          <DataTableRow
            key={vi.key}
            trRef={virtualizer.measureElement}
            trDataIndex={vi.index}
            row={row}
            ri={vi.index}
            cols={cols}
            colWidths={colWidths}
            getVal={getVal}
            getComentario={getComentario}
            setValidacion={setValidacion}
            setComentario={setComentario}
            badgeCol={badgeCol}
            expandedRow={expandedRow}
            setExpandedRow={setExpandedRow}
            rowId={rowId}
          />
        );
      })}
      {paddingBottom > 0 && (
        <tr aria-hidden style={{ height: paddingBottom }} />
      )}
    </tbody>
  );
}
