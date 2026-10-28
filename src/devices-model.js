// Coupled moving-coil speaker and averaged direct-drive wind generator. SI units.
export const SP_SPEC={M:.012,K:.012*(Math.PI*120)**2,Rm:1.1,R:6,L:.00035,Bl:3.2,demoScale:.015,visualGain:6,scale:600,limit:.0018};
export const WIND_SPEC={rho:1.225,radius:.6,area:Math.PI*.6**2,J:.18,ke:.35,R:.7,bearing:.001,brake:.08,demoScale:.12};
const TAU=2*Math.PI;
function bank(state,id){const key=id==='speaker'?'speakerSystem':'windSystem';if(!state[key])state[key]=id==='speaker'?{i:0,v:0,x:0,time:0,phase:0,input:0,heat:0,damping:0,halted:'',history:[],lastHistory:-1}:{omega:0,phase:0,time:0,input:0,load:0,copper:0,bearing:0,brake:0,halted:'',history:[],lastHistory:-1};return state[key];}
function usable(s,dt){return dt>0&&s.running&&(s.popup??1)>.95&&(s.open??1)>.95&&(s.explode??0)<.025&&!s.turning&&!s.history;}
export function deviceReset(state,id){delete state[id==='speaker'?'speakerSystem':'windSystem'];bank(state,id);}
export function deviceSet(state,key,value){state[key]=value;}
function record(s,point,interval){if(s.time-s.lastHistory>=interval){s.history.push(point);if(s.history.length>200)s.history.shift();s.lastHistory=s.time;}}
export function speakerAdvance(state,dt){if(!usable(state,dt))return;const s=bank(state,'speaker'),p=SP_SPEC,Bl=p.Bl*(state.speakerField??100)/100,steps=Math.ceil(dt/(1/24000)),h=dt/steps;
 for(let j=0;j<steps;j++){
  const f=state.speakerFrequency??60,phase=s.phase+TAU*f*h/2,u=state.speakerSignal===false?0:(state.speakerPolarity??1)*(state.speakerVoltage??1.4)*Math.sin(phase);
  // Solve two midpoint velocities after eliminating midpoint displacement.
  const a=p.L+h*p.R/2,b=h*Bl/2,c=-h*Bl/2,d=p.M+h*p.Rm/2+h*h*p.K/4,r0=p.L*s.i+h*u/2,r1=p.M*s.v-h*p.K*s.x/2,det=a*d-b*c,im=(r0*d-b*r1)/det,vm=(a*r1-c*r0)/det;
  s.i=2*im-s.i;s.v=2*vm-s.v;s.x+=h*vm;s.phase+=TAU*f*h;s.time+=h;s.input+=u*im*h;s.heat+=p.R*im*im*h;s.damping+=p.Rm*vm*vm*h;
  record(s,[s.phase,s.i,s.x,p.R*s.i*s.i],1/2400);if(Math.abs(s.x)>p.limit){s.halted='達到小訊號位移範圍，請調低電壓或重設';state.running=false;break;}
 }
}
export function speakerSample(state){const s=bank(state,'speaker'),p=SP_SPEC,Bl=p.Bl*(state.speakerField??100)/100,voltage=state.speakerSignal===false?0:(state.speakerPolarity??1)*(state.speakerVoltage??1.4)*Math.sin(s.phase),stored=.5*p.L*s.i*s.i+.5*p.M*s.v*s.v+.5*p.K*s.x*s.x;return {...s,subject:'speaker',Bl,voltage,current:s.i,displacement:s.x,velocity:s.v,force:Bl*s.i,backEmf:Bl*s.v,power:p.R*s.i*s.i,stored,balance:s.input-s.heat-s.damping-stored,motion:!!state.running,frequency:state.speakerFrequency??60};}
export function speakerResponse(state,frequency=state.speakerFrequency??60){const p=SP_SPEC,w=TAU*frequency,Bl=p.Bl*(state.speakerField??100)/100,a=p.K-p.M*w*w,b=p.Rm*w,den=a*a+b*b,Zr=p.R+Bl*Bl*w*b/den,Zi=w*p.L+Bl*Bl*w*a/den,I=(state.speakerVoltage??1.4)/Math.hypot(Zr,Zi),x=Bl*I/Math.sqrt(den);return {current:I,displacement:x};}
export function windAerodynamics(state,omega){const p=WIND_SPEC,U=state.windEnabled===false?0:state.windSpeed??8,beta=(state.windPitch??0)*Math.PI/180,lambda=U>0?p.radius*omega/U:0,Cq=.1*Math.cos(beta)**4/(1+(lambda/6.58)**4),torque=.5*p.rho*p.area*p.radius*U*U*Cq,power=.5*p.rho*p.area*U**3;return {U,lambda,Cq,Cp:Cq*lambda,torque,power};}
export function windAdvance(state,dt){if(!usable(state,dt))return;const s=bank(state,'wind'),p=WIND_SPEC,Rl=state.windLoad??4,connected=state.windConnected!==false,gen=connected?p.ke*p.ke/(p.R+Rl):0,brake=state.windBrake?p.brake:0,B=p.bearing+gen+brake,steps=Math.ceil(dt/(1/720)),h=dt/steps;
 for(let j=0;j<steps;j++){
  let w=s.omega;for(let n=0;n<7;n++){const q=windAerodynamics(state,w),eps=.0001,der=(windAerodynamics(state,w+eps).torque-q.torque)/eps,F=2*p.J*(w-s.omega)/h-q.torque+B*w;w=Math.max(0,w-F/(2*p.J/h-der+B));}
  const q=windAerodynamics(state,w),I=connected?p.ke*w/(p.R+Rl):0;s.omega=2*w-s.omega;s.phase+=h*w;s.time+=h;s.input+=q.torque*w*h;s.load+=Rl*I*I*h;s.copper+=p.R*I*I*h;s.bearing+=p.bearing*w*w*h;s.brake+=brake*w*w*h;record(s,[s.time,s.omega*30/Math.PI,Rl*I*I],.02);
 }
}
export function windSample(state){const s=bank(state,'wind'),p=WIND_SPEC,a=windAerodynamics(state,s.omega),current=state.windConnected===false?0:p.ke*s.omega/(p.R+(state.windLoad??4)),voltage=current*(state.windLoad??4),power=current*voltage,stored=.5*p.J*s.omega*s.omega;return {...s,...a,subject:'wind',rpm:s.omega*30/Math.PI,current,voltage,loadPower:power,shaftPower:a.torque*s.omega,stored,balance:s.input-s.load-s.copper-s.bearing-s.brake-stored,motion:!!state.running};}
export function deviceSample(state,id){return id==='speaker'?speakerSample(state):id==='wind'?windSample(state):{subject:'camera',motion:false,static:true,section:state.cameraSection!==false};}
export function auditDevices(){let checks=0,maxResidual=0;const failures=[],check=(v,label)=>{checks++;if(!v&&!failures.includes(label))failures.push(label);};
 for(const frequency of [20,40,60,90,120])for(const field of [50,100,150]){const s={running:true,popup:1,open:1,speakerFrequency:frequency,speakerField:field,speakerVoltage:2};let square=0,count=0;for(let i=0;i<2400;i++){speakerAdvance(s,1/12000);const p=speakerSample(s);maxResidual=Math.max(maxResidual,Math.abs(p.balance));check(Math.abs(p.balance)<1e-8,'speaker electromechanical energy');check(p.power>=0&&Number.isFinite(p.x),'speaker finite/nonnegative heating');if(i>1200){square+=p.x*p.x;count++;}}const p=speakerSample(s);check(!p.halted,'speaker small-signal range');if(frequency>=40){const theory=speakerResponse(s,frequency).displacement/Math.sqrt(2);check(Math.abs(Math.sqrt(square/count)-theory)/theory<.12,'speaker time/frequency agreement');}}
 for(const speed of [0,3,8,12])for(const load of [2,4,20]){const s={running:true,popup:1,open:1,windSpeed:speed,windLoad:load};for(let i=0;i<1200;i++){windAdvance(s,1/120);const p=windSample(s);maxResidual=Math.max(maxResidual,Math.abs(p.balance));check(Math.abs(p.balance)<1e-6,'wind shaft/load/heat energy');check(p.Cp>=0&&p.Cp<.593,'aero curve below Betz bound');check(p.omega>=0&&p.loadPower>=0,'wind positive rotation and output');}}
 const s={running:true,popup:1,open:1};for(let i=0;i<800;i++)windAdvance(s,1/120);const before=windSample(s).omega;s.windBrake=true;for(let i=0;i<800;i++)windAdvance(s,1/120);check(windSample(s).omega<before,'brake reduces speed');s.windConnected=false;check(windSample(s).loadPower===0,'open circuit no load power');
 for(const id of ['speaker','wind']){const s={running:false,popup:1,open:1};const before=JSON.stringify(deviceSample(s,id));if(id==='speaker')speakerAdvance(s,1);else windAdvance(s,1);check(before===JSON.stringify(deviceSample(s,id)),'paused device freezes');}
 return {passed:!failures.length,checks,maxResidual,failures,scope:'linear electromechanical speaker and bounded illustrative aerodynamic curve with averaged direct-drive generator; no sound-pressure, CFD or commercial power-curve claim; camera is static anatomy'};
}
const part=(title,english,text)=>({title,english,text});
export const SP_PARTS={
 sp_coil:part('音圈與磁隙','VOICE COIL & AIR GAP','電流通過磁場中的音圈，產生軸向力F=Bl·i；音圈移動也產生反電動勢Bl·v。這兩項使用同一Bl，電路與機械運動一起積分。位移在圖中放大6倍，數據仍是實際模型毫米。'),
 sp_cone:part('錐形振膜與防塵帽','CONE & DUST CAP','振膜與音圈連成一體，來回推動空氣。本頁呈現線性集總機電模型，沒有求聲壓或聆聽音量；不把振膜位移直接當成分貝，也不自動播放聲音。'),
 sp_suspension:part('懸邊與彈波','SURROUND & SPIDER','外緣懸邊和內側彈波讓音圈沿軸向移動，同時提供回復與耗散。圖中內緣隨振膜、外緣固定在盆架，保持實際接合；模型K與Rm是合併等效參數。'),
 sp_magnet:part('永久磁鐵與導磁極板','MAGNETIC CIRCUIT','環形磁鐵、背板、中央極柱和上極板形成磁路。音圈在環形磁隙內移動，不能碰到側壁。磁路強度同時影響推力和反電動勢，並非越強就保證振幅越大。'),
 sp_signal:part('訊號源、端子與柔性引線','SIGNAL & FLEXIBLE LEADS','正弦電壓驅動RL電路，輸入功率u·i可以有短暫回流。Re·i²為非負音圈發熱，電感、振膜慣性與懸吊彈性可暫存能量。切斷訊號後會保留衰減過程。'),
 sp_frame:part('盆架、定位耳與展示架','BASKET & SUPPORTS','固定磁路和盆架由側定位耳支承；柔性引線接在真正端子上。拆解先停止運作。此為原創剖面教具，時間0.015倍、位移6倍顯示，非製造尺寸或實測喇叭參數。')
};
export const WI_PARTS={
 wi_blades:part('三片葉片與變槳輪轂','BLADES & PITCH HUB','葉片靠氣動力帶動輪轂；改變槳距會改變教學氣動曲線。葉形有錐度與扭轉，但未進行葉素動量法或流場求解。風速、角速度與迎風面積共同決定軸功率。'),
 wi_drive:part('主軸與直驅軸承','DIRECT-DRIVE SHAFT','本座使用直驅：葉片與發電機轉子一對一轉動，沒有齒輪箱。主軸由前後軸承定位；模型保留轉子慣性，所以停風後還能滑行一段時間。'),
 wi_generator:part('永久磁鐵轉子與固定線圈','PERMANENT-MAGNET GENERATOR','12個交替磁極隨軸轉動，9組線圈固定在定子。模型採整流後平均等效e=ke·ω、τ電=ke·I；沒有模擬三相瞬時波形或完整電磁場。'),
 wi_load:part('整流器與電阻負載','RECTIFIER & RESISTIVE LOAD','負載接通時I=e/(Re+RL)，輸出P=I²RL，銅損=I²Re。電磁反力矩會影響轉速；開路可以轉得快，但負載取得的電功率為零。'),
 wi_brake:part('機械煞車與能量耗散','MECHANICAL BRAKE','煞車用等效黏滯力矩表示，將轉子能量轉成耗散。停風時電力仍可暫時來自轉子動能；不能把那一刻的電功率全算成當下風能。'),
 wi_nacelle:part('機艙、偏航承載與量測','NACELLE & SUPPORT','機艙固定在短塔柱上，可切換剖面查看發電機與軸承；風向標與風速計為靜態構造。沒有自動偏航控制，模型風向固定正對轉子。'),
 wi_tower:part('塔柱、法蘭與試驗尺度','TOWER & MODEL SCOPE','原創小型直驅教具，葉輪半徑0.6 m；圖形為展示比例。P風=½ρAv³，Cp為受限的示意曲線，並非商用機實測功率曲線、併網或風場預測。')
};
export const CA_PARTS={
 ca_lens:part('鏡筒、鏡組與光學玻璃','LENS BARREL & ELEMENTS','六片示意鏡片分成三個定位鏡組，壓環與間隔環把它們固定在筒身。這是光學機械構造剖面，不是可製造的光學處方；不模擬對焦、變焦或實際像差。'),
 ca_aperture:part('固定光圈與葉片','FIXED IRIS DIAPHRAGM','七片重疊葉片形成中央開口，外側驅動環與支點銷定位。此頁只展示固定構造與拆解，不會自動開合，也不提供假裝即時的曝光讀值。'),
 ca_mount:part('鏡頭接環、卡榫與接點','LENS MOUNT','法蘭、卡榫、定位鎖銷和電子接點，把鏡頭機械與電氣介面連到機身。接環內孔與鏡組同軸；拆解時沿光軸分開。'),
 ca_shutter:part('焦平面機械快門組','FOCAL-PLANE SHUTTER','本教具選擇含機械簾片的無反光鏡架構，快門組以靜態剖切呈現。並非所有無反光鏡相機都有相同快門；電子快門也可能由感光元件讀出控制。'),
 ca_sensor:part('感光元件、保護片與承載框','SENSOR PACKAGE','36×24 mm示意感光平面以比例畫出，前方有保護濾鏡和固定框。像素格紋僅表示陣列，沒有宣稱像素數、畫質或感光性能。'),
 ca_electronics:part('影像處理板與排線','PROCESSOR & FLEX CIRCUITS','感光元件產生的訊號交給主機板處理、儲存與輸出。晶片、記憶體、插座、排線與連接器以可辨認的零件呈現；沒有模擬拍攝或影像演算。'),
 ca_screen:part('電子觀景窗與後螢幕','EVF & REAR DISPLAY','無反光鏡架構的觀景窗使用電子顯示，不放單眼反光鏡。後螢幕、功能按鈕、模式轉盤與熱靴是靜態機身構造。'),
 ca_power:part('電池、記憶卡與艙門','POWER & STORAGE','電池與記憶卡沿各自插入方向拆出；接點與卡槽隨其承載結構定位。這一頁只有結構探索，沒有電池續航或資料傳輸動態。'),
 ca_frame:part('內骨架、底板與展示座','CHASSIS & TRIPOD MOUNT','承力骨架定位鏡頭、感光元件與各模組。展示座以底部三腳架介面支承相機；拆解後螺絲和壓環跟著自己的組件移動。'),
 ca_body:part('前後機殼與握把','BODY COVERS & GRIP','機身前殼有真正的鏡頭孔，握把內有電池空間。完整／剖開切換與拆解只改變觀看方式；相機不執行運作動畫。')
};
const chapter=(unit,n,label,title,subtitle,first,second,question,answer)=>({label,kicker:unit+' · 0'+n+' / '+label,title,subtitle,paragraphs:[first,second],figure:title+'構造',caption:second,note:'原創教學構造 · 點零件探索',question,answer,defaultExplode:0});
export const SP_CHAPTERS=[
 chapter('第七部',1,'構造','喇叭','THE MOVING-COIL LOUDSPEAKER','電流推動音圈，音圈帶動振膜。','從剖面查看磁路、音圈、懸邊與彈波；調整訊號頻率、電壓與磁路，觀察共同回應。','喇叭中的磁鐵也會跟著振膜移動嗎？','主要磁路固定，音圈與振膜沿磁隙軸向往復。'),
 chapter('第七部',2,'機電耦合','力與反電動勢','FORCE & BACK EMF','F=Bl·i，移動也回應電路。','不能只用電壓決定振膜位移；電感、反電動勢、慣性、彈性與耗散共同影響振幅與相位。','磁路越強，振膜一定移動越多嗎？','不一定；反電動勢也會增強，需看整個耦合系統。'),
 chapter('第七部',3,'振動','頻率改變，反應也改變','RESONANCE & RESPONSE','同樣電壓，不同頻率有不同振幅。','固定輸入電壓與磁路，只改頻率；對照電流、振膜位移與音圈發熱。圖中位移放大6倍。','振膜位移大，就能直接算出分貝嗎？','還需要輻射面積、聲學負載、距離與空間等條件；本頁不提供聲壓讀值。'),
 chapter('第七部',4,'能量','訊號停止後','STORED ENERGY & DECAY','電感與振動系統都能暫存能量。','切斷訊號，保留自由衰減；輸入功分到電磁與機械儲能、音圈發熱及機械／聲學耗散。','訊號源關閉，所有能量會立刻歸零嗎？','不會；原本儲存的磁能、動能與彈性能仍可交換並逐漸耗散。')
];
export const WI_CHAPTERS=[
 chapter('第八部',1,'構造','風力發電機','A DIRECT-DRIVE WIND TURBINE','葉片取風，主軸帶動發電機。','改風速、槳距和電阻負載，從機艙剖面追蹤風能、轉動與電力輸出的路徑。','這一座需要齒輪箱才能發電嗎？','不需要；本座採直驅，葉片與發電機轉子一對一轉動。'),
 chapter('第八部',2,'氣動','不是所有風能都能取走','WIND POWER & AERODYNAMIC CAPTURE','P風=½ρAv³，軸功率還要乘上Cp。','示意氣動曲線隨葉尖速比與槳距改變。固定條件比較風速，避免把立方關係當成實機所有風況下的輸出保證。','風速加倍，電力一定增加八倍嗎？','迎風功率有立方關係，但Cp、負載、損耗與運作條件也會改變。'),
 chapter('第八部',3,'負載','電力輸出會反過來影響轉速','GENERATOR LOAD & BACK TORQUE','負載取得電能，也給轉子反力矩。','切換接通／開路，觀察轉速與輸出；電流、銅損與負載功率由同一平均發電機模型計算。','開路轉得較快，是否代表輸出較大？','開路電流為零，負載取得的功率也為零。'),
 chapter('第八部',4,'能量','風停了，為何還在轉？','ROTOR INERTIA & ENERGY','轉子本身，是一個短暫的能量倉庫。','停風或施加煞車，觀察轉子動能的去向；比較風輸入、電能輸出、銅損、軸承與煞車耗散。','停風後短暫的電力，來自哪裡？','來自先前儲存在轉子中的轉動動能，而不是當下不存在的風輸入。')
];
export const CA_CHAPTERS=[
 chapter('第九部',1,'構造','相機','MIRRORLESS CAMERA ANATOMY','沿著光軸，看見機械與電子的分工。','這一頁只做靜態構造拆解：鏡頭、光圈、快門、感光元件與機身模組，點選零件閱讀說明。','沒有反光鏡，還能從觀景窗取景嗎？','可以；無反光鏡相機以感光元件訊號和電子顯示提供取景。'),
 chapter('第九部',2,'鏡頭','鏡片如何被定位？','OPTICAL CELLS & MOUNT','鏡片不是飄在鏡筒裡。','鏡組由鏡室、壓環、間隔環固定；接環、卡榫、鎖銷與接點把鏡頭連到機身。圖形不是可製造的光學處方。','拆解時，鏡片和壓環應往哪個方向分開？','沿光軸按組件順序分開，並辨認各鏡室與間隔定位。'),
 chapter('第九部',3,'成像','光圈、快門與感光元件','APERTURE, SHUTTER & SENSOR','控制光束、曝光時段，再轉成訊號。','固定光圈葉片、剖切快門組與保護片後的感光平面分層呈現；不加入對焦、快門或拍攝動畫。','所有無反光鏡機身都有這種機械快門嗎？','不是；有不同機械、電子前簾或電子快門架構，本座只示意其中一種構造。'),
 chapter('第九部',4,'電子與承載','從感光平面到儲存卡','SIGNAL PATH & CHASSIS','成像之外，還有處理、供電與承載。','查看主機板、排線、觀景窗、螢幕、電池與記憶卡；內骨架維持鏡頭與感光元件的相對定位。','後螢幕、感光元件與處理板是同一片零件嗎？','不是；它們是功能不同的模組，透過連接介面協同工作。')
];
