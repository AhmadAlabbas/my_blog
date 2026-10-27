// Run against the built Node app using isolated development data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.BLOG_TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
  args:['--no-sandbox'],
});
const studio='canvas[data-story-canvas="studio"]';
let layoutChecks=0,motionChecks=0;

async function open(page,route){
  await page.goto(new URL(route,base).href);
  await page.locator('.home-cinema').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const reject=page.locator('[data-choice="rejected"]');
  if(await reject.isVisible())await reject.click();
}
async function snapshot(page,selector){
  return page.locator(selector).evaluate(canvas=>({
    frame:Number(canvas.dataset.frame),state:canvas.dataset.motionState,pixels:canvas.toDataURL(),
  }));
}
async function renderingTurns(page,count=10){
  await page.evaluate(count=>new Promise(resolve=>{
    const next=()=>--count?requestAnimationFrame(next):resolve();
    requestAnimationFrame(next);
  }),count);
}
async function advances(page,selector){
  const before=await snapshot(page,selector);
  await page.waitForFunction(({selector,frame})=>{
    const canvas=document.querySelector(selector);
    return canvas?.dataset.motionState==='running'&&Number(canvas.dataset.frame)>frame+4;
  },{selector,frame:before.frame},{timeout:10000});
  const after=await snapshot(page,selector);
  assert.notEqual(before.pixels,after.pixels,'Artwork pixels must actually change during playback');
  motionChecks++;
}
async function stationary(page,selector){
  // Let any already queued render settle, then observe several display refreshes.
  await renderingTurns(page,3);
  const before=await snapshot(page,selector);
  await renderingTurns(page);
  const after=await snapshot(page,selector);
  assert.equal(after.frame,before.frame,'Stopped artwork must not keep rendering');
  assert.equal(after.pixels,before.pixels,'Stopped artwork must retain its frame');
  motionChecks++;
}

try{
  for(const route of ['/','/ar/']){
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await open(page,route);
    assert.equal(await page.locator('[data-story-canvas]').count(),3);
    await page.locator(studio).scrollIntoViewIfNeeded();
    await advances(page,studio);
    const button=page.locator('[data-story-motion]');
    assert(await button.isVisible());assert(await button.isEnabled());
    assert((await button.innerText()).trim().length>0);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    await page.locator(studio).scrollIntoViewIfNeeded();
    await page.waitForFunction(selector=>document.querySelector(selector)?.dataset.motionState==='paused',studio);
    await stationary(page,studio);
    assert(await page.locator('.home-cinema').evaluate(el=>el.classList.contains('is-paused')));
    assert(await page.locator('.home-quote-track').count()>0);
    assert(await page.locator('.home-quote-track').evaluateAll(tracks=>tracks.every(track=>getComputedStyle(track).animationPlayState.split(',').every(state=>state.trim()==='paused'))),'Global pause freezes quote ribbons');
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'),'false');
    await page.locator(studio).scrollIntoViewIfNeeded();
    await advances(page,studio);
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(selector=>document.querySelector(selector)?.dataset.motionState==='offscreen',studio);
    await stationary(page,studio);
    const reading='canvas[data-story-canvas="reading"]';
    await page.locator(reading).scrollIntoViewIfNeeded();
    await advances(page,reading);
    if(route==='/'){
      const shelfSelector='[data-book-viewport]',shelf=page.locator(shelfSelector);
      const showShelf=async()=>{
        await shelf.scrollIntoViewIfNeeded();
        // Hover and focus have their own pause rules; keep both outside the shelf.
        await page.mouse.move(4,4);
        await renderingTurns(page,3);
      };
      const advancesShelf=async()=>{
        const before=await shelf.evaluate(el=>el.scrollLeft);
        await page.waitForFunction(({selector,before})=>Math.abs(document.querySelector(selector).scrollLeft-before)>1,{selector:shelfSelector,before},{timeout:10000});
        motionChecks++;
      };
      await showShelf();
      await advancesShelf();
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'),'true');
      await showShelf();
      const before=await shelf.evaluate(el=>el.scrollLeft);
      await renderingTurns(page,15);
      const after=await shelf.evaluate(el=>el.scrollLeft);
      assert(Math.abs(after-before)<.5,'Global pause freezes the visible books carousel');
      motionChecks++;
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'),'false');
      await showShelf();
      await advancesShelf();
      await page.locator(reading).scrollIntoViewIfNeeded();
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('[data-story-motion]')?.disabled,null,{timeout:5000}).catch(async error=>{
      console.error('Reduced-motion diagnostic',route,await page.evaluate(()=>({
        media:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:document.hidden,
        root:document.querySelector('.home-cinema')?.className,
        controls:[...document.querySelectorAll('[data-story-motion]')].map(el=>el.outerHTML),
        scenes:[...document.querySelectorAll('[data-story-canvas]')].map(el=>({type:el.dataset.storyCanvas,state:el.dataset.motionState,frame:el.dataset.frame})),
      })),errors);
      throw error;
    });
    await stationary(page,reading);
    assert.deepEqual(errors,[],route+': no browser exceptions');
    await context.close();
  }

  for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
    const page=await context.newPage();
    for(const route of ['/','/ar/']){
      await open(page,route);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('.site-footer .language-switch').count(),0);
      assert.equal(await page.locator('html').getAttribute('dir'),route==='/ar/'?'rtl':'ltr');
      const motion=page.locator('[data-story-motion]');
      assert(await motion.isVisible());assert(await motion.isDisabled());
      const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.equal(dimensions.viewport,width);
      assert(dimensions.scroll<=width,`${route}: homepage overflow at ${width}px`);
      for(const canvas of await page.locator('[data-story-canvas]').all()){
        const box=await canvas.boundingBox();
        assert(box&&box.width>0&&box.height>0,'Artwork has a visible responsive drawing area');
        assert(box.x>=-1&&box.x+box.width<=width+1,`${route}: artwork stays contained at ${width}px`);
      }
      if(width<500){
        const art=await page.locator(studio).boundingBox();
        const copy=await page.locator('.home-story-hero .home-story-copy').first().boundingBox();
        assert(copy&&art&&art.y+art.height<=copy.y+2,`${route}: mobile introduction follows the artwork`);
      }
      await stationary(page,studio);
      layoutChecks++;
    }
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const page=await context.newPage();
  for(const route of ['/','/ar/']){
    await open(page,route);
    assert(!(await page.locator('[data-story-motion]').isVisible()),'No unusable motion control without JavaScript');
    assert((await page.locator('h1').innerText()).trim().length>8);
    const links=page.locator('.home-story-copy a[href]');
    assert(await links.count()>0,'Editorial links remain available without JavaScript');
    const href=await links.first().getAttribute('href');
    assert(href&&href.startsWith(route),route+': links stay in the selected language');
    assert(await page.locator('.newsletter-form').count()>0,'Native newsletter form is preserved');
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
    assert(fits,route+': no-JavaScript mobile layout fits');
    layoutChecks++;
  }
  await context.close();
  console.log(`PASS: ${motionChecks} motion checks (actual pixels, global pause/resume including books and quotes, offscreen, reduced motion) and ${layoutChecks} bilingual layout/no-JavaScript checks.`);
}finally{
  await browser.close();
}
