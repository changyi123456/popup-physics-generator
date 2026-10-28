import * as GEN from './model.js';
import * as ST from './stirling-model.js';
export const SUBJECTS=[{id:'generator',title:'手搖發電機',english:'MOTION INTO ELECTRICITY',unit:'第一部 · 電磁與能量',start:0,count:4,description:'轉動線圈、交換磁極，親手把機械功轉成電能。'},{id:'stirling',title:'史特靈熱機',english:'HEAT INTO MOTION',unit:'第二部 · 熱與機械',start:4,count:4,description:'雙缸、曲柄與飛輪，探索溫差如何帶來機械功。'}];
export const CHAPTERS=[...GEN.CHAPTERS.map(c=>({...c,subject:'generator'})),...ST.ST_CHAPTERS.map(c=>({...c,subject:'stirling'}))];
export const PARTS={...GEN.PARTS,...ST.ST_PARTS,measurements:{title:'浮起的即時量測',english:'LIVE SPATIAL MEASUREMENTS',text:'量測圓柱與當前裝置使用同一個物理模型。發電機顯示磁通量、電壓、負載功率；熱機顯示壓力、總體積、機械負載功率。底部累積能量讀值，單位為焦耳。'}};
export function subjectAt(chapter=0){return SUBJECTS.find(s=>chapter>=s.start&&chapter<s.start+s.count)||SUBJECTS[0];}
export function partsFor(chapter=0){return chapter>=4?{measurements:PARTS.measurements,...ST.ST_PARTS}:GEN.PARTS;}
export function sample(state){return (state.chapter??0)>=4?ST.stSample(state):{...GEN.sample(state),subject:'generator'};}
