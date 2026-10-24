(function (TK) {
  const GROUPS = [
    { label: '时间类', items: [
      ['clock', '实时时钟', '翻牌数字与霓虹表盘', 'clock'],
      ['worldclock', '世界时钟', '十二个时区与昼夜', 'world'],
      ['countdown', '倒计时', '剩余时间、暂停与提醒', 'timer'],
      ['stopwatch', '秒表', '分段计次与快捷键', 'stopwatch'],
      ['pomodoro', '番茄钟', '专注循环与本周统计', 'pomodoro'],
      ['datecalc', '日期计算', '日差、加减与星座', 'calendar'],
      ['lunar', '农历节气', '干支、节气与月历', 'moon'],
      ['holiday', '节假日', '法定假期与农历节日', 'gift']
    ]},
    { label: '效率类', items: [
      ['unit', '单位换算', '八类单位即时转换', 'exchange'],
      ['color', '颜色工具', '色彩转换与对比度', 'palette'],
      ['password', '密码生成', '熵值强度与一键复制', 'key'],
      ['text', '文本处理', '统计、转换与 Base64', 'text'],
      ['qrcode', '二维码', '生成并下载 PNG', 'qrcode']
    ]},
    { label: '开发者', items: [
      ['json', 'JSON', '格式化、校验与折叠', 'code'],
      ['regex', '正则', '高亮匹配与常用规则', 'regex'],
      ['hash', '哈希', 'MD5 与 SHA 系列', 'hash'],
      ['markdown', 'Markdown', '分栏预览与导出', 'markdown']
    ]}
  ];
  const ALL = GROUPS.flatMap((g) => g.items.map((it) => ({ id: it[0], name: it[1], desc: it[2], icon: it[3], group: g.label })));
  const PY = {
    '首': 's', '页': 'y', '实': 's', '时': 's', '钟': 'z', '世': 's', '界': 'j', '倒': 'd', '计': 'j',
    '秒': 'm', '表': 'b', '番': 'f', '茄': 'q', '日': 'r', '期': 'q', '农': 'n', '历': 'l', '节': 'j',
    '气': 'q', '假': 'j', '单': 'd', '位': 'w', '换': 'h', '算': 's', '颜': 'y', '色': 's', '工': 'g',
    '具': 'j', '密': 'm', '码': 'm', '生': 's', '成': 'c', '文': 'w', '本': 'b', '处': 'c', '理': 'l',
    '二': 'e', '维': 'w', '正': 'z', '则': 'z', '哈': 'h', '希': 'x', '新': 'x', '建': 'j', '切': 'q',
    '霓': 'n', '虹': 'h', '极': 'j', '简': 'j', '暗': 'a', '夜': 'y', '搜': 's', '索': 's', '主': 'z',
    '题': 't', '跟': 'g', '随': 's', '系': 'x', '统': 't', '深': 's', '收': 's', '藏': 'c'
  };
  function initials(text) {
    return Array.from(text).map((ch) => PY[ch] || (/[a-z0-9]/i.test(ch) ? ch.toLowerCase() : '')).join('');
  }

  const THEME_KEY = 'tk_theme';
  function themeSaved() {
    return Object.assign({ mode: 'neon', primary: '#38f9d7', autoDark: true, followSystem: false }, TK.storage.get(THEME_KEY, {}));
  }
  function effectiveTheme(t) {
    let mode = t.mode || 'neon';
    if (t.followSystem) mode = matchMedia('(prefers-color-scheme: light)').matches ? 'minimal' : 'neon';
    const hour = new Date().getHours();
    if (t.autoDark && (hour >= 22 || hour < 7) && mode === 'minimal') mode = 'midnight';
    return mode;
  }
  function applyTheme() {
    const t = themeSaved();
    document.documentElement.setAttribute('data-theme', effectiveTheme(t));
    document.documentElement.style.setProperty('--primary', t.primary || '#38f9d7');
  }

  function favs() {
    const list = TK.storage.get('tk_favorites', []);
    return Array.isArray(list) ? list : [];
  }
  function toggleFav(id) {
    const list = favs();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
    TK.storage.set('tk_favorites', list);
    return list;
  }

  let homeRaf = 0;
  let topTimer = 0;
  let paletteIndex = 0;
  let paletteItems = [];

  function findItem(id) { return ALL.find((it) => it.id === id); }

  function cardHTML(it, pressed) {
    return '<article class="card tool-card" data-id="' + it.id + '">' +
      '<button type="button" class="star" data-fav="' + it.id + '" aria-pressed="' + (pressed ? 'true' : 'false') + '" aria-label="' + (pressed ? '取消收藏' : '收藏') + TK.escapeHtml(it.name) + '">' +
      TK.icon(pressed ? 'star-fill' : 'star') + '</button>' +
      '<a class="tool-link" href="#/' + it.id + '"><span class="tool-ico">' + TK.icon(it.icon) + '</span><h3>' + TK.escapeHtml(it.name) + '</h3><p>' + TK.escapeHtml(it.desc) + '</p><span class="open">打开 →</span></a></article>';
  }

  function renderHome(view) {
    const p0 = TK.cnParts(new Date());
    const lunar = window.lunarOn ? lunarOn(p0.key) : null;
    view.innerHTML =
      '<section><div class="flip-host"></div><p class="hero-date" data-sub></p>' +
      '<div class="stat-grid">' +
        '<div class="metric"><small data-ny-label>距离元旦</small><b data-ny>0</b></div>' +
        '<div class="metric"><small>距离春节</small><b data-spring>0</b></div>' +
        '<div class="metric"><small data-week-label>距离周末</small><b data-week>0</b></div>' +
        '<div class="metric"><small>今日已过去</small><div class="row"><b data-pct>0%</b>' +
        '<svg width="54" height="54" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>' +
        '<circle data-ring cx="18" cy="18" r="15" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-dasharray="94.248" stroke-dashoffset="94.248" transform="rotate(-90 18 18)"/></svg></div></div>' +
      '</div><div data-favs></div><div class="grid" data-all></div></section>';
    const flip = TK.widgets.flip(view.querySelector('.flip-host'), { ms: true });
    const sub = view.querySelector('[data-sub]');
    function paint() {
      const now = new Date();
      flip.setTime(now);
      const p = TK.cnParts(now);
      const row = window.lunarOn ? lunarOn(p.key) : null;
      sub.textContent = '北京时间 · ' + p.year + '年' + Number(p.month) + '月' + Number(p.day) + '日 ' + p.week + ' · ' + (row ? row.lunar : '农历暂无数据');
      const year = Number(p.year);
      const nyKey = (p.key < year + '-01-01' ? year : (p.key === year + '-01-01' ? year : year + 1)) + '-01-01';
      view.querySelector('[data-ny-label]').textContent = '距离 ' + nyKey.slice(0, 4) + ' 元旦';
      view.querySelector('[data-ny]').textContent = daySpan(p.key, nyKey) + ' 天';
      let spring = '暂无数据';
      if (window.LUNAR_2026_2030) {
        const hit = LUNAR_2026_2030.find((r) => r.date >= p.key && r.lunar === '正月初一');
        spring = hit ? daySpan(p.key, hit.date) + ' 天' : '暂无数据';
      }
      view.querySelector('[data-spring]').textContent = spring;
      const dow = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))).getUTCDay();
      if (dow === 6 || dow === 0) {
        view.querySelector('[data-week-label]').textContent = '周末进行中';
        view.querySelector('[data-week]').textContent = (dow === 6 ? 2 : 1) + ' 天后周一';
      } else {
        view.querySelector('[data-week-label]').textContent = '距离周末';
        view.querySelector('[data-week]').textContent = (6 - dow) + ' 天';
      }
      const passed = (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second) + p.ms / 1000) / 86400;
      view.querySelector('[data-pct]').textContent = (passed * 100).toFixed(1) + '%';
      view.querySelector('[data-ring]').setAttribute('stroke-dashoffset', String(94.248 * (1 - passed)));
      homeRaf = requestAnimationFrame(paint);
    }
    paint();
    const favHost = view.querySelector('[data-favs]');
    const allHost = view.querySelector('[data-all]');
    function grids() {
      const loved = favs();
      favHost.innerHTML = loved.length ? '<h2 class="group-title">收藏</h2><div class="grid">' + loved.map((id) => findItem(id)).filter(Boolean).map((it) => cardHTML(it, true)).join('') + '</div>' : '';
      allHost.innerHTML = GROUPS.map((g) => '<h2 class="group-title">' + g.label + '</h2>' + g.items.map((it) => cardHTML({ id: it[0], name: it[1], desc: it[2], icon: it[3] }, loved.includes(it[0]))).join('')).join('');
    }
    grids();
    view.onclick = (e) => {
      const btn = e.target.closest('[data-fav]');
      if (!btn) return;
      e.preventDefault();
      toggleFav(btn.dataset.fav);
      grids();
    };
    return function () { cancelAnimationFrame(homeRaf); };
  }

  function daySpan(from, to) {
    return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
  }

  function navHTML() {
    const home = '<a class="nav-link" href="#/" data-route="home">' + TK.icon('clock') + '首页</a>';
    return home + GROUPS.map((g) => '<div class="nav-label">' + g.label + '</div>' + g.items.map((it) =>
      '<a class="nav-link" href="#/' + it[0] + '" data-route="' + it[0] + '">' + TK.icon(it[3]) + TK.escapeHtml(it[1]) + '</a>'
    ).join('')).join('');
  }
  function tabHTML() {
    const home = '<a href="#/" data-route="home">' + TK.icon('clock') + '首页</a>';
    return home + ALL.map((it) => '<a href="#/' + it.id + '" data-route="' + it.id + '">' + TK.icon(it.icon) + TK.escapeHtml(it.name.slice(0, 4)) + '</a>').join('');
  }

  function setTitle(name) {
    const item = findItem(name);
    const base = item ? item.name + ' · TimeKit' : 'TimeKit · 时光工具箱';
    const expired = TK.countdown && TK.countdown.anyExpired && TK.countdown.anyExpired();
    document.title = expired ? '(已到期) ' + base : base;
  }

  function markNav(name) {
    document.querySelectorAll('[data-route]').forEach((a) => {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  const commands = [{ name: '首页', desc: '回到时间主页', hash: '#/', py: 'sy' }]
    .concat(ALL.map((it) => ({ name: it.name, desc: it.desc, hash: '#/' + it.id, py: initials(it.name) })))
    .concat([
      { name: '新建倒计时', desc: '打开倒计时并聚焦标题', hash: '#/countdown?new=1', py: 'xjdjs' },
      { name: '生成密码', desc: '按当前规则生成并复制', hash: '#/password?gen=1', py: 'scmm' },
      { name: '霓虹主题', desc: '切换到霓虹', hash: '', py: 'nhzt', theme: 'neon' },
      { name: '极简主题', desc: '切换到浅色极简', hash: '', py: 'jjzt', theme: 'minimal' },
      { name: '暗夜主题', desc: '切换到灰阶暗夜', hash: '', py: 'ayzt', theme: 'midnight' }
    ]);

  function openPalette() {
    const box = document.getElementById('palette');
    box.hidden = false;
    const input = box.querySelector('input');
    input.value = '';
    filterPalette('');
    input.focus();
  }
  function closePalette() {
    document.getElementById('palette').hidden = true;
  }
  function filterPalette(q) {
    const query = q.trim().toLowerCase();
    paletteItems = commands.filter((c) => {
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query) || (c.py || '').includes(query) || initials(c.name).includes(query);
    });
    paletteIndex = 0;
    const list = document.querySelector('#palette .palette-list');
    list.innerHTML = paletteItems.map((c, i) =>
      '<button type="button" data-i="' + i + '" aria-selected="' + (i === 0 ? 'true' : 'false') + '"><strong>' + TK.escapeHtml(c.name) + '</strong><span class="hint">' + TK.escapeHtml(c.desc) + '</span></button>'
    ).join('') || '<p class="hint" style="padding:12px">没有匹配的工具</p>';
  }
  function runPalette(item) {
    closePalette();
    if (!item) return;
    if (item.theme) {
      const t = themeSaved();
      t.mode = item.theme;
      t.followSystem = false;
      TK.storage.set(THEME_KEY, t);
      applyTheme();
      TK.toast('已切换主题', 'success');
      return;
    }
    location.hash = item.hash;
  }

  function startParticles() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    const dots = [];
    let w = 0, h = 0, mx = -9999, my = -9999, raf = 0;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function reset() {
      dots.length = 0;
      for (let i = 0; i < 70; i++) dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45 });
    }
    function step() {
      if (document.hidden || document.documentElement.classList.contains('reduce') || document.documentElement.getAttribute('data-theme') === 'minimal') {
        raf = requestAnimationFrame(step);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#38f9d7';
      dots.forEach((p) => {
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 140) { p.vx += (dx / dist) * 0.35; p.vy += (dy / dist) * 0.35; }
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
          if (d < 130) {
            ctx.globalAlpha = (1 - d / 130) * 0.35;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(dots[i].x, dots[i].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }
    resize(); reset();
    window.addEventListener('resize', () => { resize(); reset(); });
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });
    raf = requestAnimationFrame(step);
  }

  function bindChrome() {
    document.querySelector('.sidebar').innerHTML = navHTML();
    document.querySelector('.tabbar').innerHTML = tabHTML();
    document.querySelector('[data-search]').addEventListener('click', openPalette);
    document.querySelector('[data-settings]').addEventListener('click', () => {
      const panel = document.getElementById('settings');
      panel.hidden = !panel.hidden;
      if (!panel.hidden) fillSettings();
    });
    document.getElementById('settings').addEventListener('change', onSettings);
    document.getElementById('settings').addEventListener('click', (e) => {
      const sw = e.target.closest('[data-swatch]');
      if (!sw) return;
      const t = themeSaved();
      t.primary = sw.dataset.swatch;
      TK.storage.set(THEME_KEY, t);
      applyTheme();
    });
    document.getElementById('palette').addEventListener('input', (e) => filterPalette(e.target.value));
    document.getElementById('palette').addEventListener('click', (e) => {
      if (e.target.id === 'palette') { closePalette(); return; }
      const btn = e.target.closest('[data-i]');
      if (btn) runPalette(paletteItems[Number(btn.dataset.i)]);
    });
    document.addEventListener('keydown', (e) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
      const palette = document.getElementById('palette');
      if (!palette.hidden) {
        if (e.key === 'Escape') { closePalette(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          paletteIndex = (paletteIndex + (e.key === 'ArrowDown' ? 1 : -1) + paletteItems.length) % Math.max(1, paletteItems.length);
          document.querySelectorAll('#palette [data-i]').forEach((btn, i) => btn.setAttribute('aria-selected', i === paletteIndex ? 'true' : 'false'));
          return;
        }
        if (e.key === 'Enter') { e.preventDefault(); runPalette(paletteItems[paletteIndex]); return; }
      }
      if (e.key === 'Escape') return;
      const handler = TK.router.keyHandler();
      if (handler) handler(e);
    });
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
    document.addEventListener('pointerdown', () => TK.primeAudio());
    const tickTop = () => {
      const p = TK.cnParts(new Date());
      const node = document.querySelector('[data-top-clock]');
      if (node) node.textContent = p.hour + ':' + p.minute + ':' + p.second;
    };
    tickTop();
    topTimer = setInterval(tickTop, 1000);
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
    setInterval(applyTheme, 60000);
  }

  function fillSettings() {
    const t = themeSaved();
    const panel = document.getElementById('settings');
    panel.querySelector('[data-mode]').value = t.mode;
    panel.querySelector('[data-auto]').checked = !!t.autoDark;
    panel.querySelector('[data-system]').checked = !!t.followSystem;
    panel.querySelector('[data-color]').value = t.primary;
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((res) => {
        const used = res.usage || 0;
        const quota = res.quota || 0;
        panel.querySelector('[data-quota]').textContent = '存储已用 ' + (used / 1048576).toFixed(2) + ' MB / ' + (quota / 1048576).toFixed(0) + ' MB';
      }).catch(() => { panel.querySelector('[data-quota]').textContent = '无法估算存储用量'; });
    }
  }
  function onSettings(e) {
    const t = themeSaved();
    const panel = document.getElementById('settings');
    t.mode = panel.querySelector('[data-mode]').value;
    t.autoDark = panel.querySelector('[data-auto]').checked;
    t.followSystem = panel.querySelector('[data-system]').checked;
    t.primary = panel.querySelector('[data-color]').value;
    TK.storage.set(THEME_KEY, t);
    applyTheme();
  }

  function boot() {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => document.documentElement.classList.toggle('reduce', motion.matches);
    syncMotion();
    motion.addEventListener('change', syncMotion);
    applyTheme();
    bindChrome();
    startParticles();
    if (TK.countdown) TK.countdown.boot();
    const view = document.getElementById('view');
    TK.router.start((info) => {
      const known = info.name === 'home' || TK.modules[info.name];
      const name = known ? info.name : 'missing';
      view.classList.remove('view-in');
      void view.offsetWidth;
      view.classList.add('view-in');
      if (name === 'home') {
        const stop = renderHome(view);
        TK.router.setCleanup(stop);
      } else if (name === 'missing') {
        view.innerHTML = '<div class="empty card"><div class="hourglass"></div><p>没有这个工具</p><a class="btn primary" href="#/">回首页</a></div>';
      } else {
        TK.modules[info.name].mount(view, info.query);
        TK.router.setCleanup(() => TK.modules[info.name].destroy && TK.modules[info.name].destroy());
      }
      markNav(name === 'missing' ? '' : name);
      setTitle(name === 'home' || name === 'missing' ? 'home' : name);
    });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    const dev = location.hostname === 'localhost' || location.search.indexOf('dev=1') >= 0;
    if (dev && window.PerformanceObserver) {
      try {
        let n = 0;
        const po = new PerformanceObserver((list) => {
          n += list.getEntries().length;
          console.log('[timekit] longtask', n);
        });
        po.observe({ entryTypes: ['longtask'] });
      } catch (err) { /* 浏览器不支持 longtask */ }
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window.TK = window.TK || {});
