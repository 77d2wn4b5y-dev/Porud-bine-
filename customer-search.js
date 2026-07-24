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
 function render(){const q=norm(input.value);const exact=names().some(n=>norm(n)===q);const matches=names().map(name=>{const meta=state.customers?.[name]||{};const order=lastOrder(name);return{name,meta,last:order?.createdAt||null};}).filter(x=>!q||norm(x.name).includes(q)||norm(x.meta.code).includes(q)).sort((a,b)=>Number(Boolean(b.meta.favorite))-Number(Boolean(a.meta.favorite))||a.name.localeCompare(b.name,"sr")).slice(0,30);
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