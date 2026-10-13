"""Original vector artwork and exhibition components, shared by the static build."""
from html import escape as e
from urllib.parse import urlsplit
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
ICONS={'YouTube': '<path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z"/>', 'LinkedIn': '<path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>', 'X': '<path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>', 'Instagram': '<path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>'}
HOSTS={'YouTube':['youtube.com','www.youtube.com'],'LinkedIn':['linkedin.com','www.linkedin.com'],'X':['x.com','www.x.com','twitter.com','www.twitter.com'],'Instagram':['instagram.com','www.instagram.com']}
def social_icons(links):
    values={x['label']:x.get('url','') for x in links}
    out='<div class="site-socials" aria-label="Social profiles">'
    for name,body in ICONS.items():
        svg='<svg viewBox="0 0 16 16" aria-hidden="true">'+body+'</svg>'
        url=values.get(name,'');u=urlsplit(url)
        if u.scheme=='https' and u.hostname in HOSTS[name] and not u.username and not u.password:
            out+=f'<a href="{e(url)}" aria-label="Ahmad on {name}" title="{name}" target="_blank" rel="noopener noreferrer">{svg}</a>'
        else:out+=f'<span class="social-unconfigured" role="img" aria-label="{name} profile link coming soon" title="{name} · Profile link coming soon">{svg}</span>'
    return out+'</div>'
ARTS={
'drawing':('A line finds its way.','An animated ink drawing of mountains, a sun, and flowing contours','<path d="M70 305 200 145 330 305 440 185 575 305M80 325Q250 280 540 330" fill="none" stroke="#29251f" stroke-width="3"/><circle cx="455" cy="105" r="35" fill="#e5b34f"/>'),
'waves':('Signals, in conversation.','An animated weave of indigo and ochre wave lines','<path d="M50 230Q130 100 210 230T370 230T530 230" fill="none" stroke="#193f52" stroke-width="7"/><path d="M50 180Q130 310 210 180T370 180T530 180" fill="none" stroke="#be7440" stroke-width="3"/>'),
'orbit':('Ideas find a connection.','An animated geometric composition of orbiting circles and connections','<ellipse cx="320" cy="210" rx="210" ry="100" fill="none" stroke="#91b1a2"/><circle cx="320" cy="210" r="50" fill="#234b41"/><circle cx="520" cy="230" r="23" fill="#edac6a"/><circle cx="130" cy="170" r="17" fill="#8d77ae"/>'),
'mobile':('A little balance.','An animated hanging mobile of colored geometric shapes','<path d="M320 35V100M170 110 450 85M190 110V240M410 90V190" fill="none" stroke="#252522" stroke-width="3"/><circle cx="190" cy="270" r="38" fill="#ac4055"/><path d="m380 190 70 10-20 60-65-10z" fill="#d7a83c"/>')}
def living_art(kind):
    title,alt,drawing=ARTS[kind]
    return f'<figure class="living-art art-{kind}" data-artwork="{kind}"><div class="living-stage" role="img" aria-label="{e(alt)}"><svg class="living-poster" viewBox="0 0 640 400" aria-hidden="true">{drawing}</svg><canvas width="1280" height="800" aria-hidden="true" hidden></canvas></div><figcaption><div><small>Moving study / Original digital artwork</small><span>{e(title)}</span></div><button type="button" data-artwork-toggle hidden>Pause</button></figcaption></figure>'
VIDEO_SVGS={
'spUNpyF58BY':'<rect width="640" height="360" fill="#e6edf1"/><path d="M40 210Q110 90 180 210T320 210T460 210T600 210" stroke="#214354" fill="none" stroke-width="14"/><path d="M40 160Q110 280 180 160T320 160T460 160T600 160" stroke="#bd7d40" fill="none" stroke-width="4"/>',
'aircAruvnKk':'<rect width="640" height="360" fill="#e9eee4"/><g stroke="#8fa591" stroke-width="3"><path d="m145 110 170 60 180-90M145 110 170 130 180-30M145 250l170-80 180-90M145 250l170-10 180-30M315 170l180 110M315 240l180 40"/></g><g fill="#285847"><circle cx="145" cy="110" r="23"/><circle cx="145" cy="250" r="23"/><circle cx="315" cy="170" r="23"/><circle cx="315" cy="240" r="23"/></g><g fill="#ca864b"><circle cx="495" cy="80" r="23"/><circle cx="495" cy="210" r="23"/><circle cx="495" cy="280" r="23"/></g>',
'WUvTyaaNkzM':'<rect width="640" height="360" fill="#f1e7da"/><path d="M100 265V100M100 265H540" fill="none" stroke="#575349" stroke-width="3"/><path d="M120 250Q300 250 500 70" fill="none" stroke="#a76c40" stroke-width="9"/><path d="m280 237 130-90" stroke="#88769d" stroke-width="4"/><circle cx="345" cy="192" r="12" fill="#88769d"/>'}
def video_poster(id):
    body=VIDEO_SVGS.get(id,VIDEO_SVGS['spUNpyF58BY'])
    return '<svg viewBox="0 0 640 360" aria-hidden="true">'+body+'</svg>'
def write_vectors():
    for name,body in ICONS.items():
        p=ROOT/'assets/social'/(name.lower()+'.svg');p.parent.mkdir(exist_ok=True);p.write_text('<svg viewBox="0 0 16 16" aria-hidden="true">'+body+'</svg>')
    for id,body in VIDEO_SVGS.items():
        p=ROOT/'assets/video-posters'/(id+'.svg');p.parent.mkdir(exist_ok=True);p.write_text('<svg viewBox="0 0 640 360" aria-hidden="true">'+body+'</svg>')
