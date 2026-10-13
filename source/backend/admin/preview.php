<?php
require dirname(__DIR__).'/_cms/bootstrap.php';admin();
$p=q('SELECT * FROM aa_posts WHERE id=?',[(int)($_GET['id']??0)])->fetch();
if($p&&blog_language()==='ar'&&$p['type']==='article'){$t=arabic_translation((int)$p['id']);foreach(['title','subtitle','intro','body','ending'] as $f)$p[$f]=$t[$f]??'';}
if(!$p){http_response_code(404);exit('Entry not found.');}
header('X-Robots-Tag: noindex, nofollow');
$main='<section class="page-masthead"><div class="wrap"><p class="eyebrow">Private preview · '.h($p['status']).'</p><h1>'.h($p['title']).'</h1><p class="dek">'.h($p['subtitle']).'</p></div></section><div class="wrap"><div class="reading-layout"><article class="article-body"><figure>'.picture($p['image'],$p['title']).'</figure><p>'.h($p['intro']).'</p>'.markdown($p['body']).($p['ending']?'<details class="spoiler"><summary>Ending spoilers</summary><p>'.h($p['ending']).'</p></details>':'').'<a class="text-link" href="/admin/?section='.($p['type']==='book'?'books':'articles').'&edit='.h($p['id']).'">Return to editor</a></article></div></div>';
echo page_shell($p['title'],$p['subtitle'],$main,$p['slug']);
