import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// LiteSpeed loads this entry with require(). Keep its ESM graph synchronous;
// the async database/server bootstrap must be loaded through dynamic import.
// Load a local .env too when the host invokes the entry directly instead of npm.
const envFile=fileURLToPath(new URL('.env',import.meta.url));
if(existsSync(envFile))process.loadEnvFile(envFile);

import('./server/index.mjs').catch(error=>{
  console.error('Blog startup failed:',error.code||error.name,error.message);
  process.exit(1);
});
