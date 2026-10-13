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
