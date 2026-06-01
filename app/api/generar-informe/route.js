/**
 * POST /api/generar-informe — v23.1
 *
 * Cambios v23.1 (sobre v21.1):
 *   - El template-informe.docx ya tiene los Excel incrustados con nombres
 *     legibles (Hallazgos_AD.xlsx, etc.). Al inyectar los buffers reales,
 *     se escribe en esos mismos nombres (sin rename necesario).
 *   - Se actualiza el atributo name y caption del <o:OLEObject> para que
 *     coincida con el nombre del archivo.
 *   - Se eliminó la lógica de rename de archivos (ya innecesaria).
 *
 * Mantenido de v21.1:
 *   - normalizeAllXmlInZip: corrige prefijos nsN: → estándar OOXML.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const URI_TO_STD_PREFIX = {
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main':           'w',
  'http://schemas.openxmlformats.org/markup-compatibility/2006':            'mc',
  'http://schemas.microsoft.com/office/word/2010/wordml':                   'w14',
  'http://schemas.microsoft.com/office/word/2012/wordml':                   'w15',
  'http://schemas.microsoft.com/office/word/2016/wordml/cid':               'w16cid',
  'http://schemas.microsoft.com/office/word/2018/wordml':                   'w16',
  'http://schemas.microsoft.com/office/word/2018/wordml/cex':               'w16cex',
  'http://schemas.microsoft.com/office/word/2015/wordml/symex':             'w16se',
  'http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash':       'w16sdtdh',
  'http://schemas.microsoft.com/office/word/2023/wordml/word16du':          'w16du',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships':    'r',
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing': 'wp',
  'http://schemas.openxmlformats.org/drawingml/2006/main':                  'a',
  'http://schemas.openxmlformats.org/drawingml/2006/picture':               'pic',
  'urn:schemas-microsoft-com:vml':                                           'v',
  'urn:schemas-microsoft-com:office:office':                                 'o',
  'urn:schemas-microsoft-com:office:word':                                   'w10',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingShape':      'wps',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas':     'wpc',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup':      'wpg',
  'http://schemas.microsoft.com/office/word/2010/wordprocessingInk':        'wpi',
  'http://schemas.microsoft.com/office/word/2006/wordml':                   'wne',
  'http://schemas.microsoft.com/office/drawing/2014/chartex':               'cx',
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
    out = out.replace(new RegExp(`<${local}:`, 'g'),   `<${std}:`);
    out = out.replace(new RegExp(`</${local}:`, 'g'),  `</${std}:`);
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

// ── Mapa campo → rId y nombre nuevo del archivo ───────────────────────────
// `file` = nombre con el que se guarda el archivo en el zip (nombre genérico).
// `rid`  = rId en document.xml.rels que apunta al Excel embebido.
// La inyección busca el Target ACTUAL del rId en el template para no depender
// del nombre que tenga el archivo en el template original.
const EXCEL_RID_MAP = {
  excel_ad:    { rid: 'rId16', file: 'word/embeddings/Hallazgos_AD.xlsx',      short: 'Hallazgos_AD',    caption: 'Hallazgos Active Directory.xlsx'       },
  excel_apps:  { rid: 'rId18', file: 'word/embeddings/Hallazgos_Apps.xlsx',    short: 'Hallazgos_Apps',  caption: 'Hallazgos Aplicaciones Criticas.xlsx'  },
  excel_bd:    { rid: 'rId20', file: 'word/embeddings/Hallazgos_BD.xlsx',      short: 'Hallazgos_BD',    caption: 'Hallazgos Base de Datos Criticas.xlsx' },
  excel_entra: { rid: 'rId22', file: 'word/embeddings/Hallazgos_EntraID.xlsx', short: 'Hallazgos_Entra', caption: 'Hallazgos EntraID.xlsx'                },
};

/** Lee el Target actual de un rId desde word/_rels/document.xml.rels del zip. */
function getRidTarget(zip, rid) {
  try {
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) return null;
    const relsXml = relsFile.asText();
    // Dos órdenes posibles de atributos en <Relationship>
    let m = relsXml.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`));
    if (!m) m = relsXml.match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`));
    if (!m) return null;
    const target = m[1]; // relativo a word/, ej: "embeddings/Microsoft_Excel_Worksheet.xlsx"
    return `word/${target}`;
  } catch {
    return null;
  }
}

function injectEmbeddedExcels(zip, valores) {
  // Paso 1: inyectar buffers y renombrar archivos en el zip
  // Leemos el Target ACTUAL de cada rId desde el .rels (funciona con cualquier template).
  for (const [campo, { rid, file: newFile }] of Object.entries(EXCEL_RID_MAP)) {
    const b64 = valores[campo];
    if (!b64 || typeof b64 !== 'string') continue;
    try {
      const oldFile = getRidTarget(zip, rid); // ruta actual en el template
      const buffer = Buffer.from(b64, 'base64');
      // Escribir con el nombre nuevo
      zip.file(newFile, buffer);
      // Si el nombre cambió, borrar el viejo
      if (oldFile && oldFile !== newFile && zip.file(oldFile)) {
        zip.remove(oldFile);
      }
    } catch (err) {
      console.warn(`[generar-informe] No se pudo inyectar ${campo}:`, err.message);
    }
  }

  // Paso 2: actualizar word/_rels/document.xml.rels — Target de cada rId
  try {
    const relsPath = 'word/_rels/document.xml.rels';
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      let relsXml = relsFile.asText();
      for (const [campo, { rid, file: newFile }] of Object.entries(EXCEL_RID_MAP)) {
        if (!valores[campo]) continue;
        const newTarget = newFile.replace('word/', ''); // relativo a word/
        // Reemplazar Target para este rId (dos órdenes posibles de atributos)
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
    console.warn('[generar-informe] No se pudo actualizar .rels:', err.message);
  }

  // Paso 3: actualizar atributo name y o:title del <o:OLEObject> en document.xml
  try {
    const docXml = zip.file('word/document.xml');
    if (!docXml) return;
    let xmlStr = docXml.asText();

    for (const [campo, { rid, short: newName, caption: newCaption }] of Object.entries(EXCEL_RID_MAP)) {
      if (!valores[campo]) continue;

      // name= del OLEObject (dos órdenes posibles de atributos)
      xmlStr = xmlStr.replace(
        new RegExp(`(<o:OLEObject[^>]*r:id="${rid}"[^>]*name=")[^"]*(")`,'g'),
        `$1${newName}$2`
      );
      xmlStr = xmlStr.replace(
        new RegExp(`(<o:OLEObject[^>]*name=")[^"]*("[^>]*r:id="${rid}")`,'g'),
        `$1${newName}$2`
      );

      // o:title en <v:imagedata> asociado a este OLE
      // El imagedata tiene r:id que apunta a la imagen EMF del ícono (rId15, rId17, etc.)
      // Para encontrarlo, buscamos el bloque <w:object> que contiene este rid
      const olePattern = new RegExp(
        `(<w:object[^>]*>\s*<v:shape[^>]*>\s*<v:imagedata[^>]*o:title=")[^"]*("[^/]*/>[^<]*</v:shape>[^<]*<o:OLEObject[^>]*r:id="${rid}")`,
        'g'
      );
      xmlStr = xmlStr.replace(olePattern, `$1${newCaption}$2`);
    }

    zip.file('word/document.xml', xmlStr);
  } catch (err) {
    console.warn('[generar-informe] No se pudo actualizar OLE attrs:', err.message);
  }
}

export async function POST(request) {
  try {
    const valores = await request.json();

    const templatePath = join(process.cwd(), 'public', 'template-informe.docx');
    const buffer = readFileSync(templatePath);
    const zip = new PizZip(buffer);

    injectEmbeddedExcels(zip, valores);
    normalizeAllXmlInZip(zip);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
      nullGetter:    () => '',
    });

    const renderValores = { ...valores };
    for (const campo of Object.keys(EXCEL_RID_MAP)) {
      delete renderValores[campo];
    }
    doc.render(renderValores);

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Informe_Certificacion.docx"',
        'Content-Length':      String(outputBuffer.length),
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[generar-informe] Error:', err);
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
