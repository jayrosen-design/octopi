// Shared procedural underwater Foley. One context, capped transient voices, per-creature timbre.
let context,master,noise,active=false,enabled=localStorage.getItem('octopi-fx')!=='off';
const voices=new Set();let button;
function stop(){for(const source of voices){try{source.stop();}catch{}}voices.clear();context?.suspend().catch(()=>{});}
function state(on){active=on;if(!on)stop();else if(enabled)start();}
function start(){try{if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;context=new AudioContext();master=context.createGain();master.gain.value=.32;master.connect(context.destination);noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}context.resume().catch(()=>{});}catch{}}
function label(){if(button){button.textContent=enabled?'◌ Water sounds on':'◌ Water sounds off';button.setAttribute('aria-pressed',String(enabled));}}
export function mountWaterSounds(after){if(!after||button)return;button=document.createElement('button');button.type='button';button.title='Tentacle swishes and spatial bubble sounds';button.className=after.className;button.onclick=()=>{enabled=!enabled;localStorage.setItem('octopi-fx',enabled?'on':'off');if(!enabled)stop();else if(active)start();label();window.dispatchEvent(new CustomEvent('octopi-fx-setting',{detail:{enabled}}));};after.after(button);label();}
addEventListener('octopi-audio-stop',()=>state(false));
addEventListener('octopi-audio-active',()=>state(true));
addEventListener('deepsea-sound',e=>{if(e.detail.muted)state(false);});
addEventListener('storage',e=>{if(e.key==='octopi-fx'){enabled=e.newValue!=='off';if(!enabled)stop();label();}});
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||parent===window)return;if(e.data?.type==='octopi-water-state'){enabled=e.data.enabled;state(e.data.active);}});
if(parent!==window)parent.postMessage({type:'octopi-water-ready'},location.origin);
document.addEventListener('pointerdown',()=>{if(active&&enabled)start();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(active&&enabled)start();});
addEventListener('pagehide',stop);
function play(kind,spatial,pitch=1,energy=1){
 if(!active||!enabled||document.hidden||!context||context.state!=='running'||voices.size>=6||spatial.gain<.015)return;
 const t=context.currentTime,duration=kind==='swish'?.65:kind==='float'?.30:.15;
 const gain=context.createGain(),pan=context.createStereoPanner();pan.pan.value=spatial.pan;
 const peak=(kind==='swish'?.12:.19)*spatial.gain*Math.min(1,energy);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+(kind==='swish'?.18:.012));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
 gain.connect(pan);pan.connect(master);
 let source,filter;
 if(kind==='swish'){source=context.createBufferSource();source.buffer=noise;source.loop=true;filter=context.createBiquadFilter();filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(280*pitch,t);filter.frequency.exponentialRampToValueAtTime(650*pitch,t+.22);filter.frequency.exponentialRampToValueAtTime(210*pitch,t+duration);source.connect(filter);filter.connect(gain);}
 else{source=context.createOscillator();source.type='sine';const base=(kind==='float'?370:720)*pitch;source.frequency.setValueAtTime(base,t);source.frequency.exponentialRampToValueAtTime(base*(kind==='pop'?.35:2.1),t+duration);source.connect(gain);}
 voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();filter?.disconnect();gain.disconnect();pan.disconnect();};source.start(t);source.stop(t+duration+.02);
}
export function attachWaterVoice(root,mesh){
 let hash=0;for(const c of root.name)hash=(hash*31+c.charCodeAt(0))>>>0;
 const pitch=.76+(hash%71)/100,point=root.position.clone(),last=point.clone(),eye=point.clone(),screen=point.clone();
 let previous=0,nextSwish=0,nextFloat=0,lastArm=0;const spatial={pan:0,gain:0};
 root.userData.waterSound=kind=>play(kind,spatial,pitch*(.94+Math.random()*.12));
 const original=mesh.onBeforeRender;
 mesh.onBeforeRender=function(renderer,scene,camera,...args){original?.call(this,renderer,scene,camera,...args);
  const now=performance.now()/1000;if(now-previous<.12)return;
  root.getWorldPosition(point);camera.getWorldPosition(eye);screen.copy(point).project(camera);
  spatial.pan=Math.max(-1,Math.min(1,screen.x));spatial.gain=screen.z<1&&Math.abs(screen.x)<1.3?1/(1+(point.distanceTo(eye)/12)**2):0;
  const arm=root.userData.tentacles?.[hash%8]?.children[1]?.position.y||0;
  const dt=now-previous,speed=previous?(point.distanceTo(last)+Math.abs(arm-lastArm)*2)/dt:0;
  if(speed>.015&&now>nextSwish){play('swish',spatial,pitch,Math.min(1,.3+speed));nextSwish=now+1.7+(hash%10)*.12+Math.random();}
  if(speed>.015&&now>nextFloat){play('float',spatial,pitch,.45);nextFloat=now+5+Math.random()*7;}
  previous=now;last.copy(point);lastArm=arm;
 };
}
