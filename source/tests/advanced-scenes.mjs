// Editorial imagery and performance checks; the old WebGL-heavy scenes are intentionally removed.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.BLOG_TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
try {
 for(const route of ['/','/ar/']){
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
   const page=await context.newPage(),resources=[],errors=[];
   page.on('request',request=>resources.push(request.url()));
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(new URL(route,base).href);
   await page.evaluate(()=>document.fonts.ready);
   const hero=page.locator('.mag-topstory-visual img');
   assert.equal(await hero.count(),1,'Feature article must have one main visual');
   await hero.evaluate(async img=>{ if(!img.complete)await img.decode(); });
   assert(await hero.evaluate(img=>img.naturalWidth>0 && img.naturalHeight>0),'Feature image must load');
   assert.equal(await page.locator('[data-story-canvas]').count(),0,'No GPU canvases');
   assert(!resources.some(url=>/\/advanced-art\.js(?:\?|$)|\/vendor\/three/.test(url)),'Do not download old GPU engine');
   const coverCount=await page.locator('.mag-book-cover img').count();
   if(route==='/')assert(coverCount>0,'Published English bookshelf has actual covers');
   else assert(coverCount>0||await page.locator('.mag-empty').count(),'Arabic shelf must show books or an honest empty state');
   assert.deepEqual(errors,[],'Editorial homepage has no browser errors');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Content fits window');
   checks++;
   await context.close();
  }
 }
 console.log('PASS:',checks,'editorial imagery, performance and locale checks');
} finally { await browser.close(); }
