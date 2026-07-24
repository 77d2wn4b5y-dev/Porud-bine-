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
   input.addEventListener("input",()=>{input.value=input.value.replace(/[^0-9]/g,"");paintQuantity(input,oldQty);window.updateDraftStatus();});
   input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=[...document.querySelectorAll(".qty")];(inputs[index+1]||els.orderNote).focus();}});
   repeat?.addEventListener("click",()=>{input.value=String(oldQty);paintQuantity(input,oldQty);window.updateDraftStatus();input.focus();});
   els.products.appendChild(row);
  });
  window.updateDraftStatus();
 };
 window.renderProducts(captureDraft());
})();
