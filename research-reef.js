import * as THREE from 'three';
import {collections,resumeResearch} from './research-store.js?v=home2';
export function researchReef(scene,camera,octos,embedded=false){
 const layer=document.createElement('div');layer.id='research-bubbles';(document.getElementById('homeScene')||document.body).append(layer);
 const list=collections(),groups=[],projected=new THREE.Vector3();
 const sphere=new THREE.SphereGeometry(1,32,20);
 const material=new THREE.MeshPhysicalMaterial({color:0xabedf3,transparent:true,opacity:.13,roughness:.12,metalness:.05,clearcoat:1,depthWrite:false});
 const lineMat=new THREE.LineBasicMaterial({color:0x87d9df,transparent:true,opacity:.5});
 const count=Math.min(6,Math.max(4,octos.length));
 for(let i=0;i<count;i++){
   const record=embedded?{title:'Collecting evidence',kind:'Research',sources:[]}:list[i%list.length],owner=octos[i%octos.length],root=new THREE.Group();scene.add(root);
   const orb=new THREE.Mesh(sphere,material);orb.scale.setScalar(.53);root.add(orb);
   const button=document.createElement('button');button.className='research-orb';button.title='Resume '+record.title;
   const badge=document.createElement('span');badge.className='orb-kind';badge.textContent=record.kind||'Saved research';
   const title=document.createElement('strong');title.textContent=record.title;
   const meta=document.createElement('small');meta.textContent=`${record.sources?.length||0} sources · ${owner.userData.agent.name}`;
   const hint=document.createElement('span');hint.className='orb-resume';hint.textContent='Resume research ↗';button.append(badge,title,meta,hint);button.onclick=()=>resumeResearch(record);layer.append(button);
   const nodes=[];
   for(const [j,source] of (record.sources||[]).slice(0,4).entries()){
     const a=j*2.4+i*.5,position=new THREE.Vector3(Math.cos(a)*.95,.45+Math.sin(a)*.45,Math.sin(a)*.45);
     const mesh=new THREE.Mesh(sphere,material);mesh.scale.setScalar(.17);mesh.position.copy(position);root.add(mesh);
     root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),position]),lineMat));
     const label=document.createElement('a');label.className='source-orb';label.title=source.title;label.target='_blank';label.rel='noopener noreferrer';
     try{const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol))continue;label.href=u.href;const logo=document.createElement('img');logo.src=u.origin+'/favicon.ico';logo.alt='';logo.referrerPolicy='no-referrer';const fallback=document.createElement('span');fallback.textContent=u.hostname.replace(/^www\./,'').slice(0,2).toUpperCase();label.append(fallback,logo);logo.onerror=()=>logo.remove();}catch{continue;}
     layer.append(label);nodes.push({label,position});
   }
   if(embedded){root.visible=false;button.hidden=true;}
   groups.push({root,owner,button,nodes,phase:i*1.7,orb,record,amount:0,targetScale:.53,merged:false});
 }
 const speeches=groups.map(()=>{const el=document.createElement('details');el.className='agent-speech';el.hidden=true;const heading=document.createElement('summary');const body=document.createElement('p');el.append(heading,body);layer.append(el);return el;});
 const groupChat=document.createElement('details');groupChat.className='group-clay-chat';groupChat.hidden=true;groupChat.innerHTML='<summary>Shared clay chat</summary><div></div>';layer.append(groupChat);
 let visible=true;
 return {feed(message){
   if(message.action==='chat'){const i=(message.agent||0)%groups.length;const speech=speeches[i];groups[i].owner.userData.waterSound?.('appear');speech.hidden=false;speech.dataset.active='yes';speech.querySelector('summary').textContent=message.name+' · '+message.text.slice(0,90)+(message.text.length>90?'…':'');speech.querySelector('p').textContent=message.text;groupChat.hidden=false;groupChat.querySelector('summary').textContent='Shared clay chat · '+message.name;const row=document.createElement('p');row.textContent=message.name+': '+message.text;groupChat.querySelector('div').prepend(row);while(groupChat.querySelector('div').children.length>20)groupChat.querySelector('div').lastChild.remove();return;}
   if(message.action==='reset'){speeches.forEach(s=>{s.hidden=true;delete s.dataset.active;});groupChat.hidden=true;groupChat.querySelector('div').replaceChildren();for(const item of groups){item.amount=0;item.merged=false;item.root.visible=false;item.button.hidden=true;item.nodes.forEach(n=>{n.label.remove();item.root.remove(n.mesh,n.line);});item.nodes=[];item.targetScale=.53;}return;}
   const selected=Number.isInteger(message.agent)?[groups[message.agent%groups.length]]:groups;
   for(const item of selected){
     item.owner.userData.waterSound?.(message.action==='merge'?'pop':'appear');item.root.visible=true;item.amount++;item.button.querySelector('strong').textContent=message.title||item.owner.userData.agent.name+' evidence';item.button.querySelector('small').textContent=message.demo?'Demo data':`${(message.sources||[]).length} sources`;
     if(message.action==='merge'){item.merged=true;item.targetScale=.85;continue;}
     for(const source of (message.sources||[]).slice(0,6)){
       if(item.nodes.some(n=>n.title===source.title))continue;
       const index=item.nodes.length,angle=index*2.4;const target=new THREE.Vector3(Math.cos(angle)*.95,.3+Math.sin(angle)*.6,Math.sin(angle)*.4);
       const mesh=new THREE.Mesh(sphere,material);mesh.scale.setScalar(.05);mesh.position.copy(target).multiplyScalar(2);item.root.add(mesh);
       const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),target]),lineMat);item.root.add(line);
       const label=document.createElement('a');label.className='source-orb';label.title=source.title||'Source';label.textContent=String(index+1);
       try{const url=new URL(source.url);if(['http:','https:'].includes(url.protocol)){label.href=url.href;label.target='_blank';label.rel='noopener noreferrer';const img=document.createElement('img');img.src=url.origin+'/favicon.ico';img.alt='';img.onerror=()=>img.remove();label.append(img);}}catch{}
       layer.append(label);item.nodes.push({label,position:target,mesh,line,title:source.title});
     }
     item.targetScale=.45+Math.cbrt(item.nodes.length)*.08;
   }
 },setVisible(value){visible=value;layer.hidden=!value;groups.forEach(x=>x.root.visible=value);},update(t){if(!visible)return;const width=document.getElementById('stage').clientWidth,height=document.getElementById('stage').clientHeight;for(let i=0;i<speeches.length;i++){const speech=speeches[i];if(!speech.dataset.active)continue;projected.copy(groups[i].owner.position).add(new THREE.Vector3(0,2.7,.7)).project(camera);speech.hidden=projected.z>1||Math.abs(projected.x)>1;speech.style.left=(projected.x*.5+.5)*width+'px';speech.style.top=(-projected.y*.5+.5)*height+'px';}for(const item of groups){
   if(embedded&&!item.root.visible){item.button.hidden=true;continue;}
   item.root.position.copy(item.owner.position).add(new THREE.Vector3(Math.sin(t*.25+item.phase)*.25,3.35+Math.sin(t*.7+item.phase)*.15,-.2));
   item.root.updateMatrixWorld();
   function place(el,point){projected.copy(point).project(camera);const front=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.2;el.hidden=!front;el.style.left=(projected.x*.5+.5)*width+'px';el.style.top=(-projected.y*.5+.5)*height+'px';}
   item.orb.scale.lerp(new THREE.Vector3(item.targetScale,item.targetScale,item.targetScale),.045);
   place(item.button,item.root.position);for(const node of item.nodes){if(node.mesh){node.mesh.position.lerp(item.merged?new THREE.Vector3():node.position,.055);node.mesh.scale.lerp(new THREE.Vector3().setScalar(item.merged?.005:.17),.055);node.line.visible=!item.merged;if(item.merged){node.label.hidden=true;continue;}}const p=(node.mesh?node.mesh.position:node.position).clone().add(item.root.position);place(node.label,p);}
 }} };
}
