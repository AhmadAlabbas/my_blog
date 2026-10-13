"""Render the read-only design preview from sanitized PHP dashboard snapshots."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
out=root/'public'
(out/'admin').mkdir(exist_ok=True)
shutil.copyfile(root/'backend/admin/admin.css',out/'admin/admin.css')
for name in ['admin-preview.js','admin-preview-data.json']:
    shutil.copyfile(root/name,out/name)
nav=[('overview','Overview'),('articles','Articles'),('books','Book summaries'),('gallery','Gallery'),('videos','YouTube videos'),('media','Media library'),('pages','Home, About & Work'),('messages','Messages'),('subscribers','Subscribers'),('settings','Blog settings'),('seo','Search visibility'),('account','Account')]
links=''.join(f'<a id="{key}" href="#{key}" data-preview-nav="{key}">{label}</a>' for key,label in nav)
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Dashboard preview — Ahmad Alabbas</title><link rel="canonical" href="https://ahmadalabbas.com/admin-preview.html"><link rel="icon" href="favicon.svg?v=2"><link rel="stylesheet" href="arabic.css"><link rel="stylesheet" href="admin/admin.css"></head><body><aside class="sidebar"><a class="admin-brand" href="#overview"><span class="admin-logo">A</span><span>Ahmad Alabbas<small>Editorial workspace preview</small></span></a><nav aria-label="Dashboard preview">{links}</nav><a class="view-blog" href="index.html">View blog ↗</a></aside><main id="main" class="dashboard"><header class="dashboard-header"><div><p class="overline">Read-only design preview</p><h1>Your dashboard.</h1></div></header><p class="notice">Loading the preview. The working dashboard is installed on Hostinger.</p></main><script src="admin-preview.js" defer></script></body></html>'''
(out/'admin-preview.html').write_text(html)
