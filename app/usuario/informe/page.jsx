/**
 * /usuario/informe — Generador de informe accesible al rol usuario.
 * Reutiliza el mismo panel; el panel internamente bloquea al certificador.
 */
import GenerarInformeUsuariosPanel from "@/components/admin/usuarios/informe/GenerarInformeUsuariosPanel";
export const metadata = { title: "Informe de Certificación — ITSecOps" };
export default function Page() { return <GenerarInformeUsuariosPanel />; }
