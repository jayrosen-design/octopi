import {claimSpeechAudio} from './music.js?v=claypods1';
export function navigatorVoice({after,getKey=()=>'',onKey=()=>{}}){
 let key='',enabled=false,autoAllowed=false,controller=null,url='',token=0;const cache=new Map(),audio=new Audio();audio.volume=.85;
 const open=document.createElement('button');open.textContent='◖ Speech';open.type='button';after.after(open);
 const dialog=document.createElement('dialog');dialog.className='voice-dialog';dialog.innerHTML='<button class="close-voice" aria-label="Close speech settings">×</button><h2>Voices of the garden</h2><p>NaviGator · Kokoro speech</p><label>NaviGator API key<input type="password" autocomplete="off" placeholder="Use your NaviGator key"></label><p class="voice-status">Use your existing connection or enter a key for this page. Your key stays in memory.</p><label>Voice<input class="voice-name" value="af_heart" maxlength="40" aria-label="Kokoro voice"></label><label><input type="checkbox" class="auto-speech"> Read new messages from the selected pod</label><button class="test-voice">Test voice</button><button class="stop-voice">Stop speech</button><p class="speech-status" role="status">Select Listen on a message to hear it.</p>';
 document.body.append(dialog);const field=dialog.querySelector('input[type=password]'),voice=dialog.querySelector('.voice-name'),status=dialog.querySelector('.speech-status');
 open.onclick=()=>dialog.showModal();dialog.querySelector('.close-voice').onclick=()=>dialog.close();field.oninput=()=>{key=field.value.trim();onKey(key);};dialog.querySelector('.auto-speech').onchange=e=>{enabled=e.target.checked;autoAllowed=enabled;};
 function stop(){autoAllowed=false;open.textContent='◖ Speech';token++;controller?.abort();controller=null;audio.pause();audio.removeAttribute('src');audio.load();if(url){URL.revokeObjectURL(url);url='';}}
 addEventListener('octopi-audio-stop',stop);addEventListener('deepsea-sound',e=>{if(e.detail.muted)stop();});addEventListener('pagehide',stop);
 dialog.querySelector('.stop-voice').onclick=()=>{stop();status.textContent='Speech stopped.';};
 async function speak(text,name='Octopus'){
  text=String(text).slice(0,4000);stop();claimSpeechAudio();autoAllowed=true;const current=++token;controller=new AbortController();const voiceName=voice.value.trim()||'af_heart';status.textContent='Preparing '+name+'’s voice…';open.textContent='◖ Preparing voice…';
  try{const cacheKey=voiceName+'|'+text;let blob=cache.get(cacheKey);
   if(!blob){const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({navigatorKey:getKey()||key,text,voice:voiceName}),signal:controller.signal});if(!response.ok){let error;try{error=await response.json();}catch{}throw Error(error?.error||'Speech could not connect. Check your NaviGator key.');}blob=await response.blob();if(!blob.type.startsWith('audio/'))throw Error('The speech service did not return audio.');if(cache.size>=20)cache.delete(cache.keys().next().value);cache.set(cacheKey,blob);}
   if(current!==token)return;url=URL.createObjectURL(blob);audio.src=url;await audio.play();status.textContent='Speaking as '+name+'.';open.textContent='◖ Speaking…';
  }catch(e){if(current!==token)return;if(e.name!=='AbortError'){status.textContent=e.message;dialog.showModal();}open.textContent='◖ Speech';}
 }
 audio.onended=()=>{open.textContent='◖ Speech';status.textContent='Finished speaking.';if(url){URL.revokeObjectURL(url);url='';}};
 dialog.querySelector('.test-voice').onclick=()=>speak('Hello. Welcome to the Octopi garden. Let’s explore an idea together.');
 function addListen(container,text,name){const button=document.createElement('button');button.className='listen-message';button.textContent='◖ Listen';button.setAttribute('aria-label','Listen to '+name);button.onclick=()=>speak(text,name);container.append(button);}
 return {speak,addListen,auto(text,name){if(enabled&&autoAllowed&&!document.hidden)speak(text,name);},stop};
}
