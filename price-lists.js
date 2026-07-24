(()=>{
 "use strict";
 const PRICE_KEY="porudzbine-price-list-v1",ID_KEY="porudzbine-product-ids-v1";
 const root=document.getElementById("priceLists");
 const esc=value=>window.escapeHtml?escapeHtml(String(value)):String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
 const uid=()=>crypto.randomUUID?.()||`article-${Date.now()}-${Math.random().toString(16).slice(2)}`;
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
 function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
 function identities(){const saved=read(ID_KEY,[]),unused=[...saved],result=state.products.map(name=>{const index=unused.findIndex(item=>item?.name===name);return index>=0?unused.splice(index,1)[0]:{id:uid(),name}});write(ID_KEY,result);return result}
 function cleanPrices(){const valid=new Set(identities().map(item=>item.id)),prices=read(PRICE_KEY,{});let changed=false;Object.keys(prices).forEach(id=>{if(!valid.has(id)){delete prices[id];changed=true}});if(changed)write(PRICE_KEY,prices);return prices}
 function savePrice(id,value){const prices=cleanPrices();if(value==="")delete prices[id];else if(Number.isFinite(Number(value))&&Number(value)>=0)prices[id]=value;write(PRICE_KEY,prices)}
 function render(){if(!root)return;const products=identities(),prices=cleanPrices();root.innerHTML=products.length?`<div class="simple-price-list">${products.map(item=>`<label class="simple-price-row"><span><strong>${esc(item.name)}</strong></span><input type="number" min="0" step="0.01" inputmode="decimal" placeholder="Cena" aria-label="Cena za ${esc(item.name)}" data-price-id="${esc(item.id)}" value="${esc(prices[item.id]??"")}"></label>`).join("")}</div>`:'<div class="statistics-empty">Nema unetih artikala. Artikle možete dodati u tabu Artikli.</div>';root.querySelectorAll("[data-price-id]").forEach(input=>input.addEventListener("input",()=>savePrice(input.dataset.priceId,input.value)))}
 window.addEventListener("product-renamed",event=>{const {oldName,newName}=event.detail,items=read(ID_KEY,[]),item=items.find(entry=>entry.name===oldName);if(item)item.name=newName;write(ID_KEY,items);render()});
 window.addEventListener("products-changed",render);
 window.renderPriceLists=render;cleanPrices();
})();
