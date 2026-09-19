(() => {
 if(new URLSearchParams(location.search).has('embedded'))return;
 const pages=[['Home','index.html'],['Mold an Agent','workshop.html'],['About','about.html']];
 const current=location.pathname.split('/').pop()||'index.html';
 const nav=document.createElement('nav');nav.className='site-navigation';nav.setAttribute('aria-label','Main navigation');
 const brand=document.createElement('a');brand.href='index.html';brand.className='site-brand';brand.textContent='Octopi AI';nav.append(brand);
 const menu=document.createElement('details');menu.className='site-menu';const summary=document.createElement('summary');summary.textContent='Explore';menu.append(summary);const links=document.createElement('div');links.className='site-links';
 for(const [label,href] of pages){const a=document.createElement('a');a.href=href;a.textContent=label;if(current===href.split('?')[0])a.setAttribute('aria-current','page');links.append(a);}menu.append(links);nav.append(menu);
 const actions=document.createElement('div');actions.className='site-actions';for(const id of ['musicToggle','mute','connect']){const button=document.getElementById(id);if(button)actions.append(button);}nav.append(actions);
 document.querySelector('body>header')?.classList.add('legacy-header');document.body.prepend(nav);document.body.classList.add('has-site-navigation');
 document.querySelectorAll('.garden-nav').forEach(a=>a.hidden=true);
 const media=matchMedia('(min-width:1101px)');const sync=()=>{menu.open=media.matches;};sync();media.addEventListener('change',sync);
 document.addEventListener('click',e=>{if(!media.matches&&!menu.contains(e.target))menu.open=false;});
})();
