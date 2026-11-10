/* Service worker : permet d'ouvrir l'appli sans connexion.
   Il ne touche jamais aux données des classes (stockées dans le navigateur). */
const CACHE='athle12-v1';
const FILES=['./','index.html','manifest.json','apple-touch-icon.png','icon-192.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE)
    .then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{}))))
    .then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k.indexOf('athle12-')===0&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

/* Réseau d'abord (pour recevoir les mises à jour), cache si hors connexion ou réseau trop lent */
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  if(new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(handle(req));
});

async function handle(req){
  const cache=await caches.open(CACHE);
  try{
    const res=await Promise.race([fetch(req),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),4000))]);
    if(res&&res.ok)cache.put(req,res.clone()).catch(()=>{});
    return res;
  }catch(err){
    const hit=await cache.match(req,{ignoreSearch:true});
    if(hit)return hit;
    if(req.mode==='navigate'){
      const idx=(await cache.match('index.html'))||(await cache.match('./'));
      if(idx)return idx;
    }
    return Response.error();
  }
}
