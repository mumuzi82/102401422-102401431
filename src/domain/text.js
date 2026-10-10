/**
 * text.js —— 文本与时间的纯处理
 *
 * 这里**没有 escapeHtml**，是故意的。
 * 本项目渲染走「<template> 克隆 + textContent 赋值」，浏览器负责把文本当文本处理，
 * 结构上就不存在 HTML 注入面，不需要靠"记得转义"来兜底。
 * 唯一需要生成元素的地方（关键词高亮）也只返回**分段数据**，由 UI 层把每段
 * 变成文本节点或 <mark> 元素，全程不拼 HTML 字符串。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var domain = LF.domain = LF.domain || {};

  function text(value) {
    return String(value === null || value === undefined ? '' : value).trim();
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function formatDate(ts) {
    var d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function relativeTime(ts, now) {
    var t = Number(ts);
    if (!isFinite(t) || t <= 0) return '';
    var base = Number(now) || Date.now();
    var diff = base - t;
    if (diff < 0) return formatDate(t);          // 未来时间不谎报"刚刚"
    var min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    var hour = Math.floor(min / 60);
    if (hour < 24) return hour + ' 小时前';
    var day = Math.floor(hour / 24);
    if (day <= 7) return day + ' 天前';
    return formatDate(t);
  }

  /**
   * 一个条目要显示的时间：优先用它自带的 time 文案
   * （原型里就是「2026年9月27日 16:42」这种人工填写的时间），没有才按 createdAt 推算。
   */
  function itemTime(item, now) {
    var t = text(item && item.time);
    if (t) return t;
    return relativeTime(item && item.createdAt, now);
  }

  /**
   * 关键词分段 —— 高亮的核心，也是唯一需要"切分文本"的地方。
   *
   * 返回数据而不是 HTML： [{ text: '电动车', hit: false }, { text: '钥匙', hit: true }]
   *
   * 为什么不用「先转义再 replace」：那样关键词一旦命中 HTML 实体内部就会把实体劈开
   * （搜 "39" 会把 &#39; 变成 &#3<mark>9</mark>; ，实体失效后浏览器把 &#39; 当字面文字
   * 显示给用户）。分段法在结构上就不会碰到这个问题，因为根本不生成 HTML。
   *
   * @param {string} raw 原文
   * @param {string} keyword 空格分隔的多关键词
   * @param {boolean} caseSensitive 默认 false
   */
  function segments(raw, keyword, caseSensitive) {
    var source = String(raw === null || raw === undefined ? '' : raw);
    var kw = text(keyword);
    if (!kw) return source ? [{ text: source, hit: false }] : [];

    // 长词优先，避免短词抢先切碎长词
    var tokens = kw.split(/\s+/).filter(Boolean)
      .sort(function (a, b) { return b.length - a.length; });

    // 用 indexOf 逐一找位置，不构造正则 —— 用户输入里有 . * ( ) 等字符也不会出问题
    var flags = caseSensitive ? '' : 'i';
    var hits = [];
    tokens.forEach(function (token) {
      var needle = caseSensitive ? token : token.toLowerCase();
      var hay = caseSensitive ? source : source.toLowerCase();
      var from = 0;
      while (true) {
        var at = hay.indexOf(needle, from);
        if (at === -1) break;
        hits.push({ start: at, end: at + token.length });
        from = at + token.length;
      }
    });
    if (!hits.length) return source ? [{ text: source, hit: false }] : [];

    // 按起点排序并合并重叠区间（"校园卡" 和 "校园" 同时命中时不能重复切）
    hits.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var merged = [];
    hits.forEach(function (h) {
      var last = merged[merged.length - 1];
      if (last && h.start <= last.end) {
        if (h.end > last.end) last.end = h.end;
      } else {
        merged.push({ start: h.start, end: h.end });
      }
    });

    var out = [];
    var cursor = 0;
    merged.forEach(function (h) {
      if (h.start > cursor) out.push({ text: source.slice(cursor, h.start), hit: false });
      out.push({ text: source.slice(h.start, h.end), hit: true });
      cursor = h.end;
    });
    if (cursor < source.length) out.push({ text: source.slice(cursor), hit: false });
    void flags;
    return out;
  }

  /** 掩码后的联系方式，用于列表页不直接暴露完整信息 */
  function maskContact(value, keep) {
    var s = text(value);
    var n = keep === undefined ? 4 : keep;
    if (s.length <= n) return s;
    return s.slice(0, n) + '＊'.repeat(Math.min(6, s.length - n));
  }

  domain.text = {
    text: text,
    formatDate: formatDate,
    relativeTime: relativeTime,
    itemTime: itemTime,
    segments: segments,
    maskContact: maskContact
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
