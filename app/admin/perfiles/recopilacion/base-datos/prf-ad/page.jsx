import FuenteDetalle from "@/components/shared/FuenteDetalle";
import { PERFILES_BD_SOURCES } from "@/lib/mock/perfilesBDSources";

export default function Page() {
  return (
    <FuenteDetalle
      sourceId="prf-ad"
      sources={PERFILES_BD_SOURCES}
      routeBase="/admin/perfiles/recopilacion/base-datos"
      consolidadosRoute="/admin/perfiles/recopilacion/consolidados"
      dataKeyPrefix="prf-bd-data"
      breadcrumbSection="perfiles / recopilación / base de datos"
    />
  );
}
