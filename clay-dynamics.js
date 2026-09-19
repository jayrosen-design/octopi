// Damped springs settle onto a plastically edited target surface.
// Brush bounds prevent accidental runaway deformation; no material-volume claim.
export class ClaySurface {
 constructor(positions){this.original=positions.slice();this.target=positions.slice();this.position=positions;this.velocity=new Float32Array(positions.length);}
 constrain(index,value){return Math.max(this.original[index]-.65,Math.min(this.original[index]+.65,value));}
 step(dt,softness=.65){const substeps=Math.max(1,Math.ceil(Math.min(dt,.05)/.008));const h=Math.min(dt,.05)/substeps;const stiffness=95+(1-softness)*210,damping=2*Math.sqrt(stiffness)*(.78+(1-softness)*.22);let moving=false;
  for(let step=0;step<substeps;step++)for(let i=0;i<this.position.length;i++){const delta=this.target[i]-this.position[i];if(Math.abs(delta)<.000015&&Math.abs(this.velocity[i])<.0001){this.position[i]=this.target[i];this.velocity[i]=0;continue;}this.velocity[i]+=(stiffness*delta-damping*this.velocity[i])*h;this.position[i]+=this.velocity[i]*h;moving=true;}return moving;
 }
}
