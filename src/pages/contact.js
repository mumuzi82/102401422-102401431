/**
 * pages/contact.js —— 原型第 7 页：联系发布者页面
 *
 * 结构：顶部栏（返回 + 联系发布者 + 右侧校徽）
 * ／ 一张「发布者信息」卡片：人像图标 + 红色标题，下面 姓名/学工号/学院，
 *    空一行后接 联系电话 与 邮箱 ／ 页面其余部分留白。没有按钮，也没有底部导航。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;

  function render(params) {
    var item = LF.app.find(params.id);
    var view = ui.shell.view();
    ui.shell.tabbar(null);
    ui.shell.appbar({ back: true, title: '联系发布者', right: parts.topbarLogo() });

    if (!item) {
      view.appendChild(parts.empty('这条信息不存在，可能已经被发布者取消了'));
      return;
    }

    view.appendChild(dom.h('div', { class: 'detail' }, [
      ui.pages.detail.publisherCard(item, true)
    ]));
  }

  ui.pages = ui.pages || {};
  ui.pages.contact = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
