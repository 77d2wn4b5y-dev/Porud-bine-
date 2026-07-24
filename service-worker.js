const CACHE_NAME="trebovanje-v272-suggested-products";
const APP_FILES=["./","./index.html","./styles.css","./product-ui.css","./backup.css","./security.css","./supabase-sync.css","./order-ui-v211.css","./route-v23.css","./customer-module.css","./version-24.css","./settings-ios.css","./statistics.css","./price-lists.css","./dashboard.css","./app.js","./file-export.js","./report.js","./routes.js","./enhancements.js","./customers.js","./customer-module.js","./product-ui.js","./backup.js","./security.js","./supabase-sync.js","./order-ui-v211.js","./route-v23.js","./dashboard.js","./v24.js","./price-lists.js","./statistics.js","./settings-ios.js","./performance-v265.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",response.clone()));return response;}).catch(()=>caches.match("./index.html")));return;}
 event.respondWith(caches.match(event.request).then(cached=>{const update=fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));return response;}).catch(()=>cached);return cached||update;}));
});