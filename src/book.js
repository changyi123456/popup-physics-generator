import * as THREE from "./vendor/three.module.js";
import { SPEC, fmt, gearProfile } from "./model.js";
import { CHAPTERS, PARTS, BOOK_SPREADS, HISTORIES, sample, subjectAt, parametersFor, switchesFor, measurementsFor, benchValues, benchPlot, vibrationValues, deviceValues } from "./library.js";
import { stThermo } from "./stirling-model.js";
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
  ca.save();ca.translate(400,790);ca.strokeStyle='#4c6242';ca.lineWidth=3;
  ca.beginPath();ca.arc(-90,0,100,0,Math.PI*2);ca.moveTo(-12,0);ca.arc(-90,0,78,0,Math.PI*2);ca.stroke();
  for(let j=0;j<6;j++){const a=j/6*Math.PI*2;penLine(ca,-90,0,-90+78*Math.cos(a),78*Math.sin(a),.6);}
  ca.strokeRect(52,-90,66,180);ca.strokeRect(142,-90,66,180);ca.strokeRect(55,-10,60,16);ca.strokeRect(145,-45,60,16);penLine(ca,85,-10,100,-145,1);penLine(ca,175,-45,160,-145,1);penLine(ca,-90,-145,175,-145,1);
  text(ca,'電磁 · 熱機 · 制動 · 振動',0,180,23,'#42583e',{align:'center'});ca.restore();
  text(ca,'機械與能量 · 立體實驗讀本',400,1070,24,'#42583e',{align:'center',spacing:2});
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

  let latest = {}, turnMesh = null, turnTexture = null, turnOriginal = null,turnDirection=1,turnCanvas=null,turnDiagram=null;
  function beginTurn(backwards=false) {
    if (turnMesh) return;
    const snapshot = canvas(1488, 1952);turnCanvas=snapshot;
    snapshot.getContext("2d").drawImage(canvases[backwards?0:1], 0, 0);
    turnDirection=backwards?-1:1;
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
    if(turnDiagram){turnDiagram.overlay.material.dispose();turnDiagram.target.dispose();turnDiagram=null;}
    group.remove(turnMesh); turnMesh.geometry.dispose(); turnMesh.material.dispose(); turnTexture.dispose();
    turnMesh = null; turnTexture = null; turnOriginal = null;turnCanvas=null;
  }
  function drawHistory(ctx,id,index,colors){
    const {ink,muted,line,accent,dark}=colors,h=HISTORIES[id],n=latest.bookPage??0;
    text(ctx,h.kicker,15,8.5,3.1,muted);text(ctx,String(n+1).padStart(2,'0')+' / '+BOOK_SPREADS.length,171,8.5,3,muted,{align:'right'});
    if(index===0){
      text(ctx,'MECHANICAL SCIENCE · A FIELD NOTE',15,24,3.4,muted);text(ctx,h.title,14,46,14.5,ink);text(ctx,h.subtitle,15,57,2.9,muted);
      wrap(ctx,h.intro,15,73,154,4.3,accent,6.8);wrap(ctx,h.story,15,93,154,4.1,ink,6.8);
      ctx.strokeStyle=line;ctx.lineWidth=.35;penLine(ctx,19,129,19,205);
      h.events.forEach((e,i)=>{const y=134+i*39;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(19,y-1,1.4,0,Math.PI*2);ctx.fill();text(ctx,e[0],26,y,4.2,accent);text(ctx,e[1],26,y+9,4.7,ink);wrap(ctx,e[2],26,y+18,143,3.7,muted,6);});
      text(ctx,'一次發現，常常從反覆比較開始。',15,220,3.7,muted);
    }else{
      text(ctx,'在紙上，重走一次發明的思路',15,26,5,accent);text(ctx,h.sketchTitle,15,39,8,ink);
      // Original concept sketches: drawn ink on paper, never historical replicas.
      ctx.save();ctx.translate(23,52);ctx.strokeStyle=ink;ctx.fillStyle=dark?'#394535':'#e5e8d3';ctx.lineWidth=.5;
      const ln=(a,b,c,d)=>penLine(ctx,a,b,c,d,.13),circle=(x,y,r)=>{ctx.beginPath();ctx.ellipse(x,y,r,r*.98,-.015,0,Math.PI*2);ctx.stroke();};
      if(id==='generator'){
        ctx.fillStyle=dark?'#796651':'#dbc0a0';penBox(ctx,7,31,48,13);text(ctx,'N',12,40,5,ink);text(ctx,'S',43,40,5,ink);ln(23,23,49,23);ln(49,23,44,20);ln(49,23,44,26);
        ctx.fillStyle=dark?'#46533f':'#e1e3cd';for(let i=0;i<10;i++){ctx.beginPath();ctx.ellipse(66+i*3,37,5,19,0,0,Math.PI*2);ctx.stroke();}
        ln(65,55,65,73);ln(65,73,115,73);ln(115,73,115,50);ln(94,19,126,19);ln(126,19,126,38);circle(120,43,11);ln(120,43,115,35);text(ctx,'G',120,49,4,ink,{align:'center'});text(ctx,'磁鐵來回移動',5,8,3.8,muted);text(ctx,'固定線圈',60,8,3.8,muted);text(ctx,'檢流計',105,86,3.6,muted);
      }else if(id==='stirling'){
        for(const [x,c,label] of [[5,dark?'#80634b':'#dbc0a0','熱端'],[108,dark?'#506a62':'#c7d8cc','冷端']]){ctx.fillStyle=c;penBox(ctx,x,25,30,43);text(ctx,label,x+15,20,4,ink,{align:'center'});ln(x+2,50,x+28,50);ln(x+15,50,x+15,75);}
        ctx.fillStyle=dark?'#5c6045':'#d8d8b6';penBox(ctx,48,32,43,25);for(let i=0;i<12;i++)ln(50+i*3.2,34,50+i*3.2,55);ln(35,37,48,37);ln(91,37,108,37);ln(35,52,48,52);ln(91,52,108,52);text(ctx,'回熱材料',69,26,4,ink,{align:'center'});ln(45,72,96,72);ln(96,72,90,69);ln(96,72,90,75);text(ctx,'往返氣流 · 暫存再取回',70,87,3.8,muted,{align:'center'});
      }else if(id==='governor'){
        ln(48,9,48,78);circle(48,14,2);ln(48,14,22,43);ln(48,14,74,43);ln(22,43,48,68);ln(74,43,48,68);ctx.fillStyle=dark?'#8c7951':'#dec795';for(const x of [22,74]){ctx.beginPath();ctx.arc(x,43,7,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.fillStyle=dark?'#53604c':'#d5dfc7';penBox(ctx,41,60,14,12);ln(55,66,94,57);circle(94,57,2);ln(94,57,122,48);ln(122,48,122,62);penBox(ctx,104,62,34,12);ln(105,68,137,68);text(ctx,'飛球張開',4,8,4,muted);text(ctx,'套筒 ↑',5,82,4,muted);text(ctx,'節流閥收小',97,86,3.8,muted);
      }else if(id==='tmd'){
        for(const x of [23,112]){ln(x,80,x,12);ln(x+5,80,x+5,12);}ln(19,12,121,12);ln(19,80,121,80);ln(49,15,60,49);ln(90,15,79,49);ctx.fillStyle=dark?'#8c7951':'#dec795';ctx.beginPath();ctx.arc(69.5,57,15,0,Math.PI*2);ctx.fill();ctx.stroke();ln(36,70,57,65);ln(82,65,104,70);text(ctx,'結構',4,40,4,muted);text(ctx,'調諧質量',48,7,4,muted);text(ctx,'相對運動 → 阻尼耗散',69,91,3.8,muted,{align:'center'});
      }else if(id==='speaker'){
        penBox(ctx,13,30,24,33);penBox(ctx,35,38,17,17);ln(52,30,99,12);ln(52,63,99,81);ln(99,12,99,81);for(let i=0;i<8;i++)ln(45+i,35,45+i,59);ln(13,26,13,70);text(ctx,'固定磁路',5,9,4,muted);text(ctx,'音圈',42,81,4,muted);text(ctx,'振膜',108,44,4,muted);
      }else if(id==='wind'){
        ln(69,45,69,89);circle(69,45,5);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ln(69,45,69+36*Math.sin(a),45-36*Math.cos(a));}penBox(ctx,73,35,40,18);ln(74,45,110,45);text(ctx,'三葉片',10,16,4,muted);text(ctx,'直驅發電機',82,71,3.8,muted);
      }else if(id==='camera'){
        penBox(ctx,67,25,60,47);penBox(ctx,28,32,39,32);for(const x of [35,47,60]){ctx.beginPath();ctx.ellipse(x,48,3,12,0,0,Math.PI*2);ctx.stroke();}ln(96,31,96,66);ln(15,48,119,48);text(ctx,'鏡組',23,81,4,muted);text(ctx,'感光平面',88,88,3.8,muted);
      }else if(id==='suspension'){
        ln(27,12,113,12);ln(27,15,27,60);let xx=44,yy=20;ctx.beginPath();ctx.moveTo(xx,15);for(let i=0;i<9;i++){yy=20+i*4;ctx.lineTo(xx+(i%2?8:-8),yy);}ctx.lineTo(xx,59);ctx.stroke();penBox(ctx,82,31,12,28);ln(88,15,88,42);ln(88,59,88,68);ln(34,68,104,68);circle(69,74,10);ln(17,87,124,87);text(ctx,'車身',120,15,4,muted);text(ctx,'彈簧',4,40,4,muted);text(ctx,'油壓筒',108,47,4,muted);text(ctx,'輪胎與路面',69,98,3.8,muted,{align:'center'});
      }else{
        ctx.fillStyle=dark?'#776f54':'#d8c39a';ctx.beginPath();ctx.arc(57,45,34,0,Math.PI*2);ctx.fill();ctx.stroke();circle(57,45,4);ln(57,45,7,67);text(ctx,'轉動圓盤',12,9,4,muted);ctx.fillStyle=dark?'#465d52':'#ccdacb';penBox(ctx,79,18,34,17);penBox(ctx,79,56,34,17);penBox(ctx,109,18,10,55);text(ctx,'N',94,30,5,ink,{align:'center'});text(ctx,'S',94,68,5,ink,{align:'center'});ctx.strokeStyle=accent;for(const y of [40,51]){circle(83,y,5);ln(87,y,84,y-3);}text(ctx,'局部環流',105,44,3.6,accent);text(ctx,'磁極之間的氣隙',91,87,3.8,muted,{align:'center'});
      }
      ctx.restore();text(ctx,h.sketchCaption,16,151,3.2,muted);rule(ctx,157,line);text(ctx,h.bridgeTitle,16,170,5,accent);wrap(ctx,h.bridge,16,180,153,3.9,ink,6.3);wrap(ctx,h.question,16,211,153,3.4,muted,5.5);
      text(ctx,'史料與延伸閱讀 ↗',16,226,3.4,accent);hitRegions.push({side:'right',x:14,y:219,w:106,h:10,kind:'button',action:'history-sources'});
    }
    const right=index===1;ctx.strokeStyle=line;ctx.lineWidth=.24;ctx.fillStyle=dark?'#596348':'#e1dcc6';if(!right||n<BOOK_SPREADS.length-1){ctx.beginPath();ctx.moveTo(right?184:2,221);ctx.lineTo(right?163:23,242);ctx.lineTo(right?184:2,242);ctx.closePath();ctx.fill();ctx.stroke();}
    text(ctx,right?(n<BOOK_SPREADS.length-1?'拖書角 →':'闔書 →'):'← 拖書角',right?171:15,238,3.4,ink,{align:right?'right':'left'});text(ctx,String(n*2+index+1).padStart(2,'0'),right?130:171,237,2.7,muted,{align:'right'});
    hitRegions.push({side:right?'right':'left',x:right?134:0,y:230,w:52,h:14,kind:right&&n===BOOK_SPREADS.length-1?'button':'turn',action:right?(n===BOOK_SPREADS.length-1?'book-fold':'next'):'previous'});
  }
  function draw(state) {
    latest=state;
    const {theme='light',selected=null,rpm=40,turns=120,field=.45}=state,chapter=subjectAt(state.chapter).start,ch=CHAPTERS[chapter],p=sample(state),subject=subjectAt(chapter),thermal=subject.id==='stirling',bench=subject.id==='governor'||subject.id==='eddy',device=['speaker','wind','camera'].includes(subject.id),vibrational=subject.id==='tmd'||subject.id==='suspension',local=chapter-subject.start,dark=theme==='dark';
    const ink=dark?'#e6dfd0':'#293c2d',muted=dark?'#b2b6a3':'#647258',line=dark?'#64715a':'#a1ad8c',paper=dark?'#303a32':'#f3eedf',accent=dark?'#cdbb84':'#8b663a';
    hitRegions.length=0;flap.visible=!state.history;sliderThumbs.forEach((t,i)=>t.visible=!state.history&&(i===3||i<parametersFor(state).length));
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
      if(state.history){drawHistory(ctx,subject.id,pageIndex,{ink,muted,line,accent,dark});pageTextures[pageIndex].needsUpdate=true;return;}
      if(!pageIndex){
        text(ctx,subject.unit,15,8.5,3.1,muted);text(ctx,'第 '+String(state.bookPage+1).padStart(2,'0')+' 頁 / '+BOOK_SPREADS.length,171,8.5,3.0,muted,{align:'right'});
        text(ctx,ch.kicker,15,23,4.0,ink);text(ctx,ch.title,14,47,ch.title.length>=7?13.8:17,ink,{weight:600,spacing:.1});text(ctx,ch.subtitle,15,58,3.2,muted);
        text(ctx,ch.paragraphs[0],15,73,4.8,accent);wrap(ctx,ch.paragraphs[1],15,85,155,4.45,ink,7);
        if(device){
          const rows=subject.id==='speaker'?[['音圈與磁隙','sp_coil'],['振膜與防塵帽','sp_cone'],['懸邊與彈波','sp_suspension'],['永久磁路與盆架','sp_magnet']]:subject.id==='wind'?[['三葉片與變槳輪轂','wi_blades'],['主軸與直驅軸承','wi_drive'],['永久磁鐵發電機','wi_generator'],['整流器與電阻負載','wi_load']]:[['鏡頭、鏡組與光圈','ca_lens'],['接環與機械快門','ca_shutter'],['感光元件與電路板','ca_sensor'],['機殼、電池與螢幕','ca_body']];
          rows.forEach(([label,part],i)=>{const y=115+i*11.7;text(ctx,'0'+(i+1),16,y,3,muted);text(ctx,label,29,y,4,ink);text(ctx,'↗',166,y,4,accent,{align:'right'});rule(ctx,y+4,line);hitRegions.push({side:'left',x:14,y:y-8,w:157,h:12,part});});
          if(subject.id==='camera'){wrap(ctx,'沿光軸拆開鏡頭、光圈、快門與感光元件，再點選零件閱讀。',16,181,150,4,muted,8);text(ctx,'靜態構造 · 無運作動畫',16,207,3.5,accent);}else{text(ctx,state.showCharts===false?'即時圓柱：隱藏　點此展開 ↗':'即時圓柱：顯示　點此收回 ↙',16,164,3.5,accent);hitRegions.push({side:'left',x:14,y:157,w:154,h:13,kind:'button',action:'chart-toggle'});}
        }else if(vibrational){
          const rows=subject.id==='tmd'?[['01','懸吊質量球與四條懸索','tmd_ball'],['02','調諧絞盤與等效樓層','tmd_cables'],['03','雙側油壓阻尼器','tmd_dampers'],['04','水平激振台與滑軌','tmd_shaker']]:[['01','螺旋彈簧與彈簧座','sus_spring'],['02','液壓活塞、閥片與油路','sus_valves'],['03','輪胎與簧下質量','sus_wheel'],['04','起伏路面與振動台','sus_road']];
          rows.forEach((r,i)=>{const y=115+i*11.7;if(selected===r[2]){ctx.fillStyle=dark?'#47533d':'#e1e6ca';ctx.fillRect(14,y-7,157,10.5);}text(ctx,r[0],16,y,3.4,accent);text(ctx,r[1],30,y,4,ink);text(ctx,'點選 ↗',168,y,2.8,muted,{align:'right'});rule(ctx,y+4,line);hitRegions.push({x:14,y:y-8,w:157,h:12,part:r[2]});});
        }else if(bench){
          const gov=subject.id==='governor',v=benchValues(state,p);
          if(local===0){
            const rows=gov?[['01','飛球與等長連桿','gov_balls'],['02','升降套筒與配重','gov_sleeve'],['03','止推環、撥叉與回授','gov_feedback'],['04','皮帶、馬達與主軸','gov_drive']]:[['01','圓盤與手推起轉柄','ed_disk'],['02','C 型磁軛與勵磁線圈','ed_magnet'],['03','磁極進給滑台','ed_carriage'],['04','開槽與局部渦電流','ed_slots']];
            rows.forEach((r,i)=>{const y=115+i*11.7;if(selected===r[2]){ctx.fillStyle=dark?'#47533d':'#e1e6ca';ctx.fillRect(14,y-7,157,10.5);}text(ctx,r[0],16,y,3.4,accent);text(ctx,r[1],30,y,4,ink);text(ctx,'點選 ↗',168,y,2.8,muted,{align:'right'});rule(ctx,y+4,line);hitRegions.push({x:14,y:y-8,w:157,h:12,part:r[2]});});
          }else if(local===1){
            const eq=gov?['ω² = (1 + M/m)g / h','h = L cosθ','升程 = 2L(cosθ₀ − cosθ)']:['τ = −kω','P熱 = kω² ≥ 0','ω(t) = ω₀ e⁻⁽ᵏ⁺ᵇ⁾ᵗ⁄ᴶ'];
            eq.forEach((q,i)=>text(ctx,q,16,117+i*17,i===2?5.4:6.5,i===1?ink:accent));text(ctx,gov?'θ = '+v.angle+' · 圓周項 '+v.force:'重疊 '+v.overlap+' · 慣量 '+fmt(p.inertia*1e6,1)+' ×10⁻⁶ kg·m²',16,165,3.1,muted);
          }else if(local===2){
            const q=benchPlot(state,p),x=48,y=157,w=118,h=43;ctx.strokeStyle=line;ctx.lineWidth=.2;penLine(ctx,x,y-h-3,x,y);penLine(ctx,x,y,x+w+2,y);text(ctx,q.ylabel,15,110,2.7,muted);text(ctx,q.xmax,165,164,2.7,muted,{align:'right'});text(ctx,q.ymax,16,122,3.5,ink);
            for(const t of q.tracks){ctx.beginPath();t.points.forEach(([xx,yy],i)=>i?ctx.lineTo(x+xx*w,y-yy*h):ctx.moveTo(x+xx*w,y-yy*h));ctx.strokeStyle=t.color;ctx.lineWidth=.4;ctx.stroke();}const [xx,yy]=q.live;ctx.beginPath();ctx.arc(x+Math.max(0,Math.min(1,xx))*w,y-Math.max(0,Math.min(1,yy))*h,1.1,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();text(ctx,v.rpm,16,136,3.8,ink);text(ctx,gov?'● 即時升程':'赭：整片／青：開槽',16,151,2.6,accent);text(ctx,'轉速 / rpm',49,165,2.8,muted);
          }else{
            const rows=gov?[['即時轉速',v.rpm],['套筒升程',v.lift],['動力開度',v.opening]]:[['圓盤動能',v.kinetic],['渦電流熱',v.energy],['軸承耗散',v.bearing]];
            rows.forEach((r,i)=>{const y=113+i*14;text(ctx,r[0],17,y,3.9,ink);text(ctx,r[1],168,y,4.7,i===1?accent:ink,{align:'right'});rule(ctx,y+5,line);});text(ctx,gov?'負載取得機械功 '+v.energy:'依熱容量計算溫升 '+v.rise,17,164,3.3,muted);
          }
        }else if(thermal){
          if(local===0){
            [['01','熱端與冷端氣缸','st_hot'],['02','雙活塞與相位曲柄','st_rods'],['03','飛輪與共用曲軸','st_flywheel'],['04','回熱器與連通管','st_regenerator']].forEach((r,i)=>{const y=115+i*11.7;if(selected===r[2]){ctx.fillStyle=dark?'#47533d':'#e1e6ca';ctx.fillRect(14,y-7,157,10.5);}text(ctx,r[0],16,y,3.4,accent);text(ctx,r[1],30,y,4,ink);text(ctx,'點選 ↗',168,y,2.8,muted,{align:'right'});rule(ctx,y+4,line);hitRegions.push({x:14,y:y-8,w:157,h:12,part:r[2]});});
          }else if(local===1){
            const c=p.cycle,x=49,y=158,w=117,h=43;
            const point=q=>[x+(q.volume-c.minV)/(c.maxV-c.minV)*w,y-(q.pressure-c.minP)/(c.maxP-c.minP)*h];
            ctx.strokeStyle=line;ctx.lineWidth=.2;penLine(ctx,x,y-h-4,x,y);penLine(ctx,x,y,x+w+3,y);text(ctx,'p / kPa',15,113,3.2,muted);text(ctx,'V / mL',154,166,3,muted,{align:'right'});
            ctx.beginPath();for(let j=0;j<=160;j++){const a=point(stThermo(state,j/160*Math.PI*2));j?ctx.lineTo(...a):ctx.moveTo(...a);}ctx.closePath();ctx.fillStyle=dark?'#756d4433':'#d2ad7030';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=.42;ctx.stroke();
            const d=point(p);ctx.beginPath();ctx.arc(...d,1.25,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();
            text(ctx,fmt(p.pressure/1000,1),15,123,4.6,ink);text(ctx,fmt(p.volume*1e6,2)+' mL',15,136,3.9,ink);text(ctx,'淨功 '+fmt(c.work,3)+' J/圈',15,150,3.2,accent);text(ctx,'● 即時位置',15,164,2.7,muted);
          }else if(local===2){
            [['氣體瞬時作功',p.gasPower],['機械負載輸出',p.loadPower],['軸承摩擦耗散',p.frictionPower]].forEach((r,i)=>{const y=112+i*12;text(ctx,r[0],17,y,3.7,ink);text(ctx,fmt(r[1],3)+' W',168,y,4.4,i===1?accent:ink,{align:'right'});rule(ctx,y+5,line);});
            text(ctx,'飛輪動能',17,151,3.3,muted);text(ctx,fmt(p.kinetic,3)+' J',168,153,5.2,accent,{align:'right'});text(ctx,'累積機械輸出 '+fmt(p.energy.load,3)+' J',17,165,3.5,ink);
          }else{
            [['溫差 ΔT',fmt(p.Th-p.Tc,0)+' K'],['即時轉速',fmt(p.rpm,0)+' rpm'],['理想效率上限',fmt(p.cycle.carnot*100,1)+'%']].forEach((r,i)=>{const y=113+i*15;text(ctx,r[0],17,y,3.9,ink);text(ctx,r[1],168,y,5.0,i===2?accent:ink,{align:'right'});rule(ctx,y+6,line);});
            text(ctx,'先固定溫度，再比較三種負載。',17,164,3.5,muted);
          }
        }else{
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
        }
        rule(ctx,171,line);
        const settings=parametersFor(state);
        settings.forEach((s,i)=>{const f=Math.max(0,Math.min(1,(s.value-s.min)/(s.max-s.min))),x=54+f*76;text(ctx,s.label,15,s.y+1.4,3.4,ink);ctx.strokeStyle=line;ctx.lineWidth=.45;penLine(ctx,54,s.y,130,s.y);text(ctx,(s.action==='field'?fmt(s.value):s.value)+s.unit,170,s.y+1.4,3.3,muted,{align:'right'});
          hitRegions.push({side:'left',x:49,y:s.y-4,w:87,h:9,kind:'slider',action:s.action,from:54,to:130,min:s.min,max:s.max,step:s.step});sliderThumbs[i].position.set(-191+x,1.8,s.y-122);
        });
        text(ctx,ch.answer,17,216,3.1,ink);text(ctx,ch.caption,15,225,2.6,muted);
        text(ctx,chapter?'← 拖書角':'物理之書',35,237,3.0,chapter?ink:muted);if(chapter)hitRegions.push({side:'left',x:0,y:222,w:52,h:22,kind:'turn',action:'previous'});text(ctx,String(state.bookPage*2+1).padStart(2,'0'),170,237,3.1,muted,{align:'right'});
      }else{
        text(ctx,'Fig. '+String(chapter+1).padStart(2,'0'),170,24,4,ink,{align:'right'});text(ctx,ch.figure,170,32,4.2,ink,{align:'right'});
        if(device){const v=deviceValues(state,p);text(ctx,subject.id==='camera'?'靜態構造拆解':subject.id==='speaker'?'音圈 '+v.current:'轉子 '+v.rpm,16,24,5.1,accent);text(ctx,subject.id==='camera'?'六片鏡片 · 七葉光圈 · 無反機身':subject.id==='speaker'?'振膜 '+v.displacement:'電力 '+v.power,16,33,3.5,muted);text(ctx,subject.id==='camera'?'剖面、選取與拆解':subject.id==='speaker'?'音圈熱 '+v.heat:'累積電能 '+v.energy,16,44,3.5,ink);}else{
        const values=measurementsFor(state,p),vv=vibrational?vibrationValues(state,p):null,first=vibrational?(subject.id==='tmd'?'樓層 '+vv.building:'車身 '+vv.acceleration):subject.id==='generator'?'ε = '+fmt(p.emf)+' V':subject.id==='stirling'?'p = '+fmt(p.pressure/1000,1)+' kPa':'n = '+fmt(p.rpm,0)+' rpm';
        text(ctx,first,16,24,5.6,accent);text(ctx,vibrational?(subject.id==='tmd'?'球行程 '+vv.ball:'行程 '+vv.travel):subject.id==='generator'?'線圈 '+p.rotorRpm+' rpm':subject.id==='stirling'?'飛輪 '+fmt(p.rpm,0)+' rpm':subject.id==='governor'?'套筒升程 '+fmt(p.lift*1000,1)+' mm':'|τ| = '+fmt(Math.abs(p.torque)*1000,2)+' mN·m',16,32,3.5,muted);text(ctx,vibrational?'Q耗 = '+vv.heat:subject.id==='eddy'?'Q熱 = '+fmt(p.energy.heat,3)+' J':(thermal||bench?'W輸出 = ':'E燈泡 = ')+fmt(p.energy.load,2)+' J',16,43,3.8,ink);
        const aux=subject.id==='generator'?{label:state.showField?'磁場：顯示 ◎':'磁場：隱藏 ○',action:'field-view'}:thermal?{label:state.section?'剖面：打開 ◎':'剖面：關閉 ○',action:'section'}:subject.id==='governor'?{label:state.govVectors?'向心項：顯示':'向心項：隱藏',action:'gov-vectors'}:{label:state.eddyMaterial==='copper'?'材質：銅 Cu':'材質：鋁 Al',action:'eddy-material'};
        if(subject.id!=='eddy'&&!vibrational){text(ctx,aux.label,170,43,3.3,muted,{align:'right'});hitRegions.push({side:'right',x:127,y:36,w:46,h:10,kind:'button',action:aux.action});}text(ctx,state.showCharts===false?'即時圓柱：隱藏':'即時圓柱：顯示',170,54,3.2,muted,{align:'right'});hitRegions.push({side:'right',x:127,y:48,w:46,h:10,kind:'button',action:'chart-toggle'});
        }
        ctx.strokeStyle=line;ctx.lineWidth=.2;ctx.strokeRect(24,71,137,105);ctx.setLineDash([1.5,1.5]);ctx.beginPath();ctx.ellipse(93,119,34,43,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        const detail=selected&&PARTS[selected];text(ctx,detail?detail.title:device?(p.halted||(subject.id==='camera'?'點零件或拆解，沿光軸看清各模組':p.motion?'運作中，對照旁邊即時數據':'點書頁啟動，或選零件探索')):(p.halted?p.halted:(bench||vibrational)?(p.motion?'實驗進行中，對照旁邊即時數據':'點書頁啟動，或選擇零件探索'):thermal?(p.motion?'溫差作功，飛輪帶動負載':'點啟動，或拖動飛輪探索'):(p.motion?'正在把機械功轉成電能':'拖動搖柄，讓線圈開始轉')),16,166,3.4,detail?accent:muted);
        const startLabel=subject.id==='speaker'?'接通訊號 ▷':subject.id==='wind'?'啟動風機 ▷':vibrational?(subject.id==='tmd'?'啟動振台 ▷':'啟動路面 ▷'):subject.id==='generator'?'自動轉動 ▷':thermal?'啟動熱機 ▷':subject.id==='governor'?'啟動調速器 ▷':'起轉後放手 ▷';
        const buttons=[{action:'popup',label:state.popupTarget>.5?'收回紙面 ↓':'圖解立起 ↗',active:state.popupTarget>.5},{action:'explode',label:state.explodeTarget>.55?'組裝':'分解',active:state.explodeTarget>.55},{action:'play',label:state.running?'暫停':startLabel,active:state.running}];
        (subject.id==='camera'?buttons.slice(0,2):buttons).forEach((b,i)=>drawButton(ctx,b,15+i*(subject.id==='camera'?78:52),172,subject.id==='camera'?74:48));const sw=switchesFor(state),step=sw.length===1?156:sw.length===4?39:52;sw.forEach((b,i)=>drawButton(ctx,b,15+i*step,190,step-4));
        const ex=state.explodeTarget??0,x=46+ex*93;text(ctx,'拆解',15,214,3.6,ink);ctx.strokeStyle=line;ctx.lineWidth=.55;penLine(ctx,46,212,139,212);text(ctx,Math.round(ex*100)+'%',152,213.5,3.1,muted,{align:'right'});
        ctx.fillStyle='rgba(0,0,0,0)';ctx.strokeStyle=line;ctx.lineWidth=.25;penBox(ctx,159,205.5,12,12);text(ctx,'↺',165,214,6.5,ink,{align:'center'});
        hitRegions.push({side:'right',x:41,y:205,w:112,h:14,kind:'slider',action:'explode',from:46,to:139,min:0,max:1,step:.01});hitRegions.push({side:'right',x:158,y:203,w:15,h:17,kind:'button',action:'reset'});sliderThumbs[3].position.set(5+x,1.8,90);
        text(ctx,ch.note,16,225,2.65,muted);text(ctx,String(state.bookPage*2+2).padStart(2,'0'),132,237,2.5,muted,{align:'right'});text(ctx,'拖空白環視 · Shift 拖曳只轉教具',16,237,2.65,muted);text(ctx,state.bookPage<BOOK_SPREADS.length-1?'拖書角 →':'闔書 →',171,237,3.4,ink,{align:'right'});hitRegions.push({side:'right',x:134,y:222,w:52,h:22,kind:state.bookPage<BOOK_SPREADS.length-1?'turn':'button',action:state.bookPage<BOOK_SPREADS.length-1?'next':'book-fold'});
      }
      if((pageIndex===0&&state.bookPage>0)||pageIndex===1){const right=pageIndex===1;ctx.fillStyle=dark?'#596348':'#e1dcc6';ctx.strokeStyle=line;ctx.lineWidth=.24;ctx.beginPath();ctx.moveTo(right?184:2,221);ctx.lineTo(right?163:23,242);ctx.lineTo(right?184:2,242);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=muted;penLine(ctx,right?174:12,233,right?179:7,237,.08);}
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
    printPatch, setTurnDiagram(target){if(turnMesh){const mat=new THREE.MeshBasicMaterial({map:target.texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});const overlay=new THREE.Mesh(turnMesh.geometry,mat);overlay.renderOrder=4;turnMesh.add(overlay);turnDiagram={target,overlay};}else target.dispose();}, setTurnSnapshot(source){if(turnCanvas&&turnTexture){const ctx=turnCanvas.getContext('2d');ctx.clearRect(0,0,turnCanvas.width,turnCanvas.height);ctx.drawImage(source,0,0,turnCanvas.width,turnCanvas.height);turnTexture.needsUpdate=true;}}, attachRight(object){sideGroups[1].add(object);},
    setOpen(amount) { sideGroups[0].rotation.z = -Math.PI * (1 - amount); },
    setFlap(amount) { flap.rotation.x = -amount * 1.9; },
    turn(amount) {
    if (!turnMesh) return;
    turnMesh.visible = amount > 0 && amount < 1;
    const a = Math.PI * amount, pos = turnMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = turnDirection>0?turnOriginal[i * 3]+93:93-turnOriginal[i*3], z = turnOriginal[i * 3 + 2];
      const angle = a + Math.sin(u / 186 * Math.PI) * Math.sin(a) * 0.22 + (z/244)*Math.sin(a)*.12;
      pos.setXYZ(i, turnDirection*(5 + u * Math.cos(angle)), 1.5 + u * Math.sin(angle) * 0.66, z);
    }
    pos.needsUpdate = true; turnMesh.geometry.computeVertexNormals();
  }};
}
