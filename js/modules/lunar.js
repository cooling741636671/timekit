(function (TK) {
  let root = null;
  let cursor = null;

  function keyOf(y, m) { return y + '-' + TK.pad(m); }
  function shift(delta) {
    const d = new Date(cursor.y, cursor.m - 1 + delta, 1);
    cursor = { y: d.getFullYear(), m: d.getMonth() + 1 };
    draw();
  }
  function draw() {
    if (!root) return;
    const p = TK.cnParts(new Date());
    const today = lunarOn(p.key);
    const head = root.querySelector('[data-today]');
    if (!today) {
      head.innerHTML = '<div class="empty"><div class="hourglass"></div><p>暂无数据</p><p class="hint">农历表覆盖 2026-01-01 至 2030-12-31。</p></div>';
    } else {
      head.innerHTML = '<h2 style="font-size:2rem">' + TK.escapeHtml(today.lunar) + '</h2>' +
        '<p>' + TK.escapeHtml(today.ganzhi) + ' · 生肖' + TK.escapeHtml(today.zodiac) + '</p>' +
        '<p class="hint">节气 ' + TK.escapeHtml(today.solarTerm || '—') + '，距上一节气 ' + today.solarTermDiff + ' 天 / 距下一节气 ' +
        TK.escapeHtml(today.nextTerm || '—') + ' ' + today.nextTermDiff + ' 天</p>';
    }
    const year = cursor.y;
    const terms = (window.SOLAR_TERMS_2026_2030 || []).filter((t) => t.date.slice(0, 4) === String(year));
    const line = root.querySelector('[data-terms]');
    if (!terms.length) line.innerHTML = '<p class="hint">这一年的节气暂无数据</p>';
    else {
      const todayKey = p.key;
      line.innerHTML = terms.map((t) => {
        const idx = terms.indexOf(t);
        const next = terms[idx + 1];
        const now = t.date <= todayKey && (!next || todayKey < next.date);
        return '<div class="term-node' + (now ? ' now' : '') + '"><b>' + TK.escapeHtml(t.name) + '</b><div>' +
          TK.escapeHtml(t.date.slice(5)) + '</div><div>' + TK.escapeHtml(t.time) + '</div></div>';
      }).join('');
    }
    root.querySelector('[data-label]').textContent = cursor.y + '年' + cursor.m + '月';
    const first = new Date(cursor.y, cursor.m - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const days = TK.daysInMonth(cursor.y, cursor.m);
    const cells = ['一', '二', '三', '四', '五', '六', '日'].map((n) => '<div class="hd">' + n + '</div>');
    for (let i = 0; i < startPad; i++) cells.push('<div></div>');
    for (let d = 1; d <= days; d++) {
      const key = cursor.y + '-' + TK.pad(cursor.m) + '-' + TK.pad(d);
      const lunar = lunarOn(key);
      const off = window.HOLIDAY_OFF && HOLIDAY_OFF[key];
      const work = window.HOLIDAY_WORK && HOLIDAY_WORK[key];
      const cls = ['day', key === p.key ? 'today' : '', off ? 'off' : '', work ? 'onwork' : ''].filter(Boolean).join(' ');
      const sub = lunar ? lunar.lunar.replace(/^[^月]+月/, lunar.lunar.endsWith('初一') ? lunar.lunar : '') : '—';
      const show = lunar ? (lunar.lunar.endsWith('初一') || (lunar.solarTermDiff === 0) ? lunar.lunar : lunar.lunar.replace(/^.*?月/, '')) : '暂无';
      const term = lunar && lunar.solarTermDiff === 0 ? lunar.solarTerm : '';
      cells.push('<div class="' + cls + '"><b>' + d + '</b><small>' + TK.escapeHtml(show) + (term ? ' ' + TK.escapeHtml(term) : '') +
        (off ? ' 休' : '') + (work ? ' 班' : '') + '</small></div>');
    }
    root.querySelector('[data-cal]').innerHTML = cells.join('');
  }

  TK.modules = TK.modules || {};
  TK.modules.lunar = {
    mount: function (el) {
      root = el;
      const p = TK.cnParts(new Date());
      cursor = { y: Number(p.year), m: Number(p.month) };
      el.innerHTML =
        '<div class="page-head"><div><h1>农历与节气</h1><p>干支月按节气切换，生肖按春节切换。节气钟点是寿星公式的近似值。</p></div></div>' +
        '<div class="card" data-today></div>' +
        '<h2 style="margin:18px 0 8px;font-size:1rem">全年节气</h2><div class="term-line" data-terms></div>' +
        '<div class="row" style="margin:16px 0 8px"><button type="button" class="btn" data-nav="-1">上个月</button>' +
        '<strong data-label></strong><button type="button" class="btn" data-nav="1">下个月</button></div>' +
        '<div class="cal" data-cal></div>';
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-nav]');
        if (!btn) return;
        shift(Number(btn.dataset.nav));
      });
      draw();
    },
    destroy: function () { root = null; }
  };
})(window.TK = window.TK || {});
