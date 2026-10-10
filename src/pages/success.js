/**
 * pages/success.js —— 原型第 10 页：发布成功页
 *
 * 结构：顶部栏只有返回箭头（原型这一页没有标题）
 * ／ 红色大对勾 ／「发布成功！」／ 底部「查看发布详情」按钮。没有底部导航。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;

  function render(params, query) {
    var view = ui.shell.view();
    ui.shell.tabbar(null);
    ui.shell.appbar({ back: true, bare: true });

    var id = query && query.id;

    var check = parts.icons.check(64);
    check.setAttribute('stroke', 'var(--brand)');

    view.appendChild(dom.h('div', { class: 'success' }, [
      check,
      dom.h('h2', { text: '发布成功！' }),
      parts.primaryButton('查看发布详情', function () {
        ui.router.go(id ? '/mine/detail/' + id : '/mine');
      }, { wide: true })
    ]));
  }

  ui.pages = ui.pages || {};
  ui.pages.success = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
