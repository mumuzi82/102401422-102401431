/**
 * card.js —— 信息卡片的构造
 *
 * 结构写在 index.html 的 <template id="tpl-card"> 里（含线条图标），
 * 这个文件只负责"克隆一份，再把这条记录填进去"。
 * 有图用图，没图用类别图标占位 —— 两条路径都走 DOM，没有条件拼 HTML。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};
  var dom = ui.dom;
  var S = LF.domain.schema;
  var L = LF.domain.lifecycle;

  /** 没配图片时，用类别对应的图标占位 */
  var CATEGORY_EMOJI = {
    '证件': '🪪', '钥匙': '🔑', '背包': '🎒', '雨伞': '☂️',
    '水杯': '🥤', '耳机': '🎧', '手机': '📱', '其他': '📦'
  };

  /**
   * @param {Object} item
   * @param {string} keyword 高亮用的关键词
   * @param {Object} opts { now } 便于测试注入固定时间
   * @returns {HTMLElement}
   */
  function build(item, keyword, opts) {
    var o = opts || {};
    var resolved = L.isResolved(item);
    var node = dom.clone('tpl-card');

    node.dataset.id = item.id;
    node.setAttribute('aria-label', (S.TYPE_LABEL[item.type] || '') + '：' + item.title);
    if (resolved) node.classList.add('is-done');

    dom.segments(node.querySelector('.card-title'), item.title, keyword);

    var stateTag = node.querySelector('.js-state');
    stateTag.textContent = L.label(item);
    stateTag.classList.add(resolved ? 'tag-done' : 'tag-doing');

    var typeTag = node.querySelector('.js-type');
    typeTag.textContent = S.TYPE_LABEL[item.type] || '未知';
    typeTag.classList.add(item.type === S.TYPES.LOST ? 'tag-lost' : 'tag-found');

    var thumb = node.querySelector('.js-thumb');
    if (item.image) {
      thumb.appendChild(dom.h('img', {
        src: item.image, alt: item.title, loading: 'lazy'
      }));
    } else {
      thumb.classList.add('is-placeholder');
      thumb.appendChild(dom.h('span', {
        class: 'thumb-emoji',
        'aria-hidden': 'true',
        text: CATEGORY_EMOJI[item.category] || '📦'
      }));
    }

    dom.segments(node.querySelector('.js-time'), LF.domain.text.itemTime(item, o.now), keyword);
    dom.segments(node.querySelector('.js-place'), item.location || '未填写', keyword);

    return node;
  }

  ui.card = { build: build, CATEGORY_EMOJI: CATEGORY_EMOJI };
})(typeof globalThis !== 'undefined' ? globalThis : this);
