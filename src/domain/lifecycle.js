/**
 * lifecycle.js —— 信息状态机
 *
 * 这是整个项目最该被看清楚的一段：一条信息的"一生"只有两个状态，
 * 而两个状态之间只允许两条合法迁移。
 *
 *        ┌──────────── resolve（发布者标记已找到 / 已归还）────────────┐
 *        ▼                                                          │
 *   [ active ]  ──────────────────────────────────────────────▶ [ resolved ]
 *   进行中                                                        已找到 / 已归还
 *        ▲                                                          │
 *        └──────────────── restore（撤销，误点了能救回来）────────────┘
 *
 * 为什么写成显式的迁移表，而不是到处 `if (item.status === ...)`：
 *   1. 合法迁移只有一处定义，加第三个状态时不会漏改；
 *   2. 非法迁移能给出明确原因（"这条已经是该状态了" vs "这条信息不存在"）；
 *   3. resolve / restore 互逆，撤销功能是状态机的自然产物，不是补丁。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var domain = LF.domain = LF.domain || {};
  var S = domain.schema;
  var T = domain.text;

  /** 迁移表：TRANSITIONS[当前状态][目标状态] = 动作名 */
  var TRANSITIONS = {
    active: { resolved: 'resolve' },
    resolved: { active: 'restore' }
  };

  function isResolved(item) {
    return !!(item && item.status === S.STATUS.RESOLVED);
  }

  /** 界面上的状态文案：进行中 / 已找到 / 已归还 */
  function label(item) {
    if (!item) return S.ACTIVE_LABEL;
    if (!isResolved(item)) return S.ACTIVE_LABEL;
    return S.RESOLVED_LABEL[item.type] || '已结束';
  }

  /** 按钮文案：寻物 → 标记已找到，招领 → 标记已归还 */
  function resolveLabel(item) {
    var t = item && item.type === S.TYPES.FOUND ? S.TYPES.FOUND : S.TYPES.LOST;
    return '标记' + S.RESOLVED_LABEL[t];
  }

  /** 某条记录当前可以做哪些动作，UI 按它决定按钮的显示与禁用 */
  function actions(item) {
    if (!item) return [];
    var out = [];
    if (TRANSITIONS[item.status] && TRANSITIONS[item.status].resolved) {
      out.push({ action: 'resolve', label: resolveLabel(item) });
    }
    if (TRANSITIONS[item.status] && TRANSITIONS[item.status].active) {
      out.push({ action: 'restore', label: '撤销标记' });
    }
    return out;
  }

  function canGo(from, to) {
    return !!(TRANSITIONS[from] && TRANSITIONS[from][to]);
  }

  /**
   * 执行一次状态迁移。
   * 纯函数：返回新数组，不修改入参，UI 可以放心地基于返回值重渲染。
   *
   * @returns {{ok:boolean, changed:boolean, items:Array, before:Object|null, error:string}}
   *   ok      请求本身是否合法（找不到 id / 非法迁移 → false）
   *   changed 数据是否真的变了（重复标记 → ok:true 但 changed:false，即幂等）
   *   before  变更前的记录副本，撤销靠它精确还原
   */
  function apply(items, id, target, now) {
    var list = Array.isArray(items) ? items : [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) {
      return { ok: false, changed: false, items: list, before: null, error: '这条信息不存在' };
    }

    var current = list[idx];
    if (current.status === target) {
      // 幂等：目标状态就是当前状态，不算错误，但也不需要改数据
      return { ok: true, changed: false, items: list, before: null, error: '' };
    }
    if (!canGo(current.status, target)) {
      return {
        ok: false, changed: false, items: list, before: null,
        error: '不允许把「' + label(current) + '」改成「' +
               (S.RESOLVED_LABEL[current.type] && target === S.STATUS.RESOLVED
                 ? S.RESOLVED_LABEL[current.type] : S.ACTIVE_LABEL) + '」'
      };
    }

    var stamp = now === undefined ? Date.now() : now;
    var next = list.slice();
    next[idx] = Object.assign({}, current, { status: target, updatedAt: stamp });
    return {
      ok: true, changed: true, items: next,
      before: Object.assign({}, current), error: ''
    };
  }

  /** 标记为已找到（寻物）/ 已归还（招领） */
  function resolve(items, id, now) {
    return apply(items, id, S.STATUS.RESOLVED, now);
  }

  /** 撤销标记，回到进行中。误点了能救回来 */
  function restore(items, id, now) {
    return apply(items, id, S.STATUS.ACTIVE, now);
  }

  domain.lifecycle = {
    TRANSITIONS: TRANSITIONS,
    isResolved: isResolved,
    label: label,
    resolveLabel: resolveLabel,
    actions: actions,
    canGo: canGo,
    apply: apply,
    resolve: resolve,
    restore: restore
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
