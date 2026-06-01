"use client";
// Wrapper del componente compartido (v25.0). El render en vivo con debounce
// vive en components/shared/InformePreview.jsx; aquí solo se fija el endpoint.
import SharedInformePreview from "@/components/shared/InformePreview";

export default function InformePreview(props) {
  return <SharedInformePreview endpoint="/api/generar-informe-perfiles" {...props} />;
}
