/**
 * POST /api/generar-informe-perfiles — v1.0
 *
 * Genera el informe de certificación de Perfiles (.docx) a partir del
 * template public/template-informe-perfiles.docx.
 *
 * Excels incrustados (reemplazados si se envían como base64):
 *   excel_gdh    → rId14 → embeddings/Hallazgos_GDH.xlsx
 *   excel_moviper→ rId16 → embeddings/Hallazgos_Moviper.xlsx
 *   excel_apps   → rId18 → embeddings/Hallazgos_Apps_Perfiles.xlsx
 *   excel_bd     → rId20 → embeddings/Hallazgos_BD_Perfiles.xlsx
 *
 * Por ahora el panel no envía excels — se inyectan placeholders vacíos
 * para mantener los objetos OLE del template intactos.
 * Cuando el backend de Perfiles esté listo, se generarán y enviarán.
 */

import { NextResponse } from 'next/server';
import { readFileSync }  from 'fs';
import { join }          from 'path';
import PizZip            from 'pizzip';
import Docxtemplater     from 'docxtemplater';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Normalización de prefijos XML (mismo helper que informe de Usuarios) ─
const URI_TO_STD_PREFIX = {
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main':           'w',
  'http://schemas.openxmlformats.org/markup-compatibility/2006':            'mc',
  'http://schemas.microsoft.com/office/word/2010/wordml':                   'w14',
  'http://schemas.microsoft.com/office/word/2012/wordml':                   'w15',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships':    'r',
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing': 'wp',
  'http://schemas.openxmlformats.org/drawingml/2006/main':                  'a',
  'http://schemas.openxmlformats.org/drawingml/2006/picture':               'pic',
  'urn:schemas-microsoft-com:vml':                                           'v',
  'urn:schemas-microsoft-com:office:office':                                 'o',
  'urn:schemas-microsoft-com:office:word':                                   'w10',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingShape':      'wps',
  'http://schemas.microsoft.com/office/word/2006/wordml':                   'wne',
  'http://schemas.openxmlformats.org/officeDocument/2006/math':             'm',
};

function normalizeXml(xml) {
  const nsDeclRegex = /xmlns:(ns\d+)="([^"]+)"/g;
  const localToStandard = {};
  let m;
  while ((m = nsDeclRegex.exec(xml)) !== null) {
    const [, localPrefix, uri] = m;
    const std = URI_TO_STD_PREFIX[uri];
    if (std) localToStandard[localPrefix] = std;
  }
  if (Object.keys(localToStandard).length === 0) return xml;
  let out = xml;
  for (const [local, std] of Object.entries(localToStandard)) {
    out = out.replace(new RegExp(`xmlns:${local}="`, 'g'), `xmlns:${std}="`);
  }
  const sortedLocals = Object.keys(localToStandard).sort((a, b) => b.length - a.length);
  for (const local of sortedLocals) {
    const std = localToStandard[local];
    out = out.replace(new RegExp(`<${local}:`, 'g'),    `<${std}:`);
    out = out.replace(new RegExp(`</${local}:`, 'g'),   `</${std}:`);
    out = out.replace(new RegExp(`(\\s)${local}:`, 'g'), `$1${std}:`);
  }
  return out;
}

function normalizeAllXmlInZip(zip) {
  const files = Object.keys(zip.files).filter(
    (f) => !zip.files[f].dir && (f.endsWith('.xml') || f.endsWith('.rels'))
  );
  for (const f of files) {
    const original   = zip.files[f].asText();
    const normalized = normalizeXml(original);
    if (normalized !== original) zip.file(f, normalized);
  }
}

// ── Mapa campo → rId y nombre del Excel embebido ─────────────────────────
const EXCEL_RID_MAP = {
  excel_gdh:     { rid: 'rId14', file: 'word/embeddings/Hallazgos_GDH.xlsx',          short: 'Hallazgos_GDH',     caption: 'Hallazgos GDH.xlsx'                    },
  excel_moviper: { rid: 'rId16', file: 'word/embeddings/Hallazgos_Moviper.xlsx',       short: 'Hallazgos_Moviper', caption: 'Hallazgos Moviper.xlsx'                 },
  excel_apps:    { rid: 'rId18', file: 'word/embeddings/Hallazgos_Apps_Perfiles.xlsx', short: 'Hallazgos_Apps',    caption: 'Hallazgos Aplicaciones Criticas.xlsx'   },
  excel_bd:      { rid: 'rId20', file: 'word/embeddings/Hallazgos_BD_Perfiles.xlsx',   short: 'Hallazgos_BD',      caption: 'Hallazgos Base de Datos.xlsx'           },
};

function getRidTarget(zip, rid) {
  try {
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) return null;
    const relsXml = relsFile.asText();
    let m = relsXml.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`));
    if (!m) m = relsXml.match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`));
    if (!m) return null;
    return `word/${m[1]}`;
  } catch {
    return null;
  }
}

function injectEmbeddedExcels(zip, valores) {
  // Paso 1: escribir buffers y renombrar en el zip
  for (const [campo, { rid, file: newFile }] of Object.entries(EXCEL_RID_MAP)) {
    const b64 = valores[campo];
    if (!b64 || typeof b64 !== 'string') continue;
    try {
      const oldFile = getRidTarget(zip, rid);
      const buffer  = Buffer.from(b64, 'base64');
      zip.file(newFile, buffer);
      if (oldFile && oldFile !== newFile && zip.file(oldFile)) {
        zip.remove(oldFile);
      }
    } catch (err) {
      console.warn(`[generar-informe-perfiles] No se pudo inyectar ${campo}:`, err.message);
    }
  }

  // Paso 2: actualizar .rels
  try {
    const relsPath = 'word/_rels/document.xml.rels';
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      let relsXml = relsFile.asText();
      for (const [campo, { rid, file: newFile }] of Object.entries(EXCEL_RID_MAP)) {
        if (!valores[campo]) continue;
        const newTarget = newFile.replace('word/', '');
        relsXml = relsXml.replace(
          new RegExp(`(Id="${rid}"[^>]*Target=")[^"]*(")`,'g'),
          `$1${newTarget}$2`
        );
        relsXml = relsXml.replace(
          new RegExp(`(Target=")[^"]*("[^>]*Id="${rid}")`,'g'),
          `$1${newTarget}$2`
        );
      }
      zip.file(relsPath, relsXml);
    }
  } catch (err) {
    console.warn('[generar-informe-perfiles] No se pudo actualizar .rels:', err.message);
  }

  // Paso 3: actualizar atributos OLE en document.xml
  try {
    const docXml = zip.file('word/document.xml');
    if (!docXml) return;
    let xmlStr = docXml.asText();
    for (const [campo, { rid, short: newName, caption: newCaption }] of Object.entries(EXCEL_RID_MAP)) {
      if (!valores[campo]) continue;
      xmlStr = xmlStr.replace(
        new RegExp(`(<o:OLEObject[^>]*r:id="${rid}"[^>]*name=")[^"]*(")`,'g'),
        `$1${newName}$2`
      );
      xmlStr = xmlStr.replace(
        new RegExp(`(<o:OLEObject[^>]*name=")[^"]*("[^>]*r:id="${rid}")`,'g'),
        `$1${newName}$2`
      );
      const olePattern = new RegExp(
        `(<w:object[^>]*>\\s*<v:shape[^>]*>\\s*<v:imagedata[^>]*o:title=")[^"]*("[^/]*/>[^<]*</v:shape>[^<]*<o:OLEObject[^>]*r:id="${rid}")`,
        'g'
      );
      xmlStr = xmlStr.replace(olePattern, `$1${newCaption}$2`);
    }
    zip.file('word/document.xml', xmlStr);
  } catch (err) {
    console.warn('[generar-informe-perfiles] No se pudo actualizar OLE attrs:', err.message);
  }
}

export async function POST(request) {
  try {
    const valores = await request.json();

    const templatePath = join(process.cwd(), 'public', 'template-informe-perfiles.docx');
    const buffer = readFileSync(templatePath);
    const zip    = new PizZip(buffer);

    // Inyectar excels si vienen en el payload (de momento no se envían)
    injectEmbeddedExcels(zip, valores);
    normalizeAllXmlInZip(zip);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
      nullGetter:    () => '',
    });

    // Excluir del render los campos excel_* (son binarios, ya inyectados)
    const renderValores = { ...valores };
    for (const campo of Object.keys(EXCEL_RID_MAP)) {
      delete renderValores[campo];
    }
    doc.render(renderValores);

    const outputBuffer = doc.getZip().generate({
      type:        'nodebuffer',
      mimeType:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Informe_Certificacion_Perfiles.docx"',
        'Content-Length':      String(outputBuffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[generar-informe-perfiles] Error:', err);
    if (err?.properties?.errors?.length) {
      const details = err.properties.errors
        .map((e) => e.properties?.explanation || e.message || String(e))
        .join('; ');
      return NextResponse.json({ error: `Error en plantilla: ${details}` }, { status: 422 });
    }
    return NextResponse.json(
      { error: err?.message || 'Error interno al generar el informe' },
      { status: 500 }
    );
  }
}
