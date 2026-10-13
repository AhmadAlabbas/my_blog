<?php
require dirname(__DIR__).'/_cms/bootstrap.php';session_begin();
if(!installed()){header('Location: /admin/setup.php');exit;}
$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();
    if(!rate_allowed('login',8,900))$error='Too many attempts. Please try again in 15 minutes.';
    else{
        $u=q('SELECT * FROM aa_admins WHERE email=?',[strtolower(trim($_POST['email']??''))])->fetch();
        $hash=$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if(password_verify($_POST['password']??'',$hash)&&$u){session_regenerate_id(true);$_SESSION['admin_id']=$u['id'];$_SESSION['password_version']=$u['password_hash'];$_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));header('Location: /admin/');exit;}
        $error='Email or password is incorrect.';
    }
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sign in · Ahmad Alabbas</title><link rel="icon" href="/favicon.svg?v=2"><link rel="stylesheet" href="/admin/admin.css"></head><body class="auth"><main class="auth-card"><span class="admin-logo">A</span><p class="overline">Your private workspace</p><h1>Welcome back.</h1><p>Books, ideas, and everything you’re working on.</p><?php if(isset($_GET['installed'])):?><p class="notice">Your dashboard is ready. Sign in below.</p><?php endif?><?php if($error):?><p class="notice error"><?=h($error)?></p><?php endif?><form method="post"><?=csrf()?><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form><a href="/index.html" class="muted">← Back to the blog</a></main></body></html>
