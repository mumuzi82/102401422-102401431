/**
 * pages/searchResult.js —— 原型第 4 页：搜索结果页
 *
 * 结构：返回箭头 + 搜索框（框内是刚才的关键词）+ 「搜索」按钮
 * ／ 「搜索结果」标题 ／ 「共找到 N 条相关结果」／ 结果卡片 ／ 底部导航（高亮「搜索」）
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var Q = LF.domain.query;
  var T = LF.domain.text;

  function render(params, query) {
    var keyword = T.text(query && query.q);
    var items = Q.filter(LF.app.items(), { keyword: keyword });

    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar('search');

    view.appendChild(parts.searchRow({
      withBack: true,
      value: keyword,
      onSearch: function (next) {
        var kw = T.text(next);
        ui.router.go('/search-result', kw ? { q: kw } : {});
      }
    }));

    view.appendChild(parts.sectionTitle('搜索结果', { brand: true }));

    if (!items.length) {
      view.appendChild(parts.empty(keyword
        ? '没有找到与「' + keyword + '」相关的信息，换个关键词试试'
        : '还没有任何信息'));
      return;
    }

    view.appendChild(dom('共找到 ' + items.length + ' 条相关结果'));
    view.appendChild(parts.list(items, keyword, open));
  }

  function dom(text) {
    return ui.dom.h('p', { class: 'section-count', text: text });
  }

  function open(item) {
    ui.router.go(LF.app.isMine(item) ? '/mine/detail/' + item.id : '/detail/' + item.id);
  }

  ui.pages = ui.pages || {};
  ui.pages.searchResult = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
