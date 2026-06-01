import ConsolidadosPerfilesPage from "@/components/admin/perfiles/recopilacion/ConsolidadosPerfilesPage";
import { Suspense } from "react";
export default function Page() {
  return <Suspense fallback={<div />}><ConsolidadosPerfilesPage /></Suspense>;
}
