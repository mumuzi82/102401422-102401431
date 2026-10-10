/**
 * router.js —— 极小的 hash 路由
 *
 * 原型是 10 个独立页面（首页 / 搜索页面 / 发布页 / 搜索结果页 / 信息详情页 /
 * 个人页 / 联系发布者页面 / 寻物发布页 / 寻物详情页 / 发布成功页），
 * 而作业要求"下载后双击 html 就能跑"，所以不能用服务端路由、也不能用 ES module。
 *
 * 选择 hash 路由的理由：
 *   1. `file://` 下 `#/xxx` 不会触发页面重载，也不需要服务器配合；
 *   2. 每个页面有独立可分享的地址，浏览器前进/后退可用；
 *   3. 外壳（状态栏、顶部栏、底部导航）只写一份，不用在 10 个 html 里各抄一遍。
 *
 * 路由表按"具体在前、通配在后"排，避免 `#/mine/detail/x` 被 `#/mine` 抢走。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};

  var ROUTES = [
    { name: 'home',         re: /^\/home$/ },
    { name: 'search',       re: /^\/search$/ },
    { name: 'searchResult', re: /^\/search-result$/ },
    { name: 'publish',      re: /^\/publish$/ },
    { name: 'publishForm',  re: /^\/publish\/(lost|found)$/, keys: ['type'] },
    { name: 'success',      re: /^\/success$/ },
    { name: 'contact',      re: /^\/contact\/([^/]+)$/, keys: ['id'] },
    { name: 'myDetail',     re: /^\/mine\/detail\/([^/]+)$/, keys: ['id'] },
    { name: 'mine',         re: /^\/mine$/ },
    { name: 'detail',       re: /^\/detail\/([^/]+)$/, keys: ['id'] }
  ];

  var DEFAULT_PATH = '/home';

  /** 把 `#/a/b?x=1` 解析成 { name, params, query } */
  function parse(hash) {
    var raw = String(hash === undefined ? root.location.hash : hash);
    raw = raw.replace(/^#/, '');
    if (!raw || raw === '/') raw = DEFAULT_PATH;

    var pieces = raw.split('?');
    var path = pieces[0];
    var queryString = pieces[1] || '';

    var query = {};
    if (queryString) {
      queryString.split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        try {
          query[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
        } catch (e) {
          query[kv[0]] = kv[1] || '';
        }
      });
    }

    for (var i = 0; i < ROUTES.length; i++) {
      var route = ROUTES[i];
      var matched = route.re.exec(path);
      if (!matched) continue;
      var params = {};
      (route.keys || []).forEach(function (key, index) {
        try {
          params[key] = decodeURIComponent(matched[index + 1]);
        } catch (e) {
          params[key] = matched[index + 1];
        }
      });
      return { name: route.name, path: path, params: params, query: query };
    }

    return { name: 'notFound', path: path, params: {}, query: query };
  }

  /** 跳到一个新地址。会写进浏览历史，所以后退键可用 */
  /** 把「路径 + 查询」拼成 hash 片段 */
  function buildHash(path, query) {
    var hash = '#/' + String(path).replace(/^\/+/, '');
    if (query) {
      var parts = [];
      Object.keys(query).forEach(function (key) {
        if (query[key] === undefined || query[key] === null) return;
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
      });
      if (parts.length) hash += '?' + parts.join('&');
    }
    return hash;
  }

  /** 跳到一个新地址。会写进浏览历史，所以后退键可用 */
  function go(path, query) {
    var hash = buildHash(path, query);
    if (root.location.hash === hash) {
      // 地址没变时 hashchange 不会触发，手动重放一次，保证页面刷新
      root.LF.app && root.LF.app.renderCurrent && root.LF.app.renderCurrent();
      return;
    }
    root.location.hash = hash;
  }

  /**
   * 替换当前地址，**不新增历史记录**。
   *
   * 用在"这个页面不该给这个访问者看"的场合：例如别人手改地址打开
   * 发布者视角的详情页时，直接换成浏览者视角，而不是让后退键在两个地址
   * 之间来回弹（go 会 push 一条历史，replace 不会）。
   */
  function replace(path, query) {
    var hash = buildHash(path, query);
    if (root.location.hash === hash) {
      root.LF.app && root.LF.app.renderCurrent && root.LF.app.renderCurrent();
      return;
    }
    root.location.replace(root.location.pathname + root.location.search + hash);
  }

  /** 返回上一页；没有历史就回首页（例如直接从 #/detail/x 打开的情况） */
  function back() {
    var parsed = parse();
    if (parsed.name === 'home') return;
    if (root.history && root.history.length > 1) {
      root.history.back();
      // 某些情况下（例如首个历史项就是详情页）back 会退出页面，兜一手
      setTimeout(function () {
        if (parse().name === 'notFound') go(DEFAULT_PATH);
      }, 120);
      return;
    }
    go(DEFAULT_PATH);
  }

  /** 启动路由：地址变化时调用 handler(parsed) */
  function start(handler) {
    function dispatch() { handler(parse()); }
    root.addEventListener('hashchange', dispatch);
    if (!root.location.hash) {
      root.location.replace(root.location.pathname + '#' + DEFAULT_PATH);
    }
    dispatch();
  }

  ui.router = {
    ROUTES: ROUTES,
    DEFAULT_PATH: DEFAULT_PATH,
    parse: parse,
    go: go,
    replace: replace,
    back: back,
    start: start,
    current: function () { return parse(); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
