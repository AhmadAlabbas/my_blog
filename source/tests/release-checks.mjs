
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
