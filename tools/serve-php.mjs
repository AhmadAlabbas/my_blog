// Local rendering server only; database-changing checks live in tests/test-cms.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PHP,PHPRequestHandler} from '../source/node_modules/@php-wasm/universal/index.js';
import {loadNodeRuntime,useHostFilesystem} from '../source/node_modules/@php-wasm/node/index.js';

const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../source');
const port=Number(process.env.BLOG_DEV_PORT || 8001);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid BLOG_DEV_PORT');
const base=`http://127.0.0.1:${port}`;
const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-dev-'));
fs.mkdirSync(root+'/private');
fs.cpSync(source+'/hostinger',root+'/public_html',{recursive:true});
const setupToken=crypto.randomBytes(32).toString('hex');
fs.writeFileSync(root+'/private/blog-config.php',`<?php return ['dsn'=>'sqlite:${root}/private/blog.sqlite','base_url'=>'${base}','app_key'=>'${crypto.randomBytes(32).toString('hex')}','setup_token'=>'${setupToken}'];`,{mode:0o600});
const php=new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1}}));
useHostFilesystem(php);
const installer=new PHPRequestHandler({php,documentRoot:root+'/public_html',absoluteUrl:base});
const initial=await installer.request({url:'/admin/setup.php'});
const csrf=initial.text.match(/name="csrf" value="([a-f0-9]+)"/)[1];
const setup=await installer.request({url:'/admin/setup.php',method:'POST',headers:{Origin:base},body:{csrf,setup_token:setupToken,email:'dev@example.test',password:crypto.randomBytes(24).toString('hex')}});
if(setup.httpStatusCode!==302)throw Error('Local seed installation failed');
const handler=new PHPRequestHandler({php,documentRoot:root+'/public_html',absoluteUrl:base,cookieStore:false});
let queue=Promise.resolve();
const server=http.createServer((req,res)=>{
  queue=queue.then(async()=>{
    if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});res.end('Rendering server supports GET only.');return;}
    const requested=new URL(req.url,base);
    if(requested.pathname.includes('/_cms/')||requested.pathname.includes('/private/')||requested.pathname.endsWith('/.htaccess')){res.writeHead(404);res.end('Not found');return;}
    let url=req.url;
    if(requested.pathname==='/'||requested.pathname==='/ar/'||requested.pathname.endsWith('.html')){
      const ar=requested.pathname.startsWith('/ar/');
      const slug=requested.pathname.replace(/^\/ar\//,'/').replace(/^\//,'').replace(/\.html$/,'')||'index';
      url='/app.php?page='+encodeURIComponent(slug)+'&lang='+(ar?'ar':'en');
    }else if(requested.pathname==='/sitemap.xml')url='/sitemap.php';
    const result=await handler.request({url,method:'GET'});
    res.writeHead(result.httpStatusCode,result.headers);res.end(result.bytes);
  }).catch(e=>{console.error(e);if(!res.headersSent)res.writeHead(500);res.end('Development server error');});
});
server.listen(port,'127.0.0.1',()=>console.log('PHP rendering server started with disposable SQLite data.'));
function stop(){server.close(()=>{php.exit();fs.rmSync(root,{recursive:true,force:true});process.exit(0);});}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
