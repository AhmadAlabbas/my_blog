<?php
require dirname(__DIR__).'/_cms/bootstrap.php';require_public_post();
if(!installed())form_result('Not ready yet','Newsletter signup is not configured yet.',503);
if(!rate_allowed('subscribe',5,3600))form_result('Please try later','Too many requests. Try again in an hour.',429);
$email=strtolower(trim($_POST['email']??''));
if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254||($_POST['consent']??'')!=='1')form_result('Check your signup','Enter a valid email and confirm that you want blog updates.',422);
$sub=q('SELECT id FROM aa_subscribers WHERE email=?',[$email])->fetch();
if($sub){
    // Do not reactivate an unsubscribed address through an unauthenticated form.
    form_result('Signup received.','If this address is already subscribed, it stays on the list. If you previously unsubscribed, contact Ahmad to rejoin.');
}
else q('INSERT INTO aa_subscribers(email,token,created_at,status) VALUES(?,?,?,?)',[$email,bin2hex(random_bytes(32)),gmdate('Y-m-d H:i:s'),'active']);
form_result('You’re on the list.','Your signup has been saved. You can unsubscribe using the link included with future updates.');
