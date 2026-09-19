import {mountWaterSounds} from './water-audio.js?v=2';
const tracks={reef:'assets/bgm-dire-dire.mp3',search:'assets/bgm-water-level.mp3'};
const audio=new Audio();audio.loop=true;audio.volume=.22;audio.preload='auto';
const owner=crypto.randomUUID(),channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('octopi-audio'):null;
let ownsAudio=false,speechFocus=false;
function relayWater(){document.querySelectorAll('iframe').forEach(frame=>frame.contentWindow?.postMessage({type:'octopi-water-state',active:ownsAudio,enabled:localStorage.getItem('octopi-fx')!=='off'},location.origin));}
addEventListener('octopi-fx-setting',relayWater);
addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='octopi-water-ready')relayWater();});
let enabled=sessionStorage.getItem('deepsea-music')!=='off',track='',button,yielded=false;
function label(){if(!button)return;button.textContent=yielded?'♫ Play here':enabled&&!audio.paused?'♫ Sound on':enabled?'♫ Play music':'♫ Sound off';button.setAttribute('aria-pressed',String(!enabled||yielded));}
function stopOtherMedia(){ownsAudio=false;relayWater();document.querySelectorAll('audio,video').forEach(media=>{if(media!==audio)media.pause();});window.dispatchEvent(new CustomEvent('octopi-audio-stop'));}
function yieldToOther(id){if(!id||id===owner)return;yielded=true;audio.pause();stopOtherMedia();window.dispatchEvent(new CustomEvent('deepsea-sound',{detail:{muted:true}}));label();}
if(window===parent)channel?.addEventListener('message',event=>yieldToOther(event.data?.owner));
addEventListener('storage',event=>{if(window===parent&&event.key==='octopi-audio-owner')yieldToOther(event.newValue);});
audio.addEventListener('playing',()=>{if(yielded){audio.pause();return;}stopOtherMedia();try{localStorage.setItem('octopi-audio-owner',owner);}catch{}channel?.postMessage({owner});ownsAudio=true;window.dispatchEvent(new CustomEvent('octopi-audio-active'));relayWater();label();});
export function claimSpeechAudio(){audio.pause();stopOtherMedia();speechFocus=true;yielded=false;try{localStorage.setItem('octopi-audio-owner',owner);}catch{}channel?.postMessage({owner});ownsAudio=true;label();}
async function play(){speechFocus=false;if(!enabled||yielded)return;try{await audio.play();}catch{}label();}
export function setMusicScene(scene){const next=scene==='search'?'search':'reef';if(next===track)return;audio.pause();stopOtherMedia();track=next;audio.src=tracks[next];audio.load();play();}
export function mountMusic(el,scene='reef'){
 button=el;mountWaterSounds(button);button.onclick=()=>{if(yielded){yielded=false;enabled=true;play();}else if(enabled&&audio.paused)play();else{enabled=!enabled;if(enabled)play();else {audio.pause();stopOtherMedia();}}sessionStorage.setItem('deepsea-music',enabled?'on':'off');label();window.dispatchEvent(new CustomEvent('deepsea-sound',{detail:{muted:!enabled}}));};
 document.addEventListener('pointerdown',e=>{if(e.target.closest('#mute,#musicToggle'))return;if(enabled&&!yielded&&!speechFocus&&audio.paused)play();},{passive:true});
 document.addEventListener('keydown',()=>{if(enabled&&!yielded&&!speechFocus&&audio.paused)play();},{passive:true});audio.addEventListener('pause',label);setMusicScene(scene);label();
}
addEventListener('pagehide',()=>{audio.pause();channel?.close();});
