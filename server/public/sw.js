// Ancien service worker (l'appli était à la racine) : il se retire et vide son cache ; l'appli a le sien dans /app/.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>!n.startsWith("folio-app")).map(n=>caches.delete(n))))
  .then(()=>self.registration.unregister()).then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.navigate(c.url)))));
