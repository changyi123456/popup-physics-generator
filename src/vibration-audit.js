import { createTmd } from './tmd.js';
import { createSuspension } from './suspension.js';
import { vibrationAdvance, vibrationSet, vibrationReset, vibrationNudge, vibrationSample, vibrationResponse, TMD_SPEC } from './vibration-model.js';
export function auditVibrationGeometry(){
 let checks=0,poses=0,maxCableError=0,minPistonClearance=Infinity,maxResidual=0;const failures=[];
 const check=(ok,label)=>{checks++;if(!ok&&!failures.includes(label))failures.push(label);};
 const tm=createTmd(),su=createSuspension();
 // Real cylinder ends and eye positions, including the complete tuning range.
 for(const tmdTune of [85,95,115])for(let i=0;i<=120;i++){
  const state={popup:1,explode:0,tmdTune},p=vibrationSample(state,'tmd'),q=Math.min(.07,.27*p.length)*Math.sin(i*Math.PI/30);state.tmdSystem.x=[.025*Math.sin(i*Math.PI/60),.025*Math.sin(i*Math.PI/60)+q];tm.pose(state);
  for(const e of tm.attachmentEvidence()){maxCableError=Math.max(maxCableError,e.upperAttachment,e.lowerAttachment,Math.abs(e.cableLength-e.expected));check(e.upperAttachment<1e-9&&e.lowerAttachment<1e-9&&Math.abs(e.cableLength-e.expected)<1e-10,'rendered cable endpoints/constant length');}
  const c=tm.clearanceEvidence()[0];check(c.ballToBase>10&&c.ballToSideColumn>2,'ball envelope margin');check(c.damperMinPiston>1.7&&c.damperMaxPiston<34,'telescopic damper stays inside body');poses++;
 }
 // A wider stroke than the normal driven trial, with compressed tire contact.
 for(let i=0;i<=240;i++){
  const state={popup:1,explode:0},p=vibrationSample(state,'suspension'),relative=.06*Math.sin(i*Math.PI/120),road=.008*Math.sin(i*Math.PI/60),wheel=road+.005*Math.sin(i*Math.PI/80);state.suspSystem.x=[wheel+relative,wheel];state.suspSystem.base=road;su.pose(state);const e=su.attachmentEvidence()[0];minPistonClearance=Math.min(minPistonClearance,e.pistonWithinBore);check(e.pistonWithinBore>13&&e.rodThroughGland>.9,'actual rendered piston/gland stroke');check(e.springLength>49&&e.springTurnGap>3.8,'spring wire cannot coil bind');check(e.tireContact<1e-5,'deformed tire on road');poses++;
 }
 // Drive all exposed parameter combinations, including the no-damper comparison.
 let trials=0,limitStops=0;
 for(const id of ['tmd','suspension'])for(const frequency of (id==='tmd'?[.5,.8,.95,1.15,1.4]:[.5,1,1.5,2,3,5]))for(const setting of (id==='tmd'?[85,95,115]:[10000,16000,30000]))for(const damping of (id==='tmd'?[4,14,40]:[600,1800,3500])){
  const state={running:true,popup:1,open:1,...(id==='tmd'?{tmdFrequency:frequency,tmdTune:setting,tmdDamping:damping}:{suspFrequency:frequency,suspStiffness:setting,suspDamping:damping})};
  for(let i=0;i<2400;i++)vibrationAdvance(state,id,1/120);const p=vibrationSample(state,id);maxResidual=Math.max(maxResidual,Math.abs(p.balance));check(p.x.every(Number.isFinite)&&Math.abs(p.balance)<1e-8,'parameter grid finite/energy balance');check(!p.halted,'exposed driven parameter grid within scope');trials++;
 }
 const bypass={running:true,popup:1,open:1,suspDamper:false,suspFrequency:1.25};for(let i=0;i<7200;i++)vibrationAdvance(bypass,'suspension',1/120);const bp=vibrationSample(bypass,'suspension');check(bp.power===0&&bp.energy.damping===0,'bypass produces no shock heat');check(bp.halted&&bypass.running===false,'resonant no-damper trial stops at limit');limitStops+=!!bp.halted;
 // Manual input on a flat base decays with damping, with every joule accounted for.
 const decay={running:true,popup:1,open:1,suspRoad:false};vibrationNudge(decay,'suspension');const initial=vibrationSample(decay,'suspension').stored;for(let i=0;i<3600;i++)vibrationAdvance(decay,'suspension',1/120);const dp=vibrationSample(decay,'suspension');check(dp.stored<initial*1e-5&&Math.abs(dp.balance)<1e-8,'free decay converts stored energy to heat');
 // The harmonic reader curve must agree with time integration, not a different model.
 for(const id of ['tmd','suspension']){
  const state={running:true,popup:1,open:1,tmdFrequency:.7,suspFrequency:1.5};let sum=0,count=0;for(let i=0;i<9600;i++){vibrationAdvance(state,id,1/120);if(i>=7200){const p=vibrationSample(state,id),x=id==='tmd'?p.building:p.acceleration[0];sum+=x*x;count++;}}const predicted=vibrationResponse(state,id,id==='tmd'?.7:1.5),rms=Math.sqrt(sum/count),target=(id==='tmd'?predicted.building:predicted.acceleration)/Math.sqrt(2);check(Math.abs(rms-target)/target<.025,'harmonic curve/time response agreement');
 }
 // No hidden clock may keep advancing while the drawing is a history or exploded page.
 for(const mode of [{history:true},{explode:1},{popup:0},{open:0},{turning:true}]){const s={running:true,popup:1,open:1,...mode};vibrationAdvance(s,'tmd',1);check(vibrationSample(s,'tmd').time===0,'non-operating state freezes physical time');}
 tm.dispose();su.dispose();return {passed:!failures.length,checks,poses,trials,limitStops,maxCableError,minPistonClearance,maxResidual,failures,scope:'native rendered endpoints and piston position, analytic travel/coil/tire limits, driven parameter grid and physics agreement; not a complete swept-solid collision proof'};
}
