/**
 * pages/myDetail.js —— 原型第 9 页：寻物详情页（发布者视角）
 *
 * 这是**自己发布**的信息打开的页面。与「信息详情页」的区别就是底部那两个按钮：
 *   「标记已结束」= 状态流转，信息仍在、仍可查看，只是不再作为有效求助
 *   「取消发布」  = 把这条撤下来
 * 原型这一页的标题行在正文里（标题右侧一支铅笔，用于回到发布页编辑），页面内没有返回箭头。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;
  var L = LF.domain.lifecycle;
  var T = LF.domain.text;

  function render(params) {
    var item = LF.app.find(params.id);
    var view = ui.shell.view();
    ui.shell.hideAppbar();
    ui.shell.tabbar(null);

    if (!item) {
      view.appendChild(parts.empty('这条信息不存在，可能已经被取消了'));
      return;
    }

    var helper = ui.pages.detail;

    // 标题行：标题 + 右上角铅笔（回发布页编辑）
    var head = dom.h('div', { class: 'detail-title' }, [
      dom.h('h2', { text: '失物详情信息' })
    ]);
    var pencil = dom.h('button', { class: 'icon-action', type: 'button', 'aria-label': '编辑这条信息' });
    pencil.appendChild(parts.icons.pencil(20));
    pencil.addEventListener('click', function () {
      ui.router.go('/publish/' + item.type, { edit: item.id });
    });
    head.appendChild(pencil);

    view.appendChild(dom.h('div', { class: 'detail' }, [
      head,
      helper.itemCard(item),
      helper.iconFieldCard([
        { icon: parts.icons.tag(15), label: '物品类型', value: item.category },
        { icon: parts.icons.clock(15), label: '丢失时间', value: item.time },
        { icon: parts.icons.pin(15), label: '丢失地点', value: item.location }
      ]),
      helper.infoCard('详细信息', item.description),
      contactLines(item),
      actions(item)
    ]));
  }

  /** 发布者自查场景：联系电话与邮箱直接平铺出来 */
  function contactLines(item) {
    return dom.h('div', { class: 'field-lines' }, [
      dom.h('div', { class: 'field-line' }, [
        dom.h('b', { text: '联系电话：' }), document.createTextNode(T.text(item.phone) || '未填写')
      ]),
      dom.h('div', { class: 'field-line' }, [
        dom.h('b', { text: '邮箱：' }), document.createTextNode(T.text(item.email) || '未填写')
      ])
    ]);
  }

  function actions(item) {
    var resolved = L.isResolved(item);

    var finish = parts.primaryButton('标记已结束', function () {
      var result = L.resolve(LF.app.items(), item.id);
      if (!result.ok) { ui.toast.show(result.error); return; }
      if (!result.changed) { ui.toast.show('这条信息已经是已结束状态了'); return; }
      var updated = null;
      for (var i = 0; i < result.items.length; i++) {
        if (result.items[i].id === item.id) updated = result.items[i];
      }
      if (!updated || !LF.app.replace(updated)) return;
      ui.toast.show('已标记为「' + L.label(updated) + '」');
      render({ id: item.id });
    }, { block: true });
    if (resolved) finish.disabled = true;

    var cancel = dom.h('button', {
      class: 'btn btn-primary btn-block', type: 'button', text: '取消发布'
    });
    cancel.addEventListener('click', function () {
      if (!confirm('确定取消发布吗？这条信息会从列表里移除。')) return;
      if (!LF.app.remove(item.id)) return;
      ui.toast.show('已取消发布');
      ui.router.go('/mine');
    });

    return dom.h('div', { class: 'actions' }, [finish, cancel]);
  }

  ui.pages = ui.pages || {};
  ui.pages.myDetail = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
