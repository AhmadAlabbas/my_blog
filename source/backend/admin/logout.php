<?php
require dirname(__DIR__).'/_cms/bootstrap.php';admin();
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
verify_csrf();$_SESSION=[];session_destroy();setcookie('aa_admin','',['expires'=>time()-3600,'path'=>'/admin','secure'=>str_starts_with(config()['base_url'],'https://'),'httponly'=>true,'samesite'=>'Strict']);header('Location: /admin/login.php');
