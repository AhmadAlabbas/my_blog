'use strict';
document.querySelectorAll('[data-confirm]').forEach(form => form.addEventListener('submit', event => {
  if (!window.confirm(form.dataset.confirm)) event.preventDefault();
}));

// The Arabic bookshelf editor uses Arabic text direction, without changing URL fields.
const bookLanguage=document.querySelector('[data-post-editor] select[name=language]');
if(bookLanguage){
 const align=()=>{const ar=bookLanguage.value==='ar';for(const name of ['title','subtitle','category','author','intro','body','ending']){const field=document.querySelector('[data-post-editor] [name="'+name+'"]');if(field){field.dir=ar?'rtl':'ltr';field.lang=ar?'ar':'en';}}};
 bookLanguage.addEventListener('change',align);align();
}
