import {toolForHit,activateTool} from './clay-tools.js';
import {clayContacts} from './clay-contacts.js';
import * as THREE from 'three';
// Soft pickup and damped floor contacts. Objects keep their new home after settling.
export function clayGrab({scene,camera,controls,canvas,objects,onDrop=()=>{},onPickup=()=>{},onTap=()=>{},status=()=>{},bounds=35,floor=0}){
 const roots=new Set(objects),bodies=new Map(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();let pending=null,held=null,lastDrop=0,enabled=true;const recovery=[];const contacts=clayContacts(objects.filter(o=>!o.userData.toolType));
 const badge=document.createElement('div');badge.className='clay-grab-hint';badge.textContent='Click a tool to animate · drag clay to move · drag water to orbit';canvas.parentElement.append(badge);canvas.style.touchAction='none';
 function aim(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);}
 function rootOf(o){while(o&&!roots.has(o))o=o.parent;return o;}
 canvas.addEventListener('pointerdown',e=>{if(!enabled||e.button!==0||held||pending)return;aim(e);const hit=ray.intersectObjects([...roots],true).find(h=>!h.object.isInstancedMesh);if(!hit)return;const root=rootOf(hit.object);if(!root)return;
  e.stopImmediatePropagation();controls.enabled=false;canvas.setPointerCapture(e.pointerId);
  pending={hit,root,id:e.pointerId,x:e.clientX,y:e.clientY};
 },true);
 function beginDrag(e){const {hit,root,x,y}=pending;pending=null;onPickup();
  // Held tools never enter the pickup simulation.
  if(root.userData.toolType)return;
  scene.attach(root);root.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(root);const bottom=root.position.y-box.min.y;
  const state=bodies.get(root)||{root,velocity:new THREE.Vector3(),scale:root.scale.clone(),bottom,radius:Math.min(1.3,Math.max(.18,box.getSize(new THREE.Vector3()).x/2)),rest:root.position.clone(),settled:false};state.settled=false;state.velocity.set(0,0,0);bodies.set(root,state);root.userData.clayMoving=true;
  plane.constant=-hit.point.y;aim(e);ray.ray.intersectPlane(plane,point);
  const mesh=hit.object;const oldGeometry=mesh.geometry;mesh.geometry=oldGeometry.clone();if(oldGeometry.userData.pickupClone)oldGeometry.dispose();mesh.geometry.userData.pickupClone=true;const original=mesh.geometry.attributes.position.array.slice();
  held={state,id:e.pointerId,x,y,target:root.position.clone(),offset:root.position.clone().sub(point),start:root.position.clone(),mesh,original,local:mesh.worldToLocal(hit.point.clone()),normal:hit.face.normal.clone(),age:0,moved:true};
  if(root.userData.speech)root.userData.speech.hidden=true;canvas.style.cursor='grabbing';status('Picked up '+(root.userData.agent?.name||root.name||'clay')+'. Drag to move; release to drop.');
 }
 canvas.addEventListener('pointermove',e=>{if(pending&&e.pointerId===pending.id){e.stopImmediatePropagation();if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)<=5)return;if(pending.root.userData.toolType){pending.moved=true;status('This tool stays in its tentacle. Click to use it; drag the octopus to move them together.');return;}beginDrag(e);}if(!held||e.pointerId!==held.id)return;e.stopImmediatePropagation();aim(e);if(ray.ray.intersectPlane(plane,point)){held.moved ||= Math.hypot(e.clientX-held.x,e.clientY-held.y)>5;held.target.copy(point).add(held.offset);held.target.x=THREE.MathUtils.clamp(held.target.x,-bounds,bounds);held.target.z=THREE.MathUtils.clamp(held.target.z,-bounds,bounds);held.target.y=held.start.y+1.1;}
 },true);
 function release(e,cancel=false){if(pending){if(e&&e.pointerId!==pending.id)return;const p=pending;pending=null;controls.enabled=true;if(canvas.hasPointerCapture(p.id))canvas.releasePointerCapture(p.id);lastDrop=performance.now();if(!cancel&&!p.moved){const tool=toolForHit(p.hit.object);if(activateTool(tool))status(tool.name+' · tool activated');else onTap(p.root);}if(e)e.stopImmediatePropagation();return;}if(!held||e&&e.pointerId!==held.id)return;const h=held;held=null;controls.enabled=true;canvas.style.cursor='grab';if(canvas.hasPointerCapture(h.id))canvas.releasePointerCapture(h.id);
  recovery.push({mesh:h.mesh,base:h.original,time:0});h.state.velocity.multiplyScalar(.16).clampLength(0,1.6);h.state.velocity.y=Math.min(.15,h.state.velocity.y);
  if(cancel){h.state.root.position.copy(h.start);h.state.velocity.set(0,0,0);}
  lastDrop=performance.now();if(h.moved&&!cancel)status('Dropped. The clay is settling…');else onTap(h.state.root);if(e)e.stopImmediatePropagation();
 }
 canvas.addEventListener('pointerup',release,true);canvas.addEventListener('pointercancel',e=>release(e,true),true);canvas.addEventListener('lostpointercapture',e=>release(e,true));addEventListener('blur',()=>release(null,true));addEventListener('keydown',e=>{if(e.key==='Escape')release(null,true);});
 return {setEnabled(value){enabled=value;if(!value)release(null,true);},settle(root){if(held?.state.root===root)release(null,true);const b=bodies.get(root);if(b){b.settled=true;b.velocity.set(0,0,0);root.scale.copy(b.scale);}root.userData.clayMoving=false;},place(root,position){scene.attach(root);root.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(root),bottom=root.position.y-box.min.y;const b=bodies.get(root)||{root,scale:root.scale.clone(),bottom,radius:1,rest:root.position.clone(),velocity:new THREE.Vector3()};b.settled=false;b.velocity.set(0,0,0);root.position.copy(position);root.userData.clayMoving=true;bodies.set(root,b);status('Moving '+(root.userData.agent?.name||'clay')+' to the pod…');},recent:()=>!!pending||!!held||performance.now()-lastDrop<120,add:root=>roots.add(root),update(dt){dt=Math.min(dt,.04);contacts.update(dt);
  for(let i=recovery.length-1;i>=0;i--){const r=recovery[i];r.time+=dt;const pos=r.mesh.geometry.attributes.position;for(let j=0;j<pos.array.length;j++)pos.array[j]+=(r.base[j]-pos.array[j])*(1-Math.exp(-8*dt));pos.needsUpdate=true;r.mesh.geometry.computeVertexNormals();if(r.time>.7){pos.array.set(r.base);r.mesh.geometry.computeBoundingSphere();recovery.splice(i,1);}}

  for(const b of bodies.values()){
   if(b.settled)continue;const o=b.root;
   if(held?.state===b){const delta=held.target.clone().sub(o.position);b.velocity.addScaledVector(delta,48*dt).multiplyScalar(Math.exp(-11*dt));o.position.addScaledVector(b.velocity,dt);
    held.age+=dt;const pressure=.6+Math.min(.4,held.age*.7);const pos=held.mesh.geometry.attributes.position,base=held.original,center=held.local;for(let i=0;i<pos.count;i++){const j=i*3,dx=base[j]-center.x,dy=base[j+1]-center.y,dz=base[j+2]-center.z,w=Math.exp(-(dx*dx+dy*dy+dz*dz)/.22)*pressure;pos.setXYZ(i,base[j]-dx*w*.42-held.normal.x*w*.18,base[j+1]+w*.34-held.normal.y*w*.18,base[j+2]-dz*w*.42-held.normal.z*w*.18);}pos.needsUpdate=true;held.mesh.geometry.computeVertexNormals();
    o.scale.copy(b.scale).multiply(new THREE.Vector3(.87,1.19,.87));continue;
   }
   b.velocity.y-=7.5*dt;b.velocity.multiplyScalar(Math.exp(-3.8*dt));o.position.addScaledVector(b.velocity,dt);o.position.x=THREE.MathUtils.clamp(o.position.x,-bounds,bounds);o.position.z=THREE.MathUtils.clamp(o.position.z,-bounds,bounds);
   const ground=floor+b.bottom;if(o.position.y<=ground){o.position.y=ground;const impact=Math.abs(b.velocity.y);b.velocity.y=impact*.16;o.scale.copy(b.scale).multiply(new THREE.Vector3(1+Math.min(.26,impact*.07),1-Math.min(.32,impact*.10),1+Math.min(.26,impact*.07)));
    if(impact<.3&&Math.hypot(b.velocity.x,b.velocity.z)<.2){b.settled=true;o.scale.copy(b.scale);o.userData.clayMoving=false;o.userData.home?.copy(o.position);o.userData.base?.copy(o.position);if(o.userData.agent&&o.userData.base)o.userData.base.y=Math.max(.55,o.position.y+.4);onDrop(o);status((o.userData.agent?.name||o.name||'Clay')+(o.userData.agent?' is swimming again.':' has settled.'));}
   }else o.scale.lerp(b.scale,Math.min(1,dt*9));
   for(const other of bodies.values()){if(other===b)continue;const d=o.position.clone().sub(other.root.position);d.y=0;const distance=d.length(),min=b.radius+other.radius;if(distance>.01&&distance<min&&Math.abs(o.position.y-other.root.position.y)<1){o.position.addScaledVector(d,(min-distance)/distance*.4);b.velocity.addScaledVector(d,dt*2);}}
  }
 }};
}
