import {attachWaterVoice} from './water-audio.js?v=2';
import * as THREE from 'three';
import {skin,addSuckers,detailedProp} from './fidelity.js?swim=2';
const KEY='deepsea-clay-agents-v1';
export function loadAgents(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.slice(0,4):[];}catch{return [];}}
export function saveAgent(config){const agents=loadAgents().filter(a=>a.id!==config.id);localStorage.setItem(KEY,JSON.stringify([config,...agents].slice(0,4)));}
export function curledArm(i){
 const angle=i*Math.PI/4+.2,points=[];
 for(let j=0;j<=12;j++){
  const u=j/12,r=.10+1.03*u,y=.62-.45*Math.sin(u*Math.PI*.65);
  points.push(new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r));
 }
 // Upright spirals keep their silhouette, like hand-rolled ropes of clay.
 for(let j=1;j<=17;j++){
  const u=j/17,theta=-Math.PI/2+u*Math.PI*1.7,radius=.40*(1-u*.62);
  const along=1.13+Math.cos(theta)*radius;
  const y=.60+Math.sin(theta)*radius;
  points.push(new THREE.Vector3(Math.cos(angle)*along,y,Math.sin(angle)*along));
 }
 return new THREE.CatmullRomCurve3(points,false,'centripetal');
}
function tube(curve){
 const segments=48,radial=14,frames=curve.computeFrenetFrames(segments,false),p=[],n=[],uv=[],index=[];
 for(let i=0;i<=segments;i++){
  const u=i/segments,point=curve.getPointAt(u),r=.235*Math.pow(1-u,1.2)+.023;
  for(let j=0;j<=radial;j++){
   const a=j/radial*Math.PI*2;
   const normal=frames.normals[i].clone().multiplyScalar(-Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a));
   p.push(point.x+normal.x*r,point.y+normal.y*r,point.z+normal.z*r);n.push(normal.x,normal.y,normal.z);uv.push(j/radial,u);
  }
 }
 for(let i=0;i<segments;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;index.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);return g;
}
export function makeClayAgent(a){
 const g=new THREE.Group();g.name=a.id;g.position.set(a.x||0,0,a.z||0);g.userData.agent=a;
 const body=new THREE.Group();g.add(body);g.userData.body=body;
 const mat=skin(a.color??0x2a95b5),suck=skin(a.cupColor??0xe8c5a0);
 const mats={paper:new THREE.MeshStandardMaterial({color:0xf1e6c8,roughness:.88}),ink:new THREE.MeshStandardMaterial({color:0x26485d,roughness:.72})};
 const P=[[0,.48],[.36,.50],[.46,.64],[.34,.88],[.36,1.06],[.52,1.25],[.70,1.50],[.73,1.78],[.60,2.05],[.33,2.22],[0,2.27]].map(([r,y])=>new THREE.Vector2(r,y));
 const head=new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(P).getPoints(48),56),mat);head.scale.z=.91;
 const hp=head.geometry.attributes.position;for(let j=0;j<hp.count;j++){const x=hp.getX(j),y=hp.getY(j),z=hp.getZ(j),angle=Math.atan2(z,x);const dent=1+.015*Math.sin(angle*5+y*9)+.009*Math.sin(angle*11-y*5);hp.setXYZ(j,x*dent,y,z*dent);}head.geometry.computeVertexNormals();head.name='mantle';head.userData.sculptId='mantle';head.castShadow=head.receiveShadow=true;body.add(head);
 const eyes=new THREE.Group();eyes.position.set(0,1.20,.40);body.add(eyes);g.userData.eyes=eyes;
 const white=new THREE.MeshStandardMaterial({color:0xffecc8,roughness:.65});const black=new THREE.MeshPhysicalMaterial({color:0x182224,roughness:.24,clearcoat:.3});
 for(const side of [-1,1]){
  const rim=new THREE.Mesh(new THREE.SphereGeometry(.245,28,20),mat);rim.scale.set(1,1,.55);rim.position.set(side*.245,0,.04);eyes.add(rim);
  const w=new THREE.Mesh(new THREE.SphereGeometry(.205,32,24),white);w.scale.z=.66;w.position.set(side*.245,0,.125);eyes.add(w);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.105,24,16),black);pupil.scale.z=.58;pupil.position.set(side*.245,-.009,.255);eyes.add(pupil);
  const glint=new THREE.Mesh(new THREE.SphereGeometry(.027,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));glint.position.set(side*.245-.023,.032,.311);eyes.add(glint);
 }
 g.userData.tentacles=[];
 for(let i=0;i<8;i++){
  const curve=curledArm(i),mesh=new THREE.Mesh(tube(curve),mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.sculptId='arm-'+i;
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.024,10,8),mat);tip.position.copy(curve.getPointAt(1));
  const arm=new THREE.Group();arm.userData.armIndex=i;arm.add(mesh,tip);addSuckers(arm,curve,suck,true);body.add(arm);g.userData.tentacles.push(arm);
 }
 equipAgentTools(g,a);
 const sculptMeshes=[];g.traverse(o=>{if(o.isMesh){o.userData.root=g;if(o.userData.sculptId){const points=a.shape?.[o.userData.sculptId];const p=o.geometry.attributes.position;if(Array.isArray(points)&&points.length===p.array.length&&points.every(Number.isFinite)){p.array.set(points);p.needsUpdate=true;o.geometry.computeVertexNormals();}sculptMeshes.push(o);}}});
 Object.assign(g.userData,{mat,suck,sculptMeshes,hover:0,seed:Math.random()*10,home:g.position.clone(),gather:0});attachWaterVoice(g,head);return g;
}

export function equipAgentTools(g,a){
 const primary=a.prop||'lens',role=(a.role||'').toLowerCase();
 const hash=[...(a.id||a.name||role)].reduce((n,c)=>n+c.charCodeAt(0),0);
 const count=2+hash%3;
 const extras=role.includes('review')?['book','tablet','database']:role.includes('creativ')?['pencil','scroll','book']:['sample','globe','database'];
 const types=[primary,...extras.filter(t=>t!==primary)].slice(0,count);
 const labels={lens:'Inspect evidence',sample:'Examine sample',database:'Organize knowledge',tablet:'Compare data',pencil:'Sketch ideas',book:'Read sources',scroll:'Plan research',globe:'Explore context',check:'Review findings'};
 g.userData.armTasks=Array(8).fill('Free swimming');
 const mats={paper:new THREE.MeshStandardMaterial({color:0xf1e6c8,roughness:.88}),ink:new THREE.MeshStandardMaterial({color:0x26485d,roughness:.72})};
 g.userData.tentacles.forEach((arm,i)=>{
  const old=arm.userData.heldTool;if(old){arm.remove(old);old.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}arm.userData.heldTool=null;
  const type=i%2===0?types[i/2]:null;
  if(!type||type==='none')return;
  const tool=new THREE.Group(),model=detailedProp(type,mats);tool.add(model);
  tool.name=labels[type]||'Review findings';tool.userData.toolType=type;tool.userData.toolModel=model;
  tool.scale.setScalar(i===0?1.12:1.0);tool.position.copy(arm.children[1].position);tool.position.y+=.15;arm.add(tool);arm.userData.heldTool=tool;
  g.userData.armTasks[i]=tool.name;
  tool.traverse(o=>{if(o.isMesh)o.userData.root=g;});
 });
 g.userData.prop=g.userData.tentacles[0].userData.heldTool||new THREE.Group();g.userData.propRestZ=0;
}
