// Run after npm run build, against a local development server. Production builds
// use these committed stills and do not need a browser or GPU.
import fs from 'node:fs';
import {chromium} from 'playwright-core';
const base=process.env.BLOG_TEST_BASE_URL||'http://127.0.0.1:3000';
const output=new URL('../source/assets/home-scenes/',import.meta.url);
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();
  await page.goto(new URL('/about.html',base).href);
  for(const kind of ['studio','signals','reading'])for(const mobile of [false,true]){
    const bytes=await page.evaluate(async({kind,mobile})=>{
      const {createArtwork}=await import('/advanced-art.js');
      const width=mobile?600:1440,height=mobile?456:865;
      const surface=document.createElement('canvas'),art=createArtwork(surface,kind);
      try{
        art.resize(width,height,1);art.render(0);
        const copy=document.createElement('canvas');copy.width=width;copy.height=height;
        copy.getContext('2d').drawImage(surface,0,0,width,height);
        return copy.toDataURL('image/webp',.92).split(',')[1];
      }finally{art.dispose();}
    },{kind,mobile});
    fs.writeFileSync(new URL(kind+(mobile?'-mobile':'')+'.webp',output),Buffer.from(bytes,'base64'));
  }
  console.log('Rendered matching desktop and mobile sculpture posters. Run npm run build again.');
}finally{await browser.close();}
