(function (TK) {
  function highlight(json) {
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(json))) {
      out += TK.escapeHtml(json.slice(last, m.index));
      const tok = m[0];
      let cls = 'j-num';
      if (tok[0] === '"') cls = m[2] ? 'j-key' : 'j-str';
      else if (tok === 'true' || tok === 'false') cls = 'j-bool';
      else if (tok === 'null') cls = 'j-null';
      out += '<span class="' + cls + '">' + TK.escapeHtml(tok) + '</span>';
      last = m.index + tok.length;
    }
    return out + TK.escapeHtml(json.slice(last));
  }
  function locate(text) {
    try {
      JSON.parse(text);
      return null;
    } catch (err) {
      const msg = String(err.message || err);
      const pos = msg.match(/position\s+(\d+)/i);
      if (!pos) return { message: msg, line: 1, col: 1 };
      const index = Number(pos[1]);
      const slice = text.slice(0, index);
      const lines = slice.split('\n');
      return { message: msg, line: lines.length, col: lines[lines.length - 1].length + 1 };
    }
  }
  function tree(value, key) {
    if (value && typeof value === 'object') {
      const keys = Array.isArray(value) ? value.map((_, i) => i) : Object.keys(value);
      const label = key == null ? (Array.isArray(value) ? '数组 ' + keys.length : '对象 ' + keys.length) : key;
      return '<div class="j-node"><button type="button" class="j-toggle" aria-expanded="true">' + TK.escapeHtml(String(label)) + '</button><div class="j-kids">' +
        keys.map((k) => tree(value[k], k)).join('') + '</div></div>';
    }
    const shown = key == null ? '' : TK.escapeHtml(String(key)) + ': ';
    return '<div class="j-leaf">' + shown + TK.escapeHtml(JSON.stringify(value)) + '</div>';
  }

  TK.modules = TK.modules || {};
  TK.modules.json = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>JSON</h1><p>格式化、压缩、定位错误，树节点可以收起。</p></div>' +
        '<div class="row"><button type="button" class="btn" data-act="f2">缩进 2</button><button type="button" class="btn" data-act="f4">缩进 4</button>' +
        '<button type="button" class="btn" data-act="min">压缩</button><button type="button" class="btn" data-act="tree">树形</button></div></div>' +
        '<textarea data-src aria-label="JSON 输入">{"hello":"world"}</textarea>' +
        '<p data-err class="hint"></p><div class="j-code card" data-view></div>';
      const src = el.querySelector('[data-src]');
      const view = el.querySelector('[data-view]');
      const err = el.querySelector('[data-err]');
      function showText(text) {
        view.innerHTML = '<pre>' + highlight(text) + '</pre>';
      }
      function run(mode) {
        const raw = src.value;
        const bad = locate(raw);
        if (bad) {
          err.textContent = '第 ' + bad.line + ' 行，第 ' + bad.col + ' 列：' + bad.message;
          showText(raw);
          return;
        }
        err.textContent = '';
        if (mode === 'tree') {
          view.innerHTML = tree(JSON.parse(raw), null);
          return;
        }
        if (mode === 'min') src.value = JSON.stringify(JSON.parse(raw));
        else if (mode === 'f2' || mode === 'f4') src.value = JSON.stringify(JSON.parse(raw), null, mode === 'f2' ? 2 : 4);
        showText(src.value);
      }
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (btn) run(btn.dataset.act === 'f2' ? 'f2' : btn.dataset.act === 'f4' ? 'f4' : btn.dataset.act === 'min' ? 'min' : 'tree');
        const toggle = e.target.closest('.j-toggle');
        if (toggle) {
          const kids = toggle.nextElementSibling;
          const open = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
          if (kids) kids.hidden = open;
        }
      });
      src.addEventListener('input', () => run('raw'));
      run('f2');
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
