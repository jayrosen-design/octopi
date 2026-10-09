import * as THREE from 'three';
import {makeClayAgent} from './clay-agent.js';
import {studios,studioById,studioAgentById,makeAgentPrompt,loadStudioMissions,saveStudioMission} from './studio-teams.js';
const $=id=>document.getElementById(id), safeText=(node,value)=>node.textContent=String(value??'');
let active=studios[0],selected=active.agents[0],lastMission=null,controller=null;
const tabs=$('studioTabs'),cards=$('agentCards'),results=$('runResults'),status=$('studioStatus');
const pendingAgents=[];
const selectedFull=()=>studioAgentById(active.id+'/'+selected.id);
const colors=['#7d5de1','#3486c9','#279969','#e59a43','#d75b8c','#24a1ac'];
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function setStatus(message){status.textContent=message;}
function renderTabs(){
 tabs.replaceChildren();
 for(const s of studios){const b=el('button',s.number+' / '+s.name);b.type='button';b.setAttribute('aria-selected',String(s.id===active.id));b.onclick=()=>selectStudio(s.id);tabs.append(b);}
}
function renderCards(){
 cards.replaceChildren();
 for(const a of active.agents){
  const b=el('button');b.type='button';b.setAttribute('aria-pressed',String(selected.id===a.id));
  b.append(el('strong',a.name),el('span',a.focus));
  b.onclick=()=>selectAgent(a.id);cards.append(b);
 }
}
function selectAgent(id){
 selected=active.agents.find(a=>a.id===id)||active.agents[0];
 safeText($('agentName'),selected.name);safeText($('agentBrief'),selected.brief);
 safeText($('agentFocus'),selected.focus);safeText($('agentTool'),'Clay tool: '+selected.prop);
 renderCards();highlightClay();
}
function selectStudio(id){
 if(controller){setStatus('Stop the running mission before changing studios.');return;}
 active=studioById(id)||studios[0];
 selected=active.agents[0];
 safeText($('studioNumber'),active.number);safeText($('studioName'),active.name);
 safeText($('studioMission'),active.mission);
 $('studioOutputs').replaceChildren(...active.outputs.map(t=>el('li',t)));
 $('missionText').value='';
 lastMission=null;results.replaceChildren();$('exportMission').disabled=true;
 renderTabs();selectAgent(selected.id);renderHistory();drawTeam();
 setStatus('Studio selected. Enter a mission for the team.');
}
function renderHistory(){
 const area=$('missionHistory');area.replaceChildren();
 const saved=loadStudioMissions().filter(x=>x.studioId===active.id);
 if(!saved.length){area.append(el('p','No missions saved for this studio.'));return;}
 for(const m of saved){
  const b=el('button');b.type='button';b.append(el('strong',m.title),el('small',m.status+' · '+new Date(m.created).toLocaleDateString()));
  b.onclick=()=>{lastMission=m;$('missionText').value=m.title;presentResults(m.results);$('exportMission').disabled=!m.results.length;setStatus('Loaded '+m.status+' mission.');};
  area.append(b);
 }
}
function presentResults(items){
 results.replaceChildren();
 for(const r of items){
  const article=el('article');article.append(el('h4',r.name),el('p',r.text));results.append(article);
 }
}
function recordMission(mission){try{saveStudioMission(mission);renderHistory();}catch(e){setStatus('Could not save mission locally. '+e.message);}}
function keysFromOptIn(){
 // Only keys the user explicitly chose to remember in OctoPi settings are available here.
 try{const v=JSON.parse(localStorage.getItem('octopi-provider-keys-v1')||'null');
 return {navigatorKey:typeof v?.navigator==='string'?v.navigator:'',model:typeof v?.model==='string'?v.model:''};}
 catch{return {navigatorKey:'',model:''};}
}
const config=keysFromOptIn();if(config.model)$('modelId').value=config.model;
async function chat(model,messages,signal){
 const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({model,messages,...(config.navigatorKey?{navigatorKey:config.navigatorKey}:{})}),signal});
 let value;try{value=await res.json();}catch{throw Error('The OctoPi local server is required for live missions.');}
 if(!res.ok)throw Error(value.error||'Model request failed');
 if(typeof value.text!=='string'||!value.text.trim())throw Error('No response text returned by the model');
 return value.text;
}
async function runTeam(event){
 event.preventDefault();
 if(controller)return;
 const brief=$('missionText').value.trim(),model=$('modelId').value.trim();
 if(!brief){setStatus('Enter a mission first.');$('missionText').focus();return;}
 if(!model){setStatus('Enter a model ID from your NaviGator connection settings.');$('modelId').focus();return;}
 const session=new AbortController();controller=session;$('runMission').disabled=true;$('stopMission').hidden=false;
 const mission={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),studioId:active.id,title:brief,created:new Date().toISOString(),status:'running',results:[]};
 lastMission=mission;results.replaceChildren();$('exportMission').disabled=true;
 try{
   const leader=active.agents[0],others=active.agents.slice(1),leadName=leader.name;
   setStatus('1/6 · '+leadName+' planning the mission…');
   const plan=await chat(model,[{role:'system',content:makeAgentPrompt(leader,brief)},
     {role:'user',content:'Produce a feasible delegation plan for four specialist agents with constraints, assumptions and approval gates.'}],session.signal);
   mission.results.push({name:leadName+' · delegation plan',text:plan});presentResults(mission.results);
   for(let i=0;i<others.length;i++){
    if(session.signal.aborted)throw new DOMException('Stopped','AbortError');
    const agent=others[i];setStatus((i+2)+'/6 · '+agent.name+' contributing…');
    const text=await chat(model,[{role:'system',content:makeAgentPrompt(agent,brief,[{name:leadName,text:plan}])},
      {role:'user',content:'Deliver your specialist contribution and actionable acceptance criteria. This is analysis only; do not claim implementation.'}],session.signal);
    mission.results.push({name:agent.name,text});presentResults(mission.results);
   }
   if(session.signal.aborted)throw new DOMException('Stopped','AbortError');
   setStatus('6/6 · '+leadName+' preparing the director synthesis…');
   const combined=await chat(model,[{role:'system',content:makeAgentPrompt(leader,brief,mission.results)},
      {role:'user',content:'Synthesize the specialist perspectives into a practical team plan with deliverables, owners, dependencies, risks, approvals and next actions. Distinguish proposals from verified facts.'}],session.signal);
   mission.results.push({name:leadName+' · final synthesis',text:combined});mission.status='completed';
   setStatus('Team mission completed. Review before acting.');
 }catch(e){mission.status=e.name==='AbortError'?'stopped':'failed';setStatus(mission.status==='stopped'?'Mission stopped; completed steps retained.':'Mission failed: '+e.message);}
 finally{recordMission(mission);presentResults(mission.results);$('exportMission').disabled=!mission.results.length;controller=null;$('runMission').disabled=false;$('stopMission').hidden=true;}
}
$('missionForm').addEventListener('submit',runTeam);
$('stopMission').onclick=()=>controller?.abort();
$('openResearch').onclick=()=>{
 const brief=$('missionText').value.trim();if(!brief){setStatus('Enter a brief to research first.');return;}
 sessionStorage.setItem('panel-question',brief+'\nStudio: '+active.name+'\nSpecialist focus: '+selected.name+' — '+selected.brief);
 sessionStorage.removeItem('panel-resume');location.href='panel.html?mode=research';
};
$('clearSelection').onclick=()=>{lastMission=null;results.replaceChildren();$('missionText').value='';$('exportMission').disabled=true;setStatus('New mission ready.');};
$('exportMission').onclick=()=>{
 if(!lastMission?.results?.length)return;
 const payload={format:'octopi-studio-mission',version:1,team:active.name,mission:lastMission};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='octopi-'+active.id+'-mission.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};

// 3D clay scene: instantiate only the active five-member pod for reasonable WebGPU/WebGL performance.
let renderer,scene,camera,group,clay=[],frame=0;const canvas=$('clayStage');
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
async function initScene(){
 try{
  renderer=new THREE.WebGPURenderer({canvas,antialias:true});
  await renderer.init();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x2e8398);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x2e8398);
  scene.add(new THREE.HemisphereLight(0xd9faff,0x1b5065,2.2));
  const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(-4,10,8);scene.add(key);
  const fill=new THREE.DirectionalLight(0x77defa,1.1);fill.position.set(6,5,-3);scene.add(fill);
  camera=new THREE.PerspectiveCamera(35,1,.1,90);camera.position.set(0,5.2,15);
  group=new THREE.Group();scene.add(group);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(6.8,7,0.35,64),new THREE.MeshStandardMaterial({color:0x9bd5cc,roughness:.86}));floor.position.y=-.12;scene.add(floor);
  safeText($('renderStatus'),renderer.backend?.isWebGPUBackend?'WebGPU clay':'WebGL 2 clay');
  drawTeam();
  const resize=()=>{const w=canvas.clientWidth||720,h=canvas.clientHeight||380;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<h*1.2?22:15;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(canvas);resize();
  let last=0;
  const tick=async time=>{
    const t=time*.001,dt=Math.min(.04,(time-last)*.001||.016);last=time;
    for(let i=0;i<clay.length;i++){
     const oct=clay[i],o=oct.userData;
     if(o.body){o.body.position.y=.26+Math.sin(t*1.1+i)*.09;o.body.rotation.z=Math.sin(t*.9+i)*.035;}
     if(o.tentacles)for(let j=0;j<o.tentacles.length;j++)o.tentacles[j].rotation.y=Math.sin(t*.8+j*.6+i)*.08;
    }
    await renderer.renderAsync(scene,camera);
  };
  renderer.setAnimationLoop(tick);
 }catch(e){safeText($('renderStatus'),'3D unavailable');setStatus('3D renderer unavailable. Agent cards and mission workflow remain usable. '+e.message);}
}
function drawTeam(){
 if(!group)return;
 for(const child of [...group.children]){group.remove(child);child.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(mat=>mat.dispose());}});}
 clay=[];for(let i=0;i<active.agents.length;i++){
  const agent=active.agents[i],config={...agent,id:active.id+'/'+agent.id,role:agent.focus,prop:agent.prop,color:active.color,cupColor:0xf4d6b7,x:(i-2)*2.42,z:0};
  const model=makeClayAgent(config);model.scale.setScalar(.73);group.add(model);clay.push(model);
 }
 highlightClay();
}
function highlightClay(){
 for(const model of clay){const on=model.userData.agent?.id===active.id+'/'+selected.id;model.scale.setScalar(on?.82:.73);model.position.y=on?.2:0;}
}
canvas.addEventListener('click',event=>{
 if(!camera||!renderer||!clay.length)return;
 const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(clay,true);
 for(const hit of hits){let node=hit.object;while(node&&!node.userData?.agent)node=node.parent;if(node?.userData?.agent){selectAgent(node.userData.agent.id.split('/')[1]);break;}}
});
selectStudio('core');initScene();
