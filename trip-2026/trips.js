/* Private trip catalogue: loaded only after the current trip is unlocked. */
window.TripLibrary=(()=>{
 let trip,config,dialog,button;
 const tr=(en,zh)=>TripLanguage.text(en,zh);
 const title=value=>value?.[TripLanguage.value]||value?.en||'';
 function destination(path){
  // A trip is a sibling deployment directory on this same site, never an external URL.
  if(typeof path!=='string'||!/^\.\.\/[a-zA-Z0-9_-]+\/$/.test(path))return null;
  const url=new URL(path,location.href);url.hash='trip';return url.href;
 }
 function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el}
 function paint(){
  if(!trip)return;
  button.textContent=tr('Trips','旅程');button.setAttribute('aria-label',tr('Choose a trip','选择旅程'));
  const toolbar=element('div',null,'trip-library-toolbar');
  const language=element('button',null,'language');language.dataset.languageSwitch='';
  const close=element('button','×','language');close.setAttribute('aria-label',tr('Close trips','关闭旅程列表'));close.onclick=()=>dialog.close();toolbar.append(language,close);
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
  if(!button){button=element('button',null,'language');button.id='choose-trip';button.setAttribute('aria-haspopup','dialog');document.querySelector('.mast').append(button);
   dialog=element('dialog');dialog.id='trip-library';document.body.append(dialog);
   button.onclick=()=>{paint();dialog.showModal()};dialog.onclick=e=>{if(e.target===dialog)dialog.close()};addEventListener('trip-language-change',paint);
  }paint();
 }
 return {init};
})();
