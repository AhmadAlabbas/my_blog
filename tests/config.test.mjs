import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {configuration} from '../server/config.mjs';

function production(directory){return {
  NODE_ENV:'production',PUBLIC_URL:'https://blog.example.test',DB_DRIVER:'mysql',
  MYSQL_HOST:'database.example.test',MYSQL_DATABASE:'blog',MYSQL_USER:'blog',
  MYSQL_PASSWORD:'isolated-config-test-password',
  SESSION_SECRET:'isolated-config-session-secret-32-characters',
  DATA_DIR:path.join(directory,'unused-data'),UPLOAD_DIR:path.join(directory,'uploads'),
};}

test('MySQL production configuration needs no local data folder and preserves existing uploads',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'blog-config-'));
  try{
    const env=production(directory);fs.mkdirSync(env.UPLOAD_DIR);fs.writeFileSync(path.join(env.UPLOAD_DIR,'existing.webp'),'existing media');
    const config=configuration(env);
    assert.equal(config.driver,'mysql');assert(!fs.existsSync(env.DATA_DIR));
    assert.equal(fs.readFileSync(path.join(env.UPLOAD_DIR,'existing.webp'),'utf8'),'existing media');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('incomplete production template values produce errors naming settings without their values',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'blog-config-'));
  try{
    for(const name of ['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD']){
      const env={...production(directory),[name]:'REPLACE_WITH_SECRET_OR_SETTING'};
      assert.throws(()=>configuration(env),error=>error.message.includes(name)&&!error.message.includes(env[name]));
    }
    for(const uploads of ['REPLACE_WITH_UPLOADS_PATH','relative/uploads'])assert.throws(()=>configuration({...production(directory),UPLOAD_DIR:uploads}),/UPLOAD_DIR must be an absolute path/);
    assert.throws(()=>configuration({...production(directory),MYSQL_PASSWORD:''}),/Configure MYSQL_PASSWORD/);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('a file cannot be used as an uploads directory and the error names UPLOAD_DIR',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'blog-config-'));
  try{const file=path.join(directory,'file');fs.writeFileSync(file,'keep');assert.throws(()=>configuration({...production(directory),UPLOAD_DIR:file}),/UPLOAD_DIR is not writable/);assert.equal(fs.readFileSync(file,'utf8'),'keep');}
  finally{fs.rmSync(directory,{recursive:true,force:true});}
});
