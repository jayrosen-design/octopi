import {toolForHit,activateTool} from './clay-tools.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeClayAgent,loadAgents,saveAgent,equipAgentTools} from './clay-agent.js?swim=2';
import {detailedProp} from './fidelity.js?swim=2';
import {ClaySurface} from './clay-dynamics.js';
import {mountMusic} from './music.js?v=claypods1';
const $=id=>document.getElementById(id);mountMusic($('musicToggle'),'reef');
const canvas=$('clayCanvas'),renderer=new THREE.WebGPURenderer({canvas,antialias:true});await renderer.init();document.querySelector('.material-tag').textContent=renderer.backend.isWebGPUBackend?'WebGPU clay':'Clay · compatible renderer';renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xcde1de);scene.fog=new THREE.Fog(0xcde1de,13,26);
const camera=new THREE.PerspectiveCamera(36,1,.1,80);camera.position.set(4.5,3.3,7.8);const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.15,0);controls.enableDamping=true;controls.minDistance=4;controls.maxDistance=13;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xfff4da,0x5e9398,2));const key=new THREE.DirectionalLight(0xfff1d5,3.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;scene.add(key);const rim=new THREE.DirectionalLight(0xb3e5ec,2);rim.position.set(4,4,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:0xc8d8c9,roughness:.93}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.receiveShadow=true;scene.add(floor);
const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.22,.18,96),new THREE.MeshStandardMaterial({color:0xe0dfc9,roughness:.86}));plinth.position.y=-.03;plinth.receiveShadow=true;scene.add(plinth);
let agent,config={id:'custom-'+crypto.randomUUID(),name:'Curiosity',color:0x269cb8,cupColor:0xedbd8b,prop:'lens',role:'Evidence scout',desc:$('agentBrief').value},surfaces=[],attachments=[],tool='orbit',stroke=null,undo=[],lastTime=performance.now(),lastNormals=0;
function disposeAgent(root){if(!root)return;scene.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});for(const g of geometries){if(!g.userData.shared)g.dispose();}for(const m of materials)m.dispose();}
function bindDetails(){attachments=[];for(const arm of agent.userData.tentacles){const mesh=arm.children[0],points=mesh.geometry.attributes.position.array,cups=arm.children[2];const original=cups.instanceMatrix.array.slice(),anchors=[];for(let k=0;k<original.length;k+=16){let closest=0,min=Infinity;for(let j=0;j<points.length;j+=3){const d=(points[j]-original[k+12])**2+(points[j+1]-original[k+13])**2+(points[j+2]-original[k+14])**2;if(d<min){min=d;closest=j;}}anchors.push(closest);}attachments.push({mesh,cups,original,anchors,arm,tipBase:arm.children[1].position.clone(),base:points.slice()});}}
function build(next=config){disposeAgent(agent);config=next;agent=makeClayAgent(config);scene.add(agent);surfaces=agent.userData.sculptMeshes.map(mesh=>({mesh,state:new ClaySurface(mesh.geometry.attributes.position.array)}));bindDetails();undo=[];$('undo').disabled=true;$('headWidth').value=$('headHeight').value=$('armSpread').value='1';}
build();
function snapshot(){return surfaces.map(s=>s.state.target.slice());}
function pushUndo(){undo.push(snapshot());if(undo.length>12)undo.shift();$('undo').disabled=false;}
$('undo').onclick=()=>{const entry=undo.pop();if(entry)surfaces.forEach((s,i)=>s.state.target.set(entry[i]));$('undo').disabled=!undo.length;};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),worldHit=new THREE.Vector3();
function locate(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(agent.userData.sculptMeshes,false)[0];}
let reaction=0,reactionSide=0;
function edit(hit,event,initial=false){reaction=1;reactionSide=Math.max(-1,Math.min(1,hit.point.x));const surface=surfaces.find(s=>s.mesh===hit.object);if(!surface)return;const point=surface.mesh.worldToLocal(hit.point.clone()),radius=+$('brushSize').value,pressure=+$('strength').value/100;
 if(initial){pushUndo();stroke={surface,point:point.clone(),start:surface.state.target.slice(),normal:hit.face.normal.clone(),hit};plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);}
 const state=surface.state,target=state.target,start=stroke.start;
 if(tool==='grab'){
  if(!ray.ray.intersectPlane(plane,worldHit))return;const local=surface.mesh.worldToLocal(worldHit.clone()),delta=local.sub(stroke.point);delta.clampLength(0,.55);
  for(let i=0;i<target.length;i+=3){const d=Math.hypot(start[i]-stroke.point.x,start[i+1]-stroke.point.y,start[i+2]-stroke.point.z);if(d>radius)continue;const w=(1-d*d/(radius*radius))**2;for(let a=0;a<3;a++)target[i+a]=state.constrain(i+a,start[i+a]+delta.getComponent(a)*w);}
 }else{
  const copy=tool==='smooth'?target.slice():target;
  for(let i=0;i<target.length;i+=3){const d=Math.hypot(copy[i]-point.x,copy[i+1]-point.y,copy[i+2]-point.z);if(d>radius)continue;const w=(1-d*d/(radius*radius))**2;
   if(tool==='smooth'){
    let nx=0,ny=0,nz=0,count=0;
    for(let j=0;j<copy.length;j+=3){const dist=(copy[j]-copy[i])**2+(copy[j+1]-copy[i+1])**2+(copy[j+2]-copy[i+2])**2;if(dist<.018){nx+=copy[j];ny+=copy[j+1];nz+=copy[j+2];count++;}}
    if(count){target[i]+=(nx/count-copy[i])*w*pressure*.25;target[i+1]+=(ny/count-copy[i+1])*w*pressure*.25;target[i+2]+=(nz/count-copy[i+2])*w*pressure*.25;}
   }else{const amount=(tool==='push'?-1:1)*pressure*.037*w;for(let a=0;a<3;a++)target[i+a]=state.constrain(i+a,target[i+a]+hit.face.normal.getComponent(a)*amount);}
  }
 }
}
canvas.addEventListener('pointerdown',e=>{if(tool==='orbit')return;const hit=locate(e);if(!hit)return;canvas.setPointerCapture(e.pointerId);edit(hit,e,true);});
canvas.addEventListener('pointermove',e=>{const rect=canvas.getBoundingClientRect();$('brushCursor').style.left=e.clientX-rect.left+'px';$('brushCursor').style.top=e.clientY-rect.top+'px';$('brushCursor').style.display=tool==='orbit'?'none':'block';if(!stroke)return;const hit=locate(e);if(tool==='grab')edit(stroke.hit,e);else if(hit&&hit.object===stroke.surface.mesh)edit(hit,e);});
function endStroke(){if(stroke){reaction=1;agent.userData.waterSound?.('pop');}stroke=null;}canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',endStroke);canvas.addEventListener('lostpointercapture',endStroke);canvas.addEventListener('pointerleave',()=>{$('brushCursor').style.display='none';});
const hints={orbit:'Drag to turn your octopus. Choose a tool to mold the clay.',pull:'Drag over the clay to build a raised shape.',push:'Press and drag to make a soft indentation.',grab:'Grab a patch of clay and drag it into a new shape.',smooth:'Gently brush over an area to soften its contours.'};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;controls.enabled=tool==='orbit';document.querySelectorAll('[data-tool]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});$('toolHint').textContent=hints[tool];canvas.style.cursor=tool==='orbit'?'grab':'crosshair';});
for(const id of ['brushSize','strength','softness'])$(id).oninput=()=>{$(id+'Value').textContent=id==='brushSize'?Number($(id).value).toFixed(2):$(id).value+'%';};
$('agentName').oninput=()=>{$('namePreview').textContent=$('agentName').value||'Your octopus';};
function paint(){agent.userData.mat.color.set($('clayColor').value);agent.userData.suck.color.set($('cupColor').value);}
$('clayColor').oninput=$('cupColor').oninput=paint;
['#269cb8','#c16b49','#8d63ae','#c86692','#499b68','#e3ae46'].forEach(color=>{const b=document.createElement('button');b.style.background=color;b.setAttribute('aria-label','Use clay color '+color);b.onclick=()=>{$('clayColor').value=color;paint();};$('swatches').append(b);});
function toolsChanged(){equipAgentTools(agent,{prop:$('propSelect').value,role:$('agentRole').value});$('armTasks').textContent=agent.userData.armTasks.map((task,i)=>'Arm '+(i+1)+': '+task).join(' · ');}
$('propSelect').onchange=$('agentRole').onchange=toolsChanged;
const tasksNote=document.createElement('p');tasksNote.id='armTasks';tasksNote.className='material-note';$('propSelect').after(tasksNote);toolsChanged();
$('newClay').onclick=()=>{config={...config,id:'custom-'+crypto.randomUUID(),name:$('agentName').value,color:parseInt($('clayColor').value.slice(1),16),cupColor:parseInt($('cupColor').value.slice(1),16),prop:$('propSelect').value,role:$('agentRole').value,desc:$('agentBrief').value,shape:undefined};build(config);toolsChanged();$('saveStatus').textContent='Fresh clay is ready on the turntable.';};
let sliderSnapshots={};for(const id of ['headWidth','headHeight','armSpread']){
 $(id).addEventListener('pointerdown',()=>{pushUndo();sliderSnapshots[id]=snapshot();$(id).dataset.start=$(id).value;});
 $(id).addEventListener('keydown',()=>{if(!sliderSnapshots[id]){pushUndo();sliderSnapshots[id]=snapshot();$(id).dataset.start=$(id).value;}});
 $(id).addEventListener('change',()=>{delete sliderSnapshots[id];});
 $(id).oninput=()=>{if(!sliderSnapshots[id]){pushUndo();sliderSnapshots[id]=snapshot();$(id).dataset.start='1';}const ratio=+$(id).value/Number($(id).dataset.start||1);surfaces.forEach((s,index)=>{const head=s.mesh.userData.sculptId==='mantle';if((id==='armSpread'&&head)||(id!=='armSpread'&&!head))return;const base=sliderSnapshots[id][index];for(let i=0;i<base.length;i+=3){if(id==='headHeight')s.state.target[i+1]=.5+(base[i+1]-.5)*ratio;else{s.state.target[i]=base[i]*ratio;s.state.target[i+2]=base[i+2]*ratio;}}});};
}
$('resetShape').onclick=()=>{pushUndo();surfaces.forEach(s=>s.state.target.set(s.state.original));$('headWidth').value=$('headHeight').value=$('armSpread').value='1';};
$('resetCamera').onclick=()=>{camera.position.set(4.5,3.3,7.8);controls.target.set(0,1.15,0);};
function save(){const name=$('agentName').value.trim(),brief=$('agentBrief').value.trim();if(!name||!brief){$('saveStatus').textContent='Give your agent a name and a purpose first.';return;}const shape={};surfaces.forEach(s=>{shape[s.mesh.userData.sculptId]=Array.from(s.state.target,x=>Number(x.toFixed(5)));});config={id:config.id,name,role:$('agentRole').value,desc:brief,color:parseInt($('clayColor').value.slice(1),16),cupColor:parseInt($('cupColor').value.slice(1),16),prop:$('propSelect').value,shape,template:`Act as ${name}, a ${$('agentRole').value}. ${brief}\n\nResearch question: `};try{saveAgent(config);$('saveStatus').replaceChildren(document.createTextNode('Saved. '));const a=document.createElement('a');a.href='index.html?agent='+encodeURIComponent(config.id);a.textContent='Meet your agent in the reef →';$('saveStatus').append(a);listSaved();}catch{$('saveStatus').textContent='Storage is full. Your model is still here; clear old site data before saving.';}}
$('saveAgent').onclick=save;
function listSaved(){$('savedAgents').replaceChildren();for(const item of loadAgents()){const b=document.createElement('button');b.textContent=item.name+' · '+item.role;b.onclick=()=>{$('agentName').value=item.name;$('namePreview').textContent=item.name;$('agentRole').value=item.role;$('agentBrief').value=item.desc;$('clayColor').value='#'+item.color.toString(16).padStart(6,'0');$('cupColor').value='#'+item.cupColor.toString(16).padStart(6,'0');$('propSelect').value=item.prop;build(item);toolsChanged();$('saveStatus').textContent='Editing saved agent. Add agent to my reef saves the changes.';};$('savedAgents').append(b);}}
listSaved();
function tick(now){const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(Math.max(1,w),Math.max(1,h),false);camera.aspect=Math.max(1,w)/Math.max(1,h);camera.updateProjectionMatrix();}controls.update();reaction*=Math.exp(-dt*4);const wobble=Math.sin(now*.022)*reaction;agent.userData.body.rotation.z=wobble*.045+reactionSide*reaction*.035;agent.userData.body.position.y=Math.abs(wobble)*.035;agent.userData.eyes.scale.y=1-(stroke?.18:0)-Math.max(0,Math.sin(now*.0013)-.985)*35;agent.userData.eyes.rotation.y=reactionSide*reaction*.12;let changed=false;for(const {mesh,state} of surfaces){if(state.step(dt,+$('softness').value/100)){mesh.geometry.attributes.position.needsUpdate=true;if(now-lastNormals>32){mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}changed=true;}}if(changed){for(const a of attachments){const p=a.mesh.geometry.attributes.position.array,m=a.cups.instanceMatrix.array;for(let k=0;k<a.anchors.length;k++){const v=a.anchors[k],offset=k*16;for(let c=0;c<3;c++)m[offset+12+c]=a.original[offset+12+c]+p[v+c]-a.base[v+c];}a.cups.instanceMatrix.needsUpdate=true;a.cups.frustumCulled=false;const tip=a.arm.children[1],index=p.length-3;tip.position.set(a.tipBase.x+p[index]-a.base[index],a.tipBase.y+p[index+1]-a.base[index+1],a.tipBase.z+p[index+2]-a.base[index+2]);const held=a.arm.userData.heldTool;if(held){held.position.copy(tip.position);held.position.y+=.15;held.rotation.z=wobble*.12;}}if(now-lastNormals>32)lastNormals=now;}renderer.render(scene,camera);requestAnimationFrame(tick);}
requestAnimationFrame(tick);

let toolClick=null;
canvas.addEventListener('pointerdown',e=>{if(tool==='orbit')toolClick={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{
 const start=toolClick;toolClick=null;if(!start||tool!=='orbit'||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;
 locate(e);const hit=ray.intersectObjects(agent.children,true).find(h=>!h.object.isInstancedMesh);
 if(hit)activateTool(toolForHit(hit.object));
});
canvas.addEventListener('pointercancel',()=>{toolClick=null;});
