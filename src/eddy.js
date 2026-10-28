import * as THREE from './vendor/three.module.js';
import { smooth } from './model.js';
import { E_SPEC, eddySample } from './eddy-model.js';
import { createMachineKit } from './machine-kit.js';
export function createEddy(){
 const k=createMachineKit(),{root,assembly,add,box,cyl,ring,bolt,tube,label}=k,TAU=Math.PI*2,R=34,scale=R/E_SPEC.radius,Y=55;
 const base=assembly('base','ed_frame'),support=assembly('support','ed_shaft'),rotorAssembly=assembly('rotor','ed_disk',[0,40,28]),magnet=assembly('magnet','ed_magnet',[34,16,-12]),carriage=assembly('carriage','ed_carriage',[19,0,28]),instrument=assembly('instrument','ed_frame',[-31,8,0]);
 k.base(base,'ed_frame','EDDY CURRENT · BRAKE');
 for(const z of [-25,25]){
  box(20,3,14,'dark',support,'軸承支柱底腳','ed_shaft',0,6,z);box(8,40,7,'steel',support,'軸承支承柱','ed_shaft',0,27,z);
  ring(8.5,2.6,6,'paper',support,'軸承座','ed_shaft',0,Y,z,'z');ring(6.6,4.5,6.3,'dark',support,'軸承外圈','ed_shaft',0,Y,z,'z',false);ring(4.2,2.55,6.6,'brass',support,'軸承內圈','ed_shaft',0,Y,z,'z',false);
  for(let j=0;j<6;j++){const a=j/6*TAU;cyl(.75,.7,'steel',support,'軸承滾珠','ed_shaft',Math.cos(a)*5.5,Y+Math.sin(a)*5.5,z+3.5,'z',false);}
  for(const x of [-7,7])for(const zz of [-4,4])bolt(support,x,8,z+zz,'ed_shaft');
  box(15,2,10,'dark',support,'軸承上壓蓋','ed_shaft',0,Y+9,z);for(const x of [-5,5])bolt(support,x,Y+10.5,z,'ed_shaft');
 }
 const spin=new THREE.Group();spin.position.y=Y;rotorAssembly.add(spin);
 cyl(2.5,74,'steel',spin,'圓盤主軸','ed_shaft',0,0,0,'z');for(const z of [-20,20])ring(4,2.55,1.2,'brass',spin,'主軸定位環','ed_shaft',0,0,z,'z');
 function diskShape(slots){const s=new THREE.Shape(),bore=E_SPEC.bore*scale;if(!slots)s.absarc(0,0,R,0,TAU,false);else{const inner=R*E_SPEC.slotInner,step=TAU/E_SPEC.slotCount,gap=E_SPEC.slotAngle;for(let j=0;j<E_SPEC.slotCount;j++){const start=j*step+gap/2,end=(j+1)*step-gap/2;if(j===0)s.moveTo(R*Math.cos(start),R*Math.sin(start));s.absarc(0,0,R,start,end,false);s.lineTo(inner*Math.cos(end),inner*Math.sin(end));s.absarc(0,0,inner,end,(j+1)*step+gap/2,false);s.lineTo(R*Math.cos((j+1)*step+gap/2),R*Math.sin((j+1)*step+gap/2));}s.closePath();}const hole=new THREE.Path();hole.absarc(0,0,bore,0,TAU,true);s.holes.push(hole);return s;}
 const diskMaterial=k.materials.copper.clone();diskMaterial.onBeforeCompile=k.materials.copper.onBeforeCompile;diskMaterial.customProgramCacheKey=k.materials.copper.customProgramCacheKey;
 const disks=[];
 for(const slots of [false,true]){const geo=new THREE.ExtrudeGeometry(diskShape(slots),{depth:E_SPEC.thickness*scale,bevelEnabled:true,bevelSize:.09,bevelThickness:.07,bevelSegments:2,curveSegments:64});geo.translate(0,0,-E_SPEC.thickness*scale/2);const m=add(geo,diskMaterial,spin,slots?'12 道開槽圓盤':'完整金屬圓盤',slots?'ed_slots':'ed_disk',[0,0,0],!slots);m.userData.crank=true;disks.push(m);}
 ring(7,2.55,4,'paper',spin,'圓盤固定輪轂','ed_shaft',0,0,0,'z');for(const z of [-2.5,2.5])ring(7.6,2.55,.6,'dark',spin,'輪轂壓板','ed_shaft',0,0,z,'z');
 for(let j=0;j<3;j++){const a=j/3*TAU;bolt(spin,Math.cos(a)*5.1,Math.sin(a)*5.1,3.4,'ed_shaft','z');}
 cyl(1.4,10,'steel',spin,'手推柄銷軸','ed_shaft',-20,0,7,'z');const grip=cyl(2.5,6,'brass',spin,'手推圓盤握柄','ed_shaft',-20,0,13,'z');grip.userData.crank=true;
 // Rotor marks are fixed to the metal, so slowing is visually legible.
 for(let j=0;j<12;j++){const a=j/12*TAU,m=box(.3,2,.12,'ink',spin,'圓盤角度刻線','ed_disk',Math.cos(a)*29,Math.sin(a)*29,.62,false);m.rotation.z=a-Math.PI/2;}
 const pole=new THREE.Group();magnet.add(pole);
 // C core wraps around the outside rim; two shoes face one another through the disk thickness.
 box(7,18,28,'dark',pole,'C 磁軛外側橋','ed_magnet',15,Y,0);
 for(const sign of [-1,1]){box(16,18,5,'steel',pole,'磁軛伸出臂','ed_magnet',4.5,Y,sign*11.5);box(E_SPEC.poleWidth*scale,E_SPEC.poleHeight*scale,4,'paper',pole,'平行磁極靴','ed_magnet',0,Y,sign*6);label(sign>0?'N':'S',7,7,pole,0,Y,sign*8.1,'ed_magnet');for(const yy of [-6,6])bolt(pole,10,Y+yy,sign*14.5,'ed_magnet','z');}
 box(9,21,17,'paper',pole,'勵磁線圈骨架','ed_coil',15,Y,0);
 for(let j=0;j<12;j++){const z=-7.3+j*1.32;const pts=[];for(let t=0;t<=48;t++){const a=t/48*TAU;pts.push([15+Math.cos(a)*6.2,Y+Math.sin(a)*11,z]);}tube(pts,.38,'copper',pole,'電磁鐵繞組導線','ed_coil',j===0);}
 box(13,3,12,'dark',pole,'磁軛滑台連接座','ed_magnet',15,11,0);box(5,36,10,'steel',pole,'磁軛支承柱','ed_magnet',15,29,0);for(const z of [-4,4])bolt(pole,15,13,z,'ed_magnet');
 // Twin rails and lead screw move the field patch without touching the disk.
 for(const z of [-10,10]){cyl(1.3,41,'steel',carriage,'磁極進給導軌','ed_carriage',43,9,z,'x');for(const x of [24,62]){box(5,7,7,'paper',carriage,'導軌端座','ed_carriage',x,7.5,z);bolt(carriage,x,12,z,'ed_carriage');}}
 const slider=new THREE.Group();carriage.add(slider);box(18,3,29,'paper',slider,'磁鐵移動滑板','ed_carriage',15,10,0);for(const z of [-10,10])ring(2.3,1.35,9,'brass',slider,'導軌滑動襯套','ed_carriage',15,9,z,'x');
 cyl(1,43,'brass',carriage,'磁極位置進給螺桿','ed_carriage',43,8,0,'x');const knob=cyl(5,3,'brass',carriage,'進給手輪','ed_carriage',66,8,0,'x');for(let j=0;j<10;j++){const a=j/10*TAU;cyl(.35,3.2,'dark',knob,'手輪滾花','ed_carriage',0,Math.cos(a)*4.5,Math.sin(a)*4.5,'x',false);}
 box(28,1.3,8,'paper',carriage,'進給距離刻度尺','ed_carriage',45,5.5,19);for(let j=0;j<=10;j++)box(.2,.3,j%2?2:3.5,'ink',carriage,'距離刻線','ed_carriage',32+j*2.4,6.4,19,false);
 const marker=box(.5,3,4,'copper',slider,'位置游標','ed_carriage',15,9,19,false);label('INSERT / mm',28,5,carriage,45,5.7,25,'ed_carriage',true);
 for(const x of [47,59]){cyl(1.4,3,'brass',base,'勵磁電源接線柱','ed_coil',x,7,39);cyl(2.2,.6,'dark',base,'電源端子帽','ed_coil',x,8.8,39);}
 for(const sign of [-1,1])cyl(1.1,3,'brass',pole,'繞組接線端','ed_coil',23,Y+sign*8,sign*7,'x');
 const leads=[tube([[47,8,39],[58,14,25],[52,40,15],[41,Y+10,2]],.6,'copper',base,'勵磁電源導線','ed_coil'),tube([[59,8,39],[65,18,21],[62,43,-12],[42,Y-9,-2]],.6,'dark',base,'勵磁回路導線','ed_coil')];
 // Optical sensing bracket and bench meters provide purposeful detail.
 box(12,3,15,'dark',instrument,'轉速感測器支腳','ed_frame',-37,6,-12);box(3,61,4,'steel',instrument,'轉速光學探頭支柱','ed_frame',-37,36,-12);box(12,7,7,'paper',instrument,'非接觸轉速感測頭','ed_frame',-31,68,-12);cyl(2.1,2,'ink',instrument,'感測頭鏡窗','ed_frame',-24,68,-12,'x');for(const z of [-17,-7])bolt(instrument,-37,8,z,'ed_frame');
 box(29,14,14,'cool',instrument,'數位轉速表外殼','ed_frame',-43,13,33);label('RPM',22,8,instrument,-43,16,40.1,'ed_frame');for(const x of [-54,-32])for(const y of [9,20])bolt(instrument,x,y,40.5,'ed_frame','z');tube([[-31,68,-12],[-42,59,-20],[-52,12,-15],[-43,8,26]],.5,'dark',instrument,'轉速感測線','ed_frame');
 label('Al / Cu',19,6,base,0,4.15,45,'ed_disk',true);
 // Current loops remain in the laboratory field patch, rather than rotating with the metal.
 const currents=new THREE.Group();root.add(currents);const currentMaterial=new THREE.LineBasicMaterial({color:'#658f83',transparent:true,opacity:.7}),loops=[];
 for(const sign of [-1,1]){const pts=[];for(let j=0;j<=60;j++){const a=j/60*TAU;pts.push(new THREE.Vector3(Math.cos(a)*3.9,sign*6+Math.sin(a)*3.9,.7));}const geo=new THREE.BufferGeometry().setFromPoints(pts),line=new THREE.Line(geo,currentMaterial);currents.add(line);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.7,2.3,12),new THREE.MeshBasicMaterial({color:'#658f83',toneMapped:false}));currents.add(arrow);loops.push({line,arrow,sign});}
 const colors={aluminum:new THREE.Color('#c6d0c0'),copper:new THREE.Color('#c59a6d')};
 let highlighted=null,lastLead=Infinity;
 function select(part){highlighted=part;k.select(part);}
 function pose(state){const e=k.poseBase(state),p=eddySample(state),cx=p.patch.cx*scale;spin.rotation.z=state.phase??.8;disks[0].visible=!state.eddySlots;disks[1].visible=!!state.eddySlots;diskMaterial.color.copy(colors[p.copper?'copper':'aluminum']);pole.position.x=cx;slider.position.x=cx;knob.rotation.x=(state.eddyInsertion??20)/3*TAU;
  if(Math.abs(cx-lastLead)>1e-5){lastLead=cx;leads.forEach((l,i)=>{const pts=i?[[59,8,39],[65,18,21],[cx+26,43,-12],[cx+23,Y-8,-7]]:[[47,8,39],[58,14,25],[cx+25,40,15],[cx+23,Y+8,7]];const c=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)),false,'centripetal');l.geometry.dispose();l.geometry=new THREE.TubeGeometry(c,48,.6,8,false);});}leads.forEach(l=>l.visible=e<.06);
  currents.position.set(Math.min(cx,R-5),Y,0);currents.visible=state.eddyShowFlow!==false&&state.eddyMagnet!==false&&p.patch.fraction>.1&&Math.abs(p.omega)>.1&&e<.05;
  currentMaterial.opacity=(p.slots?.28:.7)*Math.min(1,Math.abs(p.omega)/4);loops.forEach(({line,arrow,sign})=>{const a=(state.phase??0)*sign;arrow.position.set(Math.cos(a)*3.9,sign*6+Math.sin(a)*3.9,.7);arrow.rotation.z=a-Math.PI/2+(sign<0?Math.PI:0);line.geometry.setDrawRange(0,p.slots?39:61);});
 }
 const inverse=new THREE.Matrix4(),localRay=new THREE.Ray(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-13),point=new THREE.Vector3();
 function crankAngleAt(ray){root.updateMatrixWorld(true);inverse.copy(rotorAssembly.matrixWorld).invert();localRay.copy(ray).applyMatrix4(inverse);const p=localRay.intersectPlane(plane,point);return p?Math.atan2(p.y-Y,p.x):null;}
 return {...k,select,physicalParts:k.parts.filter(p=>p.physical),pose,spin,disks,grip,pole,slider,crankAngleAt,pageAnchor(){root.updateMatrixWorld(true);return grip.getWorldPosition(new THREE.Vector3());},attachmentEvidence(){root.updateMatrixWorld(true);return [{diskAxis:spin.localToWorld(new THREE.Vector3()).distanceTo(rotorAssembly.localToWorld(new THREE.Vector3(0,Y,0)))}];}};
}
