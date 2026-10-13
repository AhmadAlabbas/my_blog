<?php
require dirname(__DIR__).'/_cms/bootstrap.php';require_public_post();
if(!installed())form_result('Not ready yet','Please return once the contact form is configured.',503);
if(!rate_allowed('contact',5,3600))form_result('Please try later','Too many messages have been sent. Try again in an hour.',429);
$name=trim($_POST['name']??'');$email=trim($_POST['email']??'');$message=trim($_POST['message']??'');
if($name===''||!preg_match('//u',$name)||unicode_length($name)>100||!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254||$message===''||!preg_match('//u',$message)||unicode_length($message)>5000)form_result('Check your message','Enter a name, valid email, and message of up to 5,000 characters.',422);
q('INSERT INTO aa_messages(name,email,message,created_at,is_read) VALUES(?,?,?,?,0)',[$name,$email,$message,gmdate('Y-m-d H:i:s')]);
form_result('Message received.','Your message has been saved privately for Ahmad to read. Thank you for getting in touch.');
