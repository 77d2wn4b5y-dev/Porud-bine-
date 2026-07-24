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
 window.renderProducts=function(keepValues={}){
  const previous=lastOrder(selectedCustomer)?.items||{};
  els.products.innerHTML="";
  els.noProducts.classList.toggle("hidden",state.products.length>0);
  productOrderForCustomer(selectedCustomer).forEach((name,index)=>{
   const oldQty=Number(previous[name]||0);
   const row=document.createElement("div");
   row.className="product-row row-grid product-row-v211";
   row.innerHTML=`<div class="product-name">${escapeHtml(name)}</div><div class="previous previous-v211"><span>${oldQty||"—"}</span>${oldQty?`<button type="button" class="repeat-qty" aria-label="Upiši prethodnu količinu ${oldQty}" title="Upiši prethodno">↺</button>`:""}</div><input class="qty" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="" aria-label="Danas ${escapeHtml(name)}" data-product="${escapeHtml(name)}" value="${escapeHtml(keepValues[name]||"")}" />`;
   const input=row.querySelector("input");
   const repeat=row.querySelector(".repeat-qty");
   paintQuantity(input,oldQty);
   input.addEventListener("focus",()=>input.select());
   input.addEventListener("input",()=>{input.value=input.value.replace(/[^0-9]/g,"");paintQuantity(input,oldQty);window.markOrderDirty?.();});
   input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=[...document.querySelectorAll(".qty")];(inputs[index+1]||els.orderNote).focus();}});
   repeat?.addEventListener("click",()=>{input.value=String(oldQty);paintQuantity(input,oldQty);window.markOrderDirty?.();window.updateDraftStatus();input.focus();});
   els.products.appendChild(row);
  });
  window.updateDraftStatus();
 };
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
