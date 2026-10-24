(function (TK) {
  const ZODIAC = [
    [1, 20, '水瓶座'], [2, 19, '双鱼座'], [3, 21, '白羊座'], [4, 20, '金牛座'],
    [5, 21, '双子座'], [6, 22, '巨蟹座'], [7, 23, '狮子座'], [8, 23, '处女座'],
    [9, 23, '天秤座'], [10, 24, '天蝎座'], [11, 23, '射手座'], [12, 22, '摩羯座']
  ];

  function parse(value) {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  function weekName(date) { return TK.WEEK[date.getDay()]; }
  function signOf(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    let name = '摩羯座';
    ZODIAC.forEach((row) => { if (m > row[0] || (m === row[0] && d >= row[1])) name = row[2]; });
    return name;
  }
  function isoWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }
  function dayOfYear(date) {
    return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86400000) + 1;
  }
  function ymdBetween(a, b) {
    let y = b.getFullYear() - a.getFullYear();
    let m = b.getMonth() - a.getMonth();
    let d = b.getDate() - a.getDate();
    if (d < 0) {
      m -= 1;
      d += TK.daysInMonth(b.getMonth() === 0 ? b.getFullYear() - 1 : b.getFullYear(), b.getMonth() === 0 ? 12 : b.getMonth());
    }
    if (m < 0) { y -= 1; m += 12; }
    const days = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
    return { y: y, m: m, d: d, days: days };
  }
  function covered(date) {
    return typeof holidayYearCovered === 'function' && holidayYearCovered(TK.iso(date));
  }
  function isWorkday(date) {
    const key = TK.iso(date);
    if (typeof HOLIDAY_WORK !== 'undefined' && HOLIDAY_WORK[key]) return true;
    if (typeof HOLIDAY_OFF !== 'undefined' && HOLIDAY_OFF[key]) return false;
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }
  function workdaysBetween(a, b) {
    const step = a <= b ? 1 : -1;
    let n = 0;
    const cursor = new Date(a);
    while (TK.iso(cursor) !== TK.iso(b)) {
      cursor.setDate(cursor.getDate() + step);
      if (isWorkday(cursor)) n += 1;
    }
    return n;
  }
  function addWorkdays(date, n) {
    const out = new Date(date);
    let left = Math.abs(n);
    const step = n >= 0 ? 1 : -1;
    while (left > 0) {
      out.setDate(out.getDate() + step);
      if (isWorkday(out)) left -= 1;
    }
    return out;
  }
  function addByUnit(date, n, unit) {
    const out = new Date(date);
    if (unit === 'day') out.setDate(out.getDate() + n);
    else if (unit === 'week') out.setDate(out.getDate() + n * 7);
    else if (unit === 'month') {
      const day = out.getDate();
      out.setDate(1);
      out.setMonth(out.getMonth() + n);
      out.setDate(Math.min(day, TK.daysInMonth(out.getFullYear(), out.getMonth() + 1)));
    } else if (unit === 'year') {
      const day = out.getDate();
      out.setFullYear(out.getFullYear() + n);
      out.setDate(Math.min(day, TK.daysInMonth(out.getFullYear(), out.getMonth() + 1)));
    } else return addWorkdays(date, n);
    return out;
  }
  function metrics(items) {
    return '<div class="stat-grid">' + items.map((it) =>
      '<div class="metric"><small>' + TK.escapeHtml(it[0]) + '</small><b>' + TK.escapeHtml(it[1]) + '</b><small class="explain">' + TK.escapeHtml(it[2] || '') + '</small></div>'
    ).join('') + '</div>';
  }

  TK.modules = TK.modules || {};
  TK.modules.datecalc = {
    mount: function (el) {
      const today = TK.todayKey();
      el.innerHTML =
        '<div class="page-head"><div><h1>日期计算</h1><p>工作日按周一至周五，并扣掉节假日、加上调休上班。节假日数据含调休，以官方为准。</p></div></div>' +
        '<div class="tabs" role="tablist">' +
          '<button type="button" class="btn" data-tab="diff" role="tab" aria-selected="true">日期差</button>' +
          '<button type="button" class="btn" data-tab="add" role="tab">日期加减</button>' +
          '<button type="button" class="btn" data-tab="info" role="tab">日期信息</button></div>' +
        '<div class="card" style="margin-top:12px" data-panel="diff"><div class="row">' +
          '<label class="field">起始<input type="date" data-a value="' + today + '"></label>' +
          '<label class="field">结束<input type="date" data-b value="' + today + '"></label></div><div data-out></div></div>' +
        '<div class="card" style="margin-top:12px" data-panel="add" hidden><div class="row">' +
          '<label class="field">日期<input type="date" data-base value="' + today + '"></label>' +
          '<label class="field">数值<input type="number" data-n value="10"></label>' +
          '<label class="field">单位<select data-unit><option value="day">天</option><option value="week">周</option><option value="month">月</option><option value="year">年</option><option value="work">工作日</option></select></label></div><div data-out></div></div>' +
        '<div class="card" style="margin-top:12px" data-panel="info" hidden><div class="row">' +
          '<label class="field">日期<input type="date" data-one value="' + today + '"></label></div><div data-out></div></div>';

      function show(tab) {
        el.querySelectorAll('[data-tab]').forEach((btn) => btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false'));
        el.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab; });
      }
      function renderDiff() {
        const a = parse(el.querySelector('[data-a]').value);
        const b = parse(el.querySelector('[data-b]').value);
        const out = el.querySelector('[data-panel="diff"] [data-out]');
        if (!a || !b) return;
        const [start, end] = a <= b ? [a, b] : [b, a];
        const info = ymdBetween(start, end);
        const work = workdaysBetween(start, end);
        const outside = !covered(start) || !covered(end);
        out.innerHTML = metrics([
          ['年月日', info.y + ' 年 ' + info.m + ' 月 ' + info.d + ' 日', '按日历进位，不是平均月'],
          ['相差天数', String(info.days), '结束日减去起始日'],
          ['工作日', String(work), '不含起始日，含结束日'],
          ['周数', Math.floor(info.days / 7) + ' 周余 ' + (info.days % 7) + ' 天', '按 7 天一周']
        ]) + (outside ? '<p class="hint">区间超出 2026–2027 节假日表时，工作日只排除周末。</p>' : '');
      }
      function renderAdd() {
        const base = parse(el.querySelector('[data-base]').value);
        const n = Number(el.querySelector('[data-n]').value);
        const unit = el.querySelector('[data-unit]').value;
        if (!base || !Number.isFinite(n)) return;
        const result = addByUnit(base, n, unit);
        el.querySelector('[data-panel="add"] [data-out]').innerHTML = metrics([
          ['结果', TK.iso(result), weekName(result)],
          ['星期', weekName(result), '按本地公历']
        ]);
      }
      function renderInfo() {
        const date = parse(el.querySelector('[data-one]').value);
        if (!date) return;
        const key = TK.iso(date);
        const lunar = window.lunarOn ? lunarOn(key) : null;
        const until = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
        el.querySelector('[data-panel="info"] [data-out]').innerHTML = metrics([
          ['星期', weekName(date), ''],
          ['当年第几天', String(dayOfYear(date)), '1 月 1 日为第 1 天'],
          ['ISO 周', '第 ' + isoWeek(date) + ' 周', '以周四所在周为准'],
          ['星座', signOf(date), '按公历换算'],
          ['生肖', lunar ? lunar.zodiac : '暂无数据', lunar ? lunar.lunar : '仅 2026–2030 有农历'],
          ['闰年', TK.isLeapYear(date.getFullYear()) ? '是' : '否', String(date.getFullYear())],
          ['距离今天', (until === 0 ? '就是今天' : (until > 0 ? '还有 ' + until + ' 天' : '已过去 ' + Math.abs(until) + ' 天')), '按公历日']
        ]);
      }
      el.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (!tab) return;
        show(tab.dataset.tab);
      });
      el.addEventListener('input', () => { renderDiff(); renderAdd(); renderInfo(); });
      renderDiff(); renderAdd(); renderInfo();
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
