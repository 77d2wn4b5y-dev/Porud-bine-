const CACHE_NAME="trebovanje-v2603-carry-over-customers";
const APP_FILES=["./","./index.html","./styles.css","./product-ui.css","./backup.css","./security.css","./supabase-sync.css","./order-ui-v211.css","./route-v23.css","./version-24.css","./settings-ios.css","./statistics.css","./price-lists.css","./app.js","./file-export.js","./report.js","./routes.js","./enhancements.js","./customers.js","./product-ui.js","./backup.js","./security.js","./supabase-sync.js","./order-ui-v211.js","./route-v23.js","./v24.js","./price-lists.js","./statistics.js","./settings-ios.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const requestUrl=new URL(event.request.url);
 if(requestUrl.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
  return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html"))));
});