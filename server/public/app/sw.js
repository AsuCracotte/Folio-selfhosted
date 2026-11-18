const C="folio-app-v7",F=["./","index.html","app.js","notes.js","epub.min.js","jszip.min.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:"reload"})))))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);
if(e.request.method!=="GET"||u.origin!==location.origin||!u.pathname.startsWith("/app/"))return;
// réseau d'abord (version à jour), cache en secours (hors ligne)
e.respondWith(fetch(e.request,{cache:"no-cache"}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r})
.catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))});
