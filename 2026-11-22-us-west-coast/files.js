/* Encrypted-release IO. Replaces files.js only in the generated release. */
window.TripFiles=(()=>{
 'use strict';
 const C=TripCrypto,objects=new Map(),blobs=[],base=new URL('./',location.href);
 let storageId='travel-unlock:'+base.pathname,lockId=storageId+':lock',epoch=0;
 let contentKey=null;const entries=new Map(),pending=new Map();
 let active=false,expires=Infinity,access,lockStamp=null,scope='family';
 function selectScope(value){scope=value;storageId=access.format===2&&value==='family'?'travel-library:'+access.library.id:'travel-guest:'+base.pathname;lockId=storageId+':lock'}
 const leaseId=()=>access.format===2&&scope==='family'?access.library.id:access.pack_id;
 const readStamp=()=>{try{return localStorage.getItem(lockId)}catch{return null}};
 const tr=TripLanguage.text;let statusPair=null;const setStatus=(en,zh)=>{statusPair=[en,zh];const el=document.getElementById('unlock-status');if(el)el.textContent=tr(en,zh)};
 const read=()=>{try{const persistent=localStorage.getItem(storageId);return {value:JSON.parse(persistent||sessionStorage.getItem(storageId)||'null'),remember:!!persistent}}catch{return {value:null,remember:false}}};
 const forget=()=>{try{localStorage.removeItem(storageId);sessionStorage.removeItem(storageId)}catch{}};
 const clean=()=>{for(const u of blobs)URL.revokeObjectURL(u);blobs.length=0;objects.clear();entries.clear();pending.clear();contentKey=null};
 function lock(notify=true){epoch++;active=false;forget();clean();if(notify)try{localStorage.setItem(lockId,Date.now()+':'+Math.random())}catch{}location.reload()}
 function check(){if(active&&(Date.now()>=expires||readStamp()!==lockStamp))lock(false)}
 addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);setInterval(check,30000);
 addEventListener('storage',e=>{if(e.key===lockId){epoch++;forget();if(active)lock(false)}});
 async function bytes(path){const u=new URL(path,base);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||path.includes('..'))throw Error('Invalid release path');const r=await fetch(u);if(!r.ok||r.redirected)throw Error('Connect to finish downloading this guide.');return r.arrayBuffer()}
 async function load(raw){clean();if(scope==='guest'&&(access.guest_policy!==1||!access.guest_index))throw Error('Guest access needs an updated release');contentKey=await C.importKey(raw);const index=JSON.parse(C.dec.decode(await C.open(contentKey,await bytes(scope==='guest'?access.guest_index:access.index),access.pack_id+':index')));for(const f of index.files)entries.set(f.path,f)}
 async function resource(path){
  await ready;check();if(!active)throw Error('Locked');
  if(objects.has(path))return objects.get(path);
  if(pending.has(path))return pending.get(path);
  const f=entries.get(path),key=contentKey,started=epoch;if(!f)throw Error('Asset unavailable');
  const task=(async()=>{const plain=await C.open(key,await bytes(f.encrypted),access.pack_id+':'+f.encrypted);check();if(!active||epoch!==started)throw Error('Locked');let value;if(f.mime==='application/json')value={json:JSON.parse(C.dec.decode(plain))};else{const url=URL.createObjectURL(new Blob([plain],{type:f.mime}));blobs.push(url);value={url}}objects.set(path,value);return value})();
  pending.set(path,task);try{return await task}finally{if(pending.get(path)===task)pending.delete(path)}
 }
 const ready=new Promise(resolve=>{
  async function start(){
   const main=document.getElementById('app'),nav=document.querySelector('.bottom-nav'),language=document.getElementById('language');nav.hidden=true;nav.style.display='none';language.hidden=false;
   main.innerHTML='<section class="unlock-card card"><h1 data-unlock="title"></h1><p data-unlock="intro"></p><form id="unlock-form"><label for="guest-password" data-unlock="password"></label><input id="guest-password" type="password" autocomplete="current-password" required><label class="remember-option"><input id="remember-device" type="checkbox"><span data-unlock="remember"></span></label><button class="button primary" type="submit" data-unlock="unlock"></button></form><p id="unlock-status" role="status" aria-live="polite"></p></section>';
   const status=document.getElementById('unlock-status'),form=document.getElementById('unlock-form');
   const labels={title:['Private travel guide','私人旅行指南'],intro:['Enter your assigned passcode to open this guide.','输入您的口令以打开指南。'],password:['Passcode','口令'],remember:['Remember this device for 30 days','在此设备上记住30天'],unlock:['Login','登录'],retry:['Retry','重试']};
   function paintEntry(){TripLanguage.paint();if(!active)document.title=tr(...labels.title);main.querySelectorAll('[data-unlock]').forEach(el=>el.textContent=tr(...labels[el.dataset.unlock]));if(statusPair)setStatus(...statusPair)}
   addEventListener('trip-language-change',paintEntry);paintEntry();
   try{
    if(!crypto?.subtle)throw Error('A trusted HTTPS connection is required.');
    if('serviceWorker'in navigator){const existing=await navigator.serviceWorker.getRegistration();if(existing?.active)navigator.serviceWorker.register('sw.js').catch(()=>{});else await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>{const timer=setTimeout(resolve,5000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve()},{once:true})})}
    access=JSON.parse(C.dec.decode(await bytes('access.json')));
    if(access.format===2){forget();selectScope('family')}
   }catch{setStatus('Unable to load the saved guide. Connect and reload.','无法载入指南，请联网后重新载入。');form.hidden=true;const b=document.createElement('button');b.dataset.unlock='retry';b.textContent=tr('Retry','重试');b.className='button';b.onclick=()=>location.reload();main.append(b);return}
   async function finish(raw,remember,existing,shared,attemptEpoch){
    await load(raw);if(epoch!==attemptEpoch){clean();throw Error('Locked during unlock')}
    const id=leaseId();
    const saved=existing||C.lease(shared||raw,id);expires=saved.expires;
    forget();if(scope==='family'){try{localStorage.removeItem('travel-guest:'+base.pathname);sessionStorage.removeItem('travel-guest:'+base.pathname)}catch{}}try{if(remember)localStorage.setItem(storageId,JSON.stringify(saved));else if(access.format===2)sessionStorage.setItem(storageId,JSON.stringify(saved))}catch{setStatus('Device storage unavailable; login lasts for this page.','无法保存设备信息；此次登录仅在当前页面有效。')}
    lockStamp=readStamp();active=true;form.reset();main.replaceChildren();nav.hidden=false;nav.style.display='';language.hidden=false;
    const button=document.createElement('button');button.className='language';button.id='lock-guide';button.innerHTML=TripLanguage.controlIcon('logout');button.setAttribute('aria-label',tr('Logout','退出登录'));button.title=tr('Logout','退出登录');button.onclick=()=>lock();document.querySelector('.mast-actions').append(button);resolve();
   }
   // Prefer a saved trip-only session so a guest never silently gains a family role.
   for(const savedScope of (access.format===2?['guest','family']:['family'])){
    if(access.format===2)selectScope(savedScope);
    const saved=read();if(!C.validLease(saved.value,leaseId())){forget();continue}
    let shared,raw;const attemptEpoch=epoch;
    try{if(access.format===2&&scope==='family'){shared=C.un64(saved.value.key);raw=await C.contentKey(shared,access)}else raw=C.un64(saved.value.key);await finish(raw,saved.remember,saved.value,shared,attemptEpoch);return}
    catch{forget();clean();setStatus('Saved unlock unavailable. Enter your passcode.','请重新输入口令。')}
    finally{raw?.fill(0);shared?.fill(0)}
   }
   form.onsubmit=async event=>{
    event.preventDefault();const button=form.querySelector('button'),input=document.getElementById('guest-password'),remember=document.getElementById('remember-device').checked,attemptEpoch=epoch;
    button.disabled=true;setStatus('Logging in…','正在登录…');let raw,shared;
    try{const result=await C.unlockAccess(input.value,access);raw=result.raw;shared=result.shared;if(access.format===2)selectScope(result.scope);input.value='';await finish(raw,remember,null,shared,attemptEpoch)}
    catch{clean();raw?setStatus('Unable to open the guide. Connect and retry.','无法打开指南，请联网后重试。'):setStatus('Incorrect passcode. Please try again.','口令不正确，请重试。')}
    finally{raw?.fill(0);shared?.fill(0);button.disabled=false}
   };

  }
  start();
 });
 return {ready,encrypted:true,get canViewPrivate(){return active&&scope==='family'},get canSwitchTrips(){return active&&scope==='family'},json:async p=>{const v=await resource(p);if(!v?.json)throw Error('Trip data missing');const result=structuredClone(v.json);if(scope==='guest'&&p==='data/config.json')delete result.other_trips;return result},url:async p=>{const v=await resource(p);if(!v?.url)throw Error('Asset unavailable');return v.url},lock};
})();
