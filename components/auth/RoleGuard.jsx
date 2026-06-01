"use client";

/**
 * RoleGuard — guard genérico para layouts protegidos por rol.
 *
 * Uso:
 *   <RoleGuard><MyLayoutContent /></RoleGuard>
 *
 * Comportamiento:
 *   1. Mientras AuthProvider está cargando (ready=false): no renderiza nada.
 *   2. Si no hay user: redirige a /select-role.
 *   3. Si hay user pero no puede acceder al pathname actual: redirige al
 *      home propio del rol (homeFor(role)).
 *   4. Si todo OK: renderiza children.
 *
 * Reemplaza los useEffect duplicados que había en cada layout (admin,
 * certificador, etc.). Una sola implementación, una sola fuente de verdad.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, canAccess, homeFor } from "@/lib/store/authStore";

export default function RoleGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuthStore();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/select-role");
      return;
    }
    if (!canAccess(user.role, pathname)) {
      router.replace(homeFor(user.role));
    }
  }, [ready, user, pathname, router]);

  if (!ready || !user) return null;
  if (!canAccess(user.role, pathname)) return null;

  return children;
}
