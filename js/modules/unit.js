(function (TK) {
  const CATS = {
    length: { name: '长度', base: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, um: 1e-6, in: 0.0254, ft: 0.3048, mi: 1609.344, nmi: 1852 } },
    weight: { name: '重量', base: 'kg', units: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, jin: 0.5 } },
    temp: { name: '温度', units: { C: 1, F: 1, K: 1 } },
    area: { name: '面积', base: 'm2', units: { m2: 1, km2: 1e6, cm2: 0.0001, ha: 10000, acre: 4046.8564224, ft2: 0.09290304 } },
    volume: { name: '体积', base: 'L', units: { L: 1, mL: 0.001, m3: 1000, gal: 3.785411784, floz: 0.0295735295625 } },
    speed: { name: '速度', base: 'mps', units: { mps: 1, kmh: 1 / 3.6, mph: 0.44704, knot: 0.514444 } },
    time: { name: '时间', base: 's', units: { s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, week: 604800 } },
    data: { name: '数据量', base: 'B', units: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 } }
  };
  const LABELS = {
    m: '米', km: '千米', cm: '厘米', mm: '毫米', um: '微米', in: '英寸', ft: '英尺', mi: '英里', nmi: '海里',
    kg: '千克', g: '克', mg: '毫克', t: '吨', lb: '磅', oz: '盎司', jin: '斤',
    C: '摄氏度', F: '华氏度', K: '开尔文',
    m2: '平方米', km2: '平方千米', cm2: '平方厘米', ha: '公顷', acre: '英亩', ft2: '平方英尺',
    L: '升', mL: '毫升', m3: '立方米', gal: '加仑', floz: '液盎司',
    mps: '米/秒', kmh: '千米/时', mph: '英里/时', knot: '节',
    s: '秒', ms: '毫秒', min: '分钟', h: '小时', d: '天', week: '周',
    B: '字节', KB: 'KB', MB: 'MB', GB: 'GB', TB: 'TB'
  };

  function fromTemp(v, u) {
    if (u === 'C') return v;
    if (u === 'F') return (v - 32) * 5 / 9;
    return v - 273.15;
  }
  function toTemp(c, u) {
    if (u === 'C') return c;
    if (u === 'F') return c * 9 / 5 + 32;
    return c + 273.15;
  }
  function convert(cat, value, from) {
    const spec = CATS[cat];
    if (cat === 'temp') {
      const c = fromTemp(value, from);
      const out = {};
      Object.keys(spec.units).forEach((u) => { out[u] = toTemp(c, u); });
      return out;
    }
    const base = value * spec.units[from];
    const out = {};
    Object.keys(spec.units).forEach((u) => { out[u] = base / spec.units[u]; });
    return out;
  }
  function fmt(n) {
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs < 0.0001 || abs >= 1e8)) return n.toExponential(6);
    return String(Math.round(n * 1e8) / 1e8);
  }

  TK.modules = TK.modules || {};
  TK.modules.unit = {
    mount: function (el) {
      const recent = TK.storage.get('tk_unit_recent', []);
      el.innerHTML =
        '<div class="page-head"><div><h1>单位换算</h1><p>输入后 80ms 刷新。温度走公式，不用查表。</p></div></div>' +
        '<div class="card"><div class="row">' +
          '<label class="field">类别<select data-cat>' + Object.keys(CATS).map((k) => '<option value="' + k + '">' + CATS[k].name + '</option>').join('') + '</select></label>' +
          '<label class="field">数值<input data-value inputmode="decimal" value="1"></label>' +
          '<label class="field">从<select data-from></select></label></div>' +
          '<div data-recent class="row" style="margin-top:8px"></div>' +
          '<div class="grid" data-out style="margin-top:12px"></div></div>';
      const catEl = el.querySelector('[data-cat]');
      const fromEl = el.querySelector('[data-from]');
      const valEl = el.querySelector('[data-value]');
      function fillFrom() {
        const units = Object.keys(CATS[catEl.value].units);
        fromEl.innerHTML = units.map((u) => '<option value="' + u + '">' + (LABELS[u] || u) + '</option>').join('');
      }
      function paintRecent() {
        const list = TK.storage.get('tk_unit_recent', []);
        el.querySelector('[data-recent]').innerHTML = list.map((r, i) =>
          '<button type="button" class="btn" data-recent-i="' + i + '">' + CATS[r.category].name + ' ' + r.value + '</button>'
        ).join('');
      }
      const run = TK.debounce(() => {
        const cat = catEl.value;
        const value = Number(valEl.value);
        const from = fromEl.value;
        if (!Number.isFinite(value)) return;
        const out = convert(cat, value, from);
        el.querySelector('[data-out]').innerHTML = Object.keys(out).map((u) =>
          '<div class="metric"><small>' + TK.escapeHtml(LABELS[u] || u) + '</small><b>' + TK.escapeHtml(fmt(out[u])) + '</b>' +
          '<button type="button" class="btn" data-copy="' + TK.escapeHtml(fmt(out[u])) + '">复制</button></div>'
        ).join('');
        if (el.dataset.dirty === '1') {
          const rec = TK.storage.get('tk_unit_recent', []).filter((r) => !(r.category === cat && r.from === from && String(r.value) === String(value)));
          rec.unshift({ category: cat, from: from, to: from, value: value });
          TK.storage.set('tk_unit_recent', rec.slice(0, 5));
          el.dataset.dirty = '0';
          paintRecent();
        }
      }, 80);
      fillFrom();
      paintRecent();
      run();
      el.addEventListener('input', () => { el.dataset.dirty = '1'; if (document.activeElement === catEl) fillFrom(); run(); });
      el.addEventListener('change', (e) => { if (e.target === catEl) { fillFrom(); run(); } });
      el.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) TK.copy(copyBtn.dataset.copy);
        const recBtn = e.target.closest('[data-recent-i]');
        if (recBtn) {
          const item = TK.storage.get('tk_unit_recent', [])[Number(recBtn.dataset.recentI)];
          if (!item) return;
          catEl.value = item.category;
          fillFrom();
          fromEl.value = item.from;
          valEl.value = item.value;
          run();
        }
      });
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
