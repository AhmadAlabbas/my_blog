<?php
function arabic_books_empty():string{return '<div class="arabic-books-empty"><p class="eyebrow">مكتبة عربية مستقلة</p><h2>لكل لغة رفها الخاص.</h2><p>ستظهر ملخصات الكتب العربية هنا عند إضافتها. هذه المكتبة مستقلة عن الكتب الإنجليزية، لتمنح كل قراءة مساحتها الخاصة.</p><a class="text-link" href="articles.html">اقرأ المقالات الآن ↗</a></div>';}
function absolute_asset(string $path):string{return rtrim(config()['base_url'],'/').'/'.ltrim($path,'/');}
function equivalent_languages(string $slug,?array $post):array{
    if($post){if($post['type']==='book')return [content_language((int)$post['id'])];$t=arabic_translation((int)$post['id']);return ($t['status']??'')==='published'?['en','ar']:['en'];}
    return http_response_code()===404?[]:(bilingual_ready()?['en','ar']:['en']);
}
function finish_localized_page(string $html,string $title,string $description,string $slug):string{
    $lang=blog_language();$ar=$lang==='ar';$post=$GLOBALS['seo_post']??null;
    $slug=['notes'=>'articles','books'=>'book-summaries','article'=>$post['slug']??'articles'][$slug]??$slug;
    if($ar){$title=$post?$title:translated_ui($title);$description=$post?$description:(arabic_data()['descriptions'][$slug]??local_setting('tagline','كتب وأفكار وحياة يقودها الفضول.'));}
    $name=local_setting('name','Ahmad Alabbas');$canonical=page_url($slug,$lang,true);$image=$post['image']??'assets/images/curiosity-1600.webp';
    if($slug==='gallery')$image='assets/images/london-green-1600.webp';
    if($slug==='about')$image='assets/images/kfupm-personal.jpg';
    $image=safe_image($image)?absolute_asset($image):absolute_asset('assets/images/curiosity-1600.webp');
    $html=preg_replace('~<title>.*?</title>|<meta\b[^>]*(?:name="(?:description|twitter:[^"]+|robots)"|property="og:[^"]+")[^>]*>|<link\b[^>]*(?:rel="canonical"|rel="alternate")[^>]*>|<script type="application/ld\+json">.*?</script>~si','',$html);
    $html=preg_replace('~<html[^>]*>~','<html lang="'.$lang.'" dir="'.($ar?'rtl':'ltr').'">',$html);
    $html=preg_replace_callback('~href="(styles|blocks|arabic)\.css(?:\?[^"]*)?"~',fn($m)=>'href="'.$m[1].'.css?v='.filemtime(dirname(__DIR__).'/'.$m[1].'.css').'"',$html);
    if(!str_contains($html,'href="arabic.css'))$html=str_replace('</head>','<link rel="stylesheet" href="arabic.css?v='.filemtime(dirname(__DIR__).'/arabic.css').'"></head>',$html);
    $html=preg_replace('~<div class="footer-language">.*?</div>~s','',$html);
    $html=preg_replace('~<a class="language-switch"[^>]*>.*?</a>~s','',$html);
    $html=preg_replace('~<script src="locale\.js[^"]*"[^>]*></script>~','',$html);
    $switchLang=$ar?'en':'ar';$equivalent=equivalent_languages($slug,$post);$switchSlug=$post&&$post['type']==='book'?'book-summaries':(in_array($switchLang,$equivalent,true)?$slug:'articles');
    $switch='<a class="language-switch" href="'.h(page_url($switchSlug,$switchLang)).'" lang="'.$switchLang.'" hreflang="'.$switchLang.'" aria-label="'.($ar?'Read in English':'اقرأ بالعربية').'">'.($ar?'English':'العربية').'</a>';
    $html=preg_replace('~(<button\b[^>]*class="nav-index")~',$switch.'$1',$html,1);
    $html=str_replace('<div class="footer-socials">','<div class="footer-language">'.$switch.'</div><div class="footer-socials">',$html);
    if($ar){
        $html=localize_html($html);
        $html=preg_replace_callback('~href="([a-z0-9-]+)\.html([^" ]*)"~',fn($m)=>'href="/ar/'.$m[1].'.html'.$m[2].'"',$html);
        $html=str_replace('<form class="contact-form"','<form class="contact-form"',$html);
        $html=preg_replace('~(<form[^>]*class="(?:contact-form|newsletter-form)"[^>]*>)~','$1<input type="hidden" name="lang" value="ar">',$html);
        $html=str_replace('Ahmad Alabbas',h($name),$html);
    }
    $meta='<title>'.h($title).' — '.h($name).'</title><meta name="description" content="'.h($description).'"><link rel="canonical" href="'.h($canonical).'">';
    foreach($equivalent as $l)$meta.='<link rel="alternate" hreflang="'.$l.'" href="'.h(page_url($slug,$l,true)).'">';
    if(in_array('en',$equivalent,true))$meta.='<link rel="alternate" hreflang="x-default" href="'.h(page_url($slug,'en',true)).'">';
    $meta.='<meta name="robots" content="'.(http_response_code()===404?'noindex,follow':'index,follow,max-image-preview:large').'"><meta property="og:type" content="'.($post?'article':'website').'"><meta property="og:title" content="'.h($title).'"><meta property="og:description" content="'.h($description).'"><meta property="og:url" content="'.h($canonical).'"><meta property="og:site_name" content="'.h($name).'"><meta property="og:locale" content="'.($ar?'ar_SA':'en_US').'"><meta property="og:image" content="'.h($image).'"><meta property="og:image:alt" content="'.h($title).'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'.h($title).'"><meta name="twitter:description" content="'.h($description).'"><meta name="twitter:image" content="'.h($image).'">';
    $personId=rtrim(config()['base_url'],'/').'/#person';$person=['@type'=>'Person','@id'=>$personId,'name'=>setting('name','Ahmad Alabbas'),'alternateName'=>setting('name_ar','أحمد العباس'),'url'=>page_url('about','en',true)];$sameAs=[];foreach(social_hosts() as $n=>$h)if(valid_social($n,setting('social_'.strtolower($n))))$sameAs[]=setting('social_'.strtolower($n));if($sameAs)$person['sameAs']=$sameAs;
    $graph=[$person,['@type'=>'WebSite','@id'=>rtrim(config()['base_url'],'/').'/#website','url'=>rtrim(config()['base_url'],'/').'/','name'=>setting('name','Ahmad Alabbas'),'inLanguage'=>['en','ar'],'publisher'=>['@id'=>$personId]],['@type'=>$slug==='about'?'AboutPage':($slug==='contact'?'ContactPage':'WebPage'),'@id'=>$canonical.'#page','url'=>$canonical,'name'=>$title,'description'=>$description,'inLanguage'=>$lang,'isPartOf'=>['@id'=>rtrim(config()['base_url'],'/').'/#website'],'primaryImageOfPage'=>['@type'=>'ImageObject','url'=>$image]]];
    if($post){$modified=$post['published_at'];if(bilingual_ready())$modified=q('SELECT updated_at FROM aa_post_languages WHERE post_id=?',[$post['id']])->fetchColumn()?:$modified;
        $node=['@type'=>'BlogPosting','headline'=>$post['title'],'description'=>$post['subtitle'],'image'=>[$image],'datePublished'=>$post['published_at'].'T00:00:00+00:00','dateModified'=>$modified,'author'=>['@id'=>$personId],'publisher'=>['@id'=>$personId],'mainEntityOfPage'=>['@id'=>$canonical.'#page'],'inLanguage'=>$lang];
        if($post['type']==='book'){$book=['@type'=>'Book','name'=>$post['title'],'author'=>['@type'=>'Person','name'=>$post['author']]];if($post['isbn'])$book['isbn']=$post['isbn'];$node['about']=$book;}
        $graph[]=$node;$meta.='<meta property="article:published_time" content="'.h($post['published_at']).'T00:00:00+00:00"><meta property="article:modified_time" content="'.h($modified).'">';
    }
    if($slug!=='index')$graph[]=['@type'=>'BreadcrumbList','itemListElement'=>[['@type'=>'ListItem','position'=>1,'name'=>$ar?'الرئيسية':'Home','item'=>page_url('index',$lang,true)],['@type'=>'ListItem','position'=>2,'name'=>$title,'item'=>$canonical]]];
    if($slug==='gallery'){$items=[];foreach(q('SELECT * FROM aa_gallery ORDER BY sort_order,id')->fetchAll() as $g){$g=localized_gallery_row($g);if(safe_image($g['image']))$items[]=['@type'=>'ImageObject','contentUrl'=>absolute_asset($g['image']),'name'=>$g['title'],'description'=>$g['alt'],'creator'=>['@id'=>$personId],'inLanguage'=>$lang];}$graph[]=['@type'=>'ImageGallery','url'=>$canonical,'name'=>$title,'image'=>$items,'inLanguage'=>$lang];}
    $meta.='<script type="application/ld+json">'.json_encode(['@context'=>'https://schema.org','@graph'=>$graph],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).'</script>';
    $html=str_replace('</head>',$meta.'</head>',$html);
    return str_replace('</body>',($ar?'<script src="arabic-ui.js?v=3" defer></script>':'').'<script src="locale.js?v=3" defer></script></body>',$html);
}
