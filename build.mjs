import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as k from './src/vendor/anatomy/iso-kit.mjs';
import { SPEC, auditModel } from './src/model.js';
import { createGenerator } from './src/generator.js';
import { Vector3, Quaternion } from './src/vendor/three.module.js';
const HERE=dirname(fileURLToPath(import.meta.url)),src=p=>join(HERE,'src',p),dist=p=>join(HERE,'dist',p);
await mkdir(dist('vendor'),{recursive:true});const modelAudit=auditModel();if(!modelAudit.passed)throw new Error(modelAudit.failures.join(', '));
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
const model = clean(await readFile(src("model.js"), "utf8"));
const ink = clean(await readFile(src("ink.js"), "utf8"));
const generator = "const createGenerator = (() => {\n" + clean(await readFile(src("generator.js"), "utf8")) + "\nreturn createGenerator;\n})();";
const charts = "const createDataCharts = (() => {\n" + clean(await readFile(src("charts.js"), "utf8")) + "\nreturn createDataCharts;\n})();";
const book = "const createBook = (() => {\n" + clean(await readFile(src("book.js"), "utf8")) + "\nreturn createBook;\n})();";
const lens = "const createMagnifier = (() => {\n" + clean(await readFile(src("lens.js"), "utf8")) + "\nreturn createMagnifier;\n})();";
const main = clean(await readFile(src("main.js"), "utf8"));
const script = three + "\n" + model + "\n" + ink + "\n" + generator + "\n" + charts + "\n" + book + "\n" + lens + "\n(async () => {\n" + main + "\n})().catch(error => { console.error(error); document.body.classList.add('ready'); document.getElementById('fallback').hidden = false; });";
let html = await readFile(src("index.html"), "utf8");
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
await writeFile(join(HERE, "physics-model-audit.json"), JSON.stringify(modelAudit, null, 2) + "\n");
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
 console.log('Scope: teaching geometry; no full swept-solid or SVG painter-order proof.');g.dispose();
}
