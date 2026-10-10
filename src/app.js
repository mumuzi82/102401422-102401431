/**
 * app.js —— 装配与启动
 *
 * 职责边界：
 *   - 持有唯一的数据源（存储仓库 + 内存里的当前列表）
 *   - 给页面提供读写入口（items / find / isMine / add / replace / remove）
 *   - 把路由接到页面上
 * 业务规则一律不写在这里（那在 domain/ 里），页面长什么样也不写在这里（那在 pages/ 里）。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;

  var repo = LF.storage.create({
    key: LF.storage.SEED_KEY,
    seed: LF.storage.buildSeed
  });

  var profile = LF.storage.buildProfile();
  var items = [];

  /* ------------------------------------------------------------ 数据入口 */

  function all() { return items; }

  function find(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  /** 是不是本机发布的（没有登录，用发布者学工号与本地档案比对） */
  function isMine(item) {
    return !!(item && item.publisher && item.publisher.sid === profile.sid);
  }

  function newId() {
    return 'i-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  /** 统一的写入口：先落盘，成功了才更新内存，避免"界面变了数据没存上" */
  function persist(next) {
    var saved = repo.write(next);
    if (!saved.ok) {
      ui.toast.show(saved.error || '保存失败，请稍后重试');
      return false;
    }
    items = next;
    return true;
  }

  function add(item) { return persist([item].concat(items)); }

  function replace(item) {
    return persist(items.map(function (it) { return it.id === item.id ? item : it; }));
  }

  /** 取消发布：把这条从列表里移除 */
  function remove(id) {
    return persist(items.filter(function (it) { return it.id !== id; }));
  }

  /* ------------------------------------------------------------ 数据读取 */

  function load() {
    var result = repo.read();
    if (!result.ok) {
      items = [];
      var host = ui.shell.view();
      ui.shell.hideAppbar();
      ui.shell.tabbar(null);
      host.appendChild(ui.parts.empty(result.error));
      return false;
    }
    items = result.items;
    return true;
  }

  /* ------------------------------------------------------------ 路由分发 */

  function renderRoute(route) {
    var page = ui.pages[route.name];
    if (!page) {
      var host = ui.shell.view();
      ui.shell.hideAppbar();
      ui.shell.tabbar(null);
      host.appendChild(ui.parts.empty('页面不存在：' + route.path));
      return;
    }
    page.render(route.params, route.query);
  }

  root.LF.app = {
    repo: repo,
    items: all,
    find: find,
    isMine: isMine,
    profile: function () { return profile; },
    newId: newId,
    add: add,
    replace: replace,
    remove: remove,
    reload: load,
    renderCurrent: function () { renderRoute(ui.router.current()); }
  };

  load();
  ui.router.start(renderRoute);
})(typeof globalThis !== 'undefined' ? globalThis : this);
