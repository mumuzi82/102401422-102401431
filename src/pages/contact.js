/**
 * pages/contact.js —— 原型第 7 页：联系发布者页面
 *
 * ★ 补充：一键复制联系方式（作业原文点名的加分设计）★
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
      ui.pages.detail.publisherCard(item, true),
      copyBar(item)
    ]));
  }

  /** 一键复制：把电话与邮箱拼成一行文本塞进剪贴板 */
  function copyBar(item) {
    var phone = LF.domain.text.text(item.phone);
    var email = LF.domain.text.text(item.email);
    if (!phone && !email) return dom.h('div');

    var text = [];
    if (phone) text.push('电话：' + phone);
    if (email) text.push('邮箱：' + email);
    var payload = text.join('，');

    return dom.h('div', { class: 'actions' }, [
      parts.primaryButton('一键复制联系方式', function () {
        // 优先用异步 Clipboard API；失败回退到 execCommand（覆盖 file:// 与旧浏览器）
        function fallback() {
          var ta = dom.h('textarea', { class: 'visually-hidden' });
          ta.value = payload;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); ui.toast.show('已复制：' + payload); }
          catch (e) { ui.toast.show('复制失败，请手动长按选择'); }
          document.body.removeChild(ta);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload).then(
            function () { ui.toast.show('已复制：' + payload); },
            fallback
          );
        } else {
          fallback();
        }
      }, { block: true })
    ]);
  }

  ui.pages = ui.pages || {};
  ui.pages.contact = { render: render };
})(typeof globalThis !== 'undefined' ? globalThis : this);
