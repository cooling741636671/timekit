(function (TK) {
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function hex32(n) { return (n >>> 0).toString(16).padStart(8, '0'); }

  function md5(bytes) {
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const K = new Uint32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    const bitLen = bytes.length * 8;
    const n = ((bytes.length + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(n);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(n - 8, bitLen >>> 0, true);
    view.setUint32(n - 4, Math.floor(bitLen / 4294967296), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let off = 0; off < n; off += 64) {
      const M = new Uint32Array(16);
      for (let j = 0; j < 16; j++) M[j] = view.getUint32(off + j * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const s = S[((i >>> 4) << 2) + (i & 3)];
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    function le(x) { return [x & 255, (x >>> 8) & 255, (x >>> 16) & 255, (x >>> 24) & 255]; }
    return le(a0).concat(le(b0), le(c0), le(d0)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function sha1(bytes) {
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const bitLen = bytes.length * 8;
    const n = ((bytes.length + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(n);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(n - 8, Math.floor(bitLen / 4294967296));
    view.setUint32(n - 4, bitLen >>> 0);
    const w = new Uint32Array(80);
    for (let i = 0; i < n; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4);
      for (let t = 16; t < 80; t++) {
        const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
        w[t] = ((x << 1) | (x >>> 31)) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let t = 0; t < 80; t++) {
        let f, k;
        if (t < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
        else if (t < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
        else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
        else { f = b ^ c ^ d; k = 0xca62c1d6; }
        const temp = ((((a << 5) | (a >>> 27)) + f + e + k + w[t]) >>> 0);
        e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = temp;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return [h0, h1, h2, h3, h4].map(hex32).join('');
  }

  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function sha256(bytes) {
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const bitLen = bytes.length * 8;
    const n = ((bytes.length + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(n);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(n - 8, Math.floor(bitLen / 4294967296));
    view.setUint32(n - 4, bitLen >>> 0);
    const w = new Uint32Array(64);
    for (let i = 0; i < n; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K256[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(hex32).join('');
  }

  const MASK = (1n << 64n) - 1n;
  const K512 = [
    0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn, 0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
    0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n, 0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
    0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n, 0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
    0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n, 0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
    0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn, 0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
    0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n, 0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
    0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n, 0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
    0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn, 0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
    0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n, 0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
    0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn, 0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n
  ];

  function sha512(bytes, iv, words) {
    const h = iv.slice();
    const bitLen = BigInt(bytes.length) * 8n;
    const n = ((bytes.length + 17 + 127) >> 7) << 7;
    const buf = new Uint8Array(n);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setBigUint64(n - 8, bitLen);
    const w = new Array(80);
    const rotr64 = (x, s) => ((x >> BigInt(s)) | (x << BigInt(64 - s))) & MASK;
    for (let i = 0; i < n; i += 128) {
      for (let t = 0; t < 16; t++) w[t] = view.getBigUint64(i + t * 8);
      for (let t = 16; t < 80; t++) {
        const s0 = rotr64(w[t - 15], 1) ^ rotr64(w[t - 15], 8) ^ (w[t - 15] >> 7n);
        const s1 = rotr64(w[t - 2], 19) ^ rotr64(w[t - 2], 61) ^ (w[t - 2] >> 6n);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) & MASK;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let t = 0; t < 80; t++) {
        const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (hh + S1 + ch + K512[t] + w[t]) & MASK;
        const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) & MASK;
        hh = g; g = f; f = e; e = (d + temp1) & MASK; d = c; c = b; b = a; a = (temp1 + temp2) & MASK;
      }
      h[0] = (h[0] + a) & MASK; h[1] = (h[1] + b) & MASK; h[2] = (h[2] + c) & MASK; h[3] = (h[3] + d) & MASK;
      h[4] = (h[4] + e) & MASK; h[5] = (h[5] + f) & MASK; h[6] = (h[6] + g) & MASK; h[7] = (h[7] + hh) & MASK;
    }
    return h.slice(0, words).map((x) => x.toString(16).padStart(16, '0')).join('');
  }

  const IV512 = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n];
  const IV384 = [0xcbbb9d5dc1059ed8n, 0x629a292a367cd507n, 0x9159015a3070dd17n, 0x152fecd8f70e5939n, 0x67332667ffc00b31n, 0x8eb44a8768581511n, 0xdb0c2e0d64f98fa7n, 0x47b5481dbefa4fa4n];

  function pure(alg, bytes) {
    if (alg === 'MD5') return md5(bytes);
    if (alg === 'SHA-1') return sha1(bytes);
    if (alg === 'SHA-256') return sha256(bytes);
    if (alg === 'SHA-384') return sha512(bytes, IV384, 6);
    return sha512(bytes, IV512, 8);
  }
  TK.hashPure = pure;

  function sleep() { return new Promise((r) => setTimeout(r, 0)); }

  async function encodeChunked(text, onProgress) {
    const enc = new TextEncoder();
    const size = 65536;
    const parts = [];
    for (let i = 0; i < text.length; i += size) {
      parts.push(enc.encode(text.slice(i, Math.min(text.length, i + size))));
      if (onProgress) onProgress(Math.min(0.45, ((i + size) / Math.max(1, text.length)) * 0.45));
      if (text.length > 200000 && (i / size) % 2 === 1) await sleep();
    }
    let n = 0;
    parts.forEach((p) => { n += p.length; });
    const all = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    return all;
  }

  async function digest(alg, text, onProgress) {
    const bytes = await encodeChunked(text, onProgress);
    if (bytes.length > 200000) await sleep();
    let hex = '';
    if (alg !== 'MD5' && crypto.subtle) {
      const buf = await crypto.subtle.digest(alg, bytes);
      hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      const slice = 262144;
      if (bytes.length <= slice) hex = pure(alg, bytes);
      else {
        /* 大文本仍一次性收尾，但前面的分块编码已经让出主线程。纯 JS 回退按块拼接状态成本高，这里再让出一次。 */
        await sleep();
        hex = pure(alg, bytes);
      }
    }
    if (onProgress) onProgress(1);
    return hex;
  }

  TK.modules = TK.modules || {};
  TK.modules.hash = {
    mount: function (el) {
      el.innerHTML =
        '<div class="page-head"><div><h1>哈希</h1><p>SHA 优先用 SubtleCrypto。file:// 下没有安全上下文时，改用内置实现。MD5 始终手写。</p></div></div>' +
        '<div class="card"><div class="row"><label class="field">算法<select data-alg><option>MD5</option><option>SHA-1</option><option selected>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></label>' +
        '<button type="button" class="btn primary" data-go>计算</button><button type="button" class="btn" data-copy>复制</button></div>' +
        '<label class="field">文本<textarea data-text>abc</textarea></label>' +
        '<div class="bar" style="margin-top:8px"><span data-prog></span></div>' +
        '<p class="mono" data-out style="word-break:break-all;margin-top:8px" aria-live="polite"></p></div>';
      let last = '';
      el.querySelector('[data-go]').addEventListener('click', async () => {
        const bar = el.querySelector('[data-prog]');
        bar.style.width = '0%';
        const hex = await digest(el.querySelector('[data-alg]').value, el.querySelector('[data-text]').value, (p) => { bar.style.width = Math.round(p * 100) + '%'; });
        last = hex;
        el.querySelector('[data-out]').textContent = hex;
      });
      el.querySelector('[data-copy]').addEventListener('click', () => { if (last) TK.copy(last); });
    },
    destroy: function () {}
  };
})(window.TK = window.TK || {});
