// Require the detailed GPU artwork as well as its graceful fallbacks.
// SwiftShader gives CI a deterministic WebGL2 implementation; production uses the browser GPU.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.BLOG_TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
const selector=kind=>`canvas[data-story-canvas="${kind}"]`;
const studio=selector('studio');
const heavy=url=>/\/advanced-art\.js(?:\?|$)|\/vendor\//.test(url);
let sculptureChecks=0,fallbackChecks=0;

function observeErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return errors;
}
async function open(page,route='/'){
  await page.goto(new URL(route,base).href);
  await page.locator(studio).waitFor();
  const reject=page.locator('[data-choice="rejected"]');
  if(await reject.isVisible())await reject.click();
}
async function turns(page,count=15){
  await page.evaluate(count=>new Promise(resolve=>{
    function next(){if(--count)requestAnimationFrame(next);else resolve();}
    requestAnimationFrame(next);
  }),count);
}
async function frame(page,target){
  return page.locator(target).evaluate(canvas=>({
    count:Number(canvas.dataset.frame),renderer:canvas.dataset.renderer,pixels:canvas.toDataURL(),
  }));
}
async function advancing(page,target,renderer){
  const before=await frame(page,target);
  await page.waitForFunction(({target,renderer,count})=>{
    const canvas=document.querySelector(target);
    return canvas?.dataset.renderer===renderer&&Number(canvas.dataset.frame)>count+5;
  },{target,renderer,count:before.count},{timeout:20000});
  const after=await frame(page,target);
  assert(before.pixels!==after.pixels,`${renderer}: actual artwork pixels must change`);
}
async function readable(page){
  assert((await page.locator('h1').innerText()).trim().length>8);
  assert(await page.locator('.home-story-copy a[href]').count()>0,'Story links remain usable');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Homepage fits its viewport');
}

try{
  for(const {route,width} of [{route:'/',width:1440},{route:'/ar/',width:1440},{route:'/',width:390}]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference',isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage(),errors=observeErrors(page);
    await open(page,route);
    for(const kind of ['studio','signals','reading']){
      const target=selector(kind);
      await page.locator(target).scrollIntoViewIfNeeded();
      await page.waitForFunction(target=>document.querySelector(target)?.dataset.renderer==='sculpture',target,{timeout:30000});
      // Observe beyond the initial illustration-to-sculpture fade, then require live geometry.
      const start=await page.locator(target).evaluate(canvas=>Number(canvas.dataset.frame));
      await page.waitForFunction(({target,start})=>Number(document.querySelector(target).dataset.frame)>start+18,{target,start},{timeout:20000});
      await advancing(page,target,'sculpture');
      const background=await page.locator(target).evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(3,3,1,1).data));
      assert(Math.min(...background.slice(0,3))>220&&Math.max(...background.slice(0,3))-Math.min(...background.slice(0,3))<32,'Transparent sculpture frames retain the clean white background');
      sculptureChecks++;
    }
    await readable(page);
    assert.deepEqual(errors,[],`${route} at ${width}px: no browser exceptions`);
    await context.close();
  }

  // A failed optional module download must retain animated first-party illustrations.
  {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
    let intercepted=false;
    await context.route('**/advanced-art.js*',async route=>{intercepted=true;await route.abort();});
    const page=await context.newPage(),errors=observeErrors(page);
    const failedRequest=page.waitForEvent('requestfailed',{predicate:request=>/\/advanced-art\.js(?:\?|$)/.test(request.url()),timeout:20000});
    await open(page);
    await page.locator(studio).scrollIntoViewIfNeeded();
    await failedRequest;
    assert(intercepted,'The optional detailed-artwork request was actually blocked');
    await advancing(page,studio,'illustration');
    await readable(page);assert.deepEqual(errors,[]);
    fallbackChecks++;
    await context.close();
  }

  // A browser without WebGL2 still keeps a moving homepage and all its content.
  {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      window.__webglAttempts=0;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        if(/^webgl|experimental-webgl/.test(type)){window.__webglAttempts++;return null;}
        return original.call(this,type,...args);
      };
    });
    const page=await context.newPage(),errors=observeErrors(page);
    await open(page);
    await page.locator(studio).scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.__webglAttempts>0,null,{timeout:20000});
    await advancing(page,studio,'illustration');
    await readable(page);assert.deepEqual(errors,[]);
    fallbackChecks++;
    await context.close();
  }

  // GPU context loss can occur after loading on a phone; the artwork must recover.
  {
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      window.__artGL=[];
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        const result=original.call(this,type,...args);
        if(type==='webgl2'&&result&&!window.__artGL.includes(result))window.__artGL.push(result);
        return result;
      };
    });
    const page=await context.newPage(),errors=observeErrors(page);
    await open(page);
    await page.locator(studio).scrollIntoViewIfNeeded();
    await page.waitForFunction(target=>document.querySelector(target)?.dataset.renderer==='sculpture',studio,{timeout:30000});
    assert(await page.evaluate(()=>{
      const extension=window.__artGL[0]?.getExtension('WEBGL_lose_context');
      if(!extension)return false;extension.loseContext();return true;
    }),'Software WebGL exposes context-loss testing');
    await page.waitForFunction(target=>document.querySelector(target)?.dataset.renderer==='illustration',studio,{timeout:10000});
    await advancing(page,studio,'illustration');
    await readable(page);assert.deepEqual(errors,[]);
    fallbackChecks++;
    await context.close();
  }

  for(const policy of ['reduced-motion','save-data']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:policy==='reduced-motion'?'reduce':'no-preference'});
    if(policy==='save-data')await context.addInitScript(()=>{
      Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,addEventListener(){},removeEventListener(){}}});
    });
    const page=await context.newPage(),errors=observeErrors(page),requests=[];
    page.on('request',request=>{if(heavy(request.url()))requests.push(request.url());});
    await open(page);
    assert(await page.locator('[data-story-motion]').isDisabled(),policy+': motion is disabled');
    for(const kind of ['studio','signals','reading']){
      const target=selector(kind);
      await page.locator(target).scrollIntoViewIfNeeded();
      await turns(page,3);
      const before=await frame(page,target);await turns(page,15);const after=await frame(page,target);
      assert.equal(after.count,before.count,policy+': no continued rendering');
      assert(after.pixels===before.pixels,policy+': retain a complete still illustration');
      assert.equal(after.renderer,'illustration');
    }
    assert.deepEqual(requests,[],policy+': detailed engine is not downloaded');
    await readable(page);assert.deepEqual(errors,[]);
    fallbackChecks++;
    await context.close();
  }
  console.log(`PASS: ${sculptureChecks} detailed sculpture/pixel checks and ${fallbackChecks} blocked-download, WebGL-loss and motion-policy checks.`);
}finally{
  await browser.close();
}
