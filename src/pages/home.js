/**
 * pages/home.js —— 原型第 1 页：首页
 *
 * 结构（自上而下）：
 *   校徽 + 校园失物招领 + 信封 ／ 搜索框 + 搜索按钮
 *   近期失物信息 ／ 三个 Tab（全部失物·失物寻找·失物招领）／ 信息卡片列表
 *   底部悬浮导航（高亮「首页」）
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var Q = LF.domain.query;

  var state = { type: 'all' };

  function render() {
    var items = LF.app.items();
    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar('home');

    view.appendChild(parts.brand({ message: true }));
    view.appendChild(parts.searchRow({ withBack: false, onSearch: goSearch }));
    view.appendChild(parts.sectionTitle('近期失物信息'));
    view.appendChild(parts.tabs(state.type, function (type) {
      state.type = type;
      render();
    }));

    var list = Q.run(items, { type: state.type });
    view.appendChild(list.length
      ? parts.list(list, '', open)
      : parts.empty('这里还没有信息'));

    view.scrollTop = 0;
  }

  function open(item) {
    ui.router.go(LF.app.isMine(item) ? '/mine/detail/' + item.id : '/detail/' + item.id);
  }

  function goSearch(keyword) {
    var kw = LF.domain.text.text(keyword);
    ui.router.go('/search-result', kw ? { q: kw } : {});
  }

  ui.pages = ui.pages || {};
  ui.pages.home = { render: render, reset: function () { state.type = 'all'; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
