/**
 * /usuario/informe — Generador de informe accesible al rol usuario.
 * Reutiliza el mismo panel; el panel internamente bloquea al certificador.
 */
import GenerarInformePanel from "@/components/admin/usuarios/informe/GenerarInformePanel";
export const metadata = { title: "Informe de Certificación — ITSecOps" };
export default function Page() { return <GenerarInformePanel />; }
