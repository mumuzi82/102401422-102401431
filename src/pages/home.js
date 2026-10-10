/**
 * pages/home.js —— 原型第 1 页：首页
 *
 * 结构（自上而下）：
 *   校徽 + 校园失物招领 + 信封 ／ 搜索框 + 搜索按钮
 *   近期失物信息 ／ 三个 Tab（全部失物·失物寻找·失物招领）
 *   ★ 类别筛选条（丘南星补充：按物品类别横向筛选）★
 *   ／ 信息卡片列表 ／ 底部悬浮导航（高亮「首页」）
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;
  var Q = LF.domain.query;
  var S = LF.domain.schema;

  var state = { type: 'all', category: 'all' };

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

    // ★ 类别筛选条
    view.appendChild(categoryBar(items));

    var list = Q.run(items, { type: state.type, category: state.category });
    view.appendChild(list.length
      ? parts.list(list, '', open)
      : parts.empty('这里还没有信息'));

    view.scrollTop = 0;
  }

  /**
   * 类别筛选条：横向滚动的 chip 组。
   * 计数用 domain 里现成的 Q.categoryCounts（已扣除 category 条件本身，
   * 所以点进任何一个类别都能看到"如果切过去会有多少条"，不会一进去只剩 1 个）。
   */
  function categoryBar(items) {
    var counts = Q.categoryCounts(items, { type: state.type });
    var options = [{ value: 'all', label: '全部' }].concat(
      S.CATEGORIES.map(function (c) { return { value: c, label: c }; })
    );

    var bar = dom.h('div', { class: 'category-bar' });
    options.forEach(function (opt) {
      var count = counts[opt.value] || 0;
      // 无内容的类别（除「全部」外）置灰不可点，避免点进去看到空白页
      var empty = opt.value !== 'all' && count === 0;
      var chip = dom.h('button', {
        type: 'button',
        class: 'cat-chip'
          + (opt.value === state.category ? ' is-on' : '')
          + (empty ? ' is-empty' : ''),
        disabled: empty,
        text: opt.label + (opt.value === 'all' ? '' : '(' + count + ')'),
        onclick: function () {
          state.category = opt.value;
          render();
        }
      });
      bar.appendChild(chip);
    });
    return bar;
  }

  function open(item) {
    ui.router.go(LF.app.isMine(item) ? '/mine/detail/' + item.id : '/detail/' + item.id);
  }

  function goSearch(keyword) {
    var kw = LF.domain.text.text(keyword);
    ui.router.go('/search-result', kw ? { q: kw } : {});
  }

  ui.pages = ui.pages || {};
  ui.pages.home = {
    render: render,
    reset: function () { state.type = 'all'; state.category = 'all'; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
