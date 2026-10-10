/**
 * toast.js —— 轻提示，带可选的操作按钮与倒计时
 *
 * 出现场景里有两个特别的要求：
 *   1. 标记结束后要能**撤销**。撤销入口如果只放在详情弹层里，用户点完就找不到了，
 *      所以做成"标记成功的同时弹出可撤销的提示"，在有效期内随时能救回来。
 *   2. 同一时刻只允许有一个提示。连续操作时旧的必须被顶掉，
 *      否则屏幕上会堆一排提示，撤销按钮还不知道该对应哪一次操作。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};
  var dom = ui.dom;

  var currentNode = null;
  var mainTimer = null;
  var tickTimer = null;

  function dismiss() {
    clearTimeout(mainTimer);
    clearInterval(tickTimer);
    mainTimer = null;
    tickTimer = null;
    if (currentNode && currentNode.parentNode) currentNode.parentNode.removeChild(currentNode);
    currentNode = null;
  }

  /**
   * @param {string} message
   * @param {Object} options
   *   actionLabel  按钮文案（给了才显示按钮）
   *   onAction     点按钮时的回调
   *   duration     自动消失时间，默认 3000ms
   *   countdown    秒数；给了就在按钮上显示剩余秒数
   */
  function show(message, options) {
    var o = options || {};
    dismiss();

    var node = dom.h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    node.appendChild(dom.h('span', { class: 'toast-msg', text: message }));

    if (o.actionLabel && typeof o.onAction === 'function') {
      var label = o.actionLabel;
      var button = dom.h('button', { class: 'toast-action', type: 'button', text: label });
      button.addEventListener('click', function () {
        dismiss();
        o.onAction();
      });
      node.appendChild(button);

      if (o.countdown) {
        var left = Number(o.countdown) || 0;
        button.textContent = label + ' (' + left + ')';
        tickTimer = setInterval(function () {
          left -= 1;
          if (left <= 0) { dismiss(); return; }
          button.textContent = label + ' (' + left + ')';
        }, 1000);
      }
    }

    document.body.appendChild(node);
    currentNode = node;
    mainTimer = setTimeout(dismiss, o.duration || 3000);
    return { dismiss: dismiss };
  }

  ui.toast = { show: show, dismiss: dismiss };
})(typeof globalThis !== 'undefined' ? globalThis : this);
