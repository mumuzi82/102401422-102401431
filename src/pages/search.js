/**
 * pages/search.js —— 原型第 2 页：搜索页面
 *
 * 结构：返回箭头 + 搜索框 + 「搜索」按钮 ／ 「常见物品」小标题 ／ 四个标签
 * （身份证·学生证·钥匙·背包）／ 大面积留白 ／ 底部导航（高亮「搜索」）
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;

  /** 原型上写死的四个常见物品 */
  var COMMON = ['身份证', '学生证', '钥匙', '背包'];

  function render(params, query) {
    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar('search');

    var row = parts.searchRow({
      withBack: true,
      value: (query && query.q) || '',
      onSearch: goSearch
    });
    view.appendChild(row);
    view.appendChild(parts.sectionTitle('常见物品'));
    view.appendChild(parts.chips(COMMON, goSearch));
    row.focusInput();
  }

  function goSearch(keyword) {
    var kw = LF.domain.text.text(keyword);
    ui.router.go('/search-result', kw ? { q: kw } : {});
  }

  ui.pages = ui.pages || {};
  ui.pages.search = { render: render, COMMON: COMMON };
})(typeof globalThis !== 'undefined' ? globalThis : this);
