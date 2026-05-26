(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, n) => a + (b - a) * n;

  // ===== PRELOADER =====
  const pre = $('#pre'), counterEl = $('#counter'), barFill = $('#barFill'), dotsEl = $('#dots');
  let count = 0;
  const dotsTimer = setInterval(() => {
    dotsEl.textContent = '.'.repeat((count % 4) + 1).padEnd(3,'\u00a0');
  }, 180);
  const tick = setInterval(() => {
    count += Math.max(1, Math.round((100 - count) / 14));
    if (count >= 100) { count = 100; clearInterval(tick); clearInterval(dotsTimer); }
    counterEl.textContent = String(count).padStart(2, '0');
    barFill.style.width = count + '%';
    if (count === 100) setTimeout(finish, 380);
  }, 60);

  function finish(){
    pre.classList.add('gone');
    document.body.classList.add('ready');
    pre.addEventListener('transitionend', () => pre.remove(), { once: true });
  }

  // ===== CUSTOM CURSOR =====
  const cur = $('#cur'), curDot = $('#curDot');
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let cx = mx, cy = my, dx = mx, dy = my;
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  function rafCur(){
    cx = lerp(cx, mx, 0.18); cy = lerp(cy, my, 0.18);
    dx = lerp(dx, mx, 0.55); dy = lerp(dy, my, 0.55);
    cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    curDot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
    requestAnimationFrame(rafCur);
  }
  rafCur();
  // hover state
  function bindCursor(el){
    const mode = el.dataset.cursor;
    el.addEventListener('mouseenter', () => {
      cur.classList.remove('hover','text');
      cur.classList.add(mode);
      cur.dataset.label = el.dataset.label || '';
    });
    el.addEventListener('mouseleave', () => {
      cur.classList.remove('hover','text');
      cur.dataset.label = '';
    });
  }
  $$('[data-cursor]').forEach(bindCursor);

  // ===== CLOCKS =====
  function tickClock(){
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset()*60000;
    const cot = new Date(utc - 5*60*60000);
    const hh = String(cot.getHours()).padStart(2,'0');
    const mm = String(cot.getMinutes()).padStart(2,'0');
    const ss = String(cot.getSeconds()).padStart(2,'0');
    const str = `${hh}:${mm}:${ss} COT`;
    const a = $('#clock'); if (a) a.textContent = str;
    const b = $('#clock2'); if (b) b.textContent = str;
  }
  tickClock(); setInterval(tickClock, 1000);

  // ===== NAV SCROLLED =====
  const navEl = $('#nav');
  window.addEventListener('scroll', () => {
    navEl.classList.toggle('scrolled', window.scrollY > 32);
  }, { passive: true });

  // ===== REVEAL =====
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('in');
        // split h2 inside sec-head
        if (e.target.matches('.reveal')) {
          splitOnce(e.target);
        }
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));

  function splitOnce(el){
    if (el.dataset.split) return;
    el.dataset.split = '1';
  }

  // ===== DRAWING ANIMATIONS — re-trigger on hover =====
  // (handled purely by CSS via :hover → animation)

  // ===== COUNTERS =====
  const statsBlock = $('#stats');
  let statsAnimated = false;
  const statsIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !statsAnimated){
        statsAnimated = true;
        $$('[data-count]', statsBlock).forEach(el => {
          const target = parseFloat(el.dataset.count);
          const dec = parseInt(el.dataset.decimals || '0', 10);
          const suffix = el.dataset.suffix || '';
          const start = performance.now();
          const dur = 1600;
          function frame(now){
            const t = Math.min(1, (now - start)/dur);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = target * eased;
            el.textContent = v.toFixed(dec) + suffix;
            if (t < 1) requestAnimationFrame(frame);
            else el.textContent = target.toFixed(dec) + suffix;
          }
          requestAnimationFrame(frame);
        });
        statsIO.disconnect();
      }
    });
  }, { threshold: 0.35 });
  statsIO.observe(statsBlock);

  // ===== PROCESS pinned tracker =====
  const procSteps = $$('.proc-step');
  const procNo = $('#procNo');
  const procTitle = $('#procTitle');
  const procDur = $('#procDur');
  const procBar = $('#procBar');
  const procIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        const s = e.target;
        const stepNum = s.dataset.step;
        procNo.textContent = '0' + stepNum;
        procTitle.innerHTML = s.dataset.title;
        procDur.textContent = s.dataset.dur;
        procBar.style.width = (25 * parseInt(stepNum,10)) + '%';
      }
    });
  }, { threshold: 0.5, rootMargin: '-20% 0px -30% 0px' });
  procSteps.forEach(s => procIO.observe(s));

  // ===== MOBILE MENU =====
  const burger = $('#navBurger'), mobileMenu = $('#mobileMenu');
  if (burger && mobileMenu){
    const setMenu = (open) => {
      burger.classList.toggle('open', open);
      mobileMenu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
    $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1100) setMenu(false); });
  }

  // ===== ANIMATED FAVICON (logo redraw loop, same draft effect as Logo Lab) =====
  (function favicon(){
    const link = $('#favicon');
    if (!link || !window.requestAnimationFrame || !window.Path2D) return;
    const SVGNS = 'http://www.w3.org/2000/svg';
    const shapes = [
      'M75,32 L902,308 L870,732 L278,732 Z M210,203 L802,401 L804,676 L740,680 L308,532 Z',
      'M52,25 L259,732 L52,731 Z',
      'M225,219 L792,408 L794,487 L252,307 Z',
      'M793,519 L794,665 L763,669 L762,659 Z',
      'M925,317 L966,329 L970,338 L969,732 L889,730 L921,331 Z'
    ];
    // measure path lengths via a detached-but-rendered svg
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;');
    document.body.appendChild(svg);
    const paths = shapes.map(d => {
      const el = document.createElementNS(SVGNS, 'path');
      el.setAttribute('d', d); svg.appendChild(el);
      return { p: new Path2D(d), len: el.getTotalLength() || 1 };
    });
    svg.remove();
    const total = paths.reduce((s, o) => s + o.len, 0);

    const SIZE = 64, cv = document.createElement('canvas');
    cv.width = cv.height = SIZE;
    const ctx = cv.getContext('2d');
    const scale = SIZE / 996, offY = (SIZE - 749 * scale) / 2;

    const DRAW = 2400, HOLD = 1000, FADE = 600, CYCLE = DRAW + HOLD + FADE, FRAME = 1000 / 15;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let start = null, last = 0;

    function render(now){
      requestAnimationFrame(render);
      if (document.hidden) { start = null; return; }
      if (start === null) start = now;
      if (now - last < FRAME) return;
      last = now;
      const t = (now - start) % CYCLE;
      let alpha = 1, prog = 1;
      if (t < DRAW) prog = ease(t / DRAW);
      else if (t >= DRAW + HOLD) alpha = 1 - (t - DRAW - HOLD) / FADE;

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.translate(0, offY); ctx.scale(scale, scale);
      ctx.lineWidth = 16; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = '#c2632e';
      ctx.globalAlpha = Math.max(0, alpha);
      let target = prog * total, acc = 0;
      for (const o of paths){
        const vis = Math.min(Math.max(target - acc, 0), o.len);
        acc += o.len;
        if (vis <= 0) continue;
        ctx.setLineDash([o.len, o.len]);
        ctx.lineDashOffset = o.len - vis;
        ctx.stroke(o.p);
      }
      ctx.restore();
      link.type = 'image/png';
      link.href = cv.toDataURL('image/png');
    }
    requestAnimationFrame(render);
  })();

  // ===== HERO H1 ready trigger (in case body class not added before paint) =====
  window.addEventListener('load', () => setTimeout(() => document.body.classList.add('ready'), 50));
})();
