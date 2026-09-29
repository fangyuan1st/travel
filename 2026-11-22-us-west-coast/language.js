/* One explicit language preference shared by the entry screen and guide. */
window.TripLanguage=(()=>{
 let lang='en';try{if(localStorage.getItem('trip-lang')==='zh-Hans')lang='zh-Hans'}catch{}
 const text=(en,zh)=>lang==='zh-Hans'?zh:en;
 function controlIcon(name){const paths=name==='logout'?'<path d="M9 4H4v16h5M14 8l4 4-4 4M8 12h10"/>':'<rect x="5" y="6" width="14" height="15" rx="3"/><path d="M9 6V3h6v3M9 10v7m6-7v7"/>';return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>'}
 function paint(){document.querySelector('.app-version')?.setAttribute('aria-label',text('App version','应用版本'));document.documentElement.lang=lang;document.querySelectorAll('#language').forEach(b=>{b.textContent=text('中文','EN');b.setAttribute('aria-label',text('Switch to Chinese','切换到英文'))});const brand=document.querySelector('.brand>span:last-child');if(brand)brand.innerHTML=text('TRAVEL GUIDE<small>YOUR JOURNEY</small>','旅行指南<small>您的旅程</small>');const lock=document.getElementById('lock-guide');if(lock){lock.textContent=text('Logout','退出登录');lock.setAttribute('aria-label',text('Logout','退出登录'));lock.title=text('Logout','退出登录')}document.querySelector('.bottom-nav')?.setAttribute('aria-label',text('Main navigation','主导航'));document.getElementById('close-detail')?.setAttribute('aria-label',text('Close details','关闭详情'));}
 function toggle(){lang=lang==='en'?'zh-Hans':'en';try{localStorage.setItem('trip-lang',lang)}catch{}paint();dispatchEvent(new Event('trip-language-change'));}
 document.addEventListener('click',e=>{if(e.target.closest('#language'))toggle()});
 paint();return {get value(){return lang},text,paint,controlIcon};
})();

/* Reserve the actual fixed navigation height, including its desktop offset and iPhone safe area. */
(()=>{
 const nav=document.querySelector('.bottom-nav');
 if(!nav)return;
 function update(){
  const rect=nav.getBoundingClientRect();
  const covered=rect.height?Math.max(0,window.innerHeight-rect.top):0;
  document.documentElement.style.setProperty('--footer-nav-clearance',Math.ceil(covered+20)+'px');
 }
 if(window.ResizeObserver)new ResizeObserver(update).observe(nav);
 window.addEventListener('resize',update);
 window.visualViewport?.addEventListener('resize',update);
 update();
})();
