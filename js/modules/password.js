(function (TK) {
  const KEY = 'tk_password_options';
  function defaults() { return { length: 16, upper: true, lower: true, number: true, symbol: true, noAmbiguous: true }; }
  function sets(opt) {
    const amb = /[O0Il1|]/g;
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let number = '0123456789';
    const symbol = '!@#$%^&*()-_=+[]{};:,.?';
    if (opt.noAmbiguous) {
      upper = upper.replace(amb, '');
      lower = lower.replace(amb, '');
      number = number.replace(amb, '');
    }
    const bags = [];
    if (opt.upper) bags.push(upper);
    if (opt.lower) bags.push(lower);
    if (opt.number) bags.push(number);
    if (opt.symbol) bags.push(symbol);
    return bags;
  }
  function generate(opt) {
    const bags = sets(opt);
    if (!bags.length) return { text: '', entropy: 0, pool: 0 };
    const pool = bags.join('');
    const len = clampLen(opt.length);
    const rand = new Uint32Array(len);
    crypto.getRandomValues(rand);
    const chars = [];
    bags.forEach((bag, i) => { if (i < len) chars.push(bag[rand[i] % bag.length]); });
    for (let i = chars.length; i < len; i++) chars.push(pool[rand[i] % pool.length]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = rand[i % rand.length] % (i + 1);
      const tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
    }
    return { text: chars.join(''), entropy: len * Math.log2(pool.length), pool: pool.length };
  }
  function clampLen(n) { return Math.max(4, Math.min(64, Number(n) || 16)); }
  function level(bits) {
    if (bits < 28) return 1;
    if (bits < 40) return 2;
    if (bits < 60) return 3;
    return 4;
  }

  TK.modules = TK.modules || {};
  TK.modules.password = {
    mount: function (el, query) {
      const opt = Object.assign(defaults(), TK.storage.get(KEY, {}));
      el.innerHTML =
        '<div class="page-head"><div><h1>密码生成器</h1><p>强度按字符集大小估算熵。生成后会自动复制。</p></div></div>' +
        '<div class="card"><label class="field">长度 <b data-len>' + opt.length + '</b><input data-length type="range" min="4" max="64" value="' + opt.length + '"></label>' +
        '<div class="row" style="margin-top:8px">' +
          box('upper', '大写', opt.upper) + box('lower', '小写', opt.lower) + box('number', '数字', opt.number) +
          box('symbol', '符号', opt.symbol) + box('noAmbiguous', '排除易混字符', opt.noAmbiguous) +
        '</div><p class="mono" data-out style="font-size:1.3rem;margin:12px 0;word-break:break-all" aria-live="polite"></p>' +
        '<div class="strength" data-bar><i></i><i></i><i></i><i></i></div><p class="hint" data-bits></p>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn primary" data-gen>生成</button>' +
        '<button type="button" class="btn" data-copy>复制</button></div></div>';
      function read() {
        const next = {
          length: clampLen(el.querySelector('[data-length]').value),
          upper: el.querySelector('[data-k="upper"]').checked,
          lower: el.querySelector('[data-k="lower"]').checked,
          number: el.querySelector('[data-k="number"]').checked,
          symbol: el.querySelector('[data-k="symbol"]').checked,
          noAmbiguous: el.querySelector('[data-k="noAmbiguous"]').checked
        };
        TK.storage.set(KEY, next);
        return next;
      }
      function go(autoCopy) {
        const res = generate(read());
        if (!res.text) { TK.toast('至少选一种字符', 'warn'); return; }
        el.querySelector('[data-out]').textContent = res.text;
        el.querySelector('[data-bits]').textContent = '约 ' + res.entropy.toFixed(1) + ' bit';
        const lv = level(res.entropy);
        el.querySelectorAll('.strength i').forEach((node, i) => node.classList.toggle('on', i < lv));
        if (autoCopy) TK.copy(res.text);
      }
      el.querySelector('[data-length]').addEventListener('input', (e) => { el.querySelector('[data-len]').textContent = e.target.value; });
      el.querySelector('[data-gen]').addEventListener('click', () => go(true));
      el.querySelector('[data-copy]').addEventListener('click', () => {
        const text = el.querySelector('[data-out]').textContent;
        if (text) TK.copy(text);
      });
      go(!!(query && query.gen));
    },
    destroy: function () {}
  };
  function box(key, label, on) {
    return '<label class="switch"><input type="checkbox" data-k="' + key + '"' + (on ? ' checked' : '') + '>' + label + '</label>';
  }
})(window.TK = window.TK || {});
