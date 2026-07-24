(()=>{
 "use strict";
 const period=document.getElementById("statisticsPeriod"),label=document.getElementById("statisticsPeriodLabel"),content=document.getElementById("statisticsContent");
 if(!period||!content)return;
 const text=v=>escapeHtml(String(v??""));
 const number=v=>new Intl.NumberFormat("sr-RS",{maximumFractionDigits:2}).format(v||0);
 const date=v=>new Intl.DateTimeFormat("sr-RS",{dateStyle:"medium"}).format(new Date(v));
 const norm=v=>String(v||"").trim().toLocaleLowerCase("sr");
 const total=o=>Object.values(o.items||{}).reduce((sum,q)=>sum+(Number(q)||0),0);
 function range(value){
  const now=new Date(),start=new Date(now),end=new Date(now);end.setHours(23,59,59,999);
  if(value==="all")return[null,null];
  if(value==="today")start.setHours(0,0,0,0);
  if(value==="7days"){start.setDate(start.getDate()-6);start.setHours(0,0,0,0)}
  if(value==="month"){start.setDate(1);start.setHours(0,0,0,0)}
  if(value==="previousMonth"){start.setMonth(start.getMonth()-1,1);start.setHours(0,0,0,0);end.setDate(0);end.setHours(23,59,59,999)}
  if(value==="3months"){start.setMonth(start.getMonth()-2,1);start.setHours(0,0,0,0)}
  if(value==="year"){start.setMonth(0,1);start.setHours(0,0,0,0)}
  return[start,end];
 }
 function orders(){const[start,end]=range(period.value);return(state.orders||[]).filter(o=>{const d=new Date(o.createdAt);return!Number.isNaN(+d)&&(!start||d>=start)&&(!end||d<=end)}).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))}
 function productStats(list){const map=new Map();list.forEach(o=>Object.entries(o.items||{}).forEach(([name,raw])=>{const qty=Number(raw)||0;if(qty<=0)return;const key=norm(name),row=map.get(key)||{name,quantity:0,orders:0,customers:new Set(),last:null};row.quantity+=qty;row.orders++;row.customers.add(norm(o.customer));if(!row.last||new Date(o.createdAt)>new Date(row.last))row.last=o.createdAt;map.set(key,row)}));return[...map.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,"sr"))}
 function customerStats(list){const map=new Map();list.forEach(o=>{const key=norm(o.customer),row=map.get(key)||{name:o.customer,orders:0,quantity:0,first:o.createdAt,last:o.createdAt};row.orders++;row.quantity+=total(o);if(new Date(o.createdAt)<new Date(row.first))row.first=o.createdAt;if(new Date(o.createdAt)>new Date(row.last))row.last=o.createdAt;map.set(key,row)});return[...map.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,"sr"))}
 function metric(title,value){return`<article class="stat-metric"><span>${text(title)}</span><strong>${typeof value==="number"?number(value):text(value)}</strong></article>`}
 function empty(){content.innerHTML='<div class="statistics-empty">Nema podataka za izabrani period</div>'}
 function overview(){
  const list=orders();label.textContent=period.options[period.selectedIndex].text;if(!list.length){empty();return}
  const products=productStats(list),customers=customerStats(list),quantity=list.reduce((sum,o)=>sum+total(o),0),lines=list.reduce((sum,o)=>sum+Object.values(o.items||{}).filter(q=>Number(q)>0).length,0);
  content.innerHTML=`<section class="statistics-block"><h3>OPŠTI PREGLED</h3><div class="stat-grid">${metric("Ukupno porudžbina",list.length)}${metric("Kupaca",customers.length)}${metric("Različitih artikala",products.length)}${metric("Ukupna količina",quantity)}${metric("Prosečna količina po porudžbini",quantity/list.length)}${metric("Prosečan broj artikala po porudžbini",lines/list.length)}</div></section><section class="statistics-block"><h3>NAJPRODAVANIJI ARTIKLI</h3><div class="stat-list">${products.slice(0,10).map((p,i)=>`<button type="button" data-product="${text(p.name)}"><b class="stat-rank">${i+1}</b><span><strong>${text(p.name)}</strong><small>${number(p.orders)} porudžbina · prosek ${number(p.quantity/p.orders)}</small></span><em>${number(p.quantity)}</em><b class="stat-chevron">›</b></button>`).join("")}</div></section><section class="statistics-block"><h3>NAJBOLJI KUPCI</h3><div class="stat-list">${customers.slice(0,10).map(c=>`<button type="button" data-customer="${text(c.name)}"><span><strong>${text(c.name)}</strong><small>${number(c.orders)} porudžbina · poslednja ${date(c.last)}</small></span><em>${number(c.quantity)}</em><b class="stat-chevron">›</b></button>`).join("")}</div></section>`;
  content.querySelectorAll("[data-product]").forEach(button=>button.onclick=()=>productDetail(button.dataset.product));content.querySelectorAll("[data-customer]").forEach(button=>button.onclick=()=>customerDetail(button.dataset.customer));
 }
 function detailHeader(title){return`<button type="button" class="statistics-overview">‹ Pregled statistike</button><div class="statistics-detail-title"><span>Izabrani period: ${text(label.textContent)}</span><h3>${text(title)}</h3></div>`}
 function customerDetail(name){
  const list=orders().filter(o=>norm(o.customer)===norm(name));if(!list.length){empty();return}const quantity=list.reduce((s,o)=>s+total(o),0),all=(state.orders||[]).filter(o=>norm(o.customer)===norm(name)),frequent=productStats(list).slice(0,10),ordered=new Map();all.forEach(o=>Object.entries(o.items||{}).forEach(([p,q])=>{if(Number(q)>0&&(!ordered.has(norm(p))||new Date(o.createdAt)>new Date(ordered.get(norm(p)).last)))ordered.set(norm(p),{name:p,last:o.createdAt})}));const stale=[...ordered.values()].sort((a,b)=>new Date(a.last)-new Date(b.last)).slice(0,10);
  content.innerHTML=`${detailHeader(name)}<section class="statistics-block"><div class="stat-grid">${metric("Ukupno porudžbina",list.length)}${metric("Ukupna količina",quantity)}${metric("Prosečna količina po porudžbini",quantity/list.length)}${metric("Prva porudžbina",date(list[list.length-1].createdAt))}${metric("Poslednja porudžbina",date(list[0].createdAt))}</div></section><section class="statistics-block"><h3>NAJČEŠĆE PORUČIVANI ARTIKLI</h3><div class="stat-simple-list">${frequent.map(p=>`<div><strong>${text(p.name)}</strong><span>${number(p.quantity)}</span></div>`).join("")}</div></section><section class="statistics-block"><h3>ARTIKLI KOJE DUGO NIJE PORUČIO</h3><div class="stat-simple-list">${stale.map(p=>`<div><strong>${text(p.name)}</strong><span>${date(p.last)}</span></div>`).join("")||"<p>Nema podataka.</p>"}</div></section><section class="statistics-block"><h3>ISTORIJA PORUDŽBINA</h3><div class="stat-history">${list.map(o=>`<article><strong>${date(o.createdAt)}</strong><span>${number(total(o))} ukupno</span><p>${Object.entries(o.items||{}).filter(([,q])=>Number(q)>0).map(([p,q])=>`${text(p)}: ${number(q)}`).join(" · ")}</p></article>`).join("")}</div></section>`;content.querySelector(".statistics-overview").onclick=overview;
 }
 function productDetail(name){
  const list=orders().filter(o=>Number(Object.entries(o.items||{}).find(([p])=>norm(p)===norm(name))?.[1])>0);if(!list.length){empty();return}const quantity=list.reduce((s,o)=>s+(Number(Object.entries(o.items||{}).find(([p])=>norm(p)===norm(name))?.[1])||0),0),customers=new Map();list.forEach(o=>{const key=norm(o.customer),row=customers.get(key)||{name:o.customer,quantity:0,orders:0};row.quantity+=Number(Object.entries(o.items||{}).find(([p])=>norm(p)===norm(name))?.[1])||0;row.orders++;customers.set(key,row)});const ranked=[...customers.values()].sort((a,b)=>b.quantity-a.quantity);
  content.innerHTML=`${detailHeader(name)}<section class="statistics-block"><div class="stat-grid">${metric("Ukupno prodata količina",quantity)}${metric("Broj porudžbina",list.length)}${metric("Različitih kupaca",customers.size)}${metric("Prosečna količina po porudžbini",quantity/list.length)}${metric("Poslednji datum prodaje",date(list[0].createdAt))}</div></section><section class="statistics-block"><h3>KUPCI KOJI GA NAJVIŠE PORUČUJU</h3><div class="stat-list">${ranked.map(c=>`<button type="button" data-customer="${text(c.name)}"><span><strong>${text(c.name)}</strong><small>${number(c.orders)} porudžbina</small></span><em>${number(c.quantity)}</em><b class="stat-chevron">›</b></button>`).join("")}</div></section>`;content.querySelector(".statistics-overview").onclick=overview;content.querySelectorAll("[data-customer]").forEach(button=>button.onclick=()=>customerDetail(button.dataset.customer));
 }
 window.renderStatistics=overview;period.addEventListener("change",overview);
})();
