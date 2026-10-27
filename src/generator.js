import * as THREE from './vendor/three.module.js';
import { SPEC, sample, smooth, gearProfile, clamp } from './model.js';
import { paperMaterial, inkEdges } from './ink.js';
const TAU = Math.PI * 2;
export function createGenerator() {
 const poleFaces=[];
 const root=new THREE.Group(), parts=[], meshes=[], assemblies={}, materials={};
 for(const [key,color] of Object.entries({paper:'#e7e5d5',steel:'#d4d9ca',dark:'#9eab93',ink:'#45583e',copper:'#c9a477',north:'#c7a18f',south:'#9dafae',rubber:'#839077',gold:'#d4bd81'}))materials[key]=paperMaterial(color,1.15);
 const selectedMaterial=paperMaterial('#e5d7a4',1.1), edgeMaterial=new THREE.LineBasicMaterial({color:'#30442e',transparent:true,opacity:.78});
 function assembly(name,category,move=[0,0,0]){const g=new THREE.Group();g.userData={part:category,move};root.add(g);assemblies[name]=g;return g;}
 const base=assembly('base','base'), left=assembly('north','magnets',[-41,8,0]),right=assembly('south','magnets',[41,8,0]);
 const support=assembly('support','bearing'),rotor=assembly('rotor','coil',[0,78,0]), drive=assembly('drive','gears',[0,0,38]);
 const brushes=assembly('brushes','rings',[0,25,-38]),circuit=assembly('circuit','lamp'),meter=assembly('meter','meter');
 meter.userData.rest=[0,0,43];
 const spin=new THREE.Group();spin.position.y=57;rotor.add(spin);
 const crank=new THREE.Group();crank.position.set(0,27,45);drive.add(crank);
 function add(geo,mat,parent,name,category,pos=[0,0,0],physical=true,edges=true){
  const m=new THREE.Mesh(geo,materials[mat]||mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;m.userData={part:category||parent.userData.part,name,original:m.material};parent.add(m);
  parts.push({name,category:m.userData.part,mesh:m,physical});meshes.push(m);
  if(edges){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),edgeMaterial);m.add(l);}return m;
 }
 function box(w,h,d,mat,parent,name,cat,x,y,z,physical=true){return add(new THREE.BoxGeometry(w,h,d),mat,parent,name,cat,[x,y,z],physical);}
 function cyl(r,h,mat,parent,name,cat,x,y,z,axis='y',physical=true){const g=new THREE.CylinderGeometry(r,r,h,40);if(axis==='z')g.rotateX(Math.PI/2);if(axis==='x')g.rotateZ(Math.PI/2);return add(g,mat,parent,name,cat,[x,y,z],physical);}
 function annulus(ro,ri,h,mat,parent,name,cat,x,y,z,physical=true){const shape=new THREE.Shape();shape.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();hole.absarc(0,0,ri,0,TAU,true);shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:2,curveSegments:48});geo.translate(0,0,-h/2);return add(geo,mat,parent,name,cat,[x,y,z],physical);}
 function bolt(parent,x,y,z,cat,axis='y'){const b=cyl(1.05,.9,'paper',parent,'帶槽緊固螺栓',cat,x,y,z,axis);const slot=box(1.2,.09,.16,'ink',b,'螺帽槽',cat,0,.47,0,false);if(axis==='z'){slot.position.set(0,0,.47);slot.rotation.x=Math.PI/2;}return b;}
 function tube(points,r,mat,parent,name,cat,physical=true){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');return add(new THREE.TubeGeometry(curve,Math.max(32,points.length*10),r,8,false),mat,parent,name,cat,[0,0,0],physical,false);}
 function label(text,w,h,parent,x,y,z,cat,rotation=0){
  let mat=new THREE.MeshBasicMaterial({color:'#f0ead8',toneMapped:false});
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#e9e6d3';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#788367';ctx.lineWidth=3;ctx.strokeRect(12,12,488,232);ctx.fillStyle='#3e5139';ctx.font='400 '+(text.length===1?180:text.length<=5?90:text.length>10?31:58)+'px "Book Hand",cursive';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,130);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;mat=new THREE.MeshBasicMaterial({map:t,toneMapped:false});}
  const m=add(new THREE.PlaneGeometry(w,h),mat,parent,'手寫銘牌',cat,[x,y,z],false,false);m.rotation.x=rotation;return m;
 }
 box(136,4,123,'paper',base,'絕緣實驗底板','base',0,2,0);
 for(const x of [-59,59])for(const z of [-51,51]){cyl(4.2,2.8,'rubber',base,'防滑支腳','base',x,-1.4,z);cyl(2,.4,'steel',base,'底板墊圈','base',x,4.25,z);bolt(base,x,4.65,z,'base');}
 for(const x of [-17,17]){box(4,3,86,'steel',base,'軸承安裝導軌','base',x,5.5,-5);for(const z of [-40,34])bolt(base,x,7.4,z,'base');}
 label('AC GENERATOR · 80 cm²',44,9,base,-36,4.1,49,'base',-Math.PI/2);
 for(const [g,x,mat,mark] of [[left,-38,'north','N'],[right,38,'south','S']]){
  box(17,3,55,'dark',g,'磁極安裝足','magnets',x,5.8,-3);
  box(7,47,48,'steel',g,'磁極支承柱','magnets',x+(x<0?-7:7),30,-3);
  box(11,44,47,mat,g,'永久磁鐵','magnets',x,55,-3);
  box(5,47,50,'paper',g,'磁極靴','magnets',x+(x<0?6.5:-6.5),55,-3);
  for(const z of [-24,18]){box(16,2.8,3,'dark',g,'磁極固定壓條','magnets',x,78.3,z);bolt(g,x,80,z,'magnets');bolt(g,x,8,z,'magnets');}
  poleFaces.push(label(mark,13,14,g,x,58,21,'magnets'));
  label(mark,8,10,g,x,78,0,'magnets',-Math.PI/2).userData.poleTop=true;

 }
 for(const z of [-34,34]){
  box(22,3,13,'steel',support,'軸承座底腳','bearing',0,8,z);
  box(12,42,10,'paper',support,'軸承座立柱','bearing',0,30,z);
  annulus(10,3.15,9,'steel',support,'滾動軸承座','bearing',0,57,z);
  annulus(8.2,5.5,.7,'dark',support,'軸承外圈端面','bearing',0,57,z+4.8,false);
  annulus(5.35,3.1,1.2,'paper',support,'軸承內圈端面','bearing',0,57,z+5,false);
  for(const x of [-8,8])for(const zz of [-4,4])bolt(support,x,10,z+zz,'bearing');
 }
 cyl(3,103,'steel',spin,'發電機主軸','bearing',0,0,-4,'z');
 for(const z of [-28,28])annulus(4.3,3.05,1,'dark',spin,'軸肩定位環','bearing',0,0,z);
 for(const y of [-19.3,19.3])box(3,2.3,49,'paper',spin,'線圈骨架長邊','coil',0,y,0);
 for(const z of [-23.5,23.5])box(3,37,2.3,'paper',spin,'線圈骨架短邊','coil',0,0,z);
 // The visible bundle stands for the chosen electrical turn count; it is one winding component.
 for(let n=0;n<10;n++){
  const x=-2.7+n*.6,points=[];const shape=new THREE.Shape();const y=-20,z=-25,r=3;
  shape.moveTo(y+r,z);shape.lineTo(-y-r,z);shape.quadraticCurveTo(-y,z,-y,z+r);shape.lineTo(-y,-z-r);shape.quadraticCurveTo(-y,-z,-y-r,-z);shape.lineTo(y+r,-z);shape.quadraticCurveTo(y,-z,y,-z-r);shape.lineTo(y,z+r);shape.quadraticCurveTo(y,z,y+r,z);
  shape.getPoints(7).forEach(p=>points.push([x,p.x,p.y]));
  const m=tube(points,.31,'copper',spin,'多匝線圈導線束','coil',n===0);m.userData.winding=true;
 }
 for(const [z,x] of [[-44,-7],[-50,7]]){
  cyl(5.8,4,'rubber',spin,'集電環絕緣套','rings',0,0,z,'z');annulus(7.3,5.8,2.6,'copper',spin,'完整集電環','rings',0,0,z);
  tube([[x<0?-2.7:2.7,-17,-25],[x,-17,-33],[x,0,z]],.35,'copper',spin,'線圈至集電環引線','rings');
 }
 const pinionShape=new THREE.Shape();gearProfile(20,.75).forEach(([x,y],i)=>i?pinionShape.lineTo(x,y):pinionShape.moveTo(x,y));pinionShape.closePath();const ph=new THREE.Path();ph.absarc(0,0,3.05,0,TAU,true);pinionShape.holes.push(ph);
 const pg=new THREE.ExtrudeGeometry(pinionShape,{depth:4,bevelEnabled:true,bevelSize:.09,bevelThickness:.09,bevelSegments:2,curveSegments:48});pg.translate(0,0,-2);
 const pinion=add(pg,'gold',spin,'20 齒轉軸小齒輪','gears',[0,0,45]);
 const gs=new THREE.Shape();gearProfile(60,.75).forEach(([x,y],i)=>i?gs.lineTo(x,y):gs.moveTo(x,y));gs.closePath();
 for(let j=0;j<7;j++){const h=new THREE.Path(),a=(j-1)*TAU/6;h.absarc(j?Math.cos(a)*13.6:0,j?Math.sin(a)*13.6:0,j?4.2:2.5,0,TAU,true);gs.holes.push(h);}
 const gg=new THREE.ExtrudeGeometry(gs,{depth:4,bevelEnabled:true,bevelSize:.15,bevelThickness:.12,bevelSegments:2,curveSegments:32});gg.translate(0,0,-2);
 pinion.rotation.z=Math.PI/20;
 const crankGear=add(gg,'paper',crank,'60 齒手搖大齒輪','gears');
 cyl(3,21,'steel',crank,'搖柄輸入軸','gears',0,0,0,'z');
 annulus(5,2.9,3,'dark',crank,'搖柄輪轂','gears',0,0,8);
 const arm=box(4,19,2.2,'steel',crank,'手搖曲柄臂','gears',0,-8,11);arm.userData.crank=true;
 cyl(2,12,'steel',crank,'把手銷軸','gears',0,-17,18,'z');
 const grip=cyl(3,10,'copper',crank,'可握持手搖把手','gears',0,-17,23,'z');grip.userData.crank=true;crankGear.userData.crank=true;
 bolt(crank,0,0,13,'gears','z');
 // A fixed brush bridge reaches the ring surfaces from above, with separate springs.
 for(const x of [-14,14]){box(3,69,5,'dark',brushes,'電刷橋支柱','rings',x,42,-47);bolt(brushes,x,8,-47,'rings');}
 box(31,3,12,'paper',brushes,'電刷固定橋','rings',0,78,-47);
 for(const z of [-44,-50]){
  box(4,8,3.5,'steel',brushes,'碳刷導向座','rings',0,70,z);box(3,4,2.4,'ink',brushes,'滑動碳刷','rings',0,65.5,z);
  const pp=[];for(let i=0;i<=70;i++){const a=i/70*TAU*7;pp.push([Math.cos(a)*1.25,68+i/70*7,z+Math.sin(a)*1.25]);}tube(pp,.22,'steel',brushes,'電刷壓緊彈簧','rings');
  bolt(brushes,0,80,z,'rings');
 }
 // Actual electrical terminals and wires are attached to the stationary brush bridge and base.
 for(const [x,z] of [[38,38],[54,38],[-43,31],[-55,31]]){cyl(1.7,3,'gold',circuit,'接線柱','lamp',x,7,z);cyl(2.4,.7,'dark',circuit,'接線柱螺帽','lamp',x,8.8,z);}
 const wires=[];
 wires.push(tube([[2,77,-44],[19,75,-43],[26,18,-19],[38,8,38]],.7,'dark',circuit,'負載絕緣導線','lamp'));
 wires.push(tube([[-2,77,-50],[-25,66,-53],[-57,12,-20],[-55,8,31]],.7,'copper',circuit,'回路絕緣導線','lamp'));
 tube([[-43,8,31],[-26,7.8,47],[54,7.8,38]],.65,'dark',circuit,'開關至燈座導線','lamp');
 box(23,3,21,'dark',circuit,'燈座底板','lamp',46,6,26);cyl(8,6,'paper',circuit,'燈泡絕緣座','lamp',46,10,26);cyl(5.4,5,'gold',circuit,'螺口燈頭','lamp',46,15.5,26);
 for(let j=0;j<4;j++){const g=new THREE.TorusGeometry(5.45,.18,4,40);g.rotateX(Math.PI/2);add(g,'ink',circuit,'燈頭螺紋','lamp',[46,14+j,26],false,false);}
 const bulbMat=paperMaterial('#e7e3c8',1.5);materials.bulb=bulbMat;
 const bulb=add(new THREE.SphereGeometry(9,40,28),bulbMat,circuit,'磨砂燈泡外殼','lamp',[46,26,26]);bulb.scale.set(1,1.2,1);
 const auraMaterial=new THREE.SpriteMaterial({color:'#ffd15b',transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const poolMaterial=new THREE.MeshBasicMaterial({color:'#ffce42',transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,9,64,64,64);g.addColorStop(0,'rgba(255,239,166,.85)');g.addColorStop(.35,'rgba(255,217,89,.55)');g.addColorStop(.72,'rgba(255,218,114,.18)');g.addColorStop(1,'rgba(255,230,170,0)');cx.fillStyle=g;cx.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;auraMaterial.map=t;poolMaterial.map=t;
 }
 const aura=new THREE.Sprite(auraMaterial);aura.position.set(46,26,26);aura.scale.set(40,46,1);circuit.add(aura);
 const pool=new THREE.Mesh(new THREE.CircleGeometry(19,48),poolMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(46,4.15,26);circuit.add(pool);
 const rayPoints=[];for(let j=0;j<10;j++){const a=j/10*Math.PI*2;rayPoints.push(new THREE.Vector3(46+Math.cos(a)*13,26+Math.sin(a)*15,27),new THREE.Vector3(46+Math.cos(a)*(16+(j%2)),26+Math.sin(a)*19,27));}
 const raysMaterial=new THREE.LineBasicMaterial({color:'#cfa128',transparent:true,opacity:0});circuit.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rayPoints),raysMaterial));
 const offBulb=new THREE.Color('#d4d7c0'),onBulb=new THREE.Color('#ffe359');
 label('22 Ω',11,6,circuit,46,8,37,'lamp');
 box(19,3,11,'paper',circuit,'負載開關底板','lamp',-49,6.4,31);for(const x of [-55,-43])bolt(circuit,x,8.5,31,'lamp');
 const switchLever=box(13,1.1,2,'copper',circuit,'閘刀開關','lamp',-49,9,31);
 // Voltmeter on a sloped physical case, separate from the reader UI.
 box(26,15,15,'steel',meter,'電表外殼','meter',-44,14,3);
 const dialMaterial=new THREE.MeshBasicMaterial({color:'#f0ead8',toneMapped:false});
 const dial=add(new THREE.CircleGeometry(10.7,64),dialMaterial,meter,'電表刻度面','meter',[-44,16,10.7],false,false);
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=c.height=512;const cx=c.getContext('2d');cx.fillStyle='#eee9d5';cx.fillRect(0,0,512,512);cx.strokeStyle='#4f6144';cx.fillStyle='#3d5035';cx.lineWidth=3;
  for(let i=0;i<=12;i++){const a=Math.PI*1.5-1.05+i/12*2.1,x=256+Math.cos(a)*190,y=256+Math.sin(a)*190;cx.beginPath();cx.moveTo(x,y);cx.lineTo(256+Math.cos(a)*(i%3?175:162),256+Math.sin(a)*(i%3?175:162));cx.stroke();}
  cx.font='40px "Book Hand",cursive';cx.textAlign='center';cx.fillText('−15     0     +15',256,186);cx.font='55px "Book Hand",cursive';cx.fillText('ε / V',256,365);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;dialMaterial.map=t;dialMaterial.needsUpdate=true;
 }
 const bezel=add(new THREE.TorusGeometry(10.9,.65,8,64),'dark',meter,'電表壓圈','meter',[-44,16,10.9]);
 const needlePivot=new THREE.Group();needlePivot.position.set(-44,16,11.6);meter.add(needlePivot);
 box(.5,9.5,.18,'ink',needlePivot,'電表指針','meter',0,4.1,0);cyl(1.1,.6,'gold',needlePivot,'指針軸帽','meter',0,0,0,'z');
 for(const x of [-55, -33])for(const y of [8,22])bolt(meter,x,y,11,'meter','z');
 const fieldGroup=new THREE.Group();root.add(fieldGroup);
 const fieldMat=new THREE.LineDashedMaterial({color:'#7f9991',transparent:true,opacity:.5,dashSize:2,gapSize:1.5});
 for(const y of [44,57,70])for(const z of [-17,0,17]){const pts=[new THREE.Vector3(-29,y,z),new THREE.Vector3(29,y,z)];const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),fieldMat);l.computeLineDistances();fieldGroup.add(l);const arrow=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(11,y-1.6,z),new THREE.Vector3(14,y,z),new THREE.Vector3(11,y+1.6,z)]),fieldMat);arrow.computeLineDistances();fieldGroup.add(arrow);}
 const poleFaceMaterials=poleFaces.map(m=>m.material);
 wires.forEach(m=>{const original=m.material;m.material=original.clone();m.material.onBeforeCompile=original.onBeforeCompile;m.material.customProgramCacheKey=original.customProgramCacheKey;m.material.transparent=true;m.userData.original=m.material;});
 let highlighted=null,light=0;
 function select(category){highlighted=category;for(const p of parts)p.mesh.material=category&&p.category===category?selectedMaterial:p.mesh.userData.original;}
 function pose(state){
  const {popup=1,explode=0,phase=0}=state,deform=.002+smooth(popup)*.998,e=smooth(explode);
  root.matrixAutoUpdate=false;root.matrix.set(1,.17*(1-deform),0,99,0,deform,0,2.2,0,-.32*(1-deform),1,-23,0,0,0,1);root.matrixWorldNeedsUpdate=true;
  for(const g of Object.values(assemblies)){const move=g.userData.move,rest=g.userData.rest||[0,0,0];g.position.set(rest[0]+move[0]*e,rest[1]+move[1]*e,rest[2]+move[2]*e);}
  spin.rotation.z=phase;crank.rotation.z=-phase/SPEC.gearRatio;
  const p=sample(state);needlePivot.rotation.z=-clamp(p.emf/15,-1,1)*1.05;
  light+=((1-Math.exp(-p.loadPower/.24))-light)*.16;bulbMat.color.copy(offBulb).lerp(onBulb,light);auraMaterial.opacity=light*.7;poolMaterial.opacity=light*.55;raysMaterial.opacity=light*.9;
  switchLever.rotation.z=state.load===false?-.7:0;
  fieldGroup.visible=state.showField!==false&&e<.5;fieldMat.opacity=(.18+.45*(state.field??.45)/.9)*(1-smooth(e/.5));
  fieldGroup.scale.x=state.polarity===-1?-1:1;
  poleFaces.forEach((m,i)=>m.material=poleFaceMaterials[state.polarity===-1?1-i:i]);
  left.traverse(m=>{if(m.userData.poleTop)m.material=poleFaceMaterials[state.polarity===-1?1:0];});
  right.traverse(m=>{if(m.userData.poleTop)m.material=poleFaceMaterials[state.polarity===-1?0:1];});
  materials.north.color.set(state.polarity===-1?'#9dafae':'#c7a18f');materials.south.color.set(state.polarity===-1?'#c7a18f':'#9dafae');
  wires.forEach(m=>{m.visible=e<.1;m.material.opacity=1-smooth(e/.1);});
 }
 const inverse=new THREE.Matrix4(),localRay=new THREE.Ray(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-68),point=new THREE.Vector3();
 function crankAngleAt(ray){root.updateMatrixWorld(true);inverse.copy(drive.matrixWorld).invert();localRay.copy(ray).applyMatrix4(inverse);const p=localRay.intersectPlane(plane,point);return p?Math.atan2(p.y-27,p.x):null;}
 function pageAnchor(){root.updateMatrixWorld(true);return grip.getWorldPosition(new THREE.Vector3());}
 return {root,parts,physicalParts:parts.filter(p=>p.physical),meshes,assemblies,spin,crank,grip,pinion,crankGear,materials,pose,select,crankAngleAt,pageAnchor,get highlighted(){return highlighted;},dispose(){const geos=new Set(),mats=new Set();root.traverse(m=>{if(m.geometry)geos.add(m.geometry);if(m.material)mats.add(m.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
