/* Data-driven editorial modules for the bilingual homepage. */
export function heroIndex({selected,articles,lang,escape:e,pageURL:url}) {
  const ar=lang==='ar';
  const lead=selected[0]||articles[0];
  const next=selected.find(post=>post.slug!==lead?.slug)||articles.find(post=>post.slug!==lead?.slug);
  const entries=[
    lead&&{label:'01',title:lead.title,href:url(lead.slug,lang)},
    next&&{label:'02',title:next.title,href:url(next.slug,lang)},
    {label:'03',title:ar?'اكتشف رف الكتب':'Explore the bookshelf',href:url('book-summaries',lang)}
  ].filter(Boolean);
  return `<aside class="home-hero-index" aria-label="${ar?'دليل القراءة':'What to read next'}">
    <p class="index-kicker">${ar?'ابدأ القراءة':'START READING'}</p>
    ${entries.map(item=>`<a href="${e(item.href)}"><span class="index-number">${item.label}</span><span>${e(item.title)}</span><span class="index-arrow" aria-hidden="true">${ar?'←':'↗'}</span></a>`).join('')}
  </aside>`;
}

export function editorsDesk({selected,articles,books,lang,escape:e,pageURL:url,picture}) {
  const ar=lang==='ar';
  const spotlight=selected[0]||articles[0];
  const primary=articles.find(post=>post.category==='Science'&&post.slug!==spotlight?.slug)
    ||articles.find(post=>post.slug!==spotlight?.slug)||spotlight;
  if(!primary)return '';
  const secondary=articles.find(post=>post.slug!==primary.slug&&post.slug!==spotlight?.slug&&post.category!=='Personal')
    ||articles.find(post=>post.slug!==primary.slug);
  const book=books[0];
  const arrow=ar?'←':'↗';
  return `<section class="home-editorial-desk wrap" id="home-edition" aria-labelledby="home-edition-title">
    <div class="home-desk-intro"><div>
      <p class="eyebrow">${ar?'مختارات من الدفتر / مقالات وكتب':'FROM THE NOTEBOOK / THE READING EDITION'}</p>
      <h2 id="home-edition-title">${ar?'لكل فكرة حكاية تستحق القراءة.':'A good idea deserves a closer look.'}</h2>
    </div><p>${ar?'كتب وعلوم وتجارب شخصية. اختر موضوعًا يثير فضولك وابدأ القراءة.':'Books, science and personal perspectives. Follow a question, discover a story, and stay curious.'}</p></div>
    <div class="home-desk-layout">
      <article class="home-desk-lead">
        <a class="home-desk-lead-visual" href="${e(url(primary.slug,lang))}" aria-label="${e(primary.title)}">${picture(primary.image,primary.title)}</a>
        <p class="home-desk-category">${e(primary.category||'Science')} / ${ar?'قراءة مختارة':'FEATURE STORY'}</p>
        <h3><a href="${e(url(primary.slug,lang))}">${e(primary.title)}</a></h3>
        <p class="home-desk-summary">${e(primary.subtitle||'')}</p>
        <a class="home-desk-read" href="${e(url(primary.slug,lang))}">${ar?'اقرأ المقال':'Read the story'} <span aria-hidden="true">${arrow}</span></a>
      </article>
      <aside class="home-desk-aside" aria-label="${ar?'مقترحات للقراءة':'More to explore'}">
        <p class="home-desk-aside-heading">${ar?'على قائمة القراءة':'ON THE READING LIST'}</p>
        ${secondary?`<a class="home-desk-aside-story" href="${e(url(secondary.slug,lang))}"><span>${ar?'من المقالات':'ANOTHER PERSPECTIVE'}</span><strong>${e(secondary.title)}</strong></a>`:''}
        <a class="home-desk-aside-story" href="${e(url('articles',lang))}"><span>${ar?'المزيد من الأفكار':'EXPLORE THE ARCHIVE'}</span><strong>${ar?'جميع المقالات':'Read every article'}</strong></a>
        ${book?`<div class="home-desk-book"><p class="eyebrow">${ar?'على رف الكتب':'ON THE BOOKSHELF'}</p>
          <a href="${e(url(book.slug,lang))}">${picture(book.image,book.title)}<span><strong>${e(book.title)}</strong><small>${ar?'اكتشف ملخص الكتاب':'Discover the reading notes'} ${arrow}</small></span></a>
        </div>`:''}
        <a class="home-desk-read" style="margin-top:26px" href="${e(url('book-summaries',lang))}">${ar?'كل الكتب':'Explore all books'} <span aria-hidden="true">${arrow}</span></a>
      </aside>
    </div>
  </section>`;
}
