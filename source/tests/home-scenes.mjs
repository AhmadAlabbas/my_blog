// Editorial homepage integration: intentional replacements for old motion-scene tests.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.BLOG_TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
try {
 for(const route of ['/','/ar/']){
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(new URL(route,base).href);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('h1').count(),1,'One editorial heading');
   assert.equal(await page.locator('.mag-topstory').count(),1,'Lead story must be prominent');
   assert.equal(await page.locator('.mag-topstory-copy h2 a').count(),1,'Lead story must link to an article');
   assert.equal(await page.locator('.mag-topicnav a').count(),4,'Four topic links must remain accessible');
   assert(await page.locator('.mag-highlights-grid .mag-card').count()>0,'Featured articles must be populated');
   assert.equal(await page.locator('.mag-front .newsletter-form').count(),1,'Newsletter form remains available');
   assert.equal(await page.locator('[data-story-canvas], [data-story-motion], .home-quote-track').count(),0,'Remove obsolete motion elements');
   assert.equal(await page.locator('html').getAttribute('dir'),route==='/ar/'?'rtl':'ltr');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'No horizontal overflow');
   assert.deepEqual(errors,[],'No JavaScript exceptions');
   const collection=await page.locator('.mag-topicnav a').first().getAttribute('href');
   assert(collection.startsWith(route),'Topic links respect locale');
   const lead=await page.locator('.mag-topstory-copy h2 a').getAttribute('href');
   assert(lead.startsWith(route),'Story links respect locale');
   checks++;
   await context.close();
  }
 }
 for(const route of ['/','/ar/']){
  const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto(new URL(route,base).href);
  assert(await page.locator('.mag-topstory-copy h2').isVisible(),'Lead story remains visible without JS');
  assert(await page.locator('.mag-topicnav a').count()===4,'Navigation remains usable without JS');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'No JS mobile layout fits');
  checks++;
  await context.close();
 }
 console.log('PASS:',checks,'bilingual editorial front page and no-JavaScript checks');
} finally { await browser.close(); }
