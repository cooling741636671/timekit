(function (TK) {
  const KEY = 'tk_countdowns';
  const COLORS = ['#38f9d7', '#8b5cf6', '#ff4fd8', '#ffb020'];
  let raf = 0;
  let hiddenTimer = 0;
  let booted = false;
  let listeners = [];
  let showMs = false;
  let rootEl = null;
  let unsub = null;
  const fired = new Set(JSON.parse(sessionStorage.getItem('tk_cd_fired') || '[]'));

  function load() {
    const list = TK.storage.get(KEY, []);
    return Array.isArray(list) ? list : [];
  }
  function save(list) { TK.storage.set(KEY, list); }
  function leftOf(item, now) {
    if (item.paused) return Math.max(0, Number(item.remaining) || 0);
    const target = new Date(item.target).getTime();
    if (!Number.isFinite(target)) return 0;
    return Math.max(0, target - now);
  }
  function anyExpired(now) {
    return load().some((item) => !item.paused && leftOf(item, now || Date.now()) === 0);
  }
  function markFired(id) {
    fired.add(id);
    sessionStorage.setItem('tk_cd_fired', JSON.stringify(Array.from(fired)));
  }
  function publish(now) {
    const list = load();
    list.forEach((item) => {
      const left = leftOf(item, now);
      if (left === 0 && item.remind && !item.paused && !fired.has(item.id)) {
        markFired(item.id);
        TK.chime();
        TK.notify('倒计时结束', item.title || '时间到');
        document.body.classList.add('alert-flash');
        setTimeout(() => document.body.classList.remove('alert-flash'), 1400);
      }
    });
    listeners.forEach((fn) => fn(list, now));
    if (document.body) {
      const expired = list.some((item) => !item.paused && leftOf(item, now) === 0);
      const base = document.title.replace(/^\(已到期\)\s*/, '');
      document.title = expired && base ? '(已到期) ' + base : base;
    }
  }
  function loop() {
    publish(Date.now());
    if (!document.hidden) raf = requestAnimationFrame(loop);
  }
  function armHidden() {
    clearTimeout(hiddenTimer);
    const tick = () => {
      publish(Date.now());
      if (document.hidden) hiddenTimer = setTimeout(tick, 1000);
    };
    hiddenTimer = setTimeout(tick, Math.max(16, 1000 - (Date.now() % 1000)));
  }
  function boot() {
    if (booted) return;
    booted = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        armHidden();
      } else {
        clearTimeout(hiddenTimer);
        publish(Date.now());
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    });
    raf = requestAnimationFrame(loop);
  }
  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((f) => f !== fn); };
  }

  function encodeShare(item) {
    const json = JSON.stringify({ title: item.title, target: item.target, color: item.color });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decodeShare(token) {
    try {
      let s = String(token).replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (err) {
      return null;
    }
  }

  function paintCard(card, item, now) {
    const left = leftOf(item, now);
    const parts = TK.formatDuration(left, { days: true, ms: true });
    const map = { d: parts.d, h: parts.h, m: parts.m, s: parts.s, ms: Math.floor(parts.ms / 10) };
    card.querySelectorAll('[data-unit]').forEach((node) => {
      const unit = node.dataset.unit;
      if (unit === 'ms' && !showMs) return;
      node.textContent = unit === 'd' ? String(map.d) : TK.pad(map[unit]);
    });
    const msTube = card.querySelector('[data-ms-tube]');
    if (msTube) msTube.hidden = !showMs;
    const created = new Date(item.createdAt).getTime();
    const target = new Date(item.target).getTime();
    const total = Math.max(1, target - created);
    const pct = Math.max(0, Math.min(100, (1 - left / total) * 100));
    const bar = card.querySelector('.bar > span');
    if (bar) bar.style.width = pct.toFixed(2) + '%';
    const pctLabel = card.querySelector('[data-pct]');
    if (pctLabel) pctLabel.textContent = '已过去 ' + pct.toFixed(1) + '%';
    const expired = left === 0 && !item.paused;
    card.classList.toggle('expired', expired);
    if (expired && card.dataset.pulsed !== '1') {
      card.dataset.pulsed = '1';
      card.querySelectorAll('.tube').forEach((tube) => tube.classList.add('hit'));
      const live = card.querySelector('[data-live]');
      if (live) live.setAttribute('role', 'alert');
    }
    if (!expired) card.dataset.pulsed = '0';
    const pauseBtn = card.querySelector('[data-act="pause"]');
    if (pauseBtn) pauseBtn.textContent = item.paused ? '继续' : '暂停';
  }

  function cardHTML(item) {
    const when = new Date(item.target);
    const color = item.color || COLORS[0];
    return '<article class="card cd-card" data-id="' + TK.escapeHtml(item.id) + '" style="--primary:' + TK.escapeHtml(color) + '">' +
      '<div class="row" style="justify-content:space-between"><h3>' + TK.escapeHtml(item.title || '未命名') + '</h3>' +
      '<span class="hint">' + TK.escapeHtml(when.toLocaleString('zh-CN', { hour12: false })) + '</span></div>' +
      '<div class="tubes" data-live aria-live="polite">' +
        unit('d', 'DAYS') + unit('h', 'HOURS') + unit('m', 'MIN') + unit('s', 'SEC') +
        '<div class="tube" data-ms-tube ' + (showMs ? '' : 'hidden') + '>' +
          '<div class="tube-num" data-unit="ms">00</div><div class="tube-label">MS</div></div>' +
      '</div>' +
      '<div class="bar" style="margin-top:12px"><span></span></div>' +
      '<div class="row" style="margin-top:8px;justify-content:space-between"><span class="hint" data-pct></span>' +
      '<div class="row">' +
        '<button type="button" class="btn" data-act="pause">暂停</button>' +
        '<button type="button" class="btn" data-act="edit">编辑</button>' +
        '<button type="button" class="btn" data-act="share">分享</button>' +
        '<button type="button" class="btn danger" data-act="del">删除</button>' +
      '</div></div></article>';
  }
  function unit(key, label) {
    return '<div class="tube"><div class="tube-num" data-unit="' + key + '">00</div><div class="tube-label">' + label + '</div></div>';
  }

  function draw(list, now) {
    if (!rootEl) return;
    const host = rootEl.querySelector('[data-list]');
    const ids = list.map((i) => i.id).join(',');
    if (host.dataset.ids !== ids) {
      host.dataset.ids = ids;
      if (!list.length) {
        host.innerHTML = '<div class="empty card"><div class="hourglass" aria-hidden="true"></div><p>还没有倒计时，新建一个吧</p></div>';
      } else host.innerHTML = list.map(cardHTML).join('');
    }
    list.forEach((item) => {
      const card = host.querySelector('[data-id="' + CSS.escape(item.id) + '"]');
      if (card) paintCard(card, item, now);
    });
  }

  async function editItem(item) {
    let title = '';
    let raw = '';
    const ok = await TK.confirm({
      title: '编辑倒计时',
      okText: '保存',
      html:
        '<div class="field">标题<input id="ed-title" value="' + TK.escapeHtml(item.title) + '"></div>' +
        '<div class="field" style="margin-top:8px">目标时间<input id="ed-target" type="datetime-local" value="' + toLocalInput(item.target) + '"></div>',
      beforeOk: function (wrap) {
        title = wrap.querySelector('#ed-title').value.trim() || '未命名';
        raw = wrap.querySelector('#ed-target').value;
        if (!raw) { TK.toast('请选择时间', 'warn'); return false; }
      }
    });
    if (!ok) return;
    const list = load();
    const found = list.find((x) => x.id === item.id);
    if (!found) return;
    found.title = title;
    found.target = new Date(raw).toISOString();
    found.paused = false;
    found.remaining = 0;
    save(list);
  }

  function toLocalInput(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + TK.pad(d.getMonth() + 1) + '-' + TK.pad(d.getDate()) + 'T' + TK.pad(d.getHours()) + ':' + TK.pad(d.getMinutes());
  }

  TK.countdown = { boot: boot, anyExpired: anyExpired, load: load };

  TK.modules = TK.modules || {};
  TK.modules.countdown = {
    mount: function (el, query) {
      rootEl = el;
      boot();
      el.innerHTML =
        '<div class="page-head"><div><h1>倒计时</h1><p>用动画帧对齐到实际时间，回到前台会立刻校正，不会出现负数。</p></div>' +
        '<label class="switch"><input type="checkbox" data-ms> 显示毫秒</label></div>' +
        '<form class="card" data-form>' +
          '<h2 style="font-size:1.1rem;margin-bottom:12px">新建倒计时</h2>' +
          '<div class="row">' +
            '<label class="field grow">标题<input name="title" required maxlength="40" placeholder="例如：发布日"></label>' +
            '<label class="field">目标时间<input name="target" type="datetime-local" required></label>' +
          '</div>' +
          '<div class="row" style="margin-top:10px">' +
            '<span class="hint">颜色</span>' +
            COLORS.map((c, i) => '<label class="color-pick"><input type="radio" name="color" value="' + c + '"' + (i === 0 ? ' checked' : '') + '><i style="background:' + c + '"></i></label>').join('') +
            '<label class="switch"><input type="checkbox" name="remind" checked> 到期提醒</label>' +
            '<button class="btn primary" type="submit">创建</button>' +
          '</div>' +
        '</form>' +
        '<div data-share></div>' +
        '<div class="grid" data-list style="margin-top:16px"></div>';

      if (unsub) unsub();
      unsub = subscribe(draw);

      el.querySelector('[data-ms]').addEventListener('change', (e) => { showMs = e.target.checked; });
      el.querySelector('[data-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        TK.primeAudio();
        const fd = new FormData(e.target);
        const title = String(fd.get('title') || '').trim();
        const raw = String(fd.get('target') || '');
        const when = new Date(raw);
        if (!raw || Number.isNaN(when.getTime())) { TK.toast('时间无效', 'warn'); return; }
        if (Notification.permission === 'default') Notification.requestPermission();
        const item = {
          id: TK.uid(),
          title: title,
          target: when.toISOString(),
          color: String(fd.get('color') || COLORS[0]),
          remind: fd.get('remind') === 'on',
          createdAt: new Date().toISOString(),
          paused: false,
          remaining: Math.max(0, when.getTime() - Date.now())
        };
        const list = load();
        list.unshift(item);
        save(list);
        e.target.reset();
        e.target.querySelector('input[name="color"]').checked = true;
        e.target.querySelector('[name="remind"]').checked = true;
        TK.toast('已创建倒计时', 'success');
      });

      el.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const card = btn.closest('[data-id]');
        const list = load();
        const item = list.find((x) => x.id === card.dataset.id);
        if (!item) return;
        const act = btn.dataset.act;
        if (act === 'pause') {
          TK.primeAudio();
          if (item.paused) {
            item.target = new Date(Date.now() + leftOf(item, Date.now())).toISOString();
            item.paused = false;
          } else {
            item.remaining = leftOf(item, Date.now());
            item.paused = true;
          }
          save(list);
        } else if (act === 'del') {
          const yes = await TK.confirm({ title: '删除倒计时', message: '删除后不可恢复。', okText: '删除', danger: true });
          if (!yes) return;
          save(load().filter((x) => x.id !== item.id));
        } else if (act === 'share') {
          const link = location.href.split('#')[0] + '#/countdown?t=' + encodeShare(item);
          TK.copy(link);
        } else if (act === 'edit') {
          editItem(item);
        }
      });

      if (query && query.t) {
        const data = decodeShare(query.t);
        const box = el.querySelector('[data-share]');
        if (!data || !data.target) box.innerHTML = '<p class="hint">分享链接无法识别</p>';
        else {
          box.innerHTML = '<div class="card"><p>收到分享的倒计时「' + TK.escapeHtml(data.title || '未命名') + '」</p>' +
            '<button type="button" class="btn primary" data-import>保存到我的列表</button></div>';
          box.querySelector('[data-import]').addEventListener('click', () => {
            const list = load();
            list.unshift({
              id: TK.uid(),
              title: data.title || '分享的倒计时',
              target: new Date(data.target).toISOString(),
              color: data.color || COLORS[0],
              remind: true,
              createdAt: new Date().toISOString(),
              paused: false,
              remaining: Math.max(0, new Date(data.target).getTime() - Date.now())
            });
            save(list);
            box.innerHTML = '';
            TK.toast('已保存', 'success');
          });
        }
      }
      if (query && query.new) {
        const input = el.querySelector('input[name="title"]');
        if (input) input.focus();
      }
    },
    destroy: function () {
      if (unsub) unsub();
      unsub = null;
      rootEl = null;
    }
  };
})(window.TK = window.TK || {});
