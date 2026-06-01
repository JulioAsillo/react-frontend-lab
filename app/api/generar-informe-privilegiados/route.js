/**
 * POST /api/generar-informe-privilegiados — v24.5
 *
 * Genera el informe de certificación de Privilegiados (.docx) usando
 * public/template-informe-privilegiados.docx como base.
 *
 * Excels incrustados — mapa rId → contenido:
 *   excel_ad_apps  → rId14 → Active Directory + Apps Críticas
 *   excel_serv     → rId16 → Servidores Apps Críticas
 *   excel_bd       → rId18 → Base de datos Apps Críticas
 *   excel_mfa      → rId20 → MFA
 *   excel_infra    → rId22 → Infraestructura (último)
 */

import { NextResponse } from 'next/server';
import { readFileSync }  from 'fs';
import { join }          from 'path';
import PizZip            from 'pizzip';
import Docxtemplater     from 'docxtemplater';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const re = /xmlns:(ns\d+)="([^"]+)"/g;
  const map = {};
  let m;
  while ((m = re.exec(xml)) !== null) {
    const std = URI_TO_STD_PREFIX[m[2]];
    if (std) map[m[1]] = std;
  }
  if (!Object.keys(map).length) return xml;
  let out = xml;
  for (const [l, s] of Object.entries(map)) out = out.replace(new RegExp(`xmlns:${l}="`, 'g'), `xmlns:${s}="`);
  for (const l of Object.keys(map).sort((a,b) => b.length-a.length)) {
    const s = map[l];
    out = out.replace(new RegExp(`<${l}:`, 'g'), `<${s}:`).replace(new RegExp(`</${l}:`, 'g'), `</${s}:`).replace(new RegExp(`(\\s)${l}:`, 'g'), `$1${s}:`);
  }
  return out;
}

function normalizeAllXmlInZip(zip) {
  for (const f of Object.keys(zip.files)) {
    if (zip.files[f].dir || (!f.endsWith('.xml') && !f.endsWith('.rels'))) continue;
    const orig = zip.files[f].asText(), norm = normalizeXml(orig);
    if (norm !== orig) zip.file(f, norm);
  }
}

// Mapa verificado contra el .docx real (hojas embebidas):
//   rId14 = Domain Admin + Local Admin   (H#_DA, H#_LA)
//   rId16 = Apps Críticas                (H#_SDP, H#_NPAC, H#_SIT, ...)
//   rId18 = Servidores Windows + Linux   (H#_WINDOWS, H#_LINUX)
//   rId20 = DBA / Oracle (+ SysAdmin)    (H#_ORACLE, ...)
//   rId22 = MFA                          (H#_MFA)
const EXCEL_RID_MAP = {
  excel_domain_local: { rid: 'rId14', file: 'word/embeddings/Hallazgos_DomainLocal.xlsx', short: 'Hallazgos_DomainLocal', caption: 'Hallazgos Domain y Local Admin.xlsx' },
  excel_apps:         { rid: 'rId16', file: 'word/embeddings/Hallazgos_Apps_Priv.xlsx',   short: 'Hallazgos_Apps_Priv', caption: 'Hallazgos Aplicaciones Criticas.xlsx' },
  excel_servidores:   { rid: 'rId18', file: 'word/embeddings/Hallazgos_Servidores.xlsx',  short: 'Hallazgos_Servidores', caption: 'Hallazgos Servidores.xlsx'           },
  excel_dba:          { rid: 'rId20', file: 'word/embeddings/Hallazgos_DBA.xlsx',          short: 'Hallazgos_DBA',       caption: 'Hallazgos Base de Datos.xlsx'         },
  excel_mfa:          { rid: 'rId22', file: 'word/embeddings/Hallazgos_MFA.xlsx',          short: 'Hallazgos_MFA',       caption: 'Hallazgos MFA.xlsx'                   },
};

function getRidTarget(zip, rid) {
  try {
    const xml = zip.file('word/_rels/document.xml.rels')?.asText();
    if (!xml) return null;
    const m = xml.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`)) ||
              xml.match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`));
    return m ? `word/${m[1]}` : null;
  } catch { return null; }
}

function injectEmbeddedExcels(zip, valores) {
  for (const [campo, { rid, file: nf }] of Object.entries(EXCEL_RID_MAP)) {
    const b64 = valores[campo];
    if (!b64 || typeof b64 !== 'string') continue;
    try {
      const old = getRidTarget(zip, rid);
      zip.file(nf, Buffer.from(b64, 'base64'));
      if (old && old !== nf && zip.file(old)) zip.remove(old);
    } catch (e) { console.warn(`inject ${campo}:`, e.message); }
  }
  try {
    const rp = 'word/_rels/document.xml.rels';
    let rx = zip.file(rp)?.asText();
    if (rx) {
      for (const [c, { rid, file: nf }] of Object.entries(EXCEL_RID_MAP)) {
        if (!valores[c]) continue;
        const t = nf.replace('word/', '');
        rx = rx.replace(new RegExp(`(Id="${rid}"[^>]*Target=")[^"]*(")`,'g'),`$1${t}$2`)
               .replace(new RegExp(`(Target=")[^"]*("[^>]*Id="${rid}")`,'g'),`$1${t}$2`);
      }
      zip.file(rp, rx);
    }
  } catch (e) { console.warn('rels update:', e.message); }
  try {
    let dx = zip.file('word/document.xml')?.asText();
    if (dx) {
      for (const [c, { rid, short: sn, caption: cp }] of Object.entries(EXCEL_RID_MAP)) {
        if (!valores[c]) continue;
        dx = dx.replace(new RegExp(`(<o:OLEObject[^>]*r:id="${rid}"[^>]*name=")[^"]*(")`,'g'),`$1${sn}$2`)
               .replace(new RegExp(`(<o:OLEObject[^>]*name=")[^"]*("[^>]*r:id="${rid}")`,'g'),`$1${sn}$2`)
               .replace(new RegExp(`(<w:object[^>]*>\\s*<v:shape[^>]*>\\s*<v:imagedata[^>]*o:title=")[^"]*("[^/]*/>[^<]*</v:shape>[^<]*<o:OLEObject[^>]*r:id="${rid}")`,'g'),`$1${cp}$2`);
      }
      zip.file('word/document.xml', dx);
    }
  } catch (e) { console.warn('OLE update:', e.message); }
}

export async function POST(request) {
  try {
    const valores = await request.json();
    const zip = new PizZip(readFileSync(join(process.cwd(), 'public', 'template-informe-privilegiados.docx')));
    injectEmbeddedExcels(zip, valores);
    normalizeAllXmlInZip(zip);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
    const rv = { ...valores };
    for (const k of Object.keys(EXCEL_RID_MAP)) delete rv[k];
    doc.render(rv);
    const buf = doc.getZip().generate({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Informe_Certificacion_Privilegiados.docx"',
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[generar-informe-privilegiados]', err);
    if (err?.properties?.errors?.length) {
      const d = err.properties.errors.map(e => e.properties?.explanation || e.message).join('; ');
      return NextResponse.json({ error: `Error en plantilla: ${d}` }, { status: 422 });
    }
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}
