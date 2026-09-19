import * as THREE from 'three';
import {clayTexture,clayAlbedo} from './clay-texture.js';
export function clayOcean(scene){
 scene.background=new THREE.Color('#031c36');scene.fog=new THREE.FogExp2('#08304b',.009);
 const height=clayTexture(5),color=clayAlbedo(height),group=new THREE.Group();group.name='Clay ocean and trench';scene.add(group);
 // A sculpted shelf falls away into a deep blue trench; the distant walls close the horizon.
 const rock=new THREE.MeshStandardMaterial({color:'#15658a',map:color,bumpMap:height,bumpScale:.35,roughness:.94});
 for(let i=0;i<34;i++){const a=i/34*Math.PI*2,r=53+Math.sin(i*2.4)*5;const wall=new THREE.Mesh(new THREE.DodecahedronGeometry(1,2),rock);wall.position.set(Math.cos(a)*r,-5,Math.sin(a)*r);wall.scale.set(7,7+Math.sin(i)*2,6);wall.rotation.y=a;group.add(wall);}
 const wallGeo=new THREE.CylinderGeometry(72,62,52,96,12,true);const p=wallGeo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),r=1+.025*Math.sin(a*13+y*.7);p.setXYZ(i,p.getX(i)*r,y,p.getZ(i)*r);}wallGeo.computeVertexNormals();
 const walls=new THREE.Mesh(wallGeo,new THREE.MeshStandardMaterial({color:'#075777',map:color,bumpMap:height,bumpScale:.4,roughness:1,side:THREE.BackSide}));walls.position.y=12;group.add(walls);
 const surface=new THREE.Mesh(new THREE.SphereGeometry(110,48,24),new THREE.MeshBasicMaterial({color:'#092641',side:THREE.BackSide}));group.add(surface);
 const glows=[];for(let band=0;band<4;band++){const data=[];for(let i=0;i<100;i++){const a=Math.random()*Math.PI*2,r=45+Math.random()*24;data.push(Math.cos(a)*r,7+Math.random()*35,Math.sin(a)*r);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data,3));const m=new THREE.PointsMaterial({color:['#84fff4','#aed9ff','#eea9ff','#fff3b0'][band],size:.11+band*.045,transparent:true,opacity:.6,depthWrite:false});const stars=new THREE.Points(geo,m);group.add(stars);glows.push(stars);}
 const light=new THREE.HemisphereLight('#68e9ff','#123068',.8);group.add(light);
 return {update(t){glows.forEach((g,i)=>{g.material.opacity=.35+.35*(.5+.5*Math.sin(t*(.7+i*.2)+i*2));g.rotation.y=Math.sin(t*.025+i)*.012;});}};
}
