(function (TK) {
  function upcoming(type, today) {
    return (window.HOLIDAYS_2026_2027 || [])
      .filter((h) => h.type === type && h.date >= today)
      .sort((a, b) => a.date < b.date ? -1 : 1)[0] || null;
  }
  function daysUntil(dateStr) {
    const p = TK.cnParts(new Date());
    const a = Date.parse(p.key + 'T00:00:00Z');
    const b = Date.parse(dateStr + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }
  function weekOf(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return TK.WEEK[new Date(y, m - 1, d).getDay()];
  }
  function card(item, today) {
    if (!item) {
      return '<div class="card"><div class="empty"><div class="hourglass"></div><p>暂无数据</p></div></div>';
    }
    const left = daysUntil(item.date);
    const works = (item.arrange || []).filter((a) => a.type === 'work').map((a) => a.date).join('、');
    return '<article class="card"><p class="hint">' + (item.type === 'legal' ? '下一个法定节假日' : '下一个农历节日') + '</p>' +
      '<h2>' + TK.escapeHtml(item.name) + '</h2>' +
      '<p class="mono" style="font-size:2rem;color:var(--primary)">' + (left < 0 ? '已过' : left === 0 ? '就是今天' : '还有 ' + left + ' 天') + '</p>' +
      '<p>' + TK.escapeHtml(item.date) + ' ' + weekOf(item.date) + ' · 放假 ' + item.days + ' 天</p>' +
      '<p class="hint">' + TK.escapeHtml(item.note || '') + (works ? ' 补班：' + TK.escapeHtml(works) : '') + '</p></article>';
  }

  TK.modules = TK.modules || {};
  TK.modules.holiday = {
    mount: function (el) {
      const today = TK.cnParts(new Date()).key;
      const year = today.slice(0, 4);
      const legal = (window.HOLIDAYS_2026_2027 || []).filter((h) => h.type === 'legal' && h.date.slice(0, 4) === year);
      el.innerHTML =
        '<div class="page-head"><div><h1>节假日</h1><p>2026 年按国务院通知。2027 年调休未公布，只列法定放假日。</p></div></div>' +
        '<div class="grid">' + card(upcoming('legal', today)) + card(upcoming('lunar', today)) + '</div>' +
        '<h2 style="margin:18px 0 8px;font-size:1rem">' + year + ' 年节假日</h2>' +
        '<div data-table></div>';
      const host = el.querySelector('[data-table]');
      if (!legal.length) {
        host.innerHTML = '<div class="card empty"><div class="hourglass"></div><p>暂无数据</p><p class="hint">法定节假日表目前只收录 2026 与 2027。</p></div>';
        return;
      }
      const groups = {};
      legal.forEach((h) => {
        const m = h.date.slice(0, 7);
        if (!groups[m]) groups[m] = [];
        groups[m].push(h);
      });
      host.innerHTML = Object.keys(groups).sort().map((m) => {
        const rows = groups[m].map((h) => {
          const left = daysUntil(h.date);
          return '<tr><td>' + TK.escapeHtml(h.name) + '</td><td>' + h.date + '</td><td>' + weekOf(h.date) + '</td><td>' +
            TK.escapeHtml(h.note || ('放假 ' + h.days + ' 天')) + '</td><td>' + left + '</td></tr>';
        }).join('');
        return '<section class="card" style="margin-bottom:12px"><h3>' + m + '</h3><div class="table-wrap"><table><thead><tr><th>名称</th><th>日期</th><th>星期</th><th>放假安排</th><th>距今天数</th></tr></thead><tbody>' +
          rows + '</tbody></table></div></section>';
      }).join('');
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
