import * as THREE from "./vendor/three.module.js";
import { SPEC, energyStep, fmt, smooth, follow, clamp, auditModel } from "./model.js";
import { CHAPTERS, PARTS, SUBJECTS, subjectAt, partsFor, sample } from "./library.js";
import { ST_SPEC, stSample, stThermo, stAdvance, stNudge, auditStirling } from "./stirling-model.js";
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
const initialHash=location.hash.match(/^#(generator|stirling)(?:-([1-4]))?$/),initialChapter=(initialHash?.[1]==='generator'?0:4)+(Number(initialHash?.[2]??1)-1);
const state = {
  chapter: initialChapter, hotC:320,coldC:25,brake:35,heater:true,section:true,brakeEngaged:true,stOmega:0,stEnergy:{gas:0,load:0,friction:0,kick:0}, rpm: 40, turns: 120, field: .45, direction: 1, polarity: 1, load: true, showField: true, manualActive: false, showCharts: true, energy: {load:0,copper:0,input:0}, theme: rememberedTheme,
  popup: reduced ? 1 : 0, popupTarget: 1, explode: 0, explodeTarget: 0,
  running: false, phase: location.hash.startsWith('#generator')?.8:2, yaw: 0, yawTarget: 0, zoom: 1, zoomTarget: 1,
  selected: null, touchedAt: performance.now(), turning: false, open: reduced ? 1 : 0, bookOpenTarget: 1,
  view: "book", cameraYaw: -.52, cameraYawTarget: -.52,
  cameraElevation: 0.73, cameraElevationTarget: 0.73,
  cameraRadius: 645, cameraRadiusTarget: 645,
  targetX: 25, targetY: 18, targetZ: 0, targetToX: 25, targetToY: 18, targetToZ: 0,
  lensEnabled: false, flap: 0, flapTarget: 0
};
document.body.dataset.theme = state.theme;
await document.fonts.load('400 18px "Book Hand"');
const machines={generator:createGenerator(),stirling:createStirling()},book=createBook(),chart=createDataCharts(),scene=new THREE.Scene();
let machine=machines[subjectAt(state.chapter).id];const subjectPhases={generator:.8,stirling:2};
function activateMachine(){const id=subjectAt(state.chapter).id;machine=machines[id];for(const [key,m] of Object.entries(machines))m.root.visible=key===id;}
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
  if(state.chapter>=4){if(name==='mechanism'){p.y=58;p.r=330;p.yaw=-.55;}if(name==='charts'){p.y=48;p.r=450;p.yaw=-.62;}}
  state.view = name; state.targetToX = p.x; state.targetToY = p.y; state.targetToZ = p.z;
  state.cameraRadiusTarget = p.r; state.cameraElevationTarget = p.elevation; state.cameraYawTarget = p.yaw;
  if (name === "mechanism") { state.targetToY = (state.chapter>=4?58:43) + 42 * state.explodeTarget; state.cameraRadiusTarget = (state.chapter>=4?330:290) + 135 * state.explodeTarget; }
  if (innerWidth < 700) { state.targetToX = name === 'charts' ? 145 : name === "reading" ? -80 : 145; state.targetToY = name === "book" ? 35 : p.y; state.cameraRadiusTarget = name === "book" ? 850 : name === "reading" ? 380 : name === "charts" ? 850 : 360; state.cameraElevationTarget = name === "reading" ? 1.1 : 0.7; }
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
  if (phone && state.view === "book") { state.targetToX = 145; state.targetToY = 35; state.targetToZ=0; state.cameraRadiusTarget = 850; }
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
 if(state.chapter>=4){const values={pressure:fmt(p.pressure/1000,1)+' kPa',volume:fmt(p.volume*1e6,2)+' mL',power:fmt(p.loadPower,3)+' W',rpm:fmt(p.rpm,0)+' rpm',energy:fmt(p.energy.load,3)+' J',gasPower:fmt(p.gasPower,3)+' W',friction:fmt(p.frictionPower,3)+' W',kinetic:fmt(p.kinetic,3)+' J',angle:fmt(((state.phase%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*180/Math.PI,0)+'°'};for(const e of document.querySelectorAll('[data-st-live]'))e.textContent=values[e.dataset.stLive]??'';const dot=$('#reader-pv-dot');if(dot){dot.setAttribute('cx',String(70+(p.volume-p.cycle.minV)/(p.cycle.maxV-p.cycle.minV)*460));dot.setAttribute('cy',String(250-(p.pressure-p.cycle.minP)/(p.cycle.maxP-p.cycle.minP)*190));}return;}
 for(const e of document.querySelectorAll('[data-live]')){const key=e.dataset.live;e.textContent=key==='angle'?fmt(((state.phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2))*180/Math.PI,0)+'°':key==='flux'?fmt(p.flux*1000,2)+' mWb':key==='energy'?fmt(p.energy.load,3)+' J':key==='input-energy'?fmt(p.energy.input,3)+' J':key==='power'?fmt(p.loadPower,3)+' W':key==='current'?fmt(p.current,3)+' A':fmt(p.emf)+' V';}
 const a=((state.phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2),cx=80+a/(Math.PI*2)*500;
 for(const [id,cy] of [['reader-flux-dot',65-(state.polarity??1)*Math.cos(a)*27],['reader-volt-dot',155-(p.motion?p.emf/Math.max(p.peak,1e-9):0)*27],['reader-power-dot',276-(p.settingPeakPower?p.loadPower/p.settingPeakPower:0)*55]]){const dot=$('#'+id);if(dot){dot.setAttribute('cx',String(cx));dot.setAttribute('cy',String(cy));}}
 const cursor=$('#reader-cycle-cursor');if(cursor)cursor.setAttribute('d','M'+cx+' 30V291');

}
function paint() {
 const thermal=state.chapter>=4;
 $('#scene').setAttribute('aria-label',thermal?'攤開的手繪物理課本，右頁浮起可拆解的雙缸史特靈熱機，右側立起即時量測圓柱':'攤開的手繪物理課本，右頁有可拖動搖柄的立體交流發電機');
 document.body.dataset.subject=subjectAt(state.chapter).id;document.title='物理之書 — '+subjectAt(state.chapter).title;
 $$('.generator-controls').forEach(e=>e.hidden=thermal);$$('.thermal-controls').forEach(e=>e.hidden=!thermal);
 book.draw(state);
 $('#popup').setAttribute('aria-pressed',String(state.popupTarget>.5));$('#popup span').textContent=state.popupTarget>.5?'收回紙面':'浮出圖解';
 $('#explode').setAttribute('aria-pressed',String(state.explodeTarget>.55));$('#explode span').textContent=state.explodeTarget>.55?'組裝':'分解';
 $('#play').setAttribute('aria-pressed',String(state.running));$('#play span').textContent=state.running?'暫停':thermal?'啟動熱機':'自動轉動';$('#play use').setAttribute('href',state.running?'#i-pause':'#i-play');
 $('#explode-range').value=Math.round(state.explodeTarget*100);$('#explode-label').textContent=Math.round(state.explodeTarget*100)+'%';
 for(const id of ['rpm','turns','field','hotC','coldC','brake'])$('#'+id).value=state[id];
 $('#hotC-label').textContent=state.hotC+' °C';$('#coldC-label').textContent=state.coldC+' °C';$('#brake-label').textContent=state.brake+'%';
 $('#heater').textContent=state.heater?'加熱：開啟':'加熱：關閉';$('#heater').setAttribute('aria-pressed',String(state.heater));$('#section').textContent=state.section?'剖面：打開':'剖面：關閉';$('#section').setAttribute('aria-pressed',String(state.section));$('#brake-release').textContent=state.brakeEngaged?'煞車：作用':'煞車：釋放';$('#brake-release').setAttribute('aria-pressed',String(state.brakeEngaged));
 $('#time-scale').textContent=thermal?'0.24 倍時間演示；轉速由氣體扭矩、摩擦與負載決定。啟動包含手推起轉。':'自動轉動採 0.18 倍時間演示；讀值為物理轉速';
 $('#rpm-label').textContent=state.rpm+' rpm';$('#turns-label').textContent=state.turns+' 匝';$('#field-label').textContent=fmt(state.field)+' T';
 $('#reverse').setAttribute('aria-pressed',String(state.direction===-1));$('#reverse').textContent=state.direction===-1?'轉向：反轉':'轉向：正轉';
 $('#polarity').setAttribute('aria-pressed',String(state.polarity===-1));$('#polarity').textContent=state.polarity===-1?'磁極：S → N':'磁極：N → S';
 $('#load').setAttribute('aria-pressed',String(state.load));$('#load').textContent=state.load?'負載：接通':'負載：開路';
 $('#field-view').setAttribute('aria-pressed',String(state.showField));$('#chart-toggle').setAttribute('aria-pressed',String(state.showCharts));
 $('#page-number').textContent=String(state.chapter+1).padStart(2,'0')+' / '+String(CHAPTERS.length).padStart(2,'0');$('#previous').disabled=state.chapter===0;$('#next').disabled=state.chapter===CHAPTERS.length-1;
 $('#chapter-caption').textContent=CHAPTERS[state.chapter].kicker;
 const detail=state.selected&&PARTS[state.selected];$('#status').textContent=detail?detail.title:'Fig. '+String(state.chapter+1).padStart(2,'0')+' · '+(thermal?(state.manualActive?'正在手推飛輪':state.running?'熱機實驗進行中':'史特靈熱機 · 直接點書頁操作'):(state.manualActive?'正在手搖發電':state.running?'發電機轉動中':'拖動搖柄，或直接點書頁操作'));
 paintReader();const ch=CHAPTERS[state.chapter],p=sample(state);
 $('#mobile-chapter').innerHTML='<div class="mobile-unit">'+subjectAt(state.chapter).unit+' · '+(state.chapter+1)+' / '+CHAPTERS.length+'</div><h1>'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs[1]+'</p><div class="mobile-ratio">'+(thermal?'轉速 <span data-st-live="rpm"></span><br>機械輸出 <span data-st-live="power"></span>':state.rpm+' rpm → 線圈 '+p.rotorRpm+' rpm<br>感應電壓 <span data-live="emf"></span>')+'</div>';
 if(!webgl){$('#fallback img').src=$('#'+(thermal?'stirling-fallback':'generator-fallback')).textContent;$('#fallback img').alt=thermal?'史特靈雙缸熱機的剖面結構示意':'手搖交流發電機等角結構';$('#fallback h1').textContent=ch.title;$('#fallback p').textContent=ch.paragraphs.join(' ');}
 liveValues();
}
const reader=$('#reader'),accessibleControls=$('#book-accessible-controls');accessibleControls.className='reader-controls';accessibleControls.hidden=false;reader.insertBefore(accessibleControls,$('.sources'));
function paintThermalReader(){
 const ch=CHAPTERS[state.chapter],p=sample(state),c=p.cycle,points=[];
 for(let j=0;j<=180;j++){const q=stThermo(state,j/180*Math.PI*2),x=70+(q.volume-c.minV)/(c.maxV-c.minV)*460,y=250-(q.pressure-c.minP)/(c.maxP-c.minP)*190;points.push((j?'L':'M')+x+','+y);}
 const graph='<svg class="reader-wave" viewBox="0 0 610 300" role="img" aria-label="史特靈熱機的即時壓力體積循環；圈內面積是氣體每圈淨功"><path d="M70 35V250H550" fill="none" stroke="#889b73"/><path d="'+points.join(' ')+'Z" fill="#d3b68233" stroke="#a17e4d" stroke-width="2"/><circle id="reader-pv-dot" r="5" fill="#4d6840"/><text x="10" y="30">p / kPa</text><text x="510" y="281">V / mL</text><text x="10" y="55">'+fmt(c.maxP/1000,0)+'</text><text x="10" y="250">'+fmt(c.minP/1000,0)+'</text><text x="70" y="275">'+fmt(c.minV*1e6,1)+'</text><text x="470" y="275">'+fmt(c.maxV*1e6,1)+'</text></svg>';
 $('#reader-content').innerHTML='<div class="contents-unit">第二部 · 熱與機械 / '+'跨頁 '+(state.chapter+1)+' / '+CHAPTERS.length+'</div><h1 id="reader-title">'+ch.title+'</h1><div class="english">'+ch.subtitle+'</div><p>'+ch.paragraphs.join('</p><p>')+'</p><div class="reader-equation">壓力 <span data-st-live="pressure"></span>　體積 <span data-st-live="volume"></span><br>飛輪 <span data-st-live="rpm"></span>　機械負載 <span data-st-live="power"></span><br>氣體作功 <span data-st-live="gasPower"></span>　摩擦 <span data-st-live="friction"></span><br>飛輪動能 <span data-st-live="kinetic"></span><br>p = nR / (Vh/Th + Vc/Tc + Vr/Tr)<br>每圈理想指示淨功 ∮p dV = '+fmt(c.work,3)+' J</div>'+graph+'<p class="wave-key">熱端 '+fmt(p.Th,2)+' K、冷端 '+fmt(p.Tc,2)+' K；固定氣體總量 '+fmt(p.gasMoles*1000,3)+' mmol。兩曲柄相差 90°，連桿長 43 mm、曲柄半徑 9 mm。理想等溫與完全回熱的效率上限為 '+fmt(c.carnot*100,1)+'%，不是實機效率。溫度設定即時生效，未模擬暖機。</p><div class="energy-note">累積送到煞車負載的機械功<br><strong data-st-live="energy"></strong><small>氣體作功 = 負載輸出 + 摩擦耗散 + 飛輪動能變化。啟動含手推起轉；關閉加熱會令兩端等溫，仍可能先消耗原有飛輪動能。</small></div><h2>零件的工作</h2><div class="reader-parts">'+Object.entries(partsFor(state.chapter)).map(([id,p])=>'<button data-part="'+id+'">'+p.title+'</button>').join('')+'</div>'+(state.selected?'<h2>'+PARTS[state.selected].title+'</h2><p>'+PARTS[state.selected].text+'</p>':'')+'<p>'+ch.caption+'</p>';
 $$('.reader-tabs button').forEach((b,i)=>b.setAttribute('aria-current',String(i===state.chapter)));
}

function paintReader(){
 if(state.chapter>=4){paintThermalReader();return;}
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
$(".reader-tabs").innerHTML = CHAPTERS.map((c, i) => "<button data-chapter='" + i + "'>" + String(i + 1).padStart(2, "0") + " " + (i===0?"發電機 · ":i===4?"熱機 · ":"") + c.label + "</button>").join("");
$(".reader-tabs").addEventListener("click", e => { const b = e.target.closest("[data-chapter]"); if (b) goTo(Number(b.dataset.chapter)); });
$("#reader-content").addEventListener("click", e => { const b = e.target.closest("[data-part]"); if (b) selectPart(b.dataset.part); });
$('#contents').addEventListener('click',()=>{touch();$('#contents-dialog').showModal();});
$('#close-contents').addEventListener('click',()=>$('#contents-dialog').close());
$('#contents-list').innerHTML=SUBJECTS.map(s=>'<section class="contents-part"><div class="contents-unit">'+s.unit+'</div><h2>'+s.title+'</h2><p>'+s.description+'</p>'+CHAPTERS.slice(s.start,s.start+s.count).map((c,j)=>'<button data-open-chapter="'+(s.start+j)+'"><span>'+String(s.start+j+1).padStart(2,'0')+'　'+c.label+' · '+c.title+'</span><span>↗</span></button>').join('')+'</section>').join('');
$('#contents-list').addEventListener('click',e=>{const b=e.target.closest('[data-open-chapter]');if(b){goTo(Number(b.dataset.openChapter));$('#contents-dialog').close();}});
$('#topic-generator').addEventListener('click',()=>goTo(0));$('#topic-stirling').addEventListener('click',()=>goTo(4));
$("#read-mode").addEventListener("click", () => { touch(); reader.showModal(); });
$("#mobile-read").addEventListener("click", () => reader.showModal());
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
  touch(); state.bookOpenTarget = state.bookOpenTarget > 0.5 ? 0 : 1;
  state.running = false; state.flapTarget = 0; hideLens();
  if (!state.bookOpenTarget) {
    state.popupTarget = 0; state.explodeTarget = 0; setView("book");
    state.targetToX = 94; state.cameraRadiusTarget *= 0.8;
  } else { state.popupTarget = 1; state.explodeTarget = CHAPTERS[state.chapter].defaultExplode; setView("book"); }
  $("#book-fold").textContent = state.bookOpenTarget ? "闔書" : "翻開";
  $("#book-fold").setAttribute("aria-pressed", String(state.bookOpenTarget > 0.5)); paint();
});
$("#popup").addEventListener("click", () => {
  touch(); state.popupTarget = state.popupTarget > 0.5 ? 0 : 1;
  if (!state.popupTarget) state.running = false;
  paint();
});
function setExplode(value) {
  touch(); state.explodeTarget = clamp(value, 0, 1); state.popupTarget = 1;
  if (value > 0.025) { state.running = false; state.manualActive = false; }
  paint();
}
$("#explode").addEventListener("click", () => setExplode(state.explodeTarget > 0.55 ? 0 : 1));
$("#explode-range").addEventListener("input", e => setExplode(Number(e.target.value) / 100));
function toggleRun() {
  touch(); state.running = !state.running;
  if(state.chapter>=4&&state.running&&Math.abs(state.stOmega)<5)stNudge(state);
  if (state.running) { state.popupTarget = 1; state.bookOpenTarget = 1; state.explodeTarget = 0; }
  paint();
}
$("#play").addEventListener("click", toggleRun);
$("#rpm").addEventListener("input", e => { touch(); state.rpm = Number(e.target.value); paint(); });
function setParameter(name,value){touch();state[name]=value;paint();}
$('#turns').addEventListener('input',e=>setParameter('turns',Number(e.target.value)));
for(const id of ['hotC','coldC','brake'])$('#'+id).addEventListener('input',e=>setParameter(id,Number(e.target.value)));
$('#heater').addEventListener('click',()=>{touch();state.heater=!state.heater;paint();});
$('#section').addEventListener('click',()=>{touch();state.section=!state.section;paint();});
$('#brake-release').addEventListener('click',()=>{touch();state.brakeEngaged=!state.brakeEngaged;paint();});
$('#field').addEventListener('input',e=>setParameter('field',Number(e.target.value)));
$('#reverse').addEventListener('click',()=>{touch();state.direction*=-1;paint();});
$('#polarity').addEventListener('click',()=>{touch();state.polarity*=-1;paint();});
$('#load').addEventListener('click',()=>{touch();state.load=!state.load;paint();});
$('#field-view').addEventListener('click',()=>{touch();state.showField=!state.showField;paint();});
$('#chart-toggle').addEventListener('click',()=>{touch();state.showCharts=!state.showCharts;paint();});

let flip = null;
function commitChapter(chapter) {
  const old=subjectAt(state.chapter).id,next=subjectAt(chapter).id;subjectPhases[old]=state.phase;
  $('#part-tip').hidden=true;state.chapter = chapter;if(old!==next)state.phase=subjectPhases[next];state.selected = null;activateMachine();machine.select(null);
  try{history.replaceState(null,'','#'+next+'-'+(chapter%4+1));}catch{}
  state.running = chapter<4&&(chapter === 1 || chapter === 2 || chapter === 3); state.manualActive = false;
  state.explodeTarget = CHAPTERS[chapter].defaultExplode;
  state.popupTarget = 1; state.flapTarget = 0; paint();
  setView("book");
  announce("第 " + (chapter + 1) + " 章，" + CHAPTERS[chapter].title);
}
function goTo(chapter) {
  touch(); chapter = clamp(chapter, 0, CHAPTERS.length-1);
  if (state.turning || chapter === state.chapter) return;
  if (reduced || !webgl) { commitChapter(chapter); return; }
  state.turning = true; state.running = false;
  hideLens();
  state.bookOpenTarget=1;flip = { time: 0, chapter, committed: false, stage:'lower',oldPopup: state.popupTarget };
  state.popupTarget = 0; state.explodeTarget = 0;state.flapTarget=0;
  book.beginTurn?.(chapter<state.chapter); paint();
}
$("#previous").addEventListener("click", () => goTo(state.chapter - 1));
$("#next").addEventListener("click", () => goTo(state.chapter + 1));
$(".wordmark").addEventListener("click", e => { e.preventDefault(); $("#contents").click(); });
$("#reset").addEventListener("click", () => {
  touch(); Object.assign(state,{hotC:320,coldC:25,brake:35,heater:true,section:true,brakeEngaged:true,stOmega:0,stEnergy:{gas:0,load:0,friction:0,kick:0},rpm:40,turns:120,field:.45,direction:1,polarity:1,load:true,showField:true,showCharts:true,manualActive:false,energy:{load:0,copper:0,input:0}}); state.yawTarget = 0; state.zoomTarget = 1; state.explodeTarget = CHAPTERS[state.chapter].defaultExplode;
  state.popupTarget = 1; state.running = false; state.phase = state.chapter>=4?2:.8; state.selected = null; state.flapTarget = 0; machine.select(null); setView("book"); paint();
});
document.addEventListener("keydown", e => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) || reader.open || $('#contents-dialog').open) return;
  if (e.key === "ArrowRight") { e.preventDefault(); goTo(state.chapter + 1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); goTo(state.chapter - 1); }
  if (e.code === "Space") { e.preventDefault(); toggleRun(); }
  if (e.key.toLowerCase() === "e") setExplode(state.explodeTarget > 0.55 ? 0 : 1);
  if (e.key.toLowerCase() === "r") $("#reset").click();
  if (e.key.toLowerCase() === "p") $("#popup").click();
  if (e.key.toLowerCase() === "b") $("#book-fold").click();
  if (e.key.toLowerCase() === "m") $("#magnify").click();
  if (e.key === "Escape") { state.selected = null; machine.select(null); state.lensEnabled = false; $("#magnify").setAttribute("aria-pressed", "false"); hideLens(); paint(); }
});
function rayAt(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  ray.setFromCamera(pointer, camera); return ray;
}
const magnifier = createMagnifier({ canvas, getRenderer: () => renderer, getCamera: () => camera, state, book, rayAt, partInfo: PARTS, chapters: CHAPTERS });
const hideLens = () => magnifier.hide();
let drag = null, lastHover = null, hoverAt = 0, pressTimer = null;
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
  if (page?.region?.kind === "slider" && state.open > 0.95) {
    drag = { ...drag, kind: "page-slider", region: page.region, side: page.side };
    canvas.setPointerCapture(e.pointerId); pageSlider(e, drag, true); return;
  }
  const objectHit=rayAt(e).intersectObjects(machine.meshes,false)[0];
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
    if (drag.kind === "page-slider") { drag.moved = true; pageSlider(e, drag); return; }
    if(drag.kind==='crank'){
      const angle=machine.crankAngleAt(rayAt(e).ray),now=performance.now();
      if(angle!==null&&drag.angle!==null){let delta=angle-drag.angle;delta=Math.atan2(Math.sin(delta),Math.cos(delta));const dt=Math.max(.008,(now-drag.lastAt)/1000);
        const from=state.phase;if(state.chapter>=4){const oldK=.5*ST_SPEC.inertia*state.stOmega**2;state.phase+=delta;state.stOmega=delta/(dt*ST_SPEC.demoScale);const d=delta,p=stThermo(state,(from+state.phase)/2),gas=p.torque*d,bl=state.brakeEngaged?ST_SPEC.brakeViscous*state.brake/100:0,load=bl*state.stOmega**2*dt*ST_SPEC.demoScale,fr=(ST_SPEC.frictionViscous*state.stOmega+ST_SPEC.frictionDry*Math.tanh(state.stOmega/.35))*d;state.stEnergy.gas+=gas;state.stEnergy.load+=load;state.stEnergy.friction+=fr;state.stEnergy.kick+=.5*ST_SPEC.inertia*state.stOmega**2-oldK-gas+load+fr;}else{state.phase-=delta*SPEC.gearRatio;state.direction=delta>0?-1:1;state.rpm=Math.abs(delta/dt)/SPEC.demonstrationScale*30/Math.PI;accumulateEnergy(from,state.phase,dt*SPEC.demonstrationScale);}state.manualActive=true;
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
  const hit = state.popup > 0.5 ? ray.intersectObjects(chart.visible?machine.meshes.concat(chart.meshes):machine.meshes, false)[0] : null, part = hit?.object.userData.part;
  const pageHit = ray.intersectObjects(book.pages, false)[0];
  const pageRegion = pageHit && book.hit(pageHit.uv, pageHit.object.userData.bookSide);
  magnifier.show(e, part, pageHit);
  if (part && PARTS[part]) {
    $("#part-tip").textContent = PARTS[part].title;
    $("#part-tip").style.left = Math.min(e.clientX + 15, innerWidth - 170) + "px";
    $("#part-tip").style.top = Math.max(e.clientY - 32, 5) + "px"; $("#part-tip").hidden = false;
    canvas.style.cursor = "pointer";
  } else { $("#part-tip").hidden = true; canvas.style.cursor = pageRegion?.kind === "slider" ? "ew-resize" : pageRegion ? "pointer" : pageHit?.object.userData.bookSide === "left" ? "zoom-in" : "grab"; }
  lastHover = part;
});
canvas.addEventListener("pointerup", e => {
  if (!drag) return;
  clearTimeout(pressTimer);
  if (drag.kind === "page-slider") {
    pageSlider(e, drag, true); drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    return;
  }
  if(drag.kind==='crank'){state.manualActive=false;if(state.chapter>=4){state.stEnergy.kick-=.5*ST_SPEC.inertia*state.stOmega**2;state.stOmega=0;}state.rpm=clamp(Math.round(state.rpm/5)*5,5,90);paint();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;return;}
  const moved = drag.moved || drag.lens; drag = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (moved || state.turning) return;
  const flapHit = rayAt(e).intersectObject(book.flap, false)[0];
  if (flapHit) { state.flapTarget = state.flapTarget > 0.5 ? 0 : 1; announce(state.flapTarget ? "答案已掀開" : "答案已蓋回"); return; }
  const machineHit = rayAt(e).intersectObjects(chart.visible?machine.meshes.concat(chart.meshes):machine.meshes, false)[0];
  const page = pageAt(e);
  if (page?.region && (!machineHit || machineHit.distance > page.hit.distance) && activatePage(page.region)) return;
  if (machineHit && state.popup > 0.35) { if(machineHit.object.userData.part==='lamp') $('#load').click();else if(['加熱開關撥桿','加熱器開關座'].includes(machineHit.object.userData.name))$('#heater').click();else if(machineHit.object.userData.part==='st_brake')selectPart('st_brake'); else selectPart(machineHit.object.userData.part); return; }
});
canvas.addEventListener("pointercancel", () => { clearTimeout(pressTimer); drag = null; state.manualActive=false; hideLens(); });
canvas.addEventListener("pointerleave", () => { if (!drag) { $("#part-tip").hidden = true; hideLens(); } });
canvas.addEventListener("wheel", e => {
  if (innerWidth < 700) return;
  e.preventDefault(); touch(); state.zoomTarget = clamp(state.zoomTarget - e.deltaY * 0.00065, 0.82, 1.55);
}, { passive: false });
canvas.addEventListener("webglcontextlost", e => {
  e.preventDefault(); state.running = false; $("#status").textContent = "圖形暫停，請重新整理；閱讀模式仍可使用。";
});
canvas.addEventListener("webglcontextrestored", () => location.reload());

const cameraTarget = new THREE.Vector3();
function renderOnce() {
  machine.pose(state);
  machine.root.matrix.multiply(yawMatrix.makeRotationY(state.yaw));
  machine.root.matrixWorldNeedsUpdate = true;
  book.setOpen(state.open); book.setFlap(state.flap); chart.pose(state);
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
    state.popup = reduced ? state.popupTarget : follow(state.popup, state.popupTarget, dt, 0.48);
    state.explode = reduced ? state.explodeTarget : follow(state.explode, state.explodeTarget, dt, 0.42);
  }
  state.yaw = reduced ? state.yawTarget : follow(state.yaw, state.yawTarget, dt, 0.14);
  state.zoom = follow(state.zoom, state.zoomTarget, dt, 0.18);
  state.flap = reduced ? state.flapTarget : follow(state.flap, state.flapTarget, dt, 0.24);
  const camEase = drag ? 0.14 : 0.55;
  for (const [key, target] of [["cameraYaw", "cameraYawTarget"], ["cameraElevation", "cameraElevationTarget"], ["cameraRadius", "cameraRadiusTarget"], ["targetX", "targetToX"], ["targetY", "targetToY"], ["targetZ", "targetToZ"]])
    state[key] = reduced ? state[target] : follow(state[key], state[target], dt, camEase);
  if (state.running && state.explode < 0.025 && state.popup > 0.98 && !state.turning){
    if(state.chapter>=4)stAdvance(state,dt*ST_SPEC.demoScale);else{const from=state.phase,physicalDt=dt*SPEC.demonstrationScale;state.phase+=state.direction*state.rpm*SPEC.gearRatio/60*Math.PI*2*physicalDt;accumulateEnergy(from,state.phase,physicalDt);}
  }
  if (!reduced && !drag && !state.running && guideClock === null && now - state.touchedAt > 18000)
    state.cameraYawTarget = viewProfiles[state.view].yaw + Math.sin((now - state.touchedAt - 18000) / 15000) * 0.035;
  if (guideClock !== null) {
    guideClock += dt;
    const steps = state.chapter>=4?[{view:'book',explode:0,part:null,running:false,text:'第二部：溫差驅動的熱機'},{view:'mechanism',explode:0,part:'st_pistons',running:true,text:'兩顆動力活塞，相差九十度'},{view:'mechanism',explode:.85,part:'st_regenerator',running:false,text:'拆開回熱器與傳動機構'},{view:'charts',explode:0,part:null,running:true,text:'同時比較壓力、體積與機械輸出'},{view:'reading',explode:0,part:null,running:false,text:'回到書頁，設計溫差與負載的實驗'}]:[
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
      state.explodeTarget = s.explode; state.running = s.running;if(state.chapter>=4&&s.running&&Math.abs(state.stOmega)<5)stNudge(state); state.selected = s.part;
      machine.select(s.part); setView(s.view, true); paint(); announce(s.text);
    }
  }
  if (flip) {
    if(flip.stage==='lower'&&state.popup<.025&&state.explode<.025&&state.flap<.025&&state.open>.95)flip.stage='turn';
    if(flip.stage==='turn')flip.time += dt;
    const p = clamp((flip.time - 0.22) / 0.85, 0, 1);
    book.turn(p);
    if (p > 0.5 && !flip.committed) { commitChapter(flip.chapter); flip.committed = true; state.popupTarget = 0; }
    if (p === 1) {
      state.turning = false; flip = null; state.popupTarget = 1; book.endTurn?.(); paint();
    }
  }
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
  pagePoint(side,x,y){const page=book.pages[side==='left'?0:1],sign=side==='left'?-1:1,xx=x-93,zz=y-122;const yy=1.1+4.8*Math.exp(-(93+xx*sign)/17)+.35*Math.pow(Math.abs(xx)/93,5)+.12*Math.cos(zz/244*Math.PI);const v=page.localToWorld(new THREE.Vector3(xx,yy,zz)).project(camera),r=canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2+r.left,y:(1-v.y)*r.height/2+r.top};},
  crankPoint(){const v=machine.pageAnchor().project(camera),r=canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2+r.left,y:(1-v.y)*r.height/2+r.top};},
  get parts(){return machine.physicalParts.map(p => ({ name: p.name, category: p.category }));},
  attachmentEvidence(){return machine.attachmentEvidence?.()??[];},
  get diagnostics() { return { parts: machine.physicalParts.length, renderedFeatures: machine.parts.length, webgl, kinematics: state.chapter>=4?auditStirling():auditModel(),subject:subjectAt(state.chapter).id, renderer: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } : null, averageRenderMs: frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length) }; },
  snapshot() { return { ...state, physics: sample(state) }; }
};
applyTheme(); paint(); resize();
await document.fonts.ready;
paint();
requestAnimationFrame(frame);
