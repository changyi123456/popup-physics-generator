import * as THREE from './vendor/three.module.js';
import { SP_SPEC, speakerSample } from './devices-model.js';
import { createDeviceKit } from './device-kit.js';
export function createSpeaker(){
 const k=createDeviceKit(),{root,assembly,box,cyl,ring,bolt,tube,label}=k,CY=79;
 const base=assembly('base','sp_frame'),basket=assembly('basket','sp_frame',[0,0,-13]),motor=assembly('motor','sp_magnet',[0,0,-42]),voice=assembly('voice','sp_coil',[0,8,22]),cone=assembly('cone','sp_cone',[0,10,45]),suspension=assembly('suspension','sp_suspension',[0,10,45]),signal=assembly('signal','sp_signal',[-20,0,8]);
 for(const a of [basket,motor,voice,cone,suspension])a.userData.rest=[0,CY,0];
 k.base(base,'sp_frame','MOVING COIL · SPEAKER');
 for(const x of [-33,33]){box(15,3,32,'dark',base,'喇叭立架底腳','sp_frame',x,6,-1);for(const z of [-12,10])bolt(base,x,8,z,'sp_frame');box(5,70,8,'steel',base,'側立架支柱','sp_frame',x,42,-3);ring(5,1.8,4,'paper',base,'支架轉軸襯套','sp_frame',x,79,-3,'x');cyl(1.7,9,'brass',base,'支架定位橫銷','sp_frame',x,79,-3,'x');ring(3.8,1.75,.7,'dark',base,'定位銷墊圈','sp_frame',x+Math.sign(x)*4.8,79,-3,'x');}
 for(const x of [-29,29])box(14,8,8,'steel',basket,'盆架側轉軸安裝耳','sp_frame',x,0,-3);
 ring(44.5,39.8,3,'paper',basket,'盆架前法蘭','sp_frame',0,0,25,'z');ring(26,20,3,'steel',basket,'盆架後承環','sp_frame',0,0,-3,'z');
 for(let j=0;j<6;j++){const a=j*Math.PI/3,x=Math.sin(a),y=Math.cos(a),strut=k.segment(4,3,Math.hypot(18,27),'steel',basket,'壓鑄盆架支臂','sp_frame');strut.pose([24*x,24*y,-2],[42*x,42*y,25]);}
 for(let j=0;j<8;j++){const a=j*Math.PI/4;ring(2.2,.95,.6,'dark',basket,'前框螺栓墊圈','sp_frame',Math.sin(a)*42.2,Math.cos(a)*42.2,27,'z');bolt(basket,Math.sin(a)*42.2,Math.cos(a)*42.2,27.8,'sp_frame','z');}
 function ringSection(ro,ri,h,material,parent,name,part,z){const cut=k.profile([[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]],material,parent,name,part,{start:Math.PI*5/3,angle:Math.PI*4/3,pos:[0,0,z]}),full=ring(ro,ri,h,material,parent,name+'完整環',part,0,0,z,'z',false);return {cut,full,set(value){cut.visible=value;full.visible=!value;}};}
 const magnet=ringSection(23,10.8,19,'dark',motor,'環形永久磁鐵','sp_magnet',-17.5),top=ringSection(24,11,5,'steel',motor,'磁路上極板','sp_magnet',-5.5),back=ringSection(25,3.2,4,'steel',motor,'磁路背板','sp_magnet',-29);cyl(8.5,29,'steel',motor,'中央導磁極柱','sp_magnet',0,0,-15.5,'z');ring(3.1,1.4,2,'paper',motor,'極柱通氣孔座','sp_magnet',0,0,-32,'z');
 const cutFasteners=[];for(const x of [-17,17])for(const y of [-13,13]){const fastener=bolt(motor,x,y,-31.5,'sp_magnet','z');if(x<0&&y>0)cutFasteners.push(fastener);const washer=ring(1.8,.9,.5,'brass',motor,'磁路背板墊圈','sp_magnet',x,y,-31,'z');if(x<0&&y>0)cutFasteners.push(washer);}
 ring(10.2,9.5,1.2,'paper',voice,'音圈振膜膠接頸圈','sp_coil',0,0,4.5,'z');ring(9.55,9.15,28,'paper',voice,'輕質音圈骨架','sp_coil',0,0,-3.5,'z');ring(10.2,9.55,20,'copper',voice,'音圈繞組','sp_coil',0,0,-5.5,'z');for(let j=0;j<25;j++)ring(10.24,10.15,.18,'dark',voice,'音圈線匝','sp_coil',0,0,-15.2+j*.8,'z',false);
 const coneShape=[[10,4],[36,24],[36,24.7],[10,4.7],[10,4]],partial=k.profile(coneShape,'paper',cone,'紙質錐形振膜剖面','sp_cone',{start:Math.PI*5/3,angle:Math.PI*4/3}),full=k.profile(coneShape,'paper',cone,'完整錐形振膜','sp_cone',{physical:false});
 const dust=k.profile([[0,14],[4,13.5],[8,10.8],[10,5],[10,4.6],[8,10],[4,12.8],[0,13.3]],'paper',cone,'防塵帽','sp_cone',{start:Math.PI*5/3,angle:Math.PI*4/3}),dustFull=k.profile([[0,14],[4,13.5],[8,10.8],[10,5],[10,4.6],[8,10],[4,12.8],[0,13.3]],'paper',cone,'完整防塵帽','sp_cone',{physical:false});
 const surround=k.radialSurface(36,42,suspension,'sp_suspension','外緣懸邊',0,Math.PI*5/3,Math.PI*4/3),spider=k.radialSurface(10,24,suspension,'sp_suspension','彈波定位懸吊',6,Math.PI*5/3,Math.PI*4/3);
 const fullSurround=k.radialSurface(36,42,suspension,'sp_suspension','完整外緣懸邊',0,0,Math.PI*2,false),fullSpider=k.radialSurface(10,24,suspension,'sp_suspension','完整彈波',6,0,Math.PI*2,false);
 ring(26,23.8,1.5,'paper',basket,'彈波外緣壓環','sp_suspension',0,0,-1,'z');for(let j=0;j<6;j++){const a=j*Math.PI/3;bolt(basket,25*Math.sin(a),25*Math.cos(a),.2,'sp_suspension','z');}
 const terminal=box(16,9,3,'paper',basket,'喇叭接線端子板','sp_signal',20,-23,0);for(const x of [16,24]){cyl(1.3,5,'brass',basket,'音圈接線柱','sp_signal',x,-23,2,'z');ring(2,1.3,.5,'dark',basket,'端子絕緣墊圈','sp_signal',x,-23,3,'z');}
 // Flexible leads deform between two actual moving terminals, never a rigid floating wire.
 const leads=[];for(const [i,x] of [[0,16],[1,24]]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-23,3),new THREE.Vector3(17+i*2,-12,5),new THREE.Vector3(8+i,-5,5)]);const m=k.add(new THREE.TubeGeometry(curve,32,.35,8,false),'copper',basket,'音圈編織引線','sp_signal',[0,0,0],true,false);leads.push({m,x,i,original:m.geometry.attributes.position.array.slice()});box(1.4,1.2,.8,'brass',voice,'音圈引線焊接端片','sp_signal',8+i,-5,5);}
 box(28,13,24,'paper',signal,'正弦訊號源','sp_signal',-43,11,32);box(25,10,1,'dark',signal,'訊號源前面板','sp_signal',-43,11,44.5);cyl(3.6,3,'brass',signal,'輸入電壓旋鈕','sp_signal',-48,11,46,'z');for(const x of [-38,-33])ring(2,1.1,1,'steel',signal,'訊號輸出插座','sp_signal',x,11,46,'z');label('SIGNAL',22,4,signal,-43,17.8,34,'sp_signal',true);
 tube([[-38,11,46],[-21,10,48],[19,20,31],[16,56,3]],.6,'copper',base,'訊號正端導線','sp_signal');tube([[-33,11,46],[-15,9,42],[28,22,28],[24,56,3]],.6,'dark',base,'訊號回線','sp_signal');
 label('VOICE COIL · AIR GAP',34,5,base,15,4.2,47,'sp_coil',true);let last=null,lastLead=NaN;
 function pose(state){const e=k.poseBase(state),p=speakerSample(state),dz=p.x*SP_SPEC.scale*SP_SPEC.visualGain,section=state.speakerSection!==false;voice.position.z+=dz;cone.position.z+=dz;surround.pose(24+dz,25);spider.pose(4+dz,-1);fullSurround.pose(24+dz,25);fullSpider.pose(4+dz,-1);fullSurround.mesh.visible=fullSpider.mesh.visible=!section;cutFasteners.forEach(m=>m.visible=!section);magnet.set(section);top.set(section);back.set(section);partial.visible=dust.visible=section;full.visible=dustFull.visible=!section;surround.mesh.visible=spider.mesh.visible=section; // Full cone retains its assembled outer seam; section exposes both suspensions.
  if(Math.abs(dz-lastLead)>.003){lastLead=dz;for(const l of leads){const pos=l.m.geometry.attributes.position;for(let i=0;i<=32;i++)for(let j=0;j<=8;j++){const n=(i*9+j);pos.setZ(n,l.original[n*3+2]+dz*i/32);}pos.needsUpdate=true;l.m.geometry.computeVertexNormals();l.m.geometry.computeBoundingSphere();}}

  last={p,dz};}
 function attachmentEvidence(){root.updateMatrixWorld(true);return [{coilRadialInner:.65,coilRadialOuter:.8,coilAxialOverlap:7.5-Math.abs(last?.dz??0),coneNeckError:Math.abs(voice.position.z-(last?.dz??0))-Math.abs(cone.position.z-(last?.dz??0))}];}
 return {...k,pose,attachmentEvidence,physicalParts:k.parts.filter(p=>p.physical),pageAnchor(){return root.getWorldPosition(new THREE.Vector3());},crankAngleAt(){return null;}};
}
