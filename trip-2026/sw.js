// Retire the former trip address so cached installations follow the new URL.
const OLD=new URL('./',self.location.href);
const NEXT=new URL('../2026-11-22-us-west-coast/',OLD);
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const prefix='travel-'+encodeURIComponent(OLD.pathname)+'-';
 for(const key of await caches.keys())if(key.startsWith(prefix))await caches.delete(key);
 await self.clients.claim();
 const clients=await self.clients.matchAll({type:'window'});
 await self.registration.unregister();
 await Promise.all(clients.filter(c=>new URL(c.url).pathname.startsWith(OLD.pathname)).map(c=>{const u=new URL(c.url);return c.navigate(NEXT.href+u.search+u.hash)}));
})()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(Promise.resolve(Response.redirect(NEXT.href,302)))});
