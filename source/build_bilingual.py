"""Bilingual static preview and search metadata. The PHP deployment uses the same content."""
from pathlib import Path
import json,re,hashlib
from html import escape
from bs4 import BeautifulSoup, NavigableString
from bs4.formatter import HTMLFormatter
class OrderedFormatter(HTMLFormatter):
 def attributes(self,tag):return list(tag.attrs.items())
from xml.etree import ElementTree as ET
from bilingual_content import UI, ARTICLES, SETTINGS, GALLERY
ROOT=Path(__file__).resolve().parent; OUT=ROOT/'public';BASE='https://ahmadalabbas.com'
seed=json.loads((ROOT/'backend/_cms/seed.json').read_text());posts={p['slug']:p for p in seed['posts']};gallery=seed['gallery'];books={p['slug'] for p in seed['posts'] if p['type']=='book'}
UI.update(json.loads((ROOT/'backend/_cms/arabic.json').read_text())['ui'])
AR_BOOKS='<div class="arabic-books-empty"><p class="eyebrow">مكتبة عربية مستقلة</p><h2>لكل لغة رفها الخاص.</h2><p>ستظهر ملخصات الكتب العربية هنا عند إضافتها. هذه المكتبة مستقلة عن الكتب الإنجليزية، لتمنح كل قراءة مساحتها الخاصة.</p><a class="text-link" href="/ar/articles.html">اقرأ المقالات الآن ↗</a></div>'
PRIVACY='''<div class="wrap"><article class="legal-page"><p class="eyebrow">خصوصيتك</p><h1>الخصوصية بوضوح.</h1><h2>ملفات الارتباط وخيارك</h2><p>يحفظ الموقع اختيار القبول أو الرفض لمدة 180 يومًا باستخدام ملف ضروري. لا توجد برامج تحليل أو إعلانات. لا تحمل مشغلات يوتيوب إلا بعد قبول المحتوى الاختياري واختيار التشغيل. يمكنك تغيير اختيارك من التذييل. تخضع المشاهدة على يوتيوب لسياسة الخدمة نفسها.</p><h2>رسائل التواصل</h2><p>يحفظ نموذج التواصل الاسم والبريد والرسالة في قاعدة الموقع ليقرأها أحمد من لوحة التحكم المحمية. يمكنك طلب حذف رسالتك عبر التواصل.</p><h2>النشرة البريدية</h2><p>يحفظ الاشتراك البريد ووقت الموافقة وحالة الاشتراك ورمز إلغاء الاشتراك. إرسال الحملات خدمة منفصلة، ويجب أن تشمل كل رسالة رابط إلغاء الاشتراك.</p><h2>لوحة التحكم والاستضافة</h2><p>تستخدم لوحة التحكم ملف جلسة ضروريًا وآمنًا على اتصال آمن مشفر. قد تحتفظ الاستضافة بسجلات الخادم المعتادة. يخزن منع الإساءة بصمات مشفرة مشتقة من عناوين الشبكة لمدة تصل إلى 24 ساعة. لا يعرض الموقع بيانات التواصل للزوار.</p></article></div>'''
CREDITS='''<div class="wrap"><article class="legal-page"><p class="eyebrow">شكر وتقدير</p><h1>الصور والخطوط.</h1><h2>الصور والرسوم</h2><p>قدم أحمد الصور الشخصية وصور لندن والجامعة. أُنشئت الرسوم التحريرية لهذه المدونة، وهي توضيحات للأفكار وليست توثيقًا لأحداث شخصية. أزيل رمز الاستجابة السريعة من بطاقة الزائر للعرض.</p><h2>الخطوط</h2><p>تستخدم النسخة الإنجليزية سورس سيريف ودي إم سانس. تستخدم النسخة العربية آي بي إم بلكس سانس العربية، وهو الخط الحر الذي لاحظناه في موقع ثمانية. الخطوط مستضافة محليًا بترخيص رخصة الخطوط المفتوحة، وملفات الترخيص مضمنة في المصدر.</p><h2>أغلفة الكتب والفيديوهات</h2><p>تعرف الأغلفة بالطبعات المعروضة، وتبقى حقوقها للناشرين والرسامين. تحفظ بيانات المصادر والأرقام الدولية للكتب ضمن ملفات الموقع. الملخصات مكتوبة بصياغة أصلية. الفيديوهات من قناة ثري بلو ون براون وتبقى على يوتيوب، ولا تحمل المشغلات إلا بعد الموافقة والتشغيل.</p><h2>التصميم</h2><p>أُنشئ التصميم والكود لأحمد العباس. يستلهم الإيقاع التحريري من غيتس نوتس وثمانية، من دون نسخ الأكواد أو الشعارات أو الأصول الخاصة بهما. أيقونات المنصات من بوتستراب بترخيص إم آي تي. الرسوم المتحركة أصلية أو مبنية على المرجع الذي قدمه أحمد، وتحترم تفضيل تقليل الحركة.</p></article></div>'''
def canon(slug,lang):return BASE+('/ar/' if lang=='ar' else '/')+('' if slug=='index' else slug+'.html')
def append_fragment(target,fragment):
 for node in list(BeautifulSoup(fragment,'html.parser').contents):target.append(node)
def title_for(slug,lang,old):
 if slug in ARTICLES and lang=='ar':return ARTICLES[slug][0]
 return UI.get(old,old) if lang=='ar' else old

def decorate(html,slug,lang):
 soup=BeautifulSoup(html,'html.parser');head=soup.head;soup.html['lang']=lang;soup.html['dir']='rtl' if lang=='ar' else 'ltr'
 oldDescription=soup.find('meta',attrs={'name':'description'});oldDescription=oldDescription.get('content','') if oldDescription else ''
 old=soup.title.get_text().split(' — ')[0];post=posts.get(slug);canonicalSlug={'notes':'articles','books':'book-summaries','article':'why-i-love-electrical-engineering-and-physics'}.get(slug,slug)
 for node in list(head.select('title,meta[name="description"],meta[name^="twitter:"],meta[property^="og:"],meta[name="robots"],link[rel="canonical"],link[rel="alternate"],script[type="application/ld+json"]')):node.decompose()
 title=title_for(canonicalSlug,lang,old);description=(ARTICLES[canonicalSlug][1] if lang=='ar' and canonicalSlug in ARTICLES else post['subtitle'] if post else json.loads((ROOT/'backend/_cms/arabic.json').read_text())['descriptions'].get(canonicalSlug,SETTINGS['tagline_ar']) if lang=='ar' else oldDescription or seed['settings']['tagline'])
 if not head.find('base'):head.insert(0,soup.new_tag('base',href='/'))
 for css in ['styles','blocks','arabic']:
  node=head.find('link',href=re.compile(r'^'+css+r'\.css'))
  href=css+'.css?v='+hashlib.sha256((ROOT/(css+'.css')).read_bytes()).hexdigest()[:10]
  if node:node['href']=href
  else:head.append(soup.new_tag('link',rel='stylesheet',href=href))
 switchSlug='book-summaries' if slug in books else canonicalSlug
 switchLang='en' if lang=='ar' else 'ar';switch=f'<a class="language-switch" lang="{switchLang}" hreflang="{switchLang}" href="'+('/ar/' if switchLang=='ar' else '/')+('' if switchSlug=='index' else switchSlug+'.html')+'">'+('English' if lang=='ar' else 'العربية')+'</a>'
 search=soup.select_one('.nav-index')
 if search:search.insert_before(BeautifulSoup(switch,'html.parser'))
 footer=soup.select_one('.footer-socials')
 if footer:footer.insert_before(BeautifulSoup('<div class="footer-language">'+switch+'</div>','html.parser'))
 if lang=='ar':
  # Arabic books are independent, so remove every English bookshelf entry.
  if slug in ['books','book-summaries']:
   main=soup.select_one('#main');main.clear();append_fragment(main,'<section class="page-masthead"><div class="wrap"><p class="eyebrow">دفتر قارئ</p><h1>ملخصات الكتب</h1><p class="dek">مكتبة عربية مستقلة، وأفكار تستحق الاحتفاظ بها.</p></div></section><section class="section wrap">'+AR_BOOKS+'</section>')
  if slug=='index':
   for node in soup.select('.book-carousel'):node.replace_with(BeautifulSoup(AR_BOOKS,'html.parser'))
  if slug=='privacy':soup.select_one('#main').clear();append_fragment(soup.select_one('#main'),PRIVACY)
  if slug=='credits':soup.select_one('#main').clear();append_fragment(soup.select_one('#main'),CREDITS)
  for link in list(soup.find_all('a',href=True)):
   if link['href'].split('#')[0].removesuffix('.html') in books:
    card=link.find_parent('article',class_='card');(card or link).decompose()
  for node in list(soup.find_all(string=True)):
   if node.parent.name in ['script','style','svg','path']:continue
   value=str(node).strip()
   if value in UI:node.replace_with(NavigableString(str(node).replace(value,UI[value])))
   elif re.match(r'^\d+ / London$',value):node.replace_with(value.replace('London','لندن'))
   elif 'photographs' in value and len(value)<100:node.replace_with(value.replace('photographs','صور').replace('London','لندن').replace('December','ديسمبر'))
  for node in soup.find_all(True):
   for attr in ['alt','aria-label','placeholder','title','data-title','data-alt']:
    if node.get(attr) in UI:node[attr]=UI[node[attr]]
   href=node.get('href','')
   if re.fullmatch(r'[a-z0-9-]+\.html(?:#.*)?',href):node['href']='/ar/'+href
  # All gallery image assets are shared, including the exact original descriptions.
  for g,(gt,ga) in zip(gallery,GALLERY):
   for image in soup.find_all('img',src=g['image']):image['alt']=ga
  for node in soup.select('.reading-feature-copy p'):
   if len(node.get_text())>30:node.string='الأفكار التي آخذها من الكتب، والأسئلة التي تتركها، وكيف تشكل تفكيري.'
  for node in soup.select('.home-books'):node.replace_with(BeautifulSoup(AR_BOOKS,'html.parser'))
  for node in soup.select('.byline .author-monogram'):node.string='أع'
 # Add metadata and truthful structured data (no fake ratings or traffic).
 url=canon(canonicalSlug,lang);image=(post['image'] if post and post['image'] else 'assets/images/curiosity-1600.webp')
 if slug=='gallery':image=gallery[0]['image']
 if slug=='about':image='assets/images/kfupm-personal.jpg'
 def meta(**attrs):head.append(soup.new_tag('meta',attrs=attrs))
 t=soup.new_tag('title');t.string=title+' — '+('أحمد العباس' if lang=='ar' else 'Ahmad Alabbas');head.append(t)
 meta(name='description',content=description);meta(name='robots',content='noindex,follow' if slug in ['404','admin-preview'] else 'index,follow,max-image-preview:large')
 head.append(soup.new_tag('link',rel='canonical',href=url))
 languages=['en'] if slug in books else ['en','ar']
 if slug not in ['404','admin-preview']:
  for code in languages:head.append(soup.new_tag('link',rel='alternate',hreflang=code,href=canon(canonicalSlug,code)))
  head.append(soup.new_tag('link',rel='alternate',hreflang='x-default',href=canon(canonicalSlug,'en')))
 for key,value in {'type':'article' if post else 'website','title':title,'description':description,'url':url,'image':BASE+'/'+image,'image:alt':title,'locale':'ar_SA' if lang=='ar' else 'en_US','site_name':'أحمد العباس' if lang=='ar' else 'Ahmad Alabbas'}.items():meta(property='og:'+key,content=value)
 for key,value in {'card':'summary_large_image','title':title,'description':description,'image':BASE+'/'+image}.items():meta(name='twitter:'+key,content=value)
 person={'@type':'Person','@id':BASE+'/#person','name':'Ahmad Alabbas','alternateName':'أحمد العباس','url':BASE+'/about.html'}
 graph=[person,{'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'Ahmad Alabbas','inLanguage':['en','ar'],'publisher':{'@id':BASE+'/#person'}},{'@type':'AboutPage' if slug=='about' else 'ContactPage' if slug=='contact' else 'WebPage','@id':url+'#page','url':url,'name':title,'description':description,'inLanguage':lang,'isPartOf':{'@id':BASE+'/#website'}}]
 if post:
  article={'@type':'BlogPosting','headline':title,'description':description,'image':[BASE+'/'+image],'inLanguage':lang,'datePublished':post['published_at']+'T00:00:00+00:00','author':{'@id':BASE+'/#person'},'mainEntityOfPage':{'@id':url+'#page'}}
  if post['type']=='book':article['about']={'@type':'Book','name':post['title'],'author':{'@type':'Person','name':post['author']},'isbn':post['isbn']}
  graph.append(article)
 if slug=='gallery':graph.append({'@type':'ImageGallery','name':title,'url':url,'image':[{'@type':'ImageObject','contentUrl':BASE+'/'+g['image'],'name':GALLERY[i][0] if lang=='ar' else g['title'],'description':GALLERY[i][1] if lang=='ar' else g['alt'],'creator':{'@id':BASE+'/#person'}} for i,g in enumerate(gallery)]})
 if canonicalSlug!='index':graph.append({'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'الرئيسية' if lang=='ar' else 'Home','item':canon('index',lang)},{'@type':'ListItem','position':2,'name':title,'item':url}]})
 script=soup.new_tag('script',type='application/ld+json');script.string=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c');head.append(script)
 if lang=='ar':soup.body.append(soup.new_tag('script',src='arabic-ui.js?v=3',defer=''))
 soup.body.append(soup.new_tag('script',src='locale.js?v=3',defer=''))
 return soup.decode(formatter=OrderedFormatter())
(OUT/'arabic-ui.js').write_text('window.ARABIC_UI='+json.dumps(UI,ensure_ascii=False).replace('<','\\u003c')+';')
(OUT/'ar').mkdir(exist_ok=True)
original={p.stem:p.read_text() for p in OUT.glob('*.html')}
for slug,html in original.items():
 if slug!='admin-preview':(OUT/(slug+'.html')).write_text(decorate(html,slug,'en'))
 if slug not in books and slug!='admin-preview':(OUT/'ar'/(slug+'.html')).write_text(decorate(html,slug,'ar'))
# Shared CSS/JS use one root, and /ar/ serves index.html on static hosts.
xmlns='http://www.sitemaps.org/schemas/sitemap/0.9';imns='http://www.google.com/schemas/sitemap-image/1.1';xns='http://www.w3.org/1999/xhtml'
ET.register_namespace('',xmlns);ET.register_namespace('image',imns);ET.register_namespace('xhtml',xns);root=ET.Element('{'+xmlns+'}urlset')
for slug in original:
 if slug in ['404','admin-preview','article','books','notes']:continue
 for lang in (['en'] if slug in books else ['en','ar']):
  item=ET.SubElement(root,'{'+xmlns+'}url');ET.SubElement(item,'{'+xmlns+'}loc').text=canon(slug,lang)
  for code in (['en'] if slug in books else ['en','ar']):ET.SubElement(item,'{'+xns+'}link',rel='alternate',hreflang=code,href=canon(slug,code))
  images=[g['image'] for g in gallery] if slug=='gallery' else [posts[slug]['image']] if slug in posts else ['assets/images/curiosity-1600.webp'] if slug=='index' else ['assets/images/kfupm-personal.jpg'] if slug=='about' else []
  if slug in posts:
   images+=re.findall(r'!\[[^\]]*\]\((assets/[^)]+)\)',posts[slug]['body'])
   ET.SubElement(item,'{'+xmlns+'}lastmod').text=posts[slug]['published_at']
  for image in dict.fromkeys(images):
   if image:entry=ET.SubElement(item,'{'+imns+'}image');ET.SubElement(entry,'{'+imns+'}loc').text=BASE+'/'+image
ET.ElementTree(root).write(OUT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
(OUT/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /admin-preview.html\nDisallow: /_cms/\nDisallow: /api/\nDisallow: /private/\nSitemap: '+BASE+'/sitemap.xml\n')
print('Bilingual preview ready:',len(original),'English pages,',len(list((OUT/'ar').glob('*.html'))),'Arabic pages')
