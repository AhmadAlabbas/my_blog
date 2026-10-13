<?php
require __DIR__.'/_cms/bootstrap.php';
header('Content-Type: application/xml; charset=utf-8');header('Cache-Control: no-cache');
echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
$base=rtrim(config()['base_url'],'/');$pages=['index','book-summaries','articles','gallery','about','contact','work','science','technology','business','travel','personal','privacy','credits'];
function sitemap_entry(string $slug,string $lang,array $langs,array $images=[],string $modified=''):void{
    echo '<url><loc>'.h(page_url($slug,$lang,true)).'</loc>';if($modified)echo '<lastmod>'.h($modified).'</lastmod>';
    foreach($langs as $l)echo '<xhtml:link rel="alternate" hreflang="'.$l.'" href="'.h(page_url($slug,$l,true)).'"/>';
    if(in_array('en',$langs,true))echo '<xhtml:link rel="alternate" hreflang="x-default" href="'.h(page_url($slug,'en',true)).'"/>';
    foreach(array_unique($images) as $image)if(safe_image($image))echo '<image:image><image:loc>'.h(absolute_asset($image)).'</image:loc></image:image>';echo '</url>';
}
$gallery=array_column(q('SELECT image FROM aa_gallery ORDER BY sort_order,id')->fetchAll(),'image');
foreach($pages as $slug)foreach(['en','ar'] as $lang){if($lang==='ar'&&!bilingual_ready())continue;$images=$slug==='gallery'?$gallery:($slug==='index'?['assets/images/curiosity-1600.webp']:($slug==='about'?['assets/images/kfupm-personal.jpg']:[]));sitemap_entry($slug,$lang,bilingual_ready()?['en','ar']:['en'],$images);}
foreach(array_merge(raw_public_posts('article'),raw_public_posts('book')) as $p){$langs=equivalent_languages($p['slug'],$p);$modified=$p['published_at'];if(bilingual_ready())$modified=q('SELECT updated_at FROM aa_post_languages WHERE post_id=?',[$p['id']])->fetchColumn()?:$modified;$images=[$p['image']];preg_match_all('~!\[[^\]]*\]\((assets/[^)]+)\)~',$p['body'],$matches);$images=array_merge($images,$matches[1]);foreach($langs as $lang)sitemap_entry($p['slug'],$lang,$langs,$images,$modified);}
echo '</urlset>';
