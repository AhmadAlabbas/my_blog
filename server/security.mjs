import crypto from 'node:crypto';
export const randomToken=()=>crypto.randomBytes(32).toString('hex');
export function equal(a,b){const left=Buffer.from(String(a??''));const right=Buffer.from(String(b??''));return left.length===right.length&&crypto.timingSafeEqual(left,right);}
export function security(db,config){
  const signature=value=>crypto.createHmac('sha256',config.sessionSecret).update(value).digest('hex');
  const sessionKey=value=>crypto.createHash('sha256').update(value).digest('hex');
  function cookie(req){const value=req.headers.cookie?.split(';').find(p=>p.trim().startsWith('aa_admin='))?.trim().slice(9)||'';const [id,signed]=value.split('.');return /^[a-f0-9]{64}$/.test(id)&&equal(signed,signature(id))?id:'';}
  async function persist(req,res,rotate=false){
    if(rotate&&req.sessionID){await db.run('DELETE FROM aa_node_sessions WHERE session_key=?',[sessionKey(req.sessionID)]);req.sessionID='';}
    req.sessionID ||=randomToken();const key=sessionKey(req.sessionID),expiry=Date.now()+30*60*1000;
    if((await db.all('SELECT session_key FROM aa_node_sessions WHERE session_key=?',[key])).length)await db.run('UPDATE aa_node_sessions SET data=?,expires_at=? WHERE session_key=?',[JSON.stringify(req.session),expiry,key]);
    else await db.run('INSERT INTO aa_node_sessions(session_key,data,expires_at) VALUES(?,?,?)',[key,JSON.stringify(req.session),expiry]);
    const otherCookies=[].concat(res.getHeader('Set-Cookie')||[]).filter(value=>!value.startsWith('aa_admin='));
    if(otherCookies.length)res.setHeader('Set-Cookie',otherCookies);else res.removeHeader('Set-Cookie');
    res.cookie('aa_admin',req.sessionID+'.'+signature(req.sessionID),{httpOnly:true,secure:config.publicURL.startsWith('https:'),sameSite:'strict',path:'/admin',maxAge:30*60*1000});
  }
  async function session(req,res,next){
    await db.run('DELETE FROM aa_node_sessions WHERE expires_at<?',[Date.now()]);
    req.sessionID=cookie(req);const rows=req.sessionID?await db.all('SELECT data FROM aa_node_sessions WHERE session_key=? AND expires_at>?',[sessionKey(req.sessionID),Date.now()]):[];
    req.session=rows.length?JSON.parse(rows[0].data):{csrf:randomToken()};
    req.session.csrf ||=randomToken();
    await persist(req,res);res.set('Cache-Control','no-store, private');res.set('X-Robots-Tag','noindex, nofollow');next();
  }
  async function auth(req,res,next){
    const user=(await db.all('SELECT * FROM aa_admins WHERE id=?',[Number(req.session.adminID)||0]))[0];
    if(!user||user.password_hash!==req.session.passwordVersion){res.redirect('/admin/login');return;}
    req.admin=user;next();
  }
  function origin(req,res,next){if(req.headers.origin&&req.headers.origin!==config.publicURL){res.status(403).send('Invalid request origin.');return;}next();}
  function csrf(req,res,next){if(!equal(req.session.csrf,req.body.csrf)){res.status(403).send('This form expired. Reload the page and try again.');return;}next();}
  async function rate(req,action,limit,seconds){
    const bucket=signature(action+'|'+req.ip),now=Math.floor(Date.now()/1000);
    await db.run('DELETE FROM aa_limits WHERE created_at<?',[now-86400]);
    const [{n}]=await db.all('SELECT COUNT(*) AS n FROM aa_limits WHERE bucket=? AND created_at>?',[bucket,now-seconds]);
    if(n>=limit)return false;await db.run('INSERT INTO aa_limits(bucket,created_at) VALUES(?,?)',[bucket,now]);return true;
  }
  return {session,auth,origin,csrf,rate,persist};
}
