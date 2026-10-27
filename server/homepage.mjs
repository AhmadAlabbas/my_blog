import {featuredPosts,welcomeIntro} from './editorial.mjs';

export function homepage({data,lang,escape:e,pageURL:url,picture,card,cards,gallery,newsletter,setting}){
  const ar=lang==='ar',say=(en,arabic)=>ar?arabic:en;
  const articles=data.posts.filter(post=>post.type==='article');
  const books=data.posts.filter(post=>post.type==='book');
  const selected=featuredPosts(data.posts,data.settings.featured_articles);
  const lead=selected[0];
  const art=(kind,poster,eager=false)=>`<div class="home-story-poster" aria-hidden="true">${picture(poster,'').replace('loading="lazy"',eager?'loading="eager" fetchpriority="high"':'loading="lazy"')}</div><canvas data-story-canvas="${kind}" width="1200" height="750" aria-hidden="true"></canvas>`;
  const link=(slug,label,style='home-story-link')=>`<a class="${style}" href="${url(slug,lang)}"><span>${e(label)}</span><span aria-hidden="true">${ar?'←':'↗'}</span></a>`;
  const quotes=(articles.length?articles:data.posts).slice(0,8);
  const quoteRow=(offset)=>{
    const items=quotes.slice(offset).concat(quotes.slice(0,offset)).slice(0,5);
    const pills=items.map(post=>`<span>${e(post.title)}</span>`).join('');
    return `<div class="home-quote-window" aria-hidden="true"><div class="home-quote-track"><div class="home-quote-group">${pills}</div><div class="home-quote-group">${pills}</div></div></div>`;
  };
  const carousel=books.length?`<div class="book-carousel" data-book-carousel><div class="book-carousel-toolbar"><p>${say('On the bookshelf','على رف الكتب')}</p><button type="button" data-book-carousel-toggle aria-pressed="false" hidden>${say('Pause scrolling','أوقف التمرير')}</button></div><div class="book-carousel-viewport" data-book-viewport tabindex="0" role="region" aria-label="${say('Book summaries','ملخصات الكتب')}"><div class="book-carousel-track"><div class="book-carousel-group">${books.map(post=>card(post,lang)).join('')}</div></div></div></div>`:`<div class="arabic-books-empty"><h2>مكتبة عربية مستقلة</h2><p>ستظهر ملخصات الكتب العربية هنا عند إضافتها.</p></div>`;
  return `<button class="home-motion-control" data-story-motion type="button" aria-pressed="false" hidden>${say('Pause motion','إيقاف الحركة')}</button>
    <section class="home-story-scene home-story-hero" aria-labelledby="home-title">
      ${art('studio','assets/images/studio-study-1600.webp',true)}
      <div class="home-scene-label"><span>01 / ${say('THE NOTEBOOK','دفتر الملاحظات')}</span><span>${say('Books · Science · A curious life','كتب · علوم · حياة فضولية')}</span></div>
      <div class="home-story-copy home-intro-copy">
        <p class="eyebrow">${e(setting(data,'name',lang,'Ahmad Alabbas'))} / ${say('A personal notebook','دفتر شخصي')}</p>
        <h1 id="home-title">${e(setting(data,'hero_title',lang)).replaceAll('\n','<br>')}</h1>
        <p class="home-story-dek">${e(setting(data,'hero_intro',lang))}</p>
        <p class="welcome-intro">${e(setting(data,'welcome_intro',lang,welcomeIntro[lang]))}</p>
        <div class="home-story-actions">${link('articles',say('Explore the notebook','اكتشف الدفتر'))}${link('about',say('Meet Ahmad','تعرّف إلى أحمد'),'home-quiet-link')}</div>
      </div>
      <a class="home-scroll-cue" href="#home-science">${say('A little further down','تابع الاستكشاف')} <span aria-hidden="true">↓</span></a>
    </section>
    <nav class="home-chapter-nav notebook-path-grid" aria-label="${say('Explore the notebook','استكشف الدفتر')}">
      <a href="${url('work',lang)}"><span>01</span> ${say('Projects & ideas','مشاريع وأفكار')} <span aria-hidden="true">${ar?'←':'↗'}</span></a>
      <a href="${url('book-summaries',lang)}"><span>02</span> ${say('Books & reading','كتب وقراءة')} <span aria-hidden="true">${ar?'←':'↗'}</span></a>
      <a href="${url('articles',lang)}?topic=Science"><span>03</span> ${say('Science & learning','علوم وتعلّم')} <span aria-hidden="true">${ar?'←':'↗'}</span></a>
    </nav>
    <section class="home-story-scene home-science-scene" id="home-science" aria-labelledby="home-science-title">
      ${art('signals',lead?.image||'assets/images/waves-1600.webp')}
      <div class="home-scene-label"><span>02 / ${say('FOLLOW THE CURIOSITY','اتبع فضولك')}</span><span>${say('A question becomes an idea','من سؤال إلى فكرة')}</span></div>
      <div class="home-story-copy">
        <p class="eyebrow">${say('An idea worth exploring','فكرة تستحق الاستكشاف')}</p>
        <h2 id="home-science-title">${e(lead?.title||say('There is wonder in the everyday.','في كل يوم ما يثير الدهشة.'))}</h2>
        <p class="home-story-dek">${e(lead?.subtitle||say('Explore the notebook, one question at a time.','استكشف الدفتر، سؤالاً بعد سؤال.'))}</p>
        ${link(lead?.slug||'articles',say('Read the story','اقرأ المقال'))}
      </div>
    </section>
    <section class="home-question-scene" aria-labelledby="home-questions-title">
      <div class="home-question-heading"><p class="eyebrow">${say('Between the pages','بين الصفحات')}</p><h2 id="home-questions-title">${say('Good questions<br>open new worlds.','الأسئلة الجيدة<br>تفتح آفاقاً جديدة.')}</h2><p>${say('A few ideas from this corner of the internet.','بعض الأفكار من هذه الزاوية من الإنترنت.')}</p>${link('search',say('Find your next idea','ابحث عن فكرتك التالية'),'home-quiet-link')}</div>
      <div class="home-question-ribbons">${quoteRow(0)}${quoteRow(2)}${quoteRow(4)}</div>
      <svg class="home-question-sun" aria-hidden="true" viewBox="0 0 200 200" fill="none"><g stroke="currentColor" stroke-width="16" stroke-linecap="round"><path d="M100 20v160M20 100h160M44 44l112 112M44 156L156 44"/></g></svg>
    </section>
    <section class="home-story-scene home-reading-scene" aria-labelledby="home-reading-title">
      ${art('reading','assets/images/reading-world-1600.webp')}
      <div class="home-scene-label"><span>03 / ${say('THE READING ROOM','غرفة القراءة')}</span><span>${say('Another page. Another perspective.','صفحة أخرى. منظور آخر.')}</span></div>
      <div class="home-story-copy">
        <p class="eyebrow">${say('Notes from the bookshelf','من رف الكتب')}</p>
        <h2 id="home-reading-title">${say('Every book,<br>a different world.','مع كل كتاب،<br>عالم مختلف.')}</h2>
        <p class="home-story-dek">${say('Stories to get lost in. Ideas to carry with you. A growing collection of reading notes and book summaries.','قصص تغوص فيها، وأفكار تحملها معك. هنا تنمو مجموعة من ملاحظات القراءة وملخصات الكتب.')}</p>
        ${link('book-summaries',say('Step into the library','ادخل المكتبة'))}
      </div>
    </section>
    <section class="home-reading-shelf" id="reading"><div class="wrap">${carousel}</div></section>
    ${selected.length?`<section class="section wrap home-selected" id="featured"><div class="section-head"><div><p class="eyebrow">${say('A place to begin','بداية الرحلة')}</p><h2>${say('Worth spending time with.','أفكار تستحق وقتك.')}</h2></div>${link('articles',say('All articles','جميع المقالات'),'home-quiet-link')}</div><div class="featured-grid">${selected.map(post=>card(post,lang)).join('')}</div></section>`:''}
    <section class="home-latest"><div class="section wrap" id="articles"><div class="section-head"><div><p class="eyebrow">${say('Fresh pages','صفحات جديدة')}</p><h2>${say('Lately, in the notebook.','جديد الدفتر.')}</h2></div>${link('articles',say(`Browse all ${articles.length} articles`,`تصفح ${articles.length} مقالاً`),'home-quiet-link')}</div>${cards(articles.slice(0,6),lang)}</div></section>
    <section class="section wrap home-photo-notes"><div class="section-head"><div><p class="eyebrow">${say('A different way of looking','طريقة أخرى للنظر')}</p><h2>${say('Things worth noticing.','أشياء تستحق التأمل.')}</h2></div>${link('gallery',say('Visit the gallery','زر المعرض'),'home-quiet-link')}</div><div class="gallery-grid home-gallery">${gallery(data.gallery.slice(0,3),lang)}</div></section>
    <section class="home-about"><div class="wrap"><p class="eyebrow">${say('Behind the notebook','خلف الدفتر')}</p><h2>${e(setting(data,'about_title',lang))}</h2><p>${e(setting(data,'hero_intro',lang))}</p>${link('about',say('A little more about me','المزيد عني'))}</div></section>
    ${newsletter(data,lang)}`;
}
