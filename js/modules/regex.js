(function (TK) {
  const CHEAT = [
    ['邮箱', '[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}'],
    ['手机号', '1[3-9]\\d{9}'],
    ['网址', 'https?:\\/\\/[\\w.-]+(?:\\/\\S*)?'],
    ['身份证', '\\d{17}[\\dXx]'],
    ['IPv4', '(?:\\d{1,3}\\.){3}\\d{1,3}'],
    ['日期', '\\d{4}-\\d{2}-\\d{2}'],
    ['十六进制颜色', '#(?:[0-9a-fA-F]{3}){1,2}'],
    ['强密码', '(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).{8,}'],
    ['中文', '[\\u4e00-\\u9fff]+'],
    ['邮编', '\\d{6}']
  ];

  function highlight(text, re) {
    if (text.length > 20000) text = text.slice(0, 20000);
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
    const global = new RegExp(re.source, flags);
    let out = '';
    let last = 0;
    let guard = 0;
    let m;
    const rows = [];
    while ((m = global.exec(text))) {
      if (m[0] === '' ) { global.lastIndex += 1; continue; }
      out += TK.escapeHtml(text.slice(last, m.index)) + '<mark>' + TK.escapeHtml(m[0]) + '</mark>';
      last = m.index + m[0].length;
      const groups = m.slice(1).map((g, i) => (i + 1) + ': ' + (g == null ? '' : g));
      rows.push('<tr><td>' + rows.length + '</td><td>' + TK.escapeHtml(m[0]) + '</td><td>' + m.index + '</td><td>' + TK.escapeHtml(groups.join('，')) + '</td></tr>');
      if (++guard > 500) break;
      if (!re.flags.includes('g')) break;
    }
    out += TK.escapeHtml(text.slice(last));
    return { html: out, rows: rows };
  }

  TK.modules = TK.modules || {};
  TK.modules.regex = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>正则测试</h1><p>匹配结果会转义后再高亮。超长文本只检测前 2 万字。</p></div></div>' +
        '<div class="card"><div class="row"><label class="field grow">表达式<input data-re value="\\\\d+"></label>' +
          '<div class="row" data-flags>' + 'gimsuy'.split('').map((f) => '<label class="switch"><input type="checkbox" value="' + f + '"' + (f === 'g' ? ' checked' : '') + '>' + f + '</label>').join('') + '</div></div>' +
        '<label class="field">测试文本<textarea data-text>订单 2026 与 88</textarea></label>' +
        '<p data-err class="hint"></p><div class="preview" data-view></div>' +
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>匹配</th><th>位置</th><th>分组</th></tr></thead><tbody data-rows></tbody></table></div>' +
        '<div class="row" style="margin-top:8px">' + CHEAT.map((c, i) => '<button type="button" class="btn" data-cheat="' + i + '">' + c[0] + '</button>').join('') + '</div></div>';
      const run = TK.debounce(() => {
        const source = el.querySelector('[data-re]').value;
        const flags = Array.from(el.querySelectorAll('[data-flags] input:checked')).map((n) => n.value).join('');
        const err = el.querySelector('[data-err]');
        try {
          const re = new RegExp(source, flags);
          const res = highlight(el.querySelector('[data-text]').value, re);
          err.textContent = '';
          el.querySelector('[data-view]').innerHTML = res.html || '<span class="hint">没有匹配</span>';
          el.querySelector('[data-rows]').innerHTML = res.rows.join('');
        } catch (ex) {
          err.textContent = ex.message;
          el.querySelector('[data-view]').textContent = el.querySelector('[data-text]').value;
        }
      }, 80);
      el.addEventListener('input', run);
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cheat]');
        if (!btn) return;
        el.querySelector('[data-re]').value = CHEAT[Number(btn.dataset.cheat)][1];
        run();
      });
      run();
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
