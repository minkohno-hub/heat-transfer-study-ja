const CACHE_NAME='heat-study-ja-v8';
const PDF_CACHE_NAME='heat-study-ja-pdf-v1';
const PDF_URL='./book/AHTTv600.pdf';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./study-core.mjs','./guide.mjs','./manifest.json',
  './data/book.json','./data/questions.json','./data/glossary.json','./data/content-manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('heat-study-ja-')&&k!==CACHE_NAME&&k!==PDF_CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('message',event=>{
  if(event.data?.type==='CHECK_PDF_CACHE'){
    event.waitUntil(caches.open(PDF_CACHE_NAME).then(cache=>cache.match(PDF_URL)).then(response=>event.source?.postMessage({type:'PDF_CACHE_STATUS',cached:Boolean(response)})).catch(()=>event.source?.postMessage({type:'PDF_CACHE_STATUS',cached:false,error:true})));
    return;
  }
  if(event.data?.type==='CACHE_PDF'){
    event.waitUntil((async()=>{
      try {const cache=await caches.open(PDF_CACHE_NAME);if(!await cache.match(PDF_URL))await cache.add(PDF_URL);event.source?.postMessage({type:'PDF_CACHE_RESULT',ok:true});}
      catch {event.source?.postMessage({type:'PDF_CACHE_RESULT',ok:false});}
    })());return;
  }
  if(event.data?.type!=='CACHE_CONTENT'||!Array.isArray(event.data.urls))return;
  const urls=[...new Set(event.data.urls)].filter(p=>typeof p==='string'&&p.startsWith('./data/')&&!p.includes('..')&&!/[?#]/.test(p)).slice(0,500);
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urls)).then(()=>event.source?.postMessage({type:'CONTENT_CACHE_RESULT',ok:true})).catch(()=>event.source?.postMessage({type:'CONTENT_CACHE_RESULT',ok:false})));
});
async function cachedPdfRange(response,rangeHeader){
  const bytes=new Uint8Array(await response.arrayBuffer());
  const match=/^bytes=(\d*)-(\d*)$/.exec(rangeHeader||'');
  if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
  let start=match[1]===''?null:Number(match[1]);
  let end=match[2]===''?null:Number(match[2]);
  if(start===null&&end!==null){start=Math.max(0,bytes.length-end);end=bytes.length-1;}
  else if(start!==null&&end===null)end=bytes.length-1;
  if(start===null||end===null||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=bytes.length||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
  end=Math.min(end,bytes.length-1);
  const slice=bytes.slice(start,end+1);
  return new Response(slice,{status:206,headers:{'Content-Type':'application/pdf','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':String(slice.length)}});
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const isPdf=new URL(event.request.url).pathname.endsWith('/book/AHTTv600.pdf');
    const pdfCache=isPdf?await caches.open(PDF_CACHE_NAME):null;
    const range=event.request.headers.get('range');
    if(isPdf&&range&&/^bytes=(\d*)-(\d*)$/.test(range)){const stored=await pdfCache.match(PDF_URL);if(stored)return cachedPdfRange(stored,range);}
    try {
      const response=await fetch(event.request);
      if(!isPdf&&response.status===200)try{await cache.put(event.request,response.clone());}catch{}
      return response;
    }catch {
      const cached=isPdf?await pdfCache.match(PDF_URL):await cache.match(event.request);if(cached)return range?cachedPdfRange(cached,range):cached;
      if(!isPdf&&event.request.mode==='navigate'){const shell=await cache.match('./index.html');if(shell)return shell;}
      return new Response('このファイルはオフライン保存されていません。ネット接続中に開いてください。',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
    }
  })());
});
