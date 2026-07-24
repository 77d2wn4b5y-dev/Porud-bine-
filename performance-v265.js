(()=>{
 const indicator=document.getElementById("offlineIndicator");
 const update=()=>indicator?.classList.toggle("hidden",navigator.onLine);
 addEventListener("online",update,{passive:true});
 addEventListener("offline",update,{passive:true});
 update();
})();
