(function (TK) {
  function inline(raw) {
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(raw))) {
      out += TK.escapeHtml(raw.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('`')) out += '<code>' + TK.escapeHtml(tok.slice(1, -1)) + '</code>';
      else if (tok.startsWith('**')) out += '<strong>' + TK.escapeHtml(tok.slice(2, -2)) + '</strong>';
      else if (tok.startsWith('*')) out += '<em>' + TK.escapeHtml(tok.slice(1, -1)) + '</em>';
      else {
        let href = m[3];
        if (!/^(https?:|mailto:|#|\/)/i.test(href)) href = '#';
        out += '<a href="' + TK.escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + TK.escapeHtml(m[2]) + '</a>';
      }
      last = m.index + tok.length;
    }
    return out + TK.escapeHtml(raw.slice(last));
  }

  function render(src) {
    const lines = String(src).replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('```')) {
        const buf = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
        i += 1;
        blocks.push('<pre><code>' + TK.escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        const head = splitRow(line);
        i += 2;
        const body = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { body.push(splitRow(lines[i])); i += 1; }
        blocks.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          body.map((row) => '<tr>' + row.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
        continue;
      }
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        const level = heading[1].length;
        blocks.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
        i += 1;
        continue;
      }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        blocks.push('<blockquote><p>' + inline(buf.join(' ')) + '</p></blockquote>');
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          const text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
          const task = /^\[( |x|X)\]\s+(.*)$/.exec(text);
          if (task) items.push('<li><input type="checkbox" disabled' + (task[1].toLowerCase() === 'x' ? ' checked' : '') + '> ' + inline(task[2]) + '</li>');
          else items.push('<li>' + inline(text) + '</li>');
          i += 1;
        }
        blocks.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if (!line.trim()) { i += 1; continue; }
      const buf = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|```|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) {
        buf.push(lines[i]); i += 1;
      }
      blocks.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return blocks.join('\n');
  }
  function splitRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  }
  function insert(area, before, after) {
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const picked = area.value.slice(start, end) || '文本';
    const next = area.value.slice(0, start) + before + picked + after + area.value.slice(end);
    area.value = next;
    area.focus();
    area.selectionStart = start + before.length;
    area.selectionEnd = start + before.length + picked.length;
  }

  TK.modules = TK.modules || {};
  TK.modules.markdown = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>Markdown</h1><p>左侧编写，右侧预览。支持表格、代码块和任务列表。</p></div>' +
        '<div class="row">' +
          '<button type="button" class="btn" data-ins="**|**">加粗</button>' +
          '<button type="button" class="btn" data-ins="## |">标题</button>' +
          '<button type="button" class="btn" data-ins="[|](https://)">链接</button>' +
          '<button type="button" class="btn" data-ins="`|`">代码</button>' +
          '<button type="button" class="btn" data-ins="> |">引用</button>' +
          '<button type="button" class="btn" data-export>导出 HTML</button></div></div>' +
        '<div class="split"><textarea data-src aria-label="Markdown"># 标题\n\n- [x] 已完成\n- [ ] 待办\n\n| 名称 | 值 |\n| --- | --- |\n| TimeKit | 16 |\n\n```\ncode\n```</textarea>' +
        '<div class="splitter" role="separator" aria-orientation="vertical" tabindex="0" aria-label="调整分栏"></div>' +
        '<div class="preview" data-view></div></div>';
      const src = el.querySelector('[data-src]');
      const view = el.querySelector('[data-view]');
      const paint = () => { view.innerHTML = render(src.value); };
      src.addEventListener('input', paint);
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ins]');
        if (btn) {
          const [before, after] = btn.dataset.ins.split('|');
          insert(src, before, after || '');
          paint();
        }
        if (e.target.closest('[data-export]')) {
          const html = '<!DOCTYPE html><html lang="zh-CN"><meta charset="utf-8"><title>TimeKit Markdown</title><body>' + view.innerHTML + '</body></html>';
          const blob = new Blob([html], { type: 'text/html' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'timekit.md.html';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 800);
        }
      });
      const split = el.querySelector('.split');
      const bar = el.querySelector('.splitter');
      function drag(ev) {
        const rect = split.getBoundingClientRect();
        const x = Math.min(rect.width - 160, Math.max(160, ev.clientX - rect.left));
        split.style.gridTemplateColumns = x + 'px 8px 1fr';
      }
      bar.addEventListener('pointerdown', (e) => {
        bar.setPointerCapture(e.pointerId);
        const move = (ev) => drag(ev);
        const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
      });
      paint();
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
