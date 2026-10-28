import { clamp } from './model.js';
const TAU=Math.PI*2;
export const G_SPEC=Object.freeze({arm:.15,ballMass:.25,gravity:9.81,thetaMin:22*Math.PI/180,thetaMax:62*Math.PI/180,driveInertia:.002,motorStall:.18,motorSlope:.006,shaftDrag:.0007,armDamping:.014,feedbackGain:.75,demoScale:.24});
export function govGeometry(theta){const g=G_SPEC,r=g.arm*Math.sin(theta),height=g.arm*Math.cos(theta),sleeve=2*g.arm*(Math.cos(g.thetaMin)-Math.cos(theta));return {radius:r,height,lift:sleeve};}
export function govEquilibrium(omega,sleeveMass=.18){const g=G_SPEC,c=omega*omega?((g.ballMass+sleeveMass)*g.gravity/(g.ballMass*g.arm*omega*omega)):Infinity;return clamp(Math.acos(clamp(c,-1,1)),g.thetaMin,g.thetaMax);}
function govForces(state,omega,theta,velocity){
 const g=G_SPEC,M=(state.govMass??180)/1000,m=g.ballMass,L=g.arm,s=Math.sin(theta),c=Math.cos(theta),maxLift=govGeometry(g.thetaMax).lift,lift=govGeometry(theta).lift;
 const opening=clamp((state.govSupply??85)/100-(state.govFeedback===false?0:g.feedbackGain*lift/maxLift),0,1);
 const motorTorque=Math.max(0,g.motorStall*opening-g.motorSlope*omega),loadTorque=((state.govLoad??12)+(state.govStep?20:0))/1000;
 const inertia=g.driveInertia+2*m*L*L*s*s,dInertia=4*m*L*L*s*c;
 const armInertia=2*m*L*L+4*M*L*L*s*s;
 const omegaDot=(motorTorque-g.shaftDrag*omega-loadTorque*Math.tanh(omega/.2)-dInertia*velocity*omega)/inertia;
 const thetaDotDot=(2*m*L*L*omega*omega*s*c-2*(m+M)*g.gravity*L*s-4*M*L*L*s*c*velocity*velocity-g.armDamping*velocity)/armInertia;
 return {opening,motorTorque,loadTorque,inertia,armInertia,omegaDot,thetaDotDot};
}
export function govSample(state={}){
 const theta=state.govTheta??G_SPEC.thetaMin,omega=state.govOmega??0,velocity=state.govVelocity??0,p=govForces(state,omega,theta,velocity),geom=govGeometry(theta),M=(state.govMass??180)/1000;
 const available=(state.popup??1)>.95&&(state.open??1)>.95&&(state.explode??0)<.025&&!state.turning,w=available?omega:0;
 return {...geom,...p,theta,omega:w,rpm:w*30/Math.PI,armVelocity:velocity,motion:!!(state.running&&available),centripetal:G_SPEC.ballMass*w*w*geom.radius,weight:G_SPEC.ballMass*G_SPEC.gravity,energy:state.govEnergy??{load:0,input:0,loss:0},loadPower:p.loadTorque*w*Math.tanh(w/.2),kinetic:.5*p.inertia*omega*omega+.5*p.armInertia*velocity*velocity,potential:2*(G_SPEC.ballMass+M)*G_SPEC.gravity*G_SPEC.arm*(Math.cos(G_SPEC.thetaMin)-Math.cos(theta)),equilibrium:govEquilibrium(omega,M),subject:'governor'};
}
// Full finite-arm dynamics; equal arms constrain the translating sleeve to 2 L cos(theta).
export function govAdvance(state,physicalDt){
 if(!state.running||physicalDt<=0||(state.popup??1)<.95||(state.open??1)<.95||(state.explode??0)>=.025||state.turning)return;
 const n=Math.max(1,Math.ceil(physicalDt/(1/900))),dt=physicalDt/n,g=G_SPEC,energy=state.govEnergy??(state.govEnergy={load:0,input:0,loss:0});
 function derivative(v){const f=govForces(state,v[1],v[2],v[3]);return [v[1],f.omegaDot,v[3],f.thetaDotDot];}
 for(let j=0;j<n;j++){
  const v=[state.phase??0,state.govOmega??0,state.govTheta??g.thetaMin,state.govVelocity??0],a=derivative(v),b=derivative(v.map((x,i)=>x+a[i]*dt/2)),c=derivative(v.map((x,i)=>x+b[i]*dt/2)),d=derivative(v.map((x,i)=>x+c[i]*dt));
  const out=v.map((x,i)=>x+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6),mid=v.map((x,i)=>(x+out[i])/2),f=govForces(state,mid[1],mid[2],mid[3]);
  energy.load+=Math.max(0,f.loadTorque*mid[1]*Math.tanh(mid[1]/.2)*dt);energy.input+=f.motorTorque*mid[1]*dt;energy.loss+=(g.shaftDrag*mid[1]**2+g.armDamping*mid[3]**2)*dt;
  out[1]=Math.max(0,out[1]);
  if(out[2]<g.thetaMin){out[2]=g.thetaMin;out[3]=Math.max(0,out[3]);}if(out[2]>g.thetaMax){out[2]=g.thetaMax;out[3]=Math.min(0,out[3]);}
  [state.phase,state.govOmega,state.govTheta,state.govVelocity]=out;
 }
}
export const GOV_PARTS={
 gov_balls:{title:'成對飛球與球端銷',english:'FLYWEIGHTS',text:'兩個 250 g 飛球隨主軸繞行，半徑由連桿角度決定。轉速提高時，圓周運動所需的向心項 mω²r 增大；飛球會帶動連桿與套筒，直到新的平衡。'},
 gov_links:{title:'等長上下連桿',english:'EQUAL-ARM LINKAGE',text:'上下連桿各長 150 mm，球端銷與主軸上的兩個鉸點形成菱形。每一根連桿都直接接住它的實體銷軸；套筒升程為 2L(cosθmin − cosθ)。'},
 gov_sleeve:{title:'旋轉滑動套筒與配重',english:'SLIDING SLEEVE',text:'套筒與飛球一起旋轉，也能沿主軸升降。中央質量可由書頁調整；增加套筒質量會增加抬升所需的力，使同一升程需要較高轉速。'},
 gov_feedback:{title:'止推環、撥叉與回授桿',english:'SLEEVE FEEDBACK',text:'止推環把旋轉套筒的升降傳到不旋轉的撥叉。帶槽槓桿推動電位器滑觸頭，減少馬達的動力開度。這是電動試驗台對傳統節流調速功能的教學對應。'},
 gov_drive:{title:'馬達、皮帶與驅動輪',english:'DRIVE TRAIN',text:'馬達透過皮帶驅動主軸。模型的轉矩隨動力開度增加、隨轉速降低；負載增加時先降速，回授讓套筒下降、動力重新打開，形成負回授。'},
 gov_bearings:{title:'主軸、軸承與機械止擋',english:'SPINDLE & LIMITS',text:'上下軸承保持主軸同軸；機械止擋限制連桿在 22° 到 62°。達到止擋時，套筒不再增加升程，因此無法再靠這段行程調節動力。'},
 gov_frame:{title:'試驗底座與量測尺',english:'EXPERIMENT FRAME',text:'底座、軸承架、套筒升程尺與接線柱共同支承試驗台。拆解先停轉，飛球、連桿、套筒、回授機構及驅動組沿安裝方向分開。'}
};
export const GOV_CHAPTERS=[
 {label:'構造',kicker:'第三部 · 01 / 讓機械感覺自己的速度',title:'離心調速器',subtitle:'A MACHINE THAT SENSES ITS SPEED',paragraphs:['兩顆飛球，牽動一整條控制鏈。','主軸帶動飛球，等長連桿把張角變成套筒升程。止推環與撥叉再將升程傳到動力控制端。'],figure:'飛球、套筒與負回授試驗台',caption:'從書頁啟動；點零件檢視真實安裝關係。',note:'Porter 式等臂配重構造 · 電動回授教學台',question:'套筒需要跟著飛球一起旋轉嗎？',answer:'內套筒旋轉；止推環把升降傳給不旋轉的撥叉。',defaultExplode:0},
 {label:'平衡',kicker:'第三部 · 02 / 半徑與高度，一起變',title:'轉得快，球就張開',subtitle:'ROTATION · FORCE · SLEEVE LIFT',paragraphs:['轉速、向心項與重力決定張角。','等臂、準靜態平衡時，ω² = (1 + M/m)g/(L cosθ)。中央套筒更重，就需要更高轉速才能抬到相同高度。'],figure:'力與連桿幾何同步量測',caption:'方程為平衡條件；啟動與負載突變時含動態反應。',note:'m 為單顆飛球質量 · M 為中央套筒質量',question:'把中央套筒加重，同一轉速的球會更張開嗎？',answer:'通常會縮回；抬升更重套筒需要更高轉速。',defaultExplode:0},
 {label:'回授',kicker:'第三部 · 03 / 速度改變，讓機械自己補償',title:'快了，便收小動力',subtitle:'A VISIBLE NEGATIVE FEEDBACK LOOP',paragraphs:['飛球張開，套筒升起，動力收小。','切斷回授比較自由加速，再接回回授。負載突加時觀察：轉速先降、套筒下降、動力開度增加。'],figure:'主軸 → 飛球 → 套筒 → 動力端',caption:'機械比例回授會有轉速下垂；不宣稱完全恆速。',note:'可切回授、加負載 · 留意調節範圍與止擋',question:'有回授，轉速就完全不變嗎？',answer:'仍有暫態與穩態轉速下垂，超出行程也會失去調節餘量。',defaultExplode:0},
 {label:'實驗',kicker:'第三部 · 04 / 固定動力，改變一個條件',title:'負載來了，怎麼辦？',subtitle:'TEST A GOVERNOR UNDER LOAD',paragraphs:['比較有、沒有回授的兩次實驗。','固定動力供給與中央質量，啟動後按「突加負載」。記錄轉速、套筒升程與開度，再切回授重做比較。'],figure:'負載突變與調速反應',caption:'模型包含飛球與套筒慣性、阻尼及簡化馬達特性。',note:'不含真實電機電路或製造公差預測',question:'負載增加時，調速器應先減少動力嗎？',answer:'負載先使轉速降低；套筒下降後，回授會增加動力。',defaultExplode:0}
];
export function auditGovernor(){
 let checks=0;const failures=[],check=(x,s)=>{checks++;if(!x)failures.push(s);};const g=G_SPEC;
 for(let j=0;j<=360;j++){const theta=g.thetaMin+(g.thetaMax-g.thetaMin)*j/360,k=govGeometry(theta);check(Math.abs(k.radius*k.radius+k.height*k.height-g.arm*g.arm)<1e-14,'link length');check(k.lift>=-1e-12,'positive lift');const w=Math.sqrt((g.ballMass+.18)*g.gravity/(g.ballMass*g.arm*Math.cos(theta)));check(Math.abs(govEquilibrium(w,.18)-theta)<1e-12,'Porter equilibrium');}
 const run=(feedback,step=false)=>{const s={phase:0,govTheta:g.thetaMin,govOmega:0,govVelocity:0,govSupply:85,govMass:180,govLoad:12,govFeedback:feedback,running:true,popup:1,open:1};for(let j=0;j<2400;j++)govAdvance(s,1/240);if(step){s.govStep=true;for(let j=0;j<2400;j++)govAdvance(s,1/240);}return govSample(s);};
 const closed=run(true),open=run(false),loaded=run(true,true);check(closed.rpm>50&&closed.rpm<open.rpm,'negative feedback limits speed');check(closed.lift>0,'sleeve lifts');check(loaded.opening>closed.opening,'load step opens power');check(loaded.rpm<closed.rpm,'proportional governor droop');check(govEquilibrium(15,.4)<govEquilibrium(15,.08),'heavier sleeve requires more speed');
 return {passed:!failures.length,checks,failures,feedbackRpm:closed.rpm,openLoopRpm:open.rpm,loadedRpm:loaded.rpm,opening:closed.opening,loadedOpening:loaded.opening,scope:'equal-arm Porter geometry, coupled shaft/arm dynamics, simplified motor and proportional position feedback; no hardware or manufacturing calibration'};
}
