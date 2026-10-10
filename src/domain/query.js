/**
 * query.js —— 检索：匹配 / 筛选 / 排序 / 统计
 *
 * 全部是纯函数，返回新数组，不修改入参。
 * 首页、搜索结果页、个人页都调这里的同一组函数，规则只有一份。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var domain = LF.domain = LF.domain || {};
  var S = domain.schema;

  /** 一条记录的"可被搜到的文本"集合 */
  function haystack(item) {
    var t = domain.text;
    return [
      item.title, item.description, item.location, item.category,
      S.TYPE_LABEL[item.type] || '',
      domain.lifecycle.label(item)
    ].map(function (v) { return t.text(v).toLowerCase(); }).join(' ');
  }

  /**
   * 关键词匹配：空格分隔的多个词，**要求全部命中**（AND 语义）。
   * 用 indexOf 做字面包含，绝不把用户输入当正则执行。
   */
  function matches(item, keyword) {
    var kw = domain.text.text(keyword).toLowerCase();
    if (!kw) return true;
    if (!item) return false;
    var hay = haystack(item);
    return kw.split(/\s+/).filter(Boolean).every(function (token) {
      return hay.indexOf(token) !== -1;
    });
  }

  /**
   * 筛选。
   * @param {Array} items
   * @param {Object} opts {type, category, keyword, status}
   *   status 默认 'all'：按原型，已结束（已找到/已归还）的条目仍留在列表里并打标签，
   *   所以默认不隐藏。这个参数留给"我的发布"按状态分组用。
   */
  function filter(items, opts) {
    var list = Array.isArray(items) ? items : [];
    var o = opts || {};
    var status = o.status || 'all';

    return list.filter(function (item) {
      if (!item) return false;
      if (o.type && o.type !== 'all' && item.type !== o.type) return false;
      if (o.category && o.category !== 'all' && item.category !== o.category) return false;
      if (status !== 'all' && item.status !== status) return false;
      return matches(item, o.keyword);
    });
  }

  var SORTERS = {
    newest: function (a, b) { return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0); },
    oldest: function (a, b) { return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0); },
    title: function (a, b) {
      return domain.text.text(a.title).localeCompare(domain.text.text(b.title), 'zh-Hans-CN');
    }
  };

  /** 排序：返回新数组。未知的排序方式退回 newest */
  function sort(items, mode) {
    var list = (Array.isArray(items) ? items : []).slice();
    var cmp = SORTERS[mode] || SORTERS.newest;
    return list.sort(cmp);
  }

  /** 首页一条龙：匹配 → 筛选 → 排序 */
  function run(items, opts) {
    var o = opts || {};
    return sort(filter(items, o), o.sort);
  }

  /** 各状态的条数，用于顶部统计与"我的发布"分组 */
  function summary(items) {
    var list = Array.isArray(items) ? items : [];
    var resolved = list.filter(function (i) { return i && i.status === S.STATUS.RESOLVED; }).length;
    return { total: list.length, resolved: resolved, active: list.length - resolved };
  }

  /** 各类别的条数，用于筛选条的角标（不含 category 条件本身，否则点进去只剩 1 个） */
  function categoryCounts(items, opts) {
    var o = Object.assign({}, opts || {});
    delete o.category;
    var base = filter(items, o);
    var map = { all: base.length };
    S.CATEGORIES.forEach(function (c) { map[c] = 0; });
    base.forEach(function (item) {
      if (map[item.category] === undefined) map[item.category] = 0;
      map[item.category] += 1;
    });
    return map;
  }

  /** 三个 Tab 各自的条数 */
  function typeCounts(items, opts) {
    var o = Object.assign({}, opts || {});
    delete o.type;
    return {
      all: filter(items, o).length,
      lost: filter(items, Object.assign({}, o, { type: 'lost' })).length,
      found: filter(items, Object.assign({}, o, { type: 'found' })).length
    };
  }

  domain.query = {
    SORTERS: SORTERS,
    matches: matches,
    filter: filter,
    sort: sort,
    run: run,
    summary: summary,
    categoryCounts: categoryCounts,
    typeCounts: typeCounts
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
