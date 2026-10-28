import * as THREE from './vendor/three.module.js';
import { smooth } from './model.js';
import { G_SPEC, govSample } from './governor-model.js';
import { createMachineKit } from './machine-kit.js';
export function createGovernor(){
 const k=createMachineKit(),{root,assembly,add,box,cyl,ring,bolt,tube,label,segment}=k,TAU=Math.PI*2,L=37.5,H=112;
 const base=assembly('base','gov_frame'),frame=assembly('frame','gov_bearings'),drive=assembly('drive','gov_drive',[-30,4,28]),beltGroup=assembly('belt','gov_drive',[0,10,36]),feedback=assembly('feedback','gov_feedback',[35,8,18]);
 const rotor=new THREE.Group();root.add(rotor);const shaft=assembly('shaft','gov_bearings',[0,47,0],rotor),sleeve=assembly('sleeve','gov_sleeve',[0,20,35],rotor);
 k.base(base,'gov_frame','GOVERNOR · FEEDBACK');
 // Journal bearings and a rigid top bridge carry the spindle.
 for(const y of [18,124]){ring(7,2.45,6,'paper',frame,'主軸軸承座','gov_bearings',0,y,0);ring(5.6,3.6,6.3,'dark',frame,'軸承外圈','gov_bearings',0,y,0,'y',false);ring(3.4,2.4,6.6,'brass',frame,'軸承內圈','gov_bearings',0,y,0,'y',false);for(let j=0;j<6;j++){const a=j/6*TAU;cyl(.75,.65,'steel',frame,'軸承滾珠','gov_bearings',Math.cos(a)*4.4,y+3.5,Math.sin(a)*4.4,'y',false);}}
 const clearanceObstacles=[];for(const x of [-42,42]){box(10,3,13,'dark',frame,'立柱安裝腳','gov_bearings',x,6,-26);clearanceObstacles.push(box(3.5,118,5,'steel',frame,'頂橋支柱','gov_bearings',x,66.5,-26));for(const z of [-30,-22])bolt(frame,x,8,z,'gov_bearings');}
 const bs=new THREE.Shape();bs.moveTo(-47,-11);bs.lineTo(47,-11);bs.lineTo(47,32);bs.lineTo(-47,32);bs.closePath();const bh=new THREE.Path();bh.absarc(0,0,7.2,0,TAU,true);bs.holes.push(bh);const bg=new THREE.ExtrudeGeometry(bs,{depth:4,bevelEnabled:false});bg.rotateX(-Math.PI/2);add(bg,'paper',frame,'帶軸承孔的上支承橋','gov_bearings',[0,122,0]);for(const x of [-42,42])bolt(frame,x,126.7,-26,'gov_bearings');ring(10,2.45,10,'steel',frame,'下軸承支承筒','gov_bearings',0,10,0);ring(13,2.45,2,'paper',frame,'下軸承底法蘭','gov_bearings',0,5,0);for(const x of [-10,10])bolt(frame,x,6.7,0,'gov_bearings');
 cyl(2.3,124,'steel',shaft,'精磨調速主軸','gov_bearings',0,71,0);cyl(5,3,'dark',shaft,'上鉸鏈輪轂','gov_links',0,H,0);cyl(1.2,13,'brass',shaft,'上連桿共用銷','gov_links',0,H,0,'z');for(const z of [-7,7])ring(2,1.2,.6,'paper',shaft,'鉸鏈銷卡環','gov_links',0,H,z,'z');
 for(const y of [22,119])ring(3.5,2.35,1.2,'brass',shaft,'主軸定位環','gov_bearings',0,y,0);
 // Equal arms form a rhombus. Both ends of each solid arm are tested in world coordinates.
 const sides=[],links=[];
 for(const sign of [-1,1]){
  const branch=assembly('flyweight'+sign,'gov_balls',[sign*30,17,0],rotor),ball=new THREE.Group();branch.add(ball);
  add(new THREE.SphereGeometry(5,40,24),'brass',ball,'250 g 實心飛球','gov_balls');ring(5.05,4.75,.5,'dark',ball,'飛球接合腰線','gov_balls',0,0,0,'y',false);cyl(1.3,12,'steel',ball,'飛球橫銷','gov_balls',0,0,0,'z');
  for(const z of [-6.4,6.4]){ring(2,1.3,.5,'paper',ball,'球端銷墊圈','gov_balls',0,0,z,'z');bolt(ball,0,0,z+.6,'gov_balls','z');}
  for(const which of ['upper','lower']){
   const link=segment(2.6,1.4,L,'steel',branch,'150 mm '+(which==='upper'?'上':'下')+'連桿','gov_links');
   for(const yy of [-L/2,L/2]){ring(2.35,1.25,2.1,'paper',link.group,'連桿端部襯套','gov_links',0,yy,0,'z');ring(2.55,2.1,.2,'brass',link.group,'連桿端部墊片','gov_links',0,yy,1.2,'z',false);}
   links.push({link,sign,which});
  }sides.push({ball,sign});
 }
 cyl(4.4,11,'dark',sleeve,'旋轉滑動內套筒','gov_sleeve',0,0,0);const weight=ring(5.8,2.4,3,'brass',sleeve,'可換中央配重環','gov_sleeve',0,-5,0);const weightCap=ring(4.7,2.4,1,'paper',sleeve,'配重定位端環','gov_sleeve',0,-7,0);cyl(1.25,13,'steel',sleeve,'下連桿共用銷','gov_sleeve',0,0,0,'z');
 for(const z of [-7,7]){ring(2.1,1.25,.5,'paper',sleeve,'套筒鉸鏈墊片','gov_sleeve',0,0,z,'z');bolt(sleeve,0,0,z+.6,'gov_sleeve','z');}
 const follower=new THREE.Group();feedback.add(follower);
 ring(7.4,5.0,2,'paper',follower,'非旋轉止推外環','gov_feedback',0,-3,0);ring(7.5,6.5,.6,'brass',follower,'止推環滾道','gov_feedback',0,-1.6,0,'y',false);
 for(const z of [-7.5,7.5]){box(17,2.3,2,'steel',follower,'撥叉雙臂','gov_feedback',7.5,-3,z);cyl(1.1,2.7,'brass',follower,'撥叉滑塊銷','gov_feedback',0,-3,z,'z');}
 box(3,2.4,17,'dark',follower,'撥叉連接橫樑','gov_feedback',16,-3,0);
 // A slotted bell crank accepts sleeve translation without demanding an impossible fixed x endpoint.
 box(8,3,18,'paper',feedback,'槓桿支柱底腳','gov_feedback',39,6,10);box(4,53,5,'steel',feedback,'槓桿固定支柱','gov_feedback',39,33,10);cyl(2,8,'brass',feedback,'回授槓桿固定軸','gov_feedback',39,62,13,'z');
 for(const z of [4,16])bolt(feedback,39,8,z,'gov_feedback');
 const lever=new THREE.Group();lever.position.set(39,62,13);feedback.add(lever);
 box(51,2.4,2.4,'dark',lever,'回授雙臂槓桿','gov_feedback',-11.5,0,0);for(const x of [-36,13])cyl(1.2,x>0?13:6,'brass',lever,'槓桿端部銷','gov_feedback',x,0,0,'z');ring(3.2,2,2.8,'paper',lever,'槓桿樞軸襯套','gov_feedback',0,0,0,'z');
 const slot=new THREE.Shape();slot.moveTo(-8,-2.5);slot.lineTo(8,-2.5);slot.lineTo(8,2.5);slot.lineTo(-8,2.5);slot.closePath();const sh=new THREE.Path();sh.moveTo(-6,-.8);sh.lineTo(-6,.8);sh.lineTo(6,.8);sh.lineTo(6,-.8);sh.closePath();slot.holes.push(sh);const sg=new THREE.ExtrudeGeometry(slot,{depth:1,bevelEnabled:false});add(sg,'paper',follower,'撥叉長槽接頭','gov_feedback',[5,-3,12]);
 box(10,32,7,'paper',feedback,'回授電位器外殼','gov_feedback',54,61,13);box(3,25,1.1,'dark',feedback,'可變電阻軌','gov_feedback',54,61,17.2);for(const y of [48,74])bolt(feedback,54,y,17.5,'gov_feedback','z');
 const ws=new THREE.Shape();ws.moveTo(-7,-2.5);ws.lineTo(7,-2.5);ws.lineTo(7,2.5);ws.lineTo(-7,2.5);ws.closePath();const wh=new THREE.Path();wh.moveTo(-5.8,-1.3);wh.lineTo(-5.8,1.3);wh.lineTo(5.8,1.3);wh.lineTo(5.8,-1.3);wh.closePath();ws.holes.push(wh);const wg=new THREE.ExtrudeGeometry(ws,{depth:2.5,bevelEnabled:false});const wiper=add(wg,'brass',feedback,'帶滑槽的電位器滑觸頭','gov_feedback',[54,61,17]);
 for(const y of [50,61,72]){cyl(1.1,3,'brass',feedback,'電位器接線端','gov_feedback',60,y,13,'x');}
 const feedbackWire=tube([[60,72,13],[64,64,23],[60,12,35],[30,10,35],[-20,10,35],[-40,11.5,35]],.55,'copper',feedback,'回授控制導線','gov_feedback');
 // DC drive and unequal pulleys have correctly seated external belt tangents.
 cyl(10,23,'cool',drive,'直立驅動馬達外殼','gov_drive',-48,17,0);cyl(10.7,2,'dark',drive,'馬達前端蓋','gov_drive',-48,29,0);cyl(2,8,'steel',drive,'馬達輸出軸','gov_drive',-48,32,0);box(24,3,24,'paper',drive,'馬達安裝板','gov_drive',-48,6,0);
 for(const x of [-57,-39])for(const z of [-8,8])bolt(drive,x,8,z,'gov_drive');
 const motorPulley=new THREE.Group();motorPulley.position.set(-48,34,0);drive.add(motorPulley);ring(8.5,2.1,4,'dark',motorPulley,'馬達小皮帶輪','gov_drive');for(const y of [-2.2,2.2])ring(9,2.1,.6,'paper',motorPulley,'小皮帶輪擋邊','gov_drive',0,y,0,'y',false);
 const spindlePulley=new THREE.Group();spindlePulley.position.set(0,34,0);shaft.add(spindlePulley);ring(13.5,2.35,4,'dark',spindlePulley,'主軸皮帶輪','gov_drive');for(const y of [-2.2,2.2])ring(14,2.35,.6,'paper',spindlePulley,'主軸皮帶輪擋邊','gov_drive',0,y,0,'y',false);
 const angle=Math.acos((8.5-13.5)/48),points=[];
 for(let j=0;j<=45;j++){const a=angle+(TAU-2*angle)*j/45;points.push([-48+8.5*Math.cos(a),34,8.5*Math.sin(a)]);}
 for(let j=0;j<=45;j++){const a=TAU-angle+2*angle*j/45;points.push([13.5*Math.cos(a),34,13.5*Math.sin(a)]);}points.push(points[0]);tube(points,.65,'rubber',beltGroup,'閉合驅動皮帶','gov_drive');
 box(20,5,12,'paper',drive,'動力與回授開關盒','gov_drive',-45,7.5,35);const switchLever=box(11,1,3,'brass',drive,'動力開關撥桿','gov_drive',-45,11,35);label('DRIVE',18,6,drive,-45,11.1,43,'gov_drive');
 cyl(1.3,3,'brass',drive,'回授控制接線端','gov_drive',-40,11.5,35);
 for(const x of [-51,-39])cyl(1.5,3,'brass',drive,'驅動接線柱','gov_drive',x,9,29);
 tube([[-48,17,9],[-57,15,18],[-51,9,29]],.55,'dark',drive,'馬達絕緣導線','gov_drive');
 // Scale and support columns are outside the full flyweight swept envelope.
 const scaleZero=H-2*L*Math.cos(G_SPEC.thetaMin)-3;
 clearanceObstacles.push(box(10,56,1.2,'paper',frame,'升程刻度板','gov_frame',49,68,-23));
 for(const y of [41,94])clearanceObstacles.push(box(9,2,4,'steel',frame,'刻度尺固定支架','gov_frame',45.5,y,-25));
 for(let j=0;j<=10;j++)box(j%2?3:5,.25,.3,'ink',frame,'升程刻線','gov_frame',49,scaleZero+j*3.5,-22.2,false);
 label('LIFT',10,5,frame,49,100,-22.1,'gov_frame');
 tube([[16,-3,0],[32,-3,-10],[49,-3,-20.9]],.35,'steel',follower,'非旋轉升程指示桿','gov_feedback');box(8,.55,1.2,'brass',follower,'升程讀值指針','gov_feedback',49,-3,-20.9);
 const forceGroup=new THREE.Group();rotor.add(forceGroup);const arrows=[];
 for(const sign of [-1,1]){const arrow=new THREE.ArrowHelper(new THREE.Vector3(-sign,0,0),new THREE.Vector3(),10,0x7b9c8d,2,1);forceGroup.add(arrow);arrows.push({arrow,sign});}
 let lastSleeve=0;
 function pose(state){const e=k.poseBase(state),p=govSample(state),theta=p.theta,r=L*Math.sin(theta),yb=H-L*Math.cos(theta),ys=H-2*L*Math.cos(theta);lastSleeve=ys;rotor.rotation.y=-(state.phase??0);
  sleeve.position.y+=ys;weight.scale.y=(state.govMass??180)/180;weight.position.y=-5-(weight.scale.y-1)*1.5;weightCap.position.y=-7-(weight.scale.y-1)*3;sides.forEach(s=>s.ball.position.set(s.sign*r,yb,0));
  for(const l of links){const z=l.which==='upper'?-2:2,a=l.which==='upper'?[0,H,z]:[0,ys,z],b=[l.sign*r,yb,z];l.link.pose(a,b);}
  follower.position.y=ys;const leverAngle=Math.asin(Math.max(-1,Math.min(1,(62-(ys-3))/36)));lever.rotation.z=leverAngle;wiper.position.y=62+13*Math.sin(leverAngle);
  motorPulley.rotation.y=-(state.phase??0)*13.5/8.5;switchLever.rotation.z=state.govFeedback===false?-.6:0;beltGroup.visible=e<.08;feedbackWire.visible=e<.08;
  forceGroup.visible=state.govVectors!==false&&e<.05;arrows.forEach(({arrow,sign})=>{arrow.position.set(sign*r,yb,7);arrow.setLength(Math.min(15,5+p.centripetal),2,1);});
 }
 function attachmentEvidence(){root.updateMatrixWorld(true);const out=[];for(const l of links){const theta=govSample({govTheta:currentTheta}).theta,r=L*Math.sin(theta),yb=H-L*Math.cos(theta),ys=H-2*L*Math.cos(theta),z=l.which==='upper'?-2:2,a=rotor.localToWorld(new THREE.Vector3(0,l.which==='upper'?H:ys,z)),b=rotor.localToWorld(new THREE.Vector3(l.sign*r,yb,z));out.push({upper:l.link.end(-1).distanceTo(a),ball:l.link.end(1).distanceTo(b)});}return out;}
 function clearanceEvidence(){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),v=new THREE.Vector3(),matrix=new THREE.Matrix4();let sweptRadius=0;
  rotor.traverse(m=>{if(!m.isMesh||!m.geometry?.attributes.position)return;matrix.multiplyMatrices(inverse,m.matrixWorld);const positions=m.geometry.attributes.position;for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(matrix);sweptRadius=Math.max(sweptRadius,Math.hypot(v.x,v.z));}});
  return clearanceObstacles.map(m=>{m.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,m.matrixWorld);const bounds=m.geometry.boundingBox.clone().applyMatrix4(matrix),x=bounds.min.x<=0&&bounds.max.x>=0?0:Math.min(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),z=bounds.min.z<=0&&bounds.max.z>=0?0:Math.min(Math.abs(bounds.min.z),Math.abs(bounds.max.z));return {name:m.userData.name,sweptRadius,radialClearance:Math.hypot(x,z)-sweptRadius};});
 }
 let currentTheta=G_SPEC.thetaMin;const originalPose=pose;function posed(state){currentTheta=state.govTheta??G_SPEC.thetaMin;originalPose(state);}
 return {...k,physicalParts:k.parts.filter(p=>p.physical),pose:posed,attachmentEvidence,clearanceEvidence,pageAnchor(){root.updateMatrixWorld(true);return switchLever.getWorldPosition(new THREE.Vector3());},crankAngleAt(){return null;}};
}
