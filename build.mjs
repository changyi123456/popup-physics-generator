import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as k from './src/vendor/anatomy/iso-kit.mjs';
import { SPEC, auditModel } from './src/model.js';
import { createGenerator } from './src/generator.js';
import { createStirling } from './src/stirling.js';
import { createGovernor } from './src/governor.js';
import { createEddy } from './src/eddy.js';
import { G_SPEC, auditGovernor } from './src/governor-model.js';
import { E_SPEC, eddyDisk, auditEddy } from './src/eddy-model.js';
import { auditStirling } from './src/stirling-model.js';
import { Vector3, Quaternion } from './src/vendor/three.module.js';
const HERE=dirname(fileURLToPath(import.meta.url)),src=p=>join(HERE,'src',p),dist=p=>join(HERE,'dist',p);
await mkdir(dist('vendor'),{recursive:true});const modelAudit=auditModel(),stirlingAudit=auditStirling(),governorAudit=auditGovernor(),eddyAudit=auditEddy();for(const a of [modelAudit,stirlingAudit,governorAudit,eddyAudit])if(!a.passed)throw new Error(a.failures.join(', '));
// A matching explanatory SVG remains available on devices without WebGL.
const P=k.fitProjection([[-70,-65,0],[70,65,0],[-70,65,0],[70,-65,0],[0,0,100]],720,580,{pad:45,azimuth:42,elevation:34}),items=[];
function slab(name,ring,z,h,style={}){const paths=k.extrude(ring,z,h,P),center=ring.reduce((p,c)=>[p[0]+c[0]/ring.length,p[1]+c[1]/ring.length],[0,0]);items.push({key:k.depthOf([center[0],center[1],z+h/2],P),svg:k.solidSvg(paths,{tone:'hi',...style})});}
function rect(name,x,y,w,d,z,h,tone='hi'){slab(name,[[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]],z,h,{tone});}
rect('base',0,0,136,123,0,4,'lo');for(const x of [-59,59])for(const y of [-51,51]){slab('foot',k.circleRing(x,y,4.2,24),-3,3,{tone:'lo'});slab('bolt',k.circleRing(x,y,1.4,16),4,.8);}
for(const x of [-38,38]){rect('foot',x,-3,17,55,4,3,'lo');rect('magnet',x,-3,11,47,32,44,'mid');rect('pole shoe',x+(x<0?6.5:-6.5),-3,5,50,31,47);for(const y of [-24,18]){rect('clamp',x,y,16,3,77,2.8,'lo');slab('bolt',k.circleRing(x,y,1.2,16),80,.8);}}
for(const y of [-34,34]){rect('pedestal',0,y,12,10,4,49);slab('bearing',k.circleRing(0,y,9,32),53,6,{tone:'lo'});}
// A rotated rectangular winding pack, with real thickness and several closed seams.
for(let j=0;j<9;j++){
 const x=-4+j*.9;
 rect('winding top',x,0,.7,48,76,.7,'mid');rect('winding bottom',x,0,.7,48,36,.7,'mid');rect('winding side',x,-24,.7,.7,36,40,'mid');rect('winding side',x,24,.7,.7,36,40,'mid');
}
rect('meter',-44,3,26,15,4,18);slab('lamp foot',k.circleRing(46,26,8,32),4,7);slab('bulb',k.circleRing(46,26,9,32),11,17,{lit:true});
items.sort((a,b)=>a.key-b.key);const svg=k.figureSvg({width:720,height:580,standalone:'light',label:'手搖交流發電機：線圈在磁極間旋轉的立體結構',body:items.map(i=>i.svg)});await writeFile(dist('anatomy.svg'),svg);
// The delivered HTML contains all runtime code and the vector fallback.
let three = await readFile(src("vendor/three.module.js"), "utf8");
const exportList = three.match(/export\s*\{([^}]+)\};?\s*$/);
if (!exportList) throw new Error("Unexpected Three.js distribution: missing named exports");
const fields = exportList[1].split(",").map(pair => {
  const [local, exported] = pair.trim().split(/\s+as\s+/); return (exported || local) + ":" + local;
});
three = three.slice(0, exportList.index) + "\nconst THREE = Object.freeze({" + fields.join(",") + "});\n";
const clean = s => s.replace(/^import .+;\n/gm, "").replace(/\bexport\s+(?=const |function |class )/g, "");
const model = 'const GENERATOR_MODEL=(()=>{'+clean(await readFile(src('model.js'),'utf8'))+'\nreturn {SPEC,CHAPTERS,PARTS,sample,energyStep,fmt,smooth,follow,clamp,auditModel,gearProfile};})();\nconst {SPEC,energyStep,fmt,smooth,follow,clamp,auditModel,gearProfile}=GENERATOR_MODEL;';
const thermalModel='const STIRLING_MODEL=(()=>{'+clean(await readFile(src('stirling-model.js'),'utf8'))+'\nreturn {ST_SPEC,stKinematics,stThermo,stCycle,stSample,stAdvance,stNudge,ST_PARTS,ST_CHAPTERS,auditStirling};})();\nconst {ST_SPEC,stKinematics,stThermo,stCycle,stSample,stAdvance,stNudge,auditStirling}=STIRLING_MODEL;';
const governorModel='const GOV_MODEL=(()=>{'+clean(await readFile(src('governor-model.js'),'utf8'))+'\nreturn {G_SPEC,govGeometry,govEquilibrium,govSample,govAdvance,GOV_PARTS,GOV_CHAPTERS,auditGovernor};})();\nconst {G_SPEC,govSample,govAdvance,auditGovernor}=GOV_MODEL;';
const eddyModel='const EDDY_MODEL=(()=>{'+clean(await readFile(src('eddy-model.js'),'utf8'))+'\nreturn {E_SPEC,eddyDisk,eddyPatch,eddyCoefficient,eddySample,eddyAdvance,eddyKick,EDDY_PARTS,EDDY_CHAPTERS,auditEddy};})();\nconst {E_SPEC,eddySample,eddyAdvance,eddyKick,auditEddy}=EDDY_MODEL;';
const library='const BOOK_LIBRARY=(()=>{const GEN=GENERATOR_MODEL,ST=STIRLING_MODEL,GOV=GOV_MODEL,ED=EDDY_MODEL;'+clean(await readFile(src('library.js'),'utf8'))+'\nreturn {CHAPTERS,PARTS,SUBJECTS,BOOK_SPREADS,HISTORIES,subjectAt,partsFor,sample,parametersFor,switchesFor,measurementsFor,benchValues,benchPlot};})();\nconst {CHAPTERS,PARTS,SUBJECTS,BOOK_SPREADS,HISTORIES,subjectAt,partsFor,sample,parametersFor,switchesFor,measurementsFor,benchValues,benchPlot}=BOOK_LIBRARY;';
const machineKit='const createMachineKit=(()=>{'+clean(await readFile(src('machine-kit.js'),'utf8'))+'\nreturn createMachineKit;})();';
const governor='const createGovernor=(()=>{'+clean(await readFile(src('governor.js'),'utf8'))+'\nreturn createGovernor;})();';
const eddy='const createEddy=(()=>{'+clean(await readFile(src('eddy.js'),'utf8'))+'\nreturn createEddy;})();';
const stirling='const createStirling=(()=>{'+clean(await readFile(src('stirling.js'),'utf8'))+'\nreturn createStirling;})();';
const ink = clean(await readFile(src("ink.js"), "utf8"));
const generator = "const createGenerator = (() => {\nconst {sample}=GENERATOR_MODEL;\n" + clean(await readFile(src("generator.js"), "utf8")) + "\nreturn createGenerator;\n})();";
const charts = "const createDataCharts = (() => {\n" + clean(await readFile(src("charts.js"), "utf8")) + "\nreturn createDataCharts;\n})();";
const book = "const createBook = (() => {\n" + clean(await readFile(src("book.js"), "utf8")) + "\nreturn createBook;\n})();";
const lens = "const createMagnifier = (() => {\n" + clean(await readFile(src("lens.js"), "utf8")) + "\nreturn createMagnifier;\n})();";
const main = clean(await readFile(src("main.js"), "utf8"));
const script = three + "\n" + model + "\n" + thermalModel + "\n" + governorModel + "\n" + eddyModel + "\n" + library + "\n" + ink + "\n" + machineKit + "\n" + governor + "\n" + eddy + "\n" + stirling + "\n" + generator + "\n" + charts + "\n" + book + "\n" + lens + "\n(async () => {\n" + main + "\n})().catch(error => { console.error(error); document.body.classList.add('ready'); document.getElementById('fallback').hidden = false; });";
const stirlingSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 490" role="img" aria-label="雙缸史特靈熱機剖面"><defs><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#687756" opacity=".2"/></pattern></defs><rect width="720" height="490" fill="#f1ecda"/><g stroke="#4c6244" stroke-width="2" stroke-linejoin="round"><path d="M60 421H661L681 442H42Z" fill="#c8d1b3"/><rect x="80" y="132" width="12" height="289" fill="#c0cab3"/><rect x="601" y="132" width="12" height="289" fill="#c0cab3"/><path d="M86 132H610"/><circle cx="158" cy="132" r="82" fill="#bac6aa"/><circle cx="158" cy="132" r="65" fill="#f1ecda"/>${[0,1,2,3,4,5].map(j=>`<path d="M158 132L${158+64*Math.cos(j*Math.PI/3)} ${132+64*Math.sin(j*Math.PI/3)}"/>`).join('')}<circle cx="158" cy="132" r="12" fill="#c5ad76"/><path d="M276 239V387H365V239M465 239V387H554V239" fill="url(#h)" stroke-width="8"/><path d="M276 387H365M465 387H554" stroke="#b58d62" stroke-width="18"/><rect x="281" y="287" width="79" height="19" fill="#d2ad83"/><rect x="470" y="260" width="79" height="19" fill="#a8c4b6"/><path d="M320 297L342 110M509 270L531 154" stroke-width="7"/><path d="M320 132L342 110M509 132L531 154" stroke="#9b7746" stroke-width="9"/><circle cx="342" cy="110" r="7" fill="#c5ad76"/><circle cx="531" cy="154" r="7" fill="#c5ad76"/><path d="M320 381V406H510V381" fill="none" stroke-width="7"/><rect x="395" y="395" width="42" height="22" fill="#d1bd8d"/></g><g font-family="serif" fill="#40533a" text-anchor="middle"><text x="360" y="35" font-size="24">史特靈熱機 · 雙缸 α 型</text><text x="320" y="350" font-size="20">熱端</text><text x="509" y="350" font-size="20">冷端</text><text x="158" y="241" font-size="17">飛輪</text><text x="416" y="467" font-size="17">回熱器與連通管 · 曲柄相差 90°</text></g></svg>`;
await writeFile(dist('stirling.svg'),stirlingSvg);
const governorSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 490" aria-label="離心調速器等臂連桿"><rect width="720" height="490" fill="#f1ecda"/><g stroke="#4c6244" stroke-width="3" fill="#c5d0b5"><path d="M90 440H630V455H90Z"/><path d="M245 430V75H475V430" fill="none"/><path d="M360 65V430" stroke-width="8"/><path d="M360 115L250 235L360 355L470 235Z" fill="none" stroke-width="8"/><circle cx="250" cy="235" r="26" fill="#cbb17b"/><circle cx="470" cy="235" r="26" fill="#cbb17b"/><rect x="340" y="338" width="40" height="40" fill="#a3b294"/><path d="M380 357H552L595 310" fill="none" stroke="#9c7a4c" stroke-width="7"/><rect x="576" y="285" width="40" height="70" fill="#e8e0c8"/></g><g fill="#40533a" text-anchor="middle" font-family="serif"><text x="360" y="38" font-size="25">離心調速器 · 飛球、套筒與回授</text><text x="205" y="292" font-size="18">飛球</text><text x="412" y="389" font-size="18">升降套筒</text><text x="586" y="387" font-size="18">回授控制</text></g></svg>`;
const eddySvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 490" aria-label="渦電流金屬圓盤煞車"><rect width="720" height="490" fill="#f1ecda"/><g stroke="#4c6244" stroke-width="3"><path d="M70 436H654V453H70Z" fill="#c4ceb3"/><path d="M300 260V436" stroke-width="10"/><circle cx="300" cy="250" r="145" fill="#c9ac86"/><circle cx="300" cy="250" r="22" fill="#dce0c7"/><circle cx="300" cy="250" r="8" fill="#75866b"/>${Array.from({length:12},(_,j)=>{const a=j*Math.PI/6;return `<path d="M${300+92*Math.cos(a)} ${250+92*Math.sin(a)}L${300+141*Math.cos(a)} ${250+141*Math.sin(a)}" stroke="#7d8b6e" stroke-width="1"/>`;}).join('')}<path d="M409 197H554V303H409" fill="none" stroke="#8fa385" stroke-width="24"/><rect x="520" y="223" width="58" height="53" fill="#c29b6f"/><rect x="396" y="177" width="30" height="40" fill="#d5c2a0"/><rect x="396" y="283" width="30" height="40" fill="#a1b8ac"/><path d="M540 315V435" stroke-width="11"/><path d="M510 435H610" stroke-width="8"/></g><g fill="#40533a" text-anchor="middle" font-family="serif"><text x="360" y="40" font-size="25">渦電流煞車 · 不接觸的制動</text><text x="300" y="92" font-size="19">金屬圓盤</text><text x="563" y="190" font-size="18">可移磁極</text><text x="424" y="389" font-size="18">轉動能 → 電阻熱</text></g></svg>`;
await writeFile(dist('governor.svg'),governorSvg);await writeFile(dist('eddy.svg'),eddySvg);
let html = await readFile(src("index.html"), "utf8");
html=html.replace('GOVERNOR_FALLBACK_DATA','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(governorSvg)).replace('EDDY_FALLBACK_DATA','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(eddySvg));
html=html.replace('GENERATOR_FALLBACK_DATA','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)).replace('STIRLING_FALLBACK_DATA','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stirlingSvg));
const font = await readFile(src("fonts/BookHand.woff2"));
const css = (await readFile(src("style.css"), "utf8")).replace("BOOK_HAND_FONT_DATA", font.toString("base64"));
html = html.replace("/* APP_CSS */", css);
html = html.replace("/* APP_SCRIPT */", () => script.replace(/<\/script/gi, "<\\/script"));
html = html.replace('src="./anatomy.svg"', 'src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '"');
const fontLicense = await readFile(src("fonts/OFL.txt"), "utf8");
const projectLicense = await readFile(join(HERE, "LICENSE"), "utf8");
html = html.replace("</body>", '<script type="text/plain" id="font-license">' + fontLicense + '</script>\n<script type="text/plain" id="project-license">' + projectLicense + '</script>\n</body>');
await writeFile(dist("index.html"), html);
await writeFile(dist("LICENSES.txt"), projectLicense + "\n\n" + (await readFile(join(HERE, "THIRD_PARTY_NOTICES.md"), "utf8")) + "\n\n" + fontLicense);
await copyFile(src("vendor/three.module.js"), dist("vendor/three.module.js"));
await writeFile(join(HERE, "physics-model-audit.json"), JSON.stringify({generator:modelAudit,stirling:stirlingAudit,governor:governorAudit,eddy:eddyAudit}, null, 2) + "\n");
console.log("Built offline hand-drawn physics textbook · " + (html.length / 1024).toFixed(0) + " KiB · anatomy vector " + items.length + " solids");
if(process.argv.includes('--audit')){
 const g=createGenerator(),q=new Quaternion(),v=new Vector3();let poseChecks=0;
 for(let i=0;i<=360;i++){
  const phase=i*Math.PI/180;g.pose({popup:1,explode:0,phase,running:true});g.root.updateMatrixWorld(true);
  v.set(1,0,0).applyQuaternion(g.spin.getWorldQuaternion(q));
  if(Math.abs(v.x-Math.cos(phase))>1e-10||Math.abs(v.y-Math.sin(phase))>1e-10)throw new Error('Rendered coil normal disagrees with flux model');
  if(Math.abs(g.crank.rotation.z*SPEC.gearRatio+g.spin.rotation.z)>1e-10)throw new Error('External gears lost ratio');
  poseChecks++;
 }
 const radius=Math.hypot(2.7,20.31),clearance=29-radius;if(clearance<=0)throw new Error('Coil intersects pole faces');
 console.log('Physics audit passed: '+modelAudit.checks+' checks, including Faraday derivatives, field/velocity reversal, open circuit, Lenz torque and energy balance.');
 console.log('Geometry audit passed: '+poseChecks+' coil-normal and external-gear poses; winding-to-pole radial clearance '+clearance.toFixed(2)+' world units.');
 console.log('Generator BOM: '+g.physicalParts.length+' physical components; '+g.parts.length+' rendered features.');
 const st=createStirling();let stirlingPoses=0,maxAttachmentError=0;for(let i=0;i<=720;i++){st.pose({phase:i*Math.PI/360,popup:1,explode:0});for(const e of st.attachmentEvidence()){maxAttachmentError=Math.max(maxAttachmentError,e.crank,e.piston);if(e.crank>1e-9||e.piston>1e-9)throw new Error('Stirling rod lost actual rendered attachment');}stirlingPoses++;}console.log('Stirling physics audit passed: '+stirlingAudit.checks+' checks; cycle work '+stirlingAudit.cycleWorkJ.toFixed(6)+' J.');console.log('Stirling geometry audit passed: '+stirlingPoses+' actual crank/wrist attachment poses; max error '+maxAttachmentError+'. BOM '+st.physicalParts.length+' physical parts, '+st.parts.length+' rendered features.');st.dispose();
 const gov=createGovernor();let governorPoses=0,minGovernorClearance=Infinity;for(let i=0;i<=360;i++){gov.pose({phase:i*Math.PI/180,govTheta:G_SPEC.thetaMin+(G_SPEC.thetaMax-G_SPEC.thetaMin)*i/360,popup:1,explode:0});for(const e of gov.attachmentEvidence())if(e.upper>1e-9||e.ball>1e-9)throw new Error('Governor link lost its physical pin');for(const c of gov.clearanceEvidence()){minGovernorClearance=Math.min(minGovernorClearance,c.radialClearance);if(c.radialClearance<2)throw new Error('Governor swept envelope meets '+c.name);}governorPoses++;}console.log('Governor audit passed: '+governorAudit.checks+' model checks, '+governorPoses+' rendered linkage poses; '+gov.physicalParts.length+' physical parts; column/scale swept-envelope clearance '+minGovernorClearance.toFixed(3)+' world units.');gov.dispose();
 const ed=createEddy();for(const eddySlots of [false,true])for(const eddyMaterial of ['aluminum','copper'])for(let i=0;i<=60;i++){ed.pose({phase:i*Math.PI/30,popup:1,eddySlots,eddyMaterial,eddyInsertion:i/2});if(ed.attachmentEvidence()[0].diskAxis>1e-10)throw new Error('Disk left shaft');}console.log('Eddy audit passed: '+eddyAudit.checks+' model checks, 244 shaft/slide poses; '+ed.physicalParts.length+' physical parts.');ed.dispose();
 console.log('Scope: teaching geometry; no full swept-solid or SVG painter-order proof.');g.dispose();
}
