import * as THREE from './vendor/three.module.js';
import { SUSP_SPEC, VIBRATION_SPEC, suspensionSample } from './vibration-model.js';
import { createVibrationKit } from './vibration-kit.js';
export function createSuspension(){
 const k=createVibrationKit(),{root,assembly,box,cyl,ring,bolt,tube,label}=k,S=SUSP_SPEC.scale,Z=-12;
 const base=assembly('base','sus_frame'),frame=assembly('frame','sus_frame'),body=assembly('body','sus_body',[0,26,0]),wheelAssembly=assembly('wheel','sus_wheel',[-32,8,30]),road=assembly('road','sus_road',[0,4,25]),housing=assembly('housing','sus_damper',[30,0,-20]),rodAssembly=assembly('rod','sus_valves',[0,34,0]),springAssembly=assembly('spring','sus_spring',[-30,21,-18]);
 k.base(base,'sus_frame','SUSPENSION · QUARTER CAR');
 for(const x of [-42,42]){
  box(12,3,15,'dark',frame,'垂直導軌安裝腳','sus_frame',x,6,-25);cyl(2,160,'steel',frame,'垂直導向軸','sus_frame',x,88,-25);for(const z of [-30,-20])bolt(frame,x,8,z,'sus_frame');
  for(const y of [11,164])ring(3.2,2.05,2,'brass',frame,'導向軸止動環','sus_frame',x,y,-25);
  for(const [parent,y,part] of [[body,136,'sus_body'],[wheelAssembly,38,'sus_wheel']]){ring(4,2.08,10,'cool',parent,'移動滑套',''+part,x,y,-25);for(const yy of [-5.6,5.6])ring(4.4,2.1,.8,'paper',parent,'滑套刮塵端環',part,x,y+yy,-25);}
 }
 box(94,4,15,'paper',frame,'固定立架上橫樑','sus_frame',0,171,-25);for(const x of [-42,42])bolt(frame,x,173.5,-25,'sus_frame');
 box(90,8,20,'paper',body,'簧上質量導向橫座','sus_body',0,136,-21);
 for(let j=0;j<4;j++)box(54,2,30,'steel',body,'等效車身配重板','sus_body',0,141+j*2.25,-12);
 for(const x of [-23,23])for(const z of [-24,0])bolt(body,x,149,z,'sus_body');label('mₛ = 250 kg',41,7,body,0,140,4,'sus_body');
 // The upper eye is tangent to its carrying crosshead, below the body mass.
 box(12,5,14,'dark',body,'上端固定叉耳','sus_damper',0,130,Z);ring(3.6,1.45,5,'paper',rodAssembly,'活塞桿上端眼環','sus_damper',0,128,Z,'z');cyl(1.3,17,'brass',body,'上端橫銷','sus_damper',0,128,Z,'z');for(const z of [-21,-3])ring(2,1.3,.6,'brass',body,'上端銷墊圈','sus_damper',0,128,z,'z');
 box(88,7,12,'dark',wheelAssembly,'簧下質量導向橫座','sus_wheel',0,38,-25);box(13,24,12,'paper',wheelAssembly,'輪轂直立承載座','sus_wheel',0,44,-13);
 cyl(2.8,38,'steel',wheelAssembly,'輪轂主軸','sus_wheel',0,38,-1,'z');for(const z of [-20,5]){ring(6,2.9,4,'paper',wheelAssembly,'輪轂軸承','sus_wheel',0,38,z,'z');ring(6.2,5.1,.5,'brass',wheelAssembly,'軸承定位壓環','sus_wheel',0,38,z+2.4,'z');}
 const wheel=new THREE.Group();wheel.position.set(0,38,12);wheelAssembly.add(wheel);
 const staticTireCompression=(SUSP_SPEC.mass+SUSP_SPEC.wheelMass)*VIBRATION_SPEC.gravity/SUSP_SPEC.tireStiffness*S,freeRadius=23+staticTireCompression;
 const tireGeometry=new THREE.TorusGeometry(freeRadius-4.4,4.4,12,112),originalTire=tireGeometry.attributes.position.array.slice();k.add(tireGeometry,'rubber',wheel,'可變形充氣輪胎','sus_wheel',[0,0,0],true,false);
 ring(17.8,14.2,6.5,'paper',wheel,'五輻式輪圈','sus_wheel',0,0,0,'z');cyl(7.5,7,'dark',wheel,'輪圈中心輪轂','sus_wheel',0,0,0,'z');ring(12.4,7.6,1.5,'steel',wheel,'後方制動盤','sus_wheel',0,0,-5.2,'z');
 for(let j=0;j<5;j++){const a=j/5*Math.PI*2,spoke=box(3,12.2,4.4,'steel',wheel,'輪圈鑄造輻條','sus_wheel',Math.cos(a)*11.5,Math.sin(a)*11.5,0,false);spoke.rotation.z=a-Math.PI/2;const x=Math.cos(a)*5.3,y=Math.sin(a)*5.3;ring(1.5,.9,.5,'brass',wheel,'輪螺帽墊圈','sus_wheel',x,y,3.9,'z');bolt(wheel,x,y,4.6,'sus_wheel','z');}
 cyl(3.4,1.8,'paper',wheel,'輪轂防塵蓋','sus_wheel',0,0,5,'z');
 // The real section has wall thickness; the piston has real valve bores.
 const shell=k.halfTube(8.4,7,59,housing,'sus_damper','半剖液壓筒身');shell.position.set(0,53,Z);
 const closed=ring(8.4,7,59,'steel',housing,'筒身完整外殼','sus_damper',0,82.5,Z,'y',false);
 cyl(8.5,2,'paper',housing,'筒身底蓋','sus_damper',0,53,Z);ring(9.3,2.2,2,'paper',housing,'活塞桿導向密封座','sus_damper',0,112,Z);ring(3.4,2.1,2.5,'dark',housing,'活塞桿油封','sus_damper',0,113,Z);ring(4,2.08,.8,'brass',housing,'刮塵環','sus_damper',0,114.4,Z);
 ring(5.1,2.1,4,'paper',housing,'下端安裝眼環','sus_damper',0,53,Z,'z');cyl(2,17,'brass',wheelAssembly,'下端安裝橫銷','sus_damper',0,53,Z,'z');for(const z of [-21,-3])ring(2.6,2.05,.5,'steel',wheelAssembly,'下端銷墊圈','sus_damper',0,53,z,'z');
 const rod=cyl(2,43,'steel',rodAssembly,'鍍層活塞桿','sus_valves',0,106.5,Z);
 const ps=new THREE.Shape();ps.absarc(0,0,6.8,0,Math.PI*2,false);for(let j=0;j<6;j++){const a=j/6*Math.PI*2,hole=new THREE.Path();hole.absarc(Math.cos(a)*4.7,Math.sin(a)*4.7,.75,0,Math.PI*2,true);ps.holes.push(hole);}const centerHole=new THREE.Path();centerHole.absarc(0,0,2.05,0,Math.PI*2,true);ps.holes.push(centerHole);const pg=new THREE.ExtrudeGeometry(ps,{depth:2,bevelEnabled:false,curveSegments:32});pg.rotateX(-Math.PI/2);pg.translate(0,-1,0);const pistonMesh=k.add(pg,'paper',rodAssembly,'六個閥孔的實體活塞','sus_valves',[0,85,Z]);
 ring(6.95,6.75,1,'dark',rodAssembly,'活塞密封帶','sus_valves',0,85,Z);
 for(const y of [83.7,86.3]){ring(5.8,2.15,.35,'brass',rodAssembly,y<85?'壓縮閥片':'回彈閥片','sus_valves',0,y,Z);ring(3.4,2.1,.4,'steel',rodAssembly,'閥片預壓墊圈','sus_valves',0,y+(y<85?-.5:.5),Z);}
 for(const x of [-4,4])for(const z of [-16,-8])bolt(rodAssembly,x,87.2,z,'sus_valves');
 const lowerOil=k.halfTube(6.95,.12,1,housing,'sus_valves','下油室示意','cool',false),upperOil=k.halfTube(6.95,2.05,1,housing,'sus_valves','上油室示意','cool',false);lowerOil.position.set(0,54.1,Z);upperOil.position.set(0,86.2,Z);
 const upperSeat=ring(16,9,2,'paper',springAssembly,'上彈簧座','sus_spring',0,126,Z),lowerSeat=ring(16,9,2,'paper',housing,'下彈簧座','sus_spring',0,59,Z);
 ring(16,2.1,2,'steel',springAssembly,'上彈簧座承載盤','sus_spring',0,128,Z);ring(12,8.3,2,'steel',housing,'筒身焊接彈簧座肩環','sus_spring',0,58,Z);
 ring(16.4,12,.9,'dark',springAssembly,'上彈簧橡膠墊','sus_spring',0,124.7,Z);ring(16.4,12,.9,'dark',housing,'下彈簧橡膠墊','sus_spring',0,60.3,Z);
 const spring=k.coil(13,1.15,8,springAssembly,'sus_spring','連續螺旋避震彈簧');spring.mesh.position.set(0,61.9,Z);cyl(4,8,'rubber',rodAssembly,'回彈緩衝塊','sus_damper',0,119,Z);
 const flows=[];for(const x of [-4.7,4.7])for(const y of [-6,0,6]){const m=k.add(new THREE.ConeGeometry(.75,2.4,12),'brass',housing,'油流方向示意','sus_valves',[x,85+y,Z],false,false);flows.push({m,dy:y});}
 // The road platform has an actual ram and two guide columns below the tire.
 box(75,4,57,'paper',road,'上下起伏路面平台','sus_road',0,13,11);for(const x of [-31,31])for(const z of [-9,31])bolt(road,x,15.5,z,'sus_road');
 cyl(12,4,'cool',base,'路面致動器筒身','sus_road',0,6,11);ring(13,3.1,1,'paper',base,'致動器端法蘭','sus_road',0,8,11);const roadRam=cyl(3,5,'steel',road,'路面致動器柱塞','sus_road',0,10.5,11);
 for(const x of [-27,27]){cyl(1.6,9,'steel',base,'路面導向銷','sus_road',x,8,11);ring(3.1,1.7,3,'paper',road,'路面導向滑套','sus_road',x,11,11);}
 box(18,5,13,'paper',base,'路面驅動控制盒','sus_road',-49,7.5,33);for(const x of [-54,-44])cyl(1.2,3,'brass',base,'驅動接線柱','sus_road',x,11,29);
 tube([[-54,11,29],[-54,13,19],[-31,11,6],[-11,7,11]],.45,'copper',base,'路面驅動電源線','sus_road');tube([[-44,11,29],[-37,10,22],[-25,8,19],[-10,7,15]],.45,'dark',base,'路面驅動回線','sus_road');label('ROAD',17,5,base,-49,10.1,38,'sus_road',true);
 box(8,93,1.2,'paper',wheelAssembly,'外側懸吊行程尺','sus_frame',52,99,-24);for(let j=0;j<17;j++)box(j%4?3:5,.25,.3,'ink',wheelAssembly,'行程尺刻線','sus_frame',52,60+j*5,-23.2,false);for(const y of [60,143])box(12,2,7,'steel',wheelAssembly,'行程尺固定支架','sus_frame',48,y,-25);label('TRAVEL',11,5,wheelAssembly,51,151,-23,'sus_frame');
 box(3,106,3,'steel',wheelAssembly,'輪架基準尺支柱','sus_frame',52,91,-27);box(15,3,7,'paper',wheelAssembly,'尺柱下端連接腳','sus_frame',46,39,-26);
 const pointer=box(8,.6,1.2,'brass',rodAssembly,'活塞桿行程指針','sus_frame',51,99,-21.8);tube([[25,132,-21],[33,132,-21],[49,128,-21],[51,99,-21.8]],.35,'steel',rodAssembly,'行程指示桿','sus_frame');
 const knob=cyl(3,3.2,'brass',housing,'阻尼調節旋鈕','sus_damper',10.2,57,Z,'x');cyl(1.2,4,'steel',housing,'阻尼調節閥軸','sus_damper',8.5,57,Z,'x');
 let lastP=null;
 function pose(state){const e=k.poseBase(state),p=suspensionSample(state),sy=p.x[0]*S,uy=p.x[1]*S,ry=p.base*S,relative=sy-uy,piston=85+relative;
  body.position.y+=sy;rodAssembly.position.y+=sy;springAssembly.position.y+=sy;wheelAssembly.position.y+=uy;housing.position.y+=uy;road.position.y+=ry;
  shell.visible=state.suspSection!==false;closed.visible=state.suspSection===false;lowerOil.visible=upperOil.visible=state.suspSection!==false;
  lowerOil.scale.y=Math.max(.1,piston-1.2-54.1);upperOil.position.y=piston+1.2;upperOil.scale.y=Math.max(.1,111.2-piston-1.2);
  spring.mesh.position.y=61.9-relative;spring.pose(61.2+relative);
  const positions=tireGeometry.attributes.position,minY=(15+ry-(38+uy))*(1-e)-freeRadius*e;
  for(let i=0;i<positions.count;i++){positions.setXYZ(i,originalTire[i*3],Math.max(originalTire[i*3+1],minY),originalTire[i*3+2]);}positions.needsUpdate=true;tireGeometry.computeVertexNormals();tireGeometry.computeBoundingSphere();
  flows.forEach(({m,dy})=>{m.visible=state.suspSection!==false&&Math.abs(p.relativeVelocity)>.002&&e<.05;m.position.y=Math.max(57,Math.min(109,piston+dy));m.rotation.z=p.relativeVelocity<0?Math.PI:0;});knob.rotation.x=(state.suspDamping??1800)/500;
  lastP={p,relative,piston,minY,sy,uy,ry};
 }
 function attachmentEvidence(){root.updateMatrixWorld(true);if(!lastP)return [];const pistonLocal=housing.worldToLocal(pistonMesh.getWorldPosition(new THREE.Vector3())),positions=tireGeometry.attributes.position;let tireMin=Infinity;for(let i=0;i<positions.count;i++)tireMin=Math.min(tireMin,positions.getY(i));return [{pistonWithinBore:Math.min(pistonLocal.y-54,111-pistonLocal.y),rodThroughGland:128+lastP.relative-115,springLength:61.2+lastP.relative,springTurnGap:(61.2+lastP.relative)/8-2.3,tireContact:Math.abs(tireMin+38+lastP.uy-(15+lastP.ry))}];}

 return {...k,pose,attachmentEvidence,physicalParts:k.parts.filter(p=>p.physical),pageAnchor(){return root.getWorldPosition(new THREE.Vector3());},crankAngleAt(){return null;}};
}
