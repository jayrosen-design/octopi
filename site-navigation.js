(() => {
 const params=new URLSearchParams(location.search);
 if(params.has('embedded'))return;
 const current=location.pathname.split('/').pop()||'index.html';
 // First visit: the intro explains the reef before anyone lands in it. Guests can skip straight through.
 try{if(current==='index.html'&&!localStorage.getItem('octopi-intro-seen')&&!localStorage.getItem('octopi-account-v1')&&!params.has('workspace')&&!params.has('agent')){location.replace('welcome.html');return;}}catch{}
 const pages=[['Home','index.html'],['Garden','garden.html'],['Projects','projects.html'],['Mold an Agent','workshop.html'],['About','about.html']];
 const nav=document.createElement('nav');nav.className='site-navigation';nav.setAttribute('aria-label','Main navigation');
 const brand=document.createElement('a');brand.href='index.html';brand.className='site-brand';brand.textContent='Octopi AI';nav.append(brand);
 const menu=document.createElement('details');menu.className='site-menu';const summary=document.createElement('summary');summary.textContent='Explore';menu.append(summary);const links=document.createElement('div');links.className='site-links';
 for(const [label,href] of pages){const a=document.createElement('a');a.href=href;a.textContent=label;if(current===href.split('?')[0])a.setAttribute('aria-current','page');links.append(a);}menu.append(links);nav.append(menu);
 const actions=document.createElement('div');actions.className='site-actions';
 for(const id of ['gridShow','connect']){const button=document.getElementById(id);if(button)actions.append(button);}
 // Audio controls (music, water sounds, speech) live under one Sound menu. Buttons that scripts insert
 // next to the music toggle later land inside the same menu automatically.
 const sound=document.createElement('details');sound.className='site-sound';const soundSummary=document.createElement('summary');soundSummary.innerHTML='<span aria-hidden="true">♫</span> Sound';soundSummary.setAttribute('aria-label','Sound settings');const soundBody=document.createElement('div');soundBody.className='site-sound-body';sound.append(soundSummary,soundBody);
 for(const id of ['musicToggle','mute']){const button=document.getElementById(id);if(button)soundBody.append(button);}
 if(soundBody.children.length)actions.append(sound);
 document.addEventListener('pointerdown',e=>{if(!sound.contains(e.target))sound.open=false;});
 const account=document.createElement('a');account.className='site-account';account.href='account.html';account.textContent='Sign in';account.setAttribute('aria-label','Account');if(current==='account.html')account.setAttribute('aria-current','page');actions.append(account);nav.append(actions);
 document.querySelector('body>header')?.classList.add('legacy-header');document.body.prepend(nav);document.body.classList.add('has-site-navigation','page-enter');
 requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove('page-enter')));
 document.querySelectorAll('.garden-nav').forEach(a=>a.hidden=true);
 const media=matchMedia('(min-width:1101px)');const sync=()=>{menu.open=media.matches;};sync();media.addEventListener('change',sync);
 // Phones: secondary actions such as "My octopi" fold into the Explore menu so the bar stays to the essentials.
 const gridButton=document.getElementById('gridShow');if(gridButton){const phone=matchMedia('(max-width:800px)');const placeGrid=()=>{if(phone.matches){gridButton.classList.add('site-menu-action');links.append(gridButton);}else{gridButton.classList.remove('site-menu-action');actions.prepend(gridButton);}};placeGrid();phone.addEventListener('change',placeGrid);}
 document.addEventListener('click',e=>{if(!media.matches&&!menu.contains(e.target))menu.open=false;});
 // Account chip: name and avatar from the local or Firebase account.
 import('./octopi-account.js').then(({watchAccount,initials,restoreFirebaseSession})=>{watchAccount(a=>{account.replaceChildren();if(!a){account.textContent='Sign in';account.classList.remove('signed');return;}account.classList.add('signed');const avatar=document.createElement('span');avatar.className='site-avatar';if(a.photo){const img=document.createElement('img');img.src=a.photo;img.alt='';img.referrerPolicy='no-referrer';avatar.append(img);}else avatar.textContent=initials(a);const name=document.createElement('span');name.className='site-account-name';name.textContent=a.name;account.append(avatar,name);account.title=a.name+' · '+(a.provider==='google'?'Google':a.provider==='anonymous'?'Firebase guest':'Local account');});restoreFirebaseSession();}).catch(()=>{});
 // Smooth same-origin page changes: fade out, then navigate.
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download')||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname&&url.hash)return;if(!/\.html$/.test(url.pathname)&&url.pathname!=='/')return;e.preventDefault();document.body.classList.add('page-leave');setTimeout(()=>{location.href=url.href;},160);});
 addEventListener('pageshow',()=>document.body.classList.remove('page-leave'));
})();
