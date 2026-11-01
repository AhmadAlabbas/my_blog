import {featuredPosts,readingMinutes,welcomeIntro} from './editorial.mjs';

/**
 * Magazine homepage: editorial content is the hero, not decorative animation.
 * All stories, books, images and introductions use the existing bilingual CMS.
 */
export function magazineHome({data,lang,escape:e,pageURL:url,picture,gallery,newsletter,setting}){
  const ar=lang==='ar';
  const say=(en,arabic)=>ar?arabic:en;
  const arr=s=>Array.isArray(s)?s:[];
  const articles=arr(data.posts).filter(p=>p.type==='article');
  const books=arr(data.posts).filter(p=>p.type==='book');
  const selected=featuredPosts(data.posts,data.settings.featured_articles).filter(p=>p.type==='article');
  const lead=selected[0]||articles[0];
  const remaining=articles.filter(p=>p.slug!==lead?.slug);
  const secondary=[...selected.slice(1),...remaining].filter((p,i,a)=>p.slug!==lead?.slug&&a.findIndex(x=>x.slug===p.slug)===i);
  const highlights=secondary.slice(0,2);
  const latest=remaining.filter(p=>!highlights.some(q=>q.slug===p.slug)).slice(0,4);
  const shelf=books.slice(0,5);
  const images=arr(data.gallery).slice(0,3);
  const more=(target,label)=>`<a class="mag-more" href="${url(target,lang)}">${e(label)} <span aria-hidden="true">${ar?'←':'↗'}</span></a>`;
  const meta=(post)=>`<span>${e(say(post.category||'Ideas',post.category||'أفكار'))}</span> <span aria-hidden="true">·</span> <span>${readingMinutes(post,lang)} ${say('min read','دقائق قراءة')}</span>`;
  const card=(post,style='')=>`<article class="mag-card ${style}">
    <a href="${url(post.slug,lang)}" class="mag-card-image" aria-label="${e(post.title)}">${picture(post.image,post.title)}</a>
    <div class="mag-card-copy"><p class="mag-kicker">${e(post.category||say('From the notebook','من الدفتر'))}</p>
      <h3><a href="${url(post.slug,lang)}">${e(post.title)}</a></h3>
      <p class="mag-card-summary">${e(post.subtitle||'')}</p>
      <p class="mag-smallmeta">${meta(post)}</p>
    </div>
  </article>`;
  const bookCard=(post)=>`<article class="mag-book">
    <a class="mag-book-cover" href="${url(post.slug,lang)}" aria-label="${e(post.title)}">${picture(post.image,post.title)}</a>
    <div class="mag-book-copy"><p class="mag-kicker">${e(post.category||say('Book notes','ملخص كتاب'))}</p>
      <h3><a href="${url(post.slug,lang)}">${e(post.title)}</a></h3>
      <p>${e(post.author||'')}</p>
    </div>
  </article>`;
  const intro=setting(data,'hero_intro',lang)||welcomeIntro[lang];
  const welcome=setting(data,'welcome_intro',lang,welcomeIntro[lang]);
  const headline=setting(data,'hero_title',lang)||say('Stay curious. Keep creating.','ابقَ فضوليًا. واصل الإبداع.');
  const cleanHeadline=e(headline).replaceAll('\n','<br>');
  return `<div class="mag-front">
    <section class="mag-opening wrap" aria-labelledby="mag-home-title">
      <div class="mag-opening-title">
        <p class="mag-kicker mag-opening-kicker">${say('THE JOURNAL OF AHMAD ALABBAS','دفتر أحمد العباس')}</p>
        <h1 id="mag-home-title">${cleanHeadline}</h1>
      </div>
      <div class="mag-opening-note">
        <p>${e(intro)}</p>
        <p class="welcome-intro mag-welcome-note">${e(welcome)}</p>
        ${more('about',say('A little about me','تعرّف إليّ'))}
      </div>
    </section>

    ${lead?`<section class="mag-topstory wrap" id="featured" aria-labelledby="mag-feature-title">
      <a class="mag-topstory-visual" href="${url(lead.slug,lang)}" aria-label="${e(lead.title)}">${picture(lead.image,lead.title).replace('loading="lazy"','loading="eager" fetchpriority="high"')}</a>
      <div class="mag-topstory-copy">
        <p class="mag-kicker">${say('FEATURED STORY','قصة مختارة')} <span aria-hidden="true">/</span> ${e(lead.category||say('Ideas','أفكار'))}</p>
        <h2 id="mag-feature-title"><a href="${url(lead.slug,lang)}">${e(lead.title)}</a></h2>
        <p>${e(lead.subtitle||'')}</p>
        <p class="mag-smallmeta">${meta(lead)}</p>
        ${more(lead.slug,say('Read the story','اقرأ المقال'))}
      </div>
    </section>`:''}

    <nav class="mag-topicnav wrap" aria-label="${say('Explore topics','استكشف المواضيع')}">
      <span class="mag-kicker">${say('EXPLORE','استكشف')}</span>
      <a href="${url('science',lang)}">${say('Science & engineering','العلوم والهندسة')}</a>
      <a href="${url('technology',lang)}">${say('Technology','التقنية')}</a>
      <a href="${url('book-summaries',lang)}">${say('Books','الكتب')}</a>
      <a href="${url('travel',lang)}">${say('Places & perspectives','السفر والتجارب')}</a>
    </nav>

    ${highlights.length?`<section class="mag-section wrap mag-highlights" id="articles" aria-labelledby="mag-highlights-heading">
      <div class="mag-section-heading"><div><p class="mag-kicker">${say('RECOMMENDED READS','قراءات مقترحة')}</p><h2 id="mag-highlights-heading">${say('A few things on my mind.','أفكار تشغل بالي.')}</h2></div>${more('articles',say('All articles','جميع المقالات'))}</div>
      <div class="mag-highlights-grid">${highlights.map(post=>card(post)).join('')}</div>
    </section>`:''}

    <section class="mag-books-band" id="reading" aria-labelledby="mag-books-heading">
      <div class="wrap">
        <div class="mag-section-heading"><div><p class="mag-kicker">${say('THE BOOKSHELF','المكتبة')}</p><h2 id="mag-books-heading">${say('Books that make you think.','كتب تستحق التأمل.')}</h2><p class="mag-section-description">${say('Every book offers a new way to see the world. These are some of the ones I have spent time with.','كل كتاب يمنحنا طريقة مختلفة لرؤية العالم. هنا بعض الكتب التي قضيت معها وقتًا.')}</p></div>${more('book-summaries',say('Browse all books','تصفح جميع الكتب'))}</div>
        ${shelf.length?`<div class="mag-books-grid">${shelf.map(bookCard).join('')}</div>`:`<div class="mag-empty"><p>${say('A new shelf of Arabic reading notes is on its way.','ستظهر ملخصات الكتب العربية هنا عند إضافتها.')}</p>${more('articles',say('Explore articles instead','اقرأ المقالات'))}</div>`}
      </div>
    </section>

    ${latest.length?`<section class="mag-section wrap mag-latest" aria-labelledby="mag-latest-heading">
      <div class="mag-section-heading"><div><p class="mag-kicker">${say('FROM THE NOTEBOOK','من الدفتر')}</p><h2 id="mag-latest-heading">${say('More ideas to explore.','المزيد من الأفكار.')}</h2></div>${more('articles',say('The full archive','جميع المقالات'))}</div>
      <div class="mag-latest-grid">${latest.map(p=>card(p)).join('')}</div>
    </section>`:''}

    ${images.length?`<section class="mag-section wrap mag-travel" aria-labelledby="mag-travel-heading">
      <div class="mag-section-heading"><div><p class="mag-kicker">${say('THE VISUAL JOURNAL','المفكرة المصورة')}</p><h2 id="mag-travel-heading">${say('A different perspective.','من زاوية أخرى.')}</h2><p class="mag-section-description">${say('Places I have been, moments I noticed, and photographs worth keeping.','أماكن زرتها، ولحظات تأملتها، وصور أردت الاحتفاظ بها.')}</p></div>${more('gallery',say('View the gallery','معرض الصور'))}</div>
      <div class="gallery-grid mag-gallery-grid">${gallery(images,lang)}</div>
    </section>`:''}

    <section class="mag-outlook" aria-labelledby="mag-outlook-heading">
      <div class="wrap mag-outlook-grid">
        <div><p class="mag-kicker">${say('BEHIND THE JOURNAL','خلف الدفتر')}</p><h2 id="mag-outlook-heading">${e(setting(data,'about_title',lang)||say('Curiosity is a lifelong project.','الفضول رحلة لا تنتهي.'))}</h2></div>
        <div><p>${e(intro)}</p><div class="mag-outlook-links">${more('about',say('More about me','المزيد عني'))}${more('work',say('What I am building','مشاريعي'))}</div></div>
      </div>
    </section>
    ${newsletter(data,lang)}
  </div>`;
}