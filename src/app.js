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
  var dom = ui.dom;
  var parts = ui.parts;
  var L = LF.domain.lifecycle;

  var repo = LF.storage.create({
    key: LF.storage.SEED_KEY,
    seed: LF.storage.buildSeed
  });

  var profile = LF.storage.buildProfile();
  var items = [];

  /**
   * 本地数据读取失败时的原因，正常时为空串。
   *
   * 为什么它必须是一个"持续状态"而不是渲染一次就完：
   * 之前 `load()` 把错误画进页面后，紧接着的路由首次分发会用首页把它盖掉，
   * 用户看到的是普通的「这里还没有信息」，完全不知道数据出过事；
   * 更糟的是他以为只是没数据、随手发布一条，写入就会把损坏的原始内容
   * 永久覆盖掉（适配器里"不做任何写入"的承诺在应用层被打破）。
   *
   * 所以：读取失败要优先展示、并且在恢复之前禁止任何写入。
   */
  var readError = '';
  var MAX_RAW_PREVIEW = 4000;

  /* ------------------------------------------------------------ 数据入口 */

  function all() { return items; }

  function find(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  /** 是不是本机发布的（判断规则在领域层的 lifecycle.owns，这里只是转调） */
  function isMine(item) {
    return L.owns(item, profile);
  }

  function newId() {
    return 'i-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  /**
   * 统一的写入口：先落盘，成功了才更新内存，避免"界面变了数据没存上"。
   * 读取失败的状态下一律拒绝写入 —— 否则会把损坏的原始内容覆盖掉。
   */
  function persist(next) {
    if (readError) {
      ui.toast.show('本地数据读取失败，为避免覆盖原始记录，本次不做写入', { duration: 5000 });
      return false;
    }
    var saved = repo.write(next);
    if (!saved.ok) {
      ui.toast.show(saved.error || '保存失败，请稍后重试', { duration: 5000 });
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
      readError = result.error;
      return false;
    }
    items = result.items;
    readError = '';
    return true;
  }

  /* ------------------------------------------------- 读取失败时的专门页面 */

  /**
   * 数据坏了的时候，全站只显示这一页：
   * 说明出了什么事、把原始内容摊出来让用户先留底、再给一个明确的恢复动作。
   * 在恢复之前，底部导航、各页面都不出现 —— 没有数据可看，也不该让用户点进别的页面去写。
   */
  function renderReadError() {
    var host = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar(null);

    var raw = repo.rawText() || '';
    var panel = dom.h('div', { class: 'empty is-error' });

    panel.appendChild(dom.h('span', { class: 'empty-ico', 'aria-hidden': 'true', text: '⚠️' }));
    panel.appendChild(dom.h('h3', { text: '本地数据读取失败' }));
    panel.appendChild(dom.h('p', { text: readError }));
    panel.appendChild(dom.h('p', {
      text: '为免覆盖原始记录，这次没有做任何写入。下面是从浏览器里原样取出的内容，' +
            '可以先全选复制出来留底，再点下面的按钮恢复。'
    }));

    var area = dom.h('textarea', {
      class: 'raw-area', readonly: true, rows: 8,
      'aria-label': '浏览器里保存的原始数据'
    });
    area.value = raw.length > MAX_RAW_PREVIEW
      ? raw.slice(0, MAX_RAW_PREVIEW) + '\n……（已截断显示，完整长度 ' + raw.length + ' 字符）'
      : raw;
    panel.appendChild(dom.h('div', { class: 'raw-box' }, [area]));

    panel.appendChild(dom.h('div', { class: 'actions is-center' }, [
      parts.primaryButton('恢复示例数据', function () {
        if (!confirm('确定丢弃读取失败的数据、恢复成示例数据吗？\n上面的原始内容是最后一次机会，请确认已经复制。')) return;
        repo.reset();
        load();
        renderRoute(ui.router.current());
        ui.toast.show('已恢复示例数据');
      })
    ]));

    host.appendChild(panel);
  }

  /* ------------------------------------------------------------ 路由分发 */

  function renderRoute(route) {
    // 读取失败时优先展示错误页，任何路由都不例外
    if (readError) { renderReadError(); return; }

    var page = ui.pages[route.name];
    if (!page) {
      var host = ui.shell.view();
      ui.shell.hideAppbar();
      ui.shell.tabbar(null);
      host.appendChild(parts.empty('页面不存在：' + route.path));
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
    hasReadError: function () { return !!readError; },
    renderCurrent: function () { renderRoute(ui.router.current()); }
  };

  load();
  ui.router.start(renderRoute);
})(typeof globalThis !== 'undefined' ? globalThis : this);
