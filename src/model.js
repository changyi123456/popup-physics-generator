export const SPEC = Object.freeze({ area: .008, coilResistance: 4, lampResistance: 22, gearRatio: 3, crankTeeth: 60, rotorTeeth: 20, module: .75, pressureAngle: 20 * Math.PI / 180, demonstrationScale: .18, defaultRpm: 40, defaultTurns: 120, defaultField: .45 });
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const follow = (v, target, dt, seconds = .28) => v + (target - v) * (1 - Math.exp(-dt / seconds));
export const fmt = (n, digits = 2) => (Math.abs(n) < .5 * 10 ** -digits ? 0 : n).toFixed(digits);
export function sample(state = {}) {
  const turns = state.turns ?? SPEC.defaultTurns, field = (state.field ?? SPEC.defaultField) * (state.polarity ?? 1), theta = state.phase ?? 0, rpm = state.rpm ?? SPEC.defaultRpm;
  const motion = !!((state.running || state.manualActive) && (state.explode ?? 0) < .025 && (state.popup ?? 1) > .95 && (state.open ?? 1) > .95);
  const settingOmega = (state.direction ?? 1) * rpm * SPEC.gearRatio * Math.PI / 30, omega = motion ? settingOmega : 0;
  const linkage = turns * field * SPEC.area * Math.cos(theta), emf = turns * field * SPEC.area * omega * Math.sin(theta);
  const connected = state.load !== false, current = connected ? emf / (SPEC.coilResistance + SPEC.lampResistance) : 0;
  const terminalVoltage = connected ? current * SPEC.lampResistance : emf, torque = -turns * field * SPEC.area * current * Math.sin(theta);
  const mechanicalPower = -torque * omega, loadPower = current * current * SPEC.lampResistance, copperLoss = current * current * SPEC.coilResistance;
  const peak = Math.abs(turns * field * SPEC.area * settingOmega);
  const frequency=Math.abs(settingOmega)/(Math.PI*2), settingPeakPower=connected?peak*peak*SPEC.lampResistance/(SPEC.coilResistance+SPEC.lampResistance)**2:0;
  return { turns, field, theta, rpm, rotorRpm: rpm * SPEC.gearRatio, motion, omega, linkage, flux: field * SPEC.area * Math.cos(theta), emf, current, terminalVoltage, torque, mechanicalPower, loadPower, copperLoss, peak, frequency, settingPeakPower, cycleEnergy:frequency?settingPeakPower/(2*frequency):0, energy:state.energy||{load:0,copper:0,input:0}, rms: peak / Math.SQRT2,
    meanLoadPower: connected && motion ? (turns * field * SPEC.area * omega) ** 2 * SPEC.lampResistance / (2 * (SPEC.coilResistance + SPEC.lampResistance) ** 2) : 0, residual: mechanicalPower - loadPower - copperLoss };
}
// Exact work over a constant-parameter angular step. Physical seconds, not slowed display seconds.
export function energyStep(state, from, to, physicalDt) {
  if(state.load===false||physicalDt<=0||Math.abs(to-from)<1e-12)return {load:0,copper:0,input:0};
  const omega=(to-from)/physicalDt, turns=state.turns??SPEC.defaultTurns, field=state.field??SPEC.defaultField;
  const amplitude=turns*field*SPEC.area*omega/(SPEC.coilResistance+SPEC.lampResistance);
  const integral=Math.max(0,physicalDt/2-(Math.sin(2*to)-Math.sin(2*from))/(4*omega));
  const load=amplitude*amplitude*SPEC.lampResistance*integral,copper=amplitude*amplitude*SPEC.coilResistance*integral;
  return {load,copper,input:load+copper};
}
export const PARTS = {
  measurements: {title:'立體量測圖',english:'SPATIAL MEASUREMENTS',text:'三根圓柱即時顯示磁通量、感應電壓與負載功率。磁通量與電壓可跨過零點；負載功率永不為負。功率隨時間累積成底部的電能讀值，單位為焦耳。'},
  coil: { title: '旋轉線圈', english: 'ROTATING COIL', text: '線圈每匝面積為 80 cm²。轉動改變線圈法線相對左→右參考方向的角度 θ，磁通量為 BA cosθ。匝數由書頁設定；圖中的導線束代表多匝繞組。' },
  magnets: { title: '永久磁鐵與磁極', english: 'NORTH & SOUTH', text: 'N、S 兩極在氣隙內建立磁場。把磁極交換，磁通量與感應電壓的符號都會反轉。細線表示磁場方向，並非實體導線。' },
  gears: { title: '增速齒輪與搖柄', english: 'CRANK & GEARS', text: '60 齒手搖齒輪帶動 20 齒轉軸齒輪，線圈轉速為搖柄的三倍，兩齒輪反向旋轉。直接拖動搖柄即可發電。' },
  rings: { title: '集電環與電刷', english: 'SLIP RINGS', text: '兩個完整集電環分別連接線圈的兩端，跟著轉軸旋轉；固定的碳刷接觸環面，把交變電壓接到外部電路。集電環不會把交流整流成直流。' },
  bearing: { title: '轉軸與軸承', english: 'SHAFT & BEARINGS', text: '兩個軸承座讓轉軸保持同軸，定位環限制軸向移動。線圈、轉軸、小齒輪及集電環共用相同角度。' },
  lamp: { title: '燈泡與負載開關', english: 'ELECTRICAL LOAD', text: '接通負載才有外部電流。線圈電阻 4 Ω，燈泡以固定 22 Ω 電阻近似；機械輸入功率分成燈泡功率與線圈發熱。點燈泡可切換負載。' },
  meter: { title: '零中心電壓表', english: 'INDUCED EMF', text: '指針讀取線圈的感應電動勢 ε，可向左右偏轉。書頁同時顯示磁通鏈與電壓；兩者相差四分之一週期。' },
  base: { title: '實驗底座與支架', english: 'EXPERIMENT STAND', text: '絕緣底板、磁極支架、軸承座與接線柱共同支承整台教具。拆解時先停轉，將線圈、磁極、電刷與傳動組沿各自方向展開。' }
};
export const CHAPTERS = [
 {label:'構造', kicker:'01 / 轉動，開始有了電', title:'手搖發電機', subtitle:'TURN MOTION INTO ELECTRICITY', paragraphs:['你的手，如何點亮一盞燈？','搖柄透過齒輪帶動線圈。線圈在磁場中旋轉，兩端產生交變電壓；集電環與電刷把它接到外部電路。'], caption:'直接拖動搖柄；也可以點「自動轉動」。', figure:'旋轉線圈交流發電機', note:'拖搖柄發電 · 點零件閱讀 · 拖空白處環視', defaultExplode:0, question:'線圈不轉了，還會持續發電嗎？', answer:'磁場保持不變且線圈停止時，感應電壓為零。'},
 {label:'感應', kicker:'02 / 從角度到磁通量', title:'改變，才有感應', subtitle:'FARADAY’S LAW IN MOTION', paragraphs:['感應取決於變化，不只取決於磁場。','θ 從固定的左→右方向量起。磁通量最大時，瞬間的變化率為零；轉過四分之一圈，感應電壓才達峰值。'], caption:'在同一角度比較轉向；交換磁極也會反轉電壓。', figure:'磁場 × 線圈 × 角度', note:'青灰細線為磁場示意 · θ 為法線相對左→右方向的角度', defaultExplode:0, question:'磁通量最大，感應電壓也最大嗎？', answer:'不是；勻速轉動時，兩者相差四分之一週期。'},
 {label:'週期', kicker:'03 / 同一圈，對照三種變化', title:'一圈，兩次高峰', subtitle:'FLUX · VOLTAGE · ELECTRICAL POWER', paragraphs:['電流換了方向，燈泡仍持續得到能量。','磁通量與感應電壓相差四分之一週期。負載功率 P = I²R，每一圈有兩次高峰，對應每秒輸出的電能。'], caption:'Φ、ε 的週期為 T；電阻負載功率的週期為 T/2。', figure:'磁通量 → 電壓 → 電能輸出', note:'同一條游標對齊三個量 · 每圈兩次功率高峰', defaultExplode:0, question:'電流反向時，燈泡會把能量送回去嗎？', answer:'電阻負載的 I²R ≥ 0，兩個半週都接收電能。'},
 {label:'能量', kicker:'04 / 電，不是憑空出現', title:'燈亮了，誰出力？', subtitle:'ENERGY HAS TO COME FROM SOMEWHERE', paragraphs:['接通負載，手就得提供機械功。','有電流時，線圈受到反抗旋轉的電磁扭矩。維持相同轉速，需要持續做功；能量成為燈泡的熱與光，以及線圈發熱。'], caption:'本模型忽略摩擦與電感；燈泡以固定電阻近似。', figure:'機械功 → 電能 → 熱與光', note:'點燈泡或書頁開關，比較開路與接通負載', defaultExplode:0, question:'開路仍有電壓，燈泡為什麼不亮？', answer:'開路電流為零，負載功率 I²R 也為零。'}
];
export function auditModel() {
 const failures=[]; let checks=0; const check=(v,label)=>{checks++;if(!v)failures.push(label);};
 const base={running:true,explode:0,popup:1,phase:Math.PI/2,rpm:40}, ref=sample(base);
 check(SPEC.crankTeeth/SPEC.rotorTeeth===SPEC.gearRatio,'gear ratio');
 check(Math.abs(ref.peak-120*.45*.008*4*Math.PI)<1e-12,'reference peak emf');
 check(Math.abs(sample({...base,phase:0}).emf)<1e-12,'flux maximum gives zero emf');
 check(Math.abs(ref.linkage)<1e-12,'emf maximum gives zero flux linkage');
 check(sample({...base,running:false}).emf===0,'stationary coil has zero emf');
 check(sample({...base,load:false}).current===0,'open circuit current');
 check(sample({...base,load:false}).terminalVoltage===ref.emf,'open circuit voltage');
 check(Math.abs(sample({...base,turns:240}).peak/ref.peak-2)<1e-12,'turn scaling');
 check(Math.abs(sample({...base,field:.9}).peak/ref.peak-2)<1e-12,'field scaling');
 check(sample({...base,turns:240}).frequency===ref.frequency,'turns do not set frequency');
 const cycle=energyStep(base,0,Math.PI*2,1/ref.frequency),reverseCycle=energyStep(base,0,-Math.PI*2,1/ref.frequency);
 check(Math.abs(cycle.load-ref.cycleEnergy)<1e-12,'one-cycle electrical energy');
 check(Math.abs(cycle.input-cycle.load-cycle.copper)<1e-12,'integrated energy balance');
 check(Math.abs(energyStep(base,0,Math.PI,.5/ref.frequency).load-cycle.load/2)<1e-12,'two equal power lobes per cycle');
 check(Math.abs(reverseCycle.load-cycle.load)<1e-12,'reversed energy remains positive');
 check(energyStep({...base,load:false},0,Math.PI*2,1).load===0,'open circuit energy');
 check(energyStep(base,.8,.8,1).input===0,'stationary coil transfers no work');
 for(const polarity of [-1,1])for(const direction of [-1,1])for(let k=0;k<120;k++){
  const phase=k*Math.PI/60,s={...base,phase,polarity,direction},p=sample(s),dt=1e-6;
  const derivative=-(sample({...s,phase:phase+p.omega*dt}).linkage-sample({...s,phase:phase-p.omega*dt}).linkage)/(2*dt);
  check(Math.abs(p.emf-derivative)<1e-7,'Faraday derivative');check(Math.abs(p.residual)<1e-10,'energy balance');
  check(p.torque*p.omega<=1e-12,'Lenz torque opposes motion');check(Math.abs(p.emf+sample({...s,direction:-direction}).emf)<1e-12,'reverse velocity');check(Math.abs(p.emf+sample({...s,polarity:-polarity}).emf)<1e-12,'reverse field');
 }
 return {passed:!failures.length,failures,checks,peakEmf:ref.peak,frequency:ref.frequency,scope:'uniform field, resistive circuit, Faraday derivative, signed motion, energy balance; not manufacturing geometry'};
}
const involute = (r, base) => r <= base ? 0 : Math.sqrt((r / base) ** 2 - 1) - Math.acos(base / r);
export function gearProfile(teeth, module = 1, internal = false) {
  const pitch = teeth * module / 2, base = pitch * Math.cos(SPEC.pressureAngle);
  const tip = internal ? pitch - module : pitch + module;
  const root = internal ? pitch + 1.25 * module : pitch - 1.25 * module;
  const invPitch = involute(pitch, base), step = Math.PI * 2 / teeth;
  const half = r => Math.PI / (2 * teeth) + (internal ? -invPitch + involute(r, base) : invPitch - involute(r, base)) - 0.035 / pitch;
  const points = [];
  const point = (a, r) => points.push([Math.cos(a) * r, Math.sin(a) * r]);
  for (let i = 0; i < teeth; i++) {
    const c = i * step;
    point(c - step / 2, root);
    if (internal) {
      for (let j = 0; j <= 8; j++) { const rr = root + (tip - root) * j / 8; point(c - half(rr), rr); }
      for (let j = 1; j <= 4; j++) point(c - half(tip) + 2 * half(tip) * j / 4, tip);
      for (let j = 1; j <= 8; j++) { const rr = tip + (root - tip) * j / 8; point(c + half(rr), rr); }
    } else {
      point(c - half(base) - 0.024, root);
      for (let j = 0; j <= 8; j++) { const rr = Math.max(base, root) + (tip - Math.max(base, root)) * j / 8; point(c - half(rr), rr); }
      for (let j = 1; j <= 4; j++) point(c - half(tip) + 2 * half(tip) * j / 4, tip);
      for (let j = 1; j <= 8; j++) { const rr = tip + (Math.max(base, root) - tip) * j / 8; point(c + half(rr), rr); }
      point(c + half(base) + 0.024, root);
    }
    point(c + step / 2, root);
  }
  return points;
}

