'use strict';
// Four original canvas studies. No downloads, trackers, or third-party animation libraries.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const widgets = [];
  let raf = null, last = 0;
  const circle = (c,x,y,r,color) => { c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fillStyle=color; c.fill(); };
  const line = (c,points,color,width=2) => { c.beginPath(); c.strokeStyle=color; c.lineWidth=width; points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.stroke(); };
  function drawing(c,t) {
    c.fillStyle='#f7f2e8';c.fillRect(0,0,640,400);
    circle(c,455,105,35,'#e5b34f');
    const progress = .18 + .82 * Math.min(1,(t % 12)/7);
    c.setLineDash([1200 * progress, 1600]);
    line(c,[[70,305],[200,145],[330,305],[440,185],[575,305]],'#29251f',3);
    c.setLineDash([]);
    for(let i=0;i<5;i++) { const pts=[]; for(let x=75;x<560;x+=6)pts.push([x,328+i*9+6*Math.sin(x/60+i*.3)]);line(c,pts,'#aa8b60',1); }
    const x=70+Math.min(1,(t%12)/7)*500;
    c.save();c.translate(x,345);c.rotate(-.7);c.fillStyle='#30342d';c.fillRect(0,-3,65,6);c.fillStyle='#d0a67d';c.beginPath();c.moveTo(0,-3);c.lineTo(-9,0);c.lineTo(0,3);c.fill();c.restore();
  }
  function waves(c,t) {
    c.fillStyle='#e8eff2';c.fillRect(0,0,640,400);
    for(let i=0;i<7;i++){const pts=[];for(let x=45;x<=595;x+=3)pts.push([x,200+Math.sin(x/65-t*.55+i*.42)*(52+i*8)]);line(c,pts,i%2?'#bd7e45':'#214a60',i===3?5:1.5);}
    circle(c,535,75,19,'#d8b251');
  }
  function orbit(c,t) {
    c.fillStyle='#edf1e9';c.fillRect(0,0,640,400);
    c.strokeStyle='#a5b8ab';c.lineWidth=1.4;
    [0,.55,1.1].forEach(a=>{c.save();c.translate(320,200);c.rotate(a);c.beginPath();c.ellipse(0,0,220,78,0,0,Math.PI*2);c.stroke();c.restore();});
    circle(c,320,200,45,'#294e42');
    ['#e4a762','#8774a6','#ac5265'].forEach((color,i)=>{const a=t*.22+i*2.1,x=320+210*Math.cos(a),y=200+90*Math.sin(a+i*.3);line(c,[[320,200],[x,y]],'#a5b8ab',1);circle(c,x,y,17+i*4,color);});
  }
  function mobile(c,t) {
    c.fillStyle='#f4ece7';c.fillRect(0,0,640,400);
    const drift=Math.sin(t*.5)*.085;
    c.save();c.translate(320,45);c.rotate(drift);line(c,[[0,0],[0,68]],'#252522',2);
    line(c,[[-160,88],[135,54]],'#252522',3);
    line(c,[[-135,85],[-135,205]],'#252522',2);circle(c,-135,234,37,'#aa3f53');
    line(c,[[110,57],[110,153]],'#252522',2);c.save();c.translate(110,179);c.rotate(-drift*2);c.fillStyle='#d8ac45';c.fillRect(-35,-23,70,46);c.restore();
    line(c,[[0,68],[0,245]],'#252522',2);circle(c,0,268,27,'#3f6457');c.restore();
  }
  const renderers={drawing,waves,orbit,mobile};
  function render(state) {
    const canvas=state.canvas,box=canvas.parentElement.getBoundingClientRect();
    const scale=Math.min(window.devicePixelRatio||1,2),w=Math.max(320,Math.round(box.width*scale)),h=Math.round(w*400/640);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const c=state.context;c.setTransform(w/640,0,0,h/400,0,0);c.lineCap='round';c.lineJoin='round';renderers[state.kind](c,state.time);
  }
  function label(state){state.button.textContent=reduced.matches?'Motion off':state.paused?'Play':'Pause';state.button.disabled=reduced.matches;state.button.setAttribute('aria-label',(state.paused?'Play':'Pause')+' '+state.kind+' artwork');}
  function schedule(){
    if(raf!==null){cancelAnimationFrame(raf);raf=null;}
    if(!document.hidden&&!reduced.matches&&widgets.some(s=>s.visible&&!s.paused))raf=requestAnimationFrame(tick);
  }
  function tick(now){
    raf=null;const dt=Math.min((now-last)/1000,.06);
    if(now-last>=1000/30){last=now;widgets.forEach(s=>{if(s.visible&&!s.paused){s.time+=dt;render(s);}});}
    if(!document.hidden&&!reduced.matches&&widgets.some(s=>s.visible&&!s.paused))raf=requestAnimationFrame(tick);
  }
  document.querySelectorAll('[data-artwork]').forEach(node=>{
    const kind=node.dataset.artwork,canvas=node.querySelector('canvas'),button=node.querySelector('[data-artwork-toggle]');
    const context=canvas?.getContext('2d');if(!context||!button||!renderers[kind])return;
    const state={node,kind,canvas,context,button,time:7,paused:false,visible:true};widgets.push(state);
    canvas.hidden=false;node.querySelector('.living-poster').setAttribute('hidden','');button.hidden=false;label(state);render(state);
    button.addEventListener('click',()=>{state.paused=!state.paused;label(state);schedule();});
  });
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{const state=widgets.find(s=>s.node===e.target);if(state)state.visible=e.isIntersecting;});schedule();},{rootMargin:'60px'});widgets.forEach(s=>observer.observe(s.node));}
  reduced.addEventListener('change',()=>{widgets.forEach(s=>{label(s);render(s);});schedule();});
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('resize',()=>widgets.forEach(render));
  schedule();
})();
