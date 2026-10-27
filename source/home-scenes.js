'use strict';
// Original moving illustrations. No video download, third-party player, or visitor data.
(() => {
  const root = document.querySelector('.home-cinema');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const control = root.querySelector('[data-story-motion]');
  const arabic = document.documentElement.lang === 'ar';
  const tau = Math.PI * 2;
  let paused = false, frameRequest = 0, lastFrame = 0, elapsed = 0;
  const policyOff = () => reduced.matches || Boolean(connection?.saveData);
  const texture = document.createElement('canvas');
  texture.width = texture.height = 128;
  const textureContext = texture.getContext('2d');
  let randomSeed = 97;
  const random = () => { randomSeed = (randomSeed * 16807) % 2147483647; return randomSeed / 2147483647; };
  if (textureContext) {
    for (let n = 0; n < 2300; n++) {
      textureContext.fillStyle = n % 3 ? '#70472d' : '#fffdf1';
      textureContext.globalAlpha = .12 + random() * .18;
      textureContext.fillRect(random() * 128, random() * 128, .4 + random(), .4 + random());
    }
  }

  const states = [...root.querySelectorAll('[data-story-canvas]')].map(canvas => {
    const context = canvas.getContext('2d', {alpha: false});
    if (!context) return null;
    canvas.setAttribute('aria-hidden', 'true');
    return {canvas, context, type: canvas.dataset.storyCanvas, width: 0, height: 0, visible: false, frames: 0, pattern: context.createPattern(texture, 'repeat')};
  }).filter(Boolean);
  if (!states.length) return;

  function path(ctx, draw, fill, stroke, width = 1) {
    ctx.beginPath(); draw(ctx);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function circle(ctx, x, y, radius, fill, stroke, width = 1) {
    path(ctx, c => c.arc(x, y, radius, 0, tau), fill, stroke, width);
  }
  function shadow(ctx, opacity = .16, blur = 25, offset = 15) {
    ctx.shadowColor = `rgba(78,38,18,${opacity})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offset;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = ctx.shadowOffsetY = 0; }
  function curvePoint(points, fraction) {
    const v = 1 - fraction;
    return {
      x: v ** 3 * points[0][0] + 3 * v ** 2 * fraction * points[1][0] + 3 * v * fraction ** 2 * points[2][0] + fraction ** 3 * points[3][0],
      y: v ** 3 * points[0][1] + 3 * v ** 2 * fraction * points[1][1] + 3 * v * fraction ** 2 * points[2][1] + fraction ** 3 * points[3][1]
    };
  }
  function bezier(ctx, points, stroke, width) {
    path(ctx, c => { c.moveTo(...points[0]); c.bezierCurveTo(...points[1], ...points[2], ...points[3]); }, null, stroke, width);
  }
  function ground(ctx, y, width = 280) {
    ctx.save(); ctx.scale(1, .22);
    const gradient = ctx.createRadialGradient(0, y / .22, 5, 0, y / .22, width);
    gradient.addColorStop(0, '#5f38242b'); gradient.addColorStop(1, '#5f382400');
    circle(ctx, 0, y / .22, width, gradient); ctx.restore();
  }

  function studio(ctx, time) {
    const drift = Math.sin(time * .32) * 8;
    ground(ctx, 243, 315);
    // The sun and fine orbital lines frame the paper sculpture.
    const sun = ctx.createRadialGradient(95, -94, 5, 90, -60, 190);
    sun.addColorStop(0, '#f4c981'); sun.addColorStop(1, '#d58c50');
    circle(ctx, 90, -60, 179, sun);
    ctx.save(); ctx.translate(90, -60); ctx.rotate(-.35 + Math.sin(time * .12) * .03); ctx.scale(1.35, .55);
    circle(ctx, 0, 0, 214, null, '#aa6c424d', 1.5);
    circle(ctx, 0, 0, 238, null, '#aa6c4235', 1);
    ctx.restore();

    // A fan of folded sheets, each with its own soft edge and cast shadow.
    for (let sheet = 5; sheet >= 0; sheet--) {
      const bend = Math.sin(time * .43 + sheet * .42) * (8 + sheet * 1.5);
      ctx.save(); ctx.translate(-8 + sheet * 9, 35 + sheet * 9 + drift);
      ctx.rotate(-.27 + sheet * .075 + Math.sin(time * .22) * .018);
      shadow(ctx, .11, 20, 11);
      const paper = ctx.createLinearGradient(-190, -70, 200, 120);
      paper.addColorStop(0, sheet % 2 ? '#f9eed4' : '#fff7e7');
      paper.addColorStop(.64, sheet % 2 ? '#ede0bd' : '#f4e7cb');
      paper.addColorStop(1, '#ccb38c');
      path(ctx, c => {
        c.moveTo(-232, -57);
        c.bezierCurveTo(-98, -138 - bend, 35, -32 + bend, 222, -103);
        c.lineTo(245, 112);
        c.bezierCurveTo(67, 195, -86, 70, -218, 171);
        c.closePath();
      }, paper, '#b5956d55', 1);
      noShadow(ctx);
      bezier(ctx, [[-219, 166], [-87, 67], [75, 193], [242, 110]], '#b89a7770', 1.3);
      if (sheet === 0) {
        for (let line = 0; line < 6; line++) {
          const offset = line * 19;
          bezier(ctx, [[-180, 10 + offset], [-68, -48 + offset], [30, 48 + offset], [175, -7 + offset]], '#8f755342', 1.1);
        }
        ctx.save(); ctx.translate(-140, -13); ctx.rotate(-.1);
        circle(ctx, 0, 0, 7, '#b75d3e'); circle(ctx, 22, 0, 7, '#b7994d'); circle(ctx, 44, 0, 7, '#7f8060');
        ctx.restore();
      }
      ctx.restore();
    }
    // An ink-like orbit sweeps around the stacked sheets.
    bezier(ctx, [[-284, 127], [-308, -106], [233, -198], [306, -18]], '#9d604970', 1.1);
    const orbit = curvePoint([[-284, 127], [-308, -106], [233, -198], [306, -18]], (time * .025 + .38) % 1);
    circle(ctx, orbit.x, orbit.y, 5, '#875d42');
    ctx.save(); ctx.translate(233, 135 + drift * .4); ctx.rotate(-.2 + Math.sin(time * .17) * .05);
    path(ctx, c => { c.moveTo(-6, -54); c.lineTo(6, -54); c.lineTo(6, 64); c.lineTo(0, 82); c.lineTo(-6, 64); c.closePath(); }, '#a65a3c');
    path(ctx, c => { c.moveTo(-6, 64); c.lineTo(0, 82); c.lineTo(6, 64); c.closePath(); }, '#e7c9a4');
    path(ctx, c => { c.moveTo(-2, 76); c.lineTo(0, 82); c.lineTo(2, 76); }, '#4e3f2e');
    ctx.restore();
  }

  function signals(ctx, time) {
    ground(ctx, 245, 325);
    // A copper disc gives the signal field a tangible, sculptural center.
    const disk = ctx.createLinearGradient(-220, -210, 240, 230);
    disk.addColorStop(0, '#c6714c'); disk.addColorStop(.5, '#ac503c'); disk.addColorStop(1, '#6e4132');
    shadow(ctx, .19, 38, 23);
    circle(ctx, 0, 0, 230, disk);
    noShadow(ctx);
    circle(ctx, 0, 0, 230, null, '#e9c29499', 1.2);
    ctx.save(); ctx.rotate(-.33);
    for (let line = 0; line < 29; line++) {
      const y = (line - 14) * 12.6;
      const amplitude = 65 + Math.cos((line - 14) * .095) * 50;
      const shift = Math.sin(time * .37 + line * .14) * 10;
      const points = [[-275, y * .58], [-100, y - amplitude + shift], [100, y + amplitude + shift], [275, y * .58]];
      const high = line % 4 === 0;
      bezier(ctx, points, high ? '#edc08d' : '#d8946e', high ? 2.3 : 1.05);
      // Terminal pads are fixed; the warm lights pass through the curves.
      circle(ctx, points[0][0], points[0][1], high ? 3.5 : 2, '#edc08d');
      circle(ctx, points[3][0], points[3][1], high ? 3.5 : 2, '#edc08d');
      if (line % 3 === 0) {
        const progress = (time * (.065 + (line % 4) * .004) + line * .078 + .17) % 1;
        const point = curvePoint(points, progress);
        ctx.shadowColor = '#ffe3a2'; ctx.shadowBlur = 14;
        circle(ctx, point.x, point.y, 3.8, '#fff0c4');
        noShadow(ctx);
      }
    }
    ctx.restore();
    // Fine concentric diagrams sit behind a slower outer orbit.
    ctx.save(); ctx.rotate(time * .025);
    for (let ring = 0; ring < 3; ring++) {
      const radius = 252 + ring * 20;
      path(ctx, c => c.arc(0, 0, radius, -.15 + ring * .5, Math.PI * 1.22 + ring * .2), null, '#8b4d3748', .9);
      const angle = ring * 1.9;
      circle(ctx, Math.cos(angle) * radius, Math.sin(angle) * radius, 3.3, '#9e6549');
    }
    ctx.restore();
    const wave = [];
    for (let x = -300; x <= 300; x += 4) wave.push([x, 102 + Math.sin(x * .023 + time * .65) * 20]);
    path(ctx, c => { c.moveTo(...wave[0]); wave.slice(1).forEach(point => c.lineTo(...point)); }, null, '#fae1b6a6', 1.8);
  }

  function reading(ctx, time) {
    const breath = Math.sin(time * .35) * 5;
    ground(ctx, 218, 335);
    // Behind the book: a quiet halo, like late-afternoon light through a window.
    const glow = ctx.createRadialGradient(50, -62, 25, 50, -62, 255);
    glow.addColorStop(0, '#e3b46b9c'); glow.addColorStop(1, '#e3b46b00');
    circle(ctx, 50, -62, 255, glow);
    ctx.save(); ctx.translate(0, 25 + breath); ctx.rotate(-.055);
    shadow(ctx, .18, 30, 20);
    // Cloth-bound cover underneath the paper, edged with a warm cream spine.
    path(ctx, c => {
      c.moveTo(-275, -68); c.quadraticCurveTo(-142, -108, 0, -30);
      c.quadraticCurveTo(142, -112, 275, -71); c.lineTo(281, 159);
      c.quadraticCurveTo(140, 135, 0, 191); c.quadraticCurveTo(-138, 138, -282, 159); c.closePath();
    }, '#6e7560', '#535d4999', 2);
    noShadow(ctx);
    for (let page = 8; page >= 0; page--) {
      const depth = page * 2.8;
      const curl = Math.sin(time * .38 + page * .18) * (3 + page * .45);
      const paper = ctx.createLinearGradient(-250, -70, 210, 180);
      paper.addColorStop(0, '#fff4d9'); paper.addColorStop(.47, '#f4e4bc'); paper.addColorStop(.5, '#cfb88e'); paper.addColorStop(.54, '#f8eacb'); paper.addColorStop(1, '#e3cda5');
      path(ctx, c => {
        c.moveTo(0, -46 - depth);
        c.bezierCurveTo(-87, -115 - depth - curl, -195, -126 - depth, -260, -78 - depth);
        c.lineTo(-264, 140 - depth);
        c.bezierCurveTo(-175, 110 - depth, -80, 127 - depth, 0, 176 - depth);
        c.bezierCurveTo(82, 127 - depth, 177, 113 - depth, 264, 139 - depth);
        c.lineTo(261, -79 - depth);
        c.bezierCurveTo(188, -127 - depth, 88, -118 - depth + curl, 0, -46 - depth);
        c.closePath();
      }, paper, '#b79c7280', .7);
    }
    // Short lines follow the curvature of the open pages; the illustration stays language-neutral.
    for (let row = 0; row < 9; row++) {
      const y = -61 + row * 16;
      bezier(ctx, [[-223, y - 14], [-163, y - 43], [-88, y - 21], [-28, y + 20]], '#90734d40', 1);
      bezier(ctx, [[28, y + 20], [90, y - 21], [162, y - 43], [223, y - 14]], '#90734d40', 1);
    }
    // A leaf lifts slowly above the book, offering continuous motion rather than a page-flip effect.
    const lift = 40 + Math.sin(time * .38) * 19;
    ctx.save(); shadow(ctx, .12, 17, 15);
    const leaf = ctx.createLinearGradient(0, -170, 220, 30);
    leaf.addColorStop(0, '#fff7e0'); leaf.addColorStop(1, '#e4cca0');
    path(ctx, c => {
      c.moveTo(0, -66); c.bezierCurveTo(72, -122 - lift, 118, -175 - lift, 198, -158 - lift);
      c.bezierCurveTo(206, -85, 154, 25, 19, 119);
      c.bezierCurveTo(8, 51, 5, -10, 0, -66); c.closePath();
    }, leaf, '#c8ae8055', .8);
    noShadow(ctx);
    for (let line = 0; line < 5; line++) bezier(ctx, [[24 + line * 3, -49 + line * 20], [91, -104 - lift + line * 16], [128, -123 - lift + line * 17], [177, -129 - lift + line * 17]], '#98784935', 1);
    ctx.restore();
    // A terracotta ribbon and its loose tail settle across the lower page edge.
    path(ctx, c => { c.moveTo(14, 102); c.bezierCurveTo(28, 160, 22, 183, 42, 222); c.lineTo(50, 209); c.lineTo(63, 211); c.bezierCurveTo(39, 165, 44, 142, 34, 100); c.closePath(); }, '#b76d4d');
    ctx.restore();
  }

  function render(state) {
    const {context: ctx, width, height, type} = state;
    if (!width || !height) return;
    const colors = type === 'signals' ? ['#ead4b8', '#d99b76'] : type === 'reading' ? ['#f0e6cc', '#e8cf9f'] : ['#f0dfc8', '#e6b38d'];
    ctx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
    const background = ctx.createLinearGradient(0, 0, width, height * .7);
    background.addColorStop(0, colors[0]); background.addColorStop(1, colors[1]);
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    const mobile = width < 720;
    const scale = mobile ? Math.min(width / 700, height / 500) : Math.min(width / 1250, height / 750);
    ctx.save();
    ctx.translate(mobile ? width * .5 : width * .725, mobile ? height * .49 : height * .49);
    ctx.scale(scale, scale);
    if (type === 'signals') signals(ctx, elapsed);
    else if (type === 'reading') reading(ctx, elapsed);
    else studio(ctx, elapsed);
    ctx.restore();
    if (state.pattern) { ctx.globalAlpha = .29; ctx.fillStyle = state.pattern; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
    state.canvas.dataset.frame = String(++state.frames);
  }
  function resize(state) {
    const rect = state.canvas.getBoundingClientRect();
    const width = Math.round(rect.width), height = Math.round(rect.height);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    if (width === state.width && height === state.height && ratio === state.ratio) return;
    state.width = width; state.height = height; state.ratio = ratio;
    state.canvas.width = Math.max(1, Math.round(width * ratio));
    state.canvas.height = Math.max(1, Math.round(height * ratio));
    render(state);
  }
  function running(state) { return !paused && !policyOff() && !document.hidden && state.visible; }
  function tick(now) {
    frameRequest = 0;
    // A media policy can become observable before its change event arrives.
    // Synchronize controls/classes before stopping the final animation frame.
    if (!states.some(running)) { lastFrame = 0; sync(); return; }
    if (!lastFrame || now - lastFrame >= 1000 / 30) {
      if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, .08);
      lastFrame = now;
      states.filter(running).forEach(render);
    }
    frameRequest = requestAnimationFrame(tick);
  }
  function sync() {
    const stopped = paused || policyOff();
    root.classList.toggle('is-paused', stopped || document.hidden);
    root.classList.toggle('is-motion-ready', !policyOff());
    if (control) {
      control.hidden = false;
      control.disabled = policyOff();
      control.setAttribute('aria-pressed', String(stopped));
      control.textContent = policyOff() ? (arabic ? 'الحركة متوقفة' : 'Motion off') : paused ? (arabic ? 'استأنف الحركة' : 'Resume motion') : (arabic ? 'أوقف الحركة' : 'Pause motion');
      control.setAttribute('aria-label', control.textContent);
    }
    states.forEach(state => { state.canvas.dataset.motionState = !state.visible || document.hidden ? 'offscreen' : stopped ? 'paused' : 'running'; });
    if (states.some(running) && !frameRequest) frameRequest = requestAnimationFrame(tick);
    else if (!states.some(running) && frameRequest) { cancelAnimationFrame(frameRequest); frameRequest = 0; lastFrame = 0; }
  }
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(entries => {
    for (const entry of entries) { const state = states.find(item => item.canvas === entry.target); if (state) resize(state); }
  }) : null;
  states.forEach(state => {
    resize(state);
    const rect = state.canvas.getBoundingClientRect();
    state.visible = rect.bottom > 0 && rect.top < innerHeight;
    resizeObserver?.observe(state.canvas);
  });
  if (!resizeObserver) window.addEventListener('resize', () => states.forEach(resize), {passive: true});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { const state = states.find(item => item.canvas === entry.target); if (state) state.visible = entry.isIntersecting; });
      sync();
    }, {threshold: .01});
    states.forEach(state => observer.observe(state.canvas));
  }
  control?.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { if (frameRequest) cancelAnimationFrame(frameRequest); frameRequest = 0; lastFrame = 0; });
  window.addEventListener('pageshow', sync);
  sync();
})();
