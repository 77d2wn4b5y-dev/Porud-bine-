(()=>{
 const RETENTION_KEY="porudzbine-retention-months-v1";
 const input=document.getElementById("customerInput");
 const box=document.getElementById("customerSuggestions");
 const retention=document.getElementById("retentionSelect");
 if(!input||!box)return;
 const norm=v=>String(v||"").trim().toLocaleLowerCase("sr");
 const fmt=v=>new Intl.DateTimeFormat("sr-RS",{dateStyle:"short"}).format(new Date(v));
 function customerStats(){
  const map=new Map();
  const names=new Set([...Object.keys(state.customers||{}),...(state.orders||[]).map(o=>o.customer)]);
  names.forEach(name=>map.set(norm(name),{name,total:0,last:null}));
  (state.orders||[]).forEach(o=>{const k=norm(o.customer);if(!map.has(k))map.set(k,{name:o.customer,total:0,last:null});const s=map.get(k);s.total+=Object.values(o.items||{}).reduce((a,n)=>a+(Number(n)||0),0);if(!s.last||new Date(o.createdAt)>new Date(s.last))s.last=o.createdAt;});
  return [...map.values()];
 }
 function hide(){box.classList.add("hidden");box.innerHTML="";}
 function showSuggestions(){
  const q=norm(input.value);if(!q){hide();return;}
  const rows=customerStats().filter(s=>norm(s.name).includes(q)).sort((a,b)=>{const ap=norm(a.name).startsWith(q)?0:1,bp=norm(b.name).startsWith(q)?0:1;return ap-bp||b.total-a.total||a.name.localeCompare(b.name,"sr");}).slice(0,8);
  box.innerHTML="";if(!rows.length){hide();return;}
  rows.forEach(s=>{const b=document.createElement("button");b.type="button";b.className="customer-suggestion";b.innerHTML=`<span><strong>${escapeHtml(s.name)}</strong><small>Ukupno trebovano: ${s.total}</small></span><span class="suggestion-last">${s.last?`Poslednja poseta<br><strong>${fmt(s.last)}</strong>`:"Bez prethodne posete"}</span>`;b.onclick=()=>{input.value=s.name;selectCustomer(s.name);hide();input.blur();};box.appendChild(b);});
  box.classList.remove("hidden");
 }
 input.addEventListener("input",showSuggestions);
 input.addEventListener("focus",showSuggestions);
 document.addEventListener("click",e=>{if(!e.target.closest(".customer-search-wrap"))hide();});

 const originalRender=renderProductSettings;
 renderProductSettings=function(){
  originalRender();
  [...document.querySelectorAll("#productSettings .settings-row")].forEach((row,index)=>{
   const name=state.products[index];if(!name)return;
   const edit=document.createElement("button");edit.type="button";edit.textContent="✏️";edit.setAttribute("aria-label","Preimenuj");
   edit.onclick=()=>renameProduct(name);row.insertBefore(edit,row.children[1]);row.classList.add("product-setting-row");
  });
 };
 function renameProduct(oldName){
  const newName=prompt(`Novi naziv za „${oldName}“:`,oldName)?.trim();if(!newName||newName===oldName)return;
  if(state.products.some(p=>norm(p)===norm(newName))){showToast("Artikal sa tim nazivom već postoji");return;}
  state.products=state.products.map(p=>p===oldName?newName:p);
  state.orders=(state.orders||[]).map(o=>{if(!(oldName in (o.items||{})))return o;const items={...o.items};items[newName]=(Number(items[newName])||0)+(Number(items[oldName])||0);delete items[oldName];return {...o,items};});
  persist();renderProductSettings();renderProducts(captureDraft());renderHistory();showToast("Naziv artikla je promenjen");
 }

 function cleanOldOrders(showMessage=false){
  const months=Number(localStorage.getItem(RETENTION_KEY)||0);if(!months)return 0;
  const cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-months);
  const before=state.orders.length;state.orders=state.orders.filter(o=>new Date(o.createdAt)>=cutoff);const removed=before-state.orders.length;
  if(removed){persist();renderHistory();renderCustomerList();if(showMessage)showToast(`Obrisano starih porudžbina: ${removed}`);}else if(showMessage)showToast("Nema porudžbina za brisanje");
  return removed;
 }
 if(retention){retention.value=localStorage.getItem(RETENTION_KEY)||"0";retention.addEventListener("change",()=>{const value=retention.value;if(value!=="0"&&!confirm(`Obrisati porudžbine starije od ${value} mesec(a)?`)){retention.value=localStorage.getItem(RETENTION_KEY)||"0";return;}localStorage.setItem(RETENTION_KEY,value);cleanOldOrders(true);});}
 cleanOldOrders(false);
 document.getElementById("saveBtn")?.addEventListener("click",()=>setTimeout(()=>cleanOldOrders(false),0));
 renderProductSettings();
})();