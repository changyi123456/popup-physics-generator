import * as THREE from "./vendor/three.module.js";
import { CHAPTERS, PARTS, SPEC, sample, fmt, gearProfile } from "./model.js";
import { paperMaterial, inkEdges } from "./ink.js";

export const PAPER = { width: 186, depth: 244, leftX: -98, rightX: 98 };
const serif = '"Book Hand","Kaiti TC","KaiTi",cursive';
const mono = serif;
const sans = serif;

function canvas(width, height) {
  const c = document.createElement("canvas"); c.width = width; c.height = height; return c;
}
function texture(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
function noiseTexture(size = 256, cloth = false) {
  const c = canvas(size, size), ctx = c.getContext("2d"), pixels = ctx.createImageData(size, size);
  let seed = 97531;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = i % size, y = Math.floor(i / size);
    const n = cloth ? 112 + (x % 3 === 0 ? 23 : 0) + (y % 3 === 0 ? 18 : 0) + (seed / 4294967296 - 0.5) * 12 : 127 + (seed / 4294967296 - 0.5) * 15;
    pixels.data.set([n, n, n, 255], i * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  const t = texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(cloth ? 50 : 12, cloth ? 38 : 12);
  return t;
}
function roundShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, z = -d / 2;
  s.moveTo(x + r, z); s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z); return s;
}
function slab(w, d, h, r = 2) {
  const g = new THREE.ExtrudeGeometry(roundShape(w, d, r), { depth: h, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.35, bevelSegments: 3, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); return g;
}
function text(ctx, str, x, y, size, color, opts = {}) {
  ctx.fillStyle = color; ctx.font = (opts.italic ? "italic " : "") + (opts.weight || 400) + " " + size + "px " + (opts.mono ? mono : opts.sans ? sans : serif);
  ctx.textAlign = opts.align || "left"; ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = (opts.spacing || 0) + "px";
  ctx.fillText(str, x, y); ctx.letterSpacing = "0px";
}
function wrap(ctx, str, x, y, maxWidth, size, color, leading = 7) {
  ctx.font = "400 " + size + "px " + serif; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.letterSpacing = "0px";
  let line = "";
  for (const char of str) {
    if (ctx.measureText(line + char).width > maxWidth && line) { ctx.fillText(line, x, y); y += leading; line = char; } else line += char;
  }
  if (line) ctx.fillText(line, x, y);
  return y + leading;
}
function penLine(ctx, x1, y1, x2, y2, wobble = 0.16) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= 12; i++) {
    const t = i / 12, offset = Math.sin(t * Math.PI) * Math.sin(t * 14.3 + x1 * 0.17 + y1 * 0.23) * wobble;
    ctx.lineTo(x1 + dx * t + nx * offset, y1 + dy * t + ny * offset);
  }
  ctx.stroke();
}
function penBox(ctx, x, y, w, h) {
  ctx.fillRect(x, y, w, h);
  penLine(ctx, x, y, x + w, y); penLine(ctx, x + w, y, x + w, y + h);
  penLine(ctx, x + w, y + h, x, y + h); penLine(ctx, x, y + h, x, y);
}
function rule(ctx, y, color, x1 = 15, x2 = 171) { ctx.strokeStyle = color; ctx.lineWidth = 0.22; penLine(ctx, x1, y, x2, y); }
function gearIcon(ctx, x, y, teeth = 18, ring = false, brass = false, dark = false) {
  const points = gearProfile(teeth, 1, ring);
  const scale = ring ? 0.15 : 0.5, color = brass ? "#9e7b39" : dark ? "#c1c2b6" : "#646b65";
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.beginPath();
  if (ring) { ctx.arc(0, 0, 42, 0, Math.PI * 2); points.slice().reverse().forEach(([xx, yy], i) => i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy)); ctx.closePath(); }
  else { points.forEach(([xx, yy], i) => i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy)); ctx.closePath(); ctx.moveTo(3, 0); ctx.arc(0, 0, 3, 0, -Math.PI * 2, true); }
  ctx.fillStyle = color; ctx.fill("evenodd"); ctx.strokeStyle = dark ? "#e7e0d0" : "#3a433c"; ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore();
}

export function createBook() {
  const group = new THREE.Group(), pageMeshes = [], canvases = [], pageTextures = [], hitRegions = [];
  const sideGroups = [], shadowPages = [];
  const paperMat = paperMaterial("#eee4cc", 1.1);
  const coverMat = paperMaterial("#b7c2a3", 1.4);
  const foilMat = paperMaterial("#536349", 1);
  for (const side of [-1, 1]) {
    const sideGroup = new THREE.Group(); group.add(sideGroup); sideGroups.push(sideGroup);
    const cover = new THREE.Mesh(slab(198, 258, 3, 2.8), coverMat);
    cover.position.set(side * 100, -7.6, 0); cover.castShadow = cover.receiveShadow = true; sideGroup.add(cover);
    inkEdges(cover);
    const blockGeometry = new THREE.BoxGeometry(188, 6, 246, 48, 1, 8);
    const bp = blockGeometry.attributes.position;
    const curve = xx => 1.1 + 4.8 * Math.exp(-(93 + xx * side) / 17) + 0.35 * Math.pow(Math.abs(xx) / 93, 5);
    for (let j = 0; j < bp.count; j++) bp.setY(j, bp.getY(j) > 0 ? curve(bp.getX(j)) - 0.25 : -5);
    bp.needsUpdate = true; blockGeometry.computeVertexNormals();
    const leafBlock = new THREE.Mesh(blockGeometry, paperMat);
    leafBlock.position.set(side * 98, 0, 0); leafBlock.castShadow = leafBlock.receiveShadow = true; sideGroup.add(leafBlock);
    inkEdges(leafBlock, "#6f725c", 0.6);
    for (let i = 0; i < 13; i++) {
      const pts = [];
      const yAt = x => -4.8 + i * 0.41 + curve(x) * (i / 13);
      for (let j = 0; j <= 48; j++) { const x = -94 + j / 48 * 188; pts.push(new THREE.Vector3(x, yAt(x), -123.1)); }
      for (let j = 0; j <= 48; j++) { const x = 94 - j / 48 * 188; pts.push(new THREE.Vector3(x, yAt(x), 123.1)); }
      const lines = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: i % 3 ? "#8e927b" : "#65725d", transparent: true, opacity: 0.5 }));
      lines.position.x = side * 98; sideGroup.add(lines);
    }
    const c = canvas(1488, 1952), t = texture(c);
    const geo = new THREE.PlaneGeometry(186, 244, 80, 40); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const xx = p.getX(i), zz = p.getZ(i), spineDistance = 93 + xx * side;
      p.setY(i, curve(xx) + 0.12 * Math.cos(zz / 244 * Math.PI));
    }
    p.needsUpdate = true; geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide });
    const page = new THREE.Mesh(geo, mat); page.position.x = side * 98;
    page.receiveShadow = true; page.castShadow = true; page.userData.bookSide = side < 0 ? "left" : "right";
    sideGroup.add(page); pageMeshes.push(page); canvases.push(c); pageTextures.push(t);
    const shadow = new THREE.Mesh(geo, new THREE.ShadowMaterial({ color: "#344139", opacity: 0.28, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    shadow.position.copy(page.position); shadow.position.y = 0.035; shadow.receiveShadow = true; shadow.renderOrder = 1; sideGroup.add(shadow); shadowPages.push(shadow);
    // A narrow inked rule follows the exposed paperboard edge.
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 250), foilMat);
    trim.position.set(side * 196, -4.35, 0); sideGroup.add(trim);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 255, 32), coverMat);
  spine.rotation.x = Math.PI / 2; spine.position.y = -4.4; group.add(spine);
  const ribbonMat = paperMaterial("#b99d6c", 0.8); ribbonMat.side = THREE.DoubleSide;
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 24), ribbonMat);
  ribbon.rotation.x = -Math.PI / 2; ribbon.rotation.z = -0.08; ribbon.position.set(9.5, -6.8, 133); group.add(ribbon);

  const coverArt = canvas(800, 1200), ca = coverArt.getContext("2d");
  ca.fillStyle = "#cbd0b2"; ca.fillRect(0, 0, 800, 1200);
  ca.strokeStyle = "#667557"; ca.lineWidth = 1.5;
  penBox(ca, 35, 35, 730, 1130); ca.fillStyle = "rgba(203,208,178,0)"; penBox(ca, 49, 49, 702, 1102);
  for (let i = 0; i < 180; i++) { ca.strokeStyle = "rgba(76,91,57,.06)"; penLine(ca, 55 + i * 3.7, 60, 95 + i * 3.5, 1140, 0.8); }
  text(ca, "物理之書", 400, 380, 78, "#344a34", { align: "center", spacing: 14 });
  text(ca, "THE BOOK OF", 400, 490, 26, "#4d6145", { align: "center", spacing: 5 });
  text(ca, "PHYSICS", 400, 535, 29, "#344a34", { align: "center", spacing: 4 });
  ca.save(); ca.translate(400, 785); ca.strokeStyle = "#42583e"; ca.lineWidth = 2.5;
  ca.strokeRect(-65,-112,130,224);ca.strokeRect(-55,-103,110,206);
  for(let j=0;j<5;j++){ca.strokeRect(-61+j*2,-108+j*2,122-j*4,216-j*4);}
  ca.beginPath();ca.moveTo(0,-160);ca.lineTo(0,160);ca.stroke();
  text(ca,"N",-165,14,55,"#6c7560",{align:"center"});text(ca,"S",165,14,55,"#6c7560",{align:"center"});
  for(let j=0;j<4;j++){penLine(ca,-130,-70+j*45,-80,-70+j*45,.7);penLine(ca,80,-70+j*45,130,-70+j*45,.7);}
  ca.restore(); text(ca, "VOL. 02 · 電磁感應", 400, 1070, 24, "#42583e", { align: "center", spacing: 3 });
  const coverLabel = new THREE.Mesh(new THREE.PlaneGeometry(143, 216), new THREE.MeshBasicMaterial({ map: texture(coverArt), toneMapped: false }));
  coverLabel.rotation.x = Math.PI / 2; coverLabel.rotation.z = Math.PI; coverLabel.position.set(-99, -8.15, 0); sideGroups[0].add(coverLabel);

  const flapCanvas = canvas(1240, 160), flapCtx = flapCanvas.getContext("2d");
  const flapTexture = texture(flapCanvas);
  const flapGeometry = new THREE.PlaneGeometry(155, 20, 30, 1); flapGeometry.rotateX(-Math.PI / 2); flapGeometry.translate(0, 0, 10);
  const flap = new THREE.Mesh(flapGeometry, new THREE.MeshBasicMaterial({ map: flapTexture, side: THREE.DoubleSide, toneMapped: false }));
  flap.position.set(-98, 1.8, 86); flap.castShadow = true; flap.userData.flap = true; sideGroups[0].add(flap);
  const sliderThumbs = [];
  for (let i = 0; i < 4; i++) {
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.6, 32), paperMaterial("#c0ad78", 0.45));
    inkEdges(thumb);
    thumb.castShadow = true; thumb.receiveShadow = true; sideGroups[i === 3 ? 1 : 0].add(thumb); sliderThumbs.push(thumb);
  }

  let latest = {}, turnMesh = null, turnTexture = null, turnOriginal = null;
  function beginTurn() {
    if (turnMesh) return;
    const snapshot = canvas(1488, 1952);
    snapshot.getContext("2d").drawImage(canvases[1], 0, 0);
    turnTexture = texture(snapshot);
    const geometry = new THREE.PlaneGeometry(186, 244, 70, 24);
    geometry.rotateX(-Math.PI / 2);
    turnOriginal = geometry.attributes.position.array.slice();
    turnMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      map: turnTexture, side: THREE.DoubleSide, roughness: 0.96
    }));
    turnMesh.castShadow = turnMesh.receiveShadow = true;
    turnMesh.visible = false; group.add(turnMesh);
  }
  function endTurn() {
    if (!turnMesh) return;
    group.remove(turnMesh); turnMesh.geometry.dispose(); turnMesh.material.dispose(); turnTexture.dispose();
    turnMesh = null; turnTexture = null; turnOriginal = null;
  }
  function draw(state) {
    latest=state;
    const {chapter=0,theme='light',selected=null,rpm=40,turns=120,field=.45}=state,ch=CHAPTERS[chapter],p=sample(state),dark=theme==='dark';
    const ink=dark?'#e6dfd0':'#293c2d',muted=dark?'#b2b6a3':'#647258',line=dark?'#64715a':'#a1ad8c',paper=dark?'#303a32':'#f3eedf',accent=dark?'#cdbb84':'#8b663a';
    hitRegions.length=0;
    const drawButton=(ctx,b,x,y,w=48)=>{
      ctx.fillStyle=b.active?(dark?'#56644a':'#d9dfc2'):(dark?'#3b4635':'#eee8d7');ctx.strokeStyle=b.active?muted:line;ctx.lineWidth=.28;penBox(ctx,x,y,w,11);
      if(b.active){ctx.strokeStyle=dark?'#8e9c7b':'#a9b88c';ctx.lineWidth=.17;for(let j=0;j<Math.floor(w/3);j++)penLine(ctx,x+1+j*3,y+10,x+3+j*3,y+1,.08);}
      text(ctx,b.label,x+w/2,y+7.5,3.5,ink,{align:'center'});hitRegions.push({side:'right',x,y:y-1,w,h:13,kind:'button',action:b.action});
    };
    canvases.forEach((c,pageIndex)=>{
      const ctx=c.getContext('2d');ctx.setTransform(8,0,0,8,0,0);ctx.fillStyle=paper;ctx.fillRect(0,0,186,244);
      let seed=35;ctx.fillStyle=dark?'rgba(240,232,201,.03)':'rgba(97,83,55,.04)';
      for(let i=0;i<600;i++){seed=seed*16807%2147483647;const x=seed/2147483647*186;seed=seed*16807%2147483647;ctx.fillRect(x,seed/2147483647*244,.07,.05);}
      rule(ctx,13,line);rule(ctx,229,line);
      if(!pageIndex){
        text(ctx,ch.kicker,15,23,4.3,ink);text(ctx,ch.title,14,47,chapter===1?14.5:17,ink,{weight:600,spacing:.1});text(ctx,ch.subtitle,15,58,3.2,muted);
        text(ctx,ch.paragraphs[0],15,73,4.8,accent);wrap(ctx,ch.paragraphs[1],15,85,155,4.45,ink,7);
        if(chapter===0){
          [['01','旋轉線圈','coil'],['02','磁極與氣隙','magnets'],['03','集電環與電刷','rings'],['04','搖柄與增速齒輪','gears']].forEach((r,i)=>{
            const y=115+i*11.7;if(selected===r[2]){ctx.fillStyle=dark?'#47533d':'#e1e6ca';ctx.fillRect(14,y-7,157,10.5);}
            text(ctx,r[0],16,y,3.4,accent);text(ctx,r[1],30,y,4,ink);text(ctx,'點選 ↗',168,y,2.8,muted,{align:'right'});rule(ctx,y+4,line);hitRegions.push({x:14,y:y-8,w:157,h:12,part:r[2]});
          });
        }else if(chapter===1){
          text(ctx,'每匝磁通量',16,116,3.4,muted);text(ctx,'Φ = BA cosθ',16,128,7.2,ink);
          text(ctx,'ε = −N dΦ/dt',16,146,7.2,accent);
          text(ctx,'θ = '+fmt((((state.phase% (2*Math.PI))+2*Math.PI)%(2*Math.PI))*180/Math.PI,0)+'°',169,116,4.1,ink,{align:'right'});
          text(ctx,'ε = '+fmt(p.emf)+' V',169,157,4.8,ink,{align:'right'});
        }else if(chapter===2){
          const x=43,w=126,phase=((state.phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2),f=phase/(Math.PI*2);
          const stroke=(fn,base,height,color,dashed=false)=>{ctx.strokeStyle=color;ctx.lineWidth=.38;ctx.setLineDash(dashed?[1,.7]:[]);ctx.beginPath();for(let j=0;j<=160;j++){const xx=x+j/160*w,yy=base-fn(j/160*2*Math.PI)*height;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();ctx.setLineDash([]);};
          ctx.strokeStyle=dark?'#68765d':'#c3cbb1';ctx.lineWidth=.15;
          for(let k=0;k<=4;k++){const xx=x+k*w/4;penLine(ctx,xx,107,xx,160,.04);text(ctx,['0','π/2','π','3π/2','2π'][k],xx,167,2.4,muted,{align:'center'});}
          for(const yy of [115,135,158])penLine(ctx,x,yy,x+w,yy,.05);
          stroke(a=>(state.polarity??1)*Math.cos(a),115,6.5,'#7e9c90');
          stroke(a=>(state.direction??1)*(state.polarity??1)*Math.sin(a),135,6.5,p.motion?accent:'#b3aa93',!p.motion);
          stroke(a=>state.load?Math.sin(a)**2:0,158,11,p.motion?'#71864f':'#a8b099',!p.motion);
          const cx=x+f*w;ctx.strokeStyle=ink;ctx.lineWidth=.22;penLine(ctx,cx,107,cx,160,.03);
          [[115-(state.polarity??1)*Math.cos(phase)*6.5,'#7e9c90'],[135-(p.motion?p.emf/Math.max(p.peak,1e-9):0)*6.5,accent],[158-(p.settingPeakPower?p.loadPower/p.settingPeakPower:0)*11,'#71864f']].forEach(([yy,color])=>{ctx.beginPath();ctx.arc(cx,yy,.75,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});
          text(ctx,'Φ / mWb',15,111,2.7,muted);text(ctx,fmt(p.flux*1000,2),15,118,3.8,ink);
          text(ctx,'ε / V',15,131,2.7,muted);text(ctx,fmt(p.emf),15,138,3.8,accent);
          text(ctx,'P / W',15,151,2.7,muted);text(ctx,fmt(p.loadPower,2),15,158,3.8,ink);
        }else{
          [['機械輸入',p.mechanicalPower,'W'],['燈泡功率',p.loadPower,'W'],['線圈發熱',p.copperLoss,'W']].forEach((r,i)=>{const y=112+i*12;text(ctx,r[0],17,y,4,ink);text(ctx,fmt(r[1],3)+' '+r[2],168,y,4.6,i===1?accent:ink,{align:'right'});rule(ctx,y+5,line);});
          text(ctx,'累積送到燈泡',17,151,3.3,muted);text(ctx,fmt(p.energy.load,3)+' J',168,153,6,accent,{align:'right'});text(ctx,'每圈預測 '+fmt(p.cycleEnergy,3)+' J · 兩次輸出高峰',17,165,3.1,muted);
        }
        rule(ctx,171,line);
        const settings=[{action:'rpm',label:'手搖轉速',value:rpm,min:0,max:90,step:5,y:180,unit:' rpm'}, {action:'turns',label:'線圈匝數',value:turns,min:40,max:240,step:20,y:191,unit:' 匝'}, {action:'field',label:'磁場強度',value:field,min:.15,max:.9,step:.05,y:202,unit:' T'}];
        settings.forEach((s,i)=>{const f=Math.max(0,Math.min(1,(s.value-s.min)/(s.max-s.min))),x=54+f*76;text(ctx,s.label,15,s.y+1.4,3.4,ink);ctx.strokeStyle=line;ctx.lineWidth=.45;penLine(ctx,54,s.y,130,s.y);text(ctx,(s.action==='field'?fmt(s.value):s.value)+s.unit,170,s.y+1.4,3.3,muted,{align:'right'});
          hitRegions.push({side:'left',x:49,y:s.y-4,w:87,h:9,kind:'slider',action:s.action,from:54,to:130,min:s.min,max:s.max,step:s.step});sliderThumbs[i].position.set(-191+x,1.8,s.y-122);
        });
        text(ctx,ch.answer,17,216,3.1,ink);text(ctx,ch.caption,15,225,2.6,muted);
        text(ctx,chapter?'← 前章':'物理之書',15,237,3.3,chapter?ink:muted);if(chapter)hitRegions.push({side:'left',x:10,y:230,w:37,h:12,kind:'button',action:'previous'});text(ctx,String(chapter*2+2).padStart(2,'0'),170,237,3.1,muted,{align:'right'});
      }else{
        text(ctx,'Fig. '+String(chapter+1).padStart(2,'0'),170,24,4,ink,{align:'right'});text(ctx,ch.figure,170,32,4.2,ink,{align:'right'});
        text(ctx,'ε = '+fmt(p.emf)+' V',16,24,5.6,accent);text(ctx,'線圈 '+p.rotorRpm+' rpm',16,32,3.5,muted);text(ctx,'E燈泡 = '+fmt(p.energy.load,2)+' J',16,43,3.8,ink);
        text(ctx,state.showField===false?'磁場：隱藏 ○':'磁場：顯示 ◎',170,43,3.3,muted,{align:'right'});hitRegions.push({side:'right',x:127,y:36,w:46,h:10,kind:'button',action:'field-view'});text(ctx,state.showCharts===false?'即時圓柱：隱藏':'即時圓柱：顯示',170,54,3.2,muted,{align:'right'});hitRegions.push({side:'right',x:127,y:48,w:46,h:10,kind:'button',action:'chart-toggle'});
        ctx.strokeStyle=line;ctx.lineWidth=.2;ctx.strokeRect(24,71,137,105);ctx.setLineDash([1.5,1.5]);ctx.beginPath();ctx.ellipse(93,119,34,43,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        const detail=selected&&PARTS[selected];text(ctx,detail?detail.title:(p.motion?'正在把機械功轉成電能':'拖動搖柄，讓線圈開始轉'),16,166,3.4,detail?accent:muted);
        const buttons=[{action:'popup',label:state.popupTarget>.5?'收回紙面 ↓':'圖解立起 ↗',active:state.popupTarget>.5},{action:'explode',label:state.explodeTarget>.55?'組裝':'分解',active:state.explodeTarget>.55},{action:'play',label:state.running?'停轉':'自動轉動 ▷',active:state.running}];
        buttons.forEach((b,i)=>drawButton(ctx,b,15+i*52,172));
        [{action:'reverse',label:state.direction===-1?'轉向：反轉':'轉向：正轉',active:state.direction===-1},{action:'polarity',label:state.polarity===-1?'磁極：S → N':'磁極：N → S',active:state.polarity===-1},{action:'load',label:state.load?'負載：接通':'負載：開路',active:state.load}].forEach((b,i)=>drawButton(ctx,b,15+i*52,190));
        const ex=state.explodeTarget??0,x=46+ex*93;text(ctx,'拆解',15,214,3.6,ink);ctx.strokeStyle=line;ctx.lineWidth=.55;penLine(ctx,46,212,139,212);text(ctx,Math.round(ex*100)+'%',152,213.5,3.1,muted,{align:'right'});
        ctx.fillStyle='rgba(0,0,0,0)';ctx.strokeStyle=line;ctx.lineWidth=.25;penBox(ctx,159,205.5,12,12);text(ctx,'↺',165,214,6.5,ink,{align:'center'});
        hitRegions.push({side:'right',x:41,y:205,w:112,h:14,kind:'slider',action:'explode',from:46,to:139,min:0,max:1,step:.01});hitRegions.push({side:'right',x:158,y:203,w:15,h:17,kind:'button',action:'reset'});sliderThumbs[3].position.set(5+x,1.8,90);
        text(ctx,ch.note,16,225,2.65,muted);text(ctx,'拖空白環視 · Shift 拖曳只轉教具',16,237,2.65,muted);text(ctx,chapter<3?'次章 →':'終章',171,237,3.4,ink,{align:'right'});if(chapter<3)hitRegions.push({side:'right',x:143,y:230,w:34,h:12,kind:'button',action:'next'});
      }
      pageTextures[pageIndex].needsUpdate=true;
    });
    flapCtx.setTransform(8,0,0,8,0,0);flapCtx.fillStyle=dark?'#3c4435':'#e8dfc9';flapCtx.fillRect(0,0,155,20);flapCtx.strokeStyle=line;flapCtx.lineWidth=.25;flapCtx.fillStyle='rgba(0,0,0,0)';penBox(flapCtx,1.1,1.1,152.8,17.8);
    text(flapCtx,'想一想',6,6,2.8,accent);text(flapCtx,ch.question,6,12.5,3.6,ink);text(flapCtx,'掀開 ↗',148,17,2.9,muted,{align:'right'});flapTexture.needsUpdate=true;
    paperMat.color.set(dark?'#3d453a':'#e8ddc5');
  }

  function hit(uv, side = "left") {
    const x = uv.x * 186, y = (1 - uv.y) * 244;
    return hitRegions.find(r => (r.side || "left") === side && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  }
  function printPatch(uv, side, camera, viewportWidth, viewportHeight) {
    const index = side === "left" ? 0 : 1, sign = index === 0 ? -1 : 1, page = pageMeshes[index], source = canvases[index];
    function screen(u, v) {
      const xx = (u - 0.5) * 186, zz = (0.5 - v) * 244;
      const yy = 1.1 + 4.8 * Math.exp(-(93 + xx * sign) / 17) + 0.35 * Math.pow(Math.abs(xx) / 93, 5) + 0.12 * Math.cos(zz / 244 * Math.PI);
      const p = page.localToWorld(new THREE.Vector3(xx, yy, zz)).project(camera);
      return [(p.x + 1) * viewportWidth / 2, (1 - p.y) * viewportHeight / 2];
    }
    const center = screen(uv.x, uv.y), sx = screen(uv.x + 1 / source.width, uv.y), sy = screen(uv.x, uv.y - 1 / source.height);
    return { source, x: uv.x * source.width, y: (1 - uv.y) * source.height,
      a: sx[0] - center[0], b: sx[1] - center[1], c: sy[0] - center[0], d: sy[1] - center[1] };
  }
  return { group, pages: pageMeshes, flap, draw, hit, beginTurn, endTurn, materials: { coverMat, paperMat },
    printPatch, attachRight(object){sideGroups[1].add(object);},
    setOpen(amount) { sideGroups[0].rotation.z = -Math.PI * (1 - amount); },
    setFlap(amount) { flap.rotation.x = -amount * 1.9; },
    turn(amount) {
    if (!turnMesh) return;
    turnMesh.visible = amount > 0 && amount < 1;
    const a = Math.PI * amount, pos = turnMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = turnOriginal[i * 3] + 93, z = turnOriginal[i * 3 + 2];
      const angle = a + Math.sin(u / 186 * Math.PI) * Math.sin(a) * 0.18;
      pos.setXYZ(i, 5 + u * Math.cos(angle), 1.5 + u * Math.sin(angle) * 0.66, z);
    }
    pos.needsUpdate = true; turnMesh.geometry.computeVertexNormals();
  }};
}
