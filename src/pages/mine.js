/**
 * pages/mine.js —— 原型第 6 页：个人页
 *
 * 结构：品牌头（校徽 + 校园失物招领 + 齿轮）／「我的」信息卡
 * （红色小标题「我的」+ 圆形头像 + 姓名 + 学工号 + 学院年级 + 发布数量）
 * ／「我的收藏」入口卡 ／「我的发布」图标小标题 + 三个 Tab + 只列自己的信息
 * ／ 底部悬浮导航（高亮「我的」）
 *
 * 关于「我的收藏」：原型这一页有入口卡、详情页也有星标图标，
 * 但整个原型里没有收藏列表页、也没有说明星标点了会怎样，作业正文又明确"不要求"。
 * 所以这里照原型画出入口，但做成装饰、不假装能收藏。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;
  var Q = LF.domain.query;

  var state = { type: 'all' };

  function render() {
    var profile = LF.app.profile();
    var mine = LF.app.items().filter(function (item) { return LF.app.isMine(item); });

    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar('mine');

    view.appendChild(parts.brand({ gear: true }));
    view.appendChild(profileCard(profile, mine.length));
    view.appendChild(collectionEntry());

    view.appendChild(parts.iconTitle(parts.icons.doc(20), '我的发布'));
    view.appendChild(parts.tabs(state.type, function (type) {
      state.type = type;
      render();
    }));

    var list = Q.run(mine, { type: state.type });
    view.appendChild(list.length
      ? parts.list(list, '', open)
      : parts.empty('你还没有发布过这个类型的信息'));
  }

  /** 「我的」信息卡 */
  function profileCard(profile, count) {
    var avatar = dom.h('div', { class: 'avatar', 'aria-hidden': 'true' });
    avatar.appendChild(dom.h('span', { class: 'avatar-mark', text: (profile.name || '我').slice(0, 1) }));

    var top = dom.h('div', { class: 'mine-card-top' }, [
      dom.h('span', { class: 'mine-label', text: '我的' }),
      dom.h('div', { class: 'mine-body' }, [
        avatar,
        dom.h('div', { class: 'mine-main' }, [
          dom.h('div', { class: 'mine-name', text: profile.name }),
          dom.h('div', { class: 'mine-sub', text: profile.sid })
        ])
      ])
    ]);

    var foot = dom.h('div', { class: 'mine-card-foot' }, [
      dom.h('span', { class: 'mine-dept', text: profile.dept }),
      dom.h('span', { class: 'mine-count' }, [
        document.createTextNode('发布数量：'),
        dom.h('b', { text: String(count) })
      ])
    ]);

    return dom.h('div', { class: 'mine-card' }, [top, foot]);
  }

  /** 「我的收藏」入口卡（原型有入口，但没有对应的列表页，故不可点） */
  function collectionEntry() {
    var row = dom.h('div', { class: 'entry-row', 'aria-hidden': 'true' });
    var holder = dom.h('span', { class: 'entry-row-ico' });
    holder.appendChild(parts.icons.star(20));
    row.appendChild(holder);
    row.appendChild(dom.h('span', { class: 'entry-row-text', text: '我的收藏' }));
    return row;
  }

  function open(item) {
    ui.router.go('/mine/detail/' + item.id);
  }

  ui.pages = ui.pages || {};
  ui.pages.mine = { render: render, reset: function () { state.type = 'all'; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
