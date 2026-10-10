/**
 * pages/detail.js —— 原型第 5 页：信息详情页（浏览者视角）
 *
 * 这是**别人发布**的信息打开的页面。结构严格照原型：
 *   顶部栏：返回箭头 + 「失物详情信息」+ 右侧校徽
 *   卡片 A：圆形物品图 + 右上两枚标签 + 「物品名称·发布时间·当前状态」三行
 *   卡片 B：三行带红色线性图标的字段（物品类型·丢失时间·丢失地点）
 *   卡片 C：红色标题「详细信息」+ 正文
 *   卡片 D：人像图标 + 红色标题「发布者信息」+ 姓名/学工号/学院
 *   底部操作条：主色按钮「联系发布者」+ 右侧两枚图标
 * 没有底部导航。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;
  var S = LF.domain.schema;
  var L = LF.domain.lifecycle;

  /** 圆形物品图 + 右上标签 + 三行「标签：值」 */
  function itemCard(item) {
    var photo = dom.h('div', { class: 'item-photo' });
    if (item.image) {
      photo.appendChild(dom.h('img', { src: item.image, alt: item.title }));
    } else {
      photo.appendChild(dom.h('span', {
        class: 'thumb-emoji', 'aria-hidden': 'true',
        text: ui.card.CATEGORY_EMOJI[item.category] || '📦'
      }));
    }

    var resolved = L.isResolved(item);
    var main = dom.h('div', { class: 'item-main' }, [
      dom.h('div', { class: 'item-tags' }, [
        dom.h('span', { class: 'tag ' + (resolved ? 'tag-done' : 'tag-doing'), text: L.label(item) }),
        dom.h('span', {
          class: 'tag ' + (item.type === S.TYPES.LOST ? 'tag-lost' : 'tag-found'),
          text: S.TYPE_LABEL[item.type]
        })
      ]),
      kvLine('物品名称', item.title),
      kvLine('发布时间', parts.stamp(item.createdAt)),
      kvLine('当前状态', L.label(item))
    ]);

    return dom.h('div', { class: 'item-card' }, [photo, main]);
  }

  /** 「标签：值」，标签红色加粗 */
  function kvLine(label, value) {
    return dom.h('div', { class: 'item-line' }, [
      dom.h('b', { text: label + '：' }),
      document.createTextNode(value || '未填写')
    ]);
  }

  /** 卡片 B：每行一枚红色线性图标 + 标签：值 */
  function iconFieldCard(rows) {
    var card = dom.h('div', { class: 'pub-card' });
    rows.forEach(function (row) {
      var line = dom.h('div', { class: 'icon-line' });
      var holder = dom.h('span', { class: 'icon-line-ico', 'aria-hidden': 'true' });
      holder.appendChild(row.icon);
      line.appendChild(holder);
      line.appendChild(dom.h('b', { text: row.label + '：' }));
      line.appendChild(document.createTextNode(row.value || '未填写'));
      card.appendChild(line);
    });
    return card;
  }

  /** 卡片 C：红色标题 + 正文 */
  function infoCard(title, body) {
    return dom.h('div', { class: 'info-card' }, [
      dom.h('h3', { text: title }),
      dom.h('p', { text: body || '（暂无补充说明）' })
    ]);
  }

  /**
   * 卡片 D：发布者信息。
   * @param {boolean} withContact 07 联系发布者页要多出电话与邮箱两行
   */
  function publisherCard(item, withContact) {
    var pub = item.publisher || {};
    var card = dom.h('div', { class: 'pub-card' });

    var head = dom.h('div', { class: 'pub-head' });
    var holder = dom.h('span', { class: 'icon-title-ico', 'aria-hidden': 'true' });
    holder.appendChild(parts.icons.person(20));
    head.appendChild(holder);
    head.appendChild(dom.h('span', { class: 'icon-title-text', text: '发布者信息' }));
    card.appendChild(head);

    card.appendChild(dom.h('div', { class: 'pub-line' }, [
      dom.h('b', { text: '姓名:' }), document.createTextNode(pub.name || '未填写')
    ]));
    card.appendChild(dom.h('div', { class: 'pub-line' }, [
      dom.h('b', { text: '学工号:' }), document.createTextNode(pub.sid || '未填写')
    ]));
    card.appendChild(dom.h('div', { class: 'pub-line' }, [
      document.createTextNode(pub.dept || '')
    ]));

    if (withContact) {
      card.appendChild(dom.h('div', { class: 'pub-gap' }));
      card.appendChild(dom.h('div', { class: 'pub-line' }, [
        dom.h('b', { text: '联系电话：' }),
        document.createTextNode(LF.domain.text.text(item.phone) || '未填写')
      ]));
      card.appendChild(dom.h('div', { class: 'pub-line' }, [
        dom.h('b', { text: '邮箱：' }),
        document.createTextNode(LF.domain.text.text(item.email) || '未填写')
      ]));
    }
    return card;
  }

  function render(params) {
    var item = LF.app.find(params.id);
    var view = ui.shell.view();
    ui.shell.tabbar(null);
    ui.shell.appbar({ back: true, title: '失物详情信息', right: parts.topbarLogo() });

    if (!item) {
      view.appendChild(parts.empty('这条信息不存在，可能已经被发布者取消了'));
      return;
    }

    view.appendChild(dom.h('div', { class: 'detail' }, [
      itemCard(item),
      iconFieldCard([
        { icon: parts.icons.tag(15), label: '物品类型', value: item.category },
        { icon: parts.icons.clock(15), label: '丢失时间', value: item.time },
        { icon: parts.icons.pin(15), label: '丢失地点', value: item.location }
      ]),
      infoCard('详细信息', item.description),
      publisherCard(item, false),
      actionBar(item)
    ]));
  }

  /**
   * 底部操作条：主色按钮 + 右侧两枚图标。
   * 星标（收藏）与举报在原型上都有，但原型里既没有收藏列表页、也没有举报流程，
   * 作业正文明确"不要求"这些，所以这里按原型画出来但**不做成可点控件**，
   * 避免出现"点了没反应"的死按钮。
   */
  function actionBar(item) {
    var bar = dom.h('div', { class: 'action-bar' });
    bar.appendChild(parts.primaryButton('联系发布者', function () {
      ui.router.go('/contact/' + item.id);
    }));

    var tools = dom.h('div', { class: 'action-tools', 'aria-hidden': 'true' });
    var star = dom.h('span', { class: 'action-ico' });
    star.appendChild(parts.icons.star(22));
    var alert = dom.h('span', { class: 'action-ico' });
    alert.appendChild(parts.icons.alert(22));
    tools.appendChild(star);
    tools.appendChild(alert);
    bar.appendChild(tools);
    return bar;
  }

  ui.pages = ui.pages || {};
  ui.pages.detail = {
    render: render,
    itemCard: itemCard,
    iconFieldCard: iconFieldCard,
    infoCard: infoCard,
    publisherCard: publisherCard
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
