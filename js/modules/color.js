(function (TK) {
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function hexToRgb(hex) {
    let h = hex.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function contrast(a, b) {
    const L1 = lum(a), L2 = lum(b);
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function judge(ratio) {
    return 'AA 正文 ' + (ratio >= 4.5 ? '通过' : '未过') + ' · AAA 正文 ' + (ratio >= 7 ? '通过' : '未过') +
      ' · AA 大字 ' + (ratio >= 3 ? '通过' : '未过');
  }

  TK.modules = TK.modules || {};
  TK.modules.color = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>颜色工具</h1><p>对比度按 WCAG 相对亮度计算。吸管需要 Chromium 且在安全上下文里。</p></div></div>' +
        '<div class="card"><div class="color-stage" data-stage></div>' +
        '<div class="row" style="margin-top:12px">' +
          '<label class="field">HEX<input data-hex value="#38f9d7"></label>' +
          '<label class="field">R<input data-r type="number" min="0" max="255"></label>' +
          '<label class="field">G<input data-g type="number" min="0" max="255"></label>' +
          '<label class="field">B<input data-b type="number" min="0" max="255"></label>' +
          '<label class="field">H<input data-h type="number" min="0" max="360"></label>' +
          '<label class="field">S<input data-s type="number" min="0" max="100"></label>' +
          '<label class="field">L<input data-l type="number" min="0" max="100"></label>' +
        '</div><div class="row" style="margin-top:8px"><label class="field">背景色<input data-bg value="#070b16"></label>' +
          '<button type="button" class="btn" data-eye>吸管</button><p data-contrast class="hint"></p></div>' +
        '<div class="chips" data-chips style="margin-top:12px"></div></div>';
      const stage = el.querySelector('[data-stage]');
      let lock = false;
      function apply(rgb, source) {
        if (!rgb) return;
        const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
        const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        lock = true;
        if (source !== 'hex') el.querySelector('[data-hex]').value = hex;
        if (source !== 'rgb') {
          el.querySelector('[data-r]').value = Math.round(rgb[0]);
          el.querySelector('[data-g]').value = Math.round(rgb[1]);
          el.querySelector('[data-b]').value = Math.round(rgb[2]);
        }
        if (source !== 'hsl') {
          el.querySelector('[data-h]').value = hsl[0].toFixed(0);
          el.querySelector('[data-s]').value = hsl[1].toFixed(0);
          el.querySelector('[data-l]').value = hsl[2].toFixed(0);
        }
        lock = false;
        stage.style.background = hex;
        const bg = hexToRgb(el.querySelector('[data-bg]').value) || [7, 11, 22];
        const ratio = contrast(rgb, bg);
        el.querySelector('[data-contrast]').textContent = '对比度 ' + ratio.toFixed(2) + ' : 1 · ' + judge(ratio);
        const h = hsl[0];
        const pals = [
          hslToRgb((h + 180) % 360, hsl[1], hsl[2]),
          hslToRgb((h + 30) % 360, hsl[1], hsl[2]),
          hslToRgb((h + 330) % 360, hsl[1], hsl[2]),
          hslToRgb((h + 120) % 360, hsl[1], hsl[2]),
          hslToRgb((h + 240) % 360, hsl[1], hsl[2])
        ];
        const names = ['互补', '相邻', '相邻', '三角', '三角'];
        el.querySelector('[data-chips]').innerHTML = pals.map((c, i) => {
          const hx = rgbToHex(c[0], c[1], c[2]);
          return '<button type="button" data-pick="' + hx + '" style="background:' + hx + '" aria-label="' + names[i] + ' ' + hx + '"></button>';
        }).join('');
      }
      function current() {
        return [Number(el.querySelector('[data-r]').value), Number(el.querySelector('[data-g]').value), Number(el.querySelector('[data-b]').value)];
      }
      el.addEventListener('input', (e) => {
        if (lock) return;
        if (e.target.matches('[data-hex]')) apply(hexToRgb(e.target.value), 'hex');
        else if (e.target.matches('[data-r],[data-g],[data-b]')) apply(current(), 'rgb');
        else if (e.target.matches('[data-h],[data-s],[data-l]')) {
          apply(hslToRgb(Number(el.querySelector('[data-h]').value), Number(el.querySelector('[data-s]').value), Number(el.querySelector('[data-l]').value)), 'hsl');
        } else if (e.target.matches('[data-bg]')) apply(current(), 'rgb');
      });
      el.addEventListener('click', async (e) => {
        const pick = e.target.closest('[data-pick]');
        if (pick) { apply(hexToRgb(pick.dataset.pick), ''); TK.copy(pick.dataset.pick); return; }
        if (e.target.closest('[data-eye]')) {
          if (!window.EyeDropper) { TK.toast('当前浏览器没有吸管接口', 'warn'); return; }
          try {
            const result = await new EyeDropper().open();
            apply(hexToRgb(result.sRGBHex), '');
          } catch (err) { /* 用户取消 */ }
        }
      });
      apply(hexToRgb('#38f9d7'), 'hex');
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
