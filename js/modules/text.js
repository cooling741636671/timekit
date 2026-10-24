(function (TK) {
  function bytesOf(s) { return new TextEncoder().encode(s).length; }
  function hanCount(s) { return (s.match(/\p{Script=Han}/gu) || []).length; }
  function toFull(s) {
    return Array.from(s).map((ch) => {
      const c = ch.codePointAt(0);
      if (c === 32) return '　';
      if (c >= 33 && c <= 126) return String.fromCodePoint(c + 0xFEE0);
      return ch;
    }).join('');
  }
  function toHalf(s) {
    return Array.from(s).map((ch) => {
      const c = ch.codePointAt(0);
      if (c === 0x3000) return ' ';
      if (c >= 0xFF01 && c <= 0xFF5E) return String.fromCodePoint(c - 0xFEE0);
      return ch;
    }).join('');
  }
  function b64encode(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64decode(s) {
    const bin = atob(s.replace(/\s/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  TK.modules = TK.modules || {};
  TK.modules.text = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>文本处理</h1><p>统计实时更新。转换结果写到右侧，原文保留。</p></div></div>' +
        '<div class="split"><div class="pane"><textarea data-src aria-label="原文" placeholder="在这里输入"></textarea>' +
        '<p class="hint" data-stat></p></div><div class="splitter" role="separator" aria-orientation="vertical"></div>' +
        '<div class="pane"><textarea data-out aria-label="结果" readonly></textarea>' +
        '<div class="row" style="margin-top:8px">' +
          btn('upper', '大写') + btn('lower', '小写') + btn('blank', '去空行') + btn('uniq', '去重行') +
          btn('sort', '排序') + btn('rev', '反转') + btn('b64e', 'Base64 编码') + btn('b64d', 'Base64 解码') +
          btn('full', '转全角') + btn('half', '转半角') + btn('copy', '复制结果') +
        '</div></div></div>';
      const src = el.querySelector('[data-src]');
      const out = el.querySelector('[data-out]');
      const stat = () => {
        const v = src.value;
        el.querySelector('[data-stat]').textContent =
          '字符 ' + v.length + ' · 不含空格 ' + v.replace(/\s/g, '').length + ' · 汉字 ' + hanCount(v) +
          ' · 行 ' + (v ? v.split(/\n/).length : 0) + ' · 字节 ' + bytesOf(v);
      };
      src.addEventListener('input', stat);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-op]');
        if (!b) return;
        const v = src.value;
        const lines = v.split(/\n/);
        const op = b.dataset.op;
        try {
          if (op === 'upper') out.value = v.toUpperCase();
          else if (op === 'lower') out.value = v.toLowerCase();
          else if (op === 'blank') out.value = lines.filter((l) => l.trim()).join('\n');
          else if (op === 'uniq') out.value = Array.from(new Set(lines)).join('\n');
          else if (op === 'sort') out.value = lines.slice().sort((a, c) => a.localeCompare(c, 'zh-CN')).join('\n');
          else if (op === 'rev') out.value = Array.from(v).reverse().join('');
          else if (op === 'b64e') out.value = b64encode(v);
          else if (op === 'b64d') out.value = b64decode(v);
          else if (op === 'full') out.value = toFull(v);
          else if (op === 'half') out.value = toHalf(v);
          else if (op === 'copy') TK.copy(out.value);
        } catch (err) {
          TK.toast('转换失败，请检查内容', 'error');
        }
      });
      const split = el.querySelector('.split');
      const bar = el.querySelector('.splitter');
      bar.addEventListener('pointerdown', (e) => {
        bar.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const rect = split.getBoundingClientRect();
          const x = Math.min(rect.width - 120, Math.max(120, ev.clientX - rect.left));
          split.style.gridTemplateColumns = x + 'px 8px 1fr';
        };
        const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
      });
      stat();
    },
    destroy: function () {}
  };
  function btn(op, label) { return '<button type="button" class="btn" data-op="' + op + '">' + label + '</button>'; }
})(window.TK = window.TK || {});
