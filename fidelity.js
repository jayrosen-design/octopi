import * as THREE from 'three';
import {clayTexture,clayAlbedo,reflectionEnvironment} from './clay-texture.js';

// Deterministic microstructure keeps reloads and visual reviews comparable.
let seed = 4817;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const UP = new THREE.Vector3(0, 1, 0);

function surfaceTexture(sand = false) {
  const size = 256, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const ripple = sand ? Math.sin(y * .31 + Math.sin(x * .045) * 2.4) * 27 : 0;
    const v = 165 + ripple + random() * (sand ? 35 : 70);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  texture.repeat.set(sand ? 18 : 4, sand ? 18 : 4);
  return texture;
}
const skinTexture = clayTexture(1.8);
const skinAlbedo = clayAlbedo(skinTexture);
export function skin(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: .83, metalness: 0,
    clearcoat: .025, clearcoatRoughness: .8, sheen: .14, sheenColor: 0xcdd3c8,
    map:skinAlbedo, bumpMap: skinTexture, bumpScale: .11 });
}

export function armCurve(i) {
  const angle = i / 8 * Math.PI * 2 + .2;
  const points = [], length = 1.45 + .16 * Math.sin(i * 2.1);
  for (let k = 0; k <= 18; k++) {
    const u = k / 18, curl = Math.max(0, (u - .57) / .43);
    const r = .12 + length * u - .29 * curl * curl;
    const side = Math.sin(u * 3.5 + i) * .17 * u + .26 * curl * curl;
    points.push(new THREE.Vector3(Math.cos(angle) * r - Math.sin(angle) * side,
      .56 - .38 * Math.sin(u * Math.PI * .85) + .44 * curl * curl,
      Math.sin(angle) * r + Math.cos(angle) * side));
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

const cupGeometry = new THREE.TorusGeometry(1, .28, 6, 12);
cupGeometry.userData.shared = true;
export function addSuckers(group, curve, material, clayProfile = false) {
  // Both rows share one draw call per arm instead of dozens of separate meshes.
  const cups = new THREE.InstancedMesh(cupGeometry, material, 24);
  const dummy = new THREE.Object3D();
  for (let k = 0; k < 12; k++) {
    const u = .17 + k * .061, point = curve.getPointAt(u), tangent = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    const underside = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const radius = clayProfile ? .235*Math.pow(1-u,1.2)+.023 : .30 + (.025 - .30) * (1 - Math.pow(1 - u, 1.6));
    for (let row = 0; row < 2; row++) {
      // Slight forward roll exposes the cup rims along the curled tips.
      const normal = underside.clone().multiplyScalar(.64).addScaledVector(side, row ? .6 : -.6).normalize();
      dummy.position.copy(point).addScaledVector(normal, radius * .94);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      dummy.scale.setScalar(.063 * (1 - u * .7)); dummy.updateMatrix();
      cups.setMatrixAt(k * 2 + row, dummy.matrix);
    }
  }
  cups.instanceMatrix.needsUpdate = true; group.add(cups);
}

// Bend the skin, tip and both cup rows through the same traveling wave.
// The root stays fixed in the mantle, while the distal arm follows the current.
export function swimArm(group, time, phase, activity) {
  const [tube, tip, cups] = group.children;
  if (!group.userData.restSkin) {
    group.userData.restSkin = tube.geometry.attributes.position.array.slice();
    group.userData.restNormals = tube.geometry.attributes.normal.array.slice();
    group.userData.restCups = cups.instanceMatrix.array.slice();
    group.userData.restTip = tip.position.clone();
    tube.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    tube.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    cups.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tube.geometry.computeBoundingSphere(); tube.geometry.boundingSphere.radius += .9;
    cups.frustumCulled = false;
  }
  const amplitude=.16+activity*.13;
  const individuality=group.userData.armIndex??0;
  const speed=1.45+(individuality%3)*.19;
  // Slow reaching gestures overlaid on traveling muscular waves and a shared stroke.
  const gesture=Math.pow(Math.max(0,Math.sin(time*.43+phase*1.7)),3);
  const stroke=Math.sin(time*2.1+phase-individuality*.7);
  const twist=Math.sin(time*speed+phase)*.17+gesture*Math.sin(time*2.6+phase)*.24;
  function deform(x,y,z,out){
    const r=Math.hypot(x,z),w=Math.min(1,r*r/2.4);
    const angle=twist*w,spread=1+(.085*stroke+Math.sin(time*.73+phase)*.045)*w;
    const c=Math.cos(angle),s=Math.sin(angle);
    out.set((x*c-z*s)*spread,y+(Math.sin(time*speed-r*3.3+phase)*amplitude+gesture*(group.userData.heldTool?.32:.17))*w,(x*s+z*c)*spread);
    return out;
  }
  const rest=group.userData.restSkin,p=tube.geometry.attributes.position;
  const v=group.userData.wavePoint||(group.userData.wavePoint=new THREE.Vector3());
  const delta=group.userData.waveDelta||(group.userData.waveDelta=new THREE.Vector3());
  for(let i=0;i<rest.length;i+=3){deform(rest[i],rest[i+1],rest[i+2],v);p.array[i]=v.x;p.array[i+1]=v.y;p.array[i+2]=v.z;}
  p.needsUpdate=true;tube.geometry.computeVertexNormals();
  const base=group.userData.restCups,matrices=cups.instanceMatrix.array;
  for(let i=0;i<base.length;i+=16){
    const x=base[i+12],y=base[i+13],z=base[i+14];deform(x,y,z,v);
    matrices[i+12]=v.x;matrices[i+13]=v.y;matrices[i+14]=v.z;
    // Carry each sucker's orientation through the same deformation as its skin.
    for(const col of [0,4,8]){deform(x+base[i+col]*.01,y+base[i+col+1]*.01,z+base[i+col+2]*.01,delta);matrices[i+col]=(delta.x-v.x)*100;matrices[i+col+1]=(delta.y-v.y)*100;matrices[i+col+2]=(delta.z-v.z)*100;}
  }
  cups.instanceMatrix.needsUpdate=true;
  const end=group.userData.restTip;deform(end.x,end.y,end.z,tip.position);
  const held=group.userData.heldTool;
  if(held){
    held.position.copy(tip.position);held.position.y+=.15;
    deform(end.x+.025,end.y,end.z,v);deform(end.x,end.y,end.z+.025,delta);
    held.rotation.set(Math.atan2(delta.y-tip.position.y,.025),twist,-Math.atan2(v.y-tip.position.y,.025));
  }

}

export function detailEyes(eyes) {
  const irisMat = new THREE.MeshPhysicalMaterial({color:0x436c70, roughness:.21, clearcoat:1});
  const glintMat = new THREE.MeshBasicMaterial({color:0xffffff});
  for (const sx of [-1, 1]) {
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.093, 24, 16), irisMat);
    iris.scale.set(1, 1, .28); iris.position.set(sx * .22, .01, .226); eyes.add(iris);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(.027, 12, 8), glintMat);
    glint.position.set(sx * .22 - .025, .051, .299); eyes.add(glint);
  }
}

export function detailedProp(type, M) {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({color:0xd9b579,metalness:.72,roughness:.28});
  const leather = new THREE.MeshStandardMaterial({color:0x163348,roughness:.64});
  function part(geometry, material, x=0,y=0,z=0) {
    const mesh = new THREE.Mesh(geometry,material); mesh.position.set(x,y,z);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  if (type === 'lens') {
    part(new THREE.TorusGeometry(.29,.038,16,64),brass);
    part(new THREE.TorusGeometry(.25,.012,8,64),leather,0,0,.016);
    const lens = part(new THREE.SphereGeometry(.252,32,20),new THREE.MeshPhysicalMaterial({color:0xbdeff6,roughness:.08,metalness:.12,transparent:true,opacity:.3,clearcoat:1,side:THREE.DoubleSide,depthWrite:false}));
    lens.scale.z=.15;
    const handle = part(new THREE.CapsuleGeometry(.055,.39,6,16),leather,-.29,-.34); handle.rotation.z=-.7;
    part(new THREE.SphereGeometry(.065,16,12),brass,-.15,-.19);
  } else if (type === 'book') {
    for (const sx of [-1,1]) {
      const cover=part(new THREE.BoxGeometry(.34,.49,.06),leather,sx*.18,0,0); cover.rotation.y=sx*-.18;
      const page=part(new THREE.BoxGeometry(.31,.45,.045),M.paper,sx*.175,0,.055); page.rotation.y=sx*-.18;
      for(let row=0;row<6;row++) part(new THREE.BoxGeometry(.20-(row%3)*.015,.009,.004),M.ink,sx*.18,.15-row*.054,.11);
    }
    part(new THREE.CylinderGeometry(.035,.035,.51,16),brass);
    part(new THREE.BoxGeometry(.035,.3,.008),new THREE.MeshStandardMaterial({color:0xe27966}),.09,-.16,.12);
    group.rotation.set(-.15,-.25,.12);
  } else if (type === 'globe') {
    part(new THREE.SphereGeometry(.27,24,16),new THREE.MeshStandardMaterial({color:0x5bb3bc,roughness:.6}));
    for(let i=0;i<5;i++){const patch=part(new THREE.SphereGeometry(.10,12,8),new THREE.MeshStandardMaterial({color:0x96bc72}),Math.sin(i*2.1)*.22,Math.cos(i*1.4)*.15,.14);patch.scale.z=.6;}
    part(new THREE.CylinderGeometry(.035,.035,.4,12),brass,0,-.28);part(new THREE.CylinderGeometry(.19,.21,.05,20),leather,0,-.48);
  } else if (type === 'sample') {
    part(new THREE.CylinderGeometry(.10,.10,.55,16),new THREE.MeshPhysicalMaterial({color:0x94d8c6,transparent:true,opacity:.7,roughness:.12}),0,0);
    part(new THREE.CylinderGeometry(.075,.075,.22,16),new THREE.MeshStandardMaterial({color:0xe3a582}),0,-.12);
    part(new THREE.CylinderGeometry(.115,.115,.07,16),brass,0,.30);
  } else if (type === 'pencil') {
    part(new THREE.CylinderGeometry(.035,.035,.65,6),new THREE.MeshStandardMaterial({color:0xe4b751}));
    part(new THREE.ConeGeometry(.035,.13,6),M.ink,0,.39);part(new THREE.CylinderGeometry(.04,.04,.10,12),new THREE.MeshStandardMaterial({color:0xd18b9b}),0,-.37);
  } else if (type === 'database') {
    for(let i=0;i<3;i++){part(new THREE.CylinderGeometry(.23,.23,.16,24),M.ink,0,i*.19-.2);part(new THREE.SphereGeometry(.025,8,6),brass,.10,i*.19-.2,.22);}
  } else if (type === 'tablet') {
    part(new THREE.BoxGeometry(.45,.65,.07),M.ink);part(new THREE.BoxGeometry(.38,.52,.015),new THREE.MeshStandardMaterial({color:0x9dd9d2}),0,.025,.045);
    for(let i=0;i<3;i++)part(new THREE.BoxGeometry(.055,.12+i*.08,.015),brass,-.11+i*.11,-.09+i*.04,.06);
  } else if (type === 'scroll') {
    part(new THREE.BoxGeometry(.54,.66,.025),M.paper);
    for(const sy of [-1,1]) { const roll=part(new THREE.CylinderGeometry(.06,.06,.64,24),M.paper,0,sy*.33); roll.rotation.z=Math.PI/2; }
    for(let i=0;i<4;i++) part(new THREE.BoxGeometry(.32-i*.035,.014,.008),M.ink,-.03,.16-i*.105,.02);
    part(new THREE.SphereGeometry(.065,20,12),brass,.16,-.2,.045).scale.z=.3;
    group.rotation.set(-.14,-.2,-.12);
  } else {
    part(new THREE.BoxGeometry(.6,.77,.07),leather);
    part(new THREE.BoxGeometry(.53,.66,.014),M.paper,0,-.015,.044);
    part(new THREE.BoxGeometry(.22,.095,.04),brass,0,.35,.055);
    for(let i=0;i<3;i++) {
      const y=.2-i*.19;
      part(new THREE.BoxGeometry(.27,.015,.008),M.ink,.055,y,.061);
      const a=part(new THREE.BoxGeometry(.045,.013,.009),brass,-.19,y-.012,.062);a.rotation.z=-.65;
      const b=part(new THREE.BoxGeometry(.085,.013,.009),brass,-.145,y+.008,.062);b.rotation.z=.85;
    }
    group.rotation.set(-.15,-.3,.1);
  }
  return group;
}

// WebGPU path: the same caustic tint expressed as TSL nodes, since onBeforeCompile GLSL is ignored there.
async function nodeCaustics(materials,time){
  try{
    const {Fn,uniform,positionWorld,sin,abs,float,materialColor}=await import('three/tsl');
    const reefTime=uniform(0);time.node=reefTime;
    const caustics=Fn(()=>{
      const q=positionWorld.xz.mul(2.4);
      const a=sin(q.x.add(sin(q.y.add(reefTime.mul(.32))).mul(1.8)).add(reefTime.mul(.4)));
      const b=sin(q.y.mul(1.13).add(sin(q.x.mul(.8).sub(reefTime.mul(.23))).mul(1.6)));
      return float(1).sub(abs(a.add(b)).mul(.65)).max(0).pow(12);
    })();
    const tint=float(.94).add(caustics.mul(.30));
    for(const material of materials){if(!material.isNodeMaterial)continue;material.colorNode=materialColor.mul(tint);material.needsUpdate=true;}
  }catch(error){console.warn('Reef caustics unavailable on this renderer.',error);}
}

export function enrichScene(scene, renderer, M, decor) {
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  M.sand.bumpMap=surfaceTexture(true); M.sand.bumpScale=.075; M.sand.roughness=.92;
  const time={value:0,node:null};
  const reefMaterials=[M.sand,M.sandDark,M.rock,M.rockLight,M.coralPink,M.coralMint,M.coralLilac,M.coralPeach,M.coralGreen];
  if(renderer.isWebGPURenderer){
    // The node renderer prefilters an equirect environment itself; PMREM from a GLSL scene is not needed.
    scene.environment=reflectionEnvironment(); scene.environmentIntensity=.3;
    nodeCaustics(reefMaterials,time);
  } else {
  // A soft underwater studio environment adds legible reflections to wet surfaces.
  const env = new THREE.Scene(); env.background = new THREE.Color(0x28617a);
  const top = new THREE.Mesh(new THREE.SphereGeometry(20,24,12),new THREE.MeshBasicMaterial({color:0x91cddb,side:THREE.BackSide}));
  env.add(top);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(12,7),new THREE.MeshBasicMaterial({color:0xf1fbff}));
  panel.position.set(-3,10,4);panel.lookAt(0,0,0);env.add(panel);
  const pmrem=new THREE.PMREMGenerator(renderer), target=pmrem.fromScene(env,0);
  scene.environment=target.texture; scene.environmentIntensity=.24;
  pmrem.dispose();top.geometry.dispose();top.material.dispose();panel.geometry.dispose();panel.material.dispose();
  }
  const rim=new THREE.DirectionalLight(0x83e5fa,2.1);rim.position.set(-5,5,-6);scene.add(rim);
  scene.fog=new THREE.FogExp2(0x23677d,.025);
  // World-space animated caustics illuminate sand and reef without a moving spotlight.
  if(!renderer.isWebGPURenderer) for(const material of reefMaterials) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.reefTime=time;
      shader.vertexShader='varying vec3 reefPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nreefPosition=(modelMatrix*vec4(position,1.0)).xyz;');
      shader.fragmentShader='uniform float reefTime; varying vec3 reefPosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 q=reefPosition.xz*2.4;
        float a=sin(q.x+sin(q.y+reefTime*.32)*1.8+reefTime*.4);
        float b=sin(q.y*1.13+sin(q.x*.8-reefTime*.23)*1.6);
        float caustics=pow(max(0.0,1.0-abs(a+b)*.65),12.0);
        diffuseColor.rgb*=.94+caustics*.30;`);
    };
    material.customProgramCacheKey=()=> 'reef-caustic-v1';
  }
  // Faceted, eroded rock silhouettes replace perfectly smooth pebbles.
  decor.traverse(object=>{
    if(object.isMesh && (object.material===M.rock || object.material===M.rockLight)) {
      const p=object.geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        const scale=1+.075*Math.sin(x*7+y*3)*Math.cos(z*5-y*4);
        p.setXYZ(i,x*scale,y*scale,z*scale);
      }
      object.geometry.computeVertexNormals();
    }
  });
  const stalks=[];
  const leafMat=new THREE.MeshPhysicalMaterial({color:0x2b927b,roughness:.5,side:THREE.DoubleSide});
  for(let i=0;i<22;i++) {
    const x=(i<11?-1:1)*(5.7+random()*2.5),z=-3+random()*6;
    const h=.7+random()*1.2;
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.12,h*.4,0),new THREE.Vector3(-.13,h*.75,.1),new THREE.Vector3(.1,h,.02)]);
    const stalk=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.028,6,false),leafMat);stalk.position.set(x,.05,z);
    const root=new THREE.Group(); root.position.copy(stalk.position);stalk.position.set(0,0,0);root.add(stalk);
    for(let j=0;j<4;j++) { const u=.25+j*.17,p=curve.getPoint(u);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,14,8),leafMat);leaf.scale.set(.35,1.4,.08);leaf.position.copy(p);leaf.rotation.z=(j%2?1:-1)*.65;root.add(leaf); }
    decor.add(root);stalks.push(root);
  }
  const motesGeometry=new THREE.BufferGeometry(),positions=[];
  for(let i=0;i<300;i++)positions.push((random()-.5)*25,random()*10,(random()-.5)*20);
  motesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const motes=new THREE.Points(motesGeometry,new THREE.PointsMaterial({color:0xc4eff3,size:.024,transparent:true,opacity:.35,depthWrite:false}));scene.add(motes);
  return {update(t){time.value=t;if(time.node)time.node.value=t;motes.rotation.y=t*.007;stalks.forEach((s,i)=>{s.rotation.z=Math.sin(t*.75+i)*.075;});}};
}
