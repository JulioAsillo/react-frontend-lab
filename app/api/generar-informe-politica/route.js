/**
 * POST /api/generar-informe-politica — v1.0
 *
 * Genera el "Informe de Certificación de Política de Contraseñas" en .docx
 * a partir de un formulario 100% manual.
 *
 * Template:  public/template-informe-politica-contrasenas.docx
 *   - Los campos de texto se reemplazan con docxtemplater (placeholders {clave}).
 *   - Cada posición {imagenes_XXX} fue reescrita en el template como un bucle
 *     de 3 párrafos:
 *         {#imagenes_XXX}{%img}{/imagenes_XXX}
 *     de modo que cada imagen se inserta en SU PROPIO párrafo → apiladas.
 *
 * Imágenes:
 *   - El front envía, por cada plataforma, un array:  imagenes_XXX: [{ img: <base64> }, ...]
 *   - docxtemplater-image-module-free reemplaza cada {%img} por la imagen real.
 *   - getSize conserva el tamaño NATURAL de la imagen, salvo que supere el ancho
 *     útil de página (MAX_WIDTH_PX): en ese caso escala proporcionalmente.
 *
 * Notas:
 *   - nullGetter:'' evita errores por placeholders sin valor.
 *   - paragraphLoop:true es lo que hace que el bucle de imagen apile en párrafos.
 *   - linebreaks:true convierte \n de los textareas en saltos de línea reales.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { imageSize } from 'image-size';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATE = 'template-informe-politica-contrasenas.docx';

// Ancho útil aproximado de una página A4 con márgenes estándar, a 96 dpi.
// (≈ 16 cm → ~605 px). Subir/bajar si las capturas se ven muy grandes o pequeñas.
const MAX_WIDTH_PX = 600;

// Quita el prefijo dataURL si viniera ("data:image/png;base64,....")
function toRawBase64(value) {
  if (typeof value !== 'string') return '';
  const comma = value.indexOf(',');
  if (value.startsWith('data:') && comma !== -1) return value.slice(comma + 1);
  return value;
}

// Normaliza cualquier clave imagenes_* a la forma [{ img: <base64crudo> }]
function normalizeImagenes(valores) {
  const out = { ...valores };
  for (const key of Object.keys(out)) {
    if (!key.startsWith('imagenes_')) continue;
    const v = out[key];
    if (!Array.isArray(v)) {
      out[key] = [];
      continue;
    }
    out[key] = v
      .map((item) => {
        // Acepta {img:'...'} | {img:{data:'...'}} | '...'
        const raw =
          typeof item === 'string'
            ? item
            : item?.img?.data ?? item?.img ?? item?.data ?? '';
        return { img: toRawBase64(raw) };
      })
      .filter((it) => it.img && it.img.length > 0);
  }
  return out;
}

function buildImageModule() {
  return new ImageModule({
    centered: false,
    getImage(tagValue) {
      // tagValue es el base64 crudo (el valor de `img` dentro del bucle)
      return Buffer.from(toRawBase64(tagValue), 'base64');
    },
    getSize(imgBuffer) {
      try {
        const { width, height } = imageSize(imgBuffer);
        if (!width || !height) return [MAX_WIDTH_PX, MAX_WIDTH_PX];
        if (width <= MAX_WIDTH_PX) return [width, height];
        const ratio = MAX_WIDTH_PX / width;
        return [Math.round(width * ratio), Math.round(height * ratio)];
      } catch {
        return [MAX_WIDTH_PX, MAX_WIDTH_PX];
      }
    },
  });
}

export async function POST(request) {
  try {
    const valores = await request.json();

    const templatePath = join(process.cwd(), 'public', TEMPLATE);
    const buffer = readFileSync(templatePath);
    const zip = new PizZip(buffer);

    const doc = new Docxtemplater(zip, {
      modules: [buildImageModule()],
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.render(normalizeImagenes(valores));

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition':
          'attachment; filename="Informe_Politica_Contrasenas.docx"',
        'Content-Length': String(outputBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[generar-informe-politica] Error:', err);
    if (err?.properties?.errors?.length) {
      const details = err.properties.errors
        .map((e) => e.properties?.explanation || e.message || String(e))
        .join('; ');
      return NextResponse.json(
        { error: `Error en plantilla: ${details}` },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Error interno al generar el informe' },
      { status: 500 }
    );
  }
}
