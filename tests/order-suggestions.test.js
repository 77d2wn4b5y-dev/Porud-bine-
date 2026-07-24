const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
class Element{
 constructor(id=""){this.id=id;this.children=[];this.listeners={};this.classList={add(){},remove(){},toggle(){},contains(){return false}};this.value="";this.textContent="";}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 click(){(this.listeners.click||[]).forEach(fn=>fn({target:this}))}
 removeAttribute(){} setAttribute(){} appendChild(child){this.children.push(child)} replaceChildren(...children){this.children=children} focus(){} select(){}
 set innerHTML(html){this._html=html;if(html==="")this.children=[];if(html.includes('class="qty"')){const input=new Element();input.matches=s=>s===".qty";input.dataset={product:(html.match(/data-product="([^"]*)"/)||[])[1]};input.value=(html.match(/value="([^"]*)"/)||[])[1]||"";input.classList={add(){},remove(){},toggle(){}};this.input=input;this.repeat=html.includes("repeat-qty")?new Element():null}}
 get innerHTML(){return this._html||""} querySelectorAll(){return[]} querySelector(selector){return selector==="input"?this.input:selector===".repeat-qty"?this.repeat:null}
}
const ids={},get=id=>ids[id]??=(new Element(id));
const document={getElementById:get,createElement:()=>new Element(),querySelectorAll:s=>s===".qty"?get("products").children.map(x=>x.input).filter(Boolean):[],addEventListener(){}};
const products=Array.from({length:25},(_,i)=>`Artikal ${i+1}`),orders=[
 {customer:"Drugi",createdAt:"2026-07-20",items:{"Artikal 20":60,"Artikal 19":10,"Artikal 2":1}},
 {customer:"Drugi",createdAt:"2026-07-21",items:{"Artikal 19":45,"Artikal 18":8}},
 {customer:"Stari",createdAt:"2026-07-22",items:{"Artikal 20":2,"Artikal 3":2,"Artikal 4":2}},
 {customer:"Stari",createdAt:"2026-07-23",items:{"Artikal 20":1,"Artikal 3":1}}
];
const context={console,window:null,document,state:{products,orders},selectedCustomer:"",els:{products:get("products"),noProducts:get("noProducts"),orderNote:get("orderNote"),draftStatus:get("draftStatus"),customerNote:get("customerNote"),customerInput:get("customerInput"),saveBtn:get("saveBtn"),toast:get("toast")},captureDraft(){const out={};document.querySelectorAll(".qty").forEach(i=>out[i.dataset.product]=i.value);return out},lastOrder(name){return orders.filter(o=>o.customer===name).at(-1)||null},customerOrders(name){return orders.filter(o=>o.customer===name).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))},escapeHtml:String,markOrderFormChanged(){},setTimeout,clearTimeout,confirm:()=>true,resetOrder(){},addEventListener(){}};context.window=context;vm.runInNewContext(fs.readFileSync("order-ui-v211.js","utf8"),context);
const api=context.orderProductSuggestions;
assert.equal(api.suggestedProductsForCustomer("").items.length,10,"bez kupca mora biti 10");
assert.equal(api.suggestedProductsForCustomer("Novi").items.length,10,"novi kupac mora biti 10");
assert.equal(api.globalTopProducts()[0],"Artikal 20","prodaja, a ne katalog, određuje vrh");
assert.ok(api.globalTopProducts().indexOf("Artikal 19")<api.globalTopProducts().indexOf("Artikal 18"),"veća količina ima prednost");
assert.equal(new Set(api.globalTopProducts()).size,api.globalTopProducts().length,"nema duplikata");
assert.equal(get("products").children.length,10,"inicijalni prikaz mora biti 10");
get("products").children[0].input.value="7";get("products").children[0].input.listeners.input[0]();
get("toggleAllProductsBtn").click();assert.equal(get("products").children.length,25,"dugme prikazuje svih 25");
get("toggleAllProductsBtn").click();assert.equal(get("products").children.length,10,"povratak prikazuje 10");assert.equal(get("products").children[0].input.value,"7","količina ostaje sačuvana");
context.selectedCustomer="Stari";context.renderProducts({});assert.equal(get("products").children.length,7,"prosek 3 i 2, zaokruženo 3, plus 4");
context.state.products.push({id:"inactive",name:"Neaktivan",status:"inactive"});assert.ok(!api.globalTopProducts().includes("Neaktivan"));
console.log("order suggestion tests: OK");
