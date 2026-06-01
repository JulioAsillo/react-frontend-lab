'use client';
/**
 * makePrivilegiadosPanel.jsx — Fábrica de paneles de hallazgos de Privilegiados.
 *
 * Los 7 paneles eran ~95% idénticos (mismo import, mismo TableComponent, mismo
 * handleExport copiado byte a byte). Solo cambiaban label/endpoint/persistKey/
 * breadcrumb/scenarioCfg/fieldMap. Esta fábrica encapsula todo el boilerplate.
 */
import GenericPanel from '@/components/shared/GenericPanel';
import DataTablePrivilegiados, { exportAllPrivilegiados } from '@/components/shared/DataTablePrivilegiados';
import { makeHandleExport } from '@/lib/utils/reportExport';

export function makePrivilegiadosPanel(cfg) {
  const reporte = { label: cfg.label, endpoint: cfg.endpoint, needsDate: cfg.needsDate ?? false };

  function Table({ rawData, persistKey }) {
    return (
      <DataTablePrivilegiados
        rawData={rawData}
        persistKey={persistKey}
        scenarioCfg={cfg.scenarioCfg}
        fieldMap={cfg.fieldMap}
      />
    );
  }
  Table.useRawData = true;

  const handleExport = makeHandleExport(exportAllPrivilegiados, cfg.scenarioCfg);

  return function PrivilegiadosPanel() {
    return (
      <GenericPanel
        reporte={reporte}
        persistKey={cfg.persistKey}
        breadcrumb={cfg.breadcrumb}
        section="privilegiados / hallazgos"
        TableComponent={Table}
        onExportAll={handleExport}
        consolidadoRoute={cfg.consolidadoRoute}
      />
    );
  };
}

// ── Variantes de escenarios extraídas de los paneles originales ──────────────
// A: Cesado Activo + No Identificado (con comentario)
export const CFG_A = {
  escenarios: [
    { key: 'Cesado Activo',   badgeCol: 'Cesado Activo',   hasValidacion: true, hasComentario: false },
    { key: 'No Identificado', badgeCol: 'No Identificado', hasValidacion: true, hasComentario: true  },
  ],
};
// B: Cesado Activo + No Identificado (sin comentario)
export const CFG_B = {
  escenarios: [
    { key: 'Cesado Activo',   badgeCol: 'Cesado Activo',   hasValidacion: true, hasComentario: false },
    { key: 'No Identificado', badgeCol: 'No Identificado', hasValidacion: true, hasComentario: false },
  ],
};
// C: + Sin Sustento
export const CFG_C = {
  escenarios: [
    { key: 'Cesado Activo',   badgeCol: 'Cesado Activo',   hasValidacion: true, hasComentario: false },
    { key: 'No Identificado', badgeCol: 'No Identificado', hasValidacion: true, hasComentario: false },
    { key: 'Sin Sustento',    badgeCol: 'Sin Sustento',    hasValidacion: true, hasComentario: false },
  ],
};

// fieldMaps reutilizables
export const FM_USUARIO = { 
  usuarioCols: ['USUARIO', 'usuario', "Usuario"],
  matriculaCols: ['MATRICULA', 'Matricula', 'matricula'], 
  tipoCuentaCols: ['TIPO CUENTA', 'Tipo de cuenta', 'tipo_cuenta'] 
};
