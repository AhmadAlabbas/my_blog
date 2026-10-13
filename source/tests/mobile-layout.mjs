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
    for(const route of ['/','/ar/','/contact.html','/ar/contact.html']) {
      await page.goto(new URL(route,base).href);
      await page.evaluate(()=>document.fonts.ready);
      assert(await page.locator('.form-trap').count(), 'Use the running server: missing spam-trap field');
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
  console.log(`PASS: ${checks} overflow checks on server-rendered home/contact pages in English/Arabic; mobile menus and independent bookshelf scrolling.`);
} finally {
  await browser.close();
}
