import * as THREE from 'three';
let clayHeightData;
const albedoData = new WeakMap();
// Periodic, multi-scale height field: pressed clay, tool strokes and fine pores.
export function clayTexture(repeat=2){
 const size=512;
 if(!clayHeightData){
 const data=new Uint8Array(size*size*4);const dents=Array.from({length:18},(_,i)=>({x:(Math.sin(i*12.78)*.5+.5)*size,y:(Math.cos(i*8.31)*.5+.5)*size,r:16+(i*17)%55}));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
  let h=145+17*Math.sin(3*u+2*Math.sin(v))+10*Math.cos(7*v+Math.sin(3*u))+5*Math.sin(23*u+4*Math.sin(5*v));
  const grain=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;h+=grain*5;
  for(const d of dents){const dx=Math.min(Math.abs(x-d.x),size-Math.abs(x-d.x)),dy=Math.min(Math.abs(y-d.y),size-Math.abs(y-d.y));const r=Math.sqrt(dx*dx+dy*dy)/d.r;if(r<1){h-=12*(1-r*r);h+=Math.sin(r*55)*2.4*(1-r);}}
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=Math.max(0,Math.min(255,h));data[i+3]=255;
 }
 clayHeightData=data;
 }
 const texture=new THREE.DataTexture(clayHeightData,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function reflectionEnvironment(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
 const gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#c9eef1');gradient.addColorStop(.45,'#4b9aaa');gradient.addColorStop(.6,'#23657c');gradient.addColorStop(1,'#b7b89b');ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
 for(const [x,y,rx,ry] of [[185,100,115,55],[730,135,60,115],[490,40,200,20]]){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(255,255,235,1)');g.addColorStop(.4,'rgba(235,255,250,.85)');g.addColorStop(1,'rgba(220,255,250,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
 const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function clayAlbedo(height){
 const source=height.image.data;let data=albedoData.get(source);
 if(!data){data=new Uint8Array(source.length);
 for(let i=0;i<data.length;i+=4){const value=Math.min(255,Math.max(190,234+(source[i]-145)*.55));data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;}
 albedoData.set(source,data);
 }
 const texture=new THREE.DataTexture(data,height.image.width,height.image.height);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.copy(height.repeat);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
