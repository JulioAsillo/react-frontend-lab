"use client";
// Wrapper del componente compartido. El render en vivo con debounce
// vive en components/shared/InformePreview.jsx; aquí solo se fija el endpoint.
import SharedInformePreview from "@/components/shared/InformePreview";

export default function InformeUsuariosPreview(props) {
  return <SharedInformePreview endpoint="/api/generar-informe" {...props} />;
}
