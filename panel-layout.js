const full=document.getElementById('fullscreenReef');
const consolePanel=document.querySelector('.reef-console');
// Keep the actual controls and plan in the reef, rather than duplicating state.
consolePanel.addEventListener('toggle',()=>{consolePanel.querySelector('.console-toggle').textContent=consolePanel.open?'Minimize −':'Open search +';});
const plan=document.getElementById('planReview');
if(plan)consolePanel.append(plan);
const status=document.createElement('p');status.className='reef-live-status';status.setAttribute('role','status');consolePanel.append(status);
const report=document.createElement('button');report.textContent='Read the report ↗';report.hidden=true;consolePanel.append(report);
const synthesis=document.getElementById('synthesis');
const syncStatus=()=>{status.textContent=document.getElementById('roundLabel').textContent;report.hidden=synthesis.hidden;};
new MutationObserver(syncStatus).observe(document.getElementById('roundLabel'),{childList:true,subtree:true,characterData:true});
new MutationObserver(syncStatus).observe(synthesis,{attributes:true,attributeFilter:['hidden']});syncStatus();
report.onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();expanded(false);synthesis.scrollIntoView({behavior:'smooth',block:'start'});};
function expanded(){document.body.classList.remove('reef-expanded');}
full.onclick=async()=>{
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 try{await document.documentElement.requestFullscreen();}
 catch{full.textContent='Fullscreen unavailable';}
};
document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen';expanded();});
// Follow newly arriving chat only while the reader is already near the bottom.
const conversation=document.getElementById('conversation');
let following=true;
conversation.addEventListener('scroll',()=>{following=conversation.scrollHeight-conversation.scrollTop-conversation.clientHeight<90;});
new MutationObserver(()=>{if(following)conversation.scrollTop=conversation.scrollHeight;}).observe(conversation,{childList:true,subtree:true});
