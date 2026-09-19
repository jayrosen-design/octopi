import * as THREE from 'three';
// Soft visual contact patches for the movable clay, including stationary props.
export function clayContacts(objects){
 const entries=objects.map(root=>{root.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());return {root,radius:Math.max(.12,Math.min(1.25,Math.max(size.x,size.z)*.38)),scale:root.scale.clone(),p:new THREE.Vector3(),amount:0,patch:null};});
 const direction=new THREE.Vector3();let elapsed=0;
 function owner(o){while(o.parent&&o.parent.type!=='Scene')o=o.parent;return o;}
 function patch(e,toward){let mesh=e.root.getObjectByName('mantle');if(!mesh)e.root.traverse(o=>{if(!mesh&&o.isMesh&&!o.isInstancedMesh)mesh=o;});if(!mesh?.geometry.attributes.position)return;
  if(!e.patch){const geometry=mesh.geometry.clone();mesh.geometry=geometry;e.patch={mesh,base:geometry.attributes.position.array.slice(),center:new THREE.Vector3(),normal:new THREE.Vector3()};}
  const p=e.patch;p.mesh.updateWorldMatrix(true,false);p.center.copy(toward);p.mesh.worldToLocal(p.center);p.normal.copy(p.center).normalize();
 }
 return {update(dt){elapsed+=dt;for(const e of entries){e.root.getWorldPosition(e.p);e.amount*=Math.exp(-5*dt);}
  if(elapsed>.065){elapsed=0;for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const a=entries[i],b=entries[j];if(owner(a.root)===owner(b.root)||(!a.root.userData.agent&&!b.root.userData.agent&&!a.root.userData.clayMoving&&!b.root.userData.clayMoving))continue;
   const distance=a.p.distanceTo(b.p),range=a.radius+b.radius;if(distance>.02&&distance<range){const pressure=Math.min(.65,(range-distance)/range+.08);for(const [e,other] of [[a,b],[b,a]]){e.amount=Math.max(e.amount,pressure);if(!e.root.userData.clayMoving&&!e.root.userData.sculpting)patch(e,other.p);}}
  }}
  for(const e of entries){if(e.root.userData.clayMoving||e.root.userData.sculpting)continue;const p=e.patch;if(!p||e.amount===0)continue;const pos=p.mesh.geometry.attributes.position,base=p.base;
   for(let i=0;i<pos.count;i++){const j=i*3;direction.set(base[j],base[j+1],base[j+2]);const face=Math.max(0,direction.normalize().dot(p.normal)),w=Math.pow(face,5)*e.amount*.22;pos.setXYZ(i,base[j]-p.normal.x*w,base[j+1]-p.normal.y*w,base[j+2]-p.normal.z*w);}
   pos.needsUpdate=true;p.mesh.geometry.computeVertexNormals();if(e.amount<.001){pos.array.set(base);pos.needsUpdate=true;e.amount=0;}
  }
 }};
}
