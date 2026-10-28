import { clamp } from './model.js';
const TAU=Math.PI*2;
export const ST_SPEC=Object.freeze({crank:9,rod:43,shaftY:92,pistonHalf:3,floor:24,boreRadius:10,deadVolume:.6e-6,regeneratorVolume:2e-6,gasConstant:8.314462618,ambientPressure:101325,chargeNR:0.0068,inertia:.004,frictionViscous:.00065,frictionDry:.00035,brakeViscous:.002,demoScale:.24,startOmega:18});
// Distances are millimetres; volume and work are SI. Both crowns are power pistons.
export function stKinematics(phase){
 const s=ST_SPEC,area=Math.PI*(s.boreRadius/1000)**2;
 function piston(a){const z=s.crank*Math.sin(a),cy=s.shaftY+s.crank*Math.cos(a),root=Math.sqrt(s.rod*s.rod-z*z),y=cy-root;
  const derivative=-s.crank*Math.sin(a)+s.crank*s.crank*Math.sin(a)*Math.cos(a)/root;
  return {a,y,crankY:cy,crankZ:z,volume:s.deadVolume+area*(y-s.pistonHalf-s.floor)/1000,dV:area*derivative/1000,dy:derivative};
 }
 const hot=piston(phase+Math.PI/2),cold=piston(phase);
 return {hot,cold,volume:hot.volume+cold.volume+s.regeneratorVolume,dV:hot.dV+cold.dV};
}
export function stThermo(state={},phase=state.phase??.8){
 const hotC=state.heater===false?(state.coldC??25):(state.hotC??320),coldC=state.coldC??25,Th=hotC+273.15,Tc=coldC+273.15;
 const Tr=Math.abs(Th-Tc)<1e-8?Tc:(Th-Tc)/Math.log(Th/Tc),k=stKinematics(phase),s=ST_SPEC;
 const denominator=k.hot.volume/Th+k.cold.volume/Tc+s.regeneratorVolume/Tr;
 const pressure=s.chargeNR/denominator,torque=(pressure-s.ambientPressure)*k.dV;
 return {...k,Th,Tc,Tr,hotC,coldC,pressure,torque,gasMoles:s.chargeNR/s.gasConstant,gasHot:s.chargeNR?pressure*k.hot.volume/(s.gasConstant*Th):0,gasCold:pressure*k.cold.volume/(s.gasConstant*Tc),gasReg:pressure*s.regeneratorVolume/(s.gasConstant*Tr)};
}
let cycleKey='',cycleCache=null;
export function stCycle(state={}){
 const key=[state.heater!==false,state.hotC??320,state.coldC??25].join('|');if(key===cycleKey)return cycleCache;
 let work=0,hotHeat=0,coldHeat=0,minP=Infinity,maxP=0,minV=Infinity,maxV=0;const steps=720,da=TAU/steps;
 for(let j=0;j<steps;j++){const p=stThermo(state,(j+.5)*da);work+=p.pressure*p.dV*da;hotHeat+=p.pressure*p.hot.dV*da;coldHeat+=p.pressure*p.cold.dV*da;minP=Math.min(minP,p.pressure);maxP=Math.max(maxP,p.pressure);minV=Math.min(minV,p.volume);maxV=Math.max(maxV,p.volume);}
 const p=stThermo(state);cycleKey=key;cycleCache={work,hotHeat,coldHeat,minP,maxP,minV,maxV,carnot:1-p.Tc/p.Th};return cycleCache;
}
export function stSample(state={}){
 const p=stThermo(state),motion=!!((state.running||state.manualActive)&&(state.popup??1)>.95&&(state.open??1)>.95&&(state.explode??0)<.025&&!state.turning),omega=((state.popup??1)>.95&&(state.open??1)>.95&&(state.explode??0)<.025&&!state.turning)?(state.stOmega??0):0;
 const brake=(state.brakeEngaged===false?0:ST_SPEC.brakeViscous*(state.brake??35)/100),frictionTorque=ST_SPEC.frictionViscous*omega+ST_SPEC.frictionDry*Math.tanh(omega/.35);
 return {...p,motion,omega,rpm:Math.abs(omega)*30/Math.PI,frequency:Math.abs(omega)/TAU,loadPower:brake*omega*omega,frictionPower:frictionTorque*omega,gasPower:p.torque*omega,kinetic:.5*ST_SPEC.inertia*omega*omega,brakeCoefficient:brake,cycle:stCycle(state),energy:state.stEnergy??{gas:0,load:0,friction:0,kick:0},subject:'stirling'};
}
// Implicit midpoint integrates the flywheel. Its discrete work equals the change in kinetic energy.
export function stAdvance(state,physicalDt){
 if(physicalDt<=0||!state.running||(state.explode??0)>=.025||(state.popup??1)<.95||(state.open??1)<.95||state.turning)return;
 const n=Math.max(1,Math.ceil(physicalDt/(1/1200))),dt=physicalDt/n,s=ST_SPEC,energy=state.stEnergy??(state.stEnergy={gas:0,load:0,friction:0,kick:0});
 const b=s.frictionViscous+(state.brakeEngaged===false?0:s.brakeViscous*(state.brake??35)/100),bl=b-s.frictionViscous;
 for(let i=0;i<n;i++){
  const a=state.phase,w=state.stOmega??0;let next=w;
  for(let j=0;j<7;j++){const mid=(w+next)/2,theta=a+mid*dt/2,t=stThermo(state,theta).torque,fr=s.frictionDry*Math.tanh(mid/.35);next=w+dt*(t-b*mid-fr)/s.inertia;}
  const mid=(w+next)/2,delta=mid*dt,torque=stThermo(state,a+delta/2).torque,friction=s.frictionViscous*mid+s.frictionDry*Math.tanh(mid/.35);
  energy.gas+=torque*delta;energy.load+=bl*mid*delta;energy.friction+=friction*delta;
  state.phase=a+delta;state.stOmega=next;
 }
}
export function stNudge(state,omega=ST_SPEC.startOmega){const old=state.stOmega??0;state.stOmega=omega;state.stEnergy??={gas:0,load:0,friction:0,kick:0};state.stEnergy.kick+=.5*ST_SPEC.inertia*(omega*omega-old*old);}
export const ST_PARTS={
 st_hot:{title:'熱端膨脹缸',english:'HOT EXPANSION SPACE',text:'熱端由外部加熱器維持設定溫度。活塞下方的密閉氣體在這裡接受熱，壓力作用在活塞上，經連桿推動曲柄。這是 α 型的動力活塞，並非只搬移氣體的置換器。'},
 st_cold:{title:'冷端壓縮缸',english:'COLD COMPRESSION SPACE',text:'冷端透過帶鰭片的冷卻套向外放熱。較低溫度使壓縮所需的功降低。熱端與冷端相通，封閉在機內的是同一份工作氣體。'},
 st_pistons:{title:'雙動力活塞與密封環',english:'TWO POWER PISTONS',text:'兩顆活塞各自改變一個氣室的體積。曲柄銷固定相差 90°；連桿採有限長度，所以活塞運動不是完全正弦。體積與動畫都由同一個曲柄滑塊幾何計算。'},
 st_rods:{title:'連桿與相位曲柄',english:'RODS & 90° CRANKS',text:'每支連桿的兩端分別接到活塞銷與曲柄銷，中心距固定為 43 mm；曲柄半徑 9 mm，活塞行程 18 mm。熱缸曲柄相對冷缸超前 90°。'},
 st_flywheel:{title:'飛輪與共用曲軸',english:'FLYWHEEL & CRANKSHAFT',text:'壓力扭矩會隨角度改變，部分區間會反向。飛輪儲存轉動動能，協助機構跨過這些區間。可拖動飛輪手動起轉；轉速由壓力扭矩、摩擦與煞車負載共同決定。'},
 st_regenerator:{title:'回熱器與連通管',english:'REGENERATOR & TRANSFER PATH',text:'工作氣體在兩缸間往復，通過回熱材料時暫存與取回熱。模型採理想回熱、均勻壓力與等溫氣室；實機還有壓降、漏氣與有限傳熱等損失。'},
 st_heater:{title:'外部加熱器與溫度探針',english:'HEATER & THERMAL RESERVOIRS',text:'加熱器在工作氣體外部供熱，氣體本身不燃燒。書頁的溫度代表理想熱源與冷源設定，沒有模擬暖機時間。關閉加熱會令兩端等溫，飛輪逐漸失去可用的循環淨功。'},
 st_brake:{title:'可調機械煞車負載',english:'ADJUSTABLE BRAKE LOAD',text:'煞車對轉軸施加與轉速成正比的阻力扭矩。輸出功率為 τ負載 × ω，最後在煞車中變成熱。提高負載不保證提高功率，也可能讓轉速下降或停轉。這裡的輸出是機械功，並非電功率。'},
 st_frame:{title:'底座、軸承與支承架',english:'BASE & BEARING SUPPORTS',text:'支架讓兩個軸承共軸，缸體與曲軸保持固定距離。拆解時先停轉，再沿安裝方向展開缸體、活塞、曲軸、回熱器與負載；組裝完成後才能運行。'}
};
export const ST_CHAPTERS=[
 {label:'構造',kicker:'第二部 · 01 / 從溫差到轉動',title:'史特靈熱機',subtitle:'HEAT SETS THE WHEEL IN MOTION',paragraphs:['一端加熱，一端冷卻，飛輪就能轉。','雙缸 α 型熱機讓同一份氣體在熱端與冷端間往復。兩顆動力活塞以 90° 相位差，共同推動一根曲軸。'],caption:'點「啟動熱機」給起轉輕推；拖飛輪也能手動探索。',figure:'雙缸 α 型史特靈熱機',note:'熱端赭紅 · 冷端青灰 · 剖面為教學切開',defaultExplode:0,question:'氣體需要在機器裡燃燒嗎？',answer:'不需要；這是外部供熱、氣體封閉循環的熱機。'},
 {label:'循環',kicker:'第二部 · 02 / 同一團氣體，來回旅行',title:'氣體的一圈旅程',subtitle:'PRESSURE · VOLUME · A CLOSED CYCLE',paragraphs:['活塞不停往復，壓力與體積走出一個圈。','熱端膨脹得到的功，大於冷端壓縮付出的功，兩者相減形成每圈淨功。紙上的 p–V 游標與兩顆活塞同步。'],caption:'連續曲柄運動形成平滑迴圈；不是四段停走的方形循環。',figure:'壓力與體積，同步觀察',note:'p–V 圈內面積為每圈指示淨功',defaultExplode:0,question:'只膨脹一次，可以一直轉下去嗎？',answer:'必須回到起始狀態；循環中也要壓縮氣體並向冷端放熱。'},
 {label:'做功',kicker:'第二部 · 03 / 飛輪替機器記住能量',title:'壓力，推動了誰？',subtitle:'GAS WORK · FLYWHEEL · BRAKE LOAD',paragraphs:['瞬間扭矩會反向，飛輪接住轉動。','氣體作功分配到飛輪動能、煞車負載與軸承摩擦。三者由同一個動力模型更新，輸出功隨時間累積。'],caption:'輸出功率是煞車取得的機械功率；沒有接上發電機。',figure:'氣體 → 曲軸 → 飛輪與負載',note:'正、負氣體扭矩皆會出現 · 轉速是結果',defaultExplode:0,question:'飛輪是持續供給能量的來源嗎？',answer:'飛輪只暫存能量；持續輸出仍需要熱源與冷源的溫差。'},
 {label:'實驗',kicker:'第二部 · 04 / 選一個條件，親手比較',title:'溫差與負載的取捨',subtitle:'DESIGN AN EXPERIMENT ON THE PAGE',paragraphs:['更大的負載，會得到更多功率嗎？','先固定兩端溫度，只改煞車負載，再比較轉速與輸出功率。也可關閉加熱，觀察飛輪如何逐漸失去運轉能力。'],caption:'理想等溫、完全回熱；效率上限不是實機效率。',figure:'調溫度、改負載、看結果',note:'模型沒有暖機時間 · 啟動包含手動起轉',defaultExplode:0,question:'熱源溫度升高，效率就能到 100% 嗎？',answer:'冷源溫度大於 0 K 時，上限 1 − Tc/Th 小於 100%。'}
];
export function auditStirling(){
 let checks=0;const failures=[],check=(v,label)=>{checks++;if(!v)failures.push(label);};
 const base={hotC:320,coldC:25,heater:true},cycle=stCycle(base);
 check(cycle.work>0,'positive cycle work');check(Math.abs(cycle.work-cycle.hotHeat-cycle.coldHeat)<1e-10,'cycle first law');check(Math.abs(cycle.work/cycle.hotHeat-cycle.carnot)<1e-9,'ideal efficiency upper bound');
 check(Math.abs(stCycle({...base,hotC:25}).work)<1e-10,'equal temperatures give zero cycle work');check(Math.abs(stCycle({...base,heater:false}).work)<1e-10,'heater off gives zero cycle work');
 for(let j=0;j<=720;j++){
  const a=j*TAU/720,p=stThermo(base,a),da=1e-5,lo=stKinematics(a-da),hi=stKinematics(a+da);
  check(p.pressure>0&&p.hot.volume>0&&p.cold.volume>0,'positive state');
  check(Math.abs(p.gasHot+p.gasCold+p.gasReg-p.gasMoles)<1e-14,'gas mass conservation');
  check(Math.abs((hi.volume-lo.volume)/(2*da)-p.dV)<1e-13,'volume derivative');
  for(const c of [p.hot,p.cold])check(Math.abs(Math.hypot(c.crankZ,c.crankY-c.y)-ST_SPEC.rod)<1e-10,'fixed connecting rod length');
 }
 const s={...base,phase:2,stOmega:12,running:true,popup:1,open:1,explode:0,brake:35,stEnergy:{gas:0,load:0,friction:0,kick:.5*ST_SPEC.inertia*144}};const initial=.5*ST_SPEC.inertia*144;
 for(let j=0;j<1200;j++)stAdvance(s,1/240);
 const final=.5*ST_SPEC.inertia*s.stOmega*s.stOmega,e=s.stEnergy;
 check(Math.abs(e.gas-e.load-e.friction-(final-initial))<1e-8,'integrated flywheel energy balance');check(e.load>=0&&e.friction>=0,'dissipated energy is nonnegative');check(s.stOmega>0,'heated engine sustains rotation');
 const stopped={...s,running:false,stEnergy:{...s.stEnergy}},angle=stopped.phase;stAdvance(stopped,1);check(stopped.phase===angle,'pause freezes model');
 return {passed:!failures.length,checks,failures,cycleWorkJ:cycle.work,hotHeatJ:cycle.hotHeat,idealEfficiencyUpperBound:cycle.carnot,afterFiveSecondsRpm:s.stOmega*30/Math.PI,energyResidual:e.gas-e.load-e.friction-(final-initial),scope:'exact finite connecting rods, uniform pressure, ideal gas, isothermal spaces, ideal regenerator, midpoint flywheel and brake dynamics; no real engine performance or swept collision guarantee'};
}
