'use client';

import { Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useBDStatus, useIsReportLoading } from '@/lib/store/uiStore';
import { ADMIN_MODULES, ROOT_MODULES } from '@/lib/config/sidebarNav';
import { useToggleSidebar, useTheme, useToggleTheme } from '@/lib/store/prefsStore';

const APP_VERSION = 'v25.0.0';

// ── Item de hallazgo: punto verde si hay datos, spinner mientras carga ───────
// FIX: ahora item.persistKey existe (definido en sidebarNav.js), por lo que el
// spinner de carga finalmente se activa. Antes era siempre undefined.
function HallazgoNavItem({ item, pathname, router }) {
  const isLoading = useIsReportLoading(item.persistKey);
  const isActive = pathname.startsWith(item.route);
  return (
    <button
      className={`nav-item nav-lvl-3 ${isActive ? 'nav-active' : ''}`}
      onClick={() => router.push(item.route)}
    >
      <span className="nav-icon">{item.icon}</span>
      <span className="nav-label">{item.label}</span>
      {isLoading && <span className="spinner nav-spinner" title="Cargando reporte…" />}
    </button>
  );
}

// ── Item de fuente BD: punto verde cuando status === 'ok' ────────────────────
// Antes existían DOS componentes idénticos (BDNavItem y BDNavItemPerfiles) que
// solo diferían en el prefijo de ruta. Ahora es uno solo parametrizado.
function BDNavItem({ src, bdRoute, pathname, router }) {
  const route = `${bdRoute}/${src.id}`;
  const isActive = pathname === route || pathname.startsWith(route + '/');
  const status = useBDStatus(src.id);
  return (
    <button
      className={`nav-item nav-lvl-3 ${isActive ? 'nav-active' : ''}`}
      onClick={() => router.push(route)}
    >
      <span className="nav-icon">{src.icon}</span>
      <span className="nav-label">{src.label}</span>
      {status === 'ok' && <span className="nav-dot" title="Cargada" />}
    </button>
  );
}

// ── Sub-nav completo de un módulo (Recopilar / Consolidados / Hallazgos / Informe)
function ModuleSubnav({ mod, pathname, router, activeTab }) {
  const { recopilacion: r, hallazgos: h, informe } = mod;

  const inRecop = pathname.startsWith(`${mod.base}/recopilacion`);
  const inBD = pathname.startsWith(r.bdRoute);
  const inConsol = pathname.startsWith(r.consolidadosRoute);
  const inHallazgos = pathname.startsWith(h.route);
  const inInforme = pathname.startsWith(informe.route);

  return (
    <>
      <div className="sidebar-section-label sidebar-section-gap">{mod.label}</div>

      {/* Recopilar Información */}
      <button
        className={`nav-item nav-lvl-1 ${inRecop ? 'nav-active' : ''}`}
        onClick={() => router.push(r.recopRoute)}
      >
        <span className="nav-icon">📥</span>
        <span className="nav-label">Recopilar Información</span>
      </button>

      {/* Fila intermedia "Base de Datos" (solo Usuarios y Perfiles) */}
      {r.hasBdSubButton && inRecop && (
        <button
          className={`nav-item nav-lvl-2 ${inBD ? 'nav-active' : ''}`}
          onClick={() => router.push(r.bdRoute)}
        >
          <span className="nav-icon">🗄</span>
          <span className="nav-label">Base de Datos</span>
        </button>
      )}

      {/* Fuentes de BD */}
      {inBD && r.bdSources.map((src) => (
        <BDNavItem key={src.id} src={src} bdRoute={r.bdRoute} pathname={pathname} router={router} />
      ))}

      {/* Consolidados */}
      {inRecop && (
        <button
          className={`nav-item nav-lvl-2 ${inConsol ? 'nav-active' : ''}`}
          onClick={() => router.push(r.consolidadosRoute)}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Consolidados</span>
        </button>
      )}
      {inConsol && r.consolidadosSubnav.map((sub) => (
        <button
          key={sub.tabParam}
          className={`nav-item nav-lvl-3 ${activeTab === sub.tabParam ? 'nav-active' : ''}`}
          onClick={() => router.push(`${r.consolidadosRoute}?tab=${sub.tabParam}`)}
        >
          <span className="nav-icon">{sub.icon}</span>
          <span className="nav-label">{sub.label}</span>
        </button>
      ))}

      {/* Hallazgos */}
      <button
        className={`nav-item nav-lvl-1 ${inHallazgos ? 'nav-active' : ''}`}
        onClick={() => router.push(h.defaultRoute)}
      >
        <span className="nav-icon">🚨</span>
        <span className="nav-label">Hallazgos</span>
      </button>
      {inHallazgos && h.items.map((item) => (
        <HallazgoNavItem key={item.route} item={item} pathname={pathname} router={router} />
      ))}

      {/* Informe */}
      <button
        className={`nav-item nav-lvl-1 ${inInforme ? 'nav-active' : ''}`}
        onClick={() => router.push(informe.route)}
      >
        <span className="nav-icon">📄</span>
        <span className="nav-label">{informe.label}</span>
      </button>
    </>
  );
}

function AdminSidebarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const toggleSidebar = useToggleSidebar();
  const theme = useTheme();
  const toggleTheme = useToggleTheme();

  const isLanding = pathname === '/admin';
  const activeTab = searchParams.get('tab') ?? 'clasificacion';
  const inGestion = pathname.startsWith('/admin/gestion-usuarios');
  // El certificador comparte TODA la navegación del admin salvo "Gestión de Usuarios".
  const isCertificador = user?.role === 'certificador';

  // Módulo activo: el primero cuya base coincida con la ruta actual.
  const activeModule = ADMIN_MODULES.find((m) => pathname.startsWith(m.base));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" title="Panel de administración">
        <div className="brand-logo" onClick={() => router.push('/admin')} style={{ cursor: 'pointer' }}>ISO</div>
        <div className="brand-title" onClick={() => router.push('/admin')} style={{ cursor: 'pointer' }}>
          <div className="brand-name">ITSECOPS</div>
          <div className="brand-subtitle">{isCertificador ? 'Certificador' : 'Admin'}</div>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar} title="Ocultar menú" aria-label="Ocultar menú">‹</button>
      </div>

      {!isLanding && (
        <nav className="sidebar-nav">
          {/* Módulos raíz */}
          <div className="sidebar-section-label">Módulos</div>
          {ROOT_MODULES.map((m) => {
            const isActive = m.route ? pathname.startsWith(m.route) : false;
            return (
              <button
                key={m.key}
                className={`nav-item ${m.disabled ? 'nav-item-disabled' : ''} ${isActive ? 'nav-active' : ''}`}
                disabled={m.disabled}
                onClick={() => m.route && router.push(m.route)}
              >
                <span className="nav-icon">{m.icon}</span>
                <span className="nav-label">{m.label}</span>
              </button>
            );
          })}

          {/* Administración — solo admin (el certificador no ve Gestión de Usuarios) */}
          {!isCertificador && (
            <>
              <div className="sidebar-section-label sidebar-section-gap">Administración</div>
              <button
                className={`nav-item ${inGestion ? 'nav-active' : ''}`}
                onClick={() => router.push('/admin/gestion-usuarios')}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Gestión de Usuarios</span>
              </button>
            </>
          )}

          {/* Sub-nav del módulo activo (un solo render data-driven) */}
          {activeModule && (
            <ModuleSubnav mod={activeModule} pathname={pathname} router={router} activeTab={activeTab} />
          )}
        </nav>
      )}

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}
          title="Cambiar tema claro/oscuro" aria-label="Cambiar tema">
          <span className="theme-toggle-icon">{theme === 'dark' ? '\u2600\ufe0f' : '\u{1F319}'}</span>
          <span className="theme-toggle-label">{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
        </button>
        {user && (
          <div className="sidebar-user-row">
            <span className="sidebar-user-name">{user.name}</span>
            <button className="btn-logout" onClick={() => { logout(); router.replace('/select-role'); }}>Salir</button>
          </div>
        )}
        <span className="sidebar-version">{APP_VERSION} · ITSecOps</span>
      </div>
    </aside>
  );
}

export default function AdminSidebar() {
  return (
    <Suspense fallback={<aside className="sidebar" />}>
      <AdminSidebarInner />
    </Suspense>
  );
}
