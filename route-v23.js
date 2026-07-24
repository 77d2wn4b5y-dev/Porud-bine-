(()=>{
 const ROUTES_KEY="porudzbine-routes-v1",STATUS_KEY="porudzbine-route-status-v1",FINISHED_KEY="porudzbine-route-finished-v23";
 const $=id=>document.getElementById(id),norm=value=>String(value||"").trim().toLocaleLowerCase("sr");
 const dateKey=(value=new Date())=>{const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
 const load=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 const routes=()=>load(ROUTES_KEY,{});
 const todayOrders=()=>{const today=dateKey();return (state.orders||[]).filter(order=>dateKey(order.createdAt)===today);};
 function savedStatus(name){return load(STATUS_KEY,{})[dateKey()]?.[norm(name)]?.status||"";}
 function statusFor(name){
  const manual=savedStatus(name);
  if(manual==="completed")return {type:"completed",label:"Završeno",icon:"🟢"};
  if(manual==="not-today")return {type:"not-today",label:"Neće danas",icon:"⚪"};
  if(manual==="waiting")return {type:"waiting",label:"Čeka trebovanje",icon:"🔴"};
  if(todayOrders().some(order=>norm(order.customer)===norm(name)))return {type:"completed",label:"Završeno",icon:"🟢"};
  return {type:"waiting",label:"Čeka trebovanje",icon:"🔴"};
 }
 function setStatus(name,status,message){
  const all=load(STATUS_KEY,{}),today=dateKey();
  all[today]=all[today]||{};
  all[today][norm(name)]={customer:name,status,updatedAt:new Date().toISOString()};
  save(STATUS_KEY,all);render();if(message)showToast(message);
 }
 function openCustomer(name){
  const input=$("customerInput");input.value=name;selectCustomer(name);
  document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.tab==="order"));
  $("routeView").classList.remove("active");$("historyView").classList.remove("active");$("orderView").classList.add("active");$("saveBar").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
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
  label.textContent=new Intl.DateTimeFormat("sr-RS",{weekday:"long",dateStyle:"long"}).format(new Date());
  const customers=list.map(name=>({name,status:statusFor(name)}));
  const completed=customers.filter(customer=>customer.status.type==="completed").length,notToday=customers.filter(customer=>customer.status.type==="not-today").length,waiting=customers.length-completed-notToday;
  summary.innerHTML=`<div class="route-stats-v23"><span class="waiting">🔴 Čeka <strong>${waiting}</strong></span><span class="completed">🟢 Završeno <strong>${completed}</strong></span><span class="not-today">⚪ Neće danas <strong>${notToday}</strong></span></div>`;
  box.innerHTML="";
  if(!list.length){box.innerHTML='<div class="empty-state">Za današnji dan nema podešene ture. Dodaj kupce u Podešavanjima.</div>';return;}
  customers.forEach(({name,status},index)=>{
   const card=document.createElement("article");card.className=`route-card-v23 ${status.type}`;card.draggable=true;card.dataset.name=name;
   card.innerHTML=`<div class="route-customer-v23"><span class="route-index-v23">${index+1}</span><span class="route-status-v23" aria-hidden="true">${status.icon}</span><span class="route-name-v23">${escapeHtml(name)}</span><span class="route-label-v23">${status.label}</span></div><div class="route-actions-v23"><button type="button" data-a="create" class="route-primary-action">Kreiraj trebovanje</button>${status.type!=="completed"?'<button type="button" data-a="complete">Označi kao završeno</button>':''}${status.type!=="not-today"?'<button type="button" data-a="not-today">Označi „Neće danas“</button>':''}${status.type!=="waiting"?'<button type="button" data-a="waiting">Vrati u čekanje</button>':''}</div>`;
   card.querySelector('[data-a="create"]').onclick=()=>openCustomer(name);
   card.querySelector('[data-a="complete"]')?.addEventListener("click",()=>setStatus(name,"completed","Kupac je označen kao završen"));
   card.querySelector('[data-a="not-today"]')?.addEventListener("click",()=>setStatus(name,"not-today","Kupac danas neće biti obrađen"));
   card.querySelector('[data-a="waiting"]')?.addEventListener("click",()=>setStatus(name,"waiting","Kupac je vraćen u čekanje"));box.appendChild(card);
  });
  let dragged="";box.querySelectorAll(".route-card-v23").forEach(card=>{card.addEventListener("dragstart",()=>dragged=card.dataset.name);card.addEventListener("dragover",event=>event.preventDefault());card.addEventListener("drop",event=>{event.preventDefault();const target=card.dataset.name;if(!dragged||dragged===target)return;const all=routes(),items=[...(all[day]||[])],from=items.indexOf(dragged),to=items.indexOf(target);items.splice(to,0,items.splice(from,1)[0]);all[day]=items;save(ROUTES_KEY,all);render();showToast("Redosled ture je promenjen");});});
 }
 function addFinishButton(){const host=$("routeView")?.querySelector(".route-card");if(!host||$("finishRouteBtn"))return;const button=document.createElement("button");button.id="finishRouteBtn";button.type="button";button.className="primary finish-route-v23";button.textContent="Završi turu";button.onclick=finishRoute;host.appendChild(button);}
 document.querySelectorAll('.tab[data-tab="route"]').forEach(button=>button.addEventListener("click",()=>setTimeout(()=>{addFinishButton();render();},0)));
 window.addEventListener("order-saved",event=>{const customer=event.detail?.customer;if(customer)setStatus(customer,"completed");});
 window.addEventListener("storage",render);window.addEventListener("customers-changed",render);setTimeout(()=>{addFinishButton();render();},0);
})();
