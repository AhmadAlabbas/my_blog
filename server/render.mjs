import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {load} from 'cheerio';

export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pageURL=(slug,lang='en')=>(lang==='ar'?'/ar/':'/')+(slug==='index'?'':slug+'.html');
export function markdown(text,picture,videos=[]){
  let result='',paragraph=[];
  const flush=()=>{if(paragraph.length){result+='<p>'+escape(paragraph.join(' '))+'</p>';paragraph=[];}};
  for(const line of String(text??'').split(/\r?\n/)){
    if(!line.trim()){flush();continue;}
    const image=line.match(/^!\[([^\]]*)\]\((assets\/[^)]+)\)$/);
    const video=line.match(/^\[youtube\]\((https:\/\/[^)]+)\)$/);
    if(image){flush();result+='<figure class="inline-figure">'+picture(image[2],image[1])+'<figcaption>'+escape(image[1])+'</figcaption></figure>';}
    else if(video&&youtubeID(video[1])){flush();const id=youtubeID(video[1]),details=videos.find(v=>v.id===id)||{},title=details.title||'Watch and explore';result+=`<section class="article-watch"><article class="video-card" data-youtube="${id}" data-video-title="${escape(title)}"><div class="video-stage">${details.image?picture(details.image,title):'<img src="/assets/video-posters/spUNpyF58BY.svg" alt="Video preview">'}<button type="button" data-video-play aria-label="Play ${escape(title)}">Play here</button></div><div class="video-copy"><h3>${escape(title)}</h3><p>${escape(details.description||'')}</p><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></div></article></section>`;}
    else if(line.startsWith('## ')){flush();result+='<h2>'+escape(line.slice(3))+'</h2>';}
    else if(line.startsWith('> ')){flush();result+='<blockquote>'+escape(line.slice(2))+'</blockquote>';}
    else paragraph.push(line);
  }
  flush();return result;
}
export function youtubeID(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';const id=u.hostname==='youtu.be'?u.pathname.slice(1):['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)&&u.pathname==='/watch'?u.searchParams.get('v'):'';return /^[A-Za-z0-9_-]{11}$/.test(id??'')?id:'';}catch{return '';}}
export async function viewData(db,lang,arabic){
  const settings=Object.fromEntries((await db.all('SELECT * FROM aa_settings')).map(s=>[s.setting_key,s.setting_value]));
  const translations=new Map((await db.all('SELECT * FROM aa_translations')).map(t=>[t.post_id,t]));
  const languages=new Map((await db.all('SELECT * FROM aa_post_languages')).map(t=>[t.post_id,t.language]));
  const all=await db.all('SELECT * FROM aa_posts ORDER BY published_at DESC,id DESC');
  const localize=(post,preview=false)=>{
    if(post.type==='book')return (languages.get(post.id)||'en')===lang?post:null;
    if(lang!=='ar')return post;
    const t=translations.get(post.id);if(!t||(!preview&&t.status!=='published'))return null;
    return {...post,...Object.fromEntries(['title','subtitle','intro','body','ending'].map(k=>[k,t[k]])),author:settings.name_ar||'أحمد العباس'};
  };
  const gt=new Map((await db.all('SELECT * FROM aa_gallery_translations')).map(g=>[g.gallery_id,g]));
  const gallery=(await db.all('SELECT * FROM aa_gallery ORDER BY sort_order,id')).map(g=>lang==='ar'?{...g,...(gt.get(g.id)||arabic.gallery[g.image]||{})}:g);
  return {settings,translations,languages,all,posts:all.filter(p=>p.status==='published').map(p=>localize(p)).filter(Boolean),gallery,localize};
}

export function renderer(config,arabic){
  const templates=path.join(config.dist,'templates');
  const read=(slug,lang)=>{
    const file=path.join(templates,lang==='ar'?'ar':'',slug+'.html');
    return fs.readFileSync(fs.existsSync(file)?file:path.join(templates,lang==='ar'?'ar':'','index.html'),'utf8');
  };
  const safeImage=filename=>/^assets\/(images|book-covers|uploads)\/[A-Za-z0-9_.-]+\.(webp|png|jpg|jpeg)$/.test(filename)&&fs.existsSync(filename.startsWith('assets/uploads/')?path.join(config.uploadDir,path.basename(filename)):path.join(config.dist,filename));
  const picture=(filename,alt)=>safeImage(filename)?`<img src="/${escape(filename)}" alt="${escape(alt)}" loading="lazy" decoding="async">`:'';
  const card=(p,lang)=>`<article class="card ${p.type==='book'?'book-summary-card':'museum-card'}" data-category="${escape(p.category)}" ${p.type==='book'?`data-book-group="${escape(p.category)}" data-bestseller="${bestsellers.has(p.slug)}"`:''}><a class="card-image" href="${pageURL(p.slug,lang)}">${picture(p.image,p.title)}</a><div class="card-content"><p class="eyebrow">${escape(p.type==='book'?p.author:p.category)}</p><h3><a href="${pageURL(p.slug,lang)}">${escape(p.title)}</a></h3><p class="summary">${escape(p.subtitle)}</p><p class="meta">${escape(p.published_at)}</p></div></article>`;
  const cards=(rows,lang,books=false)=>`<div class="card-grid ${books?'bookshelf-grid':''}">${rows.map(p=>card(p,lang)).join('')}</div>`;
  const emptyArabicBooks='<div class="arabic-books-empty"><h2>مكتبة عربية مستقلة</h2><p>ستظهر ملخصات الكتب العربية هنا عند إضافتها.</p></div>';
  const t=(text,lang)=>lang==='ar'?(arabic.ui[text]||text):text;
  const setting=(data,key,lang,fallback='')=>data.settings[key+(lang==='ar'?'_ar':'')]??(lang==='ar'?arabic.settings[key+'_ar']:undefined)??fallback;
  const mast=(title,description)=>`<section class="page-masthead"><div class="wrap"><h1>${escape(title)}</h1><p class="dek">${escape(description)}</p></div></section>`;
  const newsletter=(data,lang)=>`<section class="newsletter" id="newsletter"><div class="wrap newsletter-inner"><div><p class="eyebrow">${t('Stay updated',lang)}</p><h2>${t('A note, now and then.',lang)}</h2><p>${escape(setting(data,'newsletter_intro',lang))}</p></div><form class="newsletter-form" method="post" action="/api/subscribe"><input type="hidden" name="lang" value="${lang}"><label for="newsletter-email">${t('Email address',lang)}</label><div class="input-row"><input id="newsletter-email" name="email" type="email" autocomplete="email" placeholder="${t('Your email address',lang)}" required><button>${lang==='ar'?'اشترك':'Subscribe'}</button></div><label class="newsletter-consent"><input type="checkbox" name="consent" value="1" required>${lang==='ar'?'أرغب في تلقي تحديثات المدونة عبر البريد.':'I want occasional blog updates by email.'}</label><input class="form-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="form-note">${lang==='ar'?'يمكنك إلغاء الاشتراك باستخدام الرابط في التحديثات المقبلة.':'Your signup is saved privately. Unsubscribe using the link in future updates.'}</p></form></div></section>`;
  function finish($,slug,lang,title,description,data,post=null,status=200,preview=false){
    const name=setting(data,'name',lang,'Ahmad Alabbas');
    const canonical=config.publicURL+pageURL(slug,lang);
    $('html').attr({lang,dir:lang==='ar'?'rtl':'ltr'});
    $('head base').remove();$('head').prepend('<base href="/">');
    $('title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"],script[type="application/ld+json"]').remove();
    const image=config.publicURL+'/'+(safeImage(post?.image||'')?post.image:slug==='gallery'?'assets/images/london-green-1600.webp':slug==='about'?'assets/images/kfupm-personal.jpg':'assets/images/curiosity-1600.webp');
    const equivalent=post?(post.type==='book'?[data.languages.get(post.id)||'en']:data.translations.get(post.id)?.status==='published'?['en','ar']:['en']):['en','ar'];
    $('head').append(`<title>${escape(title)} — ${escape(name)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta name="robots" content="${preview||status===404?'noindex,nofollow':'index,follow,max-image-preview:large'}"><meta property="og:type" content="${post?'article':'website'}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(image)}">`);
    if(!preview&&status!==404)for(const language of equivalent)$('head').append(`<link rel="alternate" hreflang="${language}" href="${escape(config.publicURL+pageURL(slug,language))}">`);
    if(!preview&&equivalent.includes('en'))$('head').append(`<link rel="alternate" hreflang="x-default" href="${escape(config.publicURL+pageURL(slug,'en'))}">`);
    const opposite=lang==='ar'?'en':'ar';const switchSlug=post?.type==='book'?'book-summaries':equivalent.includes(opposite)?slug:'articles';
    $('.language-switch').attr({href:pageURL(switchSlug,opposite),lang:opposite,hreflang:opposite}).text(opposite==='ar'?'العربية':'English');
    $('.site-header .brand span').first().text(name.split(' ')[0]);$('.site-header .brand span').last().text(name.split(' ').slice(1).join(' '));$('.footer-top .brand').text(name);
    const configured=Object.entries(socialHosts).some(([key,hosts])=>validSocial(data.settings['social_'+key],hosts));
    $('.site-socials').each((_,el)=>{const box=$(el);box.empty();for(const [key,hosts] of Object.entries(socialHosts)){const url=data.settings['social_'+key]||'';const icon=fs.readFileSync(path.join(config.dist,'assets/social',key+'.svg'),'utf8');box.append(validSocial(url,hosts)?`<a href="${escape(url)}" aria-label="${key}" target="_blank" rel="noopener noreferrer">${icon}</a>`:`<span class="social-unconfigured" role="img" aria-label="${key}">${icon}</span>`);}});
    if(configured)$('.footer-socials small').text(lang==='ar'?'تابعني خارج دفتر الملاحظات.':'Find me beyond the notebook.');
    $('.search-results').html(data.posts.map(p=>`<a class="search-result" href="${pageURL(p.slug,lang)}" data-search="${escape((p.title+' '+p.category+' '+p.author).toLowerCase())}"><span>${escape(p.category)}</span>${escape(p.title)}</a>`).join(''));
    $('script[src^="config.js"]').remove();$('head').append(`<script>window.SITE_CONFIG=${JSON.stringify({contactAction:config.publicURL+'/api/contact',newsletterAction:config.publicURL+'/api/subscribe'}).replaceAll('<','\\u003c')}</script>`);
    $('script[src*="arabic-ui.js"]').attr('src','/arabic-ui.js');
    $('link[href*=".css"]').each((_,el)=>{const filename=$(el).attr('href').split('?')[0].replace(/^\//,'');const file=path.join(config.dist,filename);if(fs.existsSync(file))$(el).attr('href','/'+filename+'?v='+crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,10));});
    const person={'@type':'Person','@id':config.publicURL+'/#person',name:data.settings.name,url:config.publicURL+'/about.html'};
    const graph=[person,{'@type':'WebSite',url:config.publicURL+'/',name:data.settings.name,inLanguage:['en','ar']},{'@type':slug==='about'?'AboutPage':slug==='contact'?'ContactPage':'WebPage',url:canonical,name:title,inLanguage:lang}];
    if(post&&!preview){const entry={'@type':'BlogPosting',headline:post.title,description:post.subtitle,image:[image],datePublished:post.published_at,author:{'@id':person['@id']},inLanguage:lang,mainEntityOfPage:canonical};if(post.type==='book')entry.about={'@type':'Book',name:post.title,author:{'@type':'Person',name:post.author},...(post.isbn?{isbn:post.isbn}:{})};graph.push(entry);}
    if(slug==='gallery')graph.push({'@type':'ImageGallery',url:canonical,inLanguage:lang,image:data.gallery.map(g=>({'@type':'ImageObject',contentUrl:config.publicURL+'/'+g.image,name:g.title,description:g.alt}))});
    $('head').append('<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c')+'</script>');
    if(lang==='ar'){
      function translate(node){if(node.type==='text'){const text=node.data.trim();if(arabic.ui[text])node.data=node.data.replace(text,arabic.ui[text]);}else if(!['script','style'].includes(node.name))for(const child of node.children||[])translate(child);}
      translate($('body')[0]);
      $('body [aria-label],body [placeholder],body [title],body img').each((_,el)=>{for(const key of ['aria-label','placeholder','title','alt']){const value=$(el).attr(key);if(arabic.ui[value])$(el).attr(key,arabic.ui[value]);}});
    }
    return $.html();
  }
  function postMain(post,lang,data,preview=false){
    const book=post.type==='book';
    const heading=book?`<section class="book-heading wrap"><div class="book-portrait">${picture(post.image,post.title)}</div><header><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="dek">${escape(post.subtitle)}</p><p class="book-author">${escape(post.author)}</p><p class="meta">${escape(post.published_at)}</p></header></section>`:`<figure class="article-cover ${post.slug==='for-my-dad-laqman'?'family-cover':''}">${picture(post.image,post.title)}</figure><header class="article-heading wrap"><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="dek">${escape(post.subtitle)}</p><div class="byline">${escape(post.author)} · ${escape(post.published_at)}</div></header>`;
    return (preview?'<p class="draft-disclosure">Private preview</p>':'')+heading+`<div class="wrap"><div class="reading-layout"><article class="article-body"><p>${escape(post.intro)}</p>${markdown(post.body,picture,JSON.parse(data.settings.watch_videos||'[]'))}${book&&post.ending?`<details class="spoiler"><summary>${lang==='ar'?'نهاية القصة — حرق الأحداث':'Plot outcome · Ending spoilers'}</summary><p>${escape(post.ending)}</p></details>`:''}${post.source_url?`<p><a href="${escape(post.source_url)}" target="_blank" rel="noopener noreferrer">${t('Official book information ↗',lang)}</a></p>`:''}<div class="share-row"><button type="button" data-copy-link>${t('Copy link',lang)}</button><button type="button" data-native-share hidden>${t('Share',lang)}</button><span class="share-status" role="status"></span></div><p class="share-fallback" hidden><a href="${pageURL(post.slug,lang)}">${t('Copy URL',lang)}</a></p></article></div></div><section class="section wrap"><h2>${t('Keep exploring',lang)}</h2>${cards(data.posts.filter(p=>p.type===post.type&&p.id!==post.id).slice(0,3),lang,book)}</section>`+newsletter(data,lang);
  }
  function render(slug,lang,data,{preview=null,result=null,status=200}={}){
    let post=preview||data.posts.find(p=>p.slug===slug);
    let title='',description=setting(data,'tagline',lang),$=load(read(slug,lang));
    if(result){title=result.title;description=result.message;$=load(read('index',lang));$('main').html(mast(title,description));}
    else if(post){title=post.title;description=post.subtitle;$('main').html(postMain(post,lang,data,!!preview));}
    else if(slug==='index'){
      title=lang==='ar'?'كتب وأفكار وحياة يقودها الفضول':'Books, ideas, and a curious life';
      $('.personal-hero-copy h1').text(setting(data,'hero_title',lang));$('.personal-hero-copy .dek').text(setting(data,'hero_intro',lang));
      const articles=data.posts.filter(p=>p.type==='article');const featured=articles.find(p=>p.slug==='why-i-love-electrical-engineering-and-physics')||articles[0];
      if(featured){$('.featured-blocks > .card').replaceWith(card(featured,lang));$('.notebook-quote .text-link').attr('href',pageURL(featured.slug,lang));}else $('#featured').remove();
      $('#articles .card-grid').replaceWith(cards(articles.filter(p=>p.id!==featured?.id).slice(0,6),lang));
      const books=data.posts.filter(p=>p.type==='book');
      const carousel=`<div class="book-carousel" data-book-carousel><div class="book-carousel-toolbar"><p>${t('Every book, a different world.',lang)}</p><button type="button" data-book-carousel-toggle aria-pressed="false" hidden>${t('Pause scrolling',lang)}</button></div><div class="book-carousel-viewport" data-book-viewport tabindex="0"><div class="book-carousel-track"><div class="book-carousel-group">${books.map(p=>card(p,lang)).join('')}</div></div></div></div>`;
      $('#reading .book-carousel,#reading .arabic-books-empty').remove();$('#reading > .wrap').append(books.length?carousel:emptyArabicBooks);
      $('.gallery-grid.home-gallery').html(gallery(data.gallery.slice(0,3),lang));
      $('.about-wash h2').text(setting(data,'about_title',lang));$('.about-wash .lead').text(setting(data,'hero_intro',lang));
    }else if(['articles','notes','science','technology','business','travel','personal','books','book-summaries'].includes(slug)){
      const books=['books','book-summaries'].includes(slug);const category=['science','technology','business','travel','personal'].includes(slug)?slug[0].toUpperCase()+slug.slice(1):'';
      title=t(books?'Book summaries':category||'Articles',lang);
      const rows=data.posts.filter(p=>p.type===(books?'book':'article')&&(!category||p.category===category));
      let filters='';if(books)filters=`<div class="collection-toolbar"><p data-book-count>${rows.length} ${lang==='ar'?'كتب':'books'}</p><div class="filter-buttons"><button type="button" data-book-filter="All" aria-pressed="true">${lang==='ar'?'الكل':'All books'}</button><button type="button" data-book-filter="Bestsellers" aria-pressed="false">${t('NYT bestsellers',lang)}</button>${[...new Set(rows.map(p=>p.category))].map(c=>`<button type="button" data-book-filter="${escape(c)}">${escape(c)}</button>`).join('')}</div></div>`;
      $('main').html(mast(title,description)+`<section class="section wrap">${filters}${rows.length?cards(rows,lang,books):books&&lang==='ar'?emptyArabicBooks:`<p>${lang==='ar'?'ستظهر المقالات الجديدة هنا.':'New notes will appear here as they are published.'}</p>`}</section>`+newsletter(data,lang));
    }else if(slug==='gallery'){
      title=t('Gallery',lang);$('.gallery-grid').html(gallery(data.gallery,lang));$('.collection-toolbar').remove();$('.gallery-grid').before(`<div class="collection-toolbar"><p data-gallery-count aria-live="polite">${data.gallery.length} ${lang==='ar'?'صور':'photographs'}</p><div class="filter-buttons"><button type="button" data-gallery-filter="All" aria-pressed="true">${lang==='ar'?'الكل':'All'}</button>${[...new Set(data.gallery.map(g=>g.category))].filter(Boolean).map(category=>`<button type="button" data-gallery-filter="${escape(category)}" aria-pressed="false">${escape(category)}</button>`).join('')}</div></div>`);
    }else if(slug==='about'){
      title=t('About',lang);$('[data-about-title]').text(setting(data,'about_title',lang));$('[data-about-bio]').html(markdown(setting(data,'about_body',lang),picture));
    }else if(slug==='work'){
      title=t('Work',lang);$('main').html(mast(title,description)+'<section class="section wrap">'+markdown(setting(data,'work_body',lang),picture)+'</section>'+newsletter(data,lang));
    }else if(slug==='contact'){
      title=t('Contact',lang);
      const form=`<form class="contact-form" method="post" action="/api/contact"><input type="hidden" name="lang" value="${lang}"><div class="contact-fields"><div class="contact-field"><label for="contact-name">${t('Name',lang)}</label><input id="contact-name" name="name" autocomplete="name" maxlength="100" required></div><div class="contact-field"><label for="contact-email">${t('Email',lang)}</label><input id="contact-email" name="email" type="email" autocomplete="email" required></div></div><div class="contact-field"><label for="contact-message">${t('Message',lang)}</label><textarea id="contact-message" name="message" rows="6" maxlength="5000" required></textarea></div><input class="form-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="contact-form-bottom"><button class="contact-send">${lang==='ar'?'إرسال':'Send'}</button><p class="contact-status">${lang==='ar'?'تُحفظ رسالتك بخصوصية ليقرأها أحمد.':'Messages are saved privately for Ahmad to read.'}</p></div></form>`;
      if($('.contact-form').length)$('.contact-form').replaceWith(form);else $('.contact-layout > div').first().html(form);
    }else if(['privacy','credits'].includes(slug)){
      title=t(slug[0].toUpperCase()+slug.slice(1),lang);
      if(slug==='privacy'&&lang==='en')$('main').html('<div class="wrap"><article class="legal-page"><h1>Privacy, plainly.</h1><h2>Cookies and your choice</h2><p>An essential cookie remembers your Accept or Reject choice for 180 days. No analytics or advertising scripts are installed. YouTube players load only after Accept and an explicit Play action; playing a video contacts YouTube under its own privacy policy. Reject removes loaded players. You can change your choice using Cookie preferences in the footer.</p><h2>Admin access</h2><p>The private dashboard uses an essential HttpOnly session cookie for sign-in and protected forms. It is restricted to the admin area, uses secure cookies on HTTPS, and expires after 30 minutes of inactivity.</p><h2>Contact messages</h2><p>Contact stores your name, email, and message in this website’s database so Ahmad can read and respond. Only the authenticated dashboard can access messages. You may request deletion through Contact.</p><h2>Newsletter</h2><p>Signing up stores your email, opt-in time, status, and an unsubscribe token. You must explicitly choose to receive updates. Subscribers can be exported to a separate email provider; automatic campaigns and confirmation emails are not configured. Every update must include your unsubscribe link. You can request deletion through Contact.</p><h2>Hosting</h2><p>Hostinger hosts the deployed website and database and may retain standard server logs. Abuse protection stores keyed hashes derived from network addresses for up to 24 hours. External links follow their own privacy policies.</p></article></div>');
    }
    else{status=404;title=lang==='ar'?'الصفحة غير موجودة':'Page not found';$('main').html(mast(title,lang==='ar'?'هذه الصفحة غير متاحة.':'This page is unavailable.'));}
    if(!result&&!post){$('.newsletter').replaceWith(newsletter(data,lang));}
    if(slug!=='index')$('script[src="pixel-notes.js"],script[src="pixel-world.js"]').remove();
    return {status,html:finish($,slug,lang,title,description,data,post,status,!!preview)};
  }
  function gallery(rows,lang){return rows.map((g,i)=>`<figure class="gallery-item" data-category="${escape(g.category)}"><a class="gallery-open" href="/${escape(g.image)}" data-photo="${escape(path.basename(g.image).replace(/-(1600|640)\.webp$/,''))}" data-title="${escape(g.title)}" data-alt="${escape(g.alt)}">${picture(g.image,g.alt)}<span class="gallery-hover">${lang==='ar'?'عرض الصورة':'View image ↗'}</span></a><figcaption><small>${i+1} / ${escape(g.category)}</small><span>${escape(g.title)}</span><p>${lang==='ar'?'رحلة لندن — ديسمبر ٢٠٢٥':'London trip · December 2025'}</p></figcaption></figure>`).join('');}
  return {render,picture,safeImage};
}
export const socialHosts={youtube:['youtube.com','www.youtube.com'],linkedin:['linkedin.com','www.linkedin.com'],x:['x.com','www.x.com','twitter.com','www.twitter.com'],instagram:['instagram.com','www.instagram.com']};
export function validSocial(value,hosts){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&hosts.includes(url.hostname)&&(!url.port||url.port==='443');}catch{return false;}}
const bestsellers=new Set(['atomic-habits','educated','the-midnight-library','project-hail-mary','the-martian','lessons-in-chemistry','where-the-crawdads-sing','the-silent-patient','the-seven-husbands-of-evelyn-hugo','thinking-fast-and-slow','outlive','becoming','born-a-crime','shoe-dog','the-creative-act','the-anxious-generation','brief-answers-to-the-big-questions','dare-to-lead','digital-minimalism','factfulness']);
