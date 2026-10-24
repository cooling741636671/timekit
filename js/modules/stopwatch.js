(function (TK) {
  let raf = 0;
  let running = false;
  let acc = 0;
  let started = 0;
  let laps = [];
  let lastLap = 0;
  let root = null;

  function elapsed() {
    return acc + (running ? performance.now() - started : 0);
  }
  function text(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor(ms / 1000) % 60;
    const f = Math.floor(ms / 10) % 100;
    return TK.pad(m, m > 99 ? 3 : 2) + ':' + TK.pad(s) + '.' + TK.pad(f);
  }
  function paint() {
    if (!root) return;
    const ms = elapsed();
    const disp = root.querySelector('[data-display]');
    disp.textContent = text(ms);
    disp.classList.toggle('run', running);
    disp.classList.toggle('pause', !running && ms > 0);
    const host = root.querySelector('[data-laps]');
    if (!laps.length) {
      host.innerHTML = '';
      return;
    }
    const splits = laps.map((l) => l.split);
    const fast = Math.min.apply(null, splits);
    const slow = Math.max.apply(null, splits);
    host.innerHTML = '<table><thead><tr><th>#</th><th>分段</th><th>累计</th><th>对比最快</th></tr></thead><tbody>' +
      laps.map((l) => {
        const cls = l.split === fast ? 'lap-fast' : l.split === slow ? 'lap-slow' : '';
        const delta = l.split - fast;
        return '<tr class="' + cls + '"><td>' + l.index + '</td><td class="mono">' + text(l.split) +
          '</td><td class="mono">' + text(l.total) + '</td><td class="mono">+' + text(delta) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function frame() {
    paint();
    if (running) raf = requestAnimationFrame(frame);
  }
  function toggle() {
    if (running) {
      acc = elapsed();
      running = false;
      cancelAnimationFrame(raf);
      paint();
    } else {
      running = true;
      started = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
  }
  function lap() {
    if (!running && elapsed() === 0) return;
    const total = elapsed();
    laps.unshift({ index: laps.length + 1, split: total - lastLap, total: total });
    lastLap = total;
    paint();
  }
  async function reset() {
    if (elapsed() === 0 && !laps.length) return;
    const yes = await TK.confirm({ title: '重置秒表', message: '计时和分段都会清空。', danger: true, okText: '重置' });
    if (!yes) return;
    running = false;
    acc = 0;
    lastLap = 0;
    laps = [];
    cancelAnimationFrame(raf);
    paint();
  }

  TK.modules = TK.modules || {};
  TK.modules.stopwatch = {
    mount: function (el) {
      root = el;
      el.innerHTML =
        '<div class="page-head"><div><h1>秒表</h1><p>快捷键：Space 开始/暂停，L 分段，R 重置。焦点在输入框里时不会触发。</p></div></div>' +
        '<div class="card" style="text-align:center">' +
          '<div class="sw-display" data-display aria-live="polite">00:00.00</div>' +
          '<div class="row" style="justify-content:center;margin-top:16px">' +
            '<button type="button" class="btn primary" data-act="toggle">开始</button>' +
            '<button type="button" class="btn" data-act="lap">分段</button>' +
            '<button type="button" class="btn danger" data-act="reset">重置</button>' +
            '<button type="button" class="btn" data-act="clear">清空分段</button>' +
          '</div></div>' +
        '<div class="card table-wrap" data-laps style="margin-top:16px"></div>';
      const toggleBtn = el.querySelector('[data-act="toggle"]');
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        if (btn.dataset.act === 'toggle') { toggle(); toggleBtn.textContent = running ? '暂停' : '开始'; }
        if (btn.dataset.act === 'lap') lap();
        if (btn.dataset.act === 'reset') reset();
        if (btn.dataset.act === 'clear') { laps = []; lastLap = elapsed(); paint(); }
      });
      TK.router.setKeyHandler((e) => {
        if (TK.isTypingTarget(e.target)) return;
        if (e.code === 'Space') { e.preventDefault(); toggle(); toggleBtn.textContent = running ? '暂停' : '开始'; }
        else if (e.key.toLowerCase() === 'l') { e.preventDefault(); lap(); }
        else if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset(); }
      });
      paint();
      if (running) raf = requestAnimationFrame(frame);
    },
    destroy: function () {
      cancelAnimationFrame(raf);
      root = null;
    }
  };
})(window.TK = window.TK || {});
