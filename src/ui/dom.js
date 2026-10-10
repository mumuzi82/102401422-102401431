/**
 * dom.js —— 极小的 DOM 工具
 *
 * 本项目渲染的两条硬规则，都在这个文件里落地：
 *
 *   规则一：**不拼 HTML 字符串**。所有元素都用 createElement / cloneNode 造，
 *          文本一律走 textContent。浏览器负责把文本当文本处理，
 *          于是"XSS 防护"不是靠某个函数记得调用，而是结构上做不到。
 *
 *   规则二：**动词用模板**。卡片这种重复出现的结构写在 index.html 的 <template> 里，
 *          代码只做"克隆 + 填字段"。样式和结构归 HTML，逻辑归 JS。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};

  /** 清空一个节点的所有子节点 */
  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /**
   * 造元素。
   * @param {string} tag
   * @param {Object} attrs 支持 class / text / dataset / on<事件> / 任意属性
   * @param {Array} children 字符串会被转成文本节点（不是 HTML）
   */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'dataset') {
          Object.keys(value).forEach(function (d) { el.dataset[d] = value[d]; });
        } else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
          el.setAttribute(key, value === true ? '' : String(value));
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  /** 克隆一个 <template> 里的第一个元素 */
  function clone(templateId) {
    var tpl = document.getElementById(templateId);
    if (!tpl) throw new Error('找不到模板：' + templateId);
    return tpl.content.firstElementChild.cloneNode(true);
  }

  /**
   * 把一段文字按关键词分段写进节点：命中的部分包成 <mark>，其余是纯文本节点。
   *
   * 分段计算在 domain.text.segments 里（可单元测试），这里只负责把数据变成 DOM。
   * 全程没有 innerHTML，所以 "&" "<" "&#39;" 这类内容既不担心被注入，
   * 也不会像"先转义再 replace"那样把 HTML 实体劈成两半。
   */
  function segments(host, raw, keyword) {
    clear(host);
    LF.domain.text.segments(raw, keyword).forEach(function (part) {
      if (part.hit) {
        host.appendChild(h('mark', { text: part.text }));
      } else {
        host.appendChild(document.createTextNode(part.text));
      }
    });
    return host;
  }

  ui.dom = { clear: clear, h: h, clone: clone, segments: segments };
})(typeof globalThis !== 'undefined' ? globalThis : this);
