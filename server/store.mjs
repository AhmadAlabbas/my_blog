import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import mysql from 'mysql2/promise';

export async function openStore(config){
  let connection;
  if(config.driver==='mysql'){
    connection=mysql.createPool({host:config.mysqlHost,port:config.mysqlPort,database:config.mysqlDatabase,user:config.mysqlUser,password:config.mysqlPassword,charset:'utf8mb4',connectionLimit:5,...(config.mysqlSSL?{ssl:{rejectUnauthorized:true}}:{})});
  }else{
    fs.mkdirSync(config.dataDir,{recursive:true,mode:0o700});
    connection=new DatabaseSync(path.join(config.dataDir,'blog.sqlite'));
    connection.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }
  function adapter(client){return {
    all:async(sql,args=[])=>config.driver==='mysql'?(await client.execute(sql,args))[0]:client.prepare(sql).all(...args),
    run:async(sql,args=[])=>{
      if(config.driver==='mysql'){const [result]=await client.execute(sql,args);return {id:result.insertId,changes:result.affectedRows};}
      const result=client.prepare(sql).run(...args);return {id:Number(result.lastInsertRowid),changes:Number(result.changes)};
    },
  };}
  const base=adapter(connection);
  let pending=Promise.resolve();
  const schedule=fn=>{const operation=pending.then(fn);pending=operation.catch(()=>{});return operation;};
  const api={all:(...args)=>schedule(()=>base.all(...args)),run:(...args)=>schedule(()=>base.run(...args))};
  api.transaction=fn=>schedule(async()=>{
      const client=config.driver==='mysql'?await connection.getConnection():connection;
      try{
        if(config.driver==='mysql')await client.beginTransaction();else client.exec('BEGIN IMMEDIATE');
        const result=await fn(adapter(client));
        if(config.driver==='mysql')await client.commit();else client.exec('COMMIT');
        return result;
      }catch(error){if(config.driver==='mysql')await client.rollback();else client.exec('ROLLBACK');throw error;}
      finally{if(config.driver==='mysql')client.release();}
  });
  api.close=async()=>config.driver==='mysql'?connection.end():connection.close();
  const id=config.driver==='mysql'?'INTEGER PRIMARY KEY AUTO_INCREMENT':'INTEGER PRIMARY KEY AUTOINCREMENT';
  const text=config.driver==='mysql'?'MEDIUMTEXT':'TEXT';
  const tables=[
    `aa_admins(id ${id},email VARCHAR(254) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL)`,
    `aa_posts(id ${id},type VARCHAR(16) NOT NULL,slug VARCHAR(140) NOT NULL UNIQUE,title VARCHAR(200) NOT NULL,subtitle TEXT NOT NULL,category VARCHAR(80) NOT NULL,author VARCHAR(150) NOT NULL,image VARCHAR(255) NOT NULL,intro TEXT NOT NULL,body ${text} NOT NULL,ending TEXT NOT NULL,source_url VARCHAR(500) NOT NULL,isbn VARCHAR(32) NOT NULL,status VARCHAR(16) NOT NULL,published_at VARCHAR(10) NOT NULL)`,
    `aa_gallery(id ${id},image VARCHAR(255) NOT NULL,title VARCHAR(200) NOT NULL,alt VARCHAR(500) NOT NULL,category VARCHAR(80) NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0)`,
    `aa_settings(setting_key VARCHAR(80) PRIMARY KEY,setting_value ${text} NOT NULL)`,
    `aa_messages(id ${id},name VARCHAR(100) NOT NULL,email VARCHAR(254) NOT NULL,message TEXT NOT NULL,created_at VARCHAR(30) NOT NULL,is_read INTEGER NOT NULL DEFAULT 0)`,
    `aa_subscribers(id ${id},email VARCHAR(254) NOT NULL UNIQUE,token VARCHAR(64) NOT NULL UNIQUE,created_at VARCHAR(30) NOT NULL,status VARCHAR(16) NOT NULL)`,
    `aa_limits(id ${id},bucket VARCHAR(64) NOT NULL,created_at INTEGER NOT NULL)`,
    `aa_translations(post_id INTEGER PRIMARY KEY,title VARCHAR(200) NOT NULL,subtitle TEXT NOT NULL,intro TEXT NOT NULL,body ${text} NOT NULL,ending TEXT NOT NULL,status VARCHAR(16) NOT NULL)`,
    `aa_post_languages(post_id INTEGER PRIMARY KEY,language VARCHAR(2) NOT NULL,updated_at VARCHAR(30) NOT NULL)`,
    `aa_gallery_translations(gallery_id INTEGER PRIMARY KEY,title VARCHAR(200) NOT NULL,alt VARCHAR(500) NOT NULL,category VARCHAR(80) NOT NULL)`,
    `aa_node_sessions(session_key VARCHAR(64) PRIMARY KEY,data ${text} NOT NULL,expires_at BIGINT NOT NULL)`,
  ];
  for(const table of tables)await api.run('CREATE TABLE IF NOT EXISTS '+table+(config.driver==='mysql'?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':''));
  return api;
}

export async function seedStore(db,seed,arabic){
  const admins=await db.all('SELECT id FROM aa_admins LIMIT 1');
  const posts=await db.all('SELECT id FROM aa_posts LIMIT 1');
  if(!admins.length&&!posts.length)await db.transaction(async tx=>{
    for(const p of seed.posts){const keys=Object.keys(p);await tx.run(`INSERT INTO aa_posts(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,Object.values(p));}
    for(const g of seed.gallery){const keys=Object.keys(g);await tx.run(`INSERT INTO aa_gallery(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,Object.values(g));}
    for(const [key,value] of Object.entries(seed.settings))await tx.run('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',[key,String(value)]);
  });
  // Add missing bilingual metadata, preserving all existing edits and translation states.
  await db.transaction(async tx=>{
    for(const p of await tx.all('SELECT * FROM aa_posts')){
      if(!(await tx.all('SELECT post_id FROM aa_post_languages WHERE post_id=?',[p.id])).length)await tx.run('INSERT INTO aa_post_languages(post_id,language,updated_at) VALUES(?,?,?)',[p.id,'en',p.published_at+'T00:00:00Z']);
      const t=arabic.articles[p.slug];const original=seed.posts.find(x=>x.slug===p.slug);
      if(t&&!(await tx.all('SELECT post_id FROM aa_translations WHERE post_id=?',[p.id])).length)await tx.run('INSERT INTO aa_translations(post_id,title,subtitle,intro,body,ending,status) VALUES(?,?,?,?,?,?,?)',[p.id,t.title,t.subtitle,t.intro,t.body,'',original?.title===p.title&&original?.body===p.body?'published':'draft']);
    }
    for(const g of await tx.all('SELECT * FROM aa_gallery')){
      const t=arabic.gallery[g.image];
      if(t&&!(await tx.all('SELECT gallery_id FROM aa_gallery_translations WHERE gallery_id=?',[g.id])).length)await tx.run('INSERT INTO aa_gallery_translations(gallery_id,title,alt,category) VALUES(?,?,?,?)',[g.id,t.title,t.alt,t.category]);
    }
    for(const [key,value] of Object.entries(arabic.settings))if(!(await tx.all('SELECT setting_key FROM aa_settings WHERE setting_key=?',[key])).length)await tx.run('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',[key,value]);
  });
}
