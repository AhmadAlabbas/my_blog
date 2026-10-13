<?php
require dirname(__DIR__).'/_cms/bootstrap.php';
session_begin();
if(installed()){http_response_code(403);exit('Setup is locked. Sign in at /admin/login.php.');}
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();
    try{
        if(!hash_equals((string)(config()['setup_token']??''),(string)($_POST['setup_token']??'')) || strlen((string)(config()['setup_token']??''))<32 || str_contains((string)(config()['setup_token']??''),'REPLACE_'))throw new RuntimeException('The setup token is invalid. Check your private configuration.');
        $email=strtolower(trim($_POST['email']??''));$password=$_POST['password']??'';
        if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($password)<12||strlen($password)>128)throw new RuntimeException('Enter a valid email and a password of 12–128 characters.');
        create_schema();db()->beginTransaction();
        q('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',['installation_lock','1']);
        q('INSERT INTO aa_admins(email,password_hash) VALUES(?,?)',[$email,password_hash($password,PASSWORD_DEFAULT)]);
        $seed=json_decode(file_get_contents(dirname(__DIR__).'/_cms/seed.json'),true,512,JSON_THROW_ON_ERROR);
        foreach($seed['posts'] as $p)q('INSERT INTO aa_posts(type,slug,title,subtitle,category,author,image,intro,body,ending,source_url,isbn,status,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',array_values($p));
        foreach($seed['gallery'] as $g)q('INSERT INTO aa_gallery(image,title,alt,category,sort_order) VALUES(?,?,?,?,?)',array_values($g));
        foreach($seed['settings'] as $key=>$value)save_setting($key,$value);
        db()->commit();migrate_bilingual();header('Location: /admin/login.php?installed=1');exit;
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();$error=$e instanceof RuntimeException && !($e instanceof PDOException)?$e->getMessage():'Setup could not finish. Check PHP/database support and your private configuration.';}
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Set up your blog</title><link rel="icon" href="/favicon.svg?v=2"><link rel="stylesheet" href="/admin/admin.css"></head><body class="auth"><main class="auth-card"><span class="admin-logo">A</span><p class="overline">Ahmad Alabbas · Blog setup</p><h1>Your notebook, under your control.</h1><p>Create your admin account. Existing articles, books, and illustrations will be imported automatically.</p><?php if($error):?><p class="notice error"><?=h($error)?></p><?php endif?><form method="post"><?=csrf()?><label>Setup token<input name="setup_token" type="password" required autocomplete="off"></label><label>Admin email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><button>Create my dashboard</button></form><p class="muted">Your database and token must be configured first. See HOSTINGER-SETUP.md.</p></main></body></html>
