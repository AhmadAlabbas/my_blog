import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(root,'source/assets'),path.join(output,'assets'),{recursive:true});
for(const entry of fs.readdirSync(path.join(root,'source'))){
  if(/\.(css|js|svg)$/.test(entry))fs.copyFileSync(path.join(root,'source',entry),path.join(output,entry));
}
// Self-host the pinned 3D engine; the homepage makes no CDN requests.
fs.mkdirSync(path.join(output,'vendor'));
for(const name of ['three.module.js','three.core.js'])fs.copyFileSync(path.join(root,'node_modules/three/build',name),path.join(output,'vendor',name));
fs.copyFileSync(path.join(root,'node_modules/three/LICENSE'),path.join(output,'vendor/THREE-LICENSE.txt'));
fs.mkdirSync(path.join(output,'admin'));
for(const name of ['admin.css','admin.js'])fs.copyFileSync(path.join(root,'source/backend/admin',name),path.join(output,'admin',name));
// HTML templates retain the supplied artwork, layouts and complete translations.
fs.cpSync(path.join(root,'web/templates'),path.join(output,'templates'),{recursive:true});
console.log('Node website assets and bilingual templates built. No PHP or Python runtime required.');
