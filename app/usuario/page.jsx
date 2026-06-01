"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsuarioHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/usuario/dashboard");
  }, [router]);
  return null;
}
