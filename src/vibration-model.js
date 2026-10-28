// SI units. Both rigs use absolute displacements measured from static equilibrium.
export const VIBRATION_SPEC = { gravity:9.81, demoScale:.4, maxStep:1/600 };
export const TMD_SPEC = { mass:3, ballMass:.3, frequency:1, dampingRatio:.025, amplitude:.003, scale:200, travel:.12, relativeLimit:.075 };
export const SUSP_SPEC = { mass:250, wheelMass:40, tireStiffness:180000, tireDamping:30, amplitude:.008, scale:200, travel:.06 };
const TAU=2*Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function vibrationParameters(state,id){
 if(id==='tmd'){
  const omega=TAU*TMD_SPEC.frequency,tune=(state.tmdTune??95)/100,ballOmega=omega*tune,locked=!!state.tmdLocked;
  return {id,masses:locked?[TMD_SPEC.mass+TMD_SPEC.ballMass,0]:[TMD_SPEC.mass,TMD_SPEC.ballMass],ground:0,kg:TMD_SPEC.mass*omega*omega,cg:2*TMD_SPEC.dampingRatio*TMD_SPEC.mass*omega,kl:locked?0:TMD_SPEC.ballMass*ballOmega*ballOmega,cl:locked?0:2*(state.tmdDamping??14)/100*TMD_SPEC.ballMass*ballOmega,frequency:state.tmdFrequency??.95,amplitude:state.tmdDrive===false?0:TMD_SPEC.amplitude,length:VIBRATION_SPEC.gravity/(ballOmega*ballOmega),locked};
 }
 return {id,masses:[SUSP_SPEC.mass,SUSP_SPEC.wheelMass],ground:1,kg:SUSP_SPEC.tireStiffness,cg:SUSP_SPEC.tireDamping,kl:state.suspStiffness??16000,cl:state.suspDamper===false?0:state.suspDamping??1800,frequency:state.suspFrequency??1.5,amplitude:state.suspRoad===false?0:SUSP_SPEC.amplitude,locked:false};
}
function fresh(state,id){const p=vibrationParameters(state,id);return {x:[0,0],v:[0,0],phase:0,amplitude:0,frequency:p.frequency,base:0,baseVelocity:0,time:0,kl:p.kl,energy:{input:0,damping:0,ground:0,adjustment:0,hand:0},square:0,referenceSquare:0,reference:{x:[0,0],v:[0,0]},halted:'',maxTravel:0};}
function bankKey(id){return id==='tmd'?'tmdSystem':'suspSystem';}
function ensure(state,id){const key=bankKey(id);return state[key]??(state[key]=fresh(state,id));}
export function vibrationEnergy(system,p){const q=system.x[1]-system.x[0],ground=system.x[p.ground]-system.base;return .5*p.masses[0]*system.v[0]**2+.5*p.masses[1]*system.v[1]**2+.5*p.kg*ground**2+.5*p.kl*q*q;}
export function vibrationReset(state,id){state[bankKey(id)]=fresh(state,id);}
export function vibrationSet(state,key,value){
 const id=key.startsWith('tmd')?'tmd':'suspension',p=vibrationParameters(state,id),s=ensure(state,id),before=vibrationEnergy(s,p);state[key]=value;
 if(key==='tmdLocked'||s.halted){vibrationReset(state,id);state.running=false;return;}
 const next=vibrationParameters(state,id);s.energy.adjustment+=vibrationEnergy(s,next)-before;s.kl=next.kl;
}
export function vibrationNudge(state,id){
 const s=ensure(state,id),p=vibrationParameters(state,id);if(s.halted)vibrationReset(state,id);const sys=ensure(state,id),before=vibrationEnergy(sys,p);
 if(id==='tmd'){sys.v[0]+=.045;sys.v[1]+=.045;sys.reference.v[0]+=.045;sys.reference.v[1]+=.045;}
 else sys.v[0]-=.12;
 sys.energy.hand+=vibrationEnergy(sys,p)-before;
}
// Implicit midpoint: the same midpoint velocities drive geometry, work and heat.
function midpoint(system,p,h,y0,y1){
 const vg=(y1-y0)/h,ym=(y0+y1)/2,link=p.kl,damp=p.cl,g=p.ground;
 let k00=link+(g===0?p.kg:0),k11=link+(g===1?p.kg:0),k01=-link;
 let c00=damp+(g===0?p.cg:0),c11=damp+(g===1?p.cg:0),c01=-damp;
 const f=(p.kg*ym+p.cg*vg),x=system.x,v=system.v;let u0,u1;
 if(p.locked){const a=p.masses[0]+h*p.cg/2+h*h*p.kg/4;u0=(p.masses[0]*v[0]-h*p.kg*x[0]/2+h*f/2)/a;u1=u0;}
 else{
  const a=p.masses[0]+h*c00/2+h*h*k00/4,d=p.masses[1]+h*c11/2+h*h*k11/4,b=h*c01/2+h*h*k01/4;
  const rhs0=p.masses[0]*v[0]-h*(k00*x[0]+k01*x[1])/2+(g===0?h*f/2:0),rhs1=p.masses[1]*v[1]-h*(k01*x[0]+k11*x[1])/2+(g===1?h*f/2:0),det=a*d-b*b;
  u0=(d*rhs0-b*rhs1)/det;u1=(a*rhs1-b*rhs0)/det;
 }
 const xm=[x[0]+h*u0/2,x[1]+h*u1/2],vm=[u0,u1],relative=u1-u0,vgap=vm[g]-vg,fg=p.kg*(xm[g]-ym)+p.cg*vgap;
 system.x=[x[0]+h*u0,x[1]+h*u1];system.v=[2*u0-v[0],2*u1-v[1]];
 return {input:-fg*vg*h,damping:damp*relative*relative*h,ground:p.cg*vgap*vgap*h,square:(xm[0]-ym)**2*h,bodySquare:xm[0]*xm[0]*h};
}
function acceleration(s,p){const q=s.x[1]-s.x[0],u=s.v[1]-s.v[0],fg=p.kg*(s.x[p.ground]-s.base)+p.cg*(s.v[p.ground]-s.baseVelocity),fl=p.kl*q+p.cl*u;
 if(p.locked)return [-fg/p.masses[0],-fg/p.masses[0]];
 return [(fl-(p.ground===0?fg:0))/p.masses[0],(-fl-(p.ground===1?fg:0))/p.masses[1]];
}
export function vibrationAdvance(state,id,dt){
 if(!state.running||dt<=0||(state.popup??1)<.95||(state.open??1)<.95||(state.explode??0)>=.025||state.turning||state.history)return;
 const s=ensure(state,id),p=vibrationParameters(state,id);if(s.halted){state.running=false;return;}
 // Also account for callers that set stiffness directly rather than via the shared dispatcher.
 s.energy.adjustment+=.5*(p.kl-s.kl)*(s.x[1]-s.x[0])**2;s.kl=p.kl;
 const steps=Math.max(1,Math.ceil(dt/VIBRATION_SPEC.maxStep)),h=dt/steps;
 for(let j=0;j<steps;j++){
  const oldF=s.frequency;s.frequency=p.frequency+(oldF-p.frequency)*Math.exp(-h/.5);s.phase+=(oldF+s.frequency)/2*TAU*h;
  s.amplitude=p.amplitude+(s.amplitude-p.amplitude)*Math.exp(-h/.75);const nextBase=s.amplitude*Math.sin(s.phase),oldBase=s.base;
  const step=midpoint(s,p,h,oldBase,nextBase);for(const key of ['input','damping','ground'])s.energy[key]+=step[key];s.square+=id==='tmd'?step.square:step.bodySquare;s.time+=h;s.baseVelocity=(nextBase-oldBase)/h;s.base=nextBase;
  if(id==='tmd'){
   const reference={...p,masses:[TMD_SPEC.mass+TMD_SPEC.ballMass,0],kl:0,cl:0,locked:true};const refStep=midpoint(s.reference,reference,h,oldBase,nextBase);s.referenceSquare+=refStep.square;
   const travel=Math.abs(s.x[1]-s.x[0]);s.maxTravel=Math.max(s.maxTravel,travel);if(travel>Math.min(TMD_SPEC.relativeLimit,p.length*.28)||Math.abs(s.x[0]-s.base)>TMD_SPEC.travel)s.halted='超出小角度或樓層行程，請重設試驗';
  }else{
   const travel=Math.abs(s.x[0]-s.x[1]),normal=(SUSP_SPEC.mass+SUSP_SPEC.wheelMass)*VIBRATION_SPEC.gravity+p.kg*(s.base-s.x[1])+p.cg*(s.baseVelocity-s.v[1]);s.maxTravel=Math.max(s.maxTravel,travel);
   if(travel>SUSP_SPEC.travel||normal<=0)s.halted='達到行程或接地限制，請重設試驗';
  }
  if(s.halted){state.running=false;break;}
 }
}
export function vibrationSample(state,id){
 const s=ensure(state,id),p=vibrationParameters(state,id),a=acceleration(s,p),energy=vibrationEnergy(s,p),balance=s.energy.input+s.energy.hand+s.energy.adjustment-s.energy.damping-s.energy.ground-energy;
 return {...p,x:s.x.slice(),v:s.v.slice(),acceleration:a,base:s.base,baseVelocity:s.baseVelocity,phase:s.phase,time:s.time,relative:s.x[1]-s.x[0],relativeVelocity:s.v[1]-s.v[0],building:s.x[0]-s.base,travel:s.x[0]-s.x[1],power:p.cl*(s.v[1]-s.v[0])**2,energy:{...s.energy},stored:energy,balance,rms:s.time?Math.sqrt(s.square/s.time):0,referenceRms:s.time?Math.sqrt(s.referenceSquare/s.time):0,normal:(SUSP_SPEC.mass+SUSP_SPEC.wheelMass)*VIBRATION_SPEC.gravity+p.kg*(s.base-s.x[1])+p.cg*(s.baseVelocity-s.v[1]),halted:s.halted,motion:!!(state.running&&!s.halted&&(state.popup??1)>.95&&(state.explode??0)<.025&&!state.history),subject:id};
}
export function tmdSample(state){return vibrationSample(state,'tmd');}
export function suspensionSample(state){return vibrationSample(state,'suspension');}
// Complex harmonic response of the same linear matrices, for the accessible reader.
function complex(a,b=0){return [a,b];}function add(a,b){return [a[0]+b[0],a[1]+b[1]];}function mul(a,b){return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}function div(a,b){const d=b[0]*b[0]+b[1]*b[1];return d>1e-24?[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]:[0,0];}function neg(a){return [-a[0],-a[1]];}
export function vibrationResponse(state,id,frequency,override={}){
 const p={...vibrationParameters(state,id),...override},w=TAU*frequency,g=p.ground,k=p.kl,c=p.cl,A=id==='tmd'?TMD_SPEC.amplitude:SUSP_SPEC.amplitude,f=mul(complex(p.kg,w*p.cg),complex(A));
 if(p.locked){const x=div(f,complex(p.kg-p.masses[0]*w*w,w*p.cg));return {x:[x,x],body:Math.hypot(...x),relative:0,building:Math.hypot(x[0]-A,x[1]),acceleration:w*w*Math.hypot(...x)};}
 const a=complex(k+(g===0?p.kg:0)-p.masses[0]*w*w,w*(c+(g===0?p.cg:0))),d=complex(k+(g===1?p.kg:0)-p.masses[1]*w*w,w*(c+(g===1?p.cg:0))),b=complex(-k,-w*c),det=add(mul(a,d),neg(mul(b,b))),x0=div(mul(g===0?d:neg(b),f),det),x1=div(mul(g===0?neg(b):a,f),det);
 return {x:[x0,x1],body:Math.hypot(...x0),relative:Math.hypot(x1[0]-x0[0],x1[1]-x0[1]),building:Math.hypot(x0[0]-A,x0[1]),acceleration:w*w*Math.hypot(...x0)};
}
export const TMD_PARTS={
 tmd_ball:{title:'懸吊質量球',english:'TUNED MASS',text:'0.3 kg 的等效質量球由四條等長懸索支承。球與樓層之間的相對運動，讓振動能量在兩者間交換；球不會在所有頻率下都剛好反向，也不保證任何設定都減振。'},
 tmd_cables:{title:'四條懸索與調諧絞盤',english:'SUSPENSION & TUNING',text:'小角度下 fₜ = √(g/L)/(2π)。調整頻率比會改變實際懸索長度；每條懸索的兩端都連到眼環。圖中為原創縮尺試驗台，並非台北101的縮製原器。'},
 tmd_dampers:{title:'雙側油壓阻尼器',english:'VISCOUS DAMPERS',text:'兩支阻尼器共同提供 cₜ，阻力反抗球相對樓層的速度。瞬時耗散功率為 cₜ(v球−v樓)²，始終非負。重力提供回復作用，油壓阻尼將振動能量轉成熱。'},
 tmd_floor:{title:'樓層質量與彈性柱',english:'PRIMARY STRUCTURE',text:'以 3 kg 等效樓層、1 Hz 固有頻率和 2.5% 結構阻尼表示一階側向振動。四片彈性柱隨樓層位移彎曲；這是線性等效模型，不是整棟建築的地震分析。'},
 tmd_shaker:{title:'水平振動台與線性致動器',english:'BASE EXCITATION',text:'平台以 3 mm 目標振幅做正弦運動，頻率與振幅平滑接入。模型使用同一段平台運動計算外部作功，並與樓層、球及耗散能量核對。'},
 tmd_lock:{title:'鎖定重測與參照',english:'LOCKED-MASS REFERENCE',text:'鎖定會先歸零重開一次試驗；球質量併入樓層，總質量成為 3.3 kg。自由球的參照曲線也使用同一振台輸入與鎖定模型，因此鎖定後固有頻率會略變。'},
 tmd_frame:{title:'底座、滑軌與讀值尺',english:'LABORATORY BENCH',text:'滑軌讓振台只沿一軸移動。尺與固定支架放在運動包絡之外。停止並收攏後才能拆解；超出小角度或行程範圍會停止試驗，避免把線性近似當成碰撞模型。'}
};
export const SUSP_PARTS={
 sus_spring:{title:'螺旋彈簧與彈簧座',english:'COIL SPRING',text:'彈簧依相對行程儲存、釋放彈性能。設定的是等效懸吊剛度；重力造成的靜態壓縮已在平衡位置扣除；調剛度時視為同步調整預載、維持中性車高。彈簧本身不是主要耗能元件。'},
 sus_damper:{title:'剖開的液壓筒身',english:'HYDRAULIC DAMPER',text:'筒身隨車輪側運動，活塞桿隨車身側運動。油液通過閥孔與閥片產生阻力；此頁以 F=cΔv 的線性黏滯阻尼近似，沒有求解實際油壓流場。'},
 sus_valves:{title:'活塞、閥片與油路',english:'PISTON & VALVE STACK',text:'壓縮和回彈時，活塞兩側的流動方向相反。流線只是方向示意；功率與累積熱量依 c(v車身−v車輪)² 計算。旁通比較會把理想模型阻尼設為零。'},
 sus_wheel:{title:'輪胎、輪轂與簧下質量',english:'UNSPRUNG MASS',text:'40 kg 等效簧下質量與 180 kN/m 輪胎剛度，和 250 kg 簧上質量共同構成兩自由度模型。輪胎底部接觸路面平台；輪胎不是無限剛硬的圓輪。'},
 sus_body:{title:'簧上質量與導向滑座',english:'SPRUNG MASS',text:'250 kg 是四分之一車的等效簧上質量。導向滑座限制本試驗台只做垂直運動；即時數據顯示車身加速度，而不是把車輪位移當成乘坐舒適度。'},
 sus_road:{title:'上下起伏的路面平台',english:'ROAD INPUT',text:'以 8 mm 正弦路面輸入比較頻率、彈簧剛度與阻尼。切到平路時振幅平滑衰減，能繼續觀察自由回彈。路面致動器的作功是振動能量來源。'},
 sus_frame:{title:'行程尺、立架與試驗限制',english:'TEST FRAME',text:'活塞桿、密封與彈簧座維持同軸。線性模型到達 60 mm 相對行程或接地限制時會停止，重設可重新試驗；未模擬離地碰撞或完整實車懸吊。'}
};
const chapter=(unit,n,label,title,subtitle,first,second,question,answer)=>({label,kicker:unit+' · 0'+n+' / '+label,title,subtitle,paragraphs:[first,second],figure:title+'實驗台',caption:second,note:'線性教學模型 · 0.4 倍時間演示',question,answer,defaultExplode:0});
export const TMD_CHAPTERS=[
 chapter('第五部',1,'構造','建築阻尼球','TUNED MASS DAMPER','一個會擺動的球，改變樓層的反應。','啟動振動台，改變激振頻率、調諧頻率比與阻尼，觀察樓層和球的相對運動。','球越重、阻尼越大，就一定越好嗎？','還要配合頻率、行程與結構條件；減振效果不是單靠一個參數決定。'),
 chapter('第五部',2,'共振','把頻率調在一起','TUNING & COUPLED MODES','球與樓層，組成耦合振動系統。','小角度下球的回復作用等效為 kₜ=mg/L。調諧會改變原本單一結構的響應，可能出現兩個共振峰。','球永遠都和樓層反向嗎？','相位取決於激振頻率與阻尼；不能用固定反向動畫代替動力學。'),
 chapter('第五部',3,'能量','振動能量去了哪裡？','STORAGE & DISSIPATION','重力與彈性儲能，阻尼器把能量轉成熱。','同一振台運動驅動樓層與球；調諧時的參數作功另外記帳，避免把調整造成的能量當成自然增減。','阻尼器每一刻的耗散功率會變負嗎？','不會。cₜΔv²≥0；外部振台作功則可以正或負。'),
 chapter('第五部',4,'實驗','自由球，還是鎖定球？','A MATCHED LOCKED-MASS COMPARISON','用同樣的輸入，比較一段時間的晃動。','鎖定參照將球質量併入樓層。均方根由本次試驗累積計算，包含起振過程；不是實際大樓的性能保證。','鎖定後樓層的固有頻率會一樣嗎？','不一樣。附加質量併入後，頻率約變成 f₀/√(1+m/M)。')
];
export const SUSP_CHAPTERS=[
 chapter('第六部',1,'構造','汽車避震器','A QUARTER-CAR SUSPENSION','彈簧負責回復，阻尼器控制回彈。','讓路面平台上下起伏，從剖面觀察彈簧、活塞、閥片與輪胎如何共同回應。','只有彈簧，車身會怎樣？','受到路面激振後可能持續振盪；阻尼器能將相對運動的能量耗散。'),
 chapter('第六部',2,'振動','車身與車輪不同步','TWO DEGREES OF FREEDOM','車身、車輪，各有自己的慣性。','250 kg 簧上質量、40 kg 簧下質量與彈簧、輪胎共同作動。路面頻率改變時，車身加速度與行程的反應也會改變。','把車輪固定住，還能代表完整懸吊嗎？','那只剩簡化單自由度模型，無法呈現輪胎與簧下質量的耦合反應。'),
 chapter('第六部',3,'油路','一孔油路，控制回彈','HYDRAULIC RESISTANCE','油液通過閥孔，阻力反抗相對速度。','剖開筒身查看壓縮與回彈。線性模型用 F=cΔv，實際避震器可能有不同的壓縮、回彈與非線性閥門特性。','阻尼調得越大，一定越舒適嗎？','過大的阻尼也可能把路面擾動傳給車身，需要依頻率與性能目標權衡。'),
 chapter('第六部',4,'實驗','路面平了，為何還在晃？','FREE DECAY & ENERGY','把路面切平，再觀察回彈如何消退。','固定彈簧與輸入比較阻尼；再固定阻尼改剛度。超出線性模型的行程或接地條件時，本試驗會停止並提示重設。','停止路面起伏，就沒有振動能量了嗎？','先前的動能與彈性位能仍可互相轉換，直到被阻尼耗散。')
];
export function auditVibrations(){
 let checks=0;const failures=[],check=(condition,label)=>{checks++;if(!condition&&!failures.includes(label))failures.push(label);};let largestResidual=0;
 for(const id of ['tmd','suspension']){
  const s={running:true,popup:1,open:1,tmdDrive:true,suspRoad:true};
  for(let i=0;i<1800;i++){vibrationAdvance(s,id,1/120);const p=vibrationSample(s,id);largestResidual=Math.max(largestResidual,Math.abs(p.balance));check(Math.abs(p.balance)<1e-8,'midpoint input/heat/stored balance');check(p.power>=0,'nonnegative damping heat');check(p.x.every(Number.isFinite),'finite state');}
  const p=vibrationSample(s,id);check(!p.halted,'default trial within travel/contact limits');s.running=false;const before=JSON.stringify(s[bankKey(id)]);vibrationAdvance(s,id,1);check(before===JSON.stringify(s[bankKey(id)]),'paused model freezes');
  const key=id==='tmd'?'tmdTune':'suspStiffness';vibrationSet(s,key,id==='tmd'?110:22000);check(Math.abs(vibrationSample(s,id).balance)<1e-8,'stiffness adjustment work');
  s.running=true;vibrationSet(s,id==='tmd'?'tmdDrive':'suspRoad',false);for(let i=0;i<1200;i++)vibrationAdvance(s,id,1/120);check(Math.abs(vibrationSample(s,id).balance)<1e-8,'decay after input fades');
  vibrationNudge(s,id);check(Math.abs(vibrationSample(s,id).balance)<1e-8,'manual nudge work');
 }
 const locked={running:true,popup:1,open:1,tmdLocked:true};for(let i=0;i<1200;i++)vibrationAdvance(locked,'tmd',1/120);const p=tmdSample(locked);check(p.relative===0,'locked ball follows floor');check(Math.abs(p.rms-p.referenceRms)<1e-12,'locked comparison uses identical mass and input');
 const steady={tmdFrequency:.95};const tuned=vibrationResponse(steady,'tmd',.95),ref=vibrationResponse(steady,'tmd',.95,{masses:[3.3,0],kl:0,cl:0,locked:true});check(tuned.building<ref.building,'reference tuning reduces resonant response');check(Math.abs(vibrationParameters({},'tmd').kl-TMD_SPEC.ballMass*VIBRATION_SPEC.gravity/vibrationParameters({},'tmd').length)<1e-12,'pendulum tuning relation');
 return {passed:!failures.length,checks,failures,largestResidual,scope:'linear two-DOF base excitation, implicit-midpoint work/heat balance, parameter work, small-angle TMD and quarter-car about static preload; stopped at travel/contact limits, no impact/CFD/full building analysis'};
}
