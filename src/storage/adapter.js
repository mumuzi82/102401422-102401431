/**
 * adapter.js —— 存储层：可注入后端的仓库
 *
 * 设计要点（这也是本项目跟"到处直接写 localStorage"最大的区别）：
 *
 * 1. **后端是注入进来的**。`create({ backend })` 只要求传进来的对象满足
 *    `getItem / setItem / removeItem` 三个方法（就是 Storage 接口）。
 *    浏览器里传 `window.localStorage`；单元测试里传一个用 Map 做的假 Storage。
 *    于是"存储逻辑"能在 Node 里被测到，不需要开浏览器、不需要 jsdom。
 *
 * 2. **读写失败不抛异常，返回 { ok, error }**。localStorage 会满（约 5MB），
 *    Safari 无痕模式下 setItem 直接抛错。这些都不该让页面白屏，而应该让
 *    调用方拿到一个可以展示给用户的中文原因。
 *
 * 3. **JSON 损坏时不覆盖原数据**。宁可这次读不出来，也不能把用户还能手工抢救的
 *    原始字符串直接抹掉。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var storage = LF.storage = LF.storage || {};

  var PROBE_KEY = '__lf_probe__';

  /** 用一个 Map 实现的 Storage，接口与 localStorage 一致。测试与降级都用它 */
  function memoryBackend(initial) {
    var map = Object.create(null);
    if (initial) {
      Object.keys(initial).forEach(function (k) { map[k] = String(initial[k]); });
    }
    return {
      getItem: function (k) { return k in map ? map[k] : null; },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; },
      key: function (i) { return Object.keys(map)[i] || null; },
      get length() { return Object.keys(map).length; },
      __memory: true
    };
  }

  /** 探针：能写能删才算可用（Safari 无痕下 setItem 会抛错） */
  function backendUsable(backend) {
    if (!backend || typeof backend.getItem !== 'function') return false;
    try {
      backend.setItem(PROBE_KEY, '1');
      backend.removeItem(PROBE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 默认后端：浏览器用 localStorage，否则退化成内存（页面仍能用，只是不持久） */
  function defaultBackend() {
    var ls = null;
    try { ls = root.localStorage; } catch (e) { ls = null; }
    if (backendUsable(ls)) return ls;
    return memoryBackend();
  }

  /**
   * 建一个仓库。
   * @param {Object} opts
   *   key     存储键，默认 'lf.items.v1'
   *   backend 满足 Storage 接口的对象，默认自动挑选
   *   seed    首次为空时的示例数据工厂函数
   */
  function create(opts) {
    var o = opts || {};
    var key = o.key || 'lf.items.v1';
    var backend = backendUsable(o.backend) ? o.backend : defaultBackend();
    var mode = backend.__memory ? 'memory' : 'localStorage';
    var seedFactory = o.seed || function () { return []; };

    function readRaw() {
      try { return backend.getItem(key); } catch (e) { return null; }
    }

    /**
     * 读全部条目。
     * @returns {{ok:boolean, items:Array, error:string, seeded:boolean}}
     */
    function read() {
      var raw = readRaw();

      if (raw === null || raw === undefined || raw === '') {
        var seed = seedFactory() || [];
        var wrote = write(seed);
        return { ok: true, items: seed, error: wrote.error || '', seeded: true };
      }

      try {
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('顶层不是数组');
        return { ok: true, items: parsed, error: '', seeded: false };
      } catch (e) {
        // 关键：**不覆盖**损坏的数据，让用户还有机会自己导出抢救
        return {
          ok: false, items: [], seeded: false,
          error: '本地数据解析失败（' + e.message + '）。为避免覆盖原始记录，本次不做任何写入，' +
                 '可在浏览器控制台执行 LF.app.rawText() 取回原始字符串。'
        };
      }
    }

    /** 写入全部条目 */
    function write(items) {
      var list = Array.isArray(items) ? items : [];
      try {
        backend.setItem(key, JSON.stringify(list));
        return { ok: true, error: '' };
      } catch (e) {
        var quota = /quota|exceed/i.test(String(e && e.name) + String(e && e.message));
        return {
          ok: false,
          error: quota
            ? '本地存储已满，本条没有保存成功。可以先导出备份、再删掉一些旧信息。'
            : '本地存储写入失败：' + (e && e.message ? e.message : '未知原因')
        };
      }
    }

    /**
     * 读—改—写。mutator 收到当前数组，返回新数组。
     * 所有写操作都走这里，避免"分布在各处的 setItem"。
     */
    function update(mutator) {
      var current = read();
      if (!current.ok) return { ok: false, items: [], error: current.error };
      var next;
      try {
        next = mutator(current.items);
      } catch (e) {
        return { ok: false, items: current.items, error: '更新数据时出错：' + e.message };
      }
      var wrote = write(next);
      return { ok: wrote.ok, items: next, error: wrote.error };
    }

    /** 导出成一份带元信息的 JSON 文本（换设备/备份用） */
    function exportText(now) {
      var current = read();
      return JSON.stringify({
        app: 'campus-lost-and-found',
        version: LF.domain.schema.VERSION,
        exportedAt: new Date(now === undefined ? Date.now() : now).toISOString(),
        count: current.items.length,
        items: current.items
      }, null, 2);
    }

    /** 从备份文本恢复。结构校验交给 domain.validate.importPayload */
    function importText(raw) {
      var checked = LF.domain.validate.importPayload(raw);
      if (!checked.ok) return checked;
      var wrote = write(checked.items);
      return { ok: wrote.ok, items: checked.items, errors: checked.errors,
               skipped: checked.skipped, error: wrote.error };
    }

    /** 恢复示例数据 */
    function reset() {
      try { backend.removeItem(key); } catch (e) { /* 忽略 */ }
      return read();
    }

    /**
     * 订阅跨标签页变化。
     * 只在真正有 storage 事件的浏览器后端下生效；memory 后端返回一个空函数。
     * 这是"另一台标签页改了状态，这一页跟着刷新"的实现基础。
     */
    function subscribe(listener) {
      if (mode !== 'localStorage' || typeof root.addEventListener !== 'function') {
        return function () {};
      }
      function onStorage(event) {
        if (event.key !== null && event.key !== key) return;   // null = 被 clear()
        listener(read());
      }
      root.addEventListener('storage', onStorage);
      return function () { root.removeEventListener('storage', onStorage); };
    }

    return {
      key: key,
      mode: mode,
      read: read,
      write: write,
      update: update,
      exportText: exportText,
      importText: importText,
      reset: reset,
      subscribe: subscribe,
      rawText: readRaw
    };
  }

  storage.memoryBackend = memoryBackend;
  storage.backendUsable = backendUsable;
  storage.create = create;
})(typeof globalThis !== 'undefined' ? globalThis : this);
