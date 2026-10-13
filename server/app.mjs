import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {root,configuration} from './config.mjs';
import {openStore,seedStore} from './store.mjs';
import {renderer,viewData,pageURL,escape} from './render.mjs';
import {security,randomToken} from './security.mjs';
import {registerAdmin} from './admin.mjs';

export async function createApp(config=configuration()){
  if(!fs.existsSync(path.join(config.dist,'templates/index.html')))throw Error('Run npm run build before starting the blog');
  const arabic=JSON.parse(fs.readFileSync(path.join(root,'source/backend/_cms/arabic.json')));
  const seed=JSON.parse(fs.readFileSync(path.join(root,'source/backend/_cms/seed.json')));
  const db=await openStore(config);await seedStore(db,seed,arabic);
  const render=renderer(config,arabic),guard=security(db,config),app=express();
  app.disable('x-powered-by');if(config.production)app.set('trust proxy',1);
  app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});next();});
  app.use(express.urlencoded({extended:false,limit:'350kb',parameterLimit:100}));
  app.get('/health',(_req,res)=>res.json({status:'ok',runtime:'node'}));
  app.get(/^\/ar$/,(_req,res)=>res.redirect(301,'/ar/'));
  app.use('/assets/uploads',express.static(config.uploadDir,{dotfiles:'deny',index:false}));
  app.use((req,res,next)=>{if(req.path==='/arabic-ui.js'){res.type('js').send(fs.readFileSync(path.join(config.dist,'templates/arabic-ui.js')));return;}if(req.path.includes('/templates/')||req.path.endsWith('.php')&&!req.path.startsWith('/api/')&&!req.path.startsWith('/admin/')){res.status(404).send('Not found');return;}next();});
  for(const folder of ['assets','admin'])app.use('/'+folder,express.static(path.join(config.dist,folder),{dotfiles:'deny',index:false}));
  app.get(/^\/[a-zA-Z0-9-]+\.(css|js|svg)$/,express.static(config.dist,{dotfiles:'deny',index:false}));
  registerAdmin(app,{db,config,guard,render,arabic});
  const lang=req=>(req.body?.lang||req.query.lang)==='ar'?'ar':'en';
  async function result(req,res,title,message,status=200){const language=lang(req);const data=await viewData(db,language,arabic);res.status(status).send(render.render('index',language,data,{result:{title:language==='ar'?(arabic.ui[title]||title):title,message:language==='ar'?(arabic.ui[message]||message):message},status}).html);}
  for(const action of ['contact','subscribe']){
    app.get(['/api/'+action,'/api/'+action+'.php'],(_req,res)=>res.status(405).set('Allow','POST').send('POST required.'));
    app.post(['/api/'+action,'/api/'+action+'.php'],guard.origin,async(req,res)=>{
      if(req.body.website){await result(req,res,'Thank you','Your request was received.');return;}
      if(!await guard.rate(req,action,5,3600)){await result(req,res,'Please try later','Too many requests. Try again in an hour.',429);return;}
      const email=String(req.body.email||'').trim().toLowerCase();
      if(!validEmail(email)){await result(req,res,'Check your message','Enter a valid email address.',422);return;}
      if(action==='contact'){
        const name=String(req.body.name||'').trim(),message=String(req.body.message||'').trim();
        if(!name||[...name].length>100||!message||[...message].length>5000){await result(req,res,'Check your message','Enter a name and message of up to 5,000 characters.',422);return;}
        await db.run('INSERT INTO aa_messages(name,email,message,created_at,is_read) VALUES(?,?,?,?,0)',[name,email,message,new Date().toISOString()]);
        await result(req,res,'Message received.','Your message has been saved privately for Ahmad to read. Thank you for getting in touch.');
      }else{
        if(req.body.consent!=='1'){await result(req,res,'Check your signup','Confirm that you want blog updates.',422);return;}
        if((await db.all('SELECT id FROM aa_subscribers WHERE email=?',[email])).length){await result(req,res,'Signup received.','If this address is already subscribed, it stays on the list. If you previously unsubscribed, contact Ahmad to rejoin.');return;}
        await db.run('INSERT INTO aa_subscribers(email,token,created_at,status) VALUES(?,?,?,?)',[email,randomToken(),new Date().toISOString(),'active']);
        await result(req,res,'You’re on the list.','Your signup has been saved. You can unsubscribe using the link included with future updates.');
      }
    });
  }
  app.all(['/api/unsubscribe','/api/unsubscribe.php'],guard.origin,async(req,res)=>{
    if(!['GET','POST'].includes(req.method)){res.status(405).set('Allow','GET, POST').send('Method not allowed');return;}
    const token=String(req.body?.token||req.query.token||'');
    if(!/^[a-f0-9]{64}$/.test(token)||!(await db.all('SELECT id FROM aa_subscribers WHERE token=?',[token])).length){await result(req,res,'Link unavailable','This unsubscribe link is invalid.',404);return;}
    if(req.method==='POST'){await db.run('UPDATE aa_subscribers SET status=? WHERE token=?',['unsubscribed',token]);await result(req,res,'Unsubscribed.','You will no longer receive blog updates.');return;}
    const language=lang(req),data=await viewData(db,language,arabic);
    let html=render.render('index',language,data,{result:{title:language==='ar'?'هل تريد مغادرة القائمة البريدية؟':'Leave the mailing list?',message:language==='ar'?'أكد أدناه لإلغاء الاشتراك.':'Confirm below to stop receiving updates.'}}).html;
    html=html.replace('</main>',`<form class="wrap" method="post"><input type="hidden" name="token" value="${token}"><input type="hidden" name="lang" value="${language}"><button class="contact-send">${language==='ar'?'إلغاء الاشتراك':'Unsubscribe'}</button></form></main>`);res.send(html);
  });
  app.get('/robots.txt',(_req,res)=>res.type('text').send('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: '+config.publicURL+'/sitemap.xml\n'));
  app.get('/sitemap.xml',async(_req,res)=>{
    const rows=[];for(const language of ['en','ar']){const data=await viewData(db,language,arabic);for(const slug of ['index','articles','book-summaries','gallery','about','work','contact','privacy','credits',...data.posts.map(p=>p.slug)]){
      const post=data.posts.find(p=>p.slug===slug);const equivalents=post?(post.type==='book'?[language]:data.translations.get(post.id)?.status==='published'?['en','ar']:['en']):['en','ar'];
      rows.push(`<url><loc>${escape(config.publicURL+pageURL(slug,language))}</loc>${equivalents.map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${escape(config.publicURL+pageURL(slug,l))}"/>`).join('')}${post?.image?`<image:image><image:loc>${escape(config.publicURL+'/'+post.image)}</image:loc></image:image>`:slug==='gallery'?data.gallery.map(g=>`<image:image><image:loc>${escape(config.publicURL+'/'+g.image)}</image:loc></image:image>`).join(''):''}</url>`);
    }}res.type('xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+rows.join('')+'</urlset>');
  });
  app.get(/^\/(?:ar\/)?(?:[a-z0-9-]+\.html)?$/,async(req,res)=>{
    const language=req.path.startsWith('/ar/')?'ar':'en';let slug=req.path.replace(/^\/ar\//,'/').replace(/^\//,'').replace(/\.html$/,'')||'index';slug={notes:'articles',books:'book-summaries'}[slug]||slug;
    const data=await viewData(db,language,arabic);const page=render.render(slug,language,data);res.set('Cache-Control','no-cache').status(page.status).send(page.html);
  });
  app.use((_req,res)=>res.status(404).send('Not found'));
  app.use((error,_req,res,_next)=>{if(error.code==='LIMIT_FILE_SIZE'){res.status(422).send('Choose an image smaller than 8 MB.');return;}console.error('Blog request failed:',error.name);res.status(500).send('This request could not finish. Please try again.');});
  return {app,db,config};
}
export const validEmail=email=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
