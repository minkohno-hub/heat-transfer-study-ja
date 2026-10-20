const CACHE_NAME='heat-study-ja-v4';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./study-core.mjs','./manifest.json',
  './data/book.json','./data/questions.json','./data/glossary.json','./data/content-manifest.json',
  './data/sections/1-1-ja.json','./data/sections/1-1-en.json','./data/sections/1-2-ja.json','./data/sections/1-2-en.json',
  './data/figures/fig1-1-021.png','./data/figures/fig1-2-023.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('heat-study-ja-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_CONTENT'||!Array.isArray(event.data.urls))return;
  const urls=[...new Set(event.data.urls)].filter(p=>typeof p==='string'&&p.startsWith('./data/')&&!p.includes('..')&&!/[?#]/.test(p)).slice(0,500);
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urls)).then(()=>event.source?.postMessage({type:'CONTENT_CACHE_RESULT',ok:true})).catch(()=>event.source?.postMessage({type:'CONTENT_CACHE_RESULT',ok:false})));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try {
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone());
      return response;
    }catch {
      const cached=await cache.match(event.request);if(cached)return cached;
      if(event.request.mode==='navigate'){const shell=await cache.match('./index.html');if(shell)return shell;}
      return new Response('このファイルはオフライン保存されていません。ネット接続中に開いてください。',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
    }
  })());
});
