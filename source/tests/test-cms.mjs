import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PHP,PHPRequestHandler} from '@php-wasm/universal';
import {loadNodeRuntime,useHostFilesystem} from '@php-wasm/node';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ahmad-blog-test-'));
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(root+'/private',{recursive:true});
fs.cpSync(source+'/public',root+'/public_html',{recursive:true});fs.cpSync(source+'/backend',root+'/public_html',{recursive:true});
fs.writeFileSync(root+'/private/blog-config.php',`<?php return ['dsn'=>'sqlite:${root}/private/blog.sqlite','base_url'=>'https://ahmadalabbas.com','app_key'=>'unit-test-app-key-32-characters-or-more','setup_token'=>'unit-test-setup-token-32-characters-or-more'];`);
const php=new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1}}));useHostFilesystem(php);
const handler=new PHPRequestHandler({php,documentRoot:root+'/public_html',absoluteUrl:'https://ahmadalabbas.com'});
const guest=new PHPRequestHandler({php,documentRoot:root+'/public_html',absoluteUrl:'https://ahmadalabbas.com',cookieStore:false});
const request=async(url,body,client=handler)=>{
  const utf8=body&&Object.values(body).some(v=>typeof v==='string'&&/[^\x00-\x7F]/.test(v));
  const r=await client.request({url,method:body?'POST':'GET',...(body?{body:utf8?new TextEncoder().encode(new URLSearchParams(body).toString()):body}:{}),headers:{Origin:'https://ahmadalabbas.com',...(utf8?{'Content-Type':'application/x-www-form-urlencoded'}:{})}});
  assert.equal(r.errors,'',`PHP error in ${url}: ${r.errors}`);return r;
};
const token=r=>{const m=r.text.match(/name="csrf" value="([a-f0-9]+)"/);assert(m,'CSRF token missing');return m[1];};
let r=await request('/admin/setup.php');assert.equal(r.httpStatusCode,200);let csrf=token(r);
r=await request('/admin/setup.php',{csrf,setup_token:'bad',email:'owner@example.test',password:'Test-password-1!'});assert(r.text.includes('token is invalid'));
r=await request('/admin/setup.php',{csrf,setup_token:'unit-test-setup-token-32-characters-or-more',email:'owner@example.test',password:'Test-password-1!'});assert.equal(r.httpStatusCode,302,r.text);
r=await request('/admin/setup.php');assert.equal(r.httpStatusCode,403,'installer must lock');
r=await request('/admin/index.php',null,guest);assert.equal(r.httpStatusCode,302,'guest admin access denied');
r=await request('/admin/login.php');csrf=token(r);
r=await request('/admin/login.php',{csrf,email:'owner@example.test',password:'wrong'});assert(r.text.includes('incorrect'));
r=await request('/admin/login.php',{csrf,email:'owner@example.test',password:'Test-password-1!'});assert.equal(r.httpStatusCode,302,r.text);
r=await request('/admin/index.php');assert.equal(r.httpStatusCode,200);assert(r.text.includes('Make room for your next idea'));csrf=token(r);
r=await request('/app.php?page=index',null,guest);assert(r.text.includes('data-book-carousel'));assert.equal((r.text.match(/class="card book-summary-card"/g)||[]).length,29);r=await request('/admin/index.php');
const snapshots={overview:r.text};
for(const section of ['articles','books','gallery','videos','media','pages','messages','subscribers','settings','account']){
  r=await request('/admin/index.php?section='+section);assert.equal(r.httpStatusCode,200,section);assert(r.text.includes('</html>'),section);snapshots[section]=r.text;
}
r=await request('/admin/index.php?section=articles&new=1');assert(r.text.includes('English article text'));snapshots.editor=r.text;
fs.writeFileSync(root+'/admin-snapshots.json',JSON.stringify(snapshots));
r=await request('/admin/index.php?section=articles',{csrf:'invalid',action:'save_post'});assert.equal(r.httpStatusCode,403);
const post={csrf,action:'save_post',type:'article',id:'',slug:'test-blog-note',title:'A real CMS test',subtitle:'Testing publishing',category:'Science',author:'Ahmad Alabbas',image:'assets/images/systems-1600.webp',intro:'Opening paragraph',body:'## My heading\n\n<script>alert(1)</script>\n\n> A useful quote',ending:'',source_url:'',isbn:'',published_at:'2026-10-09',status:'draft'};
r=await request('/admin/index.php?section=articles&new=1',post);assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=test-blog-note',null,guest);assert.equal(r.httpStatusCode,404,'draft leaked');
const draftRows=await php.run({code:`<?php $pdo=new PDO('sqlite:${root}/private/blog.sqlite');echo $pdo->query("SELECT id FROM aa_posts WHERE slug='test-blog-note'")->fetchColumn();`});
r=await request('/admin/preview.php?id='+draftRows.text);assert.equal(r.httpStatusCode,200);assert(r.text.includes('Private preview'));
r=await request('/admin/preview.php?id='+draftRows.text,null,guest);assert.equal(r.httpStatusCode,302);
r=await request('/app.php?page=articles',null,guest);assert(!r.text.includes('A real CMS test'));
const dbValue=async(sql)=>{const r=await php.run({code:`<?php $pdo=new PDO('sqlite:${root}/private/blog.sqlite');echo json_encode($pdo->query(${JSON.stringify(sql)})->fetchAll(PDO::FETCH_ASSOC));`});assert.equal(r.errors,'');return JSON.parse(r.text);};
const rows=await dbValue('SELECT id FROM aa_posts WHERE slug=\'test-blog-note\'');post.id=String(rows[0].id);post.status='published';
r=await request('/admin/index.php?section=articles&edit='+post.id,post);assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=test-blog-note',null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert(!r.text.includes('<script>alert(1)</script>'));assert(r.text.includes('<base href="/">'));
for(const page of ['index','about','work','contact','gallery','book-summaries','privacy','science','technology','credits','harry-potter-philosophers-stone']){r=await request('/app.php?page='+page,null,guest);assert.equal(r.httpStatusCode,200,page);assert.equal((r.text.match(/<h1[ >]/g)||[]).length,1,page+' must have one H1');}
// Social profiles and unique animated artwork, on the actual PHP pages.
r=await request('/admin/index.php?section=settings',{csrf,action:'save_settings',name:'Ahmad Alabbas',tagline:'Test blog',contact_email:'',newsletter_intro:'Notes',social_youtube:'https://www.youtube.com/@example',social_linkedin:'https://www.linkedin.com/in/example',social_x:'https://x.com/example',social_instagram:'https://www.instagram.com/example'});assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=index',null,guest);assert(r.text.includes('studio-study-1600.webp'));assert(r.text.includes('data-pixel-world'));assert(!r.text.includes('data-video-play'),'Homepage video cards should link directly to YouTube');for(const url of ['https://www.youtube.com/@example','https://www.linkedin.com/in/example','https://x.com/example','https://www.instagram.com/example'])assert.equal(r.text.split('href="'+url+'"').length-1,2,'Social link must appear in navigation and footer');
for(const [page,kind] of [['science','waves'],['technology','orbit'],['about','mobile']]){r=await request('/app.php?page='+page,null,guest);assert(r.text.includes('data-artwork="'+kind+'"'),page);}
r=await request('/admin/index.php?section=settings',{csrf,action:'save_settings',social_x:'javascript:alert(1)'});assert(r.text.includes('full HTTPS X profile URL'));r=await request('/admin/index.php?section=settings',{csrf,action:'save_settings',social_youtube:'https://evil.example/@fake'});assert(r.text.includes('full HTTPS YouTube profile URL'));
r=await request('/admin/index.php?section=settings',{csrf,action:'save_settings',name:'Ahmad Alabbas',tagline:'A notebook',contact_email:'',newsletter_intro:'Notes'});assert.equal(r.httpStatusCode,302);r=await request('/app.php?page=index',null,guest);assert(!r.text.includes('href="https://x.com/example"'));assert(r.text.includes('X profile link coming soon'));
// Video management and safe inline media rendering.
r=await request('/admin/index.php?section=videos',{csrf,action:'save_video',id:'-1',youtube_url:'https://www.youtube.com/watch?v=spUNpyF58BY',title:'Test watch card',creator:'3Blue1Brown',description:'A signal explanation',image:'assets/images/waves-1600.webp'});assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=index',null,guest);assert(!r.text.includes('Test watch card'));assert(!r.text.includes('<iframe'),'third party must not load before interaction');assert(r.text.includes('blocks.css'));
r=await request('/admin/index.php?section=videos',{csrf,action:'save_video',id:'-1',youtube_url:'https://evil.example/watch?v=spUNpyF58BY',title:'Invalid video',image:'assets/images/waves-1600.webp'});assert(r.text.includes('valid HTTPS YouTube'));
r=await request('/admin/index.php?section=videos',{csrf,action:'delete_video',id:'3'});assert.equal(r.httpStatusCode,302);
r=await request('/app.php?page=index',null,guest);assert(!r.text.includes('Test watch card'));
for(const page of ['seeing-the-world-as-waves','understanding-before-formulas','ai-and-the-habit-of-questioning']){r=await request('/app.php?page='+page,null,guest);assert(r.text.includes('data-youtube='),page+' missing video');assert(!r.text.includes('<iframe'));}
r=await request('/app.php?page=gallery',null,guest);assert(r.text.includes('data-gallery-filter="London"'));assert(!r.text.includes('data-gallery-filter="KFUPM"'));assert(!r.text.includes('photo-portrait'));r=await request('/app.php?page=about',null,guest);assert(r.text.includes('kfupm-personal.jpg'));assert.equal((r.text.match(/class="campus-note"/g)||[]).length,1);assert(r.text.includes('about-welcome'));assert(!r.text.includes('class="about-family"'));assert(!r.text.includes('src="assets/images/laqman.png"'));r=await request('/app.php?page=for-my-dad-laqman',null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('family-cover'));assert(r.text.includes('assets/images/laqman.png'));r=await request('/app.php?page=personal',null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('For my dad, Laqman.'));
r=await request('/api/contact.php',{name:'Ahmad',email:'ahmad@example.test',message:'Hello from the integration test'},guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('Message received'));
r=await request('/api/contact.php',{name:'Ahmad',email:'invalid',message:'Hello'},guest);assert.equal(r.httpStatusCode,422);
r=await request('/api/subscribe.php',{email:'reader@example.test',consent:'1'},guest);assert.equal(r.httpStatusCode,200);
r=await request('/api/subscribe.php',{email:'reader2@example.test'},guest);assert.equal(r.httpStatusCode,422);
const subs=await dbValue('SELECT token FROM aa_subscribers');assert.equal(subs.length,1);
r=await request('/api/unsubscribe.php?token='+subs[0].token,null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('Leave the mailing list'));
r=await request('/api/unsubscribe.php',{token:subs[0].token},guest);assert(r.text.includes('Unsubscribed.'));
r=await request('/admin/index.php?section=pages',{csrf,action:'save_pages',hero_title:'A new headline',hero_intro:'My introduction',about_title:'My story',about_body:'## My interests\n\nI love reading.',work_body:'## My project\n\nBuilding carefully.'});assert.equal(r.httpStatusCode,302);
r=await request('/app.php?page=index',null,guest);assert(r.text.includes('A new headline'));
r=await request('/app.php?page=about',null,guest);assert(r.text.includes('My interests'));
r=await request('/admin/index.php?section=gallery',{csrf,action:'save_gallery',id:'',image:'assets/images/conversation-1600.webp',title:'Test illustration',alt:'An envelope',category:'Conversation',sort_order:'-1'});assert.equal(r.httpStatusCode,302);
r=await request('/app.php?page=gallery',null,guest);assert(r.text.includes('Test illustration'));
r=await request('/admin/index.php?section=media',{csrf,action:'upload',illustration:new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'],'bad.svg',{type:'image/svg+xml'})});assert(r.text.includes('Use PNG, JPEG, or WebP'));
const imageBytes=fs.readFileSync(source+'/assets/images/conversation-640.webp');
r=await request('/admin/index.php?section=media',{csrf,action:'upload',illustration:new File([imageBytes],'illustration.webp',{type:'image/webp'})});assert.equal(r.httpStatusCode,302,r.text);assert.equal(fs.readdirSync(root+'/public_html/assets/uploads').filter(f=>f.endsWith('.webp')).length,1);
r=await request('/admin/index.php?section=messages');assert(r.text.includes('Hello from the integration test'));
const messages=await dbValue('SELECT id FROM aa_messages');
r=await request('/admin/index.php?section=messages',{csrf,action:'read_message',id:String(messages[0].id)});assert.equal(r.httpStatusCode,302);assert.equal((await dbValue('SELECT is_read FROM aa_messages'))[0].is_read,1);
r=await request('/admin/index.php?section=subscribers',{csrf,action:'export'});assert(!r.text.includes('reader@example.test'),'unsubscribed exported');
r=await guest.request({url:'/api/contact.php',method:'POST',body:{name:'Bad',email:'bad@example.test',message:'Cross origin'},headers:{Origin:'https://another-site.test'}});assert.equal(r.httpStatusCode,403);
r=await request('/admin/index.php?section=account',{csrf,action:'password',current_password:'Test-password-1!',new_password:'New-test-password-2!',confirm_password:'New-test-password-2!'});assert.equal(r.httpStatusCode,302);
r=await request('/admin/index.php');assert.equal(r.httpStatusCode,200);
r=await request('/admin/logout.php',{csrf});assert.equal(r.httpStatusCode,302);
r=await request('/admin/index.php');assert.equal(r.httpStatusCode,302);
r=await request('/sitemap.php',null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('test-blog-note.html'));
console.log('PASS: PHP 8.3 integration checks: setup locking, login, admin authorization, all sections, CSRF rejection, draft privacy, publishing, XSS escaping, dynamic pages, contact validation, subscriber opt-in/unsubscribe, page/gallery edits, image validation/upload, password change, logout, video CRUD, safe inline media, gallery filters, and sitemap.');
// Append to the existing PHP 8.3 integration harness before php.exit().
r=await request('/admin/login.php');csrf=token(r);
r=await request('/admin/login.php',{csrf,email:'owner@example.test',password:'New-test-password-2!'});assert.equal(r.httpStatusCode,302);
r=await request('/admin/index.php');csrf=token(r);
assert.equal((await dbValue("SELECT * FROM aa_translations WHERE status='published'")).length,11);
for(const page of ['index','about','articles','gallery','contact','privacy','credits','science','technology','why-i-love-electrical-engineering-and-physics']){
 r=await request('/app.php?page='+page+'&lang=ar',null,guest);assert.equal(r.httpStatusCode,200,page);assert(r.text.includes('<html lang="ar" dir="rtl">'));assert.equal((r.text.match(/class="language-switch"/g)||[]).length,2);assert.equal((r.text.match(/<base /g)||[]).length,1);assert.equal((r.text.match(/<h1[ >]/g)||[]).length,1);assert(r.text.includes('hreflang="en"'));assert(r.text.includes('https://ahmadalabbas.com/ar/'));assert(r.text.includes('arabic.css?v='));assert.equal((r.text.match(/src="locale.js/g)||[]).length,1);
}
r=await request('/app.php?page=book-summaries&lang=ar',null,guest);assert(r.text.includes('مكتبة عربية مستقلة'));assert(!r.text.includes('Harry Potter'));
r=await request('/app.php?page=harry-potter-philosophers-stone&lang=ar',null,guest);assert.equal(r.httpStatusCode,404);
const englishGallery=(await request('/app.php?page=gallery',null,guest)).text;
const arabicGallery=(await request('/app.php?page=gallery&lang=ar',null,guest)).text;
const images=h=>[...h.matchAll(/class="gallery-item"[\s\S]*?<img[^>]*src="([^"]+)"/g)].map(m=>m[1]);
assert(images(englishGallery).length>=10);assert.deepEqual(images(englishGallery),images(arabicGallery));assert(arabicGallery.includes('لندن'));assert(arabicGallery.includes('ImageGallery'));
r=await request('/app.php?page=why-i-love-electrical-engineering-and-physics&lang=ar',null,guest);assert(r.text.includes('الكهربائية'));assert(r.text.includes('BlogPosting'));assert(r.text.includes('"inLanguage":"ar"'));assert(r.text.includes(JSON.parse(fs.readFileSync(source+'/backend/_cms/seed.json')).posts.find(p=>p.slug==='why-i-love-electrical-engineering-and-physics').image));
post.csrf=csrf;
const arabicBook={...post,id:'',type:'book',language:'ar',slug:'arabic-library-test',title:'كتاب في المكتبة العربية',status:'published',author:'كاتب عربي',intro:'مقدمة الكتاب',body:'## فكرة الكتاب\n\nملخص عربي أصلي',ending:'النهاية'};
r=await request('/admin/index.php?section=books&new=1',arabicBook);assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=book-summaries&lang=ar',null,guest);assert(r.text.includes(arabicBook.title));assert(!r.text.includes('Harry Potter'));
r=await request('/app.php?page=book-summaries',null,guest);assert(!r.text.includes(arabicBook.title));assert(r.text.includes('Harry Potter'));
r=await request('/app.php?page=arabic-library-test',null,guest);assert.equal(r.httpStatusCode,404);
r=await request('/app.php?page=arabic-library-test&lang=ar',null,guest);assert.equal(r.httpStatusCode,200);assert(!r.text.includes('<link rel="alternate" hreflang="en"'));
post.title_ar='مقال اختبار';post.subtitle_ar='نسخة عربية للمقال نفسه';post.intro_ar='مقدمة';post.body_ar='## عنوان\n\nنص عربي\n\n<script>alert(1)</script>';post.translation_status='published';
r=await request('/admin/index.php?section=articles&edit='+post.id,post);assert.equal(r.httpStatusCode,302,r.text);
r=await request('/app.php?page=test-blog-note&lang=ar',null,guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes(post.title_ar));assert(r.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
post.translation_status='draft';r=await request('/admin/index.php?section=articles&edit='+post.id,post);assert.equal(r.httpStatusCode,302);
r=await request('/app.php?page=test-blog-note&lang=ar',null,guest);assert.equal(r.httpStatusCode,404);
r=await request('/admin/preview.php?id='+post.id+'&lang=ar');assert(r.text.includes(post.title_ar));assert(r.headers['x-robots-tag']||r.text.includes('noindex'));
r=await request('/sitemap.php',null,guest);assert(r.text.includes('xmlns:image='));assert(r.text.includes('hreflang="ar"'));assert(r.text.includes('/ar/arabic-library-test.html'));assert(!r.text.includes('/ar/test-blog-note.html'));assert(!r.text.includes('/ar/harry-potter-philosophers-stone.html'));assert(r.text.includes('image:loc'));
r=await request('/api/contact.php',{name:'أحمد',email:'arabic@example.test',message:'رسالة من النسخة العربية',lang:'ar'},guest);assert(r.text.includes('وصلت رسالتك.'));
r=await request('/admin/index.php?section=seo');assert(r.text.includes('Search visibility'));
// Re-running migration must preserve published edits, messages, and language choices.
const before=await dbValue('SELECT count(*) AS n FROM aa_messages');
await php.run({code:`<?php $pdo=new PDO('sqlite:${root}/private/blog.sqlite');$pdo->exec("DELETE FROM aa_settings WHERE setting_key='bilingual_version'");`});
r=await request('/admin/index.php');assert.equal(r.httpStatusCode,200);
assert.deepEqual(await dbValue('SELECT count(*) AS n FROM aa_messages'),before);
assert.equal((await dbValue("SELECT language FROM aa_post_languages WHERE post_id=(SELECT id FROM aa_posts WHERE slug='arabic-library-test')"))[0].language,'ar');
console.log('PASS: bilingual RTL pages, single language switches, Arabic article publishing/drafts/escaping, independent Arabic books, shared gallery, localized contact, metadata/hreflang/image sitemap, authenticated migration and preservation of existing content.');


// Native form rendering and submission in both languages.
for(const language of ['en','ar']){
 const contact=await request('/app.php?page=contact&lang='+language,null,guest);
 assert(contact.text.replaceAll(String.fromCharCode(92)+'/', '/').includes('window.SITE_CONFIG={contactAction:"https://ahmadalabbas.com/api/contact.php"'));
 assert(!contact.text.includes('src="config.js"'));
 assert(/<form class="contact-form"[^>]*method="post"[^>]*action="api\/contact.php"/.test(contact.text));
 assert(!/<button class="contact-send"[^>]*disabled/.test(contact.text));
 const newsletter=await request('/app.php?page=index&lang='+language,null,guest);
 assert(/<form class="newsletter-form"[^>]*method="post"[^>]*action="api\/subscribe.php"/.test(newsletter.text));
 assert(!/<input[^>]*id="newsletter-email"[^>]*disabled/.test(newsletter.text));
 assert(newsletter.text.includes('name="consent"'));
 if(language==='ar')assert(contact.text.includes('name="lang" value="ar"')&&newsletter.text.includes('name="lang" value="ar"'));
 const signup=await request('/api/subscribe.php',{email:'form-'+language+'@example.test',consent:'1',lang:language},guest);
 assert.equal(signup.httpStatusCode,200);assert(signup.text.includes(language==='ar'?'أصبحت ضمن القائمة.':'You’re on the list.'));
}
const longName='أ'.repeat(80);
r=await request('/api/contact.php',{name:longName,email:'long-name@example.test',message:'رسالة لاختبار الاسم العربي الطويل',lang:'ar'},guest);assert.equal(r.httpStatusCode,200);assert(r.text.includes('وصلت رسالتك.'));
assert.equal((await dbValue("SELECT name FROM aa_messages WHERE email='long-name@example.test'"))[0].name,longName);
const arSubscriber=(await dbValue("SELECT token FROM aa_subscribers WHERE email='form-ar@example.test'"))[0];
r=await request('/api/unsubscribe.php?token='+arSubscriber.token+'&lang=ar',null,guest);assert(r.text.includes('هل تريد مغادرة القائمة البريدية؟'));assert(r.text.includes('name="lang" value="ar"'));
r=await request('/api/unsubscribe.php',{token:arSubscriber.token,lang:'ar'},guest);assert(r.text.includes('أُلغي الاشتراك.'));
r=await request('/admin/index.php?section=books&new=1&language=ar');assert(r.text.includes('value="ar" selected'));assert(r.text.includes('data-post-editor'));
r=await request('/admin/index.php?section=articles&new=1');assert(r.text.includes('name="title_ar"')&&r.text.includes('name="body_ar"'));assert(r.text.includes('dir="rtl"'));
console.log('PASS: native English/Arabic contact and newsletter forms, UTF-8 names, localized unsubscribe, actual stored records, working endpoint configuration, and Arabic dashboard editor actions.');

fs.writeFileSync(root+'/preview-book-ar.html',(await request('/admin/index.php?section=books&new=1&language=ar')).text);
fs.writeFileSync(root+'/preview-book-en.html',(await request('/admin/index.php?section=books&new=1')).text);
php.exit();
