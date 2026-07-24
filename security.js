(()=>{
 const K="porudzbine-security-v1", enc=new TextEncoder();
 let cfg=load(), unlockedAt=0, idleTimer=null, biometricPromptActive=false;
 const overlay=document.getElementById("securityOverlay"), title=document.getElementById("securityTitle"), text=document.getElementById("securityText"), pin=document.getElementById("securityPin"), bio=document.getElementById("securityBioBtn"), submit=document.getElementById("securitySubmitBtn"), err=document.getElementById("securityError");
 function load(){try{return JSON.parse(localStorage.getItem(K)||"{}")||{}}catch{return{}}}
 function save(){localStorage.setItem(K,JSON.stringify(cfg))}
 function b64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
 function unb64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
 function random(n=32){return crypto.getRandomValues(new Uint8Array(n))}
 async function hashPin(value,salt){const key=await crypto.subtle.importKey("raw",enc.encode(value),"PBKDF2",false,["deriveBits"]);return b64(await crypto.subtle.deriveBits({name:"PBKDF2",salt:unb64(salt),iterations:180000,hash:"SHA-256"},key,256))}
 function show(message="Unesi PIN"){
  document.documentElement.classList.add("security-pending");overlay?.classList.remove("hidden");title.textContent=cfg.pinHash?"Aplikacija je zaključana":"Postavi zaštitu";text.textContent=cfg.pinHash?message:"Postavi PIN od 6 cifara. On će služiti kao rezervno otključavanje.";pin.value="";pin.placeholder=cfg.pinHash?"PIN":"Novi PIN";bio.classList.toggle("hidden",!cfg.credentialId);err.textContent="";
  if(cfg.credentialId)setTimeout(()=>autoBiometric(),250);else setTimeout(()=>pin.focus(),100)
 }
 function hide(){overlay?.classList.add("hidden");document.documentElement.classList.remove("security-pending");unlockedAt=Date.now();resetIdle()}
 async function verifyPin(v){return /^\d{6}$/.test(v)&&cfg.pinHash&&await hashPin(v,cfg.salt)===cfg.pinHash}
 async function setPin(v){if(!/^\d{6}$/.test(v))throw new Error("PIN mora imati tačno 6 cifara");cfg.salt=b64(random(16));cfg.pinHash=await hashPin(v,cfg.salt);cfg.timeout=Number(cfg.timeout||5);cfg.lockOnHide=cfg.lockOnHide!==false;save()}
 async function biometric(create=false){if(!window.PublicKeyCredential)throw new Error("Biometrija nije podržana u ovom pregledaču");if(create){const cred=await navigator.credentials.create({publicKey:{challenge:random(),rp:{name:"Porudžbine"},user:{id:random(16),name:"vlasnik",displayName:"Vlasnik"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:60000,attestation:"none"}});cfg.credentialId=b64(cred.rawId);save();return true}
 if(!cfg.credentialId)throw new Error("Biometrija nije podešena");await navigator.credentials.get({publicKey:{challenge:random(),allowCredentials:[{type:"public-key",id:unb64(cfg.credentialId)}],userVerification:"required",timeout:60000}});return true}
 async function autoBiometric(){if(biometricPromptActive||!cfg.credentialId||overlay?.classList.contains("hidden"))return;biometricPromptActive=true;try{text.textContent="Potvrdi Face ID / Touch ID";await biometric(false);hide()}catch(e){if(!overlay?.classList.contains("hidden")){text.textContent="Unesi PIN ili pokušaj ponovo biometrijom";err.textContent="Biometrijsko otključavanje nije uspelo. Upotrebi PIN.";setTimeout(()=>pin.focus(),100)}}finally{biometricPromptActive=false}}
 async function unlock(){try{if(!cfg.pinHash){await setPin(pin.value);hide();return}if(await verifyPin(pin.value)){hide();return}throw new Error("Pogrešan PIN")}catch(e){err.textContent=e.message||"Otključavanje nije uspelo"}}
 function lock(reason="Unesi PIN ili koristi Face ID / Touch ID"){if(!cfg.pinHash)return show();show(reason)}
 function resetIdle(){clearTimeout(idleTimer);if(!cfg.pinHash||overlay&&!overlay.classList.contains("hidden"))return;const mins=Number(cfg.timeout||5);if(mins>0)idleTimer=setTimeout(()=>lock("Aplikacija se automatski zaključala"),mins*60000)}
 ["pointerdown","keydown","touchstart"].forEach(e=>document.addEventListener(e,resetIdle,{passive:true}));
 document.addEventListener("visibilitychange",()=>{if(document.hidden){if(cfg.lockOnHide)lock("Aplikacija je zaključana po povratku")}else if(cfg.timeout&&Date.now()-unlockedAt>cfg.timeout*60000)lock()});
 submit?.addEventListener("click",unlock);pin?.addEventListener("keydown",e=>{if(e.key==="Enter")unlock()});bio?.addEventListener("click",autoBiometric);
 const status=document.getElementById("securityStatus"), enable=document.getElementById("enableBiometricBtn"), change=document.getElementById("changePinBtn"), timeout=document.getElementById("securityTimeout"), hideLock=document.getElementById("lockOnHide");
 function render(){if(status)status.textContent=cfg.credentialId?"Biometrija uređaja je uključena":"Biometrija nije uključena";if(timeout)timeout.value=String(cfg.timeout||5);if(hideLock)hideLock.checked=cfg.lockOnHide!==false}
 enable?.addEventListener("click",async()=>{try{await biometric(true);render();showToast?.("Biometrijsko otključavanje je uključeno")}catch(e){alert("Nije uspelo: "+(e.message||"biometrija nije dostupna"))}});
 change?.addEventListener("click",async()=>{const old=prompt("Unesi trenutni PIN");if(!await verifyPin(old||"")){alert("Pogrešan PIN");return}const n=prompt("Unesi novi PIN od 6 cifara");try{await setPin(n||"");alert("PIN je promenjen")}catch(e){alert(e.message)}});
 timeout?.addEventListener("change",()=>{cfg.timeout=Number(timeout.value);save();resetIdle()});hideLock?.addEventListener("change",()=>{cfg.lockOnHide=hideLock.checked;save()});
 render();show();
 window.appSecurity={lock};
})();