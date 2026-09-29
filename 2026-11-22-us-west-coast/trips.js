/* Private trip catalogue: loaded only after the current trip is unlocked. */
window.TripLibrary=(()=>{
 let trip,config,dialog,button,shareButton,shareDialog;
 const tr=(en,zh)=>TripLanguage.text(en,zh);
 const title=value=>value?.[TripLanguage.value]||value?.en||'';
 function destination(path){
  // A trip is a sibling deployment directory on this same site, never an external URL.
  if(typeof path!=='string'||!/^\.\.\/[a-zA-Z0-9_-]+\/$/.test(path))return null;
  const url=new URL(path,location.href);url.hash='trip';return url.href;
 }
 function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el}
 function shareURL(){
  const url=new URL(config.share_url||location.href,location.href);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid trip URL');
  url.search='';url.hash='trip';return url.href;
 }
 function showShareFallback(url){
  if(!shareDialog){shareDialog=element('dialog');shareDialog.id='share-trip-dialog';document.body.append(shareDialog)}
  const close=element('button','×','language');close.setAttribute('aria-label',tr('Close','关闭'));close.onclick=()=>shareDialog.close();
  const input=element('input');input.value=url;input.readOnly=true;input.setAttribute('aria-label',tr('Trip link','旅程链接'));
  const copy=element('button',tr('Copy link','复制链接'),'button');
  const status=element('p',null,'subtle');status.setAttribute('role','status');
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);status.textContent=tr('Link copied.','链接已复制。')}catch{input.focus();input.select();status.textContent=tr('Select and copy the link above.','请选择并复制上方链接。')}};
  shareDialog.replaceChildren(close,element('h2',tr('Share this trip','分享此旅程')),input,copy,status);shareDialog.showModal();
 }
 async function shareCurrent(){
  if(TripFiles.canSwitchTrips===false)return;
  const url=shareURL();
  if(navigator.share){try{await navigator.share({title:title(trip.title),url});return}catch(error){if(error.name==='AbortError')return}}
  showShareFallback(url);
 }
 function paint(){
  if(!trip)return;
  if(shareButton){shareButton.title=tr('Share this trip','分享此旅程');shareButton.setAttribute('aria-label',shareButton.title)}
  button.innerHTML=TripLanguage.controlIcon('trips');button.title=tr('Trips','旅程');button.setAttribute('aria-label',tr('Choose a trip','选择旅程'));
  const toolbar=element('div',null,'trip-library-toolbar');
  const close=element('button','×','language');close.setAttribute('aria-label',tr('Close trips','关闭旅程列表'));close.onclick=()=>dialog.close();toolbar.append(close);
  dialog.replaceChildren(toolbar,element('h2',tr('Your trips','您的旅程')));
  const current=element('button',null,'trip-library-item current');current.type='button';current.setAttribute('aria-current','true');
  current.append(element('strong',title(trip.title)),element('span',tr('Current trip','当前旅程')));
  current.onclick=()=>{dialog.close();location.hash='trip';dispatchEvent(new Event('hashchange'))};dialog.append(current);
  const ids=new Set([trip.id]),paths=new Set();let count=0;
  for(const item of config.other_trips||[]){
   const href=destination(item.path);if(!href||ids.has(item.id)||paths.has(href)||!title(item.title))continue;
   ids.add(item.id);paths.add(href);count++;
   const link=element('a',null,'trip-library-item');link.href=href;
   link.append(element('strong',title(item.title)),element('span',tr('Open overview →','打开总览 →')));dialog.append(link);
  }
  dialog.append(element('p',count?tr('Trips in this group share one unlock. Save each trip’s offline pack before travelling.','本组旅程共用一次解锁。出发前请分别保存各旅程的离线包。'):tr('Your next trip will appear here when it is added.','添加新的旅程后，会在这里显示。'),'subtle'));
  TripLanguage.paint();
 }
 function init(current,settings){
  if(TripFiles.canSwitchTrips===false)return;
  trip=current;config=settings;
  if(!shareButton){shareButton=element('button',null,'language');shareButton.id='share-trip';shareButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3"/></svg>';shareButton.onclick=shareCurrent;document.querySelector('.mast-actions').append(shareButton)}
  if(!button){button=element('button',null,'language');button.id='choose-trip';button.setAttribute('aria-haspopup','dialog');document.querySelector('.mast-actions').append(button);
   dialog=element('dialog');dialog.id='trip-library';document.body.append(dialog);
   button.onclick=()=>{paint();dialog.showModal()};dialog.onclick=e=>{if(e.target===dialog)dialog.close()};addEventListener('trip-language-change',paint);
  }paint();
 }
 return {init};
})();
