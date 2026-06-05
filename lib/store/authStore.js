"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { verifyPassword } from "@/lib/utils/authHash";

/**
 * Pool de usuarios.
 *
 * Los 2 admin y el certificador autentican con PBKDF2 + sal: en el código solo
 * viven `salt` y `hash` (NO la contraseña). La contraseña real ("semilla") solo
 * la conoce la persona con acceso. Reemplaza los REEMPLAZAR_* por los valores
 * que genere generateCredential() para cada contraseña (ver instrucciones).
 *
 * El usuario normal queda con contraseña en texto plano (decisión del proyecto:
 * solo es perfil de visualización).
 *
 * Puedes cambiar `username` y `name` libremente; lo que autentica es salt+hash.
 */
const MOCK_USERS = [
  { username: "adminPrimaAFP", role: "admin", name: "Administrador Prima AFP",
    salt: "d5d9adff33e551c5de8ae28811f370ba", hash: "7f05a3faede2b2a17d8f555d751921c794944b7082d0e7ee74b001e2474c1f91", iterations: 150000 },

  { username: "T51131", role: "admin", name: "Eliana Katherine de la Cruz Vega", 
    salt: "4b51df5b9ad1e56a8fbbd2499ef3a0f3", hash: "1fae4f4d39db4d08a8f5fd34d94c53bd2cc68cb6fc6a549a6807be07e18fb61c", iterations: 150000 },

  { username: "Certificador", role: "certificador", name: "Usuario Certificador",
    salt: "3e39950c04d5d2b3fe6a972c48a1e37b", hash: "107eeb8d800e44029f6a3221e0f690cae65c47da84ea8d2c98c434fe66acf451", iterations: 150000 },

  // Usuario normal (visualizador): se mantiene en texto plano.
  { username: "usuario", password: "usu123", role: "usuario", name: "Usuario Visualizador" },
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
  // Gestión de Usuarios es EXCLUSIVA de admin: el certificador no puede acceder
  // ni por enlace ni tecleando la URL directamente. RoleGuard lo redirige.
  if (pathname === "/admin/gestion-usuarios" || pathname.startsWith("/admin/gestion-usuarios/")) {
    return role === "admin";
  }
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

  async function login(username, password) {
    const found = MOCK_USERS.find(u => u.username === username);
    if (!found) return false;

    let ok = false;
    if (found.hash) {
      // Usuarios con PBKDF2 (admin / certificador)
      ok = await verifyPassword(password, found);
    } else if (found.password != null) {
      // Usuario legacy en texto plano (visualizador)
      ok = password === found.password;
    }
    if (!ok) return false;

    const u = { username: found.username, role: found.role, name: found.name };
    setUser(u);
    try { sessionStorage.setItem("itsecops-user", JSON.stringify(u)); } catch {}
    return true;
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
