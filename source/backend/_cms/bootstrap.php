<?php
declare(strict_types=1);
ini_set('display_errors','0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');
function h(mixed $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function config(): array {
    static $c;
    if ($c !== null) return $c;
    $path = dirname(__DIR__, 2) . '/private/blog-config.php';
    if (!is_file($path)) { http_response_code(503); exit('Blog backend awaits setup. Follow HOSTINGER-SETUP.md and create the private configuration file.'); }
    $c = require $path;
    if (!is_array($c) || empty($c['dsn']) || empty($c['base_url']) || empty($c['app_key']) || strlen($c['app_key']) < 32 || str_contains($c['app_key'],'REPLACE_')) { http_response_code(503); exit('Complete the private database, base URL, and application key settings.'); }
    return $c;
}
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $c=config();
    try { $pdo=new PDO($c['dsn'], $c['db_user'] ?? '', $c['db_password'] ?? '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]); }
    catch (Throwable $e) { error_log('Blog database connection failed.'); http_response_code(503); exit('The blog database is unavailable. Check your private database settings.'); }
    return $pdo;
}
function q(string $sql, array $args=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($args); return $s; }
function installed(): bool { try { return (bool)q('SELECT id FROM aa_admins LIMIT 1')->fetch(); } catch (Throwable $e) { return false; } }
function session_begin(): void {
    if (session_status()===PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1');
    $sessionPath=dirname(__DIR__,2).'/private/sessions';
    if(!is_dir($sessionPath) && !mkdir($sessionPath,0700,true)){http_response_code(503);exit('The private session folder is not writable. Check hosting permissions.');}
    session_save_path($sessionPath);
    session_name('aa_admin');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/admin','secure'=>str_starts_with(config()['base_url'],'https://'),'httponly'=>true,'samesite'=>'Strict']);
    if(!session_start()){http_response_code(503);exit('Sign-in storage is unavailable. Check private folder permissions.');} header('Cache-Control: no-store, private');
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}
function csrf(): string { session_begin(); return '<input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'">'; }
function verify_csrf(): void { session_begin(); if (!hash_equals($_SESSION['csrf'],(string)($_POST['csrf']??''))) { http_response_code(403); exit('This form expired. Reload the page and try again.'); } }
function admin(): array {
    session_begin();
    if (empty($_SESSION['admin_id']) || time()-($_SESSION['last_seen']??0)>1800) { unset($_SESSION['admin_id']); header('Location: /admin/login.php'); exit; }
    $u=q('SELECT * FROM aa_admins WHERE id=?',[$_SESSION['admin_id']])->fetch();
    if (!$u || $u['password_hash']!==($_SESSION['password_version']??'')) { session_destroy(); header('Location: /admin/login.php'); exit; }
    $_SESSION['last_seen']=time(); return $u;
}
function rate_allowed(string $action, int $limit, int $seconds): bool {
    $key=hash_hmac('sha256', $action.'|'.($_SERVER['REMOTE_ADDR']??'local'), config()['app_key']);
    q('DELETE FROM aa_limits WHERE created_at < ?',[time()-86400]);
    if ((int)q('SELECT COUNT(*) FROM aa_limits WHERE bucket=? AND created_at>?',[$key,time()-$seconds])->fetchColumn()>=$limit) return false;
    q('INSERT INTO aa_limits(bucket,created_at) VALUES(?,?)',[$key,time()]); return true;
}
function settings(): array { static $s; if ($s!==null) return $s; $s=[]; foreach(q('SELECT setting_key,setting_value FROM aa_settings')->fetchAll() as $row) $s[$row['setting_key']]=$row['setting_value']; return $s; }
function setting(string $key, string $default=''): string { return settings()[$key]??$default; }
function save_setting(string $key,string $value): void { if (q('SELECT setting_key FROM aa_settings WHERE setting_key=?',[$key])->fetch()) q('UPDATE aa_settings SET setting_value=? WHERE setting_key=?',[$value,$key]); else q('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',[$key,$value]); }
function safe_image(string $path): bool { return preg_match('~^assets/(images|book-covers|uploads)/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg)$~D',$path)===1 && is_file(dirname(__DIR__).'/'.$path); }
function picture(string $path,string $alt='',bool $eager=false,string $display_sizes=''): string {
    if(!safe_image($path))return '';
    $size=getimagesize(dirname(__DIR__).'/'.$path);
    $dimensions=$size?' width="'.$size[0].'" height="'.$size[1].'"':'';
    $small=str_replace('-1600.webp','-640.webp',$path);$responsive='';
    if($small!==$path && safe_image($small) && $size){$sm=getimagesize(dirname(__DIR__).'/'.$small);$responsive=' srcset="'.h($small).' '.$sm[0].'w, '.h($path).' '.$size[0].'w" sizes="'.($display_sizes?:($eager?'(max-width: 700px) 100vw, 80vw':'(max-width: 700px) calc(100vw - 40px), 30vw')).'"';}
    return '<img src="'.h($path).'"'.$dimensions.$responsive.' alt="'.h($alt).'" loading="'.($eager?'eager':'lazy').'" decoding="async"'.($eager?' fetchpriority="high"':'').'>';
}
function youtube_id(string $url): string {
    $u=parse_url($url); if(!$u||($u['scheme']??'')!=='https')return '';
    $host=strtolower($u['host']??'');$id='';
    if(in_array($host,['www.youtube.com','youtube.com','m.youtube.com'],true)&&($u['path']??'')==='/watch'){parse_str($u['query']??'',$params);$id=$params['v']??'';}
    elseif($host==='youtu.be')$id=trim($u['path']??'','/');
    return is_string($id)&&preg_match('/^[A-Za-z0-9_-]{11}$/D',$id)?$id:'';
}
function watch_videos(): array {
    $items=json_decode(setting('watch_videos','[]'),true); if(!is_array($items))return [];
    return array_values(array_filter($items,fn($v)=>is_array($v)&&preg_match('/^[A-Za-z0-9_-]{11}$/D',$v['id']??'')));
}
function video_card(array $v,bool $inline=false): string {
    if(!preg_match('/^[A-Za-z0-9_-]{11}$/D',$v['id']??''))return '';
    $title=$v['title']??'Watch and explore';$id=$v['id'];$target='https://www.youtube.com/watch?v='.$id;
    $file=dirname(__DIR__).'/assets/video-posters/'.$id.'.svg';
    $poster=is_file($file)?file_get_contents($file):(safe_image($v['image']??'')?picture($v['image'],$title):file_get_contents(dirname(__DIR__).'/assets/video-posters/spUNpyF58BY.svg'));
    $stage=$inline?'<div class="video-stage">'.$poster.'<button type="button" data-video-play aria-label="Play '.h($title).'"><span aria-hidden="true">▶</span>Play here</button></div>':'<a class="video-stage" href="'.h($target).'" target="_blank" rel="noopener noreferrer" aria-label="Watch '.h($title).' on YouTube">'.$poster.'</a>';
    return '<article class="video-card '.($inline?'':'watch-exhibit').'"'.($inline?' data-youtube="'.h($id).'" data-video-title="'.h($title).'"':'').'>'.$stage.'<div class="video-copy"><p class="eyebrow">Watch / '.h($v['creator']??'YouTube').'</p><h3>'.h($title).'</h3><p>'.h($v['description']??'').'</p><a class="text-link" href="'.h($target).'" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>'.($inline?'<p class="video-status" role="status">Accept optional content and choose Play to watch here.</p>':'').'</div></article>';
}
function watch_section(): string {
    $videos=watch_videos();if(!$videos)return '';
    return '<section class="section wrap watch-section" id="watch"><div class="section-head"><div><p class="eyebrow">A different way to learn</p><h2>Ideas in motion.</h2></div><a class="text-link" href="articles.html">Keep exploring</a></div><div class="video-grid">'.implode('',array_map('video_card',$videos)).'</div></section>';
}
function gallery_filters(): string {
    $rows=q('SELECT category FROM aa_gallery ORDER BY sort_order,id')->fetchAll();if(blog_language()==='ar')$rows=array_map(fn($r)=>['category'=>translated_ui($r['category'])],$rows);$cats=array_unique(array_column($rows,'category'));$out='<div class="collection-toolbar"><p data-gallery-count aria-live="polite">'.count($rows).' photographs · The complete collection</p><div class="filter-buttons" aria-label="Filter gallery">';
    foreach(array_merge(['All'],array_values(array_filter($cats,fn($c)=>$c!==''&&$c!=='All'))) as $c)$out.='<button type="button" data-gallery-filter="'.h($c).'" aria-pressed="'.($c==='All'?'true':'false').'">'.h($c).'</button>';
    return $out.'</div></div>';
}
function markdown(string $text): string {
    $out=''; $paragraph=[];
    $flush=function()use(&$out,&$paragraph){ if($paragraph){$out.='<p>'.h(implode(' ',$paragraph)).'</p>'; $paragraph=[];} };
    foreach(preg_split('/\R/',$text) as $line){
        if(trim($line)===''){$flush();continue;}
        if(preg_match('~^!\[([^\]]*)\]\((assets/[^)]+)\)$~D',$line,$m)&&safe_image($m[2])){$flush();$out.='<figure class="inline-figure">'.picture($m[2],$m[1]).'<figcaption>'.h($m[1]).'</figcaption></figure>';}
        elseif(preg_match('~^\[youtube\]\((https://[^)]+)\)$~D',$line,$m)&&($id=youtube_id($m[1]))){$flush();$v=['id'=>$id,'title'=>'Watch and explore','creator'=>'YouTube','image'=>'assets/images/waves-1600.webp'];foreach(watch_videos() as $item)if($item['id']===$id){$v=$item;break;}$out.='<section class="article-watch" aria-label="Watch and explore">'.video_card($v,true).'</section>';}
        elseif(str_starts_with($line,'## ')){$flush();$out.='<h2>'.h(substr($line,3)).'</h2>';}
        elseif(str_starts_with($line,'> ')){$flush();$out.='<blockquote>'.h(substr($line,2)).'</blockquote>';}
        else $paragraph[]=$line;
    } $flush();return $out;
}
function raw_public_posts(string $type, string $category=''): array {
    return $category?q('SELECT * FROM aa_posts WHERE type=? AND status=? AND category=? ORDER BY published_at DESC,id DESC',[$type,'published',$category])->fetchAll():q('SELECT * FROM aa_posts WHERE type=? AND status=? ORDER BY published_at DESC,id DESC',[$type,'published'])->fetchAll();
}
function social_hosts(): array {return ['YouTube'=>['youtube.com','www.youtube.com'],'LinkedIn'=>['linkedin.com','www.linkedin.com'],'X'=>['x.com','www.x.com','twitter.com','www.twitter.com'],'Instagram'=>['instagram.com','www.instagram.com']];}
function valid_social(string $name,string $url): bool {
    $u=parse_url($url);return strlen($url)<=500&&$u&&($u['scheme']??'')==='https'&&in_array(strtolower($u['host']??''),social_hosts()[$name]??[],true)&&!isset($u['user'])&&!isset($u['pass'])&&(!isset($u['port'])||$u['port']===443);
}
function social_links(): string {
    $out='<div class="site-socials" aria-label="Social profiles">';
    foreach(social_hosts() as $name=>$hosts){$key=strtolower($name);$url=setting('social_'.$key,'');$svg=file_get_contents(dirname(__DIR__).'/assets/social/'.$key.'.svg');
        $out.=valid_social($name,$url)?'<a href="'.h($url).'" aria-label="Ahmad on '.h($name).'" title="'.h($name).'" target="_blank" rel="noopener noreferrer">'.$svg.'</a>':'<span class="social-unconfigured" role="img" aria-label="'.h($name).' profile link coming soon" title="'.h($name).' · Profile link coming soon">'.$svg.'</span>';
    }return $out.'</div>';
}
function living_art(string $kind): string {
    $page=['drawing'=>'index','waves'=>'science','orbit'=>'technology','mobile'=>'about'][$kind]??'';
    if(!$page)return ''; $html=file_get_contents(dirname(__DIR__).'/'.$page.'.html');
    preg_match('~<figure class="living-art[^>]*data-artwork="'.preg_quote($kind,'~').'".*?</figure>~s',$html,$m);return $m[0]??'';
}
function page_shell(string $title,string $description,string $main,string $slug='index'): string {
    $base=dirname(__DIR__); $html=file_get_contents($base.'/index.html');
    $html=preg_replace_callback('~<title>.*?</title>~s',fn()=>'<title>'.h($title).' — '.h(setting('name','Ahmad Alabbas')).'</title>',$html);
    $html=preg_replace_callback('~<meta name="description"[^>]*>~',fn()=>'<meta name="description" content="'.h($description).'">',$html);
    $canonical=rtrim(config()['base_url'],'/').'/'.($slug==='index'?'':$slug.'.html');
    $html=preg_replace_callback('~<link rel="canonical"[^>]*>~',fn()=>'<link rel="canonical" href="'.h($canonical).'">',$html);
    $html=preg_replace('~<meta property="og:(title|description|url)"[^>]*>~','',$html);
    $html=preg_replace_callback('~<main id="main">.*?</main>~s',fn()=>'<main id="main">'.$main.'</main>',$html);
    $html=preg_replace_callback('~<div class="site-socials".*?</div>~s',fn()=>social_links(),$html);
    $configured=false;foreach(social_hosts() as $name=>$hosts)if(valid_social($name,setting('social_'.strtolower($name),'')))$configured=true;
    if($configured)$html=str_replace('Find me beyond the notebook. Profile links coming soon.','Find me beyond the notebook.',$html);
    $html=str_replace(' aria-current="page"','',$html);
    $html=str_replace('href="'.$slug.'.html"','href="'.$slug.'.html" aria-current="page"',$html);
    $search='';foreach(array_merge(public_posts('article'),public_posts('book')) as $p) $search.='<a class="search-result" href="'.h($p['slug']).'.html" data-search="'.h(strtolower($p['title'].' '.$p['category'].' '.$p['author'])).'"><span>'.h($p['category']).'</span>'.h($p['title']).'</a>';
    $html=preg_replace_callback('~<div class="search-results">.*?</div>~s',fn()=>'<div class="search-results">'.$search.'</div>',$html);
    if($slug!=='index')$html=str_replace(['<script src="pixel-notes.js" defer></script>','<script src="pixel-world.js" defer></script>'],'',$html);
    $html=preg_replace('~<base\b[^>]*>~','',$html);
    $html=str_replace('<head>','<head><base href="/">',$html);
    $html=str_replace('</head>','<meta property="og:title" content="'.h($title).'"><meta property="og:description" content="'.h($description).'"><meta property="og:url" content="'.h($canonical).'"></head>',$html);
    $html=preg_replace_callback('~(<a class="brand" href="index.html" aria-label=")[^"]*(">).*?</a>~s',fn()=>'<a class="brand" href="index.html" aria-label="'.h(setting('name','Ahmad Alabbas')).' home"><span>'.h(explode(' ',setting('name','Ahmad Alabbas'),2)[0]).'</span><span>'.h(explode(' ',setting('name','Ahmad Alabbas'),2)[1]??'').'</span></a>',$html);
    $clientConfig='<script>window.SITE_CONFIG={contactAction:'.json_encode(rtrim(config()['base_url'],'/').'/api/contact.php').',newsletterAction:'.json_encode(rtrim(config()['base_url'],'/').'/api/subscribe.php').'}</script>';
    $html=preg_replace_callback('~<script\b[^>]*src="config\.js"[^>]*></script>~',fn()=>$clientConfig,$html);
    $html=str_replace('Ahmad Alabbas</a>',h(setting('name','Ahmad Alabbas')).'</a>',$html);
    return finish_localized_page($html,$title,$description,$slug);
}
function form_result(string $title,string $message,int $code=200): never { if(blog_language()==='ar'){$title=translated_ui($title);$message=translated_ui($message);} http_response_code($code); echo page_shell($title,$message,'<section class="section wrap" style="padding-top:150px"><p class="eyebrow">Your blog</p><h1>'.h($title).'</h1><p>'.h($message).'</p><a class="text-link" href="index.html">Return home</a></section>'); exit; }
function require_public_post(): void {
    if ($_SERVER['REQUEST_METHOD']!=='POST') { http_response_code(405); header('Allow: POST'); exit('POST required.'); }
    $origin=$_SERVER['HTTP_ORIGIN']??'';
    if($origin && rtrim($origin,'/')!==rtrim(config()['base_url'],'/')){http_response_code(403);exit('Invalid request origin.');}
    if(!empty($_POST['website']))form_result('Thank you','Your request was received.');
}
function create_schema(): void {
    $mysql=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';
    $text=$mysql?'MEDIUMTEXT':'TEXT';
    $id=$mysql?'INTEGER PRIMARY KEY AUTO_INCREMENT':'INTEGER PRIMARY KEY AUTOINCREMENT';
    $schemas=[
    "aa_admins(id $id,email VARCHAR(254) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL)",
    "aa_posts(id $id,type VARCHAR(16) NOT NULL,slug VARCHAR(140) NOT NULL UNIQUE,title VARCHAR(200) NOT NULL,subtitle TEXT NOT NULL,category VARCHAR(80) NOT NULL,author VARCHAR(150) NOT NULL,image VARCHAR(255) NOT NULL,intro TEXT NOT NULL,body $text NOT NULL,ending TEXT NOT NULL,source_url VARCHAR(500) NOT NULL,isbn VARCHAR(32) NOT NULL,status VARCHAR(16) NOT NULL,published_at VARCHAR(10) NOT NULL)",
    "aa_gallery(id $id,image VARCHAR(255) NOT NULL,title VARCHAR(200) NOT NULL,alt VARCHAR(500) NOT NULL,category VARCHAR(80) NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0)",
    "aa_settings(setting_key VARCHAR(80) PRIMARY KEY,setting_value $text NOT NULL)",
    "aa_messages(id $id,name VARCHAR(100) NOT NULL,email VARCHAR(254) NOT NULL,message TEXT NOT NULL,created_at VARCHAR(30) NOT NULL,is_read INTEGER NOT NULL DEFAULT 0)",
    "aa_subscribers(id $id,email VARCHAR(254) NOT NULL UNIQUE,token VARCHAR(64) NOT NULL UNIQUE,created_at VARCHAR(30) NOT NULL,status VARCHAR(16) NOT NULL)",
    "aa_limits(id $id,bucket VARCHAR(64) NOT NULL,created_at INTEGER NOT NULL)"
    ];foreach($schemas as $schema)db()->exec('CREATE TABLE IF NOT EXISTS '.$schema.($mysql?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''));
}

require_once __DIR__.'/localization.php';
require_once __DIR__.'/seo.php';
function public_posts(string $type,string $category=''):array {return array_values(array_filter(array_map('localize_post',raw_public_posts($type,$category))));}
