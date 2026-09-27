/* One explicit language preference shared by the entry screen and guide. */
window.TripLanguage=(()=>{
 let lang='en';try{if(localStorage.getItem('trip-lang')==='zh-Hans')lang='zh-Hans'}catch{}
 const text=(en,zh)=>lang==='zh-Hans'?zh:en;
 function paint(){document.documentElement.lang=lang;document.querySelectorAll('[data-language-switch],#language').forEach(b=>{b.textContent=text('中文','English');b.setAttribute('aria-label',text('Switch to Chinese','切换到英文'))});const brand=document.querySelector('.brand>span:last-child');if(brand)brand.innerHTML=text('TRAVEL GUIDE<small>YOUR JOURNEY</small>','旅行指南<small>您的旅程</small>');const lock=document.getElementById('lock-guide');if(lock)lock.textContent=text('Lock now','立即锁定');document.querySelector('.bottom-nav')?.setAttribute('aria-label',text('Main navigation','主导航'));document.getElementById('close-detail')?.setAttribute('aria-label',text('Close details','关闭详情'));}
 function toggle(){lang=lang==='en'?'zh-Hans':'en';try{localStorage.setItem('trip-lang',lang)}catch{}paint();dispatchEvent(new Event('trip-language-change'));}
 document.addEventListener('click',e=>{if(e.target.closest('[data-language-switch],#language'))toggle()});
 paint();return {get value(){return lang},text,paint};
})();
