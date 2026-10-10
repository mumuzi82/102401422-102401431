/**
 * pages/publish.js —— 原型第 3 页：发布页
 *
 * 结构：校徽 + 校园失物招领 ／ 两张深红大卡片
 *   「我丢失了物品 · 发布寻物消息」／「我捡到了物品 · 发布招领消息」
 * ／ 底部悬浮导航（高亮「发布」）。原型这一页没有输入框，选完类型才进表单。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;

  function entryCard(icon, title, sub, onPick) {
    var btn = dom.h('button', { class: 'entry-card', type: 'button' });
    var ico = dom.h('span', { class: 'entry-ico', 'aria-hidden': 'true' });
    ico.appendChild(icon);
    btn.appendChild(ico);
    btn.appendChild(dom.h('span', { class: 'entry-text' }, [
      dom.h('span', { class: 'entry-title', text: title }),
      dom.h('span', { class: 'entry-sub', text: sub })
    ]));
    btn.addEventListener('click', onPick);
    return btn;
  }

  function render() {
    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar('publish');

    view.appendChild(parts.brand({}));
    view.appendChild(dom.h('div', { class: 'publish-entries' }, [
      entryCard(parts.icons.magnifierBig(), '我丢失了物品', '发布寻物消息', function () {
        ui.router.go('/publish/lost');
      }),
      entryCard(parts.icons.plusRing(), '我捡到了物品', '发布招领消息', function () {
        ui.router.go('/publish/found');
      })
    ]));
  }

  ui.pages = ui.pages || {};
  ui.pages.publish = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
