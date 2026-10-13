import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function configuration(env=process.env){
  const production=env.NODE_ENV==='production';
  const dataDir=path.resolve(env.DATA_DIR||path.join(root,'.local-data'));
  const driver=env.DB_DRIVER|| (production?'mysql':'sqlite');
  if(!['mysql','sqlite'].includes(driver))throw Error('DB_DRIVER must be mysql or sqlite');
  if(production&&driver!=='mysql')throw Error('Production requires a persistent MySQL database; set DB_DRIVER=mysql');
  const publicURL=new URL(env.PUBLIC_URL||'http://localhost:3000');
  if(publicURL.pathname!=='/'||publicURL.search||publicURL.hash||publicURL.username||publicURL.password)throw Error('PUBLIC_URL must be the website origin');
  if(production&&publicURL.protocol!=='https:')throw Error('Production PUBLIC_URL must use HTTPS');
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
  function secret(name,file,required=false){
    if(env[name]){if(env[name].length<32)throw Error(name+' must contain at least 32 characters');return env[name];}
    if(production){if(required)throw Error('Configure '+name+' in Hostinger environment settings');return '';}
    const location=path.join(dataDir,file);if(!fs.existsSync(location))fs.writeFileSync(location,crypto.randomBytes(32).toString('hex'),{mode:0o600});return fs.readFileSync(location,'utf8').trim();
  }
  if(driver==='mysql')for(const name of ['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD'])if(!env[name])throw Error('Configure '+name+' in environment settings');
  const uploadDir=path.resolve(env.UPLOAD_DIR||path.join(dataDir,'uploads'));
  if(production&&!env.UPLOAD_DIR)throw Error('Set UPLOAD_DIR to a persistent location outside the deployed application');
  fs.mkdirSync(uploadDir,{recursive:true,mode:0o755});
  return {production,driver,dataDir,uploadDir,dist:path.join(root,'dist'),publicURL:publicURL.origin,sessionSecret:secret('SESSION_SECRET','session-secret',true),setupToken:secret('SETUP_TOKEN','setup-token'),mysqlHost:env.MYSQL_HOST,mysqlPort:Number(env.MYSQL_PORT||3306),mysqlDatabase:env.MYSQL_DATABASE,mysqlUser:env.MYSQL_USER,mysqlPassword:env.MYSQL_PASSWORD,mysqlSSL:env.MYSQL_SSL==='true'};
}
