"use client";

import { createContext, useContext, useState, useEffect } from "react";

/**
 * v17: El certificador ahora puede acceder a /admin/* (excepto /admin/gestion-usuarios
 * que está oculto en su sidebar — el guard no lo bloquea porque el contenido es el mismo,
 * pero el sidebar nunca muestra ese enlace al certificador).
 *
 * Pool de mock users:
 *   admin        / admin123
 *   certificador / cert123
 *   usuario      / usu123
 */
const MOCK_USERS = [
  { username: "admin",        password: "admin123", role: "admin",        name: "Administrador"        },
  { username: "certificador", password: "cert123",  role: "certificador", name: "Usuario Certificador" },
  { username: "usuario",      password: "usu123",   role: "usuario",      name: "Usuario Visualizador" },
];

/**
 * Prefijos URL permitidos por rol.
 *
 * certificador: puede navegar a /admin/* porque usa el mismo contenido operativo
 * (recopilación, hallazgos, perfiles). Su sidebar (CertificadorSidebar) nunca
 * muestra el enlace a /admin/gestion-usuarios, así que queda oculto por UI.
 * Si alguien teclea la URL directamente sí podrá entrar — decisión aceptada
 * porque es un frontend mock sin backend de auth real.
 */
const ROLE_PREFIXES = {
  admin:        ["/admin", "/certificador"],
  certificador: ["/admin", "/certificador"],
  usuario:      ["/usuario"],
};

const PUBLIC_ROUTES = ["/select-role", "/login", "/"];

export function homeFor(role) {
  if (role === "admin")        return "/admin";
  if (role === "certificador") return "/admin/usuarios";
  if (role === "usuario")      return "/usuario";
  return "/select-role";
}

export function canAccess(role, pathname) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (!role) return false;
  const allowed = ROLE_PREFIXES[role] ?? [];
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("itsecops-user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  function login(username, password) {
    const found = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (found) {
      const u = { username: found.username, role: found.role, name: found.name };
      setUser(u);
      try { sessionStorage.setItem("itsecops-user", JSON.stringify(u)); } catch {}
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
    try { sessionStorage.removeItem("itsecops-user"); } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthStore must be used inside AuthProvider");
  return ctx;
}
