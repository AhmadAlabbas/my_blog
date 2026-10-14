// Run against the Node.js site with isolated development data, not the static preview.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.BLOG_TEST_BASE_URL || 'http://127.0.0.1:3000';
const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args:['--no-sandbox'],
});
let checks=0;
try {
  for(const width of [320,375,390,414,430,768,1440]) {
    const context=await browser.newContext({
      viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,
      reducedMotion:'reduce',
    });
    const page=await context.newPage();
    for(const route of ['/','/ar/','/contact.html','/ar/contact.html','/articles.html','/ar/articles.html','/book-summaries.html','/ar/book-summaries.html','/why-i-love-electrical-engineering-and-physics.html','/ar/why-i-love-electrical-engineering-and-physics.html','/search.html','/ar/search.html']) {
      await page.goto(new URL(route,base).href);
      await page.evaluate(()=>document.fonts.ready);
      assert(await page.locator('.site-footer').count(), 'Use the running server: missing page layout');
      if(!route.includes('search.html'))assert(await page.locator('.form-trap').count(), 'Use the running server: missing spam-trap field');
      async function fits() {
        const dimensions=await page.evaluate(()=>({
          viewport:document.documentElement.clientWidth,
          scroll:document.documentElement.scrollWidth,
          layout:innerWidth,
        }));
        assert.equal(dimensions.viewport,width,`${route}: viewport at ${width}px`);
        assert.equal(dimensions.layout,width,`${route}: mobile layout at ${width}px`);
        assert(dimensions.scroll<=width,`${route}: horizontal overflow at ${width}px (${dimensions.scroll})`);
        checks++;
      }
      await fits();
      const reject=page.locator('[data-choice="rejected"]');
      if(await reject.isVisible()) await reject.click();
      await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await fits();
      if(route==='/') {
        const scrolling=await page.locator('[data-book-viewport]').evaluate(e=>{
          const before=e.scrollLeft;e.scrollLeft=100;
          return {width:e.clientWidth,content:e.scrollWidth,moved:e.scrollLeft!==before};
        });
        assert(scrolling.content>scrolling.width && scrolling.moved,'Bookshelf must still scroll independently');
        await fits();
      }
      await page.evaluate(()=>window.scrollTo(0,0));
      if(width<500) {
        await page.locator('.menu-button').click();
        assert(await page.locator('#mobileMenu').isVisible());
        await fits();
        await page.locator('.menu-button').click();
      }
    }
    await context.close();
  }
  // Exercise actual discovery interactions, including native GET forms with JS off.
  for(const javaScriptEnabled of [true,false]){
    const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled,reducedMotion:'reduce'});
    const page=await context.newPage();
    for(const [prefix,query] of [['/','physics'],['/ar/','الْفِيزِيَاء']]){
      await page.goto(new URL(prefix+'articles.html',base).href);
      await page.locator('#collection-search').fill(query);
      await page.locator('#collection-topic').selectOption('Science');
      await Promise.all([page.waitForURL(url=>url.searchParams.get('q')===query),page.locator('.discovery-form button').click()]);
      const cards=page.locator('main .card'),matchingCount=await cards.count();assert(matchingCount>0,'Combined search and topic must find notes');
      assert((await cards.evaluateAll(elements=>elements.every(el=>el.dataset.category==='Science'))),'Search must retain the selected topic');
      await Promise.all([page.waitForURL(url=>!url.search),page.locator('.discovery-form .text-link').click()]);
      assert(await page.locator('main .card').count()>matchingCount,'Reset restores the collection');
      await page.locator('#collection-search').fill('impossible-no-matches');
      await Promise.all([page.waitForURL(url=>url.searchParams.get('q')==='impossible-no-matches'),page.locator('.discovery-form button').click()]);
      assert.equal(await page.locator('main .card').count(),0);assert(await page.locator('.collection-empty').isVisible());
      if(javaScriptEnabled){
        await page.locator('[data-open-search]').click();
        await page.locator('#search-input').fill(query);
        assert(await page.locator('.search-result:visible').count()>0,'Dialog search handles Arabic diacritics');
        await Promise.all([page.waitForURL(url=>url.pathname===prefix+'search.html'),page.locator('#search-input').press('Enter')]);
        assert(await page.locator('main .card').count()>0);
      }
    }
    await context.close();
  }
  console.log(`PASS: ${checks} overflow checks on home, contact, collections, articles and search in English/Arabic; mobile menus, bookshelf scrolling, search and topic filters with/without JavaScript.`);
} finally {
  await browser.close();
}
