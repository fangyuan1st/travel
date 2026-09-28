'use strict';
const VERSION = "414d3c55dea7d0f5";
const BASE = new URL('./', self.location.href);
const PREFIX = 'travel-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + VERSION;
const url = p => new URL(p, BASE).href;
let manifestPromise;
async function manifest(){
  if(!manifestPromise) manifestPromise=(async()=>{const c=await caches.open(CACHE);const r=await c.match(url('offline-manifest.json'));if(!r)throw Error('Offline manifest unavailable. Reload while online.');return r.json()})();
  return manifestPromise;
}
async function checkedFetch(asset){
  const r=await fetch(url(asset.url),{cache:'no-store',credentials:'same-origin'});
  if(!r.ok||r.redirected)throw Error('Unable to save '+asset.url);
  const bytes=await r.clone().arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==asset.sha256)throw Error('A file changed during saving. Reload and try again.');
  return r;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const r=await fetch(url('offline-manifest.json'),{cache:'no-store'});
  if(!r.ok)throw Error('Manifest unavailable');const m=await r.clone().json();
  if(m.version!==VERSION)throw Error('Version mismatch');
  const c=await caches.open(CACHE);await c.put(url('offline-manifest.json'),r);
  for(const asset of m.assets.filter(a=>a.group==='core'))await c.put(url(asset.url),await checkedFetch(asset));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // A new version deliberately reports incomplete until its complete pack is saved.
  // Keep older packs until a new complete download succeeds.
  await self.clients.claim();
})()));
const visibleAssets=(m,audience)=>m.assets.filter(a=>!a.audience||a.audience==='all'||a.audience===audience);
async function status(audience='family'){const m=await manifest(),assets=visibleAssets(m,audience),c=await caches.open(CACHE);let count=0;for(const a of assets)if(await c.match(url(a.url)))count++;return {ready:count===assets.length,count,total:assets.length,version:VERSION};}
let downloadRunning=false;
self.addEventListener('message',event=>{
  const port=event.ports[0];if(!port)return;
  event.waitUntil((async()=>{
    try{
      const audience=event.data.audience==='guest'?'guest':'family';
      if(event.data.type==='STATUS'){port.postMessage(await status(audience));return;}
      if(event.data.type!=='DOWNLOAD')return;
      if(downloadRunning)throw Error('A download is already running in another tab.');
      downloadRunning=true;
      try{const m=await manifest(),c=await caches.open(CACHE);let completed=0;
        const assets=visibleAssets(m,audience);for(const a of assets){
          if(!(await c.match(url(a.url))))await c.put(url(a.url),await checkedFetch(a));
          completed++;port.postMessage({type:'progress',completed,total:assets.length});
        }
        const result=await status(audience);
        // A complete pack is audience-specific. Family and guest ciphertext
        // are separate sets; requiring both would keep old versions forever.
        if(result.ready)for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
        port.postMessage(result);
      }finally{downloadRunning=false;}
    }catch(error){port.postMessage({error:error.message});}
  })());
});
async function rangedResponse(request,cached){
  const range=request.headers.get('range');if(!range)return cached;
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416});
  const bytes=await cached.arrayBuffer(),length=bytes.byteLength;
  let start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));
  let end=match[1]&&match[2]?Math.min(Number(match[2]),length-1):length-1;
  if(start>=length||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
  const headers=new Headers(cached.headers);headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
  const req=event.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==BASE.origin||!u.pathname.startsWith(BASE.pathname))return;
  event.respondWith((async()=>{
    const c=await caches.open(CACHE);const plain=new URL(u);plain.search='';plain.hash='';
    const root=plain.pathname===BASE.pathname;
    const cached=await c.match(root?url('index.html'):plain.href);
    if(cached)return rangedResponse(req,cached);
    try{
      const m=await manifest(),asset=m.assets.find(a=>url(a.url)===plain.href);
      if(asset){const response=await checkedFetch(asset);await c.put(plain.href,response.clone());return rangedResponse(req,response)}
      return await fetch(req)
    }catch{
      if(req.mode==='navigate'&&!/\.(pdf|webp|png)$/i.test(u.pathname))return await c.match(url('index.html'))||new Response('Reconnect to download the guide.',{status:503,headers:{'Content-Type':'text/plain'}});
      return new Response('This file has not been saved offline. Reconnect and save the complete pack.',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
