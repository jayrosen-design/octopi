// Standalone Garden page: full-size terrain, ocean and lighting around the shared garden world.
import {navigatorVoice} from './navigator-voice.js';
import {clayGrab} from './clay-grab.js?v=attached4';
import {clayOcean} from './clay-ocean.js';
import {mountMusic} from './music.js?v=claypods1';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clayTexture,clayAlbedo,reflectionEnvironment} from './clay-texture.js';
import {gardenWorld} from './garden-world.js?v=3';
const $=id=>document.getElementById(id);
mountMusic($('musicToggle'),'reef');const voice=navigatorVoice({after:$('musicToggle')});
const scene=new THREE.Scene();scene.background=new THREE.Color('#83bdc9');scene.fog=new THREE.FogExp2('#83bdc9',.007);
const renderer=new THREE.WebGPURenderer({canvas:$('world'),antialias:true,alpha:false});
await renderer.init();$('renderMode').textContent=renderer.backend.isWebGPUBackend?'WebGPU · reflective lighting':'WebGL 2 · reflective lighting';scene.environment=reflectionEnvironment();scene.environmentIntensity=.7;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,160);camera.position.set(30,31,41);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,-3);controls.enableDamping=true;controls.minDistance=6;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.18;
scene.add(new THREE.HemisphereLight('#e2fff4','#65848d',1.8));const sun=new THREE.DirectionalLight('#fff5d4',2.2);sun.position.set(-12,24,18);scene.add(sun);renderer.shadowMap.enabled=true;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:75});sun.shadow.bias=-.001;sun.shadow.normalBias=.05;const fill=new THREE.DirectionalLight('#81dbee',1.6);fill.position.set(14,10,-25);scene.add(fill);
const terrainTexture=clayTexture(22),propTexture=clayTexture(2.5),propAlbedo=clayAlbedo(propTexture);const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9,map:propAlbedo,bumpMap:propTexture,bumpScale:.14});const sand=mat('#dcd6b5');sand.bumpMap=terrainTexture;sand.map=clayAlbedo(terrainTexture);sand.bumpScale=.5;const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,140,128,128),sand);ground.rotation.x=-Math.PI/2;ground.position.y=-.3;ground.receiveShadow=true;scene.add(ground);const gp=ground.geometry.attributes.position;for(let i=0;i<gp.count;i++){const x=gp.getX(i),y=gp.getY(i),r=Math.hypot(x,y);gp.setZ(i,-Math.max(0,r-39)*1.2);}ground.geometry.computeVertexNormals();
let seed=7;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const movable=[];
const ocean=clayOcean(scene);
const sphereGeo=new THREE.SphereGeometry(1,20,14),coralMats=['#ee6ca8','#ffb347','#2cd5b8','#aa88f4'].map(mat);
function blob(parent,x,y,z,sx,sy,sz,m){const mesh=new THREE.Mesh(sphereGeo,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.receiveShadow=true;parent.add(mesh);if(parent===scene&&sx<3){mesh.name='Clay pebble';movable.push(mesh);}return mesh;}
for(let i=0;i<115;i++){const x=(rand()-.5)*72,z=(rand()-.5)*65;blob(scene,x,-.05,z,.4+rand()*1.3,.2+rand()*.6,.4+rand(),mat(i%2?'#b3c6bf':'#a3bfc1'));}
function coral(x,z,color){const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);for(let j=0;j<5;j++){const height=.6+rand()*1.7;const branch=blob(group,(rand()-.5)*1.5,height/2,(rand()-.5),.18,height/2,.18,color);branch.rotation.z=(rand()-.5)*.8;blob(group,branch.position.x+.3,height*.65,branch.position.z,.42,.13,.15,color).rotation.z=.7;}group.name='Clay coral';movable.push(group);return group;}
for(let j=0;j<20;j++)coral((rand()-.5)*65,(rand()-.5)*55,coralMats[j%4]);

const garden=gardenWorld({scene,camera,controls,canvas:renderer.domElement,host:document.body,voice,freeRoam:true,collapsed:innerWidth<=800,status:text=>{$('worldStatus').textContent=text;}});
let paused=false;const motion=document.createElement('button');motion.type='button';motion.textContent='Pause swimming';motion.onclick=()=>{paused=!paused;motion.textContent=paused?'Resume swimming':'Pause swimming';};garden.elements.actions.append(motion);
const grab=clayGrab({scene,camera,controls,canvas:renderer.domElement,objects:[...movable,...garden.grabObjects],bounds:34,floor:0,onDrop:garden.onDrop,onTap:garden.onTap,status:garden.report,onPickup:garden.onPickup});
garden.setGrab(grab);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const clock=new THREE.Clock();let animationTime=0;
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.04);if(!paused)animationTime+=dt;grab.update(dt);ocean.update(animationTime);garden.update(animationTime,dt);controls.update();renderer.render(scene,camera);}
tick();
