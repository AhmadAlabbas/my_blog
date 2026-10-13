import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {root} from '../server/config.mjs';

test('Hostinger-style require() can start the app and serve bilingual pages',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'blog-entry-'));
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const freePort=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  // Reserve a free port rather than conflicting with the development server.
  const child=spawn(process.execPath,['-e',"require('./server.js')"],{
    cwd:root,env:{...process.env,NODE_ENV:'development',DB_DRIVER:'sqlite',DATA_DIR:directory,UPLOAD_DIR:path.join(directory,'uploads'),PUBLIC_URL:'http://localhost:3000',PORT:String(freePort)},stdio:['ignore','pipe','pipe'],
  });
  let stderr='';child.stderr.on('data',bytes=>{stderr+=bytes.toString();});
  try{
    const port=await new Promise((resolve,reject)=>{
      let stdout='';const timeout=setTimeout(()=>reject(Error('Entry did not start: '+stderr)),10000);
      child.stdout.on('data',bytes=>{stdout+=bytes.toString();const match=stdout.match(/Node blog listening on port (\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
      child.once('exit',code=>{clearTimeout(timeout);reject(Error('Entry exited '+code+': '+stderr));});
      child.once('error',error=>{clearTimeout(timeout);reject(error);});
    });
    for(const [route,expected] of [['/health','"runtime":"node"'],['/','Ahmad'],['/ar/','lang="ar"']]){
      const response=await fetch('http://127.0.0.1:'+port+route);assert.equal(response.status,200,route);assert((await response.text()).includes(expected),route);
    }
    assert(!stderr.includes('ERR_REQUIRE_ASYNC_MODULE'));
  }finally{
    if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}
    fs.rmSync(directory,{recursive:true,force:true});
  }
});
