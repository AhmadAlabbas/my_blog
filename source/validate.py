"""Validate the deployable pages, links, fragments, and asset references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re,json,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent/'public'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=set();self.h1=0;self.titles=0;self.canon=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='title':self.titles+=1
  if tag=='link' and a.get('rel')=='canonical':self.canon+=1
  for k in ['src','href','poster']:
   if a.get(k):self.refs.append(a[k])
  if a.get('srcset'):self.refs += [s.strip().split()[0] for s in a['srcset'].split(',')]
pages={}
for p in root.rglob('*.html'):
 d=Page();d.feed(p.read_text());pages[p.relative_to(root).as_posix()]=d
errors=[];count=0
for name,d in pages.items():
 if d.h1!=1 or d.titles!=1 or d.canon!=1:errors.append(f'{name}: heading/title/canonical invalid')
 for ref in d.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  count+=1
  target=unquote(u.path).lstrip('/') or name
  if target=='ar/':target='ar/index.html'
  if u.path=='/':target='index.html'
  file=root/target
  if not file.is_file():errors.append(f'{name}: missing {ref}')
  if u.fragment and target in pages and u.fragment not in pages[target].ids:errors.append(f'{name}: bad fragment {ref}')
for file in root.rglob('*'):
 if file.is_file() and file.stat().st_size==0:errors.append(f'Empty asset: {file}')
for css in root.rglob('*.css'):
 for ref in re.findall(r'url\(["\']?([^)"\']+)',css.read_text()):
  if not ref.startswith('data:') and not (css.parent/ref).is_file():errors.append(f'{css}: missing {ref}')
ET.parse(root/'sitemap.xml')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; {count} local links/asset references; all fragments; stylesheet URLs; no empty files; valid sitemap.')
