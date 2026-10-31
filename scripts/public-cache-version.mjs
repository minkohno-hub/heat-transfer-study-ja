// The distributed service worker must change whenever the shipped app or
// learning data change. A static service-worker version strands users on
// yesterday's offline textbook even after a successful Pages deployment.
import {createHash} from 'node:crypto';

export function publicCacheName(assets,pdfSha256) {
  if(!Array.isArray(assets)||assets.length===0||!assets.every(x=>x&&typeof x.path==='string'&&
    x.path.length>0&&(typeof x.content==='string'||Buffer.isBuffer(x.content)))||
    new Set(assets.map(x=>x.path)).size!==assets.length||
    typeof pdfSha256!=='string'||!/^[0-9a-f]{64}$/.test(pdfSha256))
    throw new Error('公開キャッシュの版計算に必要なファイルまたはPDFハッシュが不正です。');
  const hash=createHash('sha256');
  hash.update('heat-study-ja-public-build-v1\0').update(pdfSha256).update('\0');
  for(const asset of [...assets].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)){
    const bytes=Buffer.from(asset.content);
    hash.update(String(Buffer.byteLength(asset.path,'utf8'))).update(':').update(asset.path).update('\0');
    hash.update(String(bytes.length)).update(':').update(bytes).update('\0');
  }
  return 'heat-study-ja-app-'+hash.digest('hex').slice(0,16);
}

export function pdfCacheName(pdfSha256) {
  if(typeof pdfSha256!=='string'||!/^[0-9a-f]{64}$/.test(pdfSha256))
    throw new Error('PDFキャッシュの版計算に必要なPDFハッシュが不正です。');
  return 'heat-study-ja-pdf-'+pdfSha256.slice(0,16);
}

export function stampServiceWorker(source,cacheName,pdfName) {
  const marker=/^const CACHE_NAME='heat-study-ja-(?:v\d+|app-[0-9a-f]{16})';$/gm;
  const matches=[...source.matchAll(marker)];
  if(matches.length!==1||!/^heat-study-ja-app-[0-9a-f]{16}$/.test(cacheName))
    throw new Error('サービスワーカーのキャッシュ版を一意に設定できません。');
  const stamped=source.replace(marker,`const CACHE_NAME='${cacheName}';`);
  // The PDF cache is versioned separately: it must survive ordinary app
  // revisions (learners explicitly saved a 32 MB file) yet be replaced when
  // the shipped PDF itself changes. Callers that pass no PDF name are not
  // changing the PDF, so the existing cache name is left untouched.
  if(pdfName===undefined)return stamped;
  const pdfMarker=/^const PDF_CACHE_NAME='heat-study-ja-pdf-(?:v\d+|[0-9a-f]{16})';$/gm;
  const pdfMatches=[...stamped.matchAll(pdfMarker)];
  if(pdfMatches.length!==1||!/^heat-study-ja-pdf-[0-9a-f]{16}$/.test(pdfName))
    throw new Error('サービスワーカーのPDFキャッシュ版を一意に設定できません。');
  return stamped.replace(pdfMarker,`const PDF_CACHE_NAME='${pdfName}';`);
}
