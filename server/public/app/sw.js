const C="folio-app-v28",F=["./","index.html","app.js","notes.js","write.js","voice.js","glb.js","postit.js","fonts/od-400-normal.woff2","epub.min.js","jszip.min.js","manifest.json","icon.svg","decor/succ.svg","decor/snake.svg","decor/stack.svg","decor/bear.svg","decor/bunny.svg","decor/cat.svg","decor/lamp.svg","decor/globe.svg","decor/candle.svg","decor/hourglass.svg","decor/vase.svg","decor/cactus.svg","decor/mug.svg","decor/clock.svg","decor/owl.svg","decor/frame.svg","decor/bookend.svg","decor/brass.svg","decor/marble.svg","decor/divider.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:"reload"})))))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);
if(e.request.method!=="GET"||u.origin!==location.origin||!u.pathname.startsWith("/app/"))return;
// réseau d'abord (version à jour), cache en secours (hors ligne)
e.respondWith(fetch(e.request,{cache:"no-cache"}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r})
.catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))});
