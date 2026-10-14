export const starterSlugs=['why-i-love-electrical-engineering-and-physics','reading-beyond-the-summary','build-something-small-and-useful'];
export const welcomeIntro={
  en:'Here you’ll find ideas from books, science, and engineering, and questions to explore while learning and building.',
  ar:'هنا أشارك أفكاراً من الكتب والعلوم والهندسة، وأسئلة أستكشفها أثناء التعلم والبناء.'
};

// Match Arabic with or without diacritics and common alef variants.
export function normalizeSearch(value){
  return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
}
export function searchPosts(posts,query='',topic='',categoryLabels={}){
  const terms=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return posts.filter(post=>(!topic||post.category===topic)&&terms.every(term=>normalizeSearch([post.title,post.subtitle,post.author,post.category,categoryLabels[post.category],post.intro,post.body].join(' ')).includes(term)));
}
export function featuredPosts(posts,selection=''){
  const articles=posts.filter(post=>post.type==='article');
  const slugs=String(selection).split(',').map(slug=>slug.trim()).filter(Boolean);
  const chosen=(slugs.length?slugs:starterSlugs).map(slug=>articles.find(post=>post.slug===slug)).filter(Boolean);
  return [...new Map([...chosen,...articles].map(post=>[post.id,post])).values()].slice(0,3);
}
export function readingMinutes(post,lang){
  const words=[post.intro,post.body,post.ending].join(' ').match(/[\p{L}\p{N}]+/gu)||[];
  return Math.max(1,Math.ceil(words.length/(lang==='ar'?180:220)));
}
export function relatedPosts(post,posts){
  const words=value=>new Set(normalizeSearch(value).match(/[\p{L}\p{N}]{4,}/gu)||[]);
  const terms=words(post.title+' '+post.subtitle);
  return posts.filter(other=>other.id!==post.id).map((other,index)=>({post:other,index,score:
    (other.category===post.category?6:0)+(other.type===post.type?2:0)+
    [...words(other.title+' '+other.subtitle)].filter(term=>terms.has(term)).length
  })).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3).map(item=>item.post);
}

