import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/app.mjs';
import {configuration,root} from '../server/config.mjs';
import {seedStore} from '../server/store.mjs';
import bcrypt from 'bcryptjs';

let directory,db,server,base,config;
const session={cookie:''},guest={cookie:''},second={cookie:''};
const token=html=>{const match=html.match(/name="csrf" value="([a-f0-9]+)"/);assert(match,'Missing CSRF token');return match[1];};
async function request(route,body=null,client=session,extra={}){
  const form=body instanceof FormData;
  const response=await fetch(base+route,{redirect:'manual',method:body?'POST':'GET',headers:{Origin:config.publicURL,...(client.cookie?{Cookie:client.cookie}:{}),...(!form&&body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...extra},body:body?(form?body:new URLSearchParams(body)):undefined});
  const cookie=response.headers.get('set-cookie');if(cookie)client.cookie=cookie.split(';')[0];
  return {status:response.status,headers:response.headers,text:await response.text()};
}
before(async()=>{
  directory=fs.mkdtempSync(path.join(os.tmpdir(),'node-blog-check-'));
  const mysql=process.env.TEST_MYSQL==='1';
  if(mysql&&!String(process.env.MYSQL_DATABASE).endsWith('_test'))throw Error('MySQL tests require a dedicated database ending in _test');
  config=configuration({...(mysql?{DB_DRIVER:'mysql',MYSQL_HOST:process.env.MYSQL_HOST,MYSQL_PORT:process.env.MYSQL_PORT,MYSQL_DATABASE:process.env.MYSQL_DATABASE,MYSQL_USER:process.env.MYSQL_USER,MYSQL_PASSWORD:process.env.MYSQL_PASSWORD}:{}),DATA_DIR:directory,UPLOAD_DIR:path.join(directory,'uploads'),PUBLIC_URL:'http://blog.example.test',SESSION_SECRET:'isolated-session-secret-32-characters-long',SETUP_TOKEN:'isolated-setup-token-32-characters-long'});
  const instance=await createApp(config);db=instance.db;
  server=await new Promise(resolve=>{const listening=instance.app.listen(0,'127.0.0.1',()=>resolve(listening));});base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();fs.rmSync(directory,{recursive:true,force:true});});

test('public Node pages preserve the English/Arabic content, shelf separation and SEO',async()=>{
  assert.equal((await request('/health',null,guest)).status,200);
  assert.equal((await request('/ar',null,guest)).status,301);
  assert.equal((await db.all("SELECT COUNT(*) AS n FROM aa_posts WHERE type='article'"))[0].n,11);
  assert.equal((await db.all("SELECT COUNT(*) AS n FROM aa_posts WHERE type='book'"))[0].n,29);
  for(const route of ['/','/ar/','/about.html','/ar/about.html','/gallery.html','/ar/gallery.html','/contact.html','/ar/contact.html','/book-summaries.html','/ar/book-summaries.html']){
    const r=await request(route,null,guest);assert.equal(r.status,200,route);assert(r.text.includes('<base href="/">'));assert.equal((r.text.match(/<h1[ >]/g)||[]).length,1,route);assert.equal((r.text.match(/class="language-switch"/g)||[]).length,2,route);
    assert(r.text.includes('hreflang="en"'));assert(r.text.includes('hreflang="ar"'));assert(r.text.includes('rel="canonical"'));assert(!r.text.includes('config.js'));assert(!r.text.includes('api/contact.php'));
    if(route.startsWith('/ar/'))assert(r.text.includes('<html lang="ar" dir="rtl">'));
  }
  assert((await request('/book-summaries.html',null,guest)).text.includes('Harry Potter'));
  assert(!(await request('/ar/book-summaries.html',null,guest)).text.includes('Harry Potter'));
  assert.equal((await request('/ar/harry-potter-philosophers-stone.html',null,guest)).status,404);
  const images=text=>[...text.matchAll(/class="gallery-open"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(images((await request('/gallery.html',null,guest)).text),images((await request('/ar/gallery.html',null,guest)).text));
  assert.equal(images((await request('/gallery.html',null,guest)).text).length,10);
});

test('setup validates CSRF/token and locks once; anonymous dashboard access is rejected',async()=>{
  assert.equal((await request('/admin/',null,guest)).status,302);
  let r=await request('/admin/setup');const csrf=token(r.text);
  assert.equal((await request('/admin/setup',{csrf:'invalid',setup_token:config.setupToken,email:'owner@example.test',password:'Test-password-1!'})).status,403);
  assert.equal((await request('/admin/setup',{csrf,setup_token:'wrong',email:'owner@example.test',password:'Test-password-1!'})).status,422);
  r=await request('/admin/setup',{csrf,setup_token:config.setupToken,email:'owner@example.test',password:'Test-password-1!'});assert.equal(r.status,302);
  assert.equal((await request('/admin/setup')).status,403);
});

test('login rotates sessions, all dashboard sections render, CSRF and cross-origin writes fail',async()=>{
  let r=await request('/admin/login');const csrf=token(r.text),cookie=session.cookie;
  assert.equal((await request('/admin/login',{csrf,email:'owner@example.test',password:'wrong'})).status,422);
  r=await request('/admin/login',{csrf,email:'owner@example.test',password:'Test-password-1!'});assert.equal(r.status,302);assert.notEqual(session.cookie,cookie);assert(r.headers.get('set-cookie').includes('HttpOnly'));assert(r.headers.get('set-cookie').includes('SameSite=Strict'));
  for(const section of ['overview','articles','books','gallery','videos','media','pages','messages','subscribers','settings','seo','account'])assert.equal((await request('/admin/?section='+section)).status,200,section);
  assert.equal((await request('/admin/',{csrf:'bad',action:'save_post'})).status,403);
  r=await request('/admin/');assert.equal((await request('/admin/',{csrf:token(r.text),action:'save_pages',hero_title:'Bad'},session,{Origin:'https://evil.example'})).status,403);
});

let postID;
const post={action:'save_post',type:'article',id:'',slug:'node-test-note',title:'Node publishing test',subtitle:'Testing the Node dashboard',category:'Science',author:'Ahmad Alabbas',image:'assets/images/systems-1600.webp',intro:'Opening paragraph',body:'## A heading\n\n<script>alert(1)</script>\n\n> A useful quote',ending:'',source_url:'',isbn:'',published_at:'2026-10-13',status:'draft',title_ar:'مقال اختبار',subtitle_ar:'نسخة عربية',intro_ar:'مقدمة',body_ar:'## عنوان\n\nنص عربي\n\n<script>alert(1)</script>',translation_status:'draft'};
async function save(values){const csrf=token((await request('/admin/')).text);return request('/admin/?section=articles',{...post,...values,csrf});}

test('draft privacy, authenticated previews, bilingual publishing and escaping',async()=>{
  assert.equal((await save({})).status,302);postID=(await db.all('SELECT id FROM aa_posts WHERE slug=?',[post.slug]))[0].id;
  assert.equal((await request('/node-test-note.html',null,guest)).status,404);
  assert.equal((await request('/ar/node-test-note.html',null,guest)).status,404);
  assert.equal((await request('/admin/preview?id='+postID,null,guest)).status,302);
  const preview=await request('/admin/preview?id='+postID);assert(preview.text.includes('Private preview'));assert(preview.text.includes('noindex'));assert(preview.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(preview.headers.get('x-robots-tag'));
  assert.equal((await save({id:String(postID),status:'published',translation_status:'published'})).status,302);
  for(const route of ['/node-test-note.html','/ar/node-test-note.html']){const r=await request(route,null,guest);assert.equal(r.status,200);assert(r.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!r.text.includes('<script>alert(1)</script>'));assert(r.text.includes('BlogPosting'));}
  assert.equal((await save({id:String(postID),status:'published',translation_status:'draft'})).status,302);
  assert.equal((await request('/ar/node-test-note.html',null,guest)).status,404);
  const sitemap=(await request('/sitemap.xml',null,guest)).text;assert(sitemap.includes('/node-test-note.html'));assert(!sitemap.includes('/ar/node-test-note.html'));assert(sitemap.includes('image:loc'));assert(sitemap.includes('hreflang="ar"'));
  assert.equal((await save({id:String(postID),slug:'index'})).status,422);
});

test('Arabic books have their own shelf and Arabic editor direction',async()=>{
  const r=await save({type:'book',id:'',slug:'arabic-node-book',title:'كتاب عربي',body:'## الفكرة\n\nملخص عربي',language:'ar',status:'published'});assert.equal(r.status,302);
  assert((await request('/ar/book-summaries.html',null,guest)).text.includes('كتاب عربي'));
  assert(!(await request('/book-summaries.html',null,guest)).text.includes('كتاب عربي'));
  assert.equal((await request('/arabic-node-book.html',null,guest)).status,404);
  const entry=await request('/ar/arabic-node-book.html',null,guest);assert.equal(entry.status,200);assert(!entry.text.includes('rel="alternate" hreflang="en"'));
  const editor=await request('/admin/?section=books&new=1&language=ar');assert(editor.text.includes('value="ar" selected'));assert(editor.text.includes('data-post-editor'));assert(editor.text.includes('lang="ar" dir="rtl" name="title"'));
});

test('page/settings/gallery/video CRUD changes appear publicly and unsafe URLs are rejected',async()=>{
  const csrf=token((await request('/admin/')).text);
  assert.equal((await request('/admin/?section=pages',{csrf,action:'save_pages',hero_title:'A new Node headline',hero_intro:'My new introduction',about_title:'My Node story',about_body:'## My interests\n\nI love reading.',work_body:'## My project\n\nBuilding carefully.'})).status,302);
  assert((await request('/',null,guest)).text.includes('A new Node headline'));
  assert((await request('/about.html',null,guest)).text.includes('My interests'));
  assert((await request('/work.html',null,guest)).text.includes('My project'));
  assert.equal((await request('/admin/?section=settings',{csrf,action:'save_settings',social_youtube:'javascript:alert(1)'})).status,422);
  assert.equal((await request('/admin/?section=settings',{csrf,action:'save_settings',social_youtube:'https://www.youtube.com/@Ahmad'})).status,302);
  assert((await request('/',null,guest)).text.includes('https://www.youtube.com/@Ahmad'));
  assert.equal((await request('/admin/?section=gallery',{csrf,action:'save_gallery',id:'',image:'assets/images/conversation-1600.webp',title:'Node gallery entry',alt:'An envelope',category:'Conversation',sort_order:'-1',title_ar:'صورة اختبار',alt_ar:'مغلف',category_ar:'محادثة'})).status,302);
  assert((await request('/gallery.html',null,guest)).text.includes('Node gallery entry'));assert((await request('/ar/gallery.html',null,guest)).text.includes('صورة اختبار'));
  assert.equal((await request('/admin/?section=videos',{csrf,action:'save_video',id:'-1',title:'Node video',youtube_url:'https://www.youtube.com/watch?v=N0deVideo01',creator:'A channel',description:'An explanation',image:'assets/images/conversation-1600.webp'})).status,302);
  assert((await request('/admin/?section=videos')).text.includes('Node video'));
  assert.equal((await save({id:String(postID),status:'published',body:post.body+'\n\n[youtube](https://www.youtube.com/watch?v=N0deVideo01)'})).status,302);
  const inline=await request('/node-test-note.html',null,guest);assert(inline.text.includes('data-video-title="Node video"'));assert(inline.text.includes('data-video-play'));assert(!inline.text.includes('<iframe'));
  const id=(await db.all('SELECT id FROM aa_gallery WHERE title=?',['Node gallery entry']))[0].id;
  assert.equal((await request('/admin/?section=gallery',{csrf,action:'delete_gallery',id:String(id)})).status,302);assert(!(await request('/gallery.html',null,guest)).text.includes('Node gallery entry'));assert(fs.existsSync(path.join(config.dist,'assets/images/conversation-1600.webp')));
});

test('contact supports native English/Arabic submissions, UTF-8 limits and origin checks',async()=>{
  assert.equal((await request('/api/contact',null,guest)).status,405);
  assert.equal((await request('/api/contact',{name:'A',email:'a@example.test',message:'Hello'},guest,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/contact',{name:'A',email:'invalid',message:'Hello'},guest)).status,422);
  for(const language of ['en','ar']){
    const name=language==='ar'?'أ'.repeat(80):'Reader';const r=await request('/api/contact',{name,email:language+'@example.test',message:'Hello from the Node integration test',lang:language},guest);assert.equal(r.status,200);if(language==='ar')assert(r.text.includes('وصلت رسالتك.'));
    assert.equal((await db.all('SELECT name FROM aa_messages WHERE email=?',[language+'@example.test']))[0].name,name);
  }
  assert.equal((await request('/api/contact',{name:'Spam',email:'spam@example.test',message:'Spam',website:'filled'},guest)).status,200);
  assert.equal((await db.all('SELECT id FROM aa_messages WHERE email=?',['spam@example.test'])).length,0);
  const r=await request('/admin/?section=messages');assert(r.text.includes('Hello from the Node integration test'));
  const id=(await db.all('SELECT id FROM aa_messages LIMIT 1'))[0].id;assert.equal((await request('/admin/?section=messages',{csrf:token(r.text),action:'read_message',id:String(id)})).status,302);assert.equal((await db.all('SELECT is_read FROM aa_messages WHERE id=?',[id]))[0].is_read,1);
});

test('newsletter opt-in, confirmation, unsubscribe, non-reactivation and private CSV export',async()=>{
  assert.equal((await request('/api/subscribe',{email:'reader@example.test'},guest)).status,422);
  assert.equal((await request('/api/subscribe',{email:'reader@example.test',consent:'1',lang:'ar'},guest)).status,200);
  const subscriber=(await db.all('SELECT * FROM aa_subscribers WHERE email=?',['reader@example.test']))[0];
  assert((await request('/api/unsubscribe?token='+subscriber.token+'&lang=ar',null,guest)).text.includes('هل تريد مغادرة القائمة البريدية؟'));
  assert.equal((await db.all('SELECT status FROM aa_subscribers WHERE id=?',[subscriber.id]))[0].status,'active');
  const r=await request('/api/unsubscribe',{token:subscriber.token,lang:'ar'},guest);assert.equal(r.status,200);assert(r.text.includes('أُلغي الاشتراك.'));
  await request('/api/subscribe',{email:'reader@example.test',consent:'1'},guest);assert.equal((await db.all('SELECT status FROM aa_subscribers WHERE id=?',[subscriber.id]))[0].status,'unsubscribed');
  const csrf=token((await request('/admin/?section=subscribers')).text);const csv=await request('/admin/?section=subscribers',{csrf,action:'export'});assert.equal(csv.status,200);assert(!csv.text.includes('reader@example.test'));
});

test('uploads reject executable/SVG input and optimize valid images into persistent storage',async()=>{
  const csrf=token((await request('/admin/?section=media')).text);
  for(const [bytes,name,type] of [['<?php echo 1;?>','bad.php','image/png'],['<svg xmlns="http://www.w3.org/2000/svg"></svg>','bad.svg','image/svg+xml']]){
    const body=new FormData();body.set('csrf',csrf);body.set('action','upload');body.set('illustration',new Blob([bytes],{type}),name);assert.equal((await request('/admin/?section=media',body)).status,422);
  }
  const body=new FormData();body.set('csrf',csrf);body.set('action','upload');body.set('illustration',new Blob([fs.readFileSync(path.join(config.dist,'assets/images/conversation-640.webp'))],{type:'image/webp'}),'illustration.webp');
  assert.equal((await request('/admin/?section=media',body)).status,302);
  const files=fs.readdirSync(config.uploadDir);assert.equal(files.length,1);assert(files[0].endsWith('.webp'));assert.equal((await request('/assets/uploads/'+files[0],null,guest)).status,200);
});

test('migration is repeatable and preserves edited posts, messages, books and gallery',async()=>{
  const before=await db.all('SELECT * FROM aa_messages');
  const seed=JSON.parse(fs.readFileSync(path.join(root,'source/backend/_cms/seed.json'))),arabic=JSON.parse(fs.readFileSync(path.join(root,'source/backend/_cms/arabic.json')));
  await seedStore(db,seed,arabic);
  assert.deepEqual(await db.all('SELECT * FROM aa_messages'),before);assert.equal((await db.all('SELECT title FROM aa_posts WHERE id=?',[postID]))[0].title,post.title);assert.equal((await db.all("SELECT language FROM aa_post_languages WHERE post_id=(SELECT id FROM aa_posts WHERE slug='arabic-node-book')"))[0].language,'ar');
});

test('legacy PHP bcrypt hashes work; password changes invalidate other sessions and logout works',async()=>{
  const user=(await db.all('SELECT * FROM aa_admins LIMIT 1'))[0];await db.run('UPDATE aa_admins SET password_hash=? WHERE id=?',[user.password_hash.replace(/^\$2b\$/,'$2y$'),user.id]);
  for(const client of [session,second]){const csrf=token((await request('/admin/login',null,client)).text);assert.equal((await request('/admin/login',{csrf,email:'owner@example.test',password:'Test-password-1!'},client)).status,302);}
  let r=await request('/admin/?section=account');assert.equal((await request('/admin/?section=account',{csrf:token(r.text),action:'password',current_password:'Test-password-1!',new_password:'New-test-password-2!',confirm_password:'New-test-password-2!'})).status,302);
  assert.equal((await request('/admin/',null,second)).status,302);assert.equal((await request('/admin/')).status,200);
  r=await request('/admin/');assert.equal((await request('/admin/logout',{csrf:token(r.text)})).status,302);assert.equal((await request('/admin/')).status,302);
  assert(await bcrypt.compare('New-test-password-2!',(await db.all('SELECT password_hash FROM aa_admins LIMIT 1'))[0].password_hash));
});

test('private source/template/database paths are not served and production requires secure persistent settings',async()=>{
  for(const route of ['/templates/index.html','/assets/.htaccess','/source/backend/_cms/seed.json','/server/app.mjs','/.env','/.local-data/blog.sqlite'])assert.equal((await request(route,null,guest)).status,404,route);
  assert.throws(()=>configuration({NODE_ENV:'production',DB_DRIVER:'sqlite',PUBLIC_URL:'https://example.test'}),/persistent MySQL/);
});
