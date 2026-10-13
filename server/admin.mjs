import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import {escape,viewData,youtubeID,socialHosts,validSocial} from './render.mjs';
import {equal,randomToken} from './security.mjs';

const navigation={overview:'Overview',articles:'Articles',books:'Book summaries',gallery:'Gallery',videos:'YouTube videos',media:'Media library',pages:'Home, About & Work',messages:'Messages',subscribers:'Subscribers',settings:'Blog settings',seo:'Search visibility',account:'Account'};
const postKeys=['type','slug','title','subtitle','category','author','image','intro','body','ending','source_url','isbn','status','published_at'];
const reserved=new Set(['index','about','work','contact','gallery','books','book-summaries','articles','notes','science','technology','business','travel','personal','privacy','credits','404','article','admin-preview']);
const csrf=s=>`<input type="hidden" name="csrf" value="${s.csrf}">`;
const field=(name,label,value='',type='text')=>`<label>${escape(label)}<input name="${name}" type="${type}" value="${escape(value)}"></label>`;
const area=(name,label,value='',rows=8)=>`<label>${escape(label)}<textarea name="${name}" rows="${rows}">${escape(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${escape(label)}<select name="${name}">${values.map(v=>`<option value="${escape(v)}" ${v===value?'selected':''}>${escape(v)}</option>`).join('')}</select></label>`;
function shell(title,main,req,section=null,error=''){
  const auth=!section;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} · Ahmad Alabbas</title><link rel="stylesheet" href="/admin/admin.css"><link rel="icon" href="/favicon.svg"></head><body class="${auth?'auth':''}">${auth?'':`<aside class="sidebar"><a class="admin-brand" href="/admin/">Ahmad Alabbas</a><nav>${Object.entries(navigation).map(([key,label])=>`<a href="/admin/?section=${key}" ${section===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a href="/">View blog ↗</a><form method="post" action="/admin/logout">${csrf(req.session)}<button class="secondary">Sign out</button></form></aside>`}<main class="${auth?'auth-card':'dashboard'}">${auth?'':`<header class="dashboard-header"><p class="overline">Your private workspace</p><h1>${navigation[section]}</h1></header>`}${error?`<p class="notice error">${escape(error)}</p>`:''}${main}</main><script src="/admin/admin.js" defer></script></body></html>`;
}
export function registerAdmin(app,{db,config,guard,render,arabic}){
  const router=express.Router();app.use('/admin',router);router.use(guard.session);
  async function installed(){return (await db.all('SELECT id FROM aa_admins LIMIT 1')).length>0;}
  function loginForm(req,error=''){return shell('Sign in',`<span class="admin-logo">A</span><h1>Welcome back.</h1><p>Books, ideas, and everything you’re working on.</p><form method="post">${csrf(req.session)}${field('email','Email','','email')}${field('password','Password','','password')}<button>Sign in</button></form><a href="/">← Back to the blog</a>`,req,null,error);}
  function setupForm(req,error=''){return shell('Set up your blog',`<span class="admin-logo">A</span><h1>Your notebook, under your control.</h1><p>Create the admin account for this Node.js blog. Existing imported content is preserved.</p><form method="post">${csrf(req.session)}${field('setup_token','Setup token','','password')}${field('email','Admin email','','email')}${field('password','Password — 12 characters, up to 72 UTF-8 bytes','','password')}<button>Create my dashboard</button></form>`,req,null,error);}
  router.get(['/setup','/setup.php'],async(req,res)=>{
    if(await installed()){res.status(403).send('Setup is locked. Sign in at /admin/login.');return;}
    if(!config.setupToken){res.status(503).send('Configure SETUP_TOKEN securely in Hostinger before creating your admin account.');return;}
    res.send(setupForm(req));
  });
  router.post(['/setup','/setup.php'],guard.origin,guard.csrf,async(req,res)=>{
    if(await installed()){res.status(403).send('Setup is locked.');return;}
    const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
    if(!config.setupToken||!equal(req.body.setup_token,config.setupToken)){res.status(422).send(setupForm(req,'The setup token is invalid.'));return;}
    if(!emailValid(email)||!passwordValid(password)){res.status(422).send(setupForm(req,'Enter a valid email and a password of 12 characters, up to 72 UTF-8 bytes.'));return;}
    const hash=await bcrypt.hash(password,12);
    await db.transaction(async tx=>{
      if((await tx.all('SELECT id FROM aa_admins LIMIT 1')).length)throw Error('Setup is already locked');
      const lock=await tx.all('SELECT setting_key FROM aa_settings WHERE setting_key=?',['installation_lock']);
      if(!lock.length)await tx.run('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',['installation_lock','1']);
      await tx.run('INSERT INTO aa_admins(email,password_hash) VALUES(?,?)',[email,hash]);
    });
    res.redirect('/admin/login?installed=1');
  });
  router.get(['/login','/login.php'],async(req,res)=>{if(!await installed()){res.redirect('/admin/setup');return;}res.send(loginForm(req));});
  router.post(['/login','/login.php'],guard.origin,guard.csrf,async(req,res)=>{
    if(!await guard.rate(req,'login',8,900)){res.status(429).send(loginForm(req,'Too many attempts. Try again in 15 minutes.'));return;}
    const user=(await db.all('SELECT * FROM aa_admins WHERE email=?',[String(req.body.email||'').trim().toLowerCase()]))[0];
    const hash=user?.password_hash||'$2b$12$C6UzMDM.H6dfI/f/IKcEe.HMIAiqowEmu.JAQteFbTiKvBpuJGONq';
    if(!await bcrypt.compare(String(req.body.password||''),hash.replace(/^\$2y\$/,'$2b$'))||!user){res.status(422).send(loginForm(req,'Email or password is incorrect.'));return;}
    req.session={csrf:randomToken(),adminID:user.id,passwordVersion:user.password_hash};await guard.persist(req,res,true);res.redirect('/admin/');
  });
  router.use(guard.auth);
  router.post(['/logout','/logout.php'],guard.origin,guard.csrf,async(req,res)=>{req.session={csrf:randomToken()};await guard.persist(req,res,true);res.redirect('/admin/login');});
  router.get(['/preview','/preview.php'],async(req,res)=>{
    const language=req.query.lang==='ar'?'ar':'en',data=await viewData(db,language,arabic);const raw=data.all.find(p=>p.id===Number(req.query.id));const post=raw&&data.localize(raw,true);
    if(!post){res.status(404).send('Entry not found in this language.');return;}
    res.send(render.render(post.slug,language,data,{preview:post}).html);
  });
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:100,fieldSize:350000}}).single('illustration');
  router.post(['/','/index.php'],guard.origin,upload,guard.csrf,async(req,res)=>{
    const body=req.body,action=body.action;let section=Object.hasOwn(navigation,req.query.section)?req.query.section:'overview';
    try{
      if(action==='save_post'){
        const p=Object.fromEntries(postKeys.map(key=>[key,String(body[key]??'').trim()]));
        if(!['article','book'].includes(p.type)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||p.slug.length>140||reserved.has(p.slug))throw Error('Use a unique slug with lowercase letters, numbers, and hyphens.');
        if(!p.title||[...p.title].length>200||!['draft','published'].includes(p.status)||!/^\d{4}-\d{2}-\d{2}$/.test(p.published_at)||Number.isNaN(Date.parse(p.published_at))||new Date(p.published_at).toISOString().slice(0,10)!==p.published_at)throw Error('Check the title, status, and date.');
        if(p.image&&!render.safeImage(p.image))throw Error('Select an image from the media library.');
        if(p.source_url&&!httpsURL(p.source_url))throw Error('Source URLs must use HTTPS.');
        if(Buffer.byteLength(p.body)>250000)throw Error('Keep main text under 250,000 bytes.');
        for(const [key,max] of Object.entries({subtitle:2000,category:80,author:150,intro:10000,ending:20000,isbn:32}))p[key]=[...p[key]].slice(0,max).join('');
        const translation=Object.fromEntries(['title','subtitle','intro','body','ending'].map(k=>[k,String(body[k+'_ar']||'').trim()]));
        const translationStatus=body.translation_status==='published'?'published':'draft';
        if(p.type==='article'&&Object.hasOwn(body,'title_ar')){
          if([...translation.title].length>200||Object.entries(translation).some(([k,v])=>Buffer.byteLength(v)>(k==='body'?250000:20000)))throw Error('Arabic text is too long.');
          if(translationStatus==='published'&&(!translation.title||!translation.body))throw Error('A published Arabic article needs a title and body.');
        }
        await db.transaction(async tx=>{
          let id=Number(body.id)||0;
          if(id){if(!(await tx.all('SELECT id FROM aa_posts WHERE id=?',[id])).length)throw Error('This entry no longer exists.');await tx.run(`UPDATE aa_posts SET ${postKeys.map(k=>k+'=?').join(',')} WHERE id=?`,[...Object.values(p),id]);}
          else id=(await tx.run(`INSERT INTO aa_posts(${postKeys.join(',')}) VALUES(${postKeys.map(()=>'?').join(',')})`,Object.values(p))).id;
          await tx.run('DELETE FROM aa_post_languages WHERE post_id=?',[id]);await tx.run('INSERT INTO aa_post_languages(post_id,language,updated_at) VALUES(?,?,?)',[id,p.type==='book'&&body.language==='ar'?'ar':'en',new Date().toISOString()]);
          if(p.type==='article'&&Object.hasOwn(body,'title_ar')){await tx.run('DELETE FROM aa_translations WHERE post_id=?',[id]);await tx.run('INSERT INTO aa_translations(post_id,title,subtitle,intro,body,ending,status) VALUES(?,?,?,?,?,?,?)',[id,...Object.values(translation),translationStatus]);}
        });section=p.type==='book'?'books':'articles';
      }else if(action==='delete_post'){
        await db.transaction(async tx=>{for(const [table,key] of [['aa_translations','post_id'],['aa_post_languages','post_id'],['aa_posts','id']])await tx.run(`DELETE FROM ${table} WHERE ${key}=?`,[Number(body.id)||0]);});
      }else if(action==='save_gallery'){
        if(!render.safeImage(String(body.image||''))||!String(body.title||'').trim()||!String(body.alt||'').trim())throw Error('Choose an image, title, and descriptive alt text.');
        await db.transaction(async tx=>{
          const values=[body.image,cut(body.title,200),cut(body.alt,500),cut(body.category,80),Math.trunc(Number(body.sort_order)||0)];let id=Number(body.id)||0;
          if(id)await tx.run('UPDATE aa_gallery SET image=?,title=?,alt=?,category=?,sort_order=? WHERE id=?',[...values,id]);else id=(await tx.run('INSERT INTO aa_gallery(image,title,alt,category,sort_order) VALUES(?,?,?,?,?)',values)).id;
          if(Object.hasOwn(body,'title_ar')){await tx.run('DELETE FROM aa_gallery_translations WHERE gallery_id=?',[id]);await tx.run('INSERT INTO aa_gallery_translations(gallery_id,title,alt,category) VALUES(?,?,?,?)',[id,cut(body.title_ar,200),cut(body.alt_ar,500),cut(body.category_ar,80)]);}
        });section='gallery';
      }else if(action==='delete_gallery'){
        await db.transaction(async tx=>{await tx.run('DELETE FROM aa_gallery_translations WHERE gallery_id=?',[Number(body.id)||0]);await tx.run('DELETE FROM aa_gallery WHERE id=?',[Number(body.id)||0]);});
      }else if(action==='save_pages'||action==='save_settings'){
        const keys=action==='save_pages'?['hero_title','hero_intro','about_title','about_body','work_body','hero_title_ar','hero_intro_ar','about_title_ar','about_body_ar','work_body_ar']:['name','tagline','contact_email','newsletter_intro','name_ar','tagline_ar','newsletter_intro_ar',...Object.keys(socialHosts).map(k=>'social_'+k)];
        for(const [key,hosts] of Object.entries(socialHosts))if(body['social_'+key]&&!validSocial(body['social_'+key],hosts))throw Error('Use a valid HTTPS social profile URL.');
        if(body.contact_email&&!emailValid(body.contact_email))throw Error('Use a valid contact email.');
        await db.transaction(async tx=>{for(const key of keys)if(Object.hasOwn(body,key))await set(tx,key,cut(body[key],key.includes('body')?50000:10000));});section=action==='save_pages'?'pages':'settings';
      }else if(action==='save_video'||action==='delete_video'){
        const current=JSON.parse((await db.all('SELECT setting_value FROM aa_settings WHERE setting_key=?',['watch_videos']))[0]?.setting_value||'[]');const index=Number(body.id);
        if(action==='delete_video')current.splice(index,1);
        else{const id=youtubeID(body.youtube_url||'');if(!id||!body.title||!render.safeImage(body.image||''))throw Error('Use a valid YouTube URL, title, and local poster image.');const video={id,title:cut(body.title,200),creator:cut(body.creator,100),description:cut(body.description,1000),image:body.image};if(index>=0){if(!current[index])throw Error('This video no longer exists.');current[index]=video;}else{if(current.length>=12)throw Error('Keep the collection to 12 videos or fewer.');current.push(video);}}
        await set(db,'watch_videos',JSON.stringify(current));section='videos';
      }else if(action==='upload'){
        if(!req.file)throw Error('Choose an image smaller than 8 MB.');
        const image=sharp(req.file.buffer,{limitInputPixels:20000000}),metadata=await image.metadata();
        if(!['png','jpeg','webp'].includes(metadata.format)||!metadata.width||!metadata.height||Math.max(metadata.width,metadata.height)>6000||metadata.pages>1)throw Error('Use PNG, JPEG, or WebP up to 6000 pixels per side and 20 megapixels.');
        await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.join(config.uploadDir,randomToken()+'.webp'));section='media';
      }else if(['read_message','delete_message','delete_subscriber'].includes(action)){
        const id=Number(body.id)||0;if(action==='read_message')await db.run('UPDATE aa_messages SET is_read=1 WHERE id=?',[id]);else await db.run('DELETE FROM '+(action==='delete_message'?'aa_messages':'aa_subscribers')+' WHERE id=?',[id]);
      }else if(action==='export'){
        const rows=await db.all("SELECT * FROM aa_subscribers WHERE status='active'");
        const csv=value=>'"'+String(/^[=+@\-\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
        res.type('csv').attachment('subscribers.csv').send('email,unsubscribe_url\n'+rows.map(s=>[s.email,config.publicURL+'/api/unsubscribe?token='+s.token].map(csv).join(',')).join('\n'));return;
      }else if(action==='password'){
        if(!await bcrypt.compare(String(body.current_password||''),req.admin.password_hash.replace(/^\$2y\$/,'$2b$'))||!passwordValid(String(body.new_password||''))||body.new_password!==body.confirm_password)throw Error('Check your current password and use a matching new password of 12 characters, up to 72 UTF-8 bytes.');
        const hash=await bcrypt.hash(body.new_password,12);await db.run('UPDATE aa_admins SET password_hash=? WHERE id=?',[hash,req.admin.id]);req.session.passwordVersion=hash;await guard.persist(req,res,true);section='account';
      }else throw Error('Unknown dashboard action.');
      res.redirect('/admin/?section='+section+'&saved=1');
    }catch(error){const message=error.code==='SQLITE_CONSTRAINT_UNIQUE'||error.code==='ER_DUP_ENTRY'?'That slug is already in use.':error.code||error.name==='SqlError'?'This change could not be saved.':error.message;res.status(422).send(await dashboard(req,section,message));}
  });
  router.get(['/','/index.php'],async(req,res)=>res.send(await dashboard(req,Object.hasOwn(navigation,req.query.section)?req.query.section:'overview')));

  function media(){return ['images','book-covers','uploads'].flatMap(folder=>{const dir=folder==='uploads'?config.uploadDir:path.join(config.dist,'assets',folder);return fs.readdirSync(dir).filter(name=>/\.(webp|png|jpg|jpeg)$/.test(name)&&!name.includes('-640.')).map(name=>'assets/'+folder+'/'+name);});}
  const imageSelect=value=>select('image','Photo, artwork, or book cover',['',...media()],value||'');
  const actionForm=(req,action,id,label)=>`<form method="post" ${action.startsWith('delete')?'data-confirm="Delete this item permanently?"':''}>${csrf(req.session)}<input type="hidden" name="action" value="${action}"><input type="hidden" name="id" value="${id}"><button class="secondary">${label}</button></form>`;
  async function dashboard(req,section,error=''){
    const data=await viewData(db,'en',arabic),s=data.settings;let main=req.query.saved?'<p class="notice">Saved. Your changes are applied.</p>':'';
    const form=(action,body,attributes='')=>`<form method="post" class="panel editor" ${attributes}>${csrf(req.session)}<input type="hidden" name="action" value="${action}">${body}<button>Save</button></form>`;
    if(section==='articles'||section==='books'){
      const type=section==='books'?'book':'article';
      if(req.query.new||req.query.edit){
        const post=data.all.find(p=>p.id===Number(req.query.edit))||{type,slug:'',title:'',status:'draft',published_at:new Date().toISOString().slice(0,10)};
        const bookLang=data.languages.get(post.id)||req.query.language||'en',translation=data.translations.get(post.id)||{};
        let fields=`<input type="hidden" name="type" value="${type}"><input type="hidden" name="id" value="${post.id||''}">`;
        if(type==='book')fields+=select('language','Bookshelf language',['en','ar'],bookLang);else fields+='<h2>English article text</h2>';
        fields+=field('title','Title',post.title)+field('slug','URL slug',post.slug)+select('status','Publication status',['draft','published'],post.status)+field('published_at','Publication date',post.published_at,'date')+field('category','Category',post.category)+field('author','Author',post.author)+imageSelect(post.image)+area('subtitle','Subtitle',post.subtitle,2)+area('intro','Opening paragraph',post.intro,4)+area('body','Article / summary',post.body,20);
        fields+='<p class="hint">Use blank lines for paragraphs, ## for headings, > for quotes, ![Caption](assets/images/file.webp) for images, and [youtube](https://www.youtube.com/watch?v=VIDEO_ID) for videos. HTML is shown as text.</p>';
        if(type==='book')fields+=area('ending','Ending / spoilers',post.ending,5)+field('source_url','Official source URL',post.source_url,'url')+field('isbn','ISBN',post.isbn);
        else fields+='<section class="translation-editor"><h2>Arabic version · النسخة العربية</h2><div dir="rtl" lang="ar">'+field('title_ar','العنوان',translation.title)+area('subtitle_ar','العنوان الفرعي',translation.subtitle,2)+area('intro_ar','المقدمة',translation.intro,4)+area('body_ar','نص المقال',translation.body,20)+'</div>'+select('translation_status','Arabic publication status',['draft','published'],translation.status||'draft')+'</section>';
        if(type==='book'&&bookLang==='ar')fields=fields.replace(/<(input|textarea)(?= name="(?:title|subtitle|category|author|intro|body|ending)")/g,'<$1 lang="ar" dir="rtl"');
        main+=form('save_post',fields,'data-post-editor');if(post.id)main+=`<a class="button secondary" href="/admin/preview?id=${post.id}&lang=${type==='book'?bookLang:'en'}" target="_blank" rel="noopener">Preview saved entry</a>`;
      }else{
        const rows=data.all.filter(p=>p.type===type);main+=`<div class="toolbar"><p>${rows.length} entries</p><a class="button" href="?section=${section}&new=1">+ New ${type}</a>${type==='book'?'<a class="button secondary" href="?section=books&new=1&language=ar">+ ملخص عربي</a>':''}</div><section class="panel">`+rows.map(p=>`<div class="list-row"><div><span class="badge">${escape(p.status)}</span><h3>${escape(p.title)}</h3><small>${escape(p.category)} · ${data.languages.get(p.id)||'en'}</small></div><div class="row-actions"><a href="?section=${section}&edit=${p.id}">Edit</a><a href="/admin/preview?id=${p.id}&lang=${data.languages.get(p.id)||'en'}">Preview</a>${actionForm(req,'delete_post',p.id,'Delete')}</div></div>`).join('')+'</section>';
      }
    }else if(section==='gallery'){
      const g=data.gallery.find(x=>x.id===Number(req.query.edit))||{},gt=(await db.all('SELECT * FROM aa_gallery_translations WHERE gallery_id=?',[g.id||0]))[0]||{};
      main+=form('save_gallery',`<input type="hidden" name="id" value="${g.id||''}">`+imageSelect(g.image)+field('title','Title',g.title)+field('alt','Describe the image — alt text',g.alt)+field('category','Category',g.category)+field('sort_order','Display order',g.sort_order||0,'number')+'<div dir="rtl" lang="ar">'+field('title_ar','العنوان بالعربية',gt.title)+field('alt_ar','وصف الصورة بالعربية',gt.alt)+field('category_ar','التصنيف بالعربية',gt.category)+'</div>');
      main+='<div class="media-grid">'+data.gallery.map(x=>`<article class="panel">${render.picture(x.image,x.alt)}<h3>${escape(x.title)}</h3><a href="?section=gallery&edit=${x.id}">Edit</a>${actionForm(req,'delete_gallery',x.id,'Remove')}</article>`).join('')+'</div>';
    }else if(section==='videos'){
      const videos=JSON.parse(s.watch_videos||'[]'),index=req.query.edit===undefined?-1:Number(req.query.edit),video=videos[index]||{};
      main+=form('save_video',`<input type="hidden" name="id" value="${index}">`+field('title','Title',video.title)+field('youtube_url','YouTube URL',video.id?'https://www.youtube.com/watch?v='+video.id:'','url')+field('creator','Creator',video.creator)+area('description','Why watch this?',video.description,3)+imageSelect(video.image));
      main+='<div class="media-grid">'+videos.map((v,i)=>`<article class="panel">${render.picture(v.image,v.title)}<h3>${escape(v.title)}</h3><a href="?section=videos&edit=${i}">Edit</a>${actionForm(req,'delete_video',i,'Remove')}</article>`).join('')+'</div>';
    }else if(section==='media'){
      main+=form('upload','<h2>Add a photo, artwork, or book cover</h2><p>PNG, JPEG, or WebP · Up to 8 MB.</p><input type="file" name="illustration" accept="image/png,image/jpeg,image/webp" required>','enctype="multipart/form-data"');
      main+='<div class="media-grid">'+media().map(file=>`<article class="panel">${render.picture(file,path.basename(file))}<small>${escape(file)}</small></article>`).join('')+'</div>';
    }else if(section==='pages'){
      let fields='';for(const suffix of ['', '_ar']){fields+=suffix?'<div dir="rtl" lang="ar"><h2>Arabic pages</h2>':'<h2>English pages</h2>';for(const key of ['hero_title','hero_intro','about_title','about_body','work_body'])fields+=key.includes('title')?field(key+suffix,key.replaceAll('_',' '),s[key+suffix]):area(key+suffix,key.replaceAll('_',' '),s[key+suffix]);if(suffix)fields+='</div>';}
      main+=form('save_pages',fields);
    }else if(section==='settings'){
      let fields='';for(const key of ['name','tagline','contact_email','newsletter_intro','name_ar','tagline_ar','newsletter_intro_ar',...Object.keys(socialHosts).map(k=>'social_'+k)])fields+=field(key,key.replaceAll('_',' '),s[key],key.startsWith('social_')?'url':key==='contact_email'?'email':'text');main+=form('save_settings',fields);
    }else if(section==='messages'){
      const messages=await db.all('SELECT * FROM aa_messages ORDER BY id DESC');main+=messages.map(m=>`<article class="panel message"><span class="badge">${m.is_read?'Read':'New'}</span><h2>${escape(m.name)}</h2><a href="mailto:${escape(m.email)}">${escape(m.email)}</a><small>${escape(m.created_at)}</small><p class="message-text">${escape(m.message)}</p><div class="row-actions">${actionForm(req,'read_message',m.id,'Mark read')}${actionForm(req,'delete_message',m.id,'Delete')}</div></article>`).join('')||'<section class="panel">No messages yet.</section>';
    }else if(section==='subscribers'){
      main+=actionForm(req,'export',0,'Export active subscribers');main+='<section class="panel">'+(await db.all('SELECT * FROM aa_subscribers ORDER BY id DESC')).map(s=>`<div class="list-row"><div><h3>${escape(s.email)}</h3><small>${escape(s.status)}</small></div>${actionForm(req,'delete_subscriber',s.id,'Delete')}</div>`).join('')+'</section>';
    }else if(section==='account')main+=form('password',field('current_password','Current password','','password')+field('new_password','New password — 12 characters, up to 72 UTF-8 bytes','','password')+field('confirm_password','Confirm new password','','password'));
    else if(section==='seo')main+='<section class="panel"><h2>Search visibility</h2><a href="/sitemap.xml">Page and image sitemap</a><p>English and Arabic pages include canonical URLs, language alternatives and structured data.</p></section>';
    else main+=`<section class="panel"><h2>Make room for your next idea.</h2><p>${data.all.filter(p=>p.type==='article').length} articles · ${data.all.filter(p=>p.type==='book').length} book summaries · ${data.gallery.length} gallery images</p><a class="button" href="?section=articles&new=1">Write an article</a></section>`;
    return shell(navigation[section],main,req,section,error);
  }
}
async function set(db,key,value){if((await db.all('SELECT setting_key FROM aa_settings WHERE setting_key=?',[key])).length)await db.run('UPDATE aa_settings SET setting_value=? WHERE setting_key=?',[value,key]);else await db.run('INSERT INTO aa_settings(setting_key,setting_value) VALUES(?,?)',[key,value]);}
const cut=(value,max)=>[...String(value??'').trim()].slice(0,max).join('');
const emailValid=email=>String(email).length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const passwordValid=password=>[...password].length>=12&&Buffer.byteLength(password)<=72;
function httpsURL(value){try{const u=new URL(value);return value.length<=500&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
