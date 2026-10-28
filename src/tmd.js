import * as THREE from './vendor/three.module.js';
import { TMD_SPEC, tmdSample } from './vibration-model.js';
import { createVibrationKit } from './vibration-kit.js';
export function createTmd(){
 const k=createVibrationKit(),{root,assembly,box,cyl,ring,bolt,tube,label,movingCylinder}=k,S=TMD_SPEC.scale,top=151;
 const base=assembly('base','tmd_frame'),table=assembly('table','tmd_shaker',[0,12,0]),floor=assembly('floor','tmd_floor',[0,28,0]),ballAssembly=assembly('ball','tmd_ball',[0,38,29]),suspension=assembly('suspension','tmd_cables',[0,38,29]),hydraulics=assembly('hydraulics','tmd_dampers',[0,5,35]);
 k.base(base,'tmd_frame','TUNED MASS · VIBRATION');
 // Two horizontal rails and four real bearing blocks carry the driven table.
 for(const z of [-42,42]){
  box(113,2.6,5,'dark',base,'振台線性滑軌','tmd_shaker',0,7,z);
  for(const x of [-49,-17,17,49])bolt(base,x,8.75,z,'tmd_shaker');
  for(const x of [-36,36]){box(13,4.5,9,'steel',table,'滑軌循環軸承塊','tmd_shaker',x,9.5,z);for(const xx of [-4,4])bolt(table,x+xx,12.2,z,'tmd_shaker');}
 }
 box(128,3,98,'paper',table,'振動台面','tmd_shaker',0,14,0);for(const x of [-57,57])for(const z of [-42,42])bolt(table,x,15.95,z,'tmd_shaker');
 box(29,8,20,'cool',base,'線性致動器外殼','tmd_shaker',-38,8,0);ring(5,1.55,1.4,'paper',base,'致動器桿端導向','tmd_shaker',-22.8,9,0,'x');
 const ram=movingCylinder(1.4,20,'steel',table,'致動器推桿','tmd_shaker');box(5,6,10,'dark',table,'振台推桿連接座','tmd_shaker',-4,9,0);cyl(1.1,13,'brass',table,'推桿連接銷','tmd_shaker',-4,9,0,'z');
 box(20,5,13,'paper',base,'振台電源與頻率控制盒','tmd_shaker',-48,7.5,36);for(const x of [-54,-42])cyl(1.2,3,'brass',base,'電源接線柱','tmd_shaker',x,11,31);
 tube([[-54,11,31],[-57,13,23],[-54,12,6],[-50,11,0]],.5,'copper',base,'致動器電源線','tmd_shaker');tube([[-42,11,31],[-35,10,23],[-30,10,14],[-28,10,8]],.5,'dark',base,'致動器回線','tmd_shaker');label('SHAKER',18,5,base,-48,10.15,41,'tmd_shaker',true);
 const flexures=[];
 for(const x of [-43,43])for(const z of [-24,24]){
  const beam=k.flexure(table,'tmd_floor',x,z,137);beam.mesh.position.y=16;flexures.push(beam);
  box(9,4,10,'dark',table,'樓柱下夾座','tmd_floor',x,17,z);box(9,4,10,'dark',floor,'樓柱上夾座','tmd_floor',x,151,z);
  for(const xx of [-3,3]){bolt(table,x+xx,19.5,z,'tmd_floor');bolt(floor,x+xx,153.5,z,'tmd_floor');}
 }
 box(132,5,62,'paper',floor,'等效樓層承重梁','tmd_floor',0,156,0);
 for(let j=0;j<3;j++)box(47,1.5,37,'steel',floor,'可拆等效樓層配重板','tmd_floor',0,159.4+j*1.7,0);
 for(const x of [-20,20])for(const z of [-15,15])bolt(floor,x,164,z,'tmd_floor');label('M = 3 kg',37,7,floor,0,157.4,31.1,'tmd_floor');
 const ball=new THREE.Group();ballAssembly.add(ball);k.add(new THREE.SphereGeometry(13,48,32),'brass',ball,'0.3 kg 等效阻尼球','tmd_ball');
 ring(13.1,12.7,.65,'dark',ball,'球體赤道連接帶','tmd_ball',0,0,0,'y',false);ring(9,7.5,1.1,'paper',ball,'球體上吊環座','tmd_ball',0,10,0);
 box(19,2,24,'paper',ball,'四索共用吊耳承載板','tmd_cables',0,10.8,0);box(6,5,9,'steel',ball,'球體下端阻尼橫樑連接頸','tmd_ball',0,-12.5,0);
 box(15,2,27,'dark',ball,'下方雙阻尼器安裝橫樑','tmd_ball',0,-15.5,0);for(const z of [-10,10])bolt(ball,0,-14,z,'tmd_ball');
 const cables=[];
 for(const x of [-6,6])for(const z of [-9,9]){
  ring(2.6,1.25,2.1,'paper',suspension,'懸索上端眼環','tmd_cables',x,top,z,'z');cyl(1.15,5.2,'brass',suspension,'上眼環固定銷','tmd_cables',x,top,z,'z');
  const eye=ring(2.6,1.25,2.1,'paper',ball,'懸索下端眼環','tmd_cables',x,12,z,'z');cyl(1.15,5.2,'brass',ball,'下眼環固定銷','tmd_cables',x,12,z,'z');
  const cable=movingCylinder(.48,60,'steel',suspension,'等長懸吊鋼索','tmd_cables');cables.push({cable,x,z,eye});
 }
 for(const x of [-6,6]){cyl(2.8,29,'steel',suspension,'懸索調整絞盤軸','tmd_cables',x,149,0,'z');for(const z of [-14,14])ring(4.2,2.7,.8,'paper',suspension,'絞盤擋邊','tmd_cables',x,149,z,'z');for(const z of [-18,18]){box(7,5,5,'dark',suspension,'調諧軸承吊座','tmd_cables',x,151,z);ring(3.4,2.85,3,'paper',suspension,'調諧軸承','tmd_cables',x,149,z,'z');}}
 cyl(3.7,3,'brass',suspension,'調諧手輪','tmd_cables',-6,149,23,'z');
 const anchors=[],dampers=[];
 for(const sign of [-1,1]){
  const stand=box(4,70,7,'steel',floor,'樓層下懸式阻尼支柱','tmd_dampers',sign*60,110,0);anchors.push({stand,sign});
  const collar=box(8,6,12,'paper',hydraulics,'阻尼器固定端夾座','tmd_dampers',sign*60,60,0);cyl(1.1,15,'brass',collar,'固定端橫銷','tmd_dampers',0,0,0,'z');
  const damper=k.damper(hydraulics,'tmd_dampers','水平等效油壓阻尼器');dampers.push({damper,sign,collar});
 }
 box(3,96,3,'steel',floor,'樓層懸掛式尺柱','tmd_frame',64,107,-27);
 const scale=box(8,86,1.4,'paper',floor,'外側樓層／球位移讀值尺','tmd_frame',64,100,-25);for(let j=0;j<16;j++)box(j%4?3:5,.3,.3,'ink',floor,'讀值刻線','tmd_frame',64,61+j*5,-24.1,false);for(const y of [62,139])box(8,2,6,'steel',floor,'刻度尺安裝支架','tmd_frame',60,y,-26);label('SWAY',10,5,floor,63,146,-24,'tmd_frame');
 const lockPin=cyl(1.3,12,'brass',floor,'阻尼球鎖定插銷','tmd_lock',0,146,0);ring(4,1.5,2,'dark',floor,'鎖定插銷座','tmd_lock',0,146,0);
 const springKnob=cyl(3.4,5,'brass',floor,'油壓阻尼調節旋鈕','tmd_dampers',61,145,0);for(let j=0;j<12;j++){const a=j*Math.PI/6;cyl(.2,4.5,'dark',springKnob,'旋鈕滾花','tmd_dampers',Math.cos(a)*3.35,0,Math.sin(a)*3.35,'y',false);}
 const datum=new THREE.Group();table.add(datum);label('LENGTH · TUNING',34,5,datum,36,16.1,43,'tmd_cables',true);
 let current=null;
 function pose(state){const e=k.poseBase(state),p=tmdSample(state),baseX=p.base*S,building=p.x[0]*S,q=p.relative*S,length=p.length*S,rise=length-Math.sqrt(Math.max(1,length*length-q*q)),ballY=top-length+rise-12,restBall=top-length-12;
  table.position.x+=baseX;floor.position.x+=building;suspension.position.x+=building;ballAssembly.position.x+=building;hydraulics.position.x+=building;
  flexures.forEach(b=>b.pose((p.x[0]-p.base)*S));ball.position.set(q,ballY,0);
  for(const c of cables)c.cable.set([c.x,top,c.z],[c.x+q,ballY+12,c.z]);
  for(const a of anchors){const bottom=restBall-16;a.stand.scale.y=(153-bottom)/70;a.stand.position.y=(153+bottom)/2;}
  for(const d of dampers){const y=restBall-16;d.collar.position.y=y;d.damper.pose([d.sign*60,y,0],[q+d.sign*6,ballY-16,0]);}
  ram.set([-22.8-baseX,9,0],[-4,9,0]);lockPin.visible=!!state.tmdLocked;lockPin.scale.y=state.tmdLocked?Math.max(1,(146-(ballY+13))/12):1;lockPin.position.y=(146+ballY+13)/2;
  springKnob.rotation.y=(state.tmdDamping??14)*.1;current={p,q,ballY,length,e};
 }
 function attachmentEvidence(){root.updateMatrixWorld(true);const out=[];for(const c of cables){const a=suspension.localToWorld(new THREE.Vector3(c.x,top,c.z)),b=ball.localToWorld(new THREE.Vector3(c.x,12,c.z));const renderedA=c.cable.mesh.localToWorld(new THREE.Vector3(0,-30,0)),renderedB=c.cable.mesh.localToWorld(new THREE.Vector3(0,30,0));out.push({upperAttachment:renderedA.distanceTo(a),lowerAttachment:renderedB.distanceTo(b),cableLength:a.distanceTo(b)/S,expected:current?.p.length??0,lowerEye:c.eye.getWorldPosition(new THREE.Vector3()).distanceTo(b)});}return out;}
 function clearanceEvidence(){if(!current)return [];return [{ballToSideColumn:41.3-Math.abs(current.q)-13,ballToBase:current.ballY-13-16,damperMinPiston:Math.min(...dampers.map(d=>d.damper.piston)),damperMaxPiston:Math.max(...dampers.map(d=>d.damper.piston))}];}
 return {...k,pose,attachmentEvidence,clearanceEvidence,physicalParts:k.parts.filter(p=>p.physical),pageAnchor(){return root.getWorldPosition(new THREE.Vector3());},crankAngleAt(){return null;}};
}
