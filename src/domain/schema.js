/**
 * schema.js —— 领域常量与记录结构定义
 *
 * 本文件是"领域层"的入口，只描述**校园失物招领这件事本身**：
 * 有哪几种信息、哪几个状态、物品怎么分类、字段上限多少。
 * 它不碰 DOM、不碰存储、不碰网络，所以能被直接单元测试。
 *
 * 命名空间约定（本项目不用 ES module，原因见 README「为什么不用 import/export」）：
 *   浏览器：<script src="src/domain/schema.js"> 直接执行
 *   Node ：tests/run-node.mjs 用 vm.runInThisContext 加载同一个文件
 * 两种运行方式加载的是同一份源码，不存在"测试里是副本"的漂移风险。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var domain = LF.domain = LF.domain || {};

  var TYPES = { LOST: 'lost', FOUND: 'found' };
  var STATUS = { ACTIVE: 'active', RESOLVED: 'resolved' };

  domain.schema = {

    /** 数据结构版本。导入旧数据时靠它做兼容判断 */
    VERSION: 1,

    TYPES: TYPES,
    STATUS: STATUS,

    /** 物品类别：对应原型的「物品类别 / 物品类型」 */
    CATEGORIES: ['证件', '钥匙', '背包', '雨伞', '水杯', '耳机', '手机', '其他'],

    /** 卡片上的类型短标签（原型：寻物 / 招领） */
    TYPE_LABEL: { lost: '寻物', found: '招领' },

    /** 首页三个 Tab 的文案（原型：全部失物 / 失物寻找 / 失物招领） */
    TAB_LABEL: { all: '全部失物', lost: '失物寻找', found: '失物招领' },

    /**
     * 进行中文案。
     * 原型卡片上写的是「进行中」，作业原文要求终态是「已找到 / 已归还」。
     * 这里两者都满足：进行中统一，终态按类型区分。
     */
    ACTIVE_LABEL: '进行中',
    RESOLVED_LABEL: { lost: '已找到', found: '已归还' },

    LIMITS: { title: 30, location: 40, description: 300, phone: 20, email: 60 },

    /** 发布表单的必填字段（键就是错误槽位名，两边共用） */
    REQUIRED: ['type', 'title', 'category', 'location', 'time'],

    /** 一条记录必须有的字段与类型；导入外部 JSON 时用它把关 */
    FIELDS: {
      id: 'string',
      type: 'string',
      title: 'string',
      category: 'string',
      location: 'string',
      time: 'string',
      description: 'string',
      phone: 'string',
      email: 'string',
      image: 'string',
      status: 'string',
      createdAt: 'number'
    },

    /**
     * 结构校验：只判断"字段齐不齐、类型对不对、枚举值合不合法"，
     * 不做业务判断（那是 validate.js 的事）。
     * @returns {{ok: boolean, errors: string[]}}
     */
    check: function (item) {
      var errors = [];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, errors: ['不是一个对象'] };
      }
      Object.keys(domain.schema.FIELDS).forEach(function (key) {
        var want = domain.schema.FIELDS[key];
        var got = item[key];
        // 可选字段允许缺失，但存在就必须类型正确
        if (got === undefined || got === null) {
          if (want === 'number' && key === 'createdAt') errors.push('缺少 ' + key);
          return;
        }
        if (typeof got !== want) errors.push(key + ' 应该是 ' + want);
      });
      if (item.type !== TYPES.LOST && item.type !== TYPES.FOUND) {
        errors.push('type 只能是 lost 或 found');
      }
      if (item.status !== STATUS.ACTIVE && item.status !== STATUS.RESOLVED) {
        errors.push('status 只能是 active 或 resolved');
      }
      if (item.category && domain.schema.CATEGORIES.indexOf(item.category) === -1) {
        errors.push('category 不在允许的类别里：' + item.category);
      }
      return { ok: errors.length === 0, errors: errors };
    },

    /** 造一条空白记录，字段齐全，方便测试与表单初始化 */
    blank: function (over) {
      var base = {
        id: '', type: TYPES.LOST, title: '', category: '', location: '',
        time: '', description: '', phone: '', email: '', image: '',
        status: STATUS.ACTIVE, createdAt: 0, publisher: null
      };
      return Object.assign(base, over || {});
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
