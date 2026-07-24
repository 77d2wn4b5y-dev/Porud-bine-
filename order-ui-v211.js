(()=>{
 const originalRenderProducts=window.renderProducts;
 function paintQuantity(input,previous){
  const value=Number(input.value)||0;
  input.classList.remove("qty-entered","qty-same","qty-changed");
  if(!value)return;
  if(previous>0&&value===previous)input.classList.add("qty-same");
  else if(previous>0)input.classList.add("qty-changed");
  else input.classList.add("qty-entered");
 }
 window.updateDraftStatus=function(){
  const inputs=[...document.querySelectorAll(".qty")];
  const articleCount=inputs.filter(i=>(Number(i.value)||0)>0).length;
  const total=inputs.reduce((sum,i)=>sum+(Number(i.value)||0),0);
  els.draftStatus.textContent=articleCount?`Artikala: ${articleCount} • Ukupno: ${total} kom`:"Nova porudžbina";
 };
 const suggestionInfo=document.getElementById("productSuggestionInfo");
 const toggleAllBtn=document.getElementById("toggleAllProductsBtn");
 const extraProductBox=document.getElementById("extraProductBox");
 let showAllProducts=false;
 const normalizedName=value=>String(value||"").trim().toLocaleLowerCase("sr");
 function productRecord(product,index){
  const object=product&&typeof product==="object"?product:null;
  const name=String(object?.name??object?.title??product??"").trim(),id=object?.id??object?.productId??object?.product_id;
  return{name,id:id==null||id===""?null:String(id),key:id==null||id===""?`name:${normalizedName(name)}`:`id:${id}`,index,active:object?.active!==false&&object?.isActive!==false&&object?.deleted!==true&&object?.status!=="inactive"};
 }
 function activeProductRecords(){const seen=new Set();return(state.products||[]).map(productRecord).filter(product=>product.name&&product.active&&!seen.has(product.key)&&seen.add(product.key));}
 function activeProducts(){return activeProductRecords().map(product=>product.name);}
 function orderDate(order){const value=new Date(order?.createdAt??order?.date??0).getTime();return Number.isFinite(value)?value:0;}
 function orderEntries(order,records=activeProductRecords()){
  const byId=new Map(records.filter(x=>x.id).map(x=>[x.id,x])),byName=new Map(records.map(x=>[normalizedName(x.name),x]));
  const raw=Array.isArray(order?.items)?order.items:Object.entries(order?.items&&typeof order.items==="object"?order.items:{}).map(([name,value])=>({name,value})),found=new Map();
  raw.forEach(entry=>{const value=entry?.value??entry,id=entry?.productId??entry?.product_id??entry?.id??(value&&typeof value==="object"?(value.productId??value.product_id??value.id):null),name=entry?.name??entry?.productName??entry?.product??(value&&typeof value==="object"?(value.name??value.productName):null),product=(id!=null?byId.get(String(id)):null)||byName.get(normalizedName(name)),quantity=Number(value&&typeof value==="object"?(value.quantity??value.qty??value.amount):value)||0;if(product&&quantity>0)found.set(product.key,{product,quantity:(found.get(product.key)?.quantity||0)+quantity});});
  return[...found.values()];
 }
 function globalTopProducts(limit=10){
  const products=activeProductRecords(),stats=new Map(products.map(product=>[product.key,{product,quantity:0,orders:0,lastSold:0}]));
  (Array.isArray(state.orders)?state.orders:[]).forEach(order=>orderEntries(order,products).forEach(({product,quantity})=>{const current=stats.get(product.key);current.quantity+=quantity;current.orders++;current.lastSold=Math.max(current.lastSold,orderDate(order));}));
  return[...stats.values()].filter(x=>x.quantity>0).sort((a,b)=>b.quantity-a.quantity||b.orders-a.orders||b.lastSold-a.lastSold||a.product.index-b.product.index).slice(0,limit).map(x=>x.product.name);
 }
 function fillUnique(list,source,limit){
  const active=new Set(activeProducts());source.forEach(name=>{if(list.length<limit&&active.has(name)&&!list.includes(name))list.push(name);});
  return list;
 }
 function suggestedProductsForCustomer(name){
  const products=activeProducts();
  if(!products.length)return{items:[],title:"10 najprodavanijih artikala",hasHistory:false,total:0};
  const orders=name?customerOrders(name).slice(0,10):[];
  const records=activeProductRecords(),entriesByOrder=orders.map(order=>orderEntries(order,records));
  const global=globalTopProducts(10);
  if(!orders.length){return{items:fillUnique([...global],products,Math.min(10,products.length)),title:"10 najprodavanijih artikala",hasHistory:false,total:products.length};}
  const stats=new Map();
  entriesByOrder.forEach((entries,orderIndex)=>entries.forEach(({product,quantity})=>{
   const current=stats.get(product.key)||{name:product.name,count:0,qty:0,lastIndex:Infinity,index:product.index};
   current.count++;current.qty+=quantity;current.lastIndex=Math.min(current.lastIndex,orderIndex);stats.set(product.key,current);
  }));
  const average=entriesByOrder.reduce((sum,entries)=>sum+entries.length,0)/orders.length;
  const limit=Math.min(products.length,Math.round(average)+4);
  const ranked=[...stats.values()].sort((a,b)=>b.count-a.count||b.qty-a.qty||a.lastIndex-b.lastIndex||a.index-b.index).map(x=>x.name);
  const items=fillUnique(fillUnique(ranked,global,limit),products,limit);
  return{items,title:"Najčešći artikli ovog kupca",hasHistory:true,total:products.length};
 }
 const draftValues={};
 function currentVisibleProducts(){
  const products=activeProducts(),suggested=suggestedProductsForCustomer(selectedCustomer);
  if(showAllProducts)return{items:products,meta:{...suggested,title:"Svi aktivni artikli"}};
  return{items:suggested.items,meta:suggested};
 }
 function refreshSuggestionInfo(count,meta){
  if(suggestionInfo){suggestionInfo.innerHTML=`<strong>${escapeHtml(meta.title)}</strong><span>Prikazano: ${count} od ${meta.total} artikala</span>`;}
  if(toggleAllBtn){toggleAllBtn.classList.toggle("hidden",meta.total===0);toggleAllBtn.textContent=showAllProducts?"Prikaži predložene artikle":"Prikaži sve artikle";}
 }
 window.renderProducts=function(keepValues={}){
  Object.assign(draftValues,keepValues);
  const previous=lastOrder(selectedCustomer)?.items||{};
  const visible=currentVisibleProducts();
  els.products.innerHTML="";
  els.noProducts.classList.toggle("hidden",activeProducts().length>0);
  visible.items.forEach((name,index)=>{
   const oldQty=Number(previous[name]||0);
   const row=document.createElement("div");
   row.className="product-row row-grid product-row-v211";
   row.innerHTML=`<div class="product-name">${escapeHtml(name)}</div><div class="previous previous-v211"><span>${oldQty||"—"}</span>${oldQty?`<button type="button" class="repeat-qty" aria-label="Upiši prethodnu količinu ${oldQty}" title="Upiši prethodno">↺</button>`:""}</div><input class="qty" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="" aria-label="Danas ${escapeHtml(name)}" data-product="${escapeHtml(name)}" value="${escapeHtml(draftValues[name]??"")}" />`;
   const input=row.querySelector("input");
   const repeat=row.querySelector(".repeat-qty");
   paintQuantity(input,oldQty);
   input.addEventListener("focus",()=>input.select());
   input.addEventListener("input",()=>{input.value=input.value.replace(/[^0-9]/g,"");draftValues[name]=input.value;paintQuantity(input,oldQty);window.markOrderDirty?.();});
   input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=[...document.querySelectorAll(".qty")];(inputs[index+1]||els.orderNote).focus();}});
   repeat?.addEventListener("click",()=>{input.value=String(oldQty);draftValues[name]=input.value;paintQuantity(input,oldQty);window.markOrderDirty?.();window.updateDraftStatus();input.focus();});
   els.products.appendChild(row);
  });
  refreshSuggestionInfo(visible.items.length,visible.meta);
  extraProductBox?.classList.add("hidden");
  window.updateDraftStatus();
 };
 toggleAllBtn?.addEventListener("click",()=>{const draft=captureDraft();showAllProducts=!showAllProducts;window.renderProducts(draft);});
 window.recalculateSuggestedProducts=function(){window.renderProducts(captureDraft());};
 window.orderProductSuggestions={globalTopProducts,suggestedProductsForCustomer};
 const totalLabel=document.getElementById("orderTotal");
 const customerLabel=document.getElementById("selectedCustomerLabel");
 let orderDirty=true;
 function refreshCustomerLabel(){
  const name=els.customerInput.value.trim();
  customerLabel.textContent=name||"Kupac nije izabran";
  customerLabel.classList.toggle("empty",!name);
 }
 window.markOrderDirty=function(){
  orderDirty=true;
  window.markOrderFormChanged?.();
  els.draftStatus.textContent="Nesnimljeno";
  els.draftStatus.className="save-status unsaved";
 };
 window.updateDraftStatus=function(){
  const total=[...document.querySelectorAll(".qty")].reduce((sum,input)=>sum+(Number(input.value)||0),0);
  if(totalLabel)totalLabel.textContent=`Ukupno: ${total}`;
  els.draftStatus.textContent=orderDirty?"Nesnimljeno":"Sačuvano";
  els.draftStatus.className=`save-status ${orderDirty?"unsaved":"saved"}`;
 };
 els.products.addEventListener("focusout",event=>{if(event.target.matches(".qty"))window.updateDraftStatus();});
 els.products.addEventListener("change",event=>{if(event.target.matches(".qty"))window.updateDraftStatus();});
 [els.customerNote,els.orderNote].forEach(field=>field.addEventListener("input",window.markOrderDirty));
 els.customerInput.addEventListener("input",()=>{refreshCustomerLabel();window.markOrderDirty();});
 els.customerInput.addEventListener("change",refreshCustomerLabel);
 document.getElementById("newOrderBtn")?.addEventListener("click",()=>{orderDirty=true;refreshCustomerLabel();window.updateDraftStatus();});
 els.saveBtn.addEventListener("click",()=>setTimeout(()=>{if(els.toast.textContent.includes("sačuvana")){orderDirty=false;refreshCustomerLabel();window.updateDraftStatus();}},0));
 refreshCustomerLabel();
 const cancel=document.getElementById("cancelOrderBtn");
 if(cancel){
  cancel.addEventListener("click",()=>{
   const hasDraft=Boolean(document.getElementById("customerInput")?.value.trim()||document.getElementById("orderNote")?.value.trim()||[...document.querySelectorAll(".qty")].some(i=>(Number(i.value)||0)>0));
   if(hasDraft&&!confirm("Otkaži ovu porudžbinu i obriši sve trenutno unete podatke?"))return;
   resetOrder();
   showToast("Porudžbina je otkazana");
  });
 }
 window.renderProducts(captureDraft());
})();

(()=>{
 const input=document.getElementById("customerInput"),panel=document.getElementById("customerSuggestions");
 if(!input||!panel)return;
 input.removeAttribute("list");
 input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");input.setAttribute("aria-expanded","false");input.setAttribute("aria-controls","customerSuggestions");
 panel.setAttribute("role","listbox");
 const norm=v=>String(v||"").trim().toLocaleLowerCase("sr");
 let active=-1,items=[];
 function names(){return [...new Set([...Object.keys(state.customers||{}),...(state.orders||[]).map(o=>o.customer)])].filter(Boolean);}
 function relativeDate(value){if(!value)return "Nema trebovanja";const days=Math.floor((Date.now()-new Date(value).getTime())/86400000);if(days<=0)return "Danas";if(days===1)return "Juče";if(days<7)return `Pre ${days} dana`;return new Intl.DateTimeFormat("sr-RS",{dateStyle:"short"}).format(new Date(value));}
 function close(){panel.classList.add("hidden");input.setAttribute("aria-expanded","false");active=-1;items=[];}
 function choose(name,isNew=false){input.value=name;selectCustomer(name);input.dispatchEvent(new Event("change",{bubbles:true}));window.markOrderDirty?.();close();if(isNew)showToast(`Novi kupac „${name}“ biće dodat kada sačuvaš trebovanje`);}
 function setActive(index){if(!items.length)return;active=(index+items.length)%items.length;items.forEach((el,i)=>el.classList.toggle("active",i===active));items[active]?.scrollIntoView({block:"nearest"});}
 function render(){
  const q=norm(input.value),all=names(),exact=all.some(n=>norm(n)===q);
  const matches=all.map(name=>{const meta=state.customers?.[name]||{};const order=lastOrder(name);return{name,meta,last:order?.createdAt||null};}).filter(x=>!q||norm(x.name).includes(q)||norm(x.meta.code).includes(q)).sort((a,b)=>Number(Boolean(b.meta.favorite))-Number(Boolean(a.meta.favorite))||a.name.localeCompare(b.name,"sr")).slice(0,30);
  panel.innerHTML="";
  matches.forEach(({name,meta,last})=>{const button=document.createElement("button");button.type="button";button.className="customer-suggestion";button.setAttribute("role","option");button.innerHTML=`<span class="customer-suggestion-main"><strong>${meta.favorite?"⭐ ":""}${escapeHtml(name)}</strong>${meta.code?`<small>Šifra: ${escapeHtml(meta.code)}</small>`:""}${meta.note?`<small class="customer-suggestion-note">${escapeHtml(meta.note)}</small>`:""}</span><span class="customer-suggestion-date">${relativeDate(last)}</span>`;button.addEventListener("mousedown",e=>e.preventDefault());button.addEventListener("click",()=>choose(name));panel.appendChild(button);});
  if(q&&!exact){const add=document.createElement("button");add.type="button";add.className="customer-suggestion customer-suggestion-add";add.setAttribute("role","option");add.innerHTML=`<span class="customer-suggestion-plus">＋</span><span><strong>Dodaj novog kupca</strong><small>${escapeHtml(input.value.trim())}</small></span>`;add.addEventListener("mousedown",e=>e.preventDefault());add.addEventListener("click",()=>choose(input.value.trim(),true));panel.appendChild(add);}
  items=[...panel.querySelectorAll(".customer-suggestion")];active=-1;panel.classList.toggle("hidden",!items.length);input.setAttribute("aria-expanded",String(Boolean(items.length)));
 }
 input.addEventListener("focus",render);
 input.addEventListener("input",render);
 input.addEventListener("keydown",e=>{if(e.key==="ArrowDown"){e.preventDefault();if(panel.classList.contains("hidden"))render();setActive(active+1);}else if(e.key==="ArrowUp"){e.preventDefault();if(panel.classList.contains("hidden"))render();setActive(active-1);}else if(e.key==="Enter"&&active>=0){e.preventDefault();items[active].click();}else if(e.key==="Escape")close();});
 document.addEventListener("pointerdown",e=>{if(!e.target.closest(".customer-search-wrap"))close();});
 window.addEventListener("customers-changed",()=>{if(document.activeElement===input)render();});
 document.getElementById("newOrderBtn")?.addEventListener("click",()=>setTimeout(()=>{input.focus();render();},300));
})();
