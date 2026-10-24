(function (TK) {
  const bus = new Map();

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      const list = bus.get(key) || [];
      list.forEach((fn) => fn(val));
      return true;
    } catch (err) {
      const quota = err && (err.name === 'QuotaExceededError' || err.code === 22);
      if (TK.toast) TK.toast(quota ? '本地存储空间不足，未能保存' : '保存失败', 'error');
      return false;
    }
  }

  function on(key, fn) {
    if (!bus.has(key)) bus.set(key, []);
    bus.get(key).push(fn);
    return function () {
      const list = bus.get(key) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  TK.storage = { get: get, set: set, on: on };
})(window.TK = window.TK || {});
