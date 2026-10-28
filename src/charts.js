import * as THREE from './vendor/three.module.js';
import { smooth, fmt, clamp } from './model.js';
import { sample, measurementsFor } from './library.js';
import { paperMaterial, inkEdges } from './ink.js';
export function createDataCharts(){
 const root=new THREE.Group();root.position.set(198,2.4,0);
 const hinge=new THREE.Group();root.add(hinge);const graph=new THREE.Group();graph.position.set(30,0,0);graph.rotation.y=-Math.PI/2;hinge.add(graph);
 const meshes=[],paper=paperMaterial('#ede8d4',1.4),frame=paperMaterial('#a8b596',1),ink=new THREE.LineBasicMaterial({color:'#536d47',transparent:true,opacity:.72});
 function solid(geometry,material,parent,pos){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.castShadow=m.receiveShadow=true;m.userData.part='measurements';parent.add(m);meshes.push(m);return m;}
 const leaf=solid(new THREE.BoxGeometry(61,.8,157),paper,hinge,[30,.1,0]);inkEdges(leaf,'#879773',.7);
 function line(points,parent=graph,material=ink){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),material);parent.add(m);return m;}
 function label(w,h,parent,x,y,z){
  const c=typeof document!=='undefined'?document.createElement('canvas'):null;let ctx=null,map=null;if(c){c.width=768;c.height=160;ctx=c.getContext('2d');map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;}
  const mat=new THREE.MeshBasicMaterial({color:map?'#fff':'#eee9d7',map,toneMapped:false,side:THREE.DoubleSide});solid(new THREE.PlaneGeometry(w,h),mat,parent,[x,y,z]);
  return text=>{if(!ctx)return;ctx.fillStyle='#eee9d8';ctx.fillRect(0,0,768,160);ctx.strokeStyle='#a0ae88';ctx.lineWidth=2;ctx.strokeRect(5,5,758,150);ctx.fillStyle='#3e5437';let size=84;ctx.font='400 '+size+'px "Book Hand",cursive';while(ctx.measureText(text).width>730&&size>28){size-=2;ctx.font='400 '+size+'px "Book Hand",cursive';}ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,83);map.needsUpdate=true;};
 }
 for(const x of [-68,68]){solid(new THREE.CylinderGeometry(.65,.9,63,16),frame,graph,[x,31.5,-10]);}
 solid(new THREE.BoxGeometry(137,.8,.8),frame,graph,[0,63,-10]);
 const title=label(135,8,graph,0,69,-10);title('磁通量 · 電壓 · 電能輸出');
 const foot=label(136,6.5,graph,0,3,14);const legend=label(131,5,graph,0,-2,15);legend('Φ、ε 可正可負；P ≥ 0 · 零點在水平標線');
 // The same zero plane makes sign changes visible; power never extends below it.
 line([[-65,25,8],[65,25,8]]);line([[-65,25,-8],[65,25,-8]],graph,new THREE.LineDashedMaterial({color:'#7f9470',dashSize:2,gapSize:1.2})).computeLineDistances();
 const data=[],colors=['#8aa99d','#d2a066','#b8c878'];
 for(let i=0;i<3;i++){
  const x=-45+i*45,r=6.2,geo=new THREE.CylinderGeometry(r,r,1,40,1),original=geo.attributes.position.array.slice();
  const body=solid(geo,paperMaterial(colors[i],1.0),graph,[x,25,0]);
  const ringGeo=new THREE.TorusGeometry(r,.16,5,48);ringGeo.rotateX(Math.PI/2);
  const fixedRing=solid(ringGeo,frame,graph,[x,25,0]);
  const cap=solid(ringGeo.clone(),frame,graph,[x,25,0]);
  // A slim scale is mounted behind each moving cylinder.
  line([[x+10,4,-2],[x+10,48,-2]]);for(let t=-2;t<=2;t++)line([[x+8.5,25+t*10,-2],[x+11.5,25+t*10,-2]]);
  const writeName=label(39,6.5,graph,x,59,1);writeName(['Φ / mWb','ε / V','P / W'][i]);
  const writeValue=label(39,7,graph,x,51,1);
  const writeRange=label(39,4.6,graph,x,10,9);
  data.push({body,original,cap,writeName,writeValue,writeRange,x});
 }
 let visibility=1,lastLabel=0,lastKey='';
 function pose(state){
  visibility+=((state.showCharts===false?0:1)-visibility)*.15;
  const lift=smooth(state.popup??1)*visibility;root.visible=visibility>.002&&(state.open??1)>.015;
  graph.scale.y=.003+.997*smooth(clamp(lift*1.7-.45,0,1));hinge.rotation.z=Math.PI*(1-smooth(clamp(lift*2,0,1)));
  const p=sample(state),view=measurementsFor(state,p),{ranges,values}=view;
  for(let i=0;i<3;i++){
   const d=data[i],height=clamp(values[i]/ranges[i],-1,1)*20,length=Math.max(.035,Math.abs(height)),positions=d.body.geometry.attributes.position;
   for(let j=0;j<positions.count;j++)positions.setY(j,d.original[j*3+1]*length);
   positions.needsUpdate=true;d.body.geometry.computeBoundingSphere();d.body.position.y=25+height/2;d.cap.position.y=25+height;
  }
  const now=typeof performance!=='undefined'?performance.now():0,key=values.map(v=>fmt(v)).join('|')+'|'+view.foot+'|'+ranges.join(',')+'|'+p.subject;
  if(key!==lastKey&&now-lastLabel>90){lastKey=key;lastLabel=now;title(view.title);legend(view.legend);data.forEach((d,i)=>{d.writeName(view.names[i]);d.writeValue((view.signed[i]&&values[i]>0?'+':'')+fmt(values[i],view.digits[i]));d.writeRange((view.signed[i]?'±':'0–')+fmt(ranges[i],ranges[i]<1?1:0)+view.units[i]);});foot(view.foot);}
 }
 return {root,meshes,pose,get visible(){return root.visible&&visibility>.15;}};
}
