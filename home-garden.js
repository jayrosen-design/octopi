import * as THREE from 'three';
import {teams,references} from './garden-data.js';
import {makeClayAgent} from './clay-agent.js?swim=2';
import {swimArm} from './fidelity.js?swim=2';
export function homeGarden(scene,camera,canvas,host){
 const layer=document.createElement('div');layer.className='home-pod-labels';host.append(layer);
 const drawer=document.createElement('aside');drawer.className='home-pod-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','Garden conversation');host.append(drawer);
 const projected=new THREE.Vector3(),pods=[],agents=[];
 const positions=[[-8,-6],[8,-6],[-4.3,-12],[4.3,-12]];
 const shell=new THREE.MeshPhysicalMaterial({color:0xbbefff,transparent:true,opacity:.16,roughness:.12,metalness:.15,clearcoat:1,depthWrite:false});
 function show(team){drawer.replaceChildren();drawer.hidden=false;const close=document.createElement('button');close.textContent='Close ×';close.onclick=()=>drawer.hidden=true;drawer.append(close);const h=document.createElement('h2');h.textContent=team.name;drawer.append(h);const small=document.createElement('p');small.textContent='Demo conversation · authored knowledge graph';drawer.append(small);for(const [name,message] of team.talk){const row=document.createElement('p'),b=document.createElement('b');b.textContent=name;row.append(b,document.createElement('br'),document.createTextNode(message));drawer.append(row);}const ref=references[team.id],a=document.createElement('a');a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=ref.publisher+' · '+ref.title+' ↗';drawer.append(a);const more=document.createElement('a');more.href='garden.html';more.textContent='Enter the full Garden →';drawer.append(more);}
 teams.forEach((team,i)=>{
  const [x,z]=positions[i],pod=new THREE.Group();pod.position.set(x,0,z);scene.add(pod);
  team.talk.forEach(([person],j)=>{const [name,role]=person.split(' · '),a=makeClayAgent({id:'home-'+team.id+j,name,role,color:parseInt(team.color.slice(1),16),prop:['lens','book','scroll'][j]});a.scale.setScalar(.6);a.position.set((j-1)*1.45,.1,(j%2)*1.3);pod.add(a);agents.push({root:a,base:a.position.clone(),phase:i*2+j});});
  const graph=new THREE.Group();graph.position.set(0,2.8,0);pod.add(graph);const bubble=new THREE.Mesh(new THREE.SphereGeometry(1.45,28,18),shell);graph.add(bubble);
  const nodes=team.ideas.map((title,j)=>{const ball=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),new THREE.MeshStandardMaterial({color:j===0?0xffcf79:0xa7eed8,emissive:j===0?0x996528:0x267b77,emissiveIntensity:.4}));ball.position.set(Math.cos(j*2.4)*.95,Math.sin(j*2.4)*.75,Math.sin(j*1.8)*.8);graph.add(ball);return ball;});
  for(const [a,b] of [[0,1],[0,2],[1,3],[2,3]])graph.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[a].position,nodes[b].position]),new THREE.LineBasicMaterial({color:0xcbfff3,transparent:true,opacity:.7})));
  const label=document.createElement('button');label.className='home-pod';label.setAttribute('aria-label','Read '+team.name+' conversation');label.onclick=()=>show(team);label.innerHTML='<strong></strong><span></span>';label.querySelector('strong').textContent=team.name;layer.append(label);pods.push({pod,graph,label,team,index:i,turn:-1});
 });
 let last=-1;
 return {update(time){const bend=time-last>1/18;if(bend)last=time;for(const a of agents){a.root.position.set(a.base.x+Math.sin(time*.33+a.phase)*.45,.25+Math.sin(time*.8+a.phase)*.16,a.base.z+Math.cos(time*.27+a.phase)*.4);const glance=Math.sin(time*.55+a.phase)*.26+Math.sin(time*1.15+a.phase*1.7)*.1;a.root.rotation.y=Math.atan2(-a.root.position.x,-a.root.position.z)+glance;const pulse=Math.max(0,Math.sin(time*2.1+a.phase));a.root.userData.body.scale.set(1-pulse*.04,1+pulse*.06,1-pulse*.04);if(a.root.userData.body){a.root.userData.body.rotation.z=Math.sin(time*.7+a.phase)*.06;a.root.userData.body.rotation.x=Math.sin(time*1.05+a.phase)*.04;}if(bend)a.root.userData.tentacles.forEach((arm,j)=>swimArm(arm,time,a.phase+j*.7,.55));}
 for(const p of pods){p.graph.rotation.y=time*.12;p.graph.position.y=2.8+Math.sin(time*.5+p.index)*.13;const turn=Math.floor(time/8+p.index)%3;if(turn!==p.turn){p.turn=turn;p.label.querySelector('span').textContent=p.team.talk[turn][0].split(' · ')[0]+': '+p.team.talk[turn][1].slice(0,65)+'…';}p.pod.updateWorldMatrix(true,true);p.graph.getWorldPosition(projected);projected.y+=1.55;projected.project(camera);p.label.hidden=Math.abs(projected.x)>1||Math.abs(projected.y)>1||projected.z>1;p.label.style.left=(projected.x*.5+.5)*canvas.clientWidth+'px';p.label.style.top=(-projected.y*.5+.5)*canvas.clientHeight+'px';}
 },show:()=>show(teams[0])};
}
