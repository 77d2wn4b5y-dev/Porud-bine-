(()=>{
 const ROUTES_KEY="porudzbine-routes-v1",STATUS_KEY="porudzbine-route-status-v1",FINISHED_KEY="porudzbine-route-finished-v23",SNAPSHOT_KEY="porudzbine-route-snapshots-v263",CARRY_KEY="porudzbine-route-carry-v263";
 const UNDO_DURATION=5000,LONG_PRESS_MS=600,DAY_MS=86400000;
 const $=id=>document.getElementById(id),norm=value=>String(value||"").trim().toLocaleLowerCase("sr");
 const dateKey=(value=new Date())=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
 const load=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 const routes=()=>load(ROUTES_KEY,{});
 const ordersForDate=key=>(state.orders||[]).filter(order=>dateKey(order.createdAt)===key);
 const todayOrders=()=>ordersForDate(dateKey());
 let undoTimer=null;

 function customerMeta(name){
  const customers=state.customers||{};
  if(customers[name])return customers[name];
  const key=Object.keys(customers).find(item=>norm(item)===norm(name));
  return key?customers[key]:{};
 }
 function weekStart(value){
  const date=new Date(value);date.setHours(12,0,0,0);
  const day=date.getDay();date.setDate(date.getDate()-(day===0?6:day-1));
  return date;
 }
 function dueForToday(name,value=new Date()){
  const meta=customerMeta(name),today=new Date(value),todayDay=today.getDay();
  if(meta.visitMode==="manual"||meta.visitInterval==="manual")return false;
  if(meta.visitMode!=="scheduled"||meta.visitDay===undefined||meta.visitDay===null||!meta.visitInterval)return true;
  if(Number(meta.visitDay)!==todayDay)return false;
  const interval=Number(meta.visitInterval);
  if(interval===7)return true;
  if(![14,21,28].includes(interval))return true;
  const start=new Date(`${meta.cycleStart||dateKey(today)}T12:00:00`);
  if(Number.isNaN(start.getTime()))return true;
  const weeks=Math.round((weekStart(today)-weekStart(start))/(7*DAY_MS));
  return weeks>=0&&weeks%(interval/7)===0;
 }
 function activeList(day=String(new Date().getDay())){
  return (routes()[day]||[]).filter(name=>dueForToday(name));
 }
 function scheduleLabel(name){
  const meta=customerMeta(name),interval=Number(meta.visitInterval);
  if(meta.visitMode!=="scheduled"||![7,14,21,28].includes(interval))return "";
  return interval===7?"Svake nedelje":`Na ${interval} dana`;
 }
 function uniqueNames(items){
  const seen=new Set();return items.filter(name=>{const key=norm(name);if(!key||seen.has(key))return false;seen.add(key);return true;});
 }
 function statusOn(date,name){return load(STATUS_KEY,{})[date]?.[norm(name)]?.status||"";}
 function savedStatus(name){return statusOn(dateKey(),name);}
 function orderExists(date,name){return ordersForDate(date).some(order=>norm(order.customer)===norm(name));}
 function closeCarry(name){const carry=load(CARRY_KEY,{});delete carry[norm(name)];save(CARRY_KEY,carry);}
 function ensureTodaySnapshot(list){
  const all=load(SNAPSHOT_KEY,{}),today=dateKey();
  if(!all[today]){all[today]={customers:uniqueNames(list),createdAt:new Date().toISOString(),processed:false};save(SNAPSHOT_KEY,all);return;}
  const merged=uniqueNames([...(all[today].customers||[]),...list]);
  if(merged.length!==(all[today].customers||[]).length){all[today]={...all[today],customers:merged};save(SNAPSHOT_KEY,all);}
 }
 function reconcileCarryovers(){
  const today=dateKey(),snapshots=load(SNAPSHOT_KEY,{}),carry=load(CARRY_KEY,{}),statuses=load(STATUS_KEY,{});
  let changed=false;
  Object.keys(snapshots).sort().forEach(day=>{
   const snapshot=snapshots[day];if(day>=today||snapshot.processed)return;
   (snapshot.customers||[]).forEach(name=>{
    const result=statuses[day]?.[norm(name)]?.status||"";
    if(result==="completed"||result==="not-today"||orderExists(day,name)){delete carry[norm(name)];return;}
    const key=norm(name);if(!carry[key])carry[key]={customer:name,since:day,createdAt:new Date().toISOString()};
   });
   snapshots[day]={...snapshot,processed:true,processedAt:new Date().toISOString()};changed=true;
  });
  Object.keys(carry).forEach(key=>{
   const item=carry[key],since=item.since;
   const resolved=(state.orders||[]).some(order=>norm(order.customer)===key&&dateKey(order.createdAt)>since)||Object.keys(statuses).some(day=>day>since&&(statuses[day]?.[key]?.status==="completed"||statuses[day]?.[key]?.status==="not-today"));
   if(resolved){delete carry[key];changed=true;}
  });
  if(changed){save(SNAPSHOT_KEY,snapshots);save(CARRY_KEY,carry);}
  return carry;
 }
 function carryItems(){
  const today=new Date(`${dateKey()}T12:00:00`),carry=reconcileCarryovers();
  return Object.values(carry).map(item=>{const since=new Date(`${item.since}T12:00:00`);return {...item,daysLate:Math.max(1,Math.round((today-since)/DAY_MS))};}).sort((a,b)=>b.daysLate-a.daysLate||a.customer.localeCompare(b.customer,"sr"));
 }
 function statusFor(name){
  const manual=savedStatus(name);
  if(manual==="completed")return {type:"completed",label:"Završeno",icon:"🟢"};
  if(manual==="not-today")return {type:"not-today",label:"Neće danas",icon:"⚪"};
  if(manual==="waiting")return {type:"waiting",label:"Čeka trebovanje",icon:"🔴"};
  if(todayOrders().some(order=>norm(order.customer)===norm(name)))return {type:"completed",label:"Završeno",icon:"🟢"};
  return {type:"waiting",label:"Čeka trebovanje",icon:"🔴"};
 }
 function haptic(){navigator.vibrate?.(20);}
 function showUndoToast(message,undo){
  const toast=$("toast");
  if(!toast){showToast(message);return;}
  clearTimeout(showToast.timer);clearTimeout(undoTimer);
  toast.replaceChildren(document.createTextNode(message));
  if(undo){
   const button=document.createElement("button");button.type="button";button.className="route-undo-v23";button.textContent="Poništi";
   button.onclick=()=>{clearTimeout(undoTimer);undo();toast.classList.remove("show");};toast.appendChild(button);
  }
  toast.classList.add("show");undoTimer=setTimeout(()=>toast.classList.remove("show"),UNDO_DURATION);
 }
 function setStatus(name,status,message,{undoable=true}={}){
  const all=load(STATUS_KEY,{}),today=dateKey(),key=norm(name),previous=all[today]?.[key],previousCarry=load(CARRY_KEY,{})[key];
  all[today]=all[today]||{};all[today][key]={customer:name,status,updatedAt:new Date().toISOString()};save(STATUS_KEY,all);
  if(status==="completed"||status==="not-today")closeCarry(name);
  render();
  const undo=undoable?()=>{
   const current=load(STATUS_KEY,{});current[today]=current[today]||{};
   if(previous)current[today][key]=previous;else delete current[today][key];save(STATUS_KEY,current);
   if(previousCarry){const carry=load(CARRY_KEY,{});carry[key]=previousCarry;save(CARRY_KEY,carry);}
   haptic();render();showToast("Promena je poništena");
  }:null;
  if(message)showUndoToast(message,undo);
 }
 function toggleWaitingStatus(name){
  const status=statusFor(name);if(status.type==="completed"){showToast("Trebovanje je već završeno");return;}
  haptic();if(status.type==="not-today")setStatus(name,"waiting","Kupac vraćen u čekanje");else setStatus(name,"not-today","Kupac prebačen u: Neće danas");
 }
 function attachStatusButton(button,name){
  let timer=null,longTriggered=false,startX=0,startY=0;
  const cancel=()=>{clearTimeout(timer);timer=null;button.classList.remove("holding");};
  const begin=(x=0,y=0)=>{longTriggered=false;startX=x;startY=y;cancel();button.classList.add("holding");timer=setTimeout(()=>{timer=null;longTriggered=true;button.classList.remove("holding");toggleWaitingStatus(name);},LONG_PRESS_MS);};
  button.addEventListener("touchstart",event=>{if(event.touches.length===1)begin(event.touches[0].clientX,event.touches[0].clientY);},{passive:true});
  button.addEventListener("touchmove",event=>{if(!timer||event.touches.length!==1)return;const touch=event.touches[0];if(Math.abs(touch.clientX-startX)>12||Math.abs(touch.clientY-startY)>12)cancel();},{passive:true});
  button.addEventListener("touchend",cancel,{passive:true});button.addEventListener("touchcancel",cancel,{passive:true});
  button.addEventListener("pointerdown",event=>{if(event.pointerType!=="touch")begin(event.clientX,event.clientY);});button.addEventListener("pointerup",cancel);button.addEventListener("pointerleave",cancel);button.addEventListener("pointercancel",cancel);
  button.addEventListener("click",event=>{event.stopPropagation();if(longTriggered){longTriggered=false;return;}toggleWaitingStatus(name);});
 }
 function openCustomer(name){
  const input=$("customerInput");input.value=name;selectCustomer(name);
  document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.tab==="order"));
  $("routeView").classList.remove("active");$("historyView").classList.remove("active");$("orderView").classList.add("active");$("saveBar").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});
 }
 function combinedList(){const regular=activeList(),overdue=carryItems();return {regular,overdue,list:uniqueNames([...overdue.map(item=>item.customer),...regular])};}
 function finishRoute(){
  const {list}=combinedList(),statuses=list.map(statusFor);
  const completed=statuses.filter(status=>status.type==="completed").length,notToday=statuses.filter(status=>status.type==="not-today").length,waiting=statuses.filter(status=>status.type==="waiting").length;
  const totalQty=todayOrders().reduce((sum,order)=>sum+Object.values(order.items||{}).reduce((subtotal,quantity)=>subtotal+(Number(quantity)||0),0),0);
  if(waiting&&!confirm(`Ostalo je ${waiting} kupaca koji čekaju trebovanje. Biće preneti u sledeći dan. Ipak završiti turu?`))return;
  ensureTodaySnapshot(list);
  const done=load(FINISHED_KEY,{});done[dateKey()]={finishedAt:new Date().toISOString(),completed,notToday,waiting,totalQty};save(FINISHED_KEY,done);
  alert(`Dnevna tura završena\n\nZavršeno: ${completed}\nNeće danas: ${notToday}\nČeka: ${waiting}\nUkupna količina: ${totalQty}`);render();
 }
 function updateRouteTab(waiting,completed,notToday){
  document.querySelectorAll('.tab[data-tab="route"]').forEach(tab=>{tab.innerHTML=`Današnja tura <span class="route-tab-badge" aria-label="${waiting} čeka">${waiting}</span>`;tab.title=`Čeka ${waiting} · Završeno ${completed} · Neće danas ${notToday}`;});
 }
 function render(){
  const box=$("routeCustomers"),summary=$("routeSummary"),label=$("routeDateLabel");if(!box||!summary)return;
  const day=String(new Date().getDay()),fullList=routes()[day]||[],regular=activeList(day),overdue=carryItems(),list=uniqueNames([...overdue.map(item=>item.customer),...regular]),skipped=fullList.length-regular.length;
  ensureTodaySnapshot(list);
  if(label)label.textContent=new Intl.DateTimeFormat("sr-RS",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date());
  const overdueMap=new Map(overdue.map(item=>[norm(item.customer),item])),customers=list.map(name=>({name,status:statusFor(name),overdue:overdueMap.get(norm(name))||null}));
  const completed=customers.filter(customer=>customer.status.type==="completed").length,notToday=customers.filter(customer=>customer.status.type==="not-today").length,waiting=customers.length-completed-notToday;
  updateRouteTab(waiting,completed,notToday);
  summary.innerHTML=`<div class="route-stats-v23"><span class="waiting">🔴 Čeka <strong>${waiting}</strong></span><span class="completed">🟢 Završeno <strong>${completed}</strong></span><span class="not-today">⚪ Neće danas <strong>${notToday}</strong></span></div>${overdue.length?`<div class="route-overdue-note-v263">⚠️ ${overdue.length} zaostalih kupaca preneto iz prethodnih dana</div>`:""}${skipped?`<div class="route-cycle-note-v262">📅 ${skipped} kupaca danas preskočeno po rasporedu obilaska</div>`:""}`;
  box.innerHTML="";
  if(!list.length){box.innerHTML=fullList.length?'<div class="empty-state">Danas nijedan kupac nije na redu po podešenom ciklusu obilaska.</div>':'<div class="empty-state">Za današnji dan nema podešene ture. Dodaj kupce u Podešavanjima.</div>';return;}
  let section="";
  customers.forEach(({name,status,overdue:late},index)=>{
   const nextSection=late?"overdue":"regular";if(nextSection!==section){section=nextSection;const heading=document.createElement("div");heading.className=`route-section-title-v263 ${section}`;heading.textContent=late?"🔴 Zaostali kupci":"📅 Današnja tura";box.appendChild(heading);}
   const card=document.createElement("article");card.className=`route-card-v23 ${status.type}${late?" overdue-v263":""}`;card.draggable=!late&&matchMedia("(pointer: fine)").matches;card.dataset.name=name;
   const toggleLabel=status.type==="not-today"?"Vrati u čekanje":status.type==="completed"?"Završeno":"Neće danas",toggleIcon=status.type==="not-today"?"↩":status.type==="completed"?"✓":"○",cycle=scheduleLabel(name);
   const lateLabel=late?`Kasni ${late.daysLate} ${late.daysLate===1?"dan":"dana"}`:status.label;
   card.innerHTML=`<button type="button" class="route-customer-v23 route-open-customer-v23" aria-label="Otvori trebovanje za ${escapeHtml(name)}"><span class="route-index-v23">${index+1}</span><span class="route-status-v23" aria-hidden="true">${status.icon}</span><span class="route-name-v23">${escapeHtml(name)}${cycle?`<small class="route-cycle-v262">${escapeHtml(cycle)}</small>`:""}</span><span class="route-label-v23${late?" late-v263":""}">${escapeHtml(lateLabel)}</span></button><button type="button" class="route-status-toggle-v23" ${status.type==="completed"?"disabled":""} aria-label="${toggleLabel}: ${escapeHtml(name)}"><span aria-hidden="true">${toggleIcon}</span><small>${toggleLabel}</small></button>`;
   card.querySelector(".route-open-customer-v23").onclick=()=>openCustomer(name);const toggle=card.querySelector(".route-status-toggle-v23");if(!toggle.disabled)attachStatusButton(toggle,name);box.appendChild(card);
  });
  let dragged="";box.querySelectorAll('.route-card-v23:not(.overdue-v263)').forEach(card=>{card.addEventListener("dragstart",()=>dragged=card.dataset.name);card.addEventListener("dragover",event=>event.preventDefault());card.addEventListener("drop",event=>{event.preventDefault();const target=card.dataset.name;if(!dragged||dragged===target)return;const all=routes(),items=[...(all[day]||[])],from=items.indexOf(dragged),to=items.indexOf(target);if(from<0||to<0)return;items.splice(to,0,items.splice(from,1)[0]);all[day]=items;save(ROUTES_KEY,all);render();showToast("Redosled ture je promenjen");});});
 }
 function addFinishButton(){const host=$("routeView")?.querySelector(".route-card");if(!host||$("finishRouteBtn"))return;const button=document.createElement("button");button.id="finishRouteBtn";button.type="button";button.className="primary finish-route-v23";button.textContent="Završi turu";button.onclick=finishRoute;host.appendChild(button);}
 window.renderTodayRouteV23=render;
 document.querySelectorAll('.tab[data-tab="route"]').forEach(button=>button.addEventListener("click",()=>setTimeout(()=>{addFinishButton();render();},0)));
 window.addEventListener("order-saved",event=>{const customer=event.detail?.customer;if(customer)setStatus(customer,"completed",null,{undoable:false});});
 window.addEventListener("routes-changed",render);window.addEventListener("storage",render);window.addEventListener("customers-changed",render);setTimeout(()=>{addFinishButton();render();},0);
})();