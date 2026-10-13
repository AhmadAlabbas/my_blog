<?php
require dirname(__DIR__).'/_cms/bootstrap.php';
$token=$_POST['token']??$_GET['token']??'';
if(!preg_match('/^[a-f0-9]{64}$/D',$token))form_result('Link unavailable','This unsubscribe link is invalid.',404);
if($_SERVER['REQUEST_METHOD']==='POST'){
    q('UPDATE aa_subscribers SET status=? WHERE token=?',['unsubscribed',$token]);form_result('Unsubscribed.','You will no longer receive blog updates.');
}
echo page_shell('Unsubscribe','Unsubscribe from blog updates.','<section class="section wrap" style="padding-top:150px"><h1>Leave the mailing list?</h1><p>Confirm below to stop receiving blog updates.</p><form method="post"><input type="hidden" name="lang" value="'.h(blog_language()).'"><input type="hidden" name="token" value="'.h($token).'"><button class="contact-send">Unsubscribe</button></form></section>');
