// Camera-relative movement, independent of frame rate and diagonal key combinations.
export function swimDirection(keys,forward){
 const vertical=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0);
 const horizontal=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
 const length=Math.hypot(forward.x,forward.z)||1,fx=forward.x/length,fz=forward.z/length;
 const x=fx*vertical-fz*horizontal,z=fz*vertical+fx*horizontal,n=Math.hypot(x,z);
 return n?{x:x/n,z:z/n}:{x:0,z:0};
}
export function movementKey(event){const key=event.key?.length===1?event.key.toLowerCase():event.key;return ['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)?key:null;}
