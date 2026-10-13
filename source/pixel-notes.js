'use strict';
// Pixel sprites adapted from Ahmad’s supplied reference. No external dependencies.
(() => {

const W = 160, H = 100;
/* Golden yellow, fern green, lilac, and black palette */
const OUT = '#161616', PAGE = '#fff9e8', HI = 'rgba(255,255,255,.6)', SH = 'rgba(20,36,67,.14)';
const COL = ['#e7ba40','#2f654b','#c2a8e2','#161616','#2f654b','#e7ba40','#2f654b'];

const r = (c,x,y,w,h,col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a, v));
const easeOut = u => 1 - (1-u)*(1-u);
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed>>>15, 1|seed); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }

/* ---------- sprites ---------- */
function flatBook(c,x,y,w,h,col){
  r(c,x,y,w,h,OUT); r(c,x+1,y+1,w-2,h-2,col);
  r(c,x+1,y+1,w-2,1,HI);
  if (w > 12) r(c,x+5,y+2,w-7,h-4,PAGE);
  r(c,x+1,y+1,3,h-2,SH);
}
function standBook(c,x,y,w,h,col){
  if (h < 3) return;
  r(c,x,y,w,h,OUT); r(c,x+1,y+1,w-2,h-2,col);
  r(c,x+1,y+1,1,h-2,HI);
  if (h > 14){
    r(c,x+1,y+4,w-2,1,PAGE); r(c,x+1,y+h-6,w-2,1,PAGE);
    r(c,x+2,y+Math.round(h/2)-2,w-4,4,PAGE);
  }
}
function cloud(c,x,y){ r(c,x+3,y+3,14,4,'#fff'); r(c,x+6,y,7,4,'#fff'); r(c,x,y+5,20,3,'#fff'); }
function spark(c,x,y,col){ r(c,x,y-1,1,3,col); r(c,x-1,y,3,1,col); }

/* ---------- scene 1: stack ---------- */
const stack = [{w:54,h:9},{w:46,h:8},{w:50,h:10},{w:40,h:8},{w:48,h:9},{w:36,h:8},{w:42,h:7}];
const jit = [0,3,-2,4,-3,2,-1];
function sceneStack(c,t){
  r(c,0,0,W,H,'#f5eaff');
  [[10,14,3],[88,26,2],[130,10,4]].forEach(([x,y,s])=>cloud(c,((x+t*s+30)%200)-30,y));
  r(c,126,52,10,10,'#e7ba40'); r(c,124,54,14,6,'#e7ba40'); r(c,128,50,6,14,'#e7ba40');
  r(c,0,90,W,10,'#d5e1ff'); r(c,0,90,W,2,'#c2a8e2');
  let top = 90;
  stack.forEach((b,i)=>{
    top -= b.h;
    const start = 0.2 + i*0.45, u = (t-start)/0.5;
    let y;
    if (u < 0) return;
    if (u < 1) y = -14 + (top+14)*u*u;
    else { const k = t-start-0.5; y = top - Math.round(Math.max(0, 3*Math.exp(-k*8)*Math.abs(Math.sin(k*14)))); }
    flatBook(c, 80 - b.w/2 + jit[i], y, b.w, b.h, COL[i]);
  });
  if (t > 3.9){ const k = Math.floor(t*4)%2; spark(c,80,top-8,k?'#2f654b':'#fff'); spark(c,70+ (k?2:0),top-4,'#fff'); }
}

/* ---------- scene 2: shelf ---------- */
const R = rng(7), rows = [[],[]], PL = [48,86];
rows.forEach((row,ri)=>{ let x = 13, n = 0; while (true){ const w = 6 + Math.floor(R()*5); if (x + w > 147) break; row.push({x,w,h:22+Math.floor(R()*9),c:Math.floor(R()*7),i:n++ + ri*14}); x += w + 1; } });
function sceneShelf(c,t){
  r(c,0,0,W,H,'#f5eaff');
  r(c,8,10,144,3,'#2f654b'); r(c,8,10,3,78,'#2f654b'); r(c,149,10,3,78,'#2f654b');
  r(c,11,13,138,75,'#fff9e8');
  rows.forEach((row,ri)=>row.forEach(b=>{
    const e = easeOut(clamp((t-0.15-b.i*0.11)/0.35)); const hh = Math.round(b.h*e);
    let lift = 0;
    if (ri === 0 && b.i === 3 && t > 3){ lift = Math.round(clamp((t-3)/0.4)*6 + Math.sin((t-3)*4)*1); }
    standBook(c,b.x,PL[ri]-hh-lift,b.w,hh,COL[b.c]);
  }));
  PL.forEach(y=>{ r(c,8,y,144,3,'#2f654b'); r(c,8,y+3,144,1,'#161616'); });
  if (t > 3.2){ const k = Math.floor(t*4)%2; const b = rows[0][3]; spark(c,b.x+3,PL[0]-40,k?'#2f654b':'#fff'); spark(c,b.x+10,PL[0]-34,k?'#fff':'#2f654b'); }
}

/* ---------- scene 3: open book ---------- */
function flyBook(c,x,y,col,t,k){
  const f = Math.floor(t*6 + k)%2;
  if (f){ r(c,x-3,y+1,3,2,'#fff'); r(c,x+9,y+1,3,2,'#fff'); } else { r(c,x-3,y-2,3,2,'#fff'); r(c,x+9,y-2,3,2,'#fff'); }
  flatBook(c,x,y,9,7,col);
}
function sceneOpen(c,t){
  r(c,0,0,W,H,'#fff0ee');
  for (let i=0;i<10;i++){ const x = (i*53)%150+4, y = 92 - ((t*12 + i*17)%90); if (Math.floor(t*3+i)%2) spark(c,x,y,'#fff'); }
  r(c,34,28,92,54,OUT); r(c,35,29,90,52,'#e7ba40'); r(c,35,29,90,2,HI);
  r(c,38,32,41,46,PAGE); r(c,81,32,41,46,PAGE); r(c,79,32,2,46,'#d5e1ff');
  for (let i=0;i<7;i++){ r(c,43,38+i*6,28,1,'#bac9e7'); r(c,88,38+i*6,i===6?14:28,1,'#bac9e7'); }
  r(c,43,34,10,2,'#2f654b'); r(c,88,34,10,2,'#e7ba40');
  if (t > 0.3){
    const ph = (((t-0.3)%1.3)/1.3)*Math.PI, w = Math.round(41*Math.abs(Math.cos(ph))), lift = Math.round(Math.sin(ph)*3);
    const x = ph < Math.PI/2 ? 81 : 80 - w;
    if (w > 0){ r(c,x,32-lift,w,46,'#fff'); r(c,ph < Math.PI/2 ? x+w-1 : x,32-lift,1,46,'#bac9e7'); for(let i=0;i<5;i++) r(c,x+3,38+i*6-lift,Math.max(0,w-6),1,'#dce3f1'); }
  }
  flyBook(c,16,38+Math.sin(t*3)*3,COL[1],t,0);
  flyBook(c,138,34+Math.sin(t*3+2)*3,COL[2],t,1);
  flyBook(c,76,12+Math.sin(t*3+4)*3,COL[4],t,2);
}


const scenes = [sceneStack, sceneShelf, sceneOpen];
const widgets = [];
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.pixel-note').forEach(node => {
  const canvas = node.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const state = {node, ctx, scene: Number(node.dataset.pixelScene), time: 4, playing: !motion.matches, visible: false};
  const toggle = node.querySelector('.pixel-toggle');
  const choices = [...node.querySelectorAll('[data-pixel-select]')];
  const update = () => {
    toggle.textContent = state.playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', `${state.playing ? 'Pause' : 'Play'} book animation`);
    choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === state.scene)));
  };
  state.update = update;
  state.draw = () => scenes[state.scene](ctx, state.time);
  state.draw();
  canvas.hidden = false;
  node.querySelector('.pixel-poster').hidden = true;
  node.querySelector('.pixel-controls').hidden = false;
  toggle.addEventListener('click', () => { state.playing = !state.playing; update(); schedule(); });
  choices.forEach((button, i) => button.addEventListener('click', () => { state.scene = i; state.time = 4; state.playing = false; state.draw(); update(); }));
  update(); widgets.push(state);
});
let raf = null;
let last = 0;
function schedule() {
  if (raf === null && !document.hidden && widgets.some(s => s.visible && s.playing)) raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = null;
  if (document.hidden) { last = 0; return; }
  if (last && now - last < 66) { schedule(); return; }
  const dt = last ? Math.min((now - last)/1000, .15) : 0;
  last = now;
  widgets.forEach(state => {
    if (!state.visible || !state.playing) return;
    state.time += dt;
    if (state.time > 6) { state.time = 0; state.scene = (state.scene + 1) % scenes.length; state.update(); }
    state.draw();
  });
  schedule();
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { const state = widgets.find(s => s.node === entry.target); if (state) state.visible = entry.isIntersecting; });
    last = 0; schedule();
  });
  widgets.forEach(s => observer.observe(s.node));
} else { widgets.forEach(s => { s.visible = true; }); schedule(); }
document.addEventListener('visibilitychange', () => { last = 0; schedule(); });
motion.addEventListener('change', event => {
  if (event.matches) widgets.forEach(s => { s.playing = false; s.time = 4; s.draw(); s.update(); });
  last = 0; schedule();
});
})();
