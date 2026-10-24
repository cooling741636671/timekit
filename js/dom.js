(function (TK) {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function pad(n, w) {
    const width = w == null ? 2 : w;
    const sign = Number(n) < 0 ? '-' : '';
    return sign + String(Math.trunc(Math.abs(Number(n) || 0))).padStart(width, '0');
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function iso(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayKey() {
    return iso(new Date());
  }

  function formatDuration(ms, opt) {
    const o = Object.assign({ days: true, ms: false }, opt || {});
    let left = Math.max(0, Math.floor(Number(ms) || 0));
    const out = { d: 0, h: 0, m: 0, s: 0, ms: 0 };
    if (o.days) {
      out.d = Math.floor(left / 86400000);
      left -= out.d * 86400000;
    }
    out.h = Math.floor(left / 3600000);
    left -= out.h * 3600000;
    out.m = Math.floor(left / 60000);
    left -= out.m * 60000;
    out.s = Math.floor(left / 1000);
    out.ms = left;
    return out;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function debounce(fn, ms) {
    let timer = 0;
    function wrapped() {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(ctx, args), ms);
    }
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
  }

  function throttle(fn, ms) {
    let last = 0;
    let timer = 0;
    return function () {
      const args = arguments;
      const ctx = this;
      const now = Date.now();
      const wait = ms - (now - last);
      if (wait <= 0) {
        clearTimeout(timer);
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = 0;
          fn.apply(ctx, args);
        }, wait);
      }
    };
  }

  function onVisible(cb) {
    function handler() {
      if (document.visibilityState === 'visible') cb();
    }
    document.addEventListener('visibilitychange', handler);
    return function () { document.removeEventListener('visibilitychange', handler); };
  }

  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function cnParts(date) {
    const d = date || new Date();
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short'
    });
    const bag = { year: '', month: '', day: '', hour: '00', minute: '00', second: '00' };
    fmt.formatToParts(d).forEach((p) => { if (p.type !== 'literal') bag[p.type] = p.value; });
    if (bag.hour === '24') bag.hour = '00';
    const key = bag.year + '-' + bag.month + '-' + bag.day;
    const probe = new Date(Date.UTC(Number(bag.year), Number(bag.month) - 1, Number(bag.day), 4, 0, 0));
    bag.week = WEEK[probe.getUTCDay()];
    bag.ms = d.getMilliseconds();
    bag.key = key;
    return bag;
  }

  function icon(name, label) {
    const aria = label
      ? ' role="img" aria-label="' + escapeHtml(label) + '"'
      : ' aria-hidden="true"';
    return '<svg class="ico" viewBox="0 0 24 24"' + aria + '><use href="#' + name + '"></use></svg>';
  }

  function toast(message, type) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const kind = type || 'info';
    const node = document.createElement('div');
    node.className = 'toast ' + kind;
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    node.innerHTML = '<span>' + escapeHtml(message) + '</span><button type="button" aria-label="关闭">×</button>';
    node.querySelector('button').addEventListener('click', () => node.remove());
    while (root.children.length >= 3) root.firstElementChild.remove();
    root.appendChild(node);
    setTimeout(() => node.remove(), 4000);
  }
  toast.success = (m) => toast(m, 'success');
  toast.info = (m) => toast(m, 'info');
  toast.warn = (m) => toast(m, 'warn');
  toast.error = (m) => toast(m, 'error');

  function copy(text) {
    const value = String(text);
    function ok() { toast('已复制到剪贴板', 'success'); }
    function fallback() {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        ok();
      } catch (err) {
        toast('复制失败', 'error');
      }
      area.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(ok).catch(fallback);
    } else fallback();
  }

  let audioCtx = null;
  function primeAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function chime() {
    const ctx = primeAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      osc.start(start);
      osc.stop(start + 1.15);
    });
  }

  function confirmDialog(opts) {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      const root = document.getElementById('modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'backdrop';
      wrap.innerHTML =
        '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">' +
          '<h2 id="dlg-title">' + escapeHtml(o.title || '请确认') + '</h2>' +
          '<div class="dlg-body"></div>' +
          '<div class="actions">' +
            '<button type="button" class="btn" data-act="cancel">' + escapeHtml(o.cancelText || '取消') + '</button>' +
            '<button type="button" class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-act="ok">' + escapeHtml(o.okText || '确定') + '</button>' +
          '</div>' +
        '</div>';
      const body = wrap.querySelector('.dlg-body');
      if (o.html) body.innerHTML = o.html;
      else body.textContent = o.message || '';
      root.appendChild(wrap);
      const dialog = wrap.querySelector('.dialog');
      const okBtn = wrap.querySelector('[data-act="ok"]');
      const cancelBtn = wrap.querySelector('[data-act="cancel"]');
      okBtn.focus();
      function close(val) {
        document.removeEventListener('keydown', onKey);
        wrap.remove();
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        if (e.key === 'Tab') {
          const items = [cancelBtn, okBtn];
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey);
      cancelBtn.addEventListener('click', () => close(false));
      okBtn.addEventListener('click', () => {
        if (typeof o.beforeOk === 'function' && o.beforeOk(wrap) === false) return;
        close(true);
      });
      wrap.addEventListener('click', (e) => { if (e.target === wrap) close(false); });
      dialog.addEventListener('click', (e) => e.stopPropagation());
    });
  }

  function notify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body: body || '' }); } catch (err) { /* file 页面可能拒绝 */ }
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') {
          try { new Notification(title, { body: body || '' }); } catch (err) {}
        }
      });
    }
  }

  function isTypingTarget(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  }

  TK.$ = $;
  TK.$$ = $$;
  TK.pad = pad;
  TK.isLeapYear = isLeapYear;
  TK.daysInMonth = daysInMonth;
  TK.iso = iso;
  TK.todayKey = todayKey;
  TK.formatDuration = formatDuration;
  TK.escapeHtml = escapeHtml;
  TK.debounce = debounce;
  TK.throttle = throttle;
  TK.onVisible = onVisible;
  TK.cnParts = cnParts;
  TK.icon = icon;
  TK.toast = toast;
  TK.copy = copy;
  TK.primeAudio = primeAudio;
  TK.chime = chime;
  TK.confirm = confirmDialog;
  TK.notify = notify;
  TK.isTypingTarget = isTypingTarget;
  TK.uid = uid;
  TK.WEEK = WEEK;
})(window.TK = window.TK || {});
