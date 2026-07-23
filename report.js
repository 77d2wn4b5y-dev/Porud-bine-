(()=>{
  const dateInput=document.getElementById("dailyExportDate");
  const exportBtn=document.getElementById("dailyExportBtn");
  if(!dateInput||!exportBtn)return;

  function localDateKey(value){
    const d=new Date(value);
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function allProductNames(orders){
    return [...new Set([...state.products,...orders.flatMap(o=>Object.keys(o.items||{}))])];
  }

  function buildDailyRows(dateKey){
    const dailyOrders=state.orders.filter(order=>localDateKey(order.createdAt)===dateKey);
    if(!dailyOrders.length)return null;

    const products=allProductNames(dailyOrders);
    const grouped=new Map();

    dailyOrders.forEach(order=>{
      const customer=String(order.customer||"").trim()||"Bez naziva";
      const key=customer.toLocaleLowerCase("sr");
      if(!grouped.has(key))grouped.set(key,{customer,items:{},notes:[]});
      const target=grouped.get(key);
      products.forEach(product=>{
        target.items[product]=(Number(target.items[product])||0)+(Number(order.items?.[product])||0);
      });
      if(order.note&&order.note.trim()&&!target.notes.includes(order.note.trim()))target.notes.push(order.note.trim());
    });

    const customers=[...grouped.values()].sort((a,b)=>a.customer.localeCompare(b.customer,"sr"));
    const header=["Datum","Kupac / objekat",...products,"Ukupno komada","Napomena"];
    const rows=customers.map(entry=>{
      const quantities=products.map(product=>Number(entry.items[product])||0);
      const total=quantities.reduce((sum,n)=>sum+n,0);
      return [dateKey,entry.customer,...quantities,total,entry.notes.join(" | ")];
    });

    const totals=["","UKUPNO",...products.map((_,index)=>rows.reduce((sum,row)=>sum+(Number(row[index+2])||0),0)),rows.reduce((sum,row)=>sum+(Number(row[2+products.length])||0),0),""];
    return [header,...rows,totals];
  }

  function exportDaily(){
    const dateKey=dateInput.value;
    if(!dateKey){showToast("Izaberi datum");dateInput.focus();return;}
    const rows=buildDailyRows(dateKey);
    if(!rows){showToast("Za taj datum nema porudžbina");return;}
    const csv="\uFEFFsep=;\n"+rows.map(row=>row.map(csvCell).join(";")).join("\n");
    downloadFile(`objedinjena-narudzbenica-${dateKey}.csv`,csv,"text/csv;charset=utf-8");
    showToast("Objedinjena narudžbenica je pripremljena");
  }

  dateInput.value=localDateKey(new Date());
  exportBtn.addEventListener("click",exportDaily);
})();
