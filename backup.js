(()=>{
 const BACKUP_KEY="porudzbine-local-backups-v1";
 const MAX_BACKUPS=30;
 let suspended=false;
 let timer=null;
 const originalSetItem=Storage.prototype.setItem;
 const originalRemoveItem=Storage.prototype.removeItem;
 const originalClear=Storage.prototype.clear;

 function isAppKey(key){return String(key).startsWith("porudzbine-")&&key!==BACKUP_KEY;}
 function readBackups(){
  try{const value=JSON.parse(localStorage.getItem(BACKUP_KEY)||"[]");return Array.isArray(value)?value:[];}catch{return[];}
 }
 function collectData(){
  const data={};
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(isAppKey(key))data[key]=localStorage.getItem(key);
  }
  return data;
 }
 function signature(data){
  return Object.keys(data).sort().map(k=>`${k}:${data[k]}`).join("|");
 }
 function saveBackup(reason="Automatska kopija",force=false){
  if(suspended)return;
  const data=collectData();
  const backups=readBackups();
  const latest=backups[0];
  if(!force&&latest&&signature(latest.data||{})===signature(data))return;
  backups.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,createdAt:new Date().toISOString(),reason,data});
  suspended=true;
  try{originalSetItem.call(localStorage,BACKUP_KEY,JSON.stringify(backups.slice(0,MAX_BACKUPS)));}finally{suspended=false;}
  renderBackups();
 }
 function scheduleBackup(reason){
  clearTimeout(timer);
  timer=setTimeout(()=>saveBackup(reason),250);
 }
 Storage.prototype.setItem=function(key,value){
  const result=originalSetItem.call(this,key,value);
  if(this===localStorage&&!suspended&&isAppKey(key))scheduleBackup("Automatski posle izmene");
  return result;
 };
 Storage.prototype.removeItem=function(key){
  const result=originalRemoveItem.call(this,key);
  if(this===localStorage&&!suspended&&isAppKey(key))scheduleBackup("Automatski posle brisanja");
  return result;
 };
 Storage.prototype.clear=function(){
  if(this!==localStorage)return originalClear.call(this);
  const backups=localStorage.getItem(BACKUP_KEY);
  const result=originalClear.call(this);
  if(backups)originalSetItem.call(localStorage,BACKUP_KEY,backups);
  if(!suspended)scheduleBackup("Automatski posle brisanja podataka");
  return result;
 };
 function formatDate(value){return new Intl.DateTimeFormat("sr-RS",{dateStyle:"short",timeStyle:"short"}).format(new Date(value));}
 function restoreBackup(id){
  const backup=readBackups().find(b=>b.id===id);if(!backup)return;
  if(!confirm(`Vratiti podatke iz kopije od ${formatDate(backup.createdAt)}? Trenutno stanje će prvo biti sačuvano.`))return;
  saveBackup("Pre vraćanja kopije",true);
  suspended=true;
  try{
   const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(isAppKey(key))keys.push(key);}
   keys.forEach(key=>originalRemoveItem.call(localStorage,key));
   Object.entries(backup.data||{}).forEach(([key,value])=>originalSetItem.call(localStorage,key,value));
  }finally{suspended=false;}
  location.reload();
 }
 function deleteBackup(id){
  if(!confirm("Obrisati ovu rezervnu kopiju?"))return;
  const backups=readBackups().filter(b=>b.id!==id);
  suspended=true;try{originalSetItem.call(localStorage,BACKUP_KEY,JSON.stringify(backups));}finally{suspended=false;}
  renderBackups();
 }
 function renderBackups(){
  const list=document.getElementById("localBackupList");
  const count=document.getElementById("localBackupCount");
  if(!list)return;
  const backups=readBackups();
  if(count)count.textContent=`${backups.length}/${MAX_BACKUPS}`;
  list.innerHTML="";
  if(!backups.length){list.innerHTML='<div class="history-empty">Još nema lokalnih kopija.</div>';return;}
  backups.forEach(backup=>{
   const row=document.createElement("div");row.className="local-backup-row";
   row.innerHTML=`<div><strong>${formatDate(backup.createdAt)}</strong><small>${backup.reason||"Rezervna kopija"}</small></div><div class="local-backup-actions"><button type="button" data-restore>Vrati</button><button type="button" data-delete class="danger">✕</button></div>`;
   row.querySelector("[data-restore]").onclick=()=>restoreBackup(backup.id);
   row.querySelector("[data-delete]").onclick=()=>deleteBackup(backup.id);
   list.appendChild(row);
  });
 }
 document.getElementById("createLocalBackupBtn")?.addEventListener("click",()=>{saveBackup("Ručna lokalna kopija",true);if(typeof showToast==="function")showToast("Lokalna kopija je sačuvana");});
 document.getElementById("settingsBtn")?.addEventListener("click",()=>setTimeout(renderBackups,0));
 renderBackups();
 if(!readBackups().length)saveBackup("Početna sigurnosna kopija",true);
 window.localBackup={save:saveBackup,restore:restoreBackup,list:readBackups};
})();