'use strict';
// Static and moving artwork share the same composition from the first paint.
(() => {
  const root=document.querySelector('.home-cinema');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),connection=navigator.connection;
  const control=root.querySelector('[data-story-motion]'),arabic=document.documentElement.lang==='ar';
  const artworkURL=new URL('./advanced-art.js',document.currentScript?.src||location.href);
  artworkURL.search=new URL(document.currentScript?.src||location.href).search;
  let modulePromise,paused=false,request=0,last=0;
  const policyOff=()=>reduced.matches||Boolean(connection?.saveData);
  const states=[...root.querySelectorAll('[data-story-canvas]')].map(canvas=>{
    canvas.dataset.frame='0';canvas.dataset.renderer='poster';
    return {canvas,context:canvas.getContext('2d',{alpha:false}),type:canvas.dataset.storyCanvas,visible:false,time:0,frames:0};
  }).filter(state=>state.context);
  function release(state){
    const artwork=state.artwork;state.artwork=null;state.surface=null;
    state.canvas.dataset.renderer='poster';
    artwork?.dispose();
  }
  function canMove(state){return state.visible&&!document.hidden&&!paused&&!policyOff();}
  function draw(state){
    if(!state.artwork||!state.width||!state.height)return;
    try{
      if(state.artwork.lost)throw Error('Graphics context unavailable');
      state.artwork.render(state.time);
      const {context:c,width:w,height:h}=state;
      c.setTransform(state.ratio,0,0,state.ratio,0,0);
      c.fillStyle='#ffffff';c.fillRect(0,0,w,h);
      c.drawImage(state.surface,0,0,w,h);
      state.canvas.dataset.frame=String(++state.frames);
      state.canvas.dataset.renderer='sculpture';
    }catch{release(state);}
  }
  function resize(state){
    const box=state.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);
    const width=Math.round(box.width),height=Math.round(box.height);
    if(width===state.width&&height===state.height&&ratio===state.ratio)return;
    Object.assign(state,{width,height,ratio});
    state.canvas.width=Math.max(1,Math.round(width*ratio));state.canvas.height=Math.max(1,Math.round(height*ratio));
    state.artwork?.resize(width,height,ratio);draw(state);
  }
  async function prepare(state){
    if(state.attempted||state.pending||!canMove(state))return;
    state.pending=true;
    try{
      modulePromise ||= import(artworkURL.href);
      const {createArtwork}=await modulePromise;
      if(!canMove(state))return;
      state.attempted=true;
      state.surface=document.createElement('canvas');
      state.artwork=createArtwork(state.surface,state.type);
      state.artwork.resize(state.width,state.height,state.ratio);
      state.surface.addEventListener('webglcontextlost',event=>{event.preventDefault();release(state);sync();},{once:true});
      // The first live frame is exactly the pose used for the shipped poster.
      state.time=0;draw(state);
    }catch{state.attempted=true;release(state);}
    finally{state.pending=false;sync();}
  }
  function tick(now){
    request=0;
    const active=states.filter(state=>canMove(state)&&state.artwork);
    if(!active.length){last=0;sync();return;}
    if(!last||now-last>=1000/30){
      const delta=last?Math.min((now-last)/1000,.08):0;last=now;
      active.forEach(state=>{state.time+=delta;draw(state);});
    }
    request=requestAnimationFrame(tick);
  }
  function sync(){
    const stopped=paused||policyOff();
    root.classList.toggle('is-paused',stopped||document.hidden);
    root.classList.toggle('is-motion-ready',!policyOff());
    if(control){control.hidden=false;control.disabled=policyOff();control.setAttribute('aria-pressed',String(stopped));
      control.textContent=policyOff()?(arabic?'الحركة متوقفة':'Motion off'):paused?(arabic?'استأنف الحركة':'Resume motion'):(arabic?'أوقف الحركة':'Pause motion');control.setAttribute('aria-label',control.textContent);}
    states.forEach(state=>{state.canvas.dataset.motionState=!state.visible||document.hidden?'offscreen':stopped||state.attempted&&!state.artwork?'paused':'running';prepare(state);});
    if(states.some(state=>canMove(state)&&state.artwork)){if(!request)request=requestAnimationFrame(tick);}
    else{if(request)cancelAnimationFrame(request);request=0;last=0;}
  }
  const resizing='ResizeObserver' in window?new ResizeObserver(entries=>{for(const entry of entries){const state=states.find(s=>s.canvas===entry.target);if(state)resize(state);}}):null;
  states.forEach(state=>{resize(state);const box=state.canvas.getBoundingClientRect();state.visible=box.bottom>0&&box.top<innerHeight;resizing?.observe(state.canvas);});
  if(!resizing)window.addEventListener('resize',()=>states.forEach(resize),{passive:true});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){const state=states.find(s=>s.canvas===entry.target);if(state)state.visible=entry.isIntersecting;}sync();},{threshold:.01});states.forEach(state=>observer.observe(state.canvas));}
  const footer=root.querySelector('.site-footer');
  if(footer&&'IntersectionObserver' in window)new IntersectionObserver(entries=>root.classList.toggle('is-footer-visible',entries[0].isIntersecting)).observe(footer);
  control?.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',sync);connection?.addEventListener?.('change',sync);document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',event=>{if(request)cancelAnimationFrame(request);request=0;last=0;if(!event.persisted)states.forEach(release);});
  window.addEventListener('pageshow',sync);sync();
})();
