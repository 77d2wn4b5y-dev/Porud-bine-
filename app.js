const DEFAULT_PRODUCTS=["Jabuka","Banana","Pomorandža","Kruška","Breskva","Nektarina","Grožđe","Lubenica","Dinja","Kivi"];
const STORAGE_KEY="porudzbine-app-v2";
const OLD_STORAGE_KEY="porudzbine-app-v1";

let state=loadState();
let selectedCustomer="";
let activeTab="order";
let isSavingOrder=false;
let formChangedSinceSave=true;

const $=id=>document.getElementById(id);
const els={
 dateTime:$("dateTime"),customerInput:$("customerInput"),customerList:$("customerList"),customerNote:$("customerNote"),lastVisit:$("lastVisit"),products:$("products"),noProducts:$("noProducts"),orderNote:$("orderNote"),history:$("history"),historySearch:$("historySearch"),saveBtn:$("saveBtn"),newOrderBtn:$("newOrderBtn"),settingsBtn:$("settingsBtn"),settingsDialog:$("settingsDialog"),newProductInput:$("newProductInput"),addProductBtn:$("addProductBtn"),productSettings:$("productSettings"),backupBtn:$("backupBtn"),restoreInput:$("restoreInput"),clearAllBtn:$("clearAllBtn"),exportAllBtn:$("exportAllBtn"),saveBar:$("saveBar"),draftStatus:$("draftStatus"),toast:$("toast"),orderView:$("orderView"),historyView:$("historyView")
};

function loadState(){
 try{
  const current=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(current)return normalizeState(current);
  const old=JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
  if(old){const migrated=normalizeState({...old,products:DEFAULT_PRODUCTS});localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated;}
 }catch(e){console.warn("Podaci nisu učitani",e)}
 return normalizeState({});
}
function normalizeState(raw){
 const products=Array.isArray(raw.products)&&raw.products.length?raw.products.map(String):[...DEFAULT_PRODUCTS];
 const customers=raw.customers&&typeof raw.customers==="object"?raw.customers:{};
 const orders=Array.isArray(raw.orders)?raw.orders.map(o=>({...o,items:o.items||{},note:o.note||""})):[];
 return{products:[...new Set(products)],customers,orders};
}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function getSavedOrders(){return state.orders;}
function refreshStatistics(){window.renderStatistics?.();}
window.getSavedOrders=getSavedOrders;
function formatDateTime(v){return new Intl.DateTimeFormat("sr-RS",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));}
function tick(){els.dateTime.textContent=new Intl.DateTimeFormat("sr-RS",{dateStyle:"full",timeStyle:"short"}).format(new Date());}
function showToast(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>els.toast.classList.remove("show"),2100);}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function customerOrders(name){const key=name.trim().toLocaleLowerCase("sr");return state.orders.filter(o=>String(o.customer).toLocaleLowerCase("sr")===key).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
function lastOrder(name){return name?customerOrders(name)[0]||null:null;}
function makeId(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;}

function renderCustomerList(){
 els.customerList.innerHTML="";
 const names=new Set([...Object.keys(state.customers),...state.orders.map(o=>o.customer)]);
 [...names].filter(Boolean).sort((a,b)=>a.localeCompare(b,"sr")).forEach(name=>{const option=document.createElement("option");option.value=name;els.customerList.appendChild(option);});
}
function productOrderForCustomer(name){
 if(!name)return [...state.products];
 const totals=Object.fromEntries(state.products.map(p=>[p,0]));
 customerOrders(name).forEach(o=>state.products.forEach(p=>totals[p]+=Number(o.items[p]||0)));
 return [...state.products].sort((a,b)=>totals[b]-totals[a]||state.products.indexOf(a)-state.products.indexOf(b));
}
function captureDraft(){const values={};document.querySelectorAll(".qty").forEach(i=>values[i.dataset.product]=i.value);return values;}
function renderProducts(keepValues={}){
 const previous=lastOrder(selectedCustomer)?.items||{};
 els.products.innerHTML="";
 els.noProducts.classList.toggle("hidden",state.products.length>0);
 productOrderForCustomer(selectedCustomer).forEach((name,index)=>{
  const row=document.createElement("div");row.className="product-row row-grid";
  row.innerHTML=`<div class="product-name">${escapeHtml(name)}</div><div class="previous">${Number(previous[name]||0)||"—"}</div><input class="qty" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="" aria-label="Danas ${escapeHtml(name)}" data-product="${escapeHtml(name)}" value="${escapeHtml(keepValues[name]||"")}" />`;
  const input=row.querySelector("input");
  input.addEventListener("focus",()=>input.select());
  input.addEventListener("input",()=>{input.value=input.value.replace(/[^0-9]/g,"");markOrderFormChanged();updateDraftStatus();});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=[...document.querySelectorAll(".qty")];(inputs[index+1]||els.orderNote).focus();}});
  els.products.appendChild(row);
 });
 updateDraftStatus();
}
function updateDraftStatus(){const count=[...document.querySelectorAll(".qty")].filter(i=>Number(i.value)>0).length;els.draftStatus.textContent=count?`Uneto stavki: ${count}`:"Nova porudžbina";}
function selectCustomer(name,{preserveDraft=false}={}){
 const draft=preserveDraft?captureDraft():{};
 selectedCustomer=name.trim();
 const customer=state.customers[selectedCustomer];
 els.customerNote.value=customer?.note||"";
 const last=lastOrder(selectedCustomer);
 els.lastVisit.textContent=last?formatDateTime(last.createdAt):"Nema prethodne porudžbine";
 renderProducts(draft);
}
function markOrderFormChanged(){
 formChangedSinceSave=true;
 els.saveBtn.disabled=false;
}
window.markOrderFormChanged=markOrderFormChanged;
function resetOrder({afterSave=false}={}){
 selectedCustomer="";els.customerInput.value="";els.customerNote.value="";els.orderNote.value="";els.lastVisit.textContent="—";renderProducts();switchTab("order");window.scrollTo({top:0,behavior:"smooth"});setTimeout(()=>els.customerInput.focus(),250);
 if(afterSave){formChangedSinceSave=false;els.saveBtn.disabled=true;}
}
function readItems(){const items={};document.querySelectorAll(".qty").forEach(i=>items[i.dataset.product]=Number(i.value)||0);return items;}
function saveOrder(){
 if(isSavingOrder)return;
 if(!formChangedSinceSave){showToast("Porudžbina je već sačuvana");return;}
 const customer=els.customerInput.value.trim();
 if(!customer){showToast("Unesi naziv objekta");els.customerInput.focus();return;}
 const items=readItems();
 if(!Object.values(items).some(q=>q>0)){showToast("Unesi bar jednu količinu");return;}
 const note=els.orderNote.value.trim();
 isSavingOrder=true;els.saveBtn.disabled=true;
 try{
  state.customers[customer]={...(state.customers[customer]||{}),note:els.customerNote.value.trim()};
  state.orders.unshift({id:makeId(),customer,createdAt:new Date().toISOString(),items,note});
  persist();renderCustomerList();resetOrder({afterSave:true});renderHistory();refreshStatistics();showToast("Porudžbina je sačuvana");
 }finally{isSavingOrder=false;}
}
function orderText(order){const lines=Object.entries(order.items).filter(([,q])=>Number(q)>0).map(([p,q])=>`${p}: ${q}`);return `${order.customer}\n${formatDateTime(order.createdAt)}\n${lines.join("\n")}${order.note?`\nNapomena: ${order.note}`:""}`;}
function loadOrder(order){
 els.customerInput.value=order.customer;selectCustomer(order.customer);els.orderNote.value=order.note||"";document.querySelectorAll(".qty").forEach(i=>i.value=order.items[i.dataset.product]||"");updateDraftStatus();switchTab("order");window.scrollTo({top:0,behavior:"smooth"});showToast("Porudžbina je učitana kao nova");
}
function renderHistory(){
 const q=els.historySearch.value.trim().toLocaleLowerCase("sr");
 const orders=state.orders.filter(order=>!q||order.customer.toLocaleLowerCase("sr").includes(q)||order.note?.toLocaleLowerCase("sr").includes(q)||Object.keys(order.items).some(p=>Number(order.items[p])>0&&p.toLocaleLowerCase("sr").includes(q)));
 els.history.innerHTML="";
 if(!orders.length){els.history.innerHTML='<div class="history-empty">Nema pronađenih porudžbina.</div>';return;}
 orders.slice(0,100).forEach(order=>{
  const details=Object.entries(order.items).filter(([,n])=>Number(n)>0).map(([p,n])=>`${escapeHtml(p)}: <strong>${n}</strong>`).join(" · ");
  const item=document.createElement("article");item.className="history-item";
  item.innerHTML=`<div class="history-top"><span class="history-customer">${escapeHtml(order.customer)}</span><span>${formatDateTime(order.createdAt)}</span></div><div class="history-details">${details||"Bez stavki"}</div>${order.note?`<div class="history-note">${escapeHtml(order.note)}</div>`:""}<div class="history-actions"><button data-action="copy">Kopiraj</button><button data-action="load">Ponovi</button><button data-action="print">PDF/štampa</button><button data-action="delete" class="danger">Obriši</button></div>`;
  item.querySelector('[data-action="copy"]').onclick=async()=>{try{await navigator.clipboard.writeText(orderText(order));showToast("Porudžbina je kopirana");}catch{showToast("Kopiranje nije dostupno");}};
  item.querySelector('[data-action="load"]').onclick=()=>loadOrder(order);
  item.querySelector('[data-action="print"]').onclick=()=>printOrder(order);
  item.querySelector('[data-action="delete"]').onclick=()=>{if(!confirm("Obrisati ovu porudžbinu?"))return;state.orders=state.orders.filter(o=>o.id!==order.id);persist();renderHistory();if(selectedCustomer===order.customer)selectCustomer(selectedCustomer);showToast("Porudžbina je obrisana");};
  els.history.appendChild(item);
 });
}
function printOrder(order){
 const win=window.open("","_blank");if(!win){showToast("Dozvoli otvaranje novog prozora");return;}
 const rows=Object.entries(order.items).filter(([,q])=>Number(q)>0).map(([p,q])=>`<tr><td>${escapeHtml(p)}</td><td>${q}</td></tr>`).join("");
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Porudžbina - ${escapeHtml(order.customer)}</title><style>body{font-family:Arial;padding:28px;color:#222}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #bbb;padding:10px;text-align:left}th:last-child,td:last-child{text-align:center;width:100px}.note{margin-top:18px;padding:12px;background:#f5f5f5}</style></head><body><h1>${escapeHtml(order.customer)}</h1><div>${formatDateTime(order.createdAt)}</div><table><thead><tr><th>Artikal</th><th>Količina</th></tr></thead><tbody>${rows}</tbody></table>${order.note?`<div class="note"><strong>Napomena:</strong> ${escapeHtml(order.note)}</div>`:""}<script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close();
}
function switchTab(tab){activeTab=tab;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));els.orderView.classList.toggle("active",tab==="order");els.historyView.classList.toggle("active",tab==="history");els.saveBar.classList.toggle("hidden",tab!=="order");if(tab==="history")renderHistory();}
function renderProductSettings(){
 els.productSettings.innerHTML="";
 state.products.forEach((name,index)=>{const row=document.createElement("div");row.className="settings-row";row.innerHTML=`<span>${escapeHtml(name)}</span><button type="button" aria-label="Gore">↑</button><button type="button" aria-label="Dole">↓</button><button type="button" class="danger" aria-label="Obriši">✕</button>`;const [up,down,del]=row.querySelectorAll("button");up.disabled=index===0;down.disabled=index===state.products.length-1;up.onclick=()=>moveProduct(index,-1);down.onclick=()=>moveProduct(index,1);del.onclick=()=>deleteProduct(name);els.productSettings.appendChild(row);});
}
function moveProduct(index,delta){const target=index+delta;if(target<0||target>=state.products.length)return;[state.products[index],state.products[target]]=[state.products[target],state.products[index]];persist();renderProductSettings();renderProducts(captureDraft());}
function addProduct(){const name=els.newProductInput.value.trim();if(!name)return;if(state.products.some(p=>p.toLocaleLowerCase("sr")===name.toLocaleLowerCase("sr"))){showToast("Artikal već postoji");return;}state.products.push(name);els.newProductInput.value="";persist();renderProductSettings();renderProducts(captureDraft());showToast("Artikal je dodat");}
function deleteProduct(name){if(!confirm(`Obrisati artikal „${name}“ sa liste? Stare porudžbine ostaju sačuvane.`))return;state.products=state.products.filter(p=>p!==name);persist();renderProductSettings();renderProducts(captureDraft());showToast("Artikal je uklonjen");}
function downloadFile(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backup(){downloadFile(`porudzbine-rezervna-kopija-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),"application/json");}
function restore(file){const reader=new FileReader();reader.onload=()=>{try{state=normalizeState(JSON.parse(reader.result));persist();selectedCustomer="";resetOrder();renderCustomerList();renderHistory();renderProductSettings();els.settingsDialog.close();showToast("Podaci su uspešno uvezeni");}catch{showToast("Datoteka nije ispravna");}};reader.readAsText(file);}
function csvCell(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
function exportCsv(){
 if(!state.orders.length){showToast("Nema porudžbina za izvoz");return;}
 const productNames=[...new Set([...state.products,...state.orders.flatMap(o=>Object.keys(o.items||{}))])];
 const rows=[["Datum","Objekat",...productNames,"Napomena"],...state.orders.map(o=>[formatDateTime(o.createdAt),o.customer,...productNames.map(p=>o.items[p]||0),o.note||""])];
 const csv="\uFEFF"+rows.map(r=>r.map(csvCell).join(";")).join("\n");downloadFile(`porudzbine-${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv;charset=utf-8");showToast("CSV je pripremljen");
}
function clearAll(){if(!confirm("Obrisati sve kupce, artikle i porudžbine? Ovo ne može da se vrati bez rezervne kopije."))return;state=normalizeState({});persist();selectedCustomer="";resetOrder();renderCustomerList();renderHistory();renderProductSettings();els.settingsDialog.close();showToast("Svi podaci su obrisani");}

els.customerInput.addEventListener("input",markOrderFormChanged);
els.customerInput.addEventListener("change",()=>selectCustomer(els.customerInput.value));
els.customerInput.addEventListener("blur",()=>selectCustomer(els.customerInput.value,{preserveDraft:true}));
els.customerNote.addEventListener("input",markOrderFormChanged);els.orderNote.addEventListener("input",markOrderFormChanged);
els.customerNote.addEventListener("change",()=>{const name=els.customerInput.value.trim();if(!name)return;state.customers[name]={...(state.customers[name]||{}),note:els.customerNote.value.trim()};persist();renderCustomerList();});
els.saveBtn.addEventListener("click",saveOrder);els.newOrderBtn.addEventListener("click",resetOrder);els.historySearch.addEventListener("input",renderHistory);els.settingsBtn.addEventListener("click",()=>{renderProductSettings();els.settingsDialog.showModal();});els.addProductBtn.addEventListener("click",addProduct);els.newProductInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addProduct();}});els.backupBtn.addEventListener("click",backup);els.restoreInput.addEventListener("change",()=>els.restoreInput.files[0]&&restore(els.restoreInput.files[0]));els.clearAllBtn.addEventListener("click",clearAll);els.exportAllBtn.addEventListener("click",exportCsv);document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));

renderCustomerList();renderProducts();renderHistory();tick();setInterval(tick,30000);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
