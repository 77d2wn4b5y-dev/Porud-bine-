(()=>{
 const SUPABASE_URL="https://ijlchasrwxgztrbpvwbw.supabase.co";
 const SUPABASE_KEY="sb_publishable_BR3JCHMYtnBWhS93JJXlfg_emPXekxL";
 const META_KEY="porudzbine-cloud-meta-v1";
 const AUTH_KEY="sb-ijlchasrwxgztrbpvwbw-auth-token";
 const EXCLUDED=["porudzbine-security-v1","porudzbine-local-backups-v1",META_KEY];
 let client=null,session=null,syncing=false,uploadTimer=null;
 const $=id=>document.getElementById(id);
 const ui={status:$("cloudStatus"),email:$("cloudEmail"),password:$("cloudPassword"),signIn:$("cloudSignInBtn"),signUp:$("cloudSignUpBtn"),signOut:$("cloudSignOutBtn"),sync:$("cloudSyncBtn"),download:$("cloudDownloadBtn"),info:$("cloudInfo")};
 function toast(m){if(typeof showToast==="function")showToast(m);else alert(m)}
 function setInfo(m,error=false){if(ui.info){ui.info.textContent=m||"";ui.info.classList.toggle("cloud-error",!!error)}}
 function meta(){try{return JSON.parse(localStorage.getItem(META_KEY)||"{}")}catch{return{}}}
 function saveMeta(v){localStorage.setItem(META_KEY,JSON.stringify({...meta(),...v}))}
 function formatSyncTime(v){if(!v)return"";try{return new Intl.DateTimeFormat("sr-RS",{dateStyle:"short",timeStyle:"medium"}).format(new Date(v))}catch{return v}}
 function isSyncKey(k){return k&&k.startsWith("porudzbine-")&&!EXCLUDED.includes(k)&&!k.startsWith("porudzbine-security")&&!k.startsWith("porudzbine-local-backup")&&!k.startsWith("porudzbine-cloud-")&&!k.startsWith("porudzbine-supabase-")}
 function snapshot(){const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(isSyncKey(k))data[k]=localStorage.getItem(k)}return data}
 function hasBusinessData(data=snapshot()){try{const raw=JSON.parse(data["porudzbine-app-v2"]||"{}");return!!(raw.orders?.length||Object.keys(raw.customers||{}).length||raw.products?.length)}catch{return Object.keys(data).length>0}}
 function parseJson(v,fallback){try{return JSON.parse(v)}catch{return fallback}}
 function mergeAppState(remoteValue,localValue){
  const r=parseJson(remoteValue,{})||{},l=parseJson(localValue,{})||{};
  const orderMap=new Map();
  [...(r.orders||[]),...(l.orders||[])].forEach(o=>{if(o?.id)orderMap.set(o.id,o);else if(o)orderMap.set(`${o.customer}|${o.createdAt}|${JSON.stringify(o.items||{})}`,o)});
  const orders=[...orderMap.values()].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  const products=[...new Set([...(r.products||[]),...(l.products||[])])];
  const customers={...(r.customers||{}),...(l.customers||{})};
  return JSON.stringify({...r,...l,products,customers,orders});
 }
 function mergeRoutes(remoteValue,localValue){
  const r=parseJson(remoteValue,{})||{},l=parseJson(localValue,{})||{},out={...r};
  Object.keys(l).forEach(day=>{out[day]=[...new Set([...(r[day]||[]),...(l[day]||[])])]});
  return JSON.stringify(out);
 }
 function mergeSnapshots(remote={},local=snapshot()){
  const merged={...remote,...local};
  if(remote["porudzbine-app-v2"]||local["porudzbine-app-v2"])merged["porudzbine-app-v2"]=mergeAppState(remote["porudzbine-app-v2"],local["porudzbine-app-v2"]);
  if(remote["porudzbine-routes-v1"]||local["porudzbine-routes-v1"])merged["porudzbine-routes-v1"]=mergeRoutes(remote["porudzbine-routes-v1"],local["porudzbine-routes-v1"]);
  return merged;
 }
 function applySnapshot(data,{merge=true}={}){
  if(!data||typeof data!=="object")return;
  syncing=true;
  const finalData=merge?mergeSnapshots(data,snapshot()):data;
  Object.entries(finalData).forEach(([k,v])=>{if(isSyncKey(k)&&typeof v==="string")localStorage.setItem(k,v)});
  syncing=false;
 }
 function render(){const email=session?.user?.email||"";const last=meta().lastSuccess||meta().lastUpload||meta().lastRemote||"";if(ui.status)ui.status.textContent=email?`Povezano: ${email}`:"Nije povezano sa oblakom";[ui.email,ui.password,ui.signIn,ui.signUp].forEach(el=>el?.classList.toggle("hidden",!!email));[ui.signOut,ui.sync,ui.download].forEach(el=>el?.classList.toggle("hidden",!email));if(email&&last)setInfo(`Poslednja uspešna sinhronizacija: ${formatSyncTime(last)}`)}
 function setBusy(busy,label="Sinhronizacija…"){[ui.sync,ui.download].forEach(el=>{if(el)el.disabled=busy});if(busy)setInfo(label)}
 async function upload(showMessage=false){if(!session||syncing)return;clearTimeout(uploadTimer);syncing=true;setBusy(true,"Šaljem podatke u oblak…");try{const payload=snapshot();const now=new Date().toISOString();const{error}=await client.from("app_sync").upsert({user_id:session.user.id,payload,updated_at:now},{onConflict:"user_id"});if(error)throw error;saveMeta({lastUpload:now,lastRemote:now,lastSuccess:now,localChangedAt:""});setInfo(`Uspešno sinhronizovano: ${formatSyncTime(now)}`);if(showMessage)toast("Podaci su uspešno sinhronizovani")}catch(e){console.error(e);setInfo("Sinhronizacija nije uspela: "+(e.message||e),true)}finally{syncing=false;setBusy(false)}}
 async function download(force=false){if(!session||syncing)return;syncing=true;setBusy(true,"Preuzimam podatke iz oblaka…");try{const{data,error}=await client.from("app_sync").select("payload,updated_at").eq("user_id",session.user.id).maybeSingle();if(error)throw error;if(!data){setInfo(hasBusinessData()?"U oblaku još nema podataka. Pritisni Pošalji podatke u oblak.":"U oblaku još nema podataka.");return}applySnapshot(data.payload,{merge:!force});const now=new Date().toISOString();saveMeta({lastRemote:data.updated_at,lastSuccess:now,localChangedAt:""});setInfo(`Podaci su preuzeti i sačuvani: ${formatSyncTime(now)}`);toast("Cloud podaci su spojeni sa podacima na uređaju");setTimeout(()=>location.reload(),500)}catch(e){console.error(e);setInfo("Preuzimanje nije uspelo: "+(e.message||e),true)}finally{syncing=false;setBusy(false)}}
 async function initialSync(){
  if(!session||syncing)return;syncing=true;
  try{
   const{data,error}=await client.from("app_sync").select("payload,updated_at").eq("user_id",session.user.id).maybeSingle();
   if(error){setInfo("Baza još nije podešena. Pokreni SQL skriptu iz uputstva.",true);return}
   if(!data){syncing=false;if(hasBusinessData())await upload(false);return}
   const m=meta(),localData=snapshot(),localHas=hasBusinessData(localData),remoteHas=hasBusinessData(data.payload||{});
   const knownRemote=m.lastRemote||"",localDirty=!!m.localChangedAt;
   if(!knownRemote&&localHas&&remoteHas){
    applySnapshot(data.payload,{merge:true});
    const now=new Date().toISOString();saveMeta({lastRemote:data.updated_at,lastSuccess:now,localChangedAt:now});
    syncing=false;await upload(false);return;
   }
   if(localDirty&&data.updated_at>knownRemote){
    applySnapshot(data.payload,{merge:true});
    const now=new Date().toISOString();saveMeta({lastRemote:data.updated_at,lastSuccess:now,localChangedAt:now});
    syncing=false;await upload(false);return;
   }
   if(!localDirty&&(!localHas||data.updated_at>knownRemote)){
    applySnapshot(data.payload,{merge:true});
    const now=new Date().toISOString();saveMeta({lastRemote:data.updated_at,lastSuccess:now,localChangedAt:""});
    setInfo(`Podaci su bezbedno nadograđeni: ${formatSyncTime(now)}`);
    setTimeout(()=>location.reload(),500);return;
   }
   if(localDirty){syncing=false;await upload(false);return}
   saveMeta({lastRemote:data.updated_at,lastSuccess:m.lastSuccess||data.updated_at});
   setInfo(`Podaci su ažurni: ${formatSyncTime(m.lastSuccess||data.updated_at)}`);
  }catch(e){console.error(e);setInfo("Sinhronizacija nije uspela: "+(e.message||e),true)}finally{syncing=false}
 }
 function scheduleUpload(){if(!session||syncing)return;clearTimeout(uploadTimer);uploadTimer=setTimeout(()=>upload(false),1200)}
 const originalSet=Storage.prototype.setItem,originalRemove=Storage.prototype.removeItem;
 Storage.prototype.setItem=function(k,v){originalSet.call(this,k,v);if(this===localStorage&&isSyncKey(k)&&!syncing){saveMeta({localChangedAt:new Date().toISOString()});scheduleUpload()}};
 Storage.prototype.removeItem=function(k){originalRemove.call(this,k);if(this===localStorage&&isSyncKey(k)&&!syncing){saveMeta({localChangedAt:new Date().toISOString()});scheduleUpload()}};
 async function signIn(create=false){const email=ui.email?.value.trim(),password=ui.password?.value||"";if(!email||password.length<6){setInfo("Unesi email i lozinku od najmanje 6 znakova.",true);return}setInfo("Povezivanje…");const result=create?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(result.error){setInfo(result.error.message,true);return}session=result.data.session;if(create&&!session){setInfo("Nalog je napravljen. Proveri email i potvrdi registraciju.");return}render();setInfo("Uspešno povezano. Pokrećem bezbednu sinhronizaciju…");await initialSync()}
 async function init(){if(!window.supabase?.createClient){setInfo("Supabase biblioteka nije učitana.",true);return}client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storage:localStorage,storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const{data}=await client.auth.getSession();session=data.session;render();client.auth.onAuthStateChange((_event,s)=>{session=s;render()});if(session)await initialSync()}
 ui.signIn?.addEventListener("click",()=>signIn(false));ui.signUp?.addEventListener("click",()=>signIn(true));ui.signOut?.addEventListener("click",async()=>{await client.auth.signOut();session=null;render();setInfo("Odjavljeno. Lokalni podaci ostaju na uređaju.")});ui.sync?.addEventListener("click",()=>upload(true));ui.download?.addEventListener("click",()=>{if(confirm("Preuzeti podatke iz oblaka i spojiti ih sa lokalnim podacima na ovom uređaju?"))download(false)});
 window.addEventListener("online",()=>{if(session)initialSync()});
 init();
})();