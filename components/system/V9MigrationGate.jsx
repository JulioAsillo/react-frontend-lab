"use client";

/**
 * V9MigrationGate — ejecuta el wipe v8 → v9 una sola vez por navegador.
 *
 * Razón de existir: el RootLayout es Server Component. Para tocar storage
 * necesitamos un componente cliente, pero no queremos forzar a TODO el árbol
 * de la app a ser client. Este wrapper resuelve eso: corre el efecto en mount
 * y renderiza children sin agregar estado.
 *
 * runV9MigrationOnce es idempotente: la primera ejecución borra todo de v8
 * (excepto la sesión) y marca el flag. Las siguientes son no-op.
 */

import { useEffect } from "react";
import { runV9MigrationOnce } from "@/lib/storage";

export default function V9MigrationGate({ children }) {
  useEffect(() => {
    runV9MigrationOnce();
  }, []);
  return children;
}
