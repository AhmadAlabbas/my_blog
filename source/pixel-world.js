'use strict';
// Original miniature environments. A 240 × 150 drawing surface keeps every pixel crisp.
(() => {
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
for(const root of document.querySelectorAll('[data-pixel-world]')) {
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),buttons=[...root.querySelectorAll('[data-world-scene]')],toggle=root.querySelector('[data-world-toggle]'),caption=root.querySelector('[data-world-caption]');
 if(!ctx)continue;
 canvas.hidden=false;root.querySelector('.world-poster').hidden=true;root.querySelector('.world-controls').hidden=false;
 const names=['A drawing comes to life.','An observatory beneath a moving sky.','A tiny workshop. A signal finding its way.'];
 let scene=0,time=0,paused=false,visible=true,previous=0,frame=0,lastPaint=0;
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
 const line=(x,y,x2,y2,c,w=1)=>{let n=Math.max(Math.abs(x2-x),Math.abs(y2-y));for(let i=0;i<=n;i++)r(x+(x2-x)*i/n,y+(y2-y)*i/n,w,w,c);};
 const disk=(x,y,radius,c)=>{for(let y0=-radius;y0<=radius;y0++){const a=Math.floor(Math.sqrt(radius*radius-y0*y0));r(x-a,y+y0,a*2+1,1,c);}};
 const windowPane=(x,y,w,h)=>{r(x-2,y-2,w+4,h+4,'#403e62');r(x,y,w,h,'#bcdce6');r(x+w/2,y,2,h,'#403e62');r(x,y+h/2,w,2,'#403e62');};
 const bottle=(x,y,c)=>{r(x+2,y-5,6,5,'#39394d');r(x,y,10,14,c);r(x+1,y+2,2,9,'#f8efdc');};
 const plant=(x,y)=>{r(x-5,y,13,10,'#ce765a');r(x,y-20,2,20,'#356553');for(let i=0;i<4;i++){r(x-6,y-19+i*4,6,3,i%2?'#54846b':'#375d4a');r(x+2,y-17+i*4,6,3,'#54846b');}};
 function studio(t){
  r(0,0,240,150,'#f2d7b9');r(0,107,240,43,'#ae7775');for(let y=112;y<150;y+=8){r(0,y,240,1,'#9a6667');for(let x=(y%3)*8;x<240;x+=39)r(x,y,1,8,'#9a6667');}
  r(0,0,8,108,'#eedec7');windowPane(16,15,44,62);r(20,20,17,22,'#c1d7a7');r(41,20,15,22,'#a8c7b7');r(20,47,17,25,'#83b1a5');r(41,47,15,25,'#649b97');
  // Floating dust in sunlight, outside clouds and a wall gallery.
  for(let i=0;i<12;i++)r(16+(i*7)%40,19+(i*13+t*1.5)%51,1,1,'#fff4cb');
  r(176,13,38,31,'#805a60');r(179,16,32,25,'#ffedbf');disk(187,24,5,'#eaa65e');r(193,27,13,10,'#578077');
  r(165,57,62,4,'#6a4d62');bottle(174,43,'#d79855');bottle(195,43,'#7ea499');plant(218,47);
  // Wooden easel and a painting that fills brushstroke by brushstroke.
  line(106,36,90,127,'#634f60',4);line(109,36,130,127,'#634f60',4);r(83,96,54,4,'#634f60');r(87,34,47,59,'#695065');r(90,37,41,53,'#fff3da');
  const progress=(t%12)/12;disk(110,54,9,'#e49b54');
  for(let y=0;y<24;y++)for(let x=0;x<38;x++)if(y*38+x<progress*912){const ridge=8+6*Math.sin(x*.14);if(y>ridge)r(92+x,64+y,1,1,y>ridge+8?'#306c67':'#80a68c');}
  // Paintbrush follows the current line, with a light animated hand and sleeve.
  let bx=92+Math.floor(progress*912)%38,by=64+Math.floor(progress*912/38);line(bx,by,bx+18,by+11,'#815354',2);r(bx+17,by+9,6,5,'#e9b38b');r(bx+23,by+9,13,9,'#667faf');
  r(146,105,87,6,'#644e62');r(151,111,4,30,'#644e62');r(222,111,4,30,'#644e62');r(154,92,30,13,'#f9e9c8');r(159,94,22,1,'#caac97');bottle(190,91,'#628ba4');bottle(208,91,'#cd845c');
  r(21,105,37,5,'#735363');r(24,110,4,24,'#735363');r(50,110,4,24,'#735363');plant(39,100);r(71,124,8,17,'#d1a17d');r(72,124,6,2,'#674e62');
 }
 function observatory(t){
  r(0,0,240,150,'#212440');for(let y=0;y<95;y+=6)r(0,y,240,3,y<45?'#252948':'#303758');
  for(let i=0;i<67;i++){const x=(i*71+19)%240,y=(i*29+7)%89;r(x,y,Math.sin(t*1.4+i)>.65?2:1,1,i%3?'#bdc4dd':'#f9d5a1');if(i%17===0&&Math.sin(t+i)>.7){r(x-2,y,5,1,'#efdab5');r(x,y-2,1,5,'#efdab5');}}
  disk(202,24,13,'#f5dab6');disk(197,19,12,'#252948');
  const meteor=(t*32)%350;for(let i=0;i<14;i++)r(meteor-i*2,12+meteor*.19-i*.5,2,1,i<4?'#f3ddad':'#596484');
  for(let x=0;x<240;x++)r(x,82+Math.sin(x*.035)*9,1,68,'#40445a');for(let x=0;x<240;x++)r(x,109+Math.sin(x*.06)*7,1,41,'#58605d');
  r(72,93,102,38,'#758996');r(76,100,94,3,'#a8b7b8');for(let i=0;i<6;i++)r(82+i*15,109,6,15,'#303852');r(72,131,102,5,'#394052');
  disk(123,88,39,'#91a8ae');r(84,88,79,13,'#a9bbc0');r(84,93,79,8,'#849ea8');for(let x=91;x<156;x+=14)r(x,68+(Math.abs(123-x)/3),2,24,'#758b98');
  // Open dome, tracking telescope and its counterweight.
  r(116,52,14,43,'#29334b');r(119,56,8,37,'#343f55');r(116,96,16,34,'#303952');
  const angle=-.55+Math.sin(t*.2)*.18;line(122,85,122+Math.cos(angle)*29,85+Math.sin(angle)*29,'#d9bea2',6);line(122,85,111,97,'#ae8b7c',3);r(104,94,8,5,'#e4b585');r(147+Math.sin(t*.2)*3,65,6,10,'#739aaa');
  r(12,117,43,22,'#4b5c67');r(9,114,49,4,'#75848a');r(21,122,9,11,Math.sin(t)>.1?'#e9c384':'#ba9f7d');r(37,122,9,11,'#e9c384');line(54,114,67,98,'#818b94');r(63,96,10,3,'#bdc2bb');
  for(let i=0;i<5;i++){let x=187+i*10,y=118+(i%2)*4;r(x,y,2,18,'#273e40');for(let j=0;j<4;j++)r(x-6+j,y+j*3,14-j*2,3,'#36554c');}
  r(0,145,240,5,'#253c3d');
 }
 function workshop(t){
  r(0,0,240,150,'#b8cec6');r(0,0,240,8,'#739c96');for(let x=12;x<238;x+=14)for(let y=18;y<94;y+=12)r(x,y,2,2,'#83aaa0');
  r(13,14,66,49,'#3c5964');r(16,17,60,43,'#edf0d0');for(let i=0;i<5;i++){line(23,24+i*6,56,24+i*6,'#9aaf9b');r(62,23+i*6,7,3,['#ce8865','#6796a0','#caad55'][i%3]);}
  r(106,20,103,4,'#587975');for(let i=0;i<5;i++){r(111+i*19,24,2,18,'#475d64');r(109+i*19,39,6,10,i%2?'#daa45d':'#cb7e66');}
  r(12,106,221,7,'#526169');r(20,113,5,37,'#526169');r(222,113,5,37,'#526169');r(21,121,191,4,'#71958e');r(0,139,240,11,'#8eaca1');
  // Oscilloscope with moving waveform and instrument knobs.
  r(18,74,63,32,'#5a6e74');r(22,78,38,24,'#1d424b');for(let x=24;x<58;x++){let y=90+Math.sin(x*.33-t*2.4)*7;r(x,y,1,2,'#acdca0');}for(let y=79;y<102;y+=5)r(24,y,33,1,'#326063');disk(70,83,3,'#d9cabb');disk(70,95,3,'#d9cabb');r(17,105,66,3,'#3c565f');
  r(93,84,64,21,'#faf1d1');for(let x=96;x<154;x+=4)for(let y=87;y<102;y+=4)r(x,y,1,1,'#b5b9a1');r(116,88,18,10,'#344c55');for(let i=0;i<5;i++){r(117+i*3,86,1,2,'#a7a795');r(117+i*3,98,1,2,'#a7a795');}
  line(101,90,101,71,'#cd7964',2);line(101,71,144,71,'#cd7964',2);line(144,71,144,92,'#cd7964',2);
  const pulse=(t*15)%60;for(let i=0;i<3;i++)r(102+(pulse+i*16)%42,70,2,2,'#ffe4a3');disk(149,92,3,Math.sin(t*3)>0?'#ffcd6d':'#b1946a');
  r(171,78,29,28,'#d7b166');r(175,82,21,13,'#e7e0ba');r(178,87,3,5,'#415864');r(184,85,3,7,'#415864');r(190,87,3,5,'#415864');disk(185,101,3,'#536870');
  const sway=Math.sin(t*1.7)*2;line(206,105,207,87,'#3b515c',3);line(207,87,216+sway,77,'#3b515c',2);r(210+sway,75,12,3,'#dab874');for(let i=0;i<5;i++)r(217+Math.sin(t+i)*2,69-i*4,1,2,'#e1e6cb');
  plant(224,100);r(100,124,61,13,'#cad7b9');r(104,127,53,2,'#829d93');r(135,135,17,2,'#657f7e');
 }
 const scenes=[studio,observatory,workshop];
 function draw(){ctx.clearRect(0,0,240,150);scenes[scene](time%12);caption.textContent=names[scene];buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===scene)));toggle.textContent=reduced.matches?'Motion off':paused?'Play':'Pause';toggle.disabled=reduced.matches;canvas.setAttribute('aria-label',names[scene]);}
 function active(){return visible&&!document.hidden&&!paused&&!reduced.matches;}
 function tick(now){frame=0;if(!active()){previous=0;return;}if(previous)time+=(now-previous)/1000;previous=now;if(now-lastPaint>66){if(time>=12){time%=12;scene=(scene+1)%3;}draw();lastPaint=now;}frame=requestAnimationFrame(tick);}
 function sync(){cancelAnimationFrame(frame);frame=0;previous=0;draw();if(active())frame=requestAnimationFrame(tick);}
 buttons.forEach((b,i)=>b.addEventListener('click',()=>{scene=i;time=6;paused=true;sync();}));toggle.addEventListener('click',()=>{paused=!paused;sync();});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'100px'}).observe(root);
 time=6;sync();
}
})();
