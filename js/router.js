(function (TK) {
  let currentDestroy = null;
  let handleKey = null;

  function parse() {
    const raw = (location.hash || '#/').replace(/^#/, '');
    let path = raw;
    let qs = '';
    const q = raw.indexOf('?');
    if (q >= 0) {
      path = raw.slice(0, q);
      qs = raw.slice(q + 1);
    }
    try { path = decodeURIComponent(path); } catch (err) { /* 保持原样 */ }
    const name = path.replace(/^\//, '') || 'home';
    const query = Object.fromEntries(new URLSearchParams(qs));
    return { name: name, query: query };
  }

  function go(hash) {
    if (location.hash === hash) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    location.hash = hash;
  }

  function setCleanup(fn) { currentDestroy = fn; }
  function setKeyHandler(fn) { handleKey = fn; }
  function keyHandler() { return handleKey; }

  function start(onRoute) {
    function run() {
      if (typeof currentDestroy === 'function') {
        try { currentDestroy(); } catch (err) { console.error(err); }
      }
      currentDestroy = null;
      handleKey = null;
      onRoute(parse());
    }
    window.addEventListener('hashchange', run);
    run();
  }

  TK.router = {
    parse: parse,
    go: go,
    start: start,
    setCleanup: setCleanup,
    setKeyHandler: setKeyHandler,
    keyHandler: keyHandler
  };
})(window.TK = window.TK || {});
