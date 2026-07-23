const PRODUCTS = ["Jabuka","Banana","Pomorandža","Kruška","Breskva","Nektarina","Grožđe","Lubenica","Dinja","Kivi"];
const STORAGE_KEY = "porudzbine-app-v1";

const state = loadState();
let selectedCustomer = "";

const els = {
  dateTime: document.getElementById("dateTime"),
  customerInput: document.getElementById("customerInput"),
  customerList: document.getElementById("customerList"),
  customerNote: document.getElementById("customerNote"),
  lastVisit: document.getElementById("lastVisit"),
  products: document.getElementById("products"),
  currentTotal: document.getElementById("currentTotal"),
  history: document.getElementById("history"),
  saveBtn: document.getElementById("saveBtn"),
  newOrderBtn: document.getElementById("newOrderBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  toast: document.getElementById("toast")
};

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { customers:{}, orders:[] }; }
  catch { return { customers:{}, orders:[] }; }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function formatDateTime(value){ return new Intl.DateTimeFormat("sr-RS",{dateStyle:"short",timeStyle:"short"}).format(new Date(value)); }
function tick(){ els.dateTime.textContent = new Intl.DateTimeFormat("sr-RS",{dateStyle:"full",timeStyle:"short"}).format(new Date()); }
function showToast(message){ els.toast.textContent=message; els.toast.classList.add("show"); setTimeout(()=>els.toast.classList.remove("show"),1800); }
function customerOrders(name){ return state.orders.filter(o=>o.customer.toLowerCase()===name.toLowerCase()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
function lastOrder(name){ return customerOrders(name)[0] || null; }

function renderCustomerList(){
  els.customerList.innerHTML="";
  Object.keys(state.customers).sort((a,b)=>a.localeCompare(b,"sr")).forEach(name=>{
    const option=document.createElement("option"); option.value=name; els.customerList.appendChild(option);
  });
}

function productOrderForCustomer(name){
  const orders=customerOrders(name);
  const totals=Object.fromEntries(PRODUCTS.map(p=>[p,0]));
  orders.forEach(o=>PRODUCTS.forEach(p=>totals[p]+=Number(o.items[p]||0)));
  return [...PRODUCTS].sort((a,b)=>totals[b]-totals[a] || PRODUCTS.indexOf(a)-PRODUCTS.indexOf(b));
}

function renderProducts(){
  const previous = lastOrder(selectedCustomer)?.items || {};
  els.products.innerHTML="";
  productOrderForCustomer(selectedCustomer).forEach((name,index)=>{
    const row=document.createElement("div"); row.className="product-row row-grid";
    row.innerHTML=`<div class="product-name">${name}</div><div class="previous">${Number(previous[name]||0)}</div><input class="qty" inputmode="numeric" pattern="[0-9]*" min="0" placeholder="" aria-label="Danas ${name}" data-product="${name}" />`;
    const input=row.querySelector("input");
    input.addEventListener("focus",()=>input.select());
    input.addEventListener("input",updateTotal);
    input.addEventListener("keydown",e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        const inputs=[...document.querySelectorAll(".qty")];
        inputs[index+1]?.focus();
      }
    });
    els.products.appendChild(row);
  });
  updateTotal();
}

function updateTotal(){
  const total=[...document.querySelectorAll(".qty")].reduce((sum,i)=>sum+(Number(i.value)||0),0);
  els.currentTotal.textContent=String(total);
}

function selectCustomer(name){
  selectedCustomer=name.trim();
  const customer=state.customers[selectedCustomer];
  els.customerNote.value=customer?.note || "";
  const last=lastOrder(selectedCustomer);
  els.lastVisit.textContent=last ? formatDateTime(last.createdAt) : "Nema prethodne porudžbine";
  renderProducts();
  renderHistory();
}

function resetOrder(){
  document.querySelectorAll(".qty").forEach(i=>i.value="");
  updateTotal();
  window.scrollTo({top:0,behavior:"smooth"});
}

function saveOrder(){
  const customer=els.customerInput.value.trim();
  if(!customer){ showToast("Unesi naziv objekta"); els.customerInput.focus(); return; }
  const items={};
  document.querySelectorAll(".qty").forEach(i=>items[i.dataset.product]=Number(i.value)||0);
  const total=Object.values(items).reduce((a,b)=>a+b,0);
  if(total===0){ showToast("Unesi bar jednu količinu"); return; }
  state.customers[customer]={note:els.customerNote.value.trim()};
  state.orders.unshift({id:crypto.randomUUID?.() || String(Date.now()),customer,createdAt:new Date().toISOString(),items,total});
  persist();
  selectedCustomer=customer;
  renderCustomerList();
  els.lastVisit.textContent=formatDateTime(state.orders[0].createdAt);
  renderProducts();
  renderHistory();
  showToast("Porudžbina uspešno sačuvana");
}

function renderHistory(){
  const orders=selectedCustomer ? customerOrders(selectedCustomer) : state.orders;
  els.history.innerHTML="";
  if(!orders.length){ els.history.innerHTML='<div class="history-empty">Još nema sačuvanih porudžbina.</div>'; return; }
  orders.slice(0,20).forEach(order=>{
    const details=Object.entries(order.items).filter(([,q])=>q>0).map(([p,q])=>`${p}: ${q}`).join(" · ");
    const item=document.createElement("article"); item.className="history-item";
    item.innerHTML=`<div class="history-top"><span class="history-customer">${order.customer}</span><span>${formatDateTime(order.createdAt)}</span></div><div class="history-details">${details || "Bez stavki"}\nUkupno: ${order.total}</div><div class="history-actions"><button data-action="copy">Kopiraj</button><button data-action="load">Učitaj</button><button data-action="delete" class="danger">Obriši</button></div>`;
    item.querySelector('[data-action="copy"]').onclick=async()=>{
      const text=`${order.customer}\n${formatDateTime(order.createdAt)}\n${Object.entries(order.items).filter(([,q])=>q>0).map(([p,q])=>`${p}: ${q}`).join("\n")}\nUkupno: ${order.total}`;
      try{ await navigator.clipboard.writeText(text); showToast("Porudžbina kopirana"); }catch{ showToast("Kopiranje nije dostupno"); }
    };
    item.querySelector('[data-action="load"]').onclick=()=>{
      els.customerInput.value=order.customer; selectCustomer(order.customer);
      document.querySelectorAll(".qty").forEach(i=>i.value=order.items[i.dataset.product] || ""); updateTotal();
      window.scrollTo({top:0,behavior:"smooth"});
    };
    item.querySelector('[data-action="delete"]').onclick=()=>{
      if(!confirm("Obrisati ovu porudžbinu?")) return;
      state.orders=state.orders.filter(o=>o.id!==order.id); persist(); selectCustomer(selectedCustomer); showToast("Porudžbina obrisana");
    };
    els.history.appendChild(item);
  });
}

els.customerInput.addEventListener("change",()=>selectCustomer(els.customerInput.value));
els.customerInput.addEventListener("blur",()=>selectCustomer(els.customerInput.value));
els.customerNote.addEventListener("change",()=>{
  const name=els.customerInput.value.trim(); if(!name) return;
  state.customers[name]={note:els.customerNote.value.trim()}; persist(); renderCustomerList();
});
els.saveBtn.addEventListener("click",saveOrder);
els.newOrderBtn.addEventListener("click",resetOrder);
els.clearHistoryBtn.addEventListener("click",()=>{
  if(!state.orders.length || !confirm("Obrisati sve sačuvane porudžbine?")) return;
  state.orders=[]; persist(); selectCustomer(selectedCustomer); showToast("Istorija obrisana");
});

renderCustomerList(); renderProducts(); renderHistory(); tick(); setInterval(tick,30000);
