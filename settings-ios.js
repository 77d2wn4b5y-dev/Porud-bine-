(()=>{
 "use strict";
 const dialog=document.getElementById("settingsDialog"),home=document.getElementById("settingsHome"),panels=document.getElementById("settingsPanels"),back=document.getElementById("settingsBackBtn"),title=document.getElementById("settingsTitle"),subtitle=document.getElementById("settingsSubtitle");
 const names={appearance:"Izgled aplikacije",customers:"Kupci",products:"Artikli",orders:"Porudžbine",routes:"Ture",sync:"Sinhronizacija",backup:"Backup i vraćanje",security:"Bezbednost",about:"O aplikaciji"};
 function showHome(){home.classList.remove("hidden");panels.classList.remove("active");back.classList.add("hidden");title.textContent="Podešavanja";subtitle.textContent="Izaberi kategoriju";dialog.scrollTop=0}
 function openPanel(id){const panel=panels.querySelector(`[data-panel="${id}"]`);if(!panel)return;home.classList.add("hidden");panels.classList.add("active");panels.querySelectorAll(".settings-panel").forEach(el=>el.classList.toggle("active",el===panel));back.classList.remove("hidden");title.textContent=names[id]||"Podešavanja";subtitle.textContent="";dialog.scrollTop=0}
 window.openSettingsPanel=openPanel;
 document.querySelectorAll("[data-settings-panel]").forEach(button=>button.addEventListener("click",()=>openPanel(button.dataset.settingsPanel)));
 back.addEventListener("click",showHome);dialog.addEventListener("close",showHome);document.getElementById("settingsBtn")?.addEventListener("click",showHome);
 const key="trebovanje-appearance-v246",theme=document.getElementById("appTheme"),font=document.getElementById("appFontSize"),recommendations=document.getElementById("showRecommendations"),stars=document.getElementById("showStars");
 let config={theme:"system",font:"standard",recommendations:true,stars:true};try{config={...config,...JSON.parse(localStorage.getItem(key)||"{}")}}catch{}
 if(config.font==="normal")config.font="standard";
 const fontSizes={small:"14px",standard:"17px",large:"20px",xlarge:"23px"};
 if(!fontSizes[config.font])config.font="standard";
 function apply(){document.documentElement.classList.toggle("theme-dark",config.theme==="dark"||(config.theme==="system"&&matchMedia("(prefers-color-scheme: dark)").matches));document.documentElement.style.setProperty("--app-font-size",fontSizes[config.font]);document.documentElement.classList.toggle("hide-recommendations",!config.recommendations);document.documentElement.classList.toggle("hide-stars",!config.stars);localStorage.setItem(key,JSON.stringify(config))}
 theme.value=config.theme;font.value=config.font;recommendations.checked=config.recommendations;stars.checked=config.stars;
 theme.addEventListener("change",()=>{config.theme=theme.value;apply()});font.addEventListener("change",()=>{config.font=font.value;apply()});recommendations.addEventListener("change",()=>{config.recommendations=recommendations.checked;apply()});stars.addEventListener("change",()=>{config.stars=stars.checked;apply()});matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",apply);apply();showHome();
})();
