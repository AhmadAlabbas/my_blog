'use strict';
(() => {
  if (document.documentElement.lang !== 'ar') return;
  const dict = {...(window.ARABIC_UI || {}),'Pass it on.':'شارك الفكرة.','A good idea is worth sharing.':'الأفكار الجيدة تستحق المشاركة.','Page link':'رابط الصفحة','Close ✕':'إغلاق ✕','The link is selected. Press Ctrl+C, ⌘C, or long-press to copy.':'الرابط محدد. انسخه بالضغط على Ctrl+C أو ⌘C أو الضغط المطول.','Email':'البريد الإلكتروني','Pause scrolling':'أوقف التمرير','Resume scrolling':'استأنف التمرير','Pause':'إيقاف','Play':'تشغيل','Resume':'استئناف','Link copied.':'نُسخ الرابط.','Copied!':'تم النسخ!','Copy link':'انسخ الرابط','Share':'مشاركة','Cookie preferences':'تفضيلات ملفات الارتباط','Your privacy, your choice.':'خصوصيتك، وخيارك.','Reject':'رفض','Accept':'قبول','Privacy details':'تفاصيل الخصوصية','We remember your choice using essential storage. Optional cookies stay off unless you accept. YouTube videos load only after you accept and choose Play. No analytics or advertising scripts are installed by this blog.':'نحفظ اختيارك باستخدام تخزين ضروري. تبقى ملفات الارتباط الاختيارية معطلة ما لم تقبل. لا تحمل فيديوهات يوتيوب إلا بعد قبولك واختيار التشغيل. لا تستخدم المدونة برامج تحليل أو إعلانات.','Cookie preference saved: accepted.':'حُفظ الخيار: قبول.','Cookie preference saved: rejected.':'حُفظ الخيار: رفض.','No results found. Try a different word.':'لا توجد نتائج. جرب كلمة أخرى.','Read this note':'اقرأ المقال','Accept optional content and choose Play to watch here.':'اقبل المحتوى الاختياري واختر التشغيل للمشاهدة هنا.','Video unavailable. Watch on YouTube.':'الفيديو غير متاح. شاهده على يوتيوب.'};
  const translate = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const key = node.textContent.trim();
      if (dict[key]) node.textContent = dict[key];
      else if (/^\d+ photographs/.test(key)) node.textContent = key.replace('photographs','صور').replace('The complete collection','المجموعة الكاملة').replace('London','لندن');
      else if (/^\d+ books/.test(key)) node.textContent = key.replace('books','كتب').replace('The complete collection','المجموعة الكاملة');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|CANVAS|SVG|CODE|PRE)$/.test(node.tagName)) return;
    for (const attr of ['aria-label','placeholder','title','alt']) { const value=node.getAttribute(attr); if(value && dict[value])node.setAttribute(attr,dict[value]); }
    for (const child of [...node.childNodes]) translate(child);
  };
  dict['← → to explore · Esc to close']='استخدم الأسهم للتنقل وزر الهروب للإغلاق';
  dict['Email']='البريد الإلكتروني';
  translate(document.body);
  new MutationObserver(records => { for (const r of records) { if (r.type === 'characterData') translate(r.target); else if(r.type==='attributes') translate(r.target); else r.addedNodes.forEach(translate); } }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','alt']});
  document.querySelectorAll('.cookie-banner a[href="privacy.html"]').forEach(a => a.href = '/ar/privacy.html');
})();
