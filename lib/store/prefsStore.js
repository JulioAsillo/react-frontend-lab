'use client';
/**
 * prefsStore.js — Preferencias de UI del usuario (tema claro/oscuro + sidebar).
 *
 * Store separado de uiStore a propósito: uiStore tiene una interfaz TS estricta
 * orientada a datos de reportes; las preferencias de UI son transversales y se
 * persisten en localStorage para sobrevivir recargas.
 *
 * - theme:        'light' | 'dark'  (aplica data-theme en <html>)
 * - sidebarHidden boolean           (oculta/ muestra el sidebar a gusto)
 */
import { create } from 'zustand';

const THEME_KEY   = 'itsecops-theme';
const SIDEBAR_KEY  = 'itsecops-sidebar-hidden';

function readTheme() {
  if (typeof window === 'undefined') return 'light';
  const v = localStorage.getItem(THEME_KEY);
  return v === 'dark' ? 'dark' : 'light';
}
function readSidebarHidden() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_KEY) === '1';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export const usePrefsStore = create((set, get) => ({
  theme: readTheme(),
  sidebarHidden: readSidebarHidden(),

  setTheme: (theme) => {
    if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  toggleSidebar: () => {
    const next = !get().sidebarHidden;
    if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    set({ sidebarHidden: next });
  },
  setSidebarHidden: (hidden) => {
    if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_KEY, hidden ? '1' : '0');
    set({ sidebarHidden: hidden });
  },
}));

// Hooks de conveniencia
export const useTheme         = () => usePrefsStore(s => s.theme);
export const useToggleTheme   = () => usePrefsStore(s => s.toggleTheme);
export const useSidebarHidden = () => usePrefsStore(s => s.sidebarHidden);
export const useToggleSidebar = () => usePrefsStore(s => s.toggleSidebar);
