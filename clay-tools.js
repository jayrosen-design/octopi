// Tool motion is applied inside the grip so swimming and activation compose.
export function toolForHit(object){
 for(let o=object;o;o=o.parent){if(o.userData.toolType)return o;if(o.userData.heldTool)return o.userData.heldTool;}
 return null;
}
export function activateTool(tool){
 const model=tool?.userData.toolModel;if(!model)return false;
 const state=tool.userData;state.activationStart=performance.now();
 if(state.animating)return true;state.animating=true;
 const position=model.position.clone(),rotation=model.rotation.clone(),scale=model.scale.clone();
 const type=state.toolType;
 function frame(now){
  const t=(now-state.activationStart)/1000,progress=Math.min(1,t/1.8),pulse=Math.sin(progress*Math.PI),wave=Math.sin(t*12)*pulse;
  model.position.copy(position);model.rotation.copy(rotation);model.scale.copy(scale);
  if(type==='globe')model.rotation.y+=progress*Math.PI*4;
  else if(type==='lens'){model.position.x+=Math.sin(t*6)*pulse*.22;model.position.y+=pulse*.18;model.rotation.y+=wave*.3;}
  else if(type==='pencil'){model.position.x+=wave*.15;model.position.y+=Math.cos(t*18)*pulse*.09;model.rotation.z+=wave*.25;}
  else if(type==='sample'){model.rotation.z+=wave*.4;model.position.y+=pulse*.12;}
  else if(type==='book'){model.rotation.y+=wave*.35;model.scale.x*=1+pulse*.22;}
  else if(type==='scroll')model.scale.y*=1+pulse*.35;
  else {model.position.y+=pulse*.18;model.scale.multiplyScalar(1+wave*.12);model.rotation.y+=wave*.18;}
  if(progress<1)requestAnimationFrame(frame);
  else {model.position.copy(position);model.rotation.copy(rotation);model.scale.copy(scale);state.animating=false;}
 }
 requestAnimationFrame(frame);return true;
}
