(function (TK) {
  if (window.qrcode && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }
  let timer = 0;

  function draw(canvas, text, level, size, fg, bg) {
    const qr = qrcode(0, level);
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const scale = Math.max(1, Math.floor(size / n));
    canvas.width = n * scale;
    canvas.height = n * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
  }

  TK.modules = TK.modules || {};
  TK.modules.qrcode = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>二维码</h1><p>超长文本会直接跳过，避免卡住页面。容量大约一千多字。</p></div></div>' +
        '<div class="card"><label class="field">内容<textarea data-text placeholder="文本或链接" style="min-height:90px"></textarea></label>' +
        '<div class="row" style="margin-top:8px">' +
          '<label class="field">纠错<select data-ec><option>L</option><option selected>M</option><option>Q</option><option>H</option></select></label>' +
          '<label class="field">尺寸<input data-size type="range" min="128" max="512" value="256"></label>' +
          '<label class="field">前景<input data-fg type="color" value="#071018"></label>' +
          '<label class="field">背景<input data-bg type="color" value="#ffffff"></label>' +
          '<button type="button" class="btn primary" data-dl>下载 PNG</button></div>' +
        '<div class="qr-box"><canvas data-canvas></canvas></div><p class="hint" data-msg></p></div>';
      const canvas = el.querySelector('[data-canvas]');
      const msg = el.querySelector('[data-msg]');
      function render() {
        const text = el.querySelector('[data-text]').value;
        msg.textContent = '';
        if (!text) { canvas.width = 0; canvas.height = 0; return; }
        if (text.length > 1200) {
          canvas.width = 0; canvas.height = 0;
          msg.textContent = '内容超出二维码容量，已跳过生成。';
          return;
        }
        try {
          draw(canvas, text, el.querySelector('[data-ec]').value, Number(el.querySelector('[data-size]').value), el.querySelector('[data-fg]').value, el.querySelector('[data-bg]').value);
        } catch (err) {
          msg.textContent = '生成失败：' + (err && err.message ? err.message : '内容不适合当前纠错等级');
        }
      }
      const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 60); };
      el.addEventListener('input', schedule);
      el.querySelector('[data-dl]').addEventListener('click', () => {
        if (!canvas.width) { TK.toast('还没有可下载的二维码', 'warn'); return; }
        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'timekit-qrcode.png';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
      });
    },
    destroy: function () { clearTimeout(timer); }
  };
})(window.TK = window.TK || {});
