(function (TK) {
  const PRESET = [
    ['北京', 'Asia/Shanghai'], ['东京', 'Asia/Tokyo'], ['首尔', 'Asia/Seoul'], ['新德里', 'Asia/Kolkata'],
    ['迪拜', 'Asia/Dubai'], ['莫斯科', 'Europe/Moscow'], ['伦敦', 'Europe/London'], ['巴黎', 'Europe/Paris'],
    ['柏林', 'Europe/Berlin'], ['纽约', 'America/New_York'], ['洛杉矶', 'America/Los_Angeles'], ['悉尼', 'Australia/Sydney']
  ];
  const EXTRA = [
    ['上海', 'Asia/Shanghai'], ['香港', 'Asia/Hong_Kong'], ['台北', 'Asia/Taipei'], ['新加坡', 'Asia/Singapore'],
    ['曼谷', 'Asia/Bangkok'], ['雅加达', 'Asia/Jakarta'], ['马尼拉', 'Asia/Manila'], ['胡志明市', 'Asia/Ho_Chi_Minh'],
    ['吉隆坡', 'Asia/Kuala_Lumpur'], ['仰光', 'Asia/Yangon'], ['达卡', 'Asia/Dhaka'], ['加德满都', 'Asia/Kathmandu'],
    ['科伦坡', 'Asia/Colombo'], ['卡拉奇', 'Asia/Karachi'], ['德黑兰', 'Asia/Tehran'], ['利雅得', 'Asia/Riyadh'],
    ['多哈', 'Asia/Qatar'], ['耶路撒冷', 'Asia/Jerusalem'], ['伊斯坦布尔', 'Europe/Istanbul'], ['雅典', 'Europe/Athens'],
    ['罗马', 'Europe/Rome'], ['马德里', 'Europe/Madrid'], ['阿姆斯特丹', 'Europe/Amsterdam'], ['斯德哥尔摩', 'Europe/Stockholm'],
    ['华沙', 'Europe/Warsaw'], ['基辅', 'Europe/Kyiv'], ['开罗', 'Africa/Cairo'], ['约翰内斯堡', 'Africa/Johannesburg'],
    ['拉各斯', 'Africa/Lagos'], ['内罗毕', 'Africa/Nairobi'], ['圣保罗', 'America/Sao_Paulo'], ['布宜诺斯艾利斯', 'America/Argentina/Buenos_Aires'],
    ['墨西哥城', 'America/Mexico_City'], ['多伦多', 'America/Toronto'], ['芝加哥', 'America/Chicago'], ['丹佛', 'America/Denver'],
    ['温哥华', 'America/Vancouver'], ['檀香山', 'Pacific/Honolulu'], ['奥克兰', 'Pacific/Auckland'], ['斐济', 'Pacific/Fiji']
  ];
  let timer = 0;
  let root = null;

  function parts(date, tz) {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
    });
    const bag = {};
    fmt.formatToParts(date).forEach((p) => { if (p.type !== 'literal') bag[p.type] = p.value; });
    if (bag.hour === '24') bag.hour = '00';
    return bag;
  }
  function offsetMin(tz, date) {
    const p = parts(date, tz);
    const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    return Math.round((asUTC - date.getTime()) / 60000);
  }
  function diffLabel(min) {
    const sign = min > 0 ? '+' : min < 0 ? '−' : '';
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (!min) return '与北京相同';
    return '比北京 ' + sign + h + (m ? '小时' + m + '分' : '小时');
  }

  function zones() {
    let supported = null;
    try { supported = new Set(Intl.supportedValuesOf('timeZone')); } catch (err) { supported = null; }
    const extra = EXTRA.filter((row) => !supported || supported.has(row[1])).slice(0, 40);
    const custom = TK.storage.get('tk_worldclocks', []);
    return { extra: extra, custom: Array.isArray(custom) ? custom : [] };
  }

  function render() {
    if (!root) return;
    const now = new Date();
    const { extra, custom } = zones();
    const cities = PRESET.map((r) => ({ city: r[0], tz: r[1], preset: true })).concat(custom);
    const bj = offsetMin('Asia/Shanghai', now);
    const list = root.querySelector('[data-clocks]');
    const timeline = root.querySelector('[data-tl]');
    list.innerHTML = cities.map((c) => {
      const p = parts(now, c.tz);
      const hour = Number(p.hour);
      const day = hour >= 6 && hour < 18;
      const delta = offsetMin(c.tz, now) - bj;
      return '<article class="card" data-tz="' + TK.escapeHtml(c.tz) + '">' +
        '<div class="row" style="justify-content:space-between"><h3>' + TK.escapeHtml(c.city) + '</h3>' +
        TK.icon(day ? 'sun' : 'moon', day ? '白天' : '黑夜') + '</div>' +
        '<div class="mono" style="font-size:2rem;color:var(--primary)" aria-live="polite">' + p.hour + ':' + p.minute + ':' + p.second + '</div>' +
        '<p class="hint">' + p.year + '-' + p.month + '-' + p.day + ' · ' + diffLabel(delta) + '</p>' +
        (c.preset ? '' : '<button type="button" class="btn" data-remove="' + TK.escapeHtml(c.tz + '|' + c.city) + '">移除</button>') +
      '</article>';
    }).join('');
    timeline.innerHTML = cities.map((c) => {
      const p = parts(now, c.tz);
      const pos = ((Number(p.hour) + Number(p.minute) / 60) / 24) * 100;
      return '<div class="tl-row"><span>' + TK.escapeHtml(c.city) + '</span><div class="tl-bar"><i class="tl-pin" style="left:' + pos + '%"></i></div></div>';
    }).join('');
    const sel = root.querySelector('[data-city]');
    if (sel && !sel.dataset.ready) {
      sel.dataset.ready = '1';
      sel.innerHTML = extra.map((r) => '<option value="' + TK.escapeHtml(r[1]) + '">' + TK.escapeHtml(r[0]) + ' · ' + TK.escapeHtml(r[1]) + '</option>').join('');
    }
  }

  TK.modules = TK.modules || {};
  TK.modules.worldclock = {
    mount: function (el) {
      root = el;
      el.innerHTML =
        '<div class="page-head"><div><h1>世界时钟</h1><p>横向时间轴上，亮段大约是当地 6 点到 18 点。</p></div>' +
        '<form class="row" data-add><select data-city aria-label="添加城市"></select><button class="btn primary" type="submit">添加</button></form></div>' +
        '<div class="card timeline" data-tl></div>' +
        '<div class="grid" data-clocks style="margin-top:16px"></div>';
      el.querySelector('[data-add]').addEventListener('submit', (e) => {
        e.preventDefault();
        const tz = el.querySelector('[data-city]').value;
        const { extra, custom } = zones();
        const found = extra.find((r) => r[1] === tz);
        if (!found) return;
        if (custom.some((c) => c.tz === tz && c.city === found[0])) { TK.toast('已经添加过了', 'info'); return; }
        custom.push({ city: found[0], tz: tz });
        TK.storage.set('tk_worldclocks', custom);
        render();
      });
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove]');
        if (!btn) return;
        const key = btn.dataset.remove;
        const custom = zones().custom.filter((c) => (c.tz + '|' + c.city) !== key);
        TK.storage.set('tk_worldclocks', custom);
        render();
      });
      render();
      timer = setInterval(render, 1000);
    },
    destroy: function () {
      clearInterval(timer);
      timer = 0;
      root = null;
    }
  };
})(window.TK = window.TK || {});
