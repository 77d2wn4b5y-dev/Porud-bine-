(()=>{
 const ROUTES_KEY="porudzbine-routes-v1",STATUS_KEY="porudzbine-route-status-v1",FINISHED_KEY="porudzbine-route-finished-v23";
 const SWIPE_THRESHOLD=70,UNDO_DURATION=5000;
 const $=id=>document.getElementById(id),norm=value=>String(value||"").trim().toLocaleLowerCase("sr");
 const dateKey=(value=new Date())=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
 const load=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 const routes=()=>load(ROUTES_KEY,{});
 const todayOrders=()=>{const today=dateKey();return (state.orders||[]).filter(order=>dateKey(order.createdAt)===today);};
 let undoTimer=null;

 function savedStatus(name){return load(STATUS_KEY,{})[dateKey()]?.[norm(name)]?.status||"";}
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
  toast.classList.add("show");
  undoTimer=setTimeout(()=>toast.classList.remove("show"),UNDO_DURATION);
 }
 function setStatus(name,status,message,{undoable=true}={}){
  const all=load(STATUS_KEY,{}),today=dateKey(),key=norm(name),previous=all[today]?.[key];
  all[today]=all[today]||{};
  all[today][key]={customer:name,status,updatedAt:new Date().toISOString()};
  save(STATUS_KEY,all);render();
  const undo=undoable?()=>{
   const current=load(STATUS_KEY,{});current[today]=current[today]||{};
   if(previous)current[today][key]=previous;else delete current[today][key];
   save(STATUS_KEY,current);haptic();render();showToast("Promena je poništena");
  }:null;
  if(message)showUndoToast(message,undo);
 }
 function performSwipe(name,direction){
  const status=statusFor(name);
  if(status.type==="completed"){showToast("Trebovanje je već završeno");return;}
  if(direction==="right"&&status.type!=="not-today"){haptic();setStatus(name,"not-today","Kupac označen: Neće danas");}
  else if(direction==="left"&&status.type==="not-today"){haptic();setStatus(name,"waiting","Kupac vraćen u čekanje");}
 }
 function attachSwipe(card,name){
  const foreground=card.querySelector(".route-card-content-v23");let startX=0,startY=0,deltaX=0,tracking=false,horizontal=false;
  const reset=()=>{foreground.classList.add("settling");foreground.style.transform="";card.classList.remove("swiping","swipe-left","swipe-right");setTimeout(()=>foreground.classList.remove("settling"),260);};
  const move=x=>{deltaX=Math.max(-140,Math.min(140,x));card.classList.add("swiping");card.classList.toggle("swipe-right",deltaX>0);card.classList.toggle("swipe-left",deltaX<0);foreground.style.transform=`translate3d(${deltaX}px,0,0)`;};
  const finish=()=>{if(!tracking)return;tracking=false;const direction=deltaX>0?"right":"left",accepted=horizontal&&Math.abs(deltaX)>=SWIPE_THRESHOLD;reset();if(accepted)performSwipe(name,direction);};

  // Native touch events are used deliberately: iOS/iPadOS standalone PWAs do
  // not dispatch a reliable PointerEvent sequence while a pan-y area scrolls.
  card.addEventListener("touchstart",event=>{
   if(event.touches.length!==1||event.target.closest("button"))return;
   const touch=event.touches[0];startX=touch.clientX;startY=touch.clientY;deltaX=0;tracking=true;horizontal=false;foreground.classList.remove("settling");
  },{passive:true});
  card.addEventListener("touchmove",event=>{
   if(!tracking||event.touches.length!==1)return;
   const touch=event.touches[0],x=touch.clientX-startX,y=touch.clientY-startY;
   if(!horizontal&&Math.abs(y)>10&&Math.abs(y)>Math.abs(x)){tracking=false;reset();return;}
   if(!horizontal&&Math.abs(x)>10&&Math.abs(x)>Math.abs(y))horizontal=true;
   if(!horizontal)return;
   event.preventDefault();move(x);
  },{passive:false});
  card.addEventListener("touchend",finish,{passive:true});
  card.addEventListener("touchcancel",()=>{tracking=false;reset();},{passive:true});
 }
 function openCustomer(name){
  const input=$("customerInput");input.value=name;selectCustomer(name);
  document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.tab==="order"));
  $("routeView").classList.remove("active");$("historyView").classList.remove("active");$("orderView").classList.add("active");$("saveBar").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});
 }
 function finishRoute(){
  const list=routes()[String(new Date().getDay())]||[],statuses=list.map(statusFor);
  const completed=statuses.filter(status=>status.type==="completed").length,notToday=statuses.filter(status=>status.type==="not-today").length,waiting=statuses.filter(status=>status.type==="waiting").length;
  const totalQty=todayOrders().reduce((sum,order)=>sum+Object.values(order.items||{}).reduce((subtotal,quantity)=>subtotal+(Number(quantity)||0),0),0);
  if(waiting&&!confirm(`Ostalo je ${waiting} kupaca koji čekaju trebovanje. Ipak završiti turu?`))return;
  const done=load(FINISHED_KEY,{});done[dateKey()]={finishedAt:new Date().toISOString(),completed,notToday,waiting,totalQty};save(FINISHED_KEY,done);
  alert(`Dnevna tura završena\n\nZavršeno: ${completed}\nNeće danas: ${notToday}\nČeka: ${waiting}\nUkupna količina: ${totalQty}`);render();
 }
 function render(){
  const box=$("routeCustomers"),summary=$("routeSummary"),label=$("routeDateLabel");if(!box||!summary)return;
  const day=String(new Date().getDay()),list=routes()[day]||[];
  label.textContent=new Intl.DateTimeFormat("sr-RS",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date());
  const customers=list.map(name=>({name,status:statusFor(name)}));
  const completed=customers.filter(customer=>customer.status.type==="completed").length,notToday=customers.filter(customer=>customer.status.type==="not-today").length,waiting=customers.length-completed-notToday;
  summary.innerHTML=`<div class="route-stats-v23"><span class="waiting">🔴 Čeka <strong>${waiting}</strong></span><span class="completed">🟢 Završeno <strong>${completed}</strong></span><span class="not-today">⚪ Neće danas <strong>${notToday}</strong></span></div>`;
  box.innerHTML="";
  if(!list.length){box.innerHTML='<div class="empty-state">Za današnji dan nema podešene ture. Dodaj kupce u Podešavanjima.</div>';return;}
  customers.forEach(({name,status},index)=>{
   const card=document.createElement("article");card.className=`route-card-v23 ${status.type}`;card.draggable=matchMedia("(pointer: fine)").matches;card.dataset.name=name;
   card.innerHTML=`<div class="route-swipe-action-v23 right" aria-hidden="true"><span>📅✖️</span><small>Neće danas</small></div><div class="route-swipe-action-v23 left" aria-hidden="true"><span>🔴</span><small>Vrati u čekanje</small></div><div class="route-card-content-v23"><div class="route-customer-v23"><span class="route-index-v23">${index+1}</span><span class="route-status-v23" aria-hidden="true">${status.icon}</span><span class="route-name-v23">${escapeHtml(name)}</span><span class="route-label-v23">${status.label}</span></div><div class="route-actions-v23"><button type="button" data-a="create" class="route-primary-action">Kreiraj trebovanje</button>${status.type!=="completed"?'<button type="button" data-a="complete">Označi kao završeno</button>':""}${status.type!=="not-today"?'<button type="button" data-a="not-today">Označi „Neće danas“</button>':""}${status.type!=="waiting"?'<button type="button" data-a="waiting">Vrati u čekanje</button>':""}</div></div>`;
   card.querySelector('[data-a="create"]').onclick=()=>openCustomer(name);
   card.querySelector('[data-a="complete"]')?.addEventListener("click",()=>setStatus(name,"completed","Kupac je označen kao završen"));
   card.querySelector('[data-a="not-today"]')?.addEventListener("click",()=>setStatus(name,"not-today","Kupac označen: Neće danas"));
   card.querySelector('[data-a="waiting"]')?.addEventListener("click",()=>setStatus(name,"waiting","Kupac vraćen u čekanje"));attachSwipe(card,name);box.appendChild(card);
  });
  let dragged="";box.querySelectorAll(".route-card-v23").forEach(card=>{card.addEventListener("dragstart",()=>dragged=card.dataset.name);card.addEventListener("dragover",event=>event.preventDefault());card.addEventListener("drop",event=>{event.preventDefault();const target=card.dataset.name;if(!dragged||dragged===target)return;const all=routes(),items=[...(all[day]||[])],from=items.indexOf(dragged),to=items.indexOf(target);items.splice(to,0,items.splice(from,1)[0]);all[day]=items;save(ROUTES_KEY,all);render();showToast("Redosled ture je promenjen");});});
 }
 function addFinishButton(){const host=$("routeView")?.querySelector(".route-card");if(!host||$("finishRouteBtn"))return;const button=document.createElement("button");button.id="finishRouteBtn";button.type="button";button.className="primary finish-route-v23";button.textContent="Završi turu";button.onclick=finishRoute;host.appendChild(button);}
 document.querySelectorAll('.tab[data-tab="route"]').forEach(button=>button.addEventListener("click",()=>setTimeout(()=>{addFinishButton();render();},0)));
 window.addEventListener("order-saved",event=>{const customer=event.detail?.customer;if(customer)setStatus(customer,"completed",null,{undoable:false});});
 window.addEventListener("storage",render);window.addEventListener("customers-changed",render);setTimeout(()=>{addFinishButton();render();},0);
})();
