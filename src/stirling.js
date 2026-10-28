import * as THREE from './vendor/three.module.js';
import { smooth, clamp } from './model.js';
import { ST_SPEC, stSample, stKinematics } from './stirling-model.js';
import { paperMaterial, inkEdges } from './ink.js';
const TAU=Math.PI*2;
export function createStirling(){
 const root=new THREE.Group(),parts=[],meshes=[],assemblies={},materials={};
 for(const [name,color] of Object.entries({paper:'#e9e3cd',steel:'#cbd1bf',dark:'#97a78d',ink:'#41563c',hot:'#cf9e78',cold:'#a0b8ad',brass:'#d2bb83',ceramic:'#dcd3ba'}))materials[name]=paperMaterial(color,1.0);
 const selected=paperMaterial('#ecd99a',1.2),edge=new THREE.LineBasicMaterial({color:'#3f543b',transparent:true,opacity:.75});
 function group(name,part,move=[0,0,0]){const g=new THREE.Group();g.userData={part,move};root.add(g);assemblies[name]=g;return g;}
 const base=group('base','st_frame'),hot=group('hot','st_hot',[-33,10,0]),cold=group('cold','st_cold',[33,10,0]),shaft=group('shaft','st_flywheel',[0,59,0]),pistons=group('pistons','st_pistons',[0,28,27]),transfer=group('transfer','st_regenerator',[0,12,-43]),heater=group('heater','st_heater',[-15,0,31]),brake=group('brake','st_brake',[28,15,25]);
 function add(geo,mat,parent,name,cat,pos=[0,0,0],physical=true,edges=true){const m=new THREE.Mesh(geo,materials[mat]||mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;m.userData={part:cat||parent.userData.part,name,original:m.material};parent.add(m);parts.push({name,category:m.userData.part,mesh:m,physical});meshes.push(m);if(edges)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),edge));return m;}
 function box(w,h,d,mat,parent,name,cat,x,y,z,physical=true){return add(new THREE.BoxGeometry(w,h,d),mat,parent,name,cat,[x,y,z],physical);}
 function cyl(r,h,mat,parent,name,cat,x,y,z,axis='y',physical=true){const g=new THREE.CylinderGeometry(r,r,h,48);if(axis==='x')g.rotateZ(Math.PI/2);if(axis==='z')g.rotateX(Math.PI/2);return add(g,mat,parent,name,cat,[x,y,z],physical);}
 function ring(ro,ri,h,mat,parent,name,cat,x,y,z,axis='y',physical=true,start=0,length=TAU){
  const shape=new THREE.Shape();shape.absarc(0,0,ro,start,start+length,false);
  if(length<TAU-.01){shape.lineTo(Math.cos(start+length)*ri,Math.sin(start+length)*ri);shape.absarc(0,0,ri,start+length,start,true);shape.closePath();}
  else{const hole=new THREE.Path();hole.absarc(0,0,ri,0,TAU,true);shape.holes.push(hole);}
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:.13,bevelThickness:.12,bevelSegments:2,curveSegments:48});geo.translate(0,0,-h/2);if(axis==='y')geo.rotateX(-Math.PI/2);if(axis==='x')geo.rotateY(Math.PI/2);return add(geo,mat,parent,name,cat,[x,y,z],physical);
 }
 function bolt(g,x,y,z,cat,axis='y'){const m=cyl(.95,.9,'paper',g,'開槽緊固螺栓',cat,x,y,z,axis),slot=box(1.1,.1,.15,'ink',m,'螺栓槽',cat,0,.5,0,false);if(axis==='x'){slot.position.set(.5,0,0);slot.rotation.z=Math.PI/2;}return m;}
 function tube(points,r,mat,g,name,cat,physical=true){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');return add(new THREE.TubeGeometry(curve,48,r,10,false),mat,g,name,cat,[0,0,0],physical,false);}
 function label(str,w,h,g,x,y,z,cat,flat=false){let map=null;if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=768;c.height=192;const cx=c.getContext('2d');cx.fillStyle='#eee7d4';cx.fillRect(0,0,768,192);cx.strokeStyle='#889577';cx.lineWidth=3;cx.strokeRect(6,6,756,180);cx.fillStyle='#40543a';cx.font='400 '+Math.min(108,650/Math.max(1,str.length))+'px "Book Hand",cursive';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(str,384,100);map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;}const m=add(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,color:map?'#fff':'#eee7d4',side:THREE.DoubleSide,toneMapped:false}),g,'手寫銘牌',cat,[x,y,z],false,false);if(flat)m.rotation.x=-Math.PI/2;return m;}
 box(140,4,121,'paper',base,'熱機實驗底板','st_frame',0,2,0);
 for(const x of [-60,60])for(const z of [-49,49]){cyl(3.7,2.8,'dark',base,'軟墊支腳','st_frame',x,-1.4,z);cyl(1.8,.4,'steel',base,'支腳墊片','st_frame',x,4.2,z);bolt(base,x,4.7,z,'st_frame');}
 label('STIRLING · α · 90°',48,8,base,-22,4.15,49,'st_frame',true);
 // Two rigid pedestals hold the one common crankshaft.
 for(const x of [-43,43]){
  box(14,3,17,'dark',base,'軸承座底腳','st_frame',x,6,0);box(6,79,8,'steel',base,'支承立柱','st_frame',x,46.5,0);
  ring(7,2.2,6,'paper',base,'軸承外座','st_frame',x,92,0,'x');ring(5.7,3.7,6.3,'dark',base,'軸承外圈','st_frame',x,92,0,'x',false);ring(3.4,2.1,6.6,'brass',base,'軸承內圈','st_frame',x,92,0,'x',false);
  for(let j=0;j<6;j++){const a=j/6*TAU;cyl(.8,.65,'steel',base,'軸承滾珠','st_frame',x-3.5,92+Math.cos(a)*4.5,Math.sin(a)*4.5,'x',false);}
  for(const z of [-5.5,5.5])bolt(base,x,8,z,'st_frame');
  box(11,2,10,'dark',base,'軸承上壓蓋','st_frame',x,100,0);for(const z of [-3.5,3.5])bolt(base,x,101.5,z,'st_frame');
 }
 const shells=[],frontShells=[],gases=[],pistonGroups=[],rodGroups=[],crankGroups=[];
 for(const [x,g,mat,cat,name] of [[-22,hot,'hot','st_hot','熱'],[22,cold,'cold','st_cold','冷']]){
  cyl(17,3,'dark',g,name+'缸安裝法蘭',cat,x,7,0);cyl(13,13,'steel',g,name+'缸封閉下缸頭',cat,x,15,0);cyl(12,2.5,mat,g,name+'端導熱底板',cat,x,22.6,0);
  for(const z of [-11,11])bolt(g,x,9,z,cat);
  // Opaque half-shells, closed radial section faces. Default opening faces the reader (+Z).
  const back=ring(12,10.22,40,mat,g,name+'缸剖面筒壁',cat,x,44.5,0,'y',true,0,Math.PI);
  const front=ring(12,10.22,40,mat,g,name+'缸可移除前半殼',cat,x,44.5,0,'y',false,Math.PI,Math.PI);frontShells.push(front);shells.push(back);
  ring(14,10.22,3,'paper',g,name+'缸上開口環',cat,x,66,0);for(const z of [-9,9])bolt(g,x,68,z,cat);
  const gasMat=new THREE.MeshBasicMaterial({color:mat==='hot'?'#dfb184':'#adc6bb',transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const gas=add(new THREE.CylinderGeometry(9.8,9.8,1,40),gasMat,g,'工作氣體示意區域',cat,[x,30,0],false,false);gases.push(gas);
  const pg=new THREE.Group();pg.position.x=x;pistons.add(pg);pistonGroups.push(pg);
  cyl(9.95,6,'paper',pg,name+'端動力活塞','st_pistons',0,0,0);for(const y of [-1.9,1.9])ring(10,9.6,.5,'dark',pg,'活塞密封環','st_pistons',0,y,0);
  cyl(2.1,11,'steel',pg,'活塞銷','st_pistons',0,0,0,'x');
  // The upper barrel is open so the connecting rod can swing about the wrist pin.
  ring(2.5,1.4,3,'brass',pg,'桿端小頭襯套','st_pistons',0,0,0,'x');
  const rg=new THREE.Group();shaft.add(rg);rodGroups.push(rg);cyl(1.35,ST_SPEC.rod,'steel',rg,'定長連桿','st_rods',0,0,0);
  for(const y of [-ST_SPEC.rod/2,ST_SPEC.rod/2]){ring(3,1.5,3.8,'brass',rg,'連桿端部軸套','st_rods',0,y,0,'x');bolt(rg,-2.5,y,0,'st_rods','x');}
  const crank=new THREE.Group();crank.position.set(x,92,0);shaft.add(crank);crankGroups.push(crank);
  for(const xx of [-6,6])box(3,ST_SPEC.crank+3,4,'dark',crank,'偏心曲柄臂','st_rods',xx,ST_SPEC.crank/2,0);cyl(1.5,16,'brass',crank,'偏心曲柄銷','st_rods',0,ST_SPEC.crank,0,'x');ring(2.1,1.5,.65,'paper',crank,'曲柄銷卡環','st_rods',-8.2,ST_SPEC.crank,0,'x');
  label(name+'端',14,6,g,x,16,13.2,cat);
 }
 // Crank journals stop at each throw rather than running through its connecting rod.
 for(const [x,len] of [[-43,26],[0,28],[43,26]])cyl(2,len,'steel',shaft,'分段主軸頸','st_flywheel',x,92,0,'x');
 for(const x of [-47,47])ring(3.7,2.05,1.4,'brass',shaft,'曲軸定位環','st_flywheel',x,92,0,'x');
 const wheel=new THREE.Group();wheel.position.set(-57,92,0);shaft.add(wheel);const rim=ring(29,24.2,5,'dark',wheel,'飛輪輪緣','st_flywheel',0,0,0,'x');rim.userData.crank=true;
 cyl(5,8,'brass',wheel,'飛輪輪轂','st_flywheel',0,0,0,'x');box(1.4,2,1.4,'ink',wheel,'飛輪定位鍵','st_flywheel',-4.15,3.5,0);
 for(let j=0;j<6;j++){const a=j/6*TAU,spoke=box(3.3,25,3,'steel',wheel,'飛輪輻條','st_flywheel',0,Math.cos(a)*14,Math.sin(a)*14);spoke.rotation.x=a;spoke.userData.crank=true;}
 cyl(1.6,8,'steel',wheel,'手推起轉銷','st_flywheel',-6,21,0,'x');const grip=cyl(2.8,6,'hot',wheel,'手動起轉握柄','st_flywheel',-10,21,0,'x');grip.userData.crank=true;
 // External electric heater: no combustion inside the sealed working gas.
 ring(17,13.2,10,'hot',heater,'熱端加熱套','st_heater',-22,15,0);cyl(19,3,'ceramic',heater,'陶瓷隔熱座','st_heater',-22,5.7,0);
 for(const x of [-35,-9]){cyl(1.4,4,'brass',heater,'加熱器接線端','st_heater',x,9,21);cyl(2,.6,'dark',heater,'端子帽','st_heater',x,11.2,21);}
 tube([[-35,9,21],[-44,9,31],[-45,7,42]],.55,'dark',heater,'加熱器絕緣導線','st_heater');tube([[-9,9,21],[-6,8,36],[-34,7,42]],.55,'hot',heater,'加熱器回線','st_heater');
 box(20,4,12,'ceramic',heater,'加熱器開關座','st_heater',-40,6.4,42);const heaterLever=box(11,1.3,3,'brass',heater,'加熱開關撥桿','st_heater',-40,9.5,42);label('HEAT',18,6,heater,-40,8.6,50,'st_heater');
 // Cooling fins are integral details of one jacket, not separate parts in the BOM.
 ring(15.7,12.2,28,'cold',cold,'冷卻導熱套','st_cold',22,39,0,'y',true,0,Math.PI);
 for(let j=0;j<8;j++)ring(19,12.05,.8,'cold',cold,'冷卻鰭片','st_cold',22,26+j*3.5,0,'y',false,0,Math.PI);
 // Transfer path joins actual cylinder ports at the closed heads through a rear regenerator.
 tube([[-22,18,-12],[-22,18,-25],[-15,18,-32]],2,'hot',transfer,'熱端連通彎管','st_regenerator');tube([[15,18,-32],[22,18,-25],[22,18,-12]],2,'cold',transfer,'冷端連通彎管','st_regenerator');
 ring(6,4,29,'paper',transfer,'回熱器剖面外殼','st_regenerator',0,18,-32,'x',true,0,Math.PI*1.5);
 for(let j=0;j<7;j++)ring(3.7,1.0,.6,'brass',transfer,'回熱金屬網片','st_regenerator',-10+j*3.3,18,-32,'x',j===0);
 for(const x of [-15,15]){ring(7,2,2.5,'dark',transfer,'回熱器端法蘭','st_regenerator',x,18,-32,'x');ring(3.5,2,3,'brass',transfer,'管路壓緊接頭','st_regenerator',x,18,-32,'x');}
 for(const x of [-9,9]){box(3,11,5,'steel',transfer,'回熱器支架','st_regenerator',x,10,-32);bolt(transfer,x,5.5,-32,'st_regenerator');}
 for(const [x,g,cat] of [[-22,hot,'st_hot'],[22,cold,'st_cold']]){cyl(.7,10,'steel',g,'溫度探針','st_heater',x+7,18,10,'z');ring(1.8,.8,2,'brass',g,'探針密封接頭',cat,x+7,18,11,'z');}
 cyl(2,4,'brass',transfer,'壓力取樣接頭','st_regenerator',0,26,-32);label('回熱器',27,6,transfer,0,25.5,-26,'st_regenerator');
 // A visible adjustable brake receives useful shaft work as heat.
 cyl(8,7,'steel',shaft,'煞車轉鼓','st_brake',56,92,0,'x');const brakePad=box(8,3,9,'hot',brake,'上煞車片','st_brake',56,102.2,0);box(8,3,9,'ceramic',brake,'下煞車片','st_brake',56,81.5,0);
 box(9,3,25,'dark',brake,'負載調整臂','st_brake',56,107,6);box(6,95,5,'steel',brake,'煞車支承柱','st_brake',59,53,-15);box(16,3,21,'dark',brake,'負載支架底腳','st_brake',59,6,-13);
 for(const z of [-20,-7])bolt(brake,59,8,z,'st_brake');cyl(1.3,10,'brass',brake,'煞車調整螺桿','st_brake',56,113,0);const brakeKnob=cyl(5,2,'brass',brake,'負載調整旋鈕','st_brake',56,119,0);
 for(let j=0;j<12;j++){const a=j/12*TAU;box(.45,2.4,.45,'dark',brake,'旋鈕滾花','st_brake',56+Math.cos(a)*4.6,119,Math.sin(a)*4.6,false);}
 label('LOAD',17,6,brake,59,47,4,'st_brake');
 const hotColor=new THREE.Color('#cf9e78'),offColor=new THREE.Color('#b7bba9');
 let highlighted=null;
 function select(cat){highlighted=cat;for(const p of parts)p.mesh.material=cat&&p.category===cat?selected:p.mesh.userData.original;}
 function pose(state){
  const deform=.002+smooth(state.popup??1)*.998,e=smooth(state.explode??0),p=stSample(state),k=stKinematics(state.phase??2);
  root.matrixAutoUpdate=false;root.matrix.set(1,.17*(1-deform),0,99,0,deform,0,2.2,0,-.32*(1-deform),1,-23,0,0,0,1);root.matrixWorldNeedsUpdate=true;
  for(const g of Object.values(assemblies)){const v=g.userData.move;g.position.set(v[0]*e,v[1]*e,v[2]*e);}
  for(let i=0;i<2;i++){const a=i?k.cold:k.hot,x=i?22:-22;pistonGroups[i].position.y=a.y;crankGroups[i].rotation.x=a.a;
   const rod=rodGroups[i];rod.position.set(x,(a.y+a.crankY)/2,a.crankZ/2);rod.rotation.x=Math.atan2(a.crankZ,a.crankY-a.y);
   const gas=gases[i],height=Math.max(.1,a.y-ST_SPEC.pistonHalf-ST_SPEC.floor);gas.scale.y=height;gas.position.y=ST_SPEC.floor+height/2;gas.visible=state.section!==false;
  }
  frontShells.forEach(m=>m.visible=state.section===false);
  wheel.rotation.x=state.phase??2;heaterLever.rotation.z=state.heater===false?-.7:0;
  materials.hot.color.copy(offColor).lerp(hotColor,state.heater===false?.05:clamp(((state.hotC??320)-25)/350,.25,1));
  brakePad.position.y=state.brakeEngaged===false?105.5:101.5;brakeKnob.rotation.y=(state.brake??35)/100*TAU*2;
 }
 const inverse=new THREE.Matrix4(),localRay=new THREE.Ray(),plane=new THREE.Plane(new THREE.Vector3(1,0,0),67),point=new THREE.Vector3();
 function crankAngleAt(ray){root.updateMatrixWorld(true);inverse.copy(shaft.matrixWorld).invert();localRay.copy(ray).applyMatrix4(inverse);const p=localRay.intersectPlane(plane,point);return p?Math.atan2(p.z,p.y-92):null;}
 function pageAnchor(){root.updateMatrixWorld(true);return grip.getWorldPosition(new THREE.Vector3());}
 function attachmentEvidence(){root.updateMatrixWorld(true);const result=[];for(let i=0;i<2;i++){const pin=crankGroups[i].localToWorld(new THREE.Vector3(0,ST_SPEC.crank,0)),tip=rodGroups[i].localToWorld(new THREE.Vector3(0,ST_SPEC.rod/2,0)),wrist=pistonGroups[i].localToWorld(new THREE.Vector3()),foot=rodGroups[i].localToWorld(new THREE.Vector3(0,-ST_SPEC.rod/2,0));result.push({crank:pin.distanceTo(tip),piston:wrist.distanceTo(foot)});}return result;}
 return {root,parts,physicalParts:parts.filter(p=>p.physical),meshes,assemblies,materials,wheel,grip,pose,select,crankAngleAt,pageAnchor,attachmentEvidence,get highlighted(){return highlighted;},dispose(){const geos=new Set(),mats=new Set();root.traverse(m=>{if(m.geometry)geos.add(m.geometry);if(m.material)mats.add(m.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
