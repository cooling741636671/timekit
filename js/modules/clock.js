(function (TK) {
  const reduce = () => document.documentElement.classList.contains('reduce');

  function digitEl() {
    const el = document.createElement('div');
    el.className = 'digit';
    el.dataset.v = '';
    el.innerHTML =
      '<span class="face top base"><i>0</i></span>' +
      '<span class="face bottom base"><i>0</i></span>' +
      '<span class="face top leaf"><i>0</i></span>' +
      '<span class="face bottom leaf"><i>0</i></span>';
    return el;
  }

  function paint(el, ch) {
    el.querySelectorAll('i').forEach((node) => { node.textContent = ch; });
    el.dataset.v = ch;
    el.classList.remove('play');
  }

  function setDigit(el, ch, animate) {
    if (el.dataset.v === ch) return;
    const prev = el.dataset.v || ch;
    if (!animate || reduce() || !el.dataset.v) {
      paint(el, ch);
      return;
    }
    el.querySelector('.top.base i').textContent = ch;
    el.querySelector('.bottom.base i').textContent = prev;
    el.querySelector('.top.leaf i').textContent = prev;
    el.querySelector('.bottom.leaf i').textContent = ch;
    el.classList.remove('play');
    void el.offsetWidth;
    el.classList.add('play');
    el.dataset.v = ch;
    const done = (ev) => {
      if (!ev.animationName || ev.animationName.indexOf('flip') !== 0 && ev.animationName !== 'flipUp' && ev.animationName !== 'flipDown') return;
      if (ev.animationName !== 'flipUp') return;
      paint(el, ch);
      el.removeEventListener('animationend', done);
    };
    el.addEventListener('animationend', done);
  }

  function group(count) {
    const wrap = document.createElement('div');
    wrap.className = 'flaps';
    const digits = [];
    for (let i = 0; i < count; i++) {
      const d = digitEl();
      wrap.appendChild(d);
      digits.push(d);
    }
    return { wrap: wrap, digits: digits };
  }

  function mountFlip(host, opts) {
    const o = opts || {};
    host.classList.add('clock-nums');
    if (o.compact) host.classList.add('compact');
    host.setAttribute('aria-live', 'polite');
    const hh = group(2);
    const mm = group(2);
    const ss = group(2);
    const ms = group(2);
    const colon = () => {
      const s = document.createElement('span');
      s.className = 'colon';
      s.textContent = ':';
      return s;
    };
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = '.';
    host.append(hh.wrap, colon(), mm.wrap, colon(), ss.wrap);
    if (o.ms !== false) {
      const msWrap = document.createElement('div');
      msWrap.className = 'ms-group';
      msWrap.append(dot, ms.wrap);
      host.append(msWrap);
    }
    let lastSec = '';
    function setTime(date) {
      const p = TK.cnParts(date);
      const h = p.hour;
      const m = p.minute;
      const s = p.second;
      const cent = TK.pad(Math.floor(p.ms / 10));
      const animate = o.flip !== false;
      setDigit(hh.digits[0], h[0], animate);
      setDigit(hh.digits[1], h[1], animate);
      setDigit(mm.digits[0], m[0], animate);
      setDigit(mm.digits[1], m[1], animate);
      setDigit(ss.digits[0], s[0], animate);
      setDigit(ss.digits[1], s[1], animate);
      if (o.ms !== false) {
        setDigit(ms.digits[0], cent[0], false);
        setDigit(ms.digits[1], cent[1], false);
      }
      const stamp = h + m + s;
      if (lastSec && stamp !== lastSec && !reduce()) {
        host.classList.remove('pulse');
        void host.offsetWidth;
        host.classList.add('pulse');
      }
      lastSec = stamp;
      host.setAttribute('aria-label', '北京时间 ' + h + ':' + m + ':' + s);
    }
    return { setTime: setTime };
  }

  function mountAnalog(host) {
    host.innerHTML =
      '<svg class="analog" viewBox="0 0 200 200" role="img" aria-label="模拟表盘">' +
        '<circle cx="100" cy="100" r="96" fill="rgba(8,12,24,.55)" stroke="currentColor" stroke-opacity="0.35"/>' +
        '<g class="ticks"></g>' +
        '<g class="trail"></g>' +
        '<line class="hand h" x1="100" y1="100" x2="100" y2="58" stroke="var(--text)" stroke-width="3.5" stroke-linecap="round"/>' +
        '<line class="hand m" x1="100" y1="100" x2="100" y2="40" stroke="var(--text)" stroke-width="2.4" stroke-linecap="round"/>' +
        '<line class="hand s" x1="100" y1="112" x2="100" y2="28" stroke="var(--primary)" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="100" cy="100" r="3.5" fill="var(--primary)"/>' +
      '</svg>';
    const ticks = host.querySelector('.ticks');
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i / 60) * Math.PI * 2;
      const r1 = major ? 78 : 84;
      const r2 = 92;
      const x1 = 100 + Math.sin(a) * r1;
      const y1 = 100 - Math.cos(a) * r1;
      const x2 = 100 + Math.sin(a) * r2;
      const y2 = 100 - Math.cos(a) * r2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', major ? 'var(--text)' : 'var(--text-mute)');
      line.setAttribute('stroke-width', major ? '2' : '1');
      ticks.appendChild(line);
      if (major) {
        const num = i === 0 ? 12 : i / 5;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const rr = 68;
        text.setAttribute('x', 100 + Math.sin(a) * rr);
        text.setAttribute('y', 100 - Math.cos(a) * rr + 3);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = String(num);
        ticks.appendChild(text);
      }
    }
    const trail = host.querySelector('.trail');
    const dots = [];
    for (let i = 0; i < 5; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(4 - i * 0.5));
      c.setAttribute('fill', 'var(--primary)');
      c.setAttribute('opacity', String(0.75 - i * 0.14));
      trail.appendChild(c);
      dots.push(c);
    }
    const hour = host.querySelector('.h');
    const minute = host.querySelector('.m');
    const second = host.querySelector('.s');
    function hand(el, deg, len) {
      const a = deg * Math.PI / 180;
      el.setAttribute('x2', 100 + Math.sin(a) * len);
      el.setAttribute('y2', 100 - Math.cos(a) * len);
    }
    function setTime(date) {
      const p = TK.cnParts(date);
      const hh = Number(p.hour) % 12;
      const mm = Number(p.minute);
      const ss = Number(p.second) + date.getMilliseconds() / 1000;
      hand(hour, (hh + mm / 60) * 30, 46);
      hand(minute, (mm + ss / 60) * 6, 64);
      hand(second, ss * 6, 74);
      for (let i = 0; i < dots.length; i++) {
        const ang = (ss * 6 - i * 4) * Math.PI / 180;
        const r = 70 - i * 6;
        dots[i].setAttribute('cx', 100 + Math.sin(ang) * r);
        dots[i].setAttribute('cy', 100 - Math.cos(ang) * r);
      }
    }
    return { setTime: setTime };
  }

  let raf = 0;
  let mode = 'digital';

  function destroyed() { cancelAnimationFrame(raf); }

  TK.widgets = TK.widgets || {};
  TK.widgets.flip = mountFlip;
  TK.widgets.analog = mountAnalog;

  TK.modules = TK.modules || {};
  TK.modules.clock = {
    mount: function (root) {
      mode = sessionStorage.getItem('tk_clock_mode') || 'digital';
      root.innerHTML =
        '<section class="clock-page" data-mode="' + mode + '">' +
          '<div class="page-head"><div><h1>实时时钟</h1><p>北京时间 · 翻牌数字会在秒数变化时转动，辉光只亮一瞬间。</p></div>' +
          '<div class="tabs" role="tablist" aria-label="显示模式">' +
            '<button type="button" class="btn" data-mode="digital" role="tab">数字主导</button>' +
            '<button type="button" class="btn" data-mode="analog" role="tab">表盘主导</button>' +
            '<button type="button" class="btn" data-mode="minimal" role="tab">极简</button>' +
          '</div></div>' +
          '<div class="clock-layout card">' +
            '<div><div class="flip-host"></div><p class="hero-date"></p><p class="hero-date lunar-line"></p></div>' +
            '<div class="aside analog-host"></div>' +
          '</div>' +
          '<div class="heat" aria-hidden="true"></div>' +
        '</section>';
      const page = root.querySelector('.clock-page');
      const flip = mountFlip(root.querySelector('.flip-host'), { ms: true });
      const analog = mountAnalog(root.querySelector('.analog-host'));
      const heat = root.querySelector('.heat');
      for (let h = 0; h < 24; h++) {
        const cell = document.createElement('div');
        cell.className = 'heat-cell';
        cell.dataset.h = String(h);
        cell.innerHTML = '<span>' + h + '</span>';
        heat.appendChild(cell);
      }
      function syncTabs() {
        page.dataset.mode = mode;
        root.querySelectorAll('[data-mode]').forEach((btn) => {
          if (btn.tagName !== 'BUTTON') return;
          const on = btn.dataset.mode === mode;
          btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }
      syncTabs();
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-mode]');
        if (!btn || btn.tagName !== 'BUTTON') return;
        mode = btn.dataset.mode;
        sessionStorage.setItem('tk_clock_mode', mode);
        syncTabs();
      });
      const dateLine = root.querySelector('.hero-date');
      const lunarLine = root.querySelector('.lunar-line');
      function frame() {
        const now = new Date();
        flip.setTime(now);
        analog.setTime(now);
        const p = TK.cnParts(now);
        dateLine.textContent = p.year + '年' + Number(p.month) + '月' + Number(p.day) + '日 ' + p.week;
        const lunar = window.lunarOn ? lunarOn(p.key) : null;
        if (lunar) {
          lunarLine.textContent = lunar.lunar + ' · ' + (lunar.solarTerm ? lunar.solarTerm + '后第' + lunar.solarTermDiff + '天' : '') +
            (lunar.nextTerm ? ' · 距离' + lunar.nextTerm + ' ' + lunar.nextTermDiff + ' 天' : '');
        } else lunarLine.textContent = '农历暂无数据';
        const hour = Number(p.hour);
        heat.querySelectorAll('.heat-cell').forEach((cell) => {
          const i = Number(cell.dataset.h);
          const dist = Math.min(Math.abs(i - hour), 24 - Math.abs(i - hour));
          cell.style.setProperty('--lv', String(Math.max(0.08, 1 - dist / 10)));
          cell.classList.toggle('now', i === hour);
        });
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    },
    destroy: destroyed
  };
})(window.TK = window.TK || {});
