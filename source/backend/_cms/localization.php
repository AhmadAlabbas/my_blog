<?php
// Language state comes from explicit URLs, never browser or IP detection.
function unicode_length(string $value):int{return preg_match_all('/./us',$value);}
function unicode_cut(string $value,int $length):string{preg_match_all('/./us',$value,$chars);return implode('',array_slice($chars[0],0,$length));}
function blog_language():string{return ($_GET['lang']??$_POST['lang']??'en')==='ar'?'ar':'en';}
function arabic_data():array{static $data;return $data??=json_decode(file_get_contents(__DIR__.'/arabic.json'),true,512,JSON_THROW_ON_ERROR);}
function bilingual_ready():bool{return setting('bilingual_version')==='1';}
function content_language(int $id):string{if(!bilingual_ready())return 'en';static $languages;$languages??=array_column(q('SELECT post_id,language FROM aa_post_languages')->fetchAll(),'language','post_id');return $languages[$id]??'en';}
function arabic_translation(int $id):array{if(!bilingual_ready())return [];static $translations;$translations??=array_column(q('SELECT * FROM aa_translations')->fetchAll(),null,'post_id');return $translations[$id]??[];}
function localize_post(array $p):?array{
    if($p['type']==='book')return content_language((int)$p['id'])===blog_language()?$p:null;
    if(blog_language()==='en')return $p;
    $t=arabic_translation((int)$p['id']);if(($t['status']??'')!=='published'||empty($t['title'])||empty($t['body']))return null;
    foreach(['title','subtitle','intro','body','ending'] as $field)$p[$field]=$t[$field]??'';
    $p['author']=setting('name_ar','أحمد العباس');return $p;
}
function local_setting(string $key,string $default=''):string{return blog_language()==='ar'?setting($key.'_ar',arabic_data()['settings'][$key.'_ar']??$default):setting($key,$default);}
function page_url(string $slug,string $lang='en',bool $absolute=false):string{
    $path=($lang==='ar'?'/ar/':'/').($slug==='index'?'':$slug.'.html');return $absolute?rtrim(config()['base_url'],'/').$path:$path;
}
function translated_ui(string $text):string{$clean=trim(html_entity_decode($text,ENT_QUOTES|ENT_HTML5,'UTF-8'));return arabic_data()['ui'][$clean]??$clean;}
function localize_html(string $html):string{
    // Protect code/JSON: translate rendered text and human-readable attributes only.
    $protected=[];$html=preg_replace_callback('~<(script|style)\b[^>]*>.*?</\1>~si',function($m)use(&$protected){$key='___PROTECTED_'.count($protected).'___';$protected[$key]=$m[0];return $key;},$html);
    $html=preg_replace_callback('~>([^<>]+)<~',function($m){$text=$m[1];$translation=translated_ui($text);if($translation===trim(html_entity_decode($text,ENT_QUOTES|ENT_HTML5,'UTF-8')))return $m[0];return '>'.h($translation).'<';},$html);
    $html=preg_replace_callback('~\b(alt|aria-label|placeholder|title|data-title|data-alt)="([^"]*)"~',fn($m)=>$m[1].'="'.h(translated_ui($m[2])).'"',$html);
    return strtr($html,$protected);
}
function migrate_bilingual():void{
    if(bilingual_ready())return;
    $mysql=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';$text=$mysql?'MEDIUMTEXT':'TEXT';$tail=$mysql?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':'';
    db()->exec('CREATE TABLE IF NOT EXISTS aa_translations(post_id INTEGER PRIMARY KEY,title VARCHAR(200) NOT NULL,subtitle TEXT NOT NULL,intro TEXT NOT NULL,body '.$text.' NOT NULL,ending TEXT NOT NULL,status VARCHAR(16) NOT NULL)'.$tail);
    db()->exec('CREATE TABLE IF NOT EXISTS aa_post_languages(post_id INTEGER PRIMARY KEY,language VARCHAR(2) NOT NULL,updated_at VARCHAR(30) NOT NULL)'.$tail);
    db()->exec('CREATE TABLE IF NOT EXISTS aa_gallery_translations(gallery_id INTEGER PRIMARY KEY,title VARCHAR(200) NOT NULL,alt VARCHAR(500) NOT NULL,category VARCHAR(80) NOT NULL)'.$tail);
    $data=arabic_data();$seed=json_decode(file_get_contents(__DIR__.'/seed.json'),true);$originals=array_column($seed['posts'],null,'slug');
    db()->beginTransaction();try{
        foreach(q('SELECT * FROM aa_posts')->fetchAll() as $p){
            if(!q('SELECT post_id FROM aa_post_languages WHERE post_id=?',[$p['id']])->fetch())q('INSERT INTO aa_post_languages(post_id,language,updated_at) VALUES(?,?,?)',[$p['id'],'en',$p['published_at'].'T00:00:00+00:00']);
            $t=$data['articles'][$p['slug']]??null;$same=isset($originals[$p['slug']])&&$p['body']===$originals[$p['slug']]['body']&&$p['title']===$originals[$p['slug']]['title'];
            if($t&&!q('SELECT post_id FROM aa_translations WHERE post_id=?',[$p['id']])->fetch())q('INSERT INTO aa_translations(post_id,title,subtitle,intro,body,ending,status) VALUES(?,?,?,?,?,?,?)',[$p['id'],$t['title'],$t['subtitle'],$t['intro'],$t['body'],'',$same?'published':'draft']);
        }
        foreach(q('SELECT * FROM aa_gallery')->fetchAll() as $g){$t=$data['gallery'][$g['image']]??null;if($t&&!q('SELECT gallery_id FROM aa_gallery_translations WHERE gallery_id=?',[$g['id']])->fetch())q('INSERT INTO aa_gallery_translations(gallery_id,title,alt,category) VALUES(?,?,?,?)',[$g['id'],$t['title'],$t['alt'],$t['category']]);}
        foreach($data['settings'] as $key=>$value)if(!q('SELECT setting_key FROM aa_settings WHERE setting_key=?',[$key])->fetch())save_setting($key,$value);
        save_setting('bilingual_version','1');db()->commit();
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function save_translation(int $id,array $input):void{
    $status=($input['translation_status']??'draft')==='published'?'published':'draft';
    $values=[];foreach(['title','subtitle','intro','body','ending'] as $field){$value=trim($input[$field.'_ar']??'');if(($field==='title'&&unicode_length($value)>200)||strlen($value)>($field==='body'?250000:20000))throw new RuntimeException('Arabic '.$field.' is too long.');$values[]=$value;}
    if($status==='published'&&($values[0]===''||$values[3]===''))throw new RuntimeException('A published Arabic article needs a title and body.');
    $values[]=$status;$exists=q('SELECT post_id FROM aa_translations WHERE post_id=?',[$id])->fetch();
    if($exists){$values[]=$id;q('UPDATE aa_translations SET title=?,subtitle=?,intro=?,body=?,ending=?,status=? WHERE post_id=?',$values);}else q('INSERT INTO aa_translations(post_id,title,subtitle,intro,body,ending,status) VALUES(?,?,?,?,?,?,?)',array_merge([$id],$values));
}
function save_post_language(int $id,string $language):void{
    $date=gmdate('Y-m-d\TH:i:s\Z');if(q('SELECT post_id FROM aa_post_languages WHERE post_id=?',[$id])->fetch())q('UPDATE aa_post_languages SET language=?,updated_at=? WHERE post_id=?',[$language,$date,$id]);else q('INSERT INTO aa_post_languages(post_id,language,updated_at) VALUES(?,?,?)',[$id,$language,$date]);
}
function localized_gallery_row(array $g):array{
    if(blog_language()!=='ar')return $g;
    $t=bilingual_ready()?q('SELECT * FROM aa_gallery_translations WHERE gallery_id=?',[$g['id']])->fetch():false;
    $t=$t?:arabic_data()['gallery'][$g['image']]??[];
    foreach(['title','alt','category'] as $key)$g[$key]=$t[$key]??translated_ui($g[$key]);return $g;
}
