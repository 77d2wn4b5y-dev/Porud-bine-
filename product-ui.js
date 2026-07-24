(()=>{
 const CATEGORY_KEY="porudzbine-product-categories-v1";
 const TOP_LIMIT=12;
 const extraSelect=document.getElementById("extraProductSelect");
 const extraBox=document.getElementById("extraProductBox");
 const categoryList=document.getElementById("categorySettingsList");
 const categoryInput=document.getElementById("newCategoryInput");
 const addCategoryBtn=document.getElementById("addCategoryBtn");
 let visibleExtras=new Set();
 const norm=v=>String(v||"").trim().toLocaleLowerCase("sr");
 function loadCategories(){
  try{
   const saved=JSON.parse(localStorage.getItem(CATEGORY_KEY));
   if(saved&&Array.isArray(saved.names)&&saved.assignments)return saved;
  }catch(e){console.warn(e)}
  return{names:["Ostalo"],assignments:{}};
 }
 let categories=loadCategories();
 function saveCategories(){localStorage.setItem(CATEGORY_KEY,JSON.stringify(categories));}
 function ensureCategories(){
  categories.names=[...new Set((categories.names||[]).map(x=>String(x).trim()).filter(Boolean))];
  if(!categories.names.length)categories.names=["Ostalo"];
  Object.keys(categories.assignments||{}).forEach(p=>{if(!state.products.includes(p))delete categories.assignments[p];});
  state.products.forEach(p=>{if(!categories.names.includes(categories.assignments[p]))categories.assignments[p]=categories.names[0];});
  saveCategories();
 }
 function totals(){
  const map=Object.fromEntries(state.products.map(p=>[p,0]));
  (state.orders||[]).forEach(o=>Object.entries(o.items||{}).forEach(([p,q])=>{if(p in map)map[p]+=Number(q)||0;}));
  return map;
 }
 function topProducts(){
  const t=totals();
  return [...state.products].sort((a,b)=>t[b]-t[a]||state.products.indexOf(a)-state.products.indexOf(b)).slice(0,TOP_LIMIT);
 }
 function rowFor(name,previous,keepValues){
  const row=document.createElement("div");row.className="product-row row-grid compact-product-row";
  row.innerHTML=`<div class="product-name"><span>${escapeHtml(name)}</span><small>${escapeHtml(categories.assignments[name]||"")}</small></div><div class="previous">${Number(previous[name]||0)||"—"}</div><input class="qty" inputmode="numeric" pattern="[0-9]*" min="0" aria-label="Danas ${escapeHtml(name)}" data-product="${escapeHtml(name)}" value="${escapeHtml(keepValues[name]||"")}" />`;
  const input=row.querySelector("input");
  input.addEventListener("focus",()=>input.select());
  input.addEventListener("input",()=>{input.value=input.value.replace(/[^0-9]/g,"");updateDraftStatus();});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const inputs=[...document.querySelectorAll(".qty")];const index=inputs.indexOf(input);(inputs[index+1]||extraSelect||els.orderNote).focus();}});
  return row;
 }
 const baseRenderProducts=renderProducts;
 renderProducts=function(keepValues={}){
  ensureCategories();
  const previous=lastOrder(selectedCustomer)?.items||{};
  const entered=Object.keys(keepValues).filter(p=>keepValues[p]!==""&&keepValues[p]!=null);
  entered.forEach(p=>{if(state.products.includes(p))visibleExtras.add(p);});
  const top=topProducts();
  const visible=[...top,...state.products.filter(p=>visibleExtras.has(p)&&!top.includes(p))];
  els.products.innerHTML="";
  els.noProducts.classList.toggle("hidden",state.products.length>0);
  visible.forEach(name=>els.products.appendChild(rowFor(name,previous,keepValues)));
  renderExtraSelect(visible);
  updateDraftStatus();
 };
 function renderExtraSelect(visible){
  if(!extraSelect||!extraBox)return;
  extraSelect.innerHTML='<option value="">Izaberi iz kategorije…</option>';
  const remaining=state.products.filter(p=>!visible.includes(p));
  categories.names.forEach(cat=>{
   const products=remaining.filter(p=>categories.assignments[p]===cat);
   if(!products.length)return;
   const group=document.createElement("optgroup");group.label=cat;
   products.forEach(p=>{const option=document.createElement("option");option.value=p;option.textContent=p;group.appendChild(option);});
   extraSelect.appendChild(group);
  });
  extraBox.classList.toggle("hidden",remaining.length===0);
 }
 extraSelect?.addEventListener("change",()=>{
  const name=extraSelect.value;if(!name)return;
  const draft=captureDraft();visibleExtras.add(name);renderProducts(draft);
  requestAnimationFrame(()=>document.querySelector(`.qty[data-product="${CSS.escape(name)}"]`)?.focus());
 });
 const baseReset=resetOrder;
 resetOrder=function(){visibleExtras.clear();baseReset();};
 const baseLoadOrder=loadOrder;
 loadOrder=function(order){
  visibleExtras=new Set(Object.entries(order.items||{}).filter(([,q])=>Number(q)>0).map(([p])=>p));
  els.customerInput.value=order.customer;selectCustomer(order.customer);els.orderNote.value=order.note||"";renderProducts(order.items||{});updateDraftStatus();switchTab("order");window.scrollTo({top:0,behavior:"smooth"});showToast("Porudžbina je učitana kao nova");
 };
 function renderCategories(){
  ensureCategories();if(!categoryList)return;categoryList.innerHTML="";
  categories.names.forEach((name,index)=>{
   const count=state.products.filter(p=>categories.assignments[p]===name).length;
   const row=document.createElement("div");row.className="category-setting-row";
   row.innerHTML=`<span><strong>${escapeHtml(name)}</strong><small>${count} artikala</small></span><button type="button" data-action="rename">✏️</button><button type="button" data-action="delete" class="danger">✕</button>`;
   row.querySelector('[data-action="rename"]').onclick=()=>renameCategory(name);
   row.querySelector('[data-action="delete"]').onclick=()=>deleteCategory(name);
   categoryList.appendChild(row);
  });
 }
 function addCategory(){
  const name=categoryInput.value.trim();if(!name)return;
  if(categories.names.some(c=>norm(c)===norm(name))){showToast("Kategorija već postoji");return;}
  categories.names.push(name);categoryInput.value="";saveCategories();renderCategories();renderProductSettings();showToast("Kategorija je dodata");
 }
 function renameCategory(oldName){
  const name=prompt("Novi naziv kategorije:",oldName)?.trim();if(!name||name===oldName)return;
  if(categories.names.some(c=>c!==oldName&&norm(c)===norm(name))){showToast("Kategorija već postoji");return;}
  categories.names=categories.names.map(c=>c===oldName?name:c);
  Object.keys(categories.assignments).forEach(p=>{if(categories.assignments[p]===oldName)categories.assignments[p]=name;});
  saveCategories();renderCategories();renderProductSettings();renderProducts(captureDraft());
 }
 function deleteCategory(name){
  if(categories.names.length===1){showToast("Mora ostati bar jedna kategorija");return;}
  const fallback=categories.names.find(c=>c!==name);
  if(!confirm(`Obrisati kategoriju „${name}“? Artikli će preći u „${fallback}“.`))return;
  categories.names=categories.names.filter(c=>c!==name);Object.keys(categories.assignments).forEach(p=>{if(categories.assignments[p]===name)categories.assignments[p]=fallback;});
  saveCategories();renderCategories();renderProductSettings();renderProducts(captureDraft());
 }
 addCategoryBtn?.addEventListener("click",addCategory);
 window.addEventListener("product-renamed",event=>{const {oldName,newName}=event.detail;if(categories.assignments[oldName]){categories.assignments[newName]=categories.assignments[oldName];delete categories.assignments[oldName];saveCategories();}});
 categoryInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCategory();}});
 const baseRenderSettings=renderProductSettings;
 renderProductSettings=function(){
  ensureCategories();baseRenderSettings();
  [...document.querySelectorAll("#productSettings .settings-row")].forEach((row,index)=>{
   const product=state.products[index];if(!product)return;
   const select=document.createElement("select");select.className="product-category-select";select.setAttribute("aria-label",`Kategorija za ${product}`);
   categories.names.forEach(cat=>{const option=document.createElement("option");option.value=cat;option.textContent=cat;option.selected=categories.assignments[product]===cat;select.appendChild(option);});
   select.onchange=()=>{categories.assignments[product]=select.value;saveCategories();renderProducts(captureDraft());};
   row.insertBefore(select,row.children[1]);row.classList.add("category-product-row");
  });
  renderCategories();
 };
 const baseAddProduct=addProduct;
 addProduct=function(){const before=[...state.products];baseAddProduct();const added=state.products.find(p=>!before.includes(p));if(added){ensureCategories();categories.assignments[added]=categories.names[0];saveCategories();renderProductSettings();renderProducts(captureDraft());}};
 const baseDeleteProduct=deleteProduct;
 deleteProduct=function(name){baseDeleteProduct(name);if(!state.products.includes(name)){delete categories.assignments[name];visibleExtras.delete(name);saveCategories();renderCategories();}};
 ensureCategories();renderCategories();renderProductSettings();renderProducts();
})();
