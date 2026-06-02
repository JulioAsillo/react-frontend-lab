'use client';

/**
 * CertificadorSidebar — sidebar para el rol certificador.
 *
 * Es funcionalmente idéntico a AdminSidebar EXCEPTO que:
 * - No muestra la sección "Administración / Gestión de Usuarios"
 * - El brand muestra "Certificador" en lugar de "Admin"
 * - El home del brand lleva a /certificador/hallazgos/cesados (su landing)
 *
 * Reutiliza las mismas rutas /admin/* porque el certificador ahora tiene
 * permiso de acceso a ellas (ver authStore.js ROLE_PREFIXES).
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useToggleSidebar, useTheme, useToggleTheme } from '@/lib/store/prefsStore';
import { BD_SOURCES } from '@/lib/mock/bdSources';
import { PERFILES_BD_SOURCES, PERFILES_CONSOLIDADOS } from '@/lib/mock/perfilesBDSources';
import { useBDStatus, useIsReportLoading } from '@/lib/store/uiStore';
import { Suspense } from 'react';

const HALLAZGOS_ADMIN = [
  { label: 'Preliminares',      icon: '🔍', route: '/admin/usuarios/hallazgos/cesados',               persistKey: 'cesados' },
  { label: 'Active Directory',  icon: '🖥',  route: '/admin/usuarios/hallazgos/active-directory',     persistKey: 'ad'      },
  { label: 'Entra ID',          icon: '☁️', route: '/admin/usuarios/hallazgos/entra-id',              persistKey: 'entra'   },
  { label: 'Apps Críticas',     icon: '📱', route: '/admin/usuarios/hallazgos/aplicaciones-criticas', persistKey: 'apps'    },
  { label: 'Base de Datos',     icon: '🗄',  route: '/admin/usuarios/hallazgos/base-datos',            persistKey: 'bd'      },
];

const CONSOLIDADOS_SUBNAV = [
  { label: 'Clasificación de Cuenta', icon: '🏷', tabParam: 'clasificacion' },
  { label: 'Post Ceses',              icon: '🚪', tabParam: 'postCese' },
];

const HALLAZGOS_PERFILES = [
  { label: 'Roles',    icon: '🏷', route: '/admin/perfiles/hallazgos/roles',   persistKey: 'prf-roles'   },
  { label: 'Apps',     icon: '📱', route: '/admin/perfiles/hallazgos/apps',    persistKey: 'prf-apps'    },
  { label: 'DBs',      icon: '🗄',  route: '/admin/perfiles/hallazgos/dbs',    persistKey: 'prf-dbs'     },
  { label: 'Moviper',  icon: '🔄', route: '/admin/perfiles/hallazgos/moviper', persistKey: 'prf-moviper' },
];

const HALLAZGOS_PRIVILEGIADOS = [
  { label: 'Windows',       icon: '🪟', route: '/admin/privilegiados/hallazgos/windows'      },
  { label: 'Linux',         icon: '🐧', route: '/admin/privilegiados/hallazgos/linux'         },
  { label: 'DBA',           icon: '🗄',  route: '/admin/privilegiados/hallazgos/dba'           },
  { label: 'SysAdmin',      icon: '⚙️', route: '/admin/privilegiados/hallazgos/sysadmin'      },
  { label: 'Domain Admin',  icon: '🔑', route: '/admin/privilegiados/hallazgos/domain-admin'  },
  { label: 'Local Admin',   icon: '🖥',  route: '/admin/privilegiados/hallazgos/local-admin'   },
  { label: 'Apps Críticas', icon: '📱', route: '/admin/privilegiados/hallazgos/apps-criticas' },
  { label: 'MFA',           icon: '🔒', route: '/admin/privilegiados/hallazgos/mfa'           },
];

// ── HallazgoNavItem con spinner de carga ─────────────────────────────────────
function HallazgoNavItem({ item, pathname, router }) {
  const isLoading = useIsReportLoading(item.persistKey);
  const isActive  = pathname.startsWith(item.route);
  return (
    <button
      className={`nav-item ${isActive ? 'nav-active' : ''}`}
      style={{ fontSize: 11.5, paddingLeft: 28 }}
      onClick={() => router.push(item.route)}
    >
      <span className="nav-icon" style={{ fontSize: 12 }}>{item.icon}</span>
      <span className="nav-label" style={{ flex: 1 }}>{item.label}</span>
      {isLoading && (
      < span className="spinner nav-spinner" title="Cargando…" />
      )}
    </button>
  );
}

function BDNavItem({ src, pathname }) {
  const router = useRouter();
  const route  = `/admin/usuarios/recopilacion/base-datos/${src.id}`;
  const isActive = pathname === route || pathname.startsWith(route);
  const status = useBDStatus(src.id);
  return (
    <button
      className={`nav-item ${isActive ? 'nav-active' : ''}`}
      style={{ fontSize: 11.5, paddingLeft: 32 }}
      onClick={() => router.push(route)}
    >
      <span className="nav-icon" style={{ fontSize: 11 }}>{src.icon}</span>
      <span className="nav-label" style={{ flex: 1 }}>{src.label}</span>
      {status === 'ok' && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 }} />
      )}
    </button>
  );
}

function BDNavItemPerfiles({ src, pathname }) {
  const router = useRouter();
  const route  = `/admin/perfiles/recopilacion/base-datos/${src.id}`;
  const isActive = pathname === route || pathname.startsWith(route);
  const status = useBDStatus(src.id);
  return (
    <button
      className={`nav-item ${isActive ? 'nav-active' : ''}`}
      style={{ fontSize: 11.5, paddingLeft: 32 }}
      onClick={() => router.push(route)}
    >
      <span className="nav-icon" style={{ fontSize: 11 }}>{src.icon}</span>
      <span className="nav-label" style={{ flex: 1 }}>{src.label}</span>
      {status === 'ok' && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 }} />
      )}
    </button>
  );
}

function CertificadorSidebarInner() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const toggleSidebar = useToggleSidebar();
  const theme = useTheme();
  const toggleTheme = useToggleTheme();

  // Certificador navega por /admin/* — mismas flags que AdminSidebar
  const isLanding      = pathname === '/certificador/hallazgos/cesados' || pathname === '/certificador';
  const inUsuarios     = pathname.startsWith('/admin/usuarios');
  const inRecopilacion = pathname.startsWith('/admin/usuarios/recopilacion');
  const inBD           = pathname.startsWith('/admin/usuarios/recopilacion/base-datos');
  const inConsolidados = pathname.startsWith('/admin/usuarios/recopilacion/consolidados');
  const activeTab      = searchParams.get('tab') ?? 'clasificacion';
  const inHallazgos    = pathname.startsWith('/admin/usuarios/hallazgos');

  const inPerfiles          = pathname.startsWith('/admin/perfiles');
  const inPerfilesRecop     = pathname.startsWith('/admin/perfiles/recopilacion');
  const inPerfilesBD        = pathname.startsWith('/admin/perfiles/recopilacion/base-datos');
  const inPerfilesConsol    = pathname.startsWith('/admin/perfiles/recopilacion/consolidados');
  const activeTabPerfiles   = searchParams.get('tab') ?? 'consolidado1';
  const inPerfilesHallazgos = pathname.startsWith('/admin/perfiles/hallazgos');

  const inPrivilegiados = pathname.startsWith('/admin/privilegiados');
  const inPrivHallazgos = pathname.startsWith('/admin/privilegiados/hallazgos');
  const inPrivRecop = pathname.startsWith('/admin/privilegiados/recopilacion');

  // "en algún módulo de /admin" — para mostrar el subnav completo
  const inAdminArea = pathname.startsWith('/admin');

  return (
    <aside className="sidebar">
      {/* Brand — home del certificador */}
      <div
        className="sidebar-brand"
        title="Panel certificador"
      >
        <div className="brand-logo" onClick={() => router.push('/certificador')} style={{ fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer' }}>ISO</div>
        <div className="brand-title">
          <div className="brand-name" style={{ fontSize: 10, letterSpacing: '0.07em' }}>ITSECOPS</div>
          <div style={{
            fontSize: 9.5, color: 'var(--accent2)', fontFamily: 'var(--mono)',
            textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85,
            marginTop: 1, lineHeight: 1.2,
          }}>
            Certificación<br />de Usuarios
          </div>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar} title="Ocultar menú" aria-label="Ocultar menú">‹</button>
      </div>

      <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1 }}>
        {/* Módulos — siempre visibles */}
        <div className="sidebar-section-label">Módulos</div>
        <button
          className={`nav-item ${inUsuarios ? 'nav-active' : ''}`}
          onClick={() => router.push('/admin/usuarios')}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-label">Usuarios</span>
        </button>
        <button
          className={`nav-item ${inPrivilegiados ? 'nav-active' : ''}`}
          onClick={() => router.push('/admin/privilegiados')}
        >
          <span className="nav-icon">🔐</span>
          <span className="nav-label">Privilegiados</span>
        </button>
        <button
          className={`nav-item ${inPerfiles ? 'nav-active' : ''}`}
          onClick={() => router.push('/admin/perfiles')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Perfiles</span>
        </button>
        <button className="nav-item" style={{ opacity: 0.4, cursor: 'default' }}>
          <span className="nav-icon">🔧</span><span className="nav-label">Herramientas</span>
        </button>

        {/* ── Sub-nav Usuarios ── */}
        {inUsuarios && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 10 }}>Usuarios</div>

            <button
              className={`nav-item ${inRecopilacion ? 'nav-active' : ''}`}
              style={{ paddingLeft: 16 }}
              onClick={() => router.push('/admin/usuarios/recopilacion')}
            >
              <span className="nav-icon">📥</span>
              <span className="nav-label">Recopilar Información</span>
            </button>

            {inRecopilacion && (
              <button
                className={`nav-item ${inBD ? 'nav-active' : ''}`}
                style={{ paddingLeft: 24, fontSize: 12 }}
                onClick={() => router.push('/admin/usuarios/recopilacion/base-datos')}
              >
                <span className="nav-icon" style={{ fontSize: 12 }}>🗄</span>
                <span className="nav-label">Base de Datos</span>
              </button>
            )}

            {inBD && BD_SOURCES.map(src => (
              <BDNavItem key={src.id} src={src} pathname={pathname} />
            ))}

            {inRecopilacion && (
              <button
                className={`nav-item ${inConsolidados ? 'nav-active' : ''}`}
                style={{ paddingLeft: 24, fontSize: 12 }}
                onClick={() => router.push('/admin/usuarios/recopilacion/consolidados')}
              >
                <span className="nav-icon" style={{ fontSize: 12 }}>📋</span>
                <span className="nav-label">Consolidados</span>
              </button>
            )}

            {inConsolidados && CONSOLIDADOS_SUBNAV.map(sub => {
              const isSubActive = activeTab === sub.tabParam;
              return (
                <button
                  key={sub.tabParam}
                  className={`nav-item ${isSubActive ? 'nav-active' : ''}`}
                  style={{ paddingLeft: 32, fontSize: 11.5 }}
                  onClick={() => router.push(`/admin/usuarios/recopilacion/consolidados?tab=${sub.tabParam}`)}
                >
                  <span className="nav-icon" style={{ fontSize: 11 }}>{sub.icon}</span>
                  <span className="nav-label">{sub.label}</span>
                </button>
              );
            })}

            <button
              className={`nav-item ${inHallazgos ? 'nav-active' : ''}`}
              style={{ paddingLeft: 16 }}
              onClick={() => router.push('/admin/usuarios/hallazgos/cesados')}
            >
              <span className="nav-icon">🚨</span>
              <span className="nav-label">Hallazgos</span>
            </button>
            {inHallazgos && HALLAZGOS_ADMIN.map(item => (
                <HallazgoNavItem key={item.route} item={item} pathname={pathname} router={router} />
              ))}
          </>
        )}

        {/* ── Sub-nav Perfiles ── */}
        {inPerfiles && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 10 }}>Perfiles</div>

            <button
              className={`nav-item ${inPerfilesRecop ? 'nav-active' : ''}`}
              style={{ paddingLeft: 16 }}
              onClick={() => router.push('/admin/perfiles/recopilacion')}
            >
              <span className="nav-icon">📥</span>
              <span className="nav-label">Recopilar Información</span>
            </button>

            {inPerfilesRecop && (
              <button
                className={`nav-item ${inPerfilesBD ? 'nav-active' : ''}`}
                style={{ paddingLeft: 24, fontSize: 12 }}
                onClick={() => router.push('/admin/perfiles/recopilacion/base-datos')}
              >
                <span className="nav-icon" style={{ fontSize: 12 }}>🗄</span>
                <span className="nav-label">Base de Datos</span>
              </button>
            )}

            {inPerfilesBD && PERFILES_BD_SOURCES.map(src => (
              <BDNavItemPerfiles key={src.id} src={src} pathname={pathname} />
            ))}

            {inPerfilesRecop && (
              <button
                className={`nav-item ${inPerfilesConsol ? 'nav-active' : ''}`}
                style={{ paddingLeft: 24, fontSize: 12 }}
                onClick={() => router.push('/admin/perfiles/recopilacion/consolidados')}
              >
                <span className="nav-icon" style={{ fontSize: 12 }}>📋</span>
                <span className="nav-label">Consolidados</span>
              </button>
            )}

            {inPerfilesConsol && PERFILES_CONSOLIDADOS.map(sub => {
              const isSubActive = activeTabPerfiles === sub.tabParam;
              return (
                <button
                  key={sub.tabParam}
                  className={`nav-item ${isSubActive ? 'nav-active' : ''}`}
                  style={{ paddingLeft: 32, fontSize: 11.5 }}
                  onClick={() => router.push(`/admin/perfiles/recopilacion/consolidados?tab=${sub.tabParam}`)}
                >
                  <span className="nav-icon" style={{ fontSize: 11 }}>{sub.icon}</span>
                  <span className="nav-label">{sub.label}</span>
                </button>
              );
            })}

            <button
              className={`nav-item ${inPerfilesHallazgos ? 'nav-active' : ''}`}
              style={{ paddingLeft: 16 }}
              onClick={() => router.push('/admin/perfiles/hallazgos/roles')}
            >
              <span className="nav-icon">🚨</span>
              <span className="nav-label">Hallazgos</span>
            </button>
            {inPerfilesHallazgos && HALLAZGOS_PERFILES.map(item => (
                <HallazgoNavItem key={item.route} item={item} pathname={pathname} router={router} />
              ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}
          title="Cambiar tema claro/oscuro" aria-label="Cambiar tema">
          <span className="theme-toggle-icon">{theme === 'dark' ? '\u2600\ufe0f' : '\u{1F319}'}</span>
          <span className="theme-toggle-label">{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
        </button>
        {user && (
          <div className="sidebar-user-row">
            <span className="sidebar-user-name">👤 {user.name}</span>
            <button className="btn-logout" onClick={() => { logout(); router.replace('/select-role'); }}>Salir</button>
          </div>
        )}
        <span className="sidebar-version">v25.0.0 · ITSecOps</span>
      </div>
    </aside>
  );
}

export default function CertificadorSidebar() {
  return (
    <Suspense fallback={<aside className="sidebar" />}>
      <CertificadorSidebarInner />
    </Suspense>
  );
}
