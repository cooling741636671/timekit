(function (TK) {
  const SET_KEY = 'tk_pomodoro_settings';
  const STAT_KEY = 'tk_pomodoro_stats';
  const RUN_KEY = 'tk_pomodoro_run';
  let raf = 0;
  let root = null;
  let phase = 'work';
  let running = false;
  let endsAt = 0;
  let remain = 0;
  let sessionTotal = 0;
  let doneCount = 0;
  let task = '';
  let finishing = false;

  function defaults() { return { work: 25, short: 5, long: 15, longAfter: 4 }; }
  function settings() { return Object.assign(defaults(), TK.storage.get(SET_KEY, {})); }
  function blank() { return { today: 0, streak: 0, best: 0, week: [0, 0, 0, 0, 0, 0, 0], history: [] }; }
  function phaseMs(name) {
    const s = settings();
    const min = name === 'work' ? s.work : name === 'short' ? s.short : s.long;
    return Math.max(1, min) * 60000;
  }
  function label(name) { return name === 'work' ? '专注中' : name === 'short' ? '短休息' : '长休息'; }
  function normalize(stats) {
    const s = Object.assign(blank(), stats || {});
    const today = TK.todayKey();
    const map = {};
    (s.history || []).forEach((h) => { map[h.date] = h.count; });
    s.today = map[today] || 0;
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
    s.week = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return map[TK.iso(d)] || 0;
    });
    let streak = 0;
    const cursor = new Date(today + 'T12:00:00');
    if (!map[today]) cursor.setDate(cursor.getDate() - 1);
    while (map[TK.iso(cursor)] > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    s.streak = streak;
    s.best = Math.max(Number(s.best) || 0, streak);
    return s;
  }
  function leftMs() {
    return running ? Math.max(0, endsAt - Date.now()) : remain;
  }
  function persist() {
    sessionStorage.setItem(RUN_KEY, JSON.stringify({
      phase: phase, running: running, endsAt: endsAt, remain: remain,
      sessionTotal: sessionTotal, doneCount: doneCount, task: task
    }));
  }
  function recordWork() {
    const stats = normalize(TK.storage.get(STAT_KEY, blank()));
    const today = TK.todayKey();
    let rec = (stats.history || []).find((h) => h.date === today);
    if (!rec) { rec = { date: today, count: 0 }; stats.history.push(rec); }
    rec.count += 1;
    TK.storage.set(STAT_KEY, normalize(stats));
  }
  function paint() {
    if (!root) return;
    const left = leftMs();
    const p = TK.formatDuration(left, { days: false });
    const minutes = p.h * 60 + p.m;
    root.querySelector('[data-time]').textContent = TK.pad(minutes) + ':' + TK.pad(p.s);
    root.querySelector('[data-phase]').textContent = label(phase);
    const C = 2 * Math.PI * 88;
    const denom = sessionTotal || 1;
    const ring = root.querySelector('.ring-fg');
    ring.style.strokeDasharray = String(C);
    ring.style.strokeDashoffset = String(C * (1 - left / denom));
    const stats = normalize(TK.storage.get(STAT_KEY, blank()));
    root.querySelector('[data-today]').textContent = String(stats.today);
    root.querySelector('[data-streak]').textContent = String(stats.streak);
    root.querySelector('[data-best]').textContent = String(stats.best);
    const max = Math.max(1, ...stats.week);
    const names = ['一', '二', '三', '四', '五', '六', '日'];
    root.querySelector('[data-week]').innerHTML = stats.week.map((n, i) =>
      '<div style="text-align:center"><i style="height:' + Math.max(4, (n / max) * 100) + 'px"></i><small>' + names[i] + '</small></div>'
    ).join('');
    if (running && left === 0) complete();
  }
  function loop() {
    paint();
    if (running) raf = requestAnimationFrame(loop);
  }
  function complete() {
    if (finishing) return;
    finishing = true;
    running = false;
    cancelAnimationFrame(raf);
    TK.chime();
    TK.notify('番茄钟', label(phase) + '结束');
    if (phase === 'work') {
      doneCount += 1;
      recordWork();
      const name = task || '未命名任务';
      TK.confirm({ title: '完成一个番茄', message: '「' + name + '」已记入今日统计。', okText: '好的', cancelText: '关闭' });
      const cfg = settings();
      phase = doneCount % Math.max(2, cfg.longAfter) === 0 ? 'long' : 'short';
    } else phase = 'work';
    remain = phaseMs(phase);
    sessionTotal = remain;
    endsAt = 0;
    finishing = false;
    persist();
    paint();
  }
  function start() {
    TK.primeAudio();
    if (running) return;
    if (!remain) remain = phaseMs(phase);
    if (!sessionTotal) sessionTotal = phaseMs(phase);
    endsAt = Date.now() + remain;
    running = true;
    persist();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    if (!running) return;
    remain = Math.max(0, endsAt - Date.now());
    running = false;
    cancelAnimationFrame(raf);
    persist();
    paint();
  }

  TK.modules = TK.modules || {};
  TK.modules.pomodoro = {
    mount: function (el) {
      root = el;
      const cfg = settings();
      let saved = null;
      let shouldResume = false;
      try { saved = JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null'); } catch (err) { saved = null; }
      if (saved && saved.phase) {
        phase = saved.phase;
        running = false;
        remain = saved.running ? Math.max(0, (saved.endsAt || 0) - Date.now()) : (saved.remain || phaseMs(phase));
        sessionTotal = saved.sessionTotal || phaseMs(phase);
        doneCount = saved.doneCount || 0;
        task = saved.task || '';
        shouldResume = !!(saved.running && remain > 0);
        if (saved.running && remain === 0) {
          running = true;
          endsAt = saved.endsAt;
          complete();
          shouldResume = false;
        }
      } else {
        remain = phaseMs('work');
        sessionTotal = remain;
      }
      el.innerHTML =
        '<div class="page-head"><div><h1>番茄钟</h1><p>Space 或 Enter 开始/暂停（输入框内不会误触）。统计键为 tk_pomodoro_stats。</p></div>' +
        '<div class="row"><button type="button" class="btn" data-preset="25">25 / 5</button><button type="button" class="btn" data-preset="50">50 / 10</button></div></div>' +
        '<div class="pom-wrap"><div class="card pom-ring">' +
          '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/>' +
          '<circle class="ring-fg" cx="100" cy="100" r="88" fill="none" stroke="var(--primary)" stroke-width="10" stroke-linecap="round" transform="rotate(-90 100 100)"/></svg>' +
          '<div class="pom-center"><b data-time aria-live="polite">25:00</b><span data-phase>专注中</span></div></div>' +
          '<div class="card"><label class="field">任务名<input data-task maxlength="40" value="' + TK.escapeHtml(task) + '"></label>' +
          '<div class="row" style="margin-top:12px"><button type="button" class="btn primary" data-act="start">开始</button>' +
          '<button type="button" class="btn" data-act="pause">暂停</button><button type="button" class="btn" data-act="skip">跳过本段</button></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<label class="field">工作（分）<input data-k="work" type="number" min="1" max="180" value="' + cfg.work + '"></label>' +
            '<label class="field">短休<input data-k="short" type="number" min="1" max="60" value="' + cfg.short + '"></label>' +
            '<label class="field">长休<input data-k="long" type="number" min="1" max="90" value="' + cfg.long + '"></label>' +
            '<label class="field">几次后长休<input data-k="longAfter" type="number" min="2" max="12" value="' + cfg.longAfter + '"></label></div>' +
          '<div class="stat-grid"><div class="metric"><small>今日番茄</small><b data-today>0</b></div>' +
            '<div class="metric"><small>连续天数</small><b data-streak>0</b></div>' +
            '<div class="metric"><small>历史最高</small><b data-best>0</b></div>' +
            '<div class="metric"><small>本周</small><div class="week" data-week></div></div></div></div></div>';
      el.addEventListener('click', (e) => {
        const preset = e.target.closest('[data-preset]');
        if (preset) {
          const s = settings();
          if (preset.dataset.preset === '25') { s.work = 25; s.short = 5; }
          else { s.work = 50; s.short = 10; }
          TK.storage.set(SET_KEY, s);
          el.querySelector('[data-k="work"]').value = s.work;
          el.querySelector('[data-k="short"]').value = s.short;
          if (!running) { phase = 'work'; remain = phaseMs('work'); sessionTotal = remain; }
          paint();
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'start') start();
        if (act.dataset.act === 'pause') pause();
        if (act.dataset.act === 'skip') {
          running = false;
          cancelAnimationFrame(raf);
          phase = phase === 'work' ? 'short' : 'work';
          remain = phaseMs(phase);
          sessionTotal = remain;
          persist();
          paint();
        }
      });
      el.addEventListener('change', (e) => {
        const input = e.target.closest('[data-k]');
        if (!input) return;
        const s = settings();
        s[input.dataset.k] = Math.max(1, Number(input.value) || 1);
        TK.storage.set(SET_KEY, s);
        if (!running) { remain = phaseMs(phase); sessionTotal = phaseMs(phase); }
        paint();
      });
      el.querySelector('[data-task]').addEventListener('input', (e) => { task = e.target.value; persist(); });
      TK.router.setKeyHandler((e) => {
        if (TK.isTypingTarget(e.target)) return;
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          if (running) pause(); else start();
        }
      });
      paint();
      if (shouldResume) start();
    },
    destroy: function () {
      cancelAnimationFrame(raf);
      raf = 0;
      persist();
      root = null;
    }
  };
})(window.TK = window.TK || {});
