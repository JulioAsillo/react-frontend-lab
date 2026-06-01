import "./globals.css";
import { AuthProvider } from "@/lib/store/authStore";
import V9MigrationGate from "@/components/system/V9MigrationGate";

export const metadata = {
  title: "ITSecOps — Security Operations Platform",
  description: "Plataforma de gestión de seguridad de TI",
};

// Anti-flash: aplica el tema guardado ANTES del primer pintado, evitando el
// "flash" de claro→oscuro al recargar. Se ejecuta inline en el <head>.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('itsecops-theme');document.documentElement.dataset.theme=(t==='dark')?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <V9MigrationGate>
          <AuthProvider>
            {children}
          </AuthProvider>
        </V9MigrationGate>
      </body>
    </html>
  );
}
