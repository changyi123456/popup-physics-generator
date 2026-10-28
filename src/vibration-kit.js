import * as THREE from './vendor/three.module.js';
import { createMachineKit } from './machine-kit.js';
export function createVibrationKit(){
 const k=createMachineKit();
 function movingCylinder(r,h,material,parent,name,part,position=[0,0,0]){const mesh=k.cyl(r,h,material,parent,name,part,...position);return {mesh,set(a,b){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),length=av.distanceTo(bv);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());mesh.scale.y=length/h;}};}
 function coil(radius,wire,turns,parent,part,name){
  const steps=240,sides=10,positions=new Float32Array((steps+1)*(sides+1)*3),normals=new Float32Array(positions.length),indices=[];
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setIndex(indices);
  const mesh=k.add(geometry,'brass',parent,name,part,[0,0,0],true,false);let last=NaN;
  function pose(length){if(Math.abs(length-last)<1e-5)return;last=length;const tangentLength=Math.hypot(radius*turns*Math.PI*2,length),by=radius*turns*Math.PI*2/tangentLength,flat=length/tangentLength;
   for(let i=0;i<=steps;i++){const s=i/steps,a=s*turns*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);for(let j=0;j<=sides;j++){const b=j/sides*Math.PI*2,cb=Math.cos(b),sb=Math.sin(b),nx=cb*ca+sb*flat*sa,ny=sb*by,nz=cb*sa-sb*flat*ca,index=(i*(sides+1)+j)*3;positions[index]=radius*ca+wire*nx;positions[index+1]=s*length+wire*ny;positions[index+2]=radius*sa+wire*nz;normals[index]=nx;normals[index+1]=ny;normals[index+2]=nz;}}
   geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;geometry.computeBoundingSphere();
  }pose(60);return {mesh,pose};
 }
 function flexure(parent,part,x,z,height=130){
  const levels=28,w=1.7,d=.9,points=new Float32Array((levels+1)*4*3),indices=[];
  for(let i=0;i<levels;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,e=(i+1)*4+(j+1)%4;indices.push(a,c,b,b,c,e);}indices.push(0,1,2,0,2,3);const top=levels*4;indices.push(top,top+2,top+1,top,top+3,top+2);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));geo.setIndex(indices);const mesh=k.add(geo,'steel',parent,'彈性樓柱',part,[x,0,z],true,false);let last=NaN;
  function pose(dx){if(Math.abs(dx-last)<1e-5)return;last=dx;for(let i=0;i<=levels;i++){const s=i/levels,bend=dx*s*s*(3-2*s),slope=dx*6*s*(1-s)/height,angle=Math.atan(slope),ca=Math.cos(angle),sa=Math.sin(angle);for(let j=0;j<4;j++){const xx=[-w,w,w,-w][j],zz=[-d,-d,d,d][j],at=(i*4+j)*3;points[at]=bend+xx*ca;points[at+1]=s*height-xx*sa;points[at+2]=zz;}}geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}pose(0);return {mesh,pose};
 }
 function halfTube(ro,ri,length,parent,part,name,material='steel',physical=true){const s=new THREE.Shape();s.absarc(0,0,ro,0,Math.PI,false);s.lineTo(-ri,0);s.absarc(0,0,ri,Math.PI,0,true);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:48});g.rotateX(-Math.PI/2);return k.add(g,material,parent,name,part,[0,0,0],physical);}
 function damper(parent,part,name,bodyLength=34,rodLength=36){
  const group=new THREE.Group();parent.add(group);
  k.cyl(3.1,bodyLength,'cool',group,name+'筒身',part,0,1+bodyLength/2,0);k.ring(3.7,1.35,1,'paper',group,'阻尼器桿端密封座',part,0,1+bodyLength,0);k.ring(3.5,2.8,.5,'brass',group,'密封座壓環',part,0,1+bodyLength+.6,0);
  const rod=k.cyl(1.2,rodLength,'steel',group,'阻尼器活塞桿',part),piston=k.cyl(2.7,1.4,'dark',group,'阻尼器內活塞',part);
  k.ring(3.1,1.15,3.5,'paper',group,'固定端眼環',part,0,0,0,'z');const eye=k.ring(3.1,1.15,3.5,'paper',group,'移動端眼環',part,0,0,0,'z');
  for(const z of [-2.2,2.2])k.ring(1.8,1.1,.5,'brass',group,'固定端銷墊圈',part,0,0,z,'z');
  let length=50;function pose(a,b){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);length=av.distanceTo(bv);group.position.copy(av);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());rod.position.y=length-rodLength/2;piston.position.y=length-rodLength;eye.position.y=length;}
  return {group,pose,get length(){return length;},get piston(){return length-rodLength;},end(t){return group.localToWorld(new THREE.Vector3(0,t?length:0,0));}};
 }
 return {...k,movingCylinder,coil,flexure,halfTube,damper};
}
