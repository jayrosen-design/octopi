// The Octopi Garden as a mountable world: team pods, knowledge-graph bubbles, collaborating
// octopi and the garden UI (destinations, inspector, piloting, knowledge sharing).
// Mounted full-size on garden.html and in a compact layout behind the homepage reef.
import * as THREE from 'three';
import {makeClayAgent} from './clay-agent.js?swim=2';
import {swimArm} from './fidelity.js?swim=2';
import {clayTexture,clayAlbedo} from './clay-texture.js';
import {savedResearch} from './research-store.js?v=home2';
import {swimDirection,movementKey} from './octopus-control.js';
import {teams as baseTeams,references} from './garden-data.js';

const STORE='octopi-garden-knowledge-v1';
const FULL={agentScale:.85,orbit:[2.8,2.4],swim:[1.35,1.1],swimSpeed:4.5,graphY:4.5,shellRadius:2.05,nodeSpread:1.45,ring:[5.5,5],ringCount:9,patch:[6,.25,5.5],labelLift:2.5,speechLift:2.35,joinRadius:7,bounds:34,visitTarget:[1,3.2,0],visitPosition:[7,10,19],overview:{target:[0,1,-3],position:[30,31,41]},bubbles:160,bubbleArea:[65,16,60],armDistance:34,speechDistance:28};
const COMPACT={...FULL,agentScale:.62,orbit:[1.9,1.6],swim:[.7,.55],swimSpeed:3,graphY:2.9,shellRadius:1.3,nodeSpread:.92,ring:[3.4,3.1],ringCount:7,patch:[4.2,.22,3.8],labelLift:1.5,speechLift:1.7,joinRadius:4.5,bounds:16,visitTarget:[.3,1.8,0],visitPosition:[2.5,10,9.5],overview:{target:[0,2,-8],position:[0,8,21]},bubbles:0,armDistance:40,speechDistance:40};
export const GARDEN_METRICS={full:FULL,compact:COMPACT};
export const HOME_POSITIONS={reef:[-8.5,-6.5],learning:[8.5,-6.5],studio:[-4.6,-12.5],archive:[4.6,-12.5]};

function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function readShared(){try{return JSON.parse(localStorage.getItem(STORE)||'{}');}catch{return {};}}
function prepareTeam(team,shared){
 if(team.nodes)return team;
 team.nodes=team.ideas.map((title,i)=>({id:team.id+'-'+i,title,type:i===0?'source':'idea',origin:team.name,note:i===0?(team.sourceNote||'Illustrative starting material for this demo, not a retrieved publication.'):team.talk[i%team.talk.length][1]}));team.links=[[0,1],[0,2],[1,3],[2,3]];team.added=Array.isArray(shared[team.id])?shared[team.id].filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string').slice(0,24):[];team.talk=team.talk.map(x=>[...x]);
 const ref=team.reference||references[team.id];
 if(ref){Object.assign(team.nodes[0],ref,{kind:'Reference page',citation:ref.publisher+'. '+ref.title+'. '+ref.url});
  for(const [label,value] of [['Publisher',ref.publisher],['URL',ref.url],['Source type',ref.sourceType||'Official documentation']]){const id=team.nodes.length;team.nodes.push({id:team.id+'-meta-'+id,title:label+': '+value,type:'metadata',origin:team.name,note:value,url:ref.url,publisher:ref.publisher,citation:ref.publisher+'. '+ref.title+'. '+ref.url});team.links.push([0,id]);}}
 return team;
}
function prepareTeams(extra){
 const shared=baseTeams.shared||(baseTeams.shared=readShared());
 const teams=[...baseTeams,...extra];
 for(const team of teams)prepareTeam(team,shared);
 // Restore reference metadata on older shared demo nodes without discarding saved notes.
 for(const team of teams)team.added=team.added.map(n=>{const canonical=teams.flatMap(t=>t.nodes).find(x=>x.id===n.id);return canonical?{...canonical,type:'shared'}:n;});
 // Real locally retained records are distinguished from the authored demo notes. They live in the
 // visitor's own crew bubble when one is present, otherwise in Memory Meadow.
 const keeper=teams.find(t=>t.keepsSavedResearch)||teams[3];
 for(const record of savedResearch().filter(r=>r.kind==='Live research').slice(0,keeper===teams[3]?3:6)){
  const node={id:'saved-'+record.id,title:record.title,type:'shared',origin:'Your saved research',note:(record.summary||record.question).slice(0,1600)};
  if(!teams.some(t=>t.added.some(n=>n.id===node.id)))keeper.added.push(node);
 }
 return {teams,shared};
}

export function gardenWorld(options){
 const {scene,camera,controls,canvas,host,voice=null,positions=null,compact=false,freeRoam=false,collapsed=compact,status=()=>{},onResearch=null}=options;
 const m={...(compact?COMPACT:FULL),...(options.metrics||{})};
 const say=voice||{addListen(){},auto(){},stop(){}};
 // Extra teams (such as the visitor's own research crew) bring existing octopi as members.
 const {teams,shared}=prepareTeams(options.teams||[]);
 if(positions)teams.forEach((t,i)=>{const p=positions[t.id]||positions[i];if(p){t.x=p[0];t.z=p[1];}});
 queueMicrotask(()=>{if(statusLine.textContent==='Four teams · one growing garden')statusLine.textContent=teams.length+' teams · one growing garden';});
 // Contributions from agent collections, project imports or another tab grow the bubbles live.
 function refreshShared(){const fresh=readShared();for(const t of teams){const stored=Array.isArray(fresh[t.id])?fresh[t.id].filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string').slice(0,24):[];const kept=t.added.filter(n=>n.id.startsWith('saved-')&&!stored.some(s=>s.id===n.id));const next=[...stored,...kept];if(JSON.stringify(next)===JSON.stringify(t.added))continue;t.added=next;shared[t.id]=stored;const view=teamGraphs.find(v=>v.team===t);if(view){rebuild(view);allOctopi().find(a=>a.userData.team===t)?.userData.waterSound?.('appear');if(selected===t)renderDetails();}}}
 addEventListener('garden-knowledge-updated',refreshShared);addEventListener('storage',e=>{if(e.key===STORE)refreshShared();});
 if(!canvas.hasAttribute('tabindex'))canvas.tabIndex=-1;
 let seed=42;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

 // ---------- DOM ----------
 const labels=el('div','gw-labels'+(compact?' gw-compact':''));host.append(labels);
 const ui=el('div','garden-ui'+(compact?' gw-compact':''));host.append(ui);
 const travel=el('section','gw-travel'+(collapsed?'':' expanded'));travel.setAttribute('aria-label','Octopi Garden controls');ui.append(travel);
 const toggle=el('button','gw-toggle');toggle.type='button';toggle.innerHTML='<span aria-hidden="true">✿</span> Octopi Garden <b>▾</b>';toggle.setAttribute('aria-expanded',String(!collapsed));travel.append(toggle);
 const body=el('div','gw-travel-body');travel.append(body);
 body.append(el('div','gw-eyebrow','A LITTLE WORLD OF BIG IDEAS'),el('h2',null,'Ideas grow together.'));
 const intro=el('p',null,'Visit a team. Read their shared thoughts. Follow the connections inside each bubble.');body.append(intro);
 const picker=el('div','gw-pilot-picker');const pickerLabel=el('label',null,'Be an octopus');const pilotSelect=el('select');pilotSelect.setAttribute('aria-label','Choose an octopus to control');const takeControlButton=el('button',null,'Take control · WASD');takeControlButton.type='button';picker.append(pickerLabel,pilotSelect,takeControlButton);body.append(picker);
 const destinations=el('div','gw-destinations');destinations.setAttribute('aria-label','Garden destinations');body.append(destinations);
 const actions=el('div','gw-actions');const overviewButton=el('button',null,'⌖ Whole garden');overviewButton.type='button';actions.append(overviewButton);body.append(actions);
 const mover=el('details','gw-mover');const moverSummary=el('summary',null,'Move a collaborator');const moveOctopus=el('select');moveOctopus.setAttribute('aria-label','Octopus to move');const movePod=el('select');movePod.setAttribute('aria-label','Pod to join');const moveButton=el('button',null,'Pick up & move to pod');moveButton.type='button';mover.append(moverSummary,el('label',null,'Octopus'),moveOctopus,el('label',null,'Join a pod'),movePod,moveButton);body.append(mover);
 const hint=el('small',null,'Drag clay to pick up · release to drop · drag water to orbit · click a bubble to visit');body.append(hint);
 const statusLine=el('p','gw-status','Four teams · one growing garden');statusLine.setAttribute('role','status');body.append(statusLine);
 toggle.onclick=()=>expand(!travel.classList.contains('expanded'));
 function expand(open){travel.classList.toggle('expanded',open);toggle.setAttribute('aria-expanded',String(open));}

 const inspector=el('aside','gw-inspector');inspector.hidden=true;inspector.setAttribute('aria-label','Team details');ui.append(inspector);
 const closeButton=el('button','gw-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','Close team details');
 const teamMode=el('div','gw-eyebrow'),teamName=el('h2'),teamBrief=el('p'),podPilots=el('div','gw-pod-pilots');podPilots.setAttribute('aria-label','Take control of a pod member');
 const tabs=el('div','gw-tabs');const chatTab=el('button',null,'Shared conversation');chatTab.type='button';const graphTab=el('button',null,'Knowledge graph');graphTab.type='button';tabs.append(chatTab,graphTab);
 const chatPane=el('div','gw-chat'),graphPane=el('div','gw-graph');graphPane.hidden=true;
 graphPane.append(el('p','gw-note','A 3D map of retained ideas. Links show authored relationships; positions illustrate similarity, not computed embeddings or a connected vector database.'));
 const knowledgeStats=el('div','gw-stats'),nodeList=el('div','gw-node-list'),nodeDetail=el('article','gw-node-detail');graphPane.append(knowledgeStats,nodeList,nodeDetail);
 const share=el('div','gw-share');const shareLabel=el('label',null,"Share this team's knowledge with");const shareTarget=el('select');shareTarget.setAttribute('aria-label','Team to share knowledge with');const shareButton=el('button',null,'Combine knowledge ↗');shareButton.type='button';const shareStatus=el('p','gw-share-status');shareStatus.setAttribute('role','status');share.append(shareLabel,shareTarget,shareButton,shareStatus);
 const researchButton=el('button','gw-research','Research this topic for real ↗');researchButton.type='button';
 inspector.append(closeButton,teamMode,teamName,teamBrief,podPilots,tabs,chatPane,graphPane,share,researchButton);

 const hud=el('section','gw-pilot');hud.hidden=true;hud.setAttribute('aria-label','Octopus controls');ui.append(hud);
 const pilotName=el('strong');const pilotHint=el('span',null,'W A S D / arrows · drag water to look around');const pad=el('div','gw-swim-pad');pad.setAttribute('aria-label','Touch movement');
 for(const [key,label,glyph] of [['w','Swim forward','▲'],['a','Swim left','◀'],['s','Swim backward','▼'],['d','Swim right','▶']]){const b=el('button',null,glyph);b.type='button';b.dataset.swim=key;b.setAttribute('aria-label',label);pad.append(b);}
 const greetButton=el('button',null,'Swim near another pod to join');greetButton.type='button';greetButton.disabled=true;const releaseButton=el('button','gw-release','Release control · Esc');releaseButton.type='button';
 hud.append(pilotName,pilotHint,pad,greetButton,releaseButton);

 function report(text){statusLine.textContent=text;status(text);}

 // ---------- world ----------
 const group=new THREE.Group();group.name='Octopi Garden';scene.add(group);
 const propTexture=clayTexture(2.5),propAlbedo=clayAlbedo(propTexture);
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9,map:propAlbedo,bumpMap:propTexture,bumpScale:.14});
 const movable=[],sphereGeo=new THREE.SphereGeometry(1,20,14),coralMats=['#ee6ca8','#ffb347','#2cd5b8','#aa88f4'].map(mat),patchMat=mat('#e9dfba');
 function blob(parent,x,y,z,sx,sy,sz,material){const mesh=new THREE.Mesh(sphereGeo,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function coral(x,z,color){const g=new THREE.Group();g.position.set(x,0,z);group.add(g);const k=compact?.7:1;for(let j=0;j<5;j++){const height=(.6+rand()*1.7)*k;const branch=blob(g,(rand()-.5)*1.5*k,height/2,(rand()-.5)*k,.18*k,height/2,.18*k,color);branch.rotation.z=(rand()-.5)*.8;blob(g,branch.position.x+.3*k,height*.65,branch.position.z,.42*k,.13*k,.15*k,color).rotation.z=.7;}g.name='Clay coral';movable.push(g);return g;}
 for(const t of teams){if(t.decor===false)continue;blob(group,t.x,-.2,t.z,m.patch[0],m.patch[1],m.patch[2],patchMat);for(let j=0;j<m.ringCount;j++){const a=j/m.ringCount*Math.PI*2;coral(t.x+Math.cos(a)*m.ring[0],t.z+Math.sin(a)*m.ring[1],coralMats[j%4]);}}

 const octopi=[],members=[],pickables=[],teamGraphs=[],nodeColors={source:'#6fc1d4',idea:'#edbd75',shared:'#ba91d2',metadata:'#a8cfa2'};
 const nodeGeo=new THREE.SphereGeometry(.14*(compact?.8:1),16,12);const edgeMaterial=new THREE.LineBasicMaterial({color:'#4b909d',transparent:true,opacity:.75});
 const allNodes=t=>[...t.nodes,...t.added],allOctopi=()=>[...octopi,...members];
 const graphYOf=t=>t.graphY??m.graphY,shellOf=t=>t.shellRadius??m.shellRadius;
 let selected=null,flight=null,pilot=null;const followOffset=new THREE.Vector3(0,5,10);const keys=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();
 function graphFor(team){
  const root=new THREE.Group();root.position.set(team.x,graphYOf(team),team.z);scene.add(root);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(shellOf(team),36,24),new THREE.MeshPhysicalMaterial({color:team.color,transparent:true,opacity:.24,roughness:.08,metalness:.18,clearcoat:1,clearcoatRoughness:.06,iridescence:.55,iridescenceIOR:1.3,envMapIntensity:1.5,depthWrite:false,side:THREE.FrontSide}));root.add(shell);shell.userData.team=team;pickables.push(shell);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(shellOf(team)-.02,.018,6,72),new THREE.MeshBasicMaterial({color:'#d7f9ed',transparent:true,opacity:.55}));root.add(rim);
  const graph=new THREE.Group();root.add(graph);const label=el('button','gw-world-label');label.type='button';label.style.borderBottomColor=team.color;label.onclick=()=>visit(team);labels.append(label);const view={root,graph,label,team,rim,metadataLabels:[]};teamGraphs.push(view);rebuild(view);return view;
 }
 function rebuild(view){
  view.metadataLabels.forEach(x=>x.label.remove());view.metadataLabels=[];
  for(const child of [...view.graph.children]){const at=pickables.indexOf(child);if(at>=0)pickables.splice(at,1);view.graph.remove(child);if(child.isLine)child.geometry.dispose();else child.material.dispose();}
  const spread=m.nodeSpread*shellOf(view.team)/m.shellRadius;
  const nodes=allNodes(view.team),positions=nodes.map((n,i)=>{const a=i*2.39996,y=1-2*(i+.5)/nodes.length,r=Math.sqrt(1-y*y);return new THREE.Vector3(Math.cos(a)*r*spread,y*spread,Math.sin(a)*r*spread);});
  nodes.forEach((node,i)=>{const mesh=new THREE.Mesh(nodeGeo,new THREE.MeshStandardMaterial({color:nodeColors[node.type]||nodeColors.shared,emissive:nodeColors[node.type]||nodeColors.shared,emissiveIntensity:.15,roughness:.4}));mesh.position.copy(positions[i]);mesh.scale.setScalar(node.type==='source'?1.4:1);mesh.userData={team:view.team,node};view.graph.add(mesh);pickables.push(mesh);const label=el('button','gw-node-label',node.title);label.type='button';label.title=node.url||node.note;label.hidden=true;label.onclick=()=>{if(selected!==view.team)visit(view.team);tab(true);showNode(node);nodeDetail.scrollIntoView({block:'nearest'});};label.onpointerdown=e=>{e.stopPropagation();};labels.append(label);view.metadataLabels.push({label,mesh});});
  const pairs=[...view.team.links];for(let i=view.team.nodes.length;i<nodes.length;i++)pairs.push([i,i%4]);for(const [a,b] of pairs){if(!positions[a]||!positions[b])continue;view.graph.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([positions[a],positions[b]]),edgeMaterial));}
  view.label.replaceChildren(el('em',null,view.team.mode),el('strong',null,view.team.name),el('p','gw-team-quote','A conversation is taking shape…'),el('small',null,nodes.length+' retained notes · '+pairs.length+' connections'));
 }
 function speechFor(a){const speech=el('button','gw-speech');speech.type='button';speech.hidden=true;speech.onclick=()=>{visit(a.userData.team);tab(false);};labels.append(speech);a.userData.speech=speech;}
 for(const t of teams){graphFor(t);
  if(t.members){t.members.forEach((a,i)=>{a.userData.team=t;a.userData.member=i;a.userData.crewMember=true;a.userData.base=a.userData.base||a.position.clone();speechFor(a);members.push(a);});continue;}
  for(let i=0;i<3;i++){const angle=(i/3)*Math.PI*2+.3;const a=makeClayAgent({id:t.id+'-agent-'+i,name:t.talk[i][0].split(' · ')[0],role:t.talk[i][0].split(' · ')[1],color:[t.color,'#34cab5','#bc73de'][i],prop:['lens','book','scroll'][i]});a.scale.setScalar(m.agentScale);a.position.set(t.x+Math.cos(angle)*m.orbit[0],.1,t.z+Math.sin(angle)*m.orbit[1]);a.rotation.y=Math.atan2(t.x-a.position.x,t.z-a.position.z);a.userData.team=t;a.userData.member=i;speechFor(a);a.userData.base=a.position.clone();a.userData.phase=rand()*10;scene.add(a);octopi.push(a);}}
 let bubbles=null,particlePositions=[];const dummy=new THREE.Object3D();
 if(m.bubbles>0){bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,8,6),new THREE.MeshBasicMaterial({color:'#d6f3ec',transparent:true,opacity:.35}),m.bubbles);particlePositions=Array.from({length:m.bubbles},()=>new THREE.Vector3((rand()-.5)*m.bubbleArea[0],rand()*m.bubbleArea[1],(rand()-.5)*m.bubbleArea[2]));scene.add(bubbles);}
 const pilotRing=new THREE.Mesh(new THREE.TorusGeometry(1.55*m.agentScale/.85,.045,8,64),new THREE.MeshBasicMaterial({color:'#fff19a',transparent:true,opacity:.85}));pilotRing.rotation.x=-Math.PI/2;pilotRing.visible=false;scene.add(pilotRing);

 // ---------- navigation ----------
 function fly(target,position){flight={from:camera.position.clone(),start:controls.target.clone(),target,position,elapsed:0};}
 function visit(t){releasePilot();selected=t;renderDetails();inspector.hidden=false;teamGraphs.forEach(v=>v.label.classList.toggle('selected',v.team===t));const narrow=canvas.clientWidth<=800;const target=new THREE.Vector3(t.x+(narrow?0:m.visitTarget[0]),m.visitTarget[1],t.z+m.visitTarget[2]);const position=new THREE.Vector3(t.x+m.visitPosition[0],m.visitPosition[1],t.z+m.visitPosition[2]);fly(target,position);report(t.name+' · click a graph node to read its retained note');expand(true);}
 function overview(){releasePilot();flight=null;selected=null;inspector.hidden=true;teamGraphs.forEach(v=>v.label.classList.remove('selected'));fly(new THREE.Vector3(...m.overview.target),new THREE.Vector3(...m.overview.position));report(teams.length+' teams · one growing garden');}
 function tab(graph){chatPane.hidden=graph;graphPane.hidden=!graph;chatTab.setAttribute('aria-pressed',String(!graph));graphTab.setAttribute('aria-pressed',String(graph));}
 function renderDetails(){const t=selected;podPilots.replaceChildren();for(const a of allOctopi().filter(a=>a.userData.team===t)){const b=el('button',null,'Swim as '+a.userData.agent.name);b.type='button';b.onclick=()=>takeControl(a);podPilots.append(b);}teamMode.textContent=(t.members?'YOUR CREW / ':'DEMO TEAM / ')+t.mode;teamName.textContent=t.name;teamBrief.textContent=t.brief;chatPane.replaceChildren();for(const [i,[name,text]] of t.talk.entries()){const article=el('article','gw-bubble');article.style.background=['#e2eee2','#f5e4d0','#eddfed'][i%3];article.append(el('b',null,name),el('p',null,text),el('small',null,t.members?'Your crew · illustrative':'Prefilled discussion · illustrative'));say.addListen(article,text,name);chatPane.append(article);}
  if(t.added.length)chatPane.append(el('p',null,t.added.length+' notes from other teams or your saved research are retained in this bubble.'));
  shareTarget.replaceChildren();for(const other of teams.filter(x=>x!==t)){const option=el('option',null,other.name);option.value=other.id;shareTarget.append(option);}shareStatus.textContent='Sharing combines notes locally in this demo garden.';knowledgeStats.textContent=allNodes(t).length+' retained notes · '+(t.links.length+t.added.length)+' relationships';nodeList.replaceChildren();allNodes(t).forEach(node=>{const b=el('button',null,node.title);b.type='button';b.append(el('small',null,node.origin+' · '+node.type));b.onclick=()=>{showNode(node);nodeDetail.scrollIntoView({block:'nearest'});};nodeList.append(b);});showNode(allNodes(t)[0]);}
 function showNode(node){allOctopi().find(a=>a.userData.team===selected)?.userData.waterSound?.('pop');nodeDetail.replaceChildren(el('b',null,node.title),el('p',null,node.note),el('small',null,'Retained from '+node.origin));
  if(node.url){try{const url=new URL(node.url);if(['https:','http:'].includes(url.protocol)){const link=el('a','gw-citation','Open source ↗ '+url.hostname);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';const address=el('p','gw-source-url',url.href);const citation=el('p',null,node.citation||((node.publisher||node.origin)+'. '+node.title+'. '+url.href));const copy=el('button',null,'Copy citation');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(citation.textContent);copy.textContent='Citation copied';}catch{copy.textContent='Select the citation above to copy';}};nodeDetail.append(link,address,citation,copy);}}catch{}}
  else nodeDetail.append(el('p',null,'Authored demo note. No external source is attached to this claim.'));
  for(const v of teamGraphs)for(const mesh of v.graph.children)if(mesh.isMesh)mesh.material.emissiveIntensity=mesh.userData.node.id===node.id?.9:.15;}
 chatTab.onclick=()=>tab(false);graphTab.onclick=()=>tab(true);tab(false);closeButton.onclick=()=>{inspector.hidden=true;};overviewButton.onclick=overview;
 shareButton.onclick=()=>{if(!selected)return;const target=teams.find(t=>t.id===shareTarget.value);if(!target)return;const existing=new Set(allNodes(target).map(n=>n.id));const incoming=allNodes(selected).filter(n=>!existing.has(n.id)).slice(0,Math.max(0,24-target.added.length));const next=[...target.added,...incoming.map(n=>({...n,type:'shared'}))];try{localStorage.setItem(STORE,JSON.stringify({...shared,[target.id]:next}));shared[target.id]=next;target.added=next;rebuild(teamGraphs.find(v=>v.team===target));allOctopi().find(a=>a.userData.team===target)?.userData.waterSound?.('appear');shareStatus.textContent=incoming.length?'Shared '+incoming.length+' notes with '+target.name+'. Their graph has grown.':'No new notes to combine, or this demo bubble is full.';report(selected.name+' → '+target.name+' · '+incoming.length+' shared notes retained');}catch{shareStatus.textContent='Browser storage is unavailable. Knowledge was not saved.';}};
 researchButton.onclick=()=>{if(!selected)return;sessionStorage.setItem('panel-question',selected.topic);sessionStorage.removeItem('panel-resume');if(onResearch)onResearch(selected.topic,selected);else location.href='panel.html?mode=research';};
 for(const t of teams){const b=el('button');b.type='button';const dot=el('i');dot.style.background=t.color;const label=el('span',null,t.name);label.append(el('small',null,t.mode.toLowerCase()));b.append(dot,label);b.onclick=()=>visit(t);destinations.append(b);}
 // Clicking a bubble or a graph node opens that team.
 function pick(ndc){raycaster.setFromCamera(ndc,camera);const hits=raycaster.intersectObjects(pickables);const hit=hits.find(h=>h.object.userData.node)||hits[0];if(!hit)return false;const {team,node}=hit.object.userData;visit(team);if(node){tab(true);showNode(node);nodeDetail.scrollIntoView({block:'nearest'});}return true;}
 let down=null;canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);pick(pointer);});controls.addEventListener('start',()=>flight=null);

 // ---------- piloting ----------
 function clearMovement(){keys.clear();pad.querySelectorAll('[data-swim]').forEach(b=>b.classList.remove('held'));}
 const typing=e=>e.target.closest?.('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]');
 addEventListener('keydown',e=>{if(e.key==='Escape'){releasePilot();return;}if(typing(e))return;if(!pilot&&!freeRoam)return;const key=movementKey(e);if(key){keys.add(key);e.preventDefault();flight=null;}});
 addEventListener('keyup',e=>{const key=movementKey(e);if(key)keys.delete(key);});addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement();});document.addEventListener('focusin',e=>{if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))clearMovement();});
 let grab=null;
 function joinPod(a){
  if(!a.userData.agent||!a.userData.team||a.userData.crewMember)return;
  const nearest=teams.reduce((best,t)=>Math.hypot(a.position.x-t.x,a.position.z-t.z)<Math.hypot(a.position.x-best.x,a.position.z-best.z)?t:best,teams[0]);
  if(nearest===a.userData.team||Math.hypot(a.position.x-nearest.x,a.position.z-nearest.z)>m.joinRadius)return;
  const origin=a.userData.team,name=a.userData.agent.name;
  a.userData.team=nearest;a.userData.member=nearest.talk.length;for(const select of [moveOctopus,pilotSelect]){const option=[...select.options].find(o=>o.value===a.name);if(option)option.textContent=name+' · '+nearest.name;}
  const intro=`${name} joined from ${origin.name}. I can bring our work on ${origin.ideas[0].toLowerCase()} into this discussion. What connections should we explore?`;
  const reply=`Welcome, ${name}. Let's compare that with ${nearest.ideas[0].toLowerCase()} and keep the original sources attached.`;
  const hostName=allOctopi().find(o=>o!==a&&o.userData.team===nearest)?.userData.agent.name||nearest.name;nearest.talk.push([name+' · Visiting collaborator',intro],[hostName+' · Host',reply]);
  a.userData.speech.textContent=intro;a.userData.speech.dataset.spoken='yes';
  const node={id:'visit-'+Date.now(),title:name+' joined the pod',type:'shared',origin:origin.name,note:intro+' '+reply};nearest.added.push(node);if(nearest.added.length>24)nearest.added.shift();
  rebuild(teamGraphs.find(v=>v.team===nearest));visit(nearest);tab(false);say.auto(intro,name);a.userData.waterSound?.('appear');
 }
 for(const a of allOctopi()){for(const select of a.userData.crewMember?[pilotSelect]:[moveOctopus,pilotSelect]){const option=el('option',null,a.userData.agent.name+' · '+a.userData.team.name);option.value=a.name;select.append(option);}}
 for(const t of teams){const option=el('option',null,t.name);option.value=t.id;movePod.append(option);}
 moveButton.onclick=()=>{releasePilot();const a=octopi.find(o=>o.name===moveOctopus.value),t=teams.find(t=>t.id===movePod.value);if(!a||!t)return;if(grab)grab.place(a,new THREE.Vector3(t.x+2*m.agentScale,4,t.z+2*m.agentScale));else{a.position.set(t.x+2*m.agentScale,.1,t.z+2*m.agentScale);a.userData.base.copy(a.position);joinPod(a);}};
 function releasePilot(){if(!pilot)return;pilot.userData.base.copy(pilot.position);pilot.userData.possessed=false;pilot=null;clearMovement();pilotRing.visible=false;hud.hidden=true;host.classList.remove('gw-piloting');report('Free exploration · drag water to orbit');}
 function takeControl(a){if(!a)return;releasePilot();grab?.settle(a);pilot=a;a.userData.possessed=true;a.userData.base.copy(a.position);flight=null;clearMovement();selected=null;inspector.hidden=true;teamGraphs.forEach(v=>v.label.classList.remove('selected'));followOffset.set(0,5,10).multiplyScalar(a.scale.x/.85);pilotSelect.value=a.name;pilotName.textContent='Swimming as '+a.userData.agent.name;hud.hidden=false;host.classList.add('gw-piloting');pilotRing.visible=true;report('WASD / arrows to swim · E to join a nearby pod · Esc to release');canvas.focus({preventScroll:true});}
 takeControlButton.onclick=()=>takeControl(allOctopi().find(a=>a.name===pilotSelect.value));releaseButton.onclick=releasePilot;
 function greetPod(){if(pilot)joinPod(pilot);}
 greetButton.onclick=greetPod;addEventListener('keydown',e=>{if(e.key.toLowerCase()==='e'&&pilot&&!typing(e)){e.preventDefault();greetPod();}});
 for(const b of pad.querySelectorAll('[data-swim]')){b.onpointerdown=e=>{if(!pilot)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.swim);b.classList.add('held');};const stop=()=>{keys.delete(b.dataset.swim);b.classList.remove('held');};b.onpointerup=b.onpointercancel=b.onlostpointercapture=stop;}
 controls.addEventListener('end',()=>{if(pilot)followOffset.copy(camera.position).sub(pilot.position);});

 // ---------- per-frame ----------
 const lift=new THREE.Vector3();let armTime=0,lastTime=-1;
 function place(element,point,extraHidden){projected.copy(point).project(camera);const w=canvas.clientWidth,h=canvas.clientHeight;element.hidden=!!extraHidden||projected.z>1||projected.z<-1||Math.abs(projected.x)>1.1||Math.abs(projected.y)>1.1;element.style.left=(projected.x*.5+.5)*w+'px';element.style.top=(-projected.y*.5+.5)*h+'px';}
 function update(time,dt){
  const moving=time!==lastTime;lastTime=time;
  for(let j=0;j<teams.length;j++){const t=teams[j],turn=Math.floor((time+j*2)/7)%t.talk.length;if(t.turn!==turn){t.turn=turn;const [name,text]=t.talk[turn];const speaker=name.split(' · ')[0];if(selected===t)say.auto(text,name);teamGraphs[j].label.querySelector('.gw-team-quote').textContent=speaker+': '+text.slice(0,95)+'…';for(const a of allOctopi().filter(a=>a.userData.team===t)){const speech=a.userData.speech;if(a.userData.agent.name===speaker){speech.textContent=speaker+': '+text.slice(0,100)+'…';speech.dataset.spoken='yes';a.userData.waterSound?.('appear');}speech.classList.toggle('speaking',a.userData.agent.name===speaker);}}}
  if(flight){flight.elapsed+=dt;const p=Math.min(1,flight.elapsed/1.5),ease=p*p*(3-2*p);camera.position.lerpVectors(flight.from,flight.position,ease);controls.target.lerpVectors(flight.start,flight.target,ease);if(p===1)flight=null;}
  if(keys.size&&!pilot&&freeRoam){const move=new THREE.Vector3((keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),0,(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0)).normalize().multiplyScalar(dt*8);move.x=THREE.MathUtils.clamp(controls.target.x+move.x,-m.bounds-1,m.bounds+1)-controls.target.x;move.z=THREE.MathUtils.clamp(controls.target.z+move.z,-m.bounds-1,m.bounds-4)-controls.target.z;camera.position.add(move);controls.target.add(move);}
  if(pilot){
   const direction=swimDirection(keys,{x:controls.target.x-camera.position.x,z:controls.target.z-camera.position.z});
   pilot.position.x=THREE.MathUtils.clamp(pilot.position.x+direction.x*m.swimSpeed*dt,-m.bounds,m.bounds);pilot.position.z=THREE.MathUtils.clamp(pilot.position.z+direction.z*m.swimSpeed*dt,-m.bounds,m.bounds);
   if(direction.x||direction.z){const angle=Math.atan2(direction.x,direction.z),difference=Math.atan2(Math.sin(angle-pilot.rotation.y),Math.cos(angle-pilot.rotation.y));pilot.rotation.y+=difference*(1-Math.exp(-9*dt));}
   pilot.userData.base.x=pilot.position.x;pilot.userData.base.z=pilot.position.z;
   controls.target.lerp(pilot.position.clone().add(new THREE.Vector3(0,1,0)),1-Math.exp(-7*dt));camera.position.lerp(pilot.position.clone().add(followOffset),1-Math.exp(-5*dt));pilotRing.position.copy(pilot.position);pilotRing.position.y=.06;
   const nearby=teams.find(t=>t!==pilot.userData.team&&Math.hypot(pilot.position.x-t.x,pilot.position.z-t.z)<m.joinRadius);greetButton.disabled=!nearby;greetButton.textContent=nearby?'Join '+nearby.name+' · E':'Swim near another pod to join';
   hud.dataset.x=pilot.position.x.toFixed(2);hud.dataset.z=pilot.position.z.toFixed(2);
  }
  const updateArms=time-armTime>1/18;if(updateArms)armTime=time;
  for(const a of octopi){if(a.userData.clayMoving||a.userData.sculpting)continue;const p=a.userData.phase;if(a!==pilot)a.position.x=a.userData.base.x+Math.sin(time*.27+p)*m.swim[0]+Math.sin(time*.11+p*2)*m.swim[0]*.24;a.position.y+=(a.userData.base.y+.15*m.agentScale+Math.sin(time*.9+p)*.22*m.agentScale-a.position.y)*(1-Math.exp(-4*dt));if(a!==pilot)a.position.z=a.userData.base.z+Math.cos(time*.23+p)*m.swim[1];const pulse=Math.pow(Math.max(0,Math.sin(time*2.1+p)),3);a.userData.body.scale.set(1-pulse*.055,1+pulse*.08,1-pulse*.055);a.userData.body.rotation.z=Math.sin(time*.7+p)*.09;a.userData.body.rotation.x=Math.sin(time*2.1+p)*.07;
   if(a!==pilot){const mates=octopi.filter(o=>o!==a&&o.userData.team===a.userData.team);let cx=0,cz=0;for(const o of mates){cx+=o.position.x;cz+=o.position.z;}if(mates.length){cx/=mates.length;cz/=mates.length;}else{cx=a.userData.team.x;cz=a.userData.team.z;}const glance=Math.sin(time*.5+p)*.24+Math.sin(time*1.1+p*1.4)*.1;const heading=Math.atan2(cx-a.position.x,cz-a.position.z)+glance;a.rotation.y+=Math.atan2(Math.sin(heading-a.rotation.y),Math.cos(heading-a.rotation.y))*(1-Math.exp(-2.4*dt));}
   const speech=a.userData.speech;if(speech.dataset.spoken)place(speech,lift.copy(a.position).setY(a.position.y+m.speechLift),camera.position.distanceTo(a.position)>m.speechDistance||(compact?a.userData.team!==selected:!!(selected&&a.userData.team!==selected)));
   if(updateArms&&camera.position.distanceTo(a.position)<m.armDistance)a.userData.tentacles.forEach((arm,i)=>swimArm(arm,time,p+i*.7,.6));}
  for(const a of members){const speech=a.userData.speech;if(speech.dataset.spoken)place(speech,lift.copy(a.position).setY(a.position.y+2.5*a.scale.x),a.userData.team!==selected);}
  for(const v of teamGraphs){if(selected!==v.team)v.root.position.y=graphYOf(v.team)+Math.sin(time*.55+v.team.x)*.15;if(moving&&selected!==v.team)v.graph.rotation.y+=dt*.13;v.rim.quaternion.copy(camera.quaternion);v.root.updateMatrixWorld(true);const showNodes=selected===v.team&&!graphPane.hidden;for(const item of v.metadataLabels){if(!showNodes){item.label.hidden=true;continue;}item.mesh.getWorldPosition(lift);place(item.label,lift);}place(v.label,lift.copy(v.root.position).setY(v.root.position.y+m.labelLift));}
  if(bubbles){particlePositions.forEach((p,i)=>{dummy.position.set(p.x,(p.y+time*.22)%m.bubbleArea[1],p.z);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);});bubbles.instanceMatrix.needsUpdate=true;}
 }
 const heldTools=octopi.flatMap(a=>a.userData.tentacles.map(arm=>arm.userData.heldTool).filter(Boolean));
 return {update,visit,overview,expand,releasePilot,takeControl,pick,teams,octopi,pickables,grabObjects:[...movable,...octopi,...heldTools],onDrop:joinPod,onTap(root){if(root.userData.team&&!root.userData.crewMember){visit(root.userData.team);return true;}return false;},onPickup(){releasePilot();flight=null;},setGrab(value){grab=value;},report,elements:{ui,labels,travel,actions,inspector,hud,statusLine},get selected(){return selected;},get pilot(){return pilot;}};
}
