import * as THREE from "./vendor/three.module.js";
import { SPEC, energyStep, fmt, smooth, follow, clamp, auditModel } from "./model.js";
import { CHAPTERS, PARTS, SUBJECTS, BOOK_SPREADS, HISTORIES, subjectAt, partsFor, sample, parametersFor, switchesFor, measurementsFor, benchValues, benchPlot } from "./library.js";
import { ST_SPEC, stSample, stThermo, stAdvance, stNudge, auditStirling } from "./stirling-model.js";
import { G_SPEC, govAdvance, auditGovernor } from "./governor-model.js";
import { E_SPEC, eddySample, eddyAdvance, eddyKick, auditEddy } from "./eddy-model.js";
import { createGovernor } from "./governor.js";
import { createEddy } from "./eddy.js";
import { createStirling } from "./stirling.js";
import { createDataCharts } from "./charts.js";
import { createGenerator } from "./generator.js";
import { createBook } from "./book.js";
import { createMagnifier } from "./lens.js";
import { paperMaterial, inkEdges } from "./ink.js";

const $ = selector => document.querySelector(selector);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let rememberedTheme = "light";
try { rememberedTheme = localStorage.getItem("generator-book:theme") || "light"; } catch {}
const initialHash=location.hash.match(/^#(generator|stirling|governor|eddy)(?:-([1-4]|history))?$/),initialSubject=SUBJECTS.find(s=>s.id===initialHash?.[1])||SUBJECTS[0],initialChapter=initialSubject.start+(initialHash?.[2]==='history'?0:Number(initialHash?.[2]??1)-1);
const state = {
  chapter: initialChapter,bookPage:SUBJECTS.indexOf(initialSubject)*2+(initialHash?.[2]==='history'?1:0),history:initialHash?.[2]==='history',govSupply:85,govLoad:12,govMass:180,govFeedback:true,govStep:false,govVectors:true,govOmega:0,govTheta:G_SPEC.thetaMin,govVelocity:0,govEnergy:{load:0,input:0,loss:0},eddyRpm:240,eddyField:.45,eddyInsertion:20,eddyMagnet:true,eddySlots:false,eddyMaterial:'aluminum',eddyShowFlow:true,eddyDirection:1,eddyOmega:0,eddyElapsed:0,eddyEnergy:{heat:0,bearing:0,input:0},pageTurnProgress:0, hotC:320,coldC:25,brake:35,heater:true,section:true,brakeEngaged:true,stOmega:0,stEnergy:{gas:0,load:0,friction:0,kick:0}, rpm: 40, turns: 120, field: .45, direction: 1, polarity: 1, load: true, showField: true, manualActive: false, showCharts: true, energy: {load:0,copper:0,input:0}, theme: rememberedTheme,
  popup: reduced&&initialHash?.[2]!=='history' ? 1 : 0, popupTarget: initialHash?.[2]==='history'?0:1, explode: 0, explodeTarget: 0,
  running: false, phase: initialSubject.id==='stirling'?2:.8, yaw: 0, yawTarget: 0, zoom: 1, zoomTarget: 1,
  selected: null, touchedAt: performance.now(), turning: false, open: reduced ? 1 : 0, bookOpenTarget: 1,
  view: "book", cameraYaw: -.52, cameraYawTarget: -.52,
  cameraElevation: 0.73, cameraElevationTarget: 0.73,
  cameraRadius: 645, cameraRadiusTarget: 645,
  targetX: 25, targetY: 18, targetZ: 0, targetToX: 25, targetToY: 18, targetToZ: 0,
  lensEnabled: false, flap: 0, flapTarget: 0
};
document.body.dataset.theme = state.theme;
await document.fonts.load('400 18px "Book Hand"');
const machines={generator:createGenerator(),stirling:createStirling(),governor:createGovernor(),eddy:createEddy()},book=createBook(),chart=createDataCharts(),scene=new THREE.Scene();
let machine=machines[subjectAt(state.chapter).id];const subjectPhases={generator:.8,stirling:2,governor:.8,eddy:.8};
const subjectId=()=>subjectAt(state.chapter).id;
function activateMachine(){const id=subjectAt(state.chapter).id;machine=machines[id];for(const [key,m] of Object.entries(machines))m.root.visible=key===id&&!state.history;}
activateMachine();
book.attachRight(chart.root);
scene.add(book.group, ...Object.values(machines).map(m=>m.root));
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 1, 2400);
const canvas = $("#world"), pointer = new THREE.Vector2(), ray = new THREE.Raycaster();
const yawMatrix = new THREE.Matrix4();
let renderer = null, webgl = true;
const floorMat = new THREE.MeshStandardMaterial({ color: "#f0e8d3", roughness: 1, metalness: 0 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.y = -10.8; floor.receiveShadow = true; scene.add(floor);
const wood = document.createElement("canvas"); wood.width = 1024; wood.height = 512;
const woodCtx = wood.getContext("2d");
woodCtx.fillStyle = "#eee7d4"; woodCtx.fillRect(0, 0, 1024, 512);
for (let i = 0; i < 2300; i++) {
  const y = (i * 47.23) % 512, light = 110 + (i * 37 % 70);
  woodCtx.strokeStyle = "rgba(" + light + "," + (light - 9) + "," + (light - 27) + ",.018)";
  woodCtx.lineWidth = 0.3 + (i % 5) * 0.14; woodCtx.beginPath();
  woodCtx.moveTo(0, y); woodCtx.bezierCurveTo(350, y + Math.sin(i) * 3, 710, y - Math.cos(i) * 4, 1024, y); woodCtx.stroke();
}
const woodTexture = new THREE.CanvasTexture(wood); woodTexture.colorSpace = THREE.SRGBColorSpace;
woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping; woodTexture.repeat.set(3, 9);
floorMat.map = woodTexture;
const padShape = new THREE.Shape(), pw = 560, pd = 335, pr = 15;
padShape.moveTo(-pw / 2 + pr, -pd / 2); padShape.lineTo(pw / 2 - pr, -pd / 2); padShape.quadraticCurveTo(pw / 2, -pd / 2, pw / 2, -pd / 2 + pr);
padShape.lineTo(pw / 2, pd / 2 - pr); padShape.quadraticCurveTo(pw / 2, pd / 2, pw / 2 - pr, pd / 2);
padShape.lineTo(-pw / 2 + pr, pd / 2); padShape.quadraticCurveTo(-pw / 2, pd / 2, -pw / 2, pd / 2 - pr);
padShape.lineTo(-pw / 2, -pd / 2 + pr); padShape.quadraticCurveTo(-pw / 2, -pd / 2, -pw / 2 + pr, -pd / 2);
const padGeo = new THREE.ExtrudeGeometry(padShape, { depth: 1.7, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.4, bevelSegments: 3, curveSegments: 12 });
padGeo.rotateX(-Math.PI / 2);
const padMat = paperMaterial("#c5d1b1", 2.3);
const pad = new THREE.Mesh(padGeo, padMat); pad.position.set(0, -10.5, 4); pad.castShadow = pad.receiveShadow = true; scene.add(pad);
inkEdges(pad, "#647657", 0.68);
const hemi = new THREE.HemisphereLight("#f4f3e8", "#485444", 0.95);
scene.add(hemi);
const key = new THREE.DirectionalLight("#fff6e0", 2.15);
key.position.set(-150, 280, -180); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -280; key.shadow.camera.right = 280;
key.shadow.camera.top = 250; key.shadow.camera.bottom = -250;
key.shadow.camera.near = 20; key.shadow.camera.far = 800;
key.shadow.bias = -0.00025; key.shadow.normalBias = 0.3; key.shadow.radius = 3;
scene.add(key);
const fill = new THREE.DirectionalLight("#e8efef", 0.65); fill.position.set(170, 150, 180); scene.add(fill);

function environment() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#25362d"; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#505b4c"; ctx.fillRect(0, 0, 1024, 250);
  ctx.filter = "blur(15px)";
  ctx.fillStyle = "#ffffff"; ctx.fillRect(120, 38, 130, 125); ctx.fillRect(630, 20, 170, 155);
  ctx.fillStyle = "#f7e4ba"; ctx.fillRect(350, 85, 90, 80);
  ctx.fillStyle = "#27372d"; ctx.fillRect(220, 270, 270, 200); ctx.fillRect(820, 230, 130, 220);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  scene.environmentIntensity = 1.25; tex.dispose(); pmrem.dispose();
}
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  environment();
} catch (error) {
  webgl = false; document.body.classList.add("no-webgl"); $("#fallback").hidden = false;
  ["#popup", "#explode", "#play", "#reset", "#explode-range", "#magnify", "#book-fold", "#guide"].forEach(s => $(s).disabled = true);
  $$("[data-view]").forEach(b => b.disabled = true);
  document.body.classList.add("ready"); window.__generatorReady = true; $("#loading").setAttribute("aria-hidden", "true");
}
const viewProfiles = {
  book: { x: 25, y: 18, z: 0, r: 645, elevation: .73, yaw: -.52 },
  reading: { x: 25, y: 10, z: 0, r: 645, elevation: 1.02, yaw: -.45 },
  charts: {x:145,y:35,z:0,r:390,elevation:.63,yaw:-.62},
  mechanism: { x: 99, y: 44, z: 0, r: 285, elevation: 0.61, yaw: 0.25 }
};
let introSkipped = reduced, guideClock = null, guideStep = -1;
function setView(name, fromGuide = false) {
  const p = {...viewProfiles[name]}; if (!viewProfiles[name]) return; hideLens();
  if(subjectId()==='stirling'||subjectId()==='governor'){if(name==='mechanism'){p.y=subjectId()==='governor'?65:58;p.r=350;p.yaw=-.55;}if(name==='charts'){p.y=50;p.r=460;p.yaw=-.62;}}if(subjectId()==='eddy'&&name==='mechanism'){p.y=48;p.r=310;p.yaw=.12;}
  state.view = name; state.targetToX = p.x; state.targetToY = p.y; state.targetToZ = p.z;
  state.cameraRadiusTarget = p.r; state.cameraElevationTarget = p.elevation; state.cameraYawTarget = p.yaw;
  if (name === "mechanism") { state.targetToY = (subjectId()==='governor'?65:subjectId()==='stirling'?58:43) + 42 * state.explodeTarget; state.cameraRadiusTarget = (subjectId()==='governor'?350:subjectId()==='stirling'?330:subjectId()==='eddy'?310:290) + 135 * state.explodeTarget; }
  if (innerWidth < 700) { state.targetToX=name==='book'?25:name==='charts'?145:name==='reading'?-80:99; state.targetToY = name === "book" ? 35 : p.y; state.cameraRadiusTarget = name === "book" ? 1200 : name === "reading" ? 380 : name === "charts" ? 850 : 420; state.cameraElevationTarget = name === "reading" ? 1.1 : 0.7; }
  else if (name !== "mechanism") {
    const rect = canvas.getBoundingClientRect();
    state.cameraRadiusTarget *= Math.max(1, 1.5 / (rect.width / rect.height));
  }
  state.zoomTarget = 1;
  $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
  if (!fromGuide) stopGuide();
}
function stopGuide() { guideClock = null; guideStep = -1; $("#guide").setAttribute("aria-pressed", "false"); }
function resize() {
  const box = $("#scene").getBoundingClientRect(), aspect = box.width / box.height, phone = box.width < 700;
  camera.aspect = aspect;
  camera.updateProjectionMatrix(); renderer?.setSize(box.width, box.height, false);
  if (phone && state.view === "book") { state.targetToX=25;state.targetToY=30;state.targetToZ=0;state.cameraRadiusTarget=1200; }
  else if (!phone && state.view !== "mechanism") state.cameraRadiusTarget = viewProfiles[state.view].r * Math.max(1, 1.5 / aspect);
  if (phone && renderer) key.shadow.mapSize.set(1024, 1024);
  renderOnce();
}
function applyTheme() {
  const dark = state.theme === "dark"; document.body.dataset.theme = state.theme;
  scene.background = new THREE.Color(dark ? "#303a2e" : "#eae4d0");
  floorMat.color.set(dark ? "#515a43" : "#fff8e6");
  padMat.color.set(dark ? "#64704f" : "#c5d1b1");
  hemi.intensity = dark ? 1.0 : 1.5;
  key.intensity = dark ? 1.65 : 2.15;
  fill.intensity = dark ? 0.9 : 1.3;
  scene.environmentIntensity = dark ? 0.85 : 1.25;
  $("#theme-toggle").setAttribute("aria-label", dark ? "切換為日間主題" : "切換為夜間主題");
}
function announce(s) { $("#announcement").textContent = s; }
function selectPart(part) {
  if(state.turning)return;
  if(state.history)commitBookPage(state.bookPage-1,true);
  state.selected = state.selected === part ? null : part;
  state.popupTarget = 1; state.bookOpenTarget = 1;
  machine.select(state.selected); paint();
  if (state.selected) setView(state.selected==='measurements'?'charts':'mechanism');
  if (state.selected) announce(PARTS[state.selected].title + "：" + PARTS[state.selected].text);
}
function touch() { state.touchedAt = performance.now(); introSkipped = true; stopGuide(); }
function accumulateEnergy(from,to,seconds){const step=energyStep(state,from,to,seconds);for(const key of ['load','copper','input'])state.energy[key]+=step[key];}
function liveValues() {
 const p=sample(state);
 if(subjectId()==='governor'||subjectId()==='eddy'){const v=benchValues(state,p);for(const e of document.querySelectorAll('[data-bench-live]'))e.textContent=v[e.dataset.benchLive]??'';const dot=$('#reader-bench-dot');if(dot){const q=benchPlot(state,p);dot.setAttribute('cx',String(75+clamp(q.live[0],0,1)*470));dot.setAttribute('cy',String(245-clamp(q.live[1],0,1)*185));}return;}
 if(subjectId()==='stirling'){const values={pressure:fmt(p.pressure/1000,1)+' kPa',volume:fmt(p.volume*1e6,2)+' mL',power:fmt(p.loadPower,3)+' W',rpm:fmt(p.rpm,0)+' rpm',energy:fmt(p.energy.load,3)+' J',gasPower:fmt(p.gasPower,3)+' W',friction:fmt(p.frictionPower,3)+' W',kinetic:fmt(p.kinetic,3)+' J',angle:fmt(((state.phase%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*180/Math.PI,0)+'°'};for(const e of document.querySelectorAll('[data-st-live]'))e.textContent=values[e.dataset.stLive]??'';const dot=$('#reader-pv-dot');if(dot){dot.setAttribute('cx',String(70+(p.volume-p.cycle.minV)/(p.cycle.maxV-p.cycle.minV)*460));dot.setAttribute('cy',String(250-(p.pressure-p.cycle.minP)/(p.cycle.maxP-p.cycle.minP)*190));}return;}
 for(const e of document.querySelectorAll('[data-live]')){const key=e.dataset.live;e.textContent=key==='angle'?fmt(((state.phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2))*180/Math.PI,0)+'°':key==='flux'?fmt(p.flux*1000,2)+' mWb':key==='energy'?fmt(p.energy.load,3)+' J':key==='input-energy'?fmt(p.energy.input,3)+' J':key==='power'?fmt(p.loadPower,3)+' W':key==='current'?fmt(p.current,3)+' A':fmt(p.emf)+' V';}
 const a=((state.phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2),cx=80+a/(Math.PI*2)*500;
 for(const [id,cy] of [['reader-flux-dot',65-(state.polarity??1)*Math.cos(a)*27],['reader-volt-dot',155-(p.motion?p.emf/Math.max(p.peak,1e-9):0)*27],['reader-power-dot',276-(p.settingPeakPower?p.loadPower/p.settingPeakPower:0)*55]]){const dot=$('#'+id);if(dot){dot.setAttribute('cx',String(cx));dot.setAttribute('cy',String(cy));}}
 const cursor=$('#reader-cycle-cursor');if(cursor)cursor.setAttribute('d','M'+cx+' 30V291');

}
function paint() {
 const id=subjectId(),thermal=id==='stirling',bench=id==='governor'||id==='eddy',p=sample(state),ch=CHAPTERS[subjectAt(state.chapter).start],hist=HISTORIES[id];
 $('#scene').setAttribute('aria-label',state.history?hist.kicker+'，純紙面手繪圖與時間軸；拖書角翻頁':'攤開的手繪物理書，'+subjectAt(state.chapter).title+'從右頁立起，旁邊有即時圓柱；拖書角翻頁');document.body.dataset.history=String(state.history);for(const e of $$("[data-view='mechanism'],[data-view='charts'],#guide"))e.disabled=state.history||!webgl;
 document.body.dataset.subject=id;document.title='物理之書 — '+subjectAt(state.chapter).title;
 for(const [key,cls] of Object.entries({generator:'.generator-controls',stirling:'.thermal-controls',governor:'.governor-controls',eddy:'.eddy-controls'}))$$(cls).forEach(e=>e.hidden=key!==id);
 book.draw(state);
 $('#popup').setAttribute('aria-pressed',String(state.popupTarget>.5));$('#popup span').textContent=state.popupTarget>.5?'收回紙面':'浮出圖解';
 $('#explode').setAttribute('aria-pressed',String(state.explodeTarget>.55));$('#explode span').textContent=state.explodeTarget>.55?'組裝':'分解';
 $('#play').setAttribute('aria-pressed',String(state.running));$('#play span').textContent=state.running?'暫停':({generator:'自動轉動',stirling:'啟動熱機',governor:'啟動調速器',eddy:'起轉後放手'})[id];$('#play use').setAttribute('href',state.running?'#i-pause':'#i-play');
 $('#explode-range').value=Math.round(state.explodeTarget*100);$('#explode-label').textContent=Math.round(state.explodeTarget*100)+'%';
 for(const q of parametersFor(state)){const input=$('#'+q.action);if(input)input.value=state[q.action];const out=$('#'+q.action+'-label');if(out)out.textContent=(q.step<1?fmt(state[q.action]):state[q.action])+q.unit;}
 for(const q of switchesFor(state)){const b=$('#'+q.action);if(b){b.textContent=q.label;b.setAttribute('aria-pressed',String(q.active));}}
 $('#field-view').setAttribute('aria-pressed',String(state.showField));$('#section').textContent=state.section?'剖面：打開':'剖面：關閉';$('#section').setAttribute('aria-pressed',String(state.section));$('#chart-toggle').setAttribute('aria-pressed',String(state.showCharts));$('#eddy-material').textContent=state.eddyMaterial==='copper'?'材質：銅 Cu':'材質：鋁 Al';
 $('#time-scale').textContent=id==='generator'?'0.18 倍時間演示；讀值為物理轉速。':id==='stirling'?'0.24 倍時間演示；啟動含手推起轉，轉速由溫差與負載決定。':id==='governor'?'0.24 倍時間演示；旋轉與套筒共同作動，回授不代表完全恆速。':'0.24 倍時間演示；手推後自然減速，發熱不誇大為高溫。';
 $('#page-number').textContent=String(state.bookPage+1).padStart(2,'0')+' / '+BOOK_SPREADS.length;$('#previous').disabled=state.bookPage===0;$('#next').disabled=state.bookPage===BOOK_SPREADS.length-1;
 $('#chapter-caption').textContent=state.history?hist.kicker:ch.kicker;
 const detail=state.selected&&PARTS[state.selected];$('#status').textContent=state.history?hist.kicker+' · 拖書角繼續翻閱':detail?detail.title:subjectAt(state.chapter).title+' · '+(state.running?'實驗進行中':'拖右下書角翻頁 · 直接點書頁操作');
 paintReader();
 const live=bench?'轉速 <span data-bench-live="rpm"></span><br>'+(id==='governor'?'套筒升程 <span data-bench-live="lift"></span>':'發熱功率 <span data-bench-live="power"></span>'):thermal?'轉速 <span data-st-live="rpm"></span><br>機械輸出 <span data-st-live="power"></span>':state.rpm+' rpm → 線圈 '+p.rotorRpm+' rpm<br>感應電壓 <span data-live="emf"></span>';
 $('#mobile-chapter').innerHTML='<div class="mobile-unit">'+subjectAt(state.chapter).unit+' · '+(state.bookPage+1)+' / '+BOOK_SPREADS.length+'</div><h1>'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs[1]+'</p><div class="mobile-ratio">'+live+'</div>';
 $('#mobile-page-label').textContent=(state.bookPage+1)+' / '+BOOK_SPREADS.length;$('#mobile-previous').disabled=state.bookPage===0;$('#mobile-next').disabled=state.bookPage===BOOK_SPREADS.length-1;
 if(state.history)$('#mobile-chapter').innerHTML=historyHTML(hist);$('#mobile-read').textContent=state.history?'查看科學史與資料來源 →':'展開完整說明 →';
 if(!webgl){$('#fallback img').src=$('#'+id+'-fallback').textContent;$('#fallback img').alt=subjectAt(state.chapter).title+'的機械結構示意';$('#fallback h1').textContent=ch.title;$('#fallback p').textContent=state.history?hist.intro+' '+hist.story+' '+hist.events.map(e=>e.join('：')).join(' '):ch.paragraphs.join(' ');$('#fallback img').hidden=state.history;$('#fallback-history').hidden=!state.history;if(state.history)$('#fallback h1').textContent=hist.title;}
 liveValues();
}
function historyHTML(h){return '<div class="mobile-unit">'+h.kicker+'</div><h1>'+h.title+'</h1><div class="english">'+h.subtitle+'</div><p>'+h.intro+'</p><p>'+h.story+'</p>'+h.events.map(e=>'<h2>'+e[0]+' · '+e[1]+'</h2><p>'+e[2]+'</p>').join('')+'<h2>'+h.bridgeTitle+'</h2><p>'+h.bridge+'</p><p>'+h.question+'</p><div class="history-links">'+h.sources.map(([label,url])=>'<a href="'+url+'" target="_blank" rel="noreferrer">'+label+' ↗</a>').join('')+'</div>';}
function showHistory(){touch();$('#history-content').innerHTML=historyHTML(HISTORIES[subjectId()]);$('#history-notes').showModal();}
$('#history-sources').addEventListener('click',showHistory);$('#fallback-history').addEventListener('click',showHistory);$('#history-close').addEventListener('click',()=>$('#history-notes').close());
const reader=$('#reader'),accessibleControls=$('#book-accessible-controls');accessibleControls.className='reader-controls';accessibleControls.hidden=false;reader.insertBefore(accessibleControls,$('.sources'));
function paintThermalReader(){
 const ch=CHAPTERS[state.chapter],p=sample(state),c=p.cycle,points=[];
 for(let j=0;j<=180;j++){const q=stThermo(state,j/180*Math.PI*2),x=70+(q.volume-c.minV)/(c.maxV-c.minV)*460,y=250-(q.pressure-c.minP)/(c.maxP-c.minP)*190;points.push((j?'L':'M')+x+','+y);}
 const graph='<svg class="reader-wave" viewBox="0 0 610 300" role="img" aria-label="史特靈熱機的即時壓力體積循環；圈內面積是氣體每圈淨功"><path d="M70 35V250H550" fill="none" stroke="#889b73"/><path d="'+points.join(' ')+'Z" fill="#d3b68233" stroke="#a17e4d" stroke-width="2"/><circle id="reader-pv-dot" r="5" fill="#4d6840"/><text x="10" y="30">p / kPa</text><text x="510" y="281">V / mL</text><text x="10" y="55">'+fmt(c.maxP/1000,0)+'</text><text x="10" y="250">'+fmt(c.minP/1000,0)+'</text><text x="70" y="275">'+fmt(c.minV*1e6,1)+'</text><text x="470" y="275">'+fmt(c.maxV*1e6,1)+'</text></svg>';
 $('#reader-content').innerHTML='<div class="contents-unit">第二部 · 熱與機械 / '+'跨頁 '+(state.chapter+1)+' / '+CHAPTERS.length+'</div><h1 id="reader-title">'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs.join('</p><p>')+'</p><div class="reader-equation">壓力 <span data-st-live="pressure"></span>　體積 <span data-st-live="volume"></span><br>飛輪 <span data-st-live="rpm"></span>　機械負載 <span data-st-live="power"></span><br>氣體作功 <span data-st-live="gasPower"></span>　摩擦 <span data-st-live="friction"></span><br>飛輪動能 <span data-st-live="kinetic"></span><br>p = nR / (Vh/Th + Vc/Tc + Vr/Tr)<br>每圈理想指示淨功 ∮p dV = '+fmt(c.work,3)+' J</div>'+graph+'<p class="wave-key">熱端 '+fmt(p.Th,2)+' K、冷端 '+fmt(p.Tc,2)+' K；固定氣體總量 '+fmt(p.gasMoles*1000,3)+' mmol。兩曲柄相差 90°，連桿長 43 mm、曲柄半徑 9 mm。理想等溫與完全回熱的效率上限為 '+fmt(c.carnot*100,1)+'%，不是實機效率。溫度設定即時生效，未模擬暖機。</p><div class="energy-note">累積送到煞車負載的機械功<br><strong data-st-live="energy"></strong><small>氣體作功 = 負載輸出 + 摩擦耗散 + 飛輪動能變化。啟動含手推起轉；關閉加熱會令兩端等溫，仍可能先消耗原有飛輪動能。</small></div><h2>零件的工作</h2><div class="reader-parts">'+Object.entries(partsFor(state.chapter)).map(([id,p])=>'<button data-part="'+id+'">'+p.title+'</button>').join('')+'</div>'+(state.selected?'<h2>'+PARTS[state.selected].title+'</h2><p>'+PARTS[state.selected].text+'</p>':'')+'<p>'+ch.caption+'</p>';
 $$('.reader-tabs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===state.chapter)));
}

function paintBenchReader(){
 const ch=CHAPTERS[state.chapter],p=sample(state),gov=p.subject==='governor',plot=benchPlot(state,p),live=benchValues(state,p);
 const graph='<svg class="reader-wave" viewBox="0 0 610 300" role="img" aria-label="'+plot.ylabel+'與'+plot.xlabel+'的關係"><path d="M75 35V245H560" fill="none" stroke="#889b73"/>'+plot.tracks.map(t=>'<path d="'+t.points.map(([x,y],i)=>(i?'L':'M')+(75+x*470)+','+(245-y*185)).join(' ')+'" fill="none" stroke="'+t.color+'" stroke-width="2"/>').join('')+'<circle id="reader-bench-dot" r="5" fill="#4d6840"/><text x="10" y="25">'+plot.ylabel+'</text><text x="435" y="285">'+plot.xlabel+'</text><text x="15" y="57">'+plot.ymax+'</text><text x="520" y="267">'+plot.xmax+'</text></svg>';
 const rows=gov?[['轉速','rpm'],['套筒升程','lift'],['動力開度','opening'],['張角','angle'],['圓周向心項','force'],['負載功率','power']]:[['轉速','rpm'],['制動力矩','torque'],['發熱功率','power'],['圓盤動能','kinetic'],['重疊比例','overlap'],['圓盤質量','mass']];
 const eq=gov?'平衡時 ω² = (1 + M/m)g / (L cosθ)<br>等臂機構升程 = 2L(cosθ₀ − cosθ)':'τ = −kω · P熱 = kω² ≥ 0<br>ω(t) = ω₀ exp[−(k+b)t/J]';
 const note=gov?'兩個 250 g 飛球，連桿長 150 mm；角度限制 22°–62°。包含軸與連桿慣性、中央套筒質量、阻尼及簡化馬達特性。套筒升高經撥叉減少動力開度；比例回授仍有轉速下垂。':'圓盤半徑 80 mm、軸孔半徑 6 mm、厚 2 mm；12 道 4° 開槽由 0.38R 延伸到外緣。慣量扣除真實缺口；鋁／銅同時改變密度與導電率。煞車為低速線性近似，開槽抑流係數 0.16 是教學示意，未求解完整電磁場。更換圓盤會先停轉並重置該次能量計數。';
 $('#reader-content').innerHTML='<div class="contents-unit">'+subjectAt(state.chapter).unit+' · 跨頁 '+(state.chapter+1)+' / '+CHAPTERS.length+'</div><h1 id="reader-title">'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs.join('</p><p>')+'</p><div class="reader-equation">'+rows.map(([label,key])=>label+' <span data-bench-live="'+key+'"></span>').join('<br>')+'<br>'+eq+'</div>'+graph+'<p class="wave-key">'+plot.caption+'</p><p>'+note+'</p><div class="energy-note">'+(gov?'累積負載取得的機械功':'累積渦電流發熱')+'<strong data-bench-live="energy"></strong><small>'+(gov?'調速器改變動力供應；能量來自驅動馬達。':'圓盤動能、渦電流熱與軸承耗散相加，對應手部淨輸入能量。靜止時沒有磁保持力。')+'</small></div><h2>零件的工作</h2><div class="reader-parts">'+Object.entries(partsFor(state.chapter)).map(([id,q])=>'<button data-part="'+id+'">'+q.title+'</button>').join('')+'</div>'+(state.selected?'<h2>'+PARTS[state.selected].title+'</h2><p>'+PARTS[state.selected].text+'</p>':'')+'<p>'+ch.caption+'</p>';
 $$('.reader-tabs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===state.chapter)));
}

function paintReader(){
 if(subjectId()==='governor'||subjectId()==='eddy'){paintBenchReader();return;}
 if(subjectId()==='stirling'){paintThermalReader();return;}
 const ch=CHAPTERS[state.chapter],p=sample(state);
 const x=80,w=500,paths={flux:[],voltage:[],power:[]};
 for(let j=0;j<=160;j++){const a=j/160*Math.PI*2,xx=x+j/160*w,prefix=j?'L':'M';paths.flux.push(prefix+xx+','+(65-(state.polarity??1)*Math.cos(a)*27));paths.voltage.push(prefix+xx+','+(155-(state.direction??1)*(state.polarity??1)*Math.sin(a)*27));paths.power.push(prefix+xx+','+(276-(state.load?Math.sin(a)**2:0)*55));}
 const chart='<svg class="reader-wave cycle-chart" viewBox="0 0 610 325" role="img" aria-label="同一轉角下的磁通量、感應電壓與負載功率。磁通量與電壓相差四分之一週期，功率每一圈有兩次高峰。">'+
 [0,1,2,3,4].map(k=>'<path d="M'+(x+k*w/4)+' 30V291" stroke="#b7c1a0" stroke-width=".7"/><text x="'+(x+k*w/4)+'" y="316" text-anchor="middle">'+['0','π/2','π','3π/2','2π'][k]+'</text>').join('')+
 '<path d="M80 65H580M80 155H580M80 276H580" stroke="#a5b190" fill="none"/>'+ 
 '<path d="'+paths.flux.join(' ')+'" fill="none" stroke="#7e9c90" stroke-width="2"/>'+ 
 '<path d="'+paths.voltage.join(' ')+'" fill="none" stroke="#9b7645" stroke-width="2"/>'+ 
 '<path d="'+paths.power.join(' ')+' L580 276H80Z" fill="#cad6ac55" stroke="#71864f" stroke-width="2"/>'+ 
 '<path id="reader-cycle-cursor" d="M80 30V291" stroke="#5d714c" stroke-width="1" stroke-dasharray="3 3"/>'+ 
 '<circle id="reader-flux-dot" r="4" fill="#7e9c90"/><circle id="reader-volt-dot" r="4" fill="#9b7645"/><circle id="reader-power-dot" r="4" fill="#71864f"/>'+ 
 '<text x="9" y="53">Φ / mWb</text><text x="9" y="75" data-live="flux"></text><text x="9" y="143">ε / V</text><text x="9" y="165" data-live="emf"></text><text x="9" y="241">P / W</text><text x="9" y="263" data-live="power"></text></svg>';
 $('#reader-content').innerHTML='<h1 id="reader-title">'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs.join('</p><p>')+'</p><div class="reader-equation">Φ = BA cosθ<br>ε = −N dΦ/dt = NBAω sinθ<br>設定轉速下：ε₀ = '+fmt(p.peak)+' V，f = '+fmt(p.frequency)+' Hz<br>即時 ε = <span data-live="emf"></span>，I = <span data-live="current"></span><br>燈泡功率 = <span data-live="power"></span><br>累積電能 = <span data-live="energy"></span></div>'+ 
 chart+'<p class="wave-key">同一個轉角：Φ 與 ε 相差 T/4；P = I²R 的週期為 T/2。曲線依各自峰值顯示，數值保留物理單位。<br>設定轉速下 T = '+(p.frequency?fmt(1/p.frequency,3):'—')+' s；每圈可送到燈泡 '+fmt(p.cycleEnergy,3)+' J。<br>停轉時，電壓與功率的圓點歸零；曲線保留勻速轉動的預測。</p><div class="energy-note">累積送到燈泡的電能 E = ∫P dt<br><strong data-live="energy"></strong><small>功率曲線的面積，就是送出的電能；兩個半週都累積。</small></div>'+ 
 '<h2>零件的工作</h2><div class="reader-parts">'+Object.entries(partsFor(state.chapter)).map(([id,p])=>'<button data-part="'+id+'">'+p.title+'</button>').join('')+'</div>'+(state.selected?'<h2>'+PARTS[state.selected].title+'</h2><p>'+PARTS[state.selected].text+'</p>':'')+'<p>'+ch.caption+'</p>';
 $$('.reader-tabs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===state.chapter)));
}

function $$(selector) { return [...document.querySelectorAll(selector)]; }
$(".reader-tabs").innerHTML = CHAPTERS.map((c, i) => "<button data-chapter='" + i + "'>" + String(i + 1).padStart(2, "0") + " " + (i===0?"發電機 · ":i===4?"熱機 · ":i===8?"調速 · ":i===12?"渦電流 · ":"") + c.label + "</button>").join("");
$(".reader-tabs").addEventListener("click", e => { const b = e.target.closest("[data-chapter]"); if(b){const chapter=Number(b.dataset.chapter),next=subjectAt(chapter);if(next.id!==subjectId()||state.history)commitBookPage(SUBJECTS.indexOf(next)*2,true);state.chapter=chapter;paint();} });
$("#reader-content").addEventListener("click", e => { const b = e.target.closest("[data-part]"); if (b) selectPart(b.dataset.part); });
$("#read-mode").addEventListener("click", () => { touch(); reader.showModal(); });
$("#mobile-read").addEventListener("click", () => state.history?showHistory():reader.showModal());
$(".close-reader").addEventListener("click", () => reader.close());
reader.addEventListener("click", e => { if (e.target === reader) { const r = reader.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) reader.close(); } });
$("#theme-toggle").addEventListener("click", () => {
  touch(); state.theme = state.theme === "light" ? "dark" : "light";
  try { localStorage.setItem("generator-book:theme", state.theme); } catch {}
  applyTheme(); paint();
});
$$("[data-view]").forEach(b => b.addEventListener("click", () => { touch(); setView(b.dataset.view); }));
$("#guide").addEventListener("click", () => {
  const wasRunning = guideClock !== null; touch();
  if (!wasRunning) { guideClock = 0; guideStep = -1; state.popupTarget = 1; $("#guide").setAttribute("aria-pressed", "true"); }
});
$("#magnify").addEventListener("click", () => {
  touch(); state.lensEnabled = !state.lensEnabled;
  $("#magnify").setAttribute("aria-pressed", String(state.lensEnabled));
  $("#magnify").setAttribute("aria-label", state.lensEnabled ? "關閉放大鏡" : "開啟可移動放大鏡");
  if (!state.lensEnabled) hideLens();
});
$("#book-fold").addEventListener("click", () => {
  if(state.turning)return;
  touch(); state.bookOpenTarget = state.bookOpenTarget > 0.5 ? 0 : 1;
  state.running = false; state.flapTarget = 0; hideLens();
  if (!state.bookOpenTarget) {
    state.popupTarget = 0; state.explodeTarget = 0; setView("book");
    state.targetToX = 94; state.cameraRadiusTarget *= 0.8;
  } else { state.popupTarget = state.history?0:1; state.explodeTarget = CHAPTERS[state.chapter].defaultExplode; setView("book"); }
  $("#book-fold").textContent = state.bookOpenTarget ? "闔書" : "翻開";
  $("#book-fold").setAttribute("aria-pressed", String(state.bookOpenTarget > 0.5)); paint();
});
$("#popup").addEventListener("click", () => {
  if(state.history)return;touch(); state.popupTarget = state.popupTarget > 0.5 ? 0 : 1;
  if (!state.popupTarget) state.running = false;
  paint();
});
function setExplode(value) {
  if(state.turning||state.history)return;
  touch(); state.explodeTarget = clamp(value, 0, 1); state.popupTarget = 1;
  if (value > 0.025) { state.running = false; state.manualActive = false; }
  if(state.view==='mechanism'||(value>.025&&state.view==='charts'))setView('mechanism');paint();
}
$("#explode").addEventListener("click", () => setExplode(state.explodeTarget > 0.55 ? 0 : 1));
$("#explode-range").addEventListener("input", e => setExplode(Number(e.target.value) / 100));
function toggleRun() {
  if(state.turning||state.history)return;
  touch(); state.running = !state.running;
  if(subjectId()==='stirling'&&state.running&&Math.abs(state.stOmega)<5)stNudge(state);if(subjectId()==='eddy'&&state.running&&Math.abs(state.eddyOmega)<.15)eddyKick(state);
  if (state.running) { state.popupTarget = 1; state.bookOpenTarget = 1; state.explodeTarget = 0; }
  paint();
}
$("#play").addEventListener("click", toggleRun);
function setParameter(name,value){touch();state[name]=value;paint();}
for(const id of ['rpm','turns','field','hotC','coldC','brake','govSupply','govLoad','govMass','eddyRpm','eddyField','eddyInsertion'])$('#'+id).addEventListener('input',e=>setParameter(id,Number(e.target.value)));
for(const [id,key] of [['heater','heater'],['section','section'],['brake-release','brakeEngaged'],['load','load'],['field-view','showField'],['chart-toggle','showCharts'],['gov-feedback','govFeedback'],['gov-step','govStep'],['gov-vectors','govVectors'],['eddy-magnet','eddyMagnet']])$('#'+id).addEventListener('click',()=>{touch();state[key]=!state[key];paint();});
$('#reverse').addEventListener('click',()=>{touch();state.direction*=-1;paint();});$('#polarity').addEventListener('click',()=>{touch();state.polarity*=-1;paint();});
function changeDisk(key,value){touch();state.running=false;state.manualActive=false;state.eddyOmega=0;state.eddyElapsed=0;state.eddyEnergy={heat:0,bearing:0,input:0};state[key]=value;paint();}
$('#eddy-slots').addEventListener('click',()=>changeDisk('eddySlots',!state.eddySlots));$('#eddy-material').addEventListener('click',()=>changeDisk('eddyMaterial',state.eddyMaterial==='copper'?'aluminum':'copper'));
$('#eddy-kick').addEventListener('click',()=>{touch();eddyKick(state);state.running=true;state.popupTarget=1;state.explodeTarget=0;state.bookOpenTarget=1;paint();});

let flip = null;
function commitBookPage(page,keepView=false){
 const spread=BOOK_SPREADS[page],old=subjectId(),next=spread.subject;subjectPhases[old]=state.phase;
 $('#part-tip').hidden=true;state.bookPage=page;state.history=spread.history;state.chapter=spread.chapter;if(old!==next)state.phase=subjectPhases[next];state.selected=null;activateMachine();machine.select(null);
 try{history.replaceState(null,'','#'+next+'-'+(state.history?'history':'1'));}catch{}
 state.running=false;state.manualActive=false;state.explodeTarget=0;state.popupTarget=state.history?0:1;state.flapTarget=0;paint();if(!keepView)setView('book');announce('第 '+(page+1)+' 頁，'+spread.title);
}
function startTurn(chapter,interactive=false){
 touch();chapter=clamp(chapter,0,BOOK_SPREADS.length-1);if(state.turning||chapter===state.bookPage)return false;
 if(!webgl||(reduced&&!interactive)){commitBookPage(chapter);return false;}
 const saved={chapter:state.bookPage,readerChapter:state.chapter,history:state.history,running:state.running,popup:state.popupTarget,explode:state.explodeTarget,flap:state.flapTarget,selected:state.selected,phase:state.phase};
 flip={from:state.bookPage,chapter,interactive,stage:'lower',progress:0,pending:0,target:interactive?null:1,saved};
 state.turning=true;state.running=false;state.manualActive=false;state.bookOpenTarget=1;state.popupTarget=0;state.explodeTarget=0;state.flapTarget=0;state.pageTurnProgress=0;
 hideLens();$('#part-tip').hidden=true;book.beginTurn(chapter<state.bookPage);paint();return true;
}
function goTo(chapter){startTurn(chapter,false);}
function settleTurn(target){if(flip){flip.target=target;flip.interactive=false;}}
function updateTurn(dt){
 if(!flip)return;const f=flip;
 if(f.stage==='lower'&&state.popup<.025&&state.explode<.025&&state.flap<.025&&state.open>.95){captureTurnSheet(f.chapter<f.from?'left':'right');f.stage='turn';}
 if(f.stage==='turn'){
  const target=f.target===null?f.pending:f.target;
  f.progress=reduced?target:follow(f.progress,target,dt,f.target===null?.035:.09);
  if(f.target!==null&&Math.abs(f.progress-f.target)<.003)f.progress=f.target;
 }
 state.pageTurnProgress=f.progress;book.turn(f.progress);
 const visibleChapter=f.progress>.5?f.chapter:f.from;
 if(state.bookPage!==visibleChapter){commitBookPage(visibleChapter,true);state.popupTarget=0;state.explodeTarget=0;state.flapTarget=0;}
 if(f.stage==='turn'&&f.target!==null&&f.progress===f.target){
  const completed=f.target===1,chapter=completed?f.chapter:f.from;if(state.bookPage!==chapter)commitBookPage(chapter,true);
  state.turning=false;state.pageTurnProgress=0;flip=null;book.endTurn();
  state.popupTarget=completed?(state.history?0:1):f.saved.popup;state.explodeTarget=completed?0:f.saved.explode;state.flapTarget=completed?0:f.saved.flap;
  state.running=!state.history&&(completed?BOOK_SPREADS[f.from].subject===BOOK_SPREADS[f.chapter].subject:f.saved.running)&&f.saved.running;
  if(!completed){state.chapter=f.saved.readerChapter;state.phase=f.saved.phase;state.selected=f.saved.selected;machine.select(state.selected);}paint();
 }
}
$("#previous").addEventListener("click", () => goTo(state.bookPage - 1));
$("#next").addEventListener("click", () => goTo(state.bookPage + 1));
$(".wordmark").addEventListener("click",e=>{e.preventDefault();$("#book-fold").click();});
$("#mobile-previous").addEventListener("click",()=>goTo(state.bookPage-1));$("#mobile-next").addEventListener("click",()=>goTo(state.bookPage+1));
$("#reset").addEventListener("click", () => {
  touch();const id=subjectId(),defaults={generator:{rpm:40,turns:120,field:.45,direction:1,polarity:1,load:true,showField:true,energy:{load:0,copper:0,input:0}},stirling:{hotC:320,coldC:25,brake:35,heater:true,section:true,brakeEngaged:true,stOmega:0,stEnergy:{gas:0,load:0,friction:0,kick:0}},governor:{govSupply:85,govLoad:12,govMass:180,govFeedback:true,govStep:false,govVectors:true,govOmega:0,govTheta:G_SPEC.thetaMin,govVelocity:0,govEnergy:{load:0,input:0,loss:0}},eddy:{eddyRpm:240,eddyField:.45,eddyInsertion:20,eddyMagnet:true,eddySlots:false,eddyMaterial:'aluminum',eddyOmega:0,eddyElapsed:0,eddyEnergy:{heat:0,bearing:0,input:0}}};Object.assign(state,defaults[id]);state.showCharts=true;state.manualActive=false;state.yawTarget=0;state.zoomTarget=1;state.explodeTarget=0;state.popupTarget=state.history?0:1;state.running=false;state.phase=id==='stirling'?2:.8;state.selected=null;state.flapTarget=0;machine.select(null);setView('book');paint();
});
document.addEventListener("keydown", e => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || reader.open || $("#history-notes").open) return;
  if (e.key === "ArrowRight") { e.preventDefault(); goTo(state.bookPage + 1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goTo(state.bookPage - 1); }
  if (e.code === "Space") { e.preventDefault(); toggleRun(); }
  if (e.key.toLowerCase() === "e") setExplode(state.explodeTarget > 0.55 ? 0 : 1);
  if (e.key.toLowerCase() === "r") $("#reset").click();
  if (e.key.toLowerCase() === "p") $("#popup").click();
  if (e.key.toLowerCase() === "b") $("#book-fold").click();
  if (e.key.toLowerCase() === "m") $("#magnify").click();
  if(e.key==='Escape'&&flip){settleTurn(0);drag=null;return;}
  if (e.key === "Escape") { state.selected = null; machine.select(null); state.lensEnabled = false; $("#magnify").setAttribute("aria-pressed", "false"); hideLens(); paint(); }
});
function projectPagePoint(side,x,y){const page=book.pages[side==='left'?0:1],sign=side==='left'?-1:1,xx=x-93,zz=y-122;const yy=1.1+4.8*Math.exp(-(93+xx*sign)/17)+.35*Math.pow(Math.abs(xx)/93,5)+.12*Math.cos(zz/244*Math.PI);const v=page.localToWorld(new THREE.Vector3(xx,yy,zz)).project(camera),r=canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2+r.left,y:(1-v.y)*r.height/2+r.top};}
function rayAt(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  ray.setFromCamera(pointer, camera); return ray;
}
const magnifier = createMagnifier({ canvas, getRenderer: () => renderer, getCamera: () => camera, state, book, rayAt, partInfo: PARTS, chapters: CHAPTERS });
const hideLens = () => magnifier.hide();
let drag = null, lastHover = null, hoverAt = 0, pressTimer = null;
function visibleMeshes(includeChart=false){const list=includeChart&&chart.visible?machine.meshes.concat(chart.meshes):machine.meshes;return list.filter(m=>{if(state.history)return false;for(let p=m;p;p=p.parent)if(!p.visible)return false;return true;});}
function pageAt(e) {
  const h = rayAt(e).intersectObjects(book.pages, false)[0];
  return h ? { hit: h, side: h.object.userData.bookSide, region: book.hit(h.uv, h.object.userData.bookSide) } : null;
}
function pageSlider(e, held, force = false) {
  const h = rayAt(e).intersectObjects(book.pages, false).find(p => p.object.userData.bookSide === held.side);
  if (!h) return;
  const x = h.uv.x * 186, ratio = clamp((x - held.region.from) / (held.region.to - held.region.from), 0, 1);
  if (!force && performance.now() - (held.paintedAt || 0) < 35) return;
  held.paintedAt = performance.now();
  if (held.region.action === 'explode') setExplode(ratio);
  else {const r=held.region;state[r.action]=Math.round((r.min+ratio*(r.max-r.min))/r.step)*r.step;state[r.action]=Number(state[r.action].toFixed(3));paint();}
}
function activatePage(region) {
  if (!region) return false;
  if (region.part) { selectPart(region.part); return true; }
  if (region.kind === "button" && region.action) { const control = $("#" + region.action); if (control && !control.disabled) control.click(); return true; }
  return false;
}
canvas.addEventListener("pointerdown", e => {
  if(state.turning)return;
  touch(); drag = { x: e.clientX, y: e.clientY, yaw: state.yawTarget, azimuth: state.cameraYawTarget, elevation: state.cameraElevationTarget, partOnly: e.shiftKey, moved: false };
  hideLens();
  const page = pageAt(e);
  if(page?.region?.kind==='turn'&&state.open>.95){
    const backwards=page.region.action==='previous',chapter=state.bookPage+(backwards?-1:1);
    const from=projectPagePoint(backwards?'left':'right',backwards?8:178,236),to=projectPagePoint(backwards?'right':'left',backwards?178:8,236);
    if(startTurn(chapter,true)){drag={...drag,kind:'page-turn',from,to,lastProgress:0,lastAt:performance.now(),velocity:0};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();return;}
  }
  if (page?.region?.kind === "slider" && state.open > 0.95) {
    drag = { ...drag, kind: "page-slider", region: page.region, side: page.side };
    canvas.setPointerCapture(e.pointerId); pageSlider(e, drag, true); return;
  }
  const objectHit=rayAt(e).intersectObjects(visibleMeshes(),false)[0];
  if(objectHit?.object.userData.crank && state.explode < .04 && state.popup > .95){
    const angle=machine.crankAngleAt(ray.ray);state.running=false;state.manualActive=true;
    drag={...drag,kind:'crank',angle,lastAt:performance.now(),lastMove:performance.now()};canvas.setPointerCapture(e.pointerId);paint();return;
  }
  if (e.pointerType === "touch") pressTimer = setTimeout(() => {
    if (drag && !drag.moved) { drag.lens = true; state.lensEnabled = true; const ph = rayAt(e).intersectObjects(book.pages, false)[0]; magnifier.show(e, null, ph); }
  }, 480);
});
canvas.addEventListener("pointermove", e => {
  if (drag) {
    if(drag.kind==='page-turn'&&flip){const vx=drag.to.x-drag.from.x,vy=drag.to.y-drag.from.y,progress=clamp(((e.clientX-drag.x)*vx+(e.clientY-drag.y)*vy)/(vx*vx+vy*vy),0,1),now=performance.now();drag.velocity=(progress-drag.lastProgress)/Math.max(.008,(now-drag.lastAt)/1000);drag.lastProgress=progress;drag.lastAt=now;flip.pending=progress;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;e.preventDefault();return;}
    if (drag.kind === "page-slider") { drag.moved = true; pageSlider(e, drag); return; }
    if(drag.kind==='crank'){
      const angle=machine.crankAngleAt(rayAt(e).ray),now=performance.now();
      if(angle!==null&&drag.angle!==null){let delta=angle-drag.angle;delta=Math.atan2(Math.sin(delta),Math.cos(delta));const dt=Math.max(.008,(now-drag.lastAt)/1000);
        const from=state.phase;if(subjectId()==='eddy'){const p=eddySample(state),oldK=.5*p.inertia*state.eddyOmega**2;state.phase+=delta;state.eddyOmega=clamp(delta/(dt*E_SPEC.demoScale),-120,120);const q=eddySample(state),heat=q.coefficient*state.eddyOmega**2*dt*E_SPEC.demoScale,bearing=E_SPEC.bearingDrag*state.eddyOmega**2*dt*E_SPEC.demoScale;state.eddyEnergy.heat+=heat;state.eddyEnergy.bearing+=bearing;state.eddyEnergy.input+=.5*p.inertia*state.eddyOmega**2-oldK+heat+bearing;}else if(subjectId()==='stirling'){const oldK=.5*ST_SPEC.inertia*state.stOmega**2;state.phase+=delta;state.stOmega=delta/(dt*ST_SPEC.demoScale);const d=delta,p=stThermo(state,(from+state.phase)/2),gas=p.torque*d,bl=state.brakeEngaged?ST_SPEC.brakeViscous*state.brake/100:0,load=bl*state.stOmega**2*dt*ST_SPEC.demoScale,fr=(ST_SPEC.frictionViscous*state.stOmega+ST_SPEC.frictionDry*Math.tanh(state.stOmega/.35))*d;state.stEnergy.gas+=gas;state.stEnergy.load+=load;state.stEnergy.friction+=fr;state.stEnergy.kick+=.5*ST_SPEC.inertia*state.stOmega**2-oldK-gas+load+fr;}else{state.phase-=delta*SPEC.gearRatio;state.direction=delta>0?-1:1;state.rpm=Math.abs(delta/dt)/SPEC.demonstrationScale*30/Math.PI;accumulateEnergy(from,state.phase,dt*SPEC.demonstrationScale);}state.manualActive=true;
        drag.moved=true;drag.lastMove=now;drag.lastAt=now;drag.angle=angle;paint();
      }return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) {
      drag.moved = true; clearTimeout(pressTimer); hideLens();
      if (drag.partOnly) state.yawTarget = drag.yaw + dx * 0.009;
      else {
        state.cameraYawTarget = clamp(drag.azimuth - dx * 0.004, -0.9, 0.9);
        state.cameraElevationTarget = clamp(drag.elevation + dy * 0.003, 0.28, 1.25);
      }
      if (!canvas.hasPointerCapture(e.pointerId)) canvas.setPointerCapture(e.pointerId);
    }
    $("#part-tip").hidden = true; return;
  }
  if (performance.now() - hoverAt < 45) return; hoverAt = performance.now();
  rayAt(e);
  const hit = state.popup > 0.5 ? ray.intersectObjects(visibleMeshes(true), false)[0] : null, part = hit?.object.userData.part;
  const pageHit = ray.intersectObjects(book.pages, false)[0];
  const pageRegion = pageHit && book.hit(pageHit.uv, pageHit.object.userData.bookSide);
  magnifier.show(e, part, pageHit);
  if (part && PARTS[part]) {
    $("#part-tip").textContent = PARTS[part].title;
    $("#part-tip").style.left = Math.min(e.clientX + 15, innerWidth - 170) + "px";
    $("#part-tip").style.top = Math.max(e.clientY - 32, 5) + "px"; $("#part-tip").hidden = false;
    canvas.style.cursor = "pointer";
  } else { $("#part-tip").hidden = true; canvas.style.cursor = pageRegion?.kind === "slider" ? "ew-resize" : pageRegion?.kind==='turn'?'grab':pageRegion ? "pointer" : pageHit?.object.userData.bookSide === "left" ? "zoom-in" : "grab"; }
  lastHover = part;
});
canvas.addEventListener("pointerup", e => {
  if (!drag) return;
  clearTimeout(pressTimer);
  if(drag.kind==='page-turn'){const target=!drag.moved||((flip?.pending??0)>.45)||((flip?.pending??0)>.12&&drag.velocity>1.4)?1:0;settleTurn(target);drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);return;}
  if (drag.kind === "page-slider") {
    pageSlider(e, drag, true); drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    return;
  }
  if(drag.kind==='crank'){state.manualActive=false;if(subjectId()==='eddy'){state.running=true;}else if(subjectId()==='stirling'){state.stEnergy.kick-=.5*ST_SPEC.inertia*state.stOmega**2;state.stOmega=0;}state.rpm=clamp(Math.round(state.rpm/5)*5,5,90);paint();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;return;}
  const moved = drag.moved || drag.lens; drag = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (moved || state.turning) return;
  const flapHit = rayAt(e).intersectObject(book.flap, false)[0];
  if (book.flap.visible&&flapHit) { state.flapTarget = state.flapTarget > 0.5 ? 0 : 1; announce(state.flapTarget ? "答案已掀開" : "答案已蓋回"); return; }
  const machineHit = rayAt(e).intersectObjects(visibleMeshes(true), false)[0];
  const page = pageAt(e);
  if (page?.region && (!machineHit || machineHit.distance > page.hit.distance) && activatePage(page.region)) return;
  if (machineHit && state.popup > 0.35) { if(machineHit.object.userData.part==='lamp') $('#load').click();else if(['加熱開關撥桿','加熱器開關座'].includes(machineHit.object.userData.name))$('#heater').click();else if(machineHit.object.userData.part==='st_brake')selectPart('st_brake'); else selectPart(machineHit.object.userData.part); return; }
});
canvas.addEventListener("pointercancel", () => { clearTimeout(pressTimer);if(drag?.kind==='page-turn')settleTurn(0);drag=null;state.manualActive=false;hideLens(); });
canvas.addEventListener("pointerleave", () => { if (!drag) { $("#part-tip").hidden = true; hideLens(); } });
canvas.addEventListener("wheel", e => {
  if (innerWidth < 700) return;
  e.preventDefault(); touch(); state.zoomTarget = clamp(state.zoomTarget - e.deltaY * 0.00065, 0.82, 1.55);
}, { passive: false });
canvas.addEventListener("webglcontextlost", e => {
  e.preventDefault(); state.running = false; $("#status").textContent = "圖形暫停，請重新整理；閱讀模式仍可使用。";
});
canvas.addEventListener("webglcontextrestored", () => location.reload());

function captureTurnSheet(side){
 if(!renderer||side==='left'||state.history){state.lastTurnSnapshotMs=0;return;}
 const begin=performance.now(),w=744,h=976,target=new THREE.WebGLRenderTarget(w,h,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType});target.texture.colorSpace=THREE.SRGBColorSpace;
 const pageCamera=new THREE.OrthographicCamera(-93,93,122,-122,1,700);pageCamera.position.set(98,350,0);pageCamera.up.set(0,0,-1);pageCamera.lookAt(98,0,0);pageCamera.updateProjectionMatrix();
 const previousTarget=renderer.getRenderTarget(),previousBackground=scene.background,clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha(),shadowUpdate=renderer.shadowMap.autoUpdate;
 const hidden=[book.group,floor,pad,...Object.values(machines).filter(m=>m!==machine).map(m=>m.root)],visibility=hidden.map(n=>n.visible);hidden.forEach(n=>n.visible=false);machine.root.visible=true;scene.background=null;renderer.setClearColor(0x000000,0);renderer.shadowMap.autoUpdate=false;
 machine.pose({...state,popup:0,explode:0});machine.root.matrix.multiply(yawMatrix.makeRotationY(state.yaw));machine.root.matrixWorldNeedsUpdate=true;
 renderer.setRenderTarget(target);renderer.render(scene,pageCamera);renderer.setRenderTarget(previousTarget);renderer.setClearColor(clearColor,clearAlpha);renderer.shadowMap.autoUpdate=shadowUpdate;scene.background=previousBackground;hidden.forEach((n,i)=>n.visible=visibility[i]);
 book.setTurnDiagram(target);state.lastTurnSnapshotMs=performance.now()-begin;
}

const cameraTarget = new THREE.Vector3();
function renderOnce() {
  machine.root.visible=!state.history&&!(flip&&flip.stage==='turn');
  machine.pose(state);
  machine.root.matrix.multiply(yawMatrix.makeRotationY(state.yaw));
  machine.root.matrixWorldNeedsUpdate = true;
  book.setOpen(state.open); book.setFlap(state.flap); chart.pose(state);chart.root.visible=!state.history;
  const r = state.cameraRadius, a = state.cameraYaw, e = state.cameraElevation;
  cameraTarget.set(state.targetX, state.targetY, state.targetZ);
  camera.position.set(state.targetX + r * Math.cos(e) * Math.sin(a), state.targetY + r * Math.sin(e), state.targetZ + r * Math.cos(e) * Math.cos(a));
  camera.lookAt(cameraTarget);
  camera.zoom = state.zoom; camera.updateProjectionMatrix();
  if (renderer) renderer.render(scene, camera);
  magnifier.draw();
}
let previous = performance.now(), startAt = previous, frameCount = 0, visible = true;
const frameTimes = []; let lastLive = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || !visible) { previous = now; return; }
  const dt = Math.min(0.04, Math.max(0.001, (now - previous) / 1000)); previous = now;
  const age = now - startAt;
  if(drag?.kind==='crank' && now-drag.lastMove>140)state.manualActive=false;
  if(now-lastLive>110){lastLive=now;book.draw(state);liveValues();}

  if (!introSkipped) state.open = smooth((age - 250) / 1900);
  else if (state.bookOpenTarget > 0.5 || state.popup < 0.035)
    state.open = reduced ? state.bookOpenTarget : follow(state.open, state.bookOpenTarget, dt, 0.45);
  if ((age > 2200 || introSkipped) && (state.open > 0.95 || state.popupTarget < 0.5)) {
    state.popup = reduced ? state.popupTarget : follow(state.popup,state.popupTarget,dt,state.turning?.085:.48);
    state.explode = reduced ? state.explodeTarget : follow(state.explode,state.explodeTarget,dt,state.turning?.085:.42);
  }
  state.yaw = reduced ? state.yawTarget : follow(state.yaw, state.yawTarget, dt, 0.14);
  state.zoom = follow(state.zoom, state.zoomTarget, dt, 0.18);
  state.flap = reduced ? state.flapTarget : follow(state.flap,state.flapTarget,dt,state.turning?.08:.24);
  const camEase = drag ? 0.14 : 0.55;
  for (const [key, target] of [["cameraYaw", "cameraYawTarget"], ["cameraElevation", "cameraElevationTarget"], ["cameraRadius", "cameraRadiusTarget"], ["targetX", "targetToX"], ["targetY", "targetToY"], ["targetZ", "targetToZ"]])
    state[key] = reduced ? state[target] : follow(state[key], state[target], dt, camEase);
  if (!state.history && state.running && state.explode < 0.025 && state.popup > 0.98 && !state.turning){
    if(subjectId()==='governor')govAdvance(state,dt*G_SPEC.demoScale);else if(subjectId()==='eddy')eddyAdvance(state,dt*E_SPEC.demoScale);else if(subjectId()==='stirling')stAdvance(state,dt*ST_SPEC.demoScale);else{const from=state.phase,physicalDt=dt*SPEC.demonstrationScale;state.phase+=state.direction*state.rpm*SPEC.gearRatio/60*Math.PI*2*physicalDt;accumulateEnergy(from,state.phase,physicalDt);}
  }
  if (!reduced && !drag && !state.running && guideClock === null && now - state.touchedAt > 18000)
    state.cameraYawTarget = viewProfiles[state.view].yaw + Math.sin((now - state.touchedAt - 18000) / 15000) * 0.035;
  if (guideClock !== null && !state.history) {
    guideClock += dt;
    const steps = subjectId()==='governor'?[{view:'book',explode:0,part:null,running:false,text:'飛球與套筒組成速度感測器'},{view:'mechanism',explode:0,part:'gov_links',running:true,text:'連桿把張角變成套筒升程'},{view:'mechanism',explode:.85,part:'gov_feedback',running:false,text:'拆開止推環與回授撥叉'},{view:'charts',explode:0,part:null,running:true,text:'轉速、升程與動力開度同步變化'},{view:'reading',explode:0,part:null,running:false,text:'回到紙上，設計負載突變實驗'}]:subjectId()==='eddy'?[{view:'book',explode:0,part:null,running:false,text:'無接觸的金屬圓盤煞車'},{view:'mechanism',explode:0,part:'ed_magnet',running:true,text:'局部渦電流反抗轉動'},{view:'mechanism',explode:.85,part:'ed_slots',running:false,text:'拆解圓盤、磁極與滑台'},{view:'charts',explode:0,part:null,running:true,text:'減速的動能累積為熱'},{view:'reading',explode:0,part:null,running:false,text:'比較開槽圓盤，再翻閱這座機械的科學史'}]:subjectId()==='stirling'?[{view:'book',explode:0,part:null,running:false,text:'第二部：溫差驅動的熱機'},{view:'mechanism',explode:0,part:'st_pistons',running:true,text:'兩顆動力活塞，相差九十度'},{view:'mechanism',explode:.85,part:'st_regenerator',running:false,text:'拆開回熱器與傳動機構'},{view:'charts',explode:0,part:null,running:true,text:'同時比較壓力、體積與機械輸出'},{view:'reading',explode:0,part:null,running:false,text:'回到書頁，設計溫差與負載的實驗'}]:[
      {view:'book',explode:.08,part:null,running:false,text:'從書頁浮出的發電機'},
      {view:'mechanism',explode:0,part:'coil',running:true,text:'線圈轉動，磁通量正在改變'},
      {view:'mechanism',explode:.8,part:'rings',running:false,text:'拆開集電環與電刷'},
      {view:'mechanism',explode:0,part:'lamp',running:true,text:'機械功成為負載的熱與光'},
      {view:'reading',explode:0,part:null,running:false,text:'回到書頁，比較磁通鏈與電壓'}
    ];
    const step = Math.floor(guideClock / 5.5);
    if (step >= steps.length) stopGuide();
    else if (step !== guideStep) {
      guideStep = step; const s = steps[step];
      state.explodeTarget = s.explode; state.running = s.running;if(subjectId()==='stirling'&&s.running&&Math.abs(state.stOmega)<5)stNudge(state);if(subjectId()==='eddy'&&s.running&&Math.abs(state.eddyOmega)<.15)eddyKick(state); state.selected = s.part;
      machine.select(s.part); setView(s.view, true); paint(); announce(s.text);
    }
  }
  updateTurn(dt);
  const before = performance.now();
  if (webgl) renderOnce();
  const elapsed = performance.now() - before;
  if (frameCount < 180) frameTimes.push(elapsed);
  frameCount++;
  if (frameCount === 3) {
    document.body.classList.add("ready"); $("#loading").setAttribute("aria-hidden", "true");
    window.__generatorReady = true;
  }
}
new IntersectionObserver(entries => visible = entries[0].isIntersecting).observe($("#scene"));
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => previous = performance.now());

window.__physicsBook = window.__generatorBook = {
  state,
  pagePoint(side,x,y){return projectPagePoint(side,x,y);},
  pageTurnState(){return flip?{from:flip.from,to:flip.chapter,progress:flip.progress,pending:flip.pending,target:flip.target,stage:flip.stage}:null;},
  crankPoint(){const v=machine.pageAnchor().project(camera),r=canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2+r.left,y:(1-v.y)*r.height/2+r.top};},
  get parts(){return machine.physicalParts.map(p => ({ name: p.name, category: p.category }));},
  visibleEvidence(){return {machines:Object.fromEntries(Object.entries(machines).map(([id,m])=>[id,m.root.visible])),chart:chart.root.visible,flap:book.flap.visible,bookPage:state.bookPage,history:state.history};},
  clearanceEvidence(){return machine.clearanceEvidence?.()??[];},
  attachmentEvidence(){return machine.attachmentEvidence?.()??[];},
  get diagnostics() { return { parts: machine.physicalParts.length, renderedFeatures: machine.parts.length, webgl, kinematics: subjectId()==='governor'?auditGovernor():subjectId()==='eddy'?auditEddy():subjectId()==='stirling'?auditStirling():auditModel(),subject:subjectAt(state.chapter).id, renderer: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } : null, averageRenderMs: frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length) }; },
  snapshot() { return { ...state, physics: sample(state) }; }
};
applyTheme(); paint(); resize();
await document.fonts.ready;
paint();
requestAnimationFrame(frame);
