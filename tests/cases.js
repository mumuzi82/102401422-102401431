/**
 * cases.js —— 单元测试用例（表驱动，命令行与浏览器共用同一份）
 *
 * 设计用例时按四类情况铺开，这也是博客里"构造测试数据的思路"那一节的依据：
 *   正常 —— 主流程走通
 *   边界 —— 空值、纯空格、长度刚好等于上限 / 刚好越界一格
 *   异常 —— 缺字段、null/undefined、非法枚举、损坏的 JSON、存储写满
 *   恶意 —— XSS 载荷、正则元字符、重复 id、超长串
 *
 * 注意：本项目渲染不拼 HTML，所以"XSS"在这里不再是转义问题，
 * 而是"关键词里带 < > & 会不会把分段逻辑搞乱"的问题 —— 用例仍然覆盖了它。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var S = LF.domain.schema;
  var T = LF.domain.text;
  var Q = LF.domain.query;
  var L = LF.domain.lifecycle;
  var V = LF.domain.validate;
  var store = LF.storage;

  /* ------------------------------------------------------------ 测试数据工厂 */

  var BASE_TIME = new Date('2026-09-27T17:02:00+08:00').getTime();

  function item(over) {
    return Object.assign({
      id: 'a', type: 'lost', category: '证件', title: '学生证',
      location: '东3-201', time: '2026年9月27日 17:02',
      description: '福州大学学生证，红色封面',
      phone: '15066666666', email: '150666666666@qq.com',
      image: '', status: 'active', createdAt: 1000, publisher: null
    }, over || {});
  }

  // 三条基准数据。title / description / location 刻意互不重叠，
  // 否则"按关键词筛选"的用例会被自己的测试数据误导。
  var LOST = item({ id: 'a', createdAt: 1000 });
  var DONE = item({
    id: 'b', title: '身份证', location: '校车', description: '已交到校车队办公室',
    status: 'resolved', createdAt: 2000
  });
  var FOUND = item({
    id: 'c', type: 'found', title: '电动车钥匙', category: '钥匙', location: '东3-310',
    description: '带黑色遥控器，已交到东 3 值班室', createdAt: 3000
  });
  var FOUND_DONE = item({
    id: 'd', type: 'found', title: '保温杯', category: '水杯', location: '体育馆',
    description: '已归还', status: 'resolved', createdAt: 4000
  });

  function freshRepo(opts) {
    var o = opts || {};
    return store.create({
      key: o.key || 'test-key',
      backend: o.backend || store.memoryBackend(),
      seed: o.seed || function () { return [LOST]; }
    });
  }

  /* ============================================================ 用例 */

  var groups = [

    /* ------------------------------------------------ 结构校验 */
    {
      name: 'schema.check 记录结构校验',
      cases: [
        { name: '完整记录通过', run: function () { return S.check(LOST).ok; }, expect: true },
        { name: 'null 被拦下', run: function () { return S.check(null).errors; }, expect: ['不是一个对象'] },
        { name: '数组被拦下', run: function () { return S.check([LOST]).ok; }, expect: false },
        { name: '字符串被拦下', run: function () { return S.check('{}').ok; }, expect: false },
        { name: '非法 type 被拦下',
          run: function () { return S.check(item({ type: 'hack' })).errors; },
          expect: ['type 只能是 lost 或 found'] },
        { name: '非法 status 被拦下',
          run: function () { return S.check(item({ status: 'done' })).errors; },
          expect: ['status 只能是 active 或 resolved'] },
        { name: '类别不在允许列表里被拦下',
          run: function () { return S.check(item({ category: '外星物品' })).errors; },
          expect: ['category 不在允许的类别里：外星物品'] },
        { name: '缺 createdAt 被拦下',
          run: function () { return S.check(item({ createdAt: undefined })).errors; },
          expect: ['缺少 createdAt'] },
        { name: '字段类型不对被拦下',
          run: function () { return S.check(item({ title: 123 })).errors; },
          expect: ['title 应该是 string'] },
        { name: '可选字段缺失不算错（校验职责在 validate）',
          run: function () { return S.check(item({ description: undefined, phone: undefined })).ok; },
          expect: true },
        { name: 'blank() 造出来的记录结构合法',
          run: function () { return S.check(S.blank({ id: 'x' })).ok; },
          expect: true }
      ]
    },

    /* ------------------------------------------------ 关键词分段 */
    {
      name: 'text.segments 关键词分段（高亮的数据来源）',
      cases: [
        { name: '没有关键词 → 整段未命中',
          run: function () { return T.segments('电动车钥匙', ''); },
          expect: [{ text: '电动车钥匙', hit: false }] },
        { name: '命中一次 → 切成三段',
          run: function () { return T.segments('电动车钥匙', '钥匙'); },
          expect: [{ text: '电动车', hit: false }, { text: '钥匙', hit: true }] },
        { name: '命中两次 → 两处都标出来',
          run: function () { return T.segments('钥匙串和钥匙', '钥匙'); },
          expect: [
            { text: '钥匙', hit: true }, { text: '串和', hit: false }, { text: '钥匙', hit: true }
          ] },
        { name: '大小写不敏感（返回原文的大小写）',
          run: function () { return T.segments('AirPods 丢了', 'airpods'); },
          expect: [{ text: 'AirPods', hit: true }, { text: ' 丢了', hit: false }] },
        { name: '空文本返回空数组', run: function () { return T.segments('', '钥匙'); }, expect: [] },
        { name: 'null 文本不抛异常', run: function () { return T.segments(null, 'x'); }, expect: [] },
        { name: '恶意：正则元字符按字面匹配（"." 不再匹配任意字符）',
          run: function () { return T.segments('a.b', '.'); },
          expect: [{ text: 'a', hit: false }, { text: '.', hit: true }, { text: 'b', hit: false }] },
        { name: '恶意：关键词含 * + ( ) [ ] 不报错', run: function () {
            return T.segments('a*b', '*')[1];
          }, expect: { text: '*', hit: true } },
        { name: '重叠关键词合并，不会把命中区切碎',
          run: function () { return T.segments('校园卡', '校园卡 校园'); },
          expect: [{ text: '校园卡', hit: true }] },
        { name: '长词优先，不会被短词抢先切开',
          run: function () { return T.segments('电动车钥匙', '车 电动车'); },
          expect: [{ text: '电动车', hit: true }, { text: '钥匙', hit: false }] },
        { name: '恶意：HTML 实体只是普通文本，命中的就是那几个字符',
          // 注意 "&#39;" 是 **5 个字符**（& # 3 9 ;），不是"一个转义序列"。
          // 旧写法（先整体转义、再在结果里 replace）会把 "&#39;" 劈成 "&#3<mark>9</mark>;"
          // 从而让这个实体失效、用户看到字面的 &#39;。
          // 本实现只对纯文本分段、且不生成 HTML，所以命中中间那两位才是正确行为。
          run: function () { return T.segments("张三&#39;的伞", '39'); },
          expect: [
            { text: '张三&#', hit: false }, { text: '39', hit: true }, { text: ';的伞', hit: false }
          ] },
        { name: '恶意：XSS 载荷原样保留为文本',
          run: function () { return T.segments('<img src=x onerror=1>', 'img')[1].text; },
          expect: 'img' }
      ]
    },

    /* ------------------------------------------------ 时间与联系方式 */
    {
      name: 'text 时间与联系方式',
      cases: [
        { name: '优先用记录自带的 time 文案',
          run: function () { return T.itemTime({ time: '2026年9月27日 16:42', createdAt: 0 }); },
          expect: '2026年9月27日 16:42' },
        { name: '没有 time 才按 createdAt 推算',
          run: function () { return T.itemTime({ time: '', createdAt: BASE_TIME - 3 * 60000 }, BASE_TIME); },
          expect: '3 分钟前' },
        { name: '刚刚', run: function () { return T.relativeTime(BASE_TIME - 30000, BASE_TIME); }, expect: '刚刚' },
        { name: '小时前', run: function () { return T.relativeTime(BASE_TIME - 5 * 3600000, BASE_TIME); }, expect: '5 小时前' },
        { name: '天前', run: function () { return T.relativeTime(BASE_TIME - 3 * 86400000, BASE_TIME); }, expect: '3 天前' },
        { name: '超过一周显示具体日期',
          run: function () { return T.relativeTime(BASE_TIME - 40 * 86400000, BASE_TIME); }, expect: '2026-08-18' },
        { name: '边界：未来时间不谎报"刚刚"',
          run: function () { return T.relativeTime(BASE_TIME + 86400000, BASE_TIME); }, expect: '2026-09-28' },
        { name: '边界：非法时间戳返回空串',
          run: function () { return T.relativeTime('abc', BASE_TIME); }, expect: '' },
        { name: '联系方式掩码',
          run: function () { return T.maskContact('15066666666', 4); }, expect: '1506＊＊＊＊＊＊' },
        { name: '边界：短于保留位数时原样返回',
          run: function () { return T.maskContact('abc', 4); }, expect: 'abc' }
      ]
    },

    /* ------------------------------------------------ 关键词匹配 */
    {
      name: 'query.matches 关键词匹配',
      cases: [
        { name: '命中标题', run: function () { return Q.matches(LOST, '学生证'); }, expect: true },
        { name: '命中类别', run: function () { return Q.matches(LOST, '证件'); }, expect: true },
        { name: '命中地点', run: function () { return Q.matches(LOST, '东3'); }, expect: true },
        { name: '命中描述', run: function () { return Q.matches(LOST, '红色封面'); }, expect: true },
        { name: '命中类型文案（寻物）', run: function () { return Q.matches(LOST, '寻物'); }, expect: true },
        { name: '命中状态文案（进行中）', run: function () { return Q.matches(LOST, '进行中'); }, expect: true },
        { name: '已结束的记录能被"已找到"搜到', run: function () { return Q.matches(DONE, '已找到'); }, expect: true },
        { name: '多关键词是 AND：全中才算命中',
          run: function () { return Q.matches(LOST, '学生证 东3'); }, expect: true },
        { name: '多关键词缺一个就不命中',
          run: function () { return Q.matches(LOST, '学生证 电动车'); }, expect: false },
        { name: '空关键词 → 全部命中', run: function () { return Q.matches(LOST, ''); }, expect: true },
        { name: '纯空格关键词 → 全部命中', run: function () { return Q.matches(LOST, '   '); }, expect: true },
        { name: '大小写不敏感',
          run: function () { return Q.matches(item({ title: 'AirPods' }), 'airpods'); }, expect: true },
        { name: '异常：null 记录不抛异常', run: function () { return Q.matches(null, 'x'); }, expect: false }
      ]
    },

    /* ------------------------------------------------ 筛选 */
    {
      name: 'query.filter 筛选',
      cases: [
        { name: '默认不隐藏已结束的条目（按原型：仍留在列表里打标签）',
          run: function () { return Q.filter([LOST, DONE, FOUND]).length; }, expect: 3 },
        { name: '只看寻物', run: function () { return Q.filter([LOST, DONE, FOUND], { type: 'lost' }).length; }, expect: 2 },
        { name: '只看招领', run: function () { return Q.filter([LOST, DONE, FOUND], { type: 'found' }).length; }, expect: 1 },
        { name: 'type=all 等同不过滤',
          run: function () { return Q.filter([LOST, DONE, FOUND], { type: 'all' }).length; }, expect: 3 },
        { name: '只看进行中（我的发布分组会用到）',
          run: function () { return Q.filter([LOST, DONE, FOUND], { status: 'active' }).length; }, expect: 2 },
        { name: '只看已结束',
          run: function () { return Q.filter([LOST, DONE, FOUND], { status: 'resolved' }).length; }, expect: 1 },
        { name: '按类别筛选',
          run: function () { return Q.filter([LOST, DONE, FOUND], { category: '证件' }).length; }, expect: 2 },
        { name: '不存在的类别返回空数组',
          run: function () { return Q.filter([LOST, DONE, FOUND], { category: '不存在' }); }, expect: [] },
        { name: '组合：类型 + 关键词',
          run: function () { return Q.filter([LOST, DONE, FOUND], { type: 'lost', keyword: '学生证' }).length; }, expect: 1 },
        { name: '组合：类型不匹配时为空',
          run: function () { return Q.filter([LOST, DONE, FOUND], { type: 'found', keyword: '学生证' }).length; }, expect: 0 },
        { name: '异常：非数组返回空数组', run: function () { return Q.filter(null, {}); }, expect: [] },
        { name: '异常：字符串输入返回空数组', run: function () { return Q.filter('abc', {}); }, expect: [] },
        { name: '异常：数组里有 null 不会崩',
          run: function () { return Q.filter([null, LOST], {}).length; }, expect: 1 }
      ]
    },

    /* ------------------------------------------------ 排序 */
    {
      name: 'query.sort 排序',
      cases: [
        { name: '默认按发布时间倒序',
          run: function () { return Q.sort([LOST, DONE, FOUND]).map(function (i) { return i.id; }); },
          expect: ['c', 'b', 'a'] },
        { name: 'oldest 正序',
          run: function () { return Q.sort([FOUND, LOST, DONE], 'oldest').map(function (i) { return i.id; }); },
          expect: ['a', 'b', 'c'] },
        { name: '未知排序方式退回 newest',
          run: function () { return Q.sort([LOST, FOUND], '乱写').map(function (i) { return i.id; }); },
          expect: ['c', 'a'] },
        { name: '纯函数：不修改原数组', run: function () {
            var src = [LOST, DONE, FOUND];
            var snapshot = JSON.stringify(src);
            Q.sort(src);
            return JSON.stringify(src) === snapshot;
          }, expect: true },
        { name: '按标题排序不报错且不丢条目', run: function () {
            var out = Q.sort([LOST, DONE, FOUND], 'title');
            return out.length;
          }, expect: 3 },
        { name: '缺失 createdAt 不抛异常', run: function () {
            return Q.sort([item({ id: 'z', createdAt: undefined }), LOST]).length;
          }, expect: 2 }
      ]
    },

    /* ------------------------------------------------ 统计 */
    {
      name: 'query 统计',
      cases: [
        { name: '总体统计', run: function () { return Q.summary([LOST, DONE, FOUND]); },
          expect: { total: 3, resolved: 1, active: 2 } },
        { name: '空数组统计为 0', run: function () { return Q.summary([]); },
          expect: { total: 0, resolved: 0, active: 0 } },
        { name: '非数组统计为 0', run: function () { return Q.summary(null); },
          expect: { total: 0, resolved: 0, active: 0 } },
        { name: '类别计数', run: function () {
            var m = Q.categoryCounts([LOST, DONE, FOUND], {});
            return { all: m.all, '证件': m['证件'], '钥匙': m['钥匙'], '耳机': m['耳机'] };
          }, expect: { all: 3, '证件': 2, '钥匙': 1, '耳机': 0 } },
        { name: 'Tab 计数', run: function () { return Q.typeCounts([LOST, DONE, FOUND], {}); },
          expect: { all: 3, lost: 2, found: 1 } },
        { name: 'Tab 计数会跟着关键词变化', run: function () {
            return Q.typeCounts([LOST, DONE, FOUND], { keyword: '钥匙' });
          }, expect: { all: 1, lost: 0, found: 1 } }
      ]
    },

    /* ------------------------------------------------ 状态机 */
    {
      name: 'lifecycle 状态机',
      cases: [
        { name: '合法迁移表：进行中 → 已结束', run: function () { return L.canGo('active', 'resolved'); }, expect: true },
        { name: '合法迁移表：已结束 → 进行中（撤销）', run: function () { return L.canGo('resolved', 'active'); }, expect: true },
        { name: '同状态不是一次迁移', run: function () { return L.canGo('active', 'active'); }, expect: false },
        { name: '未知状态没有出路', run: function () { return L.canGo('deleted', 'resolved'); }, expect: false },

        { name: '标记后状态变为 resolved', run: function () {
            return L.resolve([LOST], 'a', 500).items[0].status;
          }, expect: 'resolved' },
        { name: '标记会写 updatedAt', run: function () {
            return L.resolve([LOST], 'a', 500).items[0].updatedAt;
          }, expect: 500 },
        { name: '返回 before 供撤销精确还原', run: function () {
            return L.resolve([LOST], 'a', 500).before.status;
          }, expect: 'active' },
        { name: '★ 标记后条目仍然留在数组里（按原型：打标签，不是删掉）', run: function () {
            var r = L.resolve([LOST, FOUND], 'a', 500);
            return [r.items.length, r.items[0].status];
          }, expect: [2, 'resolved'] },
        { name: '幂等：重复标记 ok 但 changed=false', run: function () {
            var r = L.resolve([DONE], 'b', 500);
            return [r.ok, r.changed];
          }, expect: [true, false] },
        { name: '找不到 id → ok=false 且给出原因', run: function () {
            return L.resolve([LOST], '不存在', 500).error;
          }, expect: '这条信息不存在' },
        { name: '找不到 id 时不改动数据', run: function () {
            return L.resolve([LOST], '不存在', 500).items[0].status;
          }, expect: 'active' },

        { name: '撤销：已结束 → 进行中', run: function () {
            return L.restore([DONE], 'b', 600).items[0].status;
          }, expect: 'active' },
        { name: '撤销一条本来就在进行中的 → changed=false', run: function () {
            return L.restore([LOST], 'a', 600).changed;
          }, expect: false },

        { name: '纯函数：不修改入参', run: function () {
            var src = [LOST];
            var snapshot = JSON.stringify(src);
            L.resolve(src, 'a', 500);
            return JSON.stringify(src) === snapshot;
          }, expect: true },
        { name: '异常：非数组不抛异常', run: function () { return L.resolve(null, 'a').ok; }, expect: false },
        { name: '异常：数组里有 null 不抛异常', run: function () { return L.resolve([null], 'a').ok; }, expect: false },

        { name: '文案：进行中', run: function () { return L.label(LOST); }, expect: '进行中' },
        { name: '文案：寻物终态是「已找到」', run: function () { return L.label(DONE); }, expect: '已找到' },
        { name: '文案：招领终态是「已归还」', run: function () { return L.label(FOUND_DONE); }, expect: '已归还' },
        { name: '按钮：寻物 → 标记已找到', run: function () { return L.resolveLabel(LOST); }, expect: '标记已找到' },
        { name: '按钮：招领 → 标记已归还', run: function () { return L.resolveLabel(FOUND); }, expect: '标记已归还' },
        { name: '进行中的条目只有一个可用动作', run: function () { return L.actions(LOST); },
          expect: [{ action: 'resolve', label: '标记已找到' }] },
        { name: '已结束的条目改为可撤销', run: function () { return L.actions(DONE); },
          expect: [{ action: 'restore', label: '撤销标记' }] },
        { name: '空记录没有动作', run: function () { return L.actions(null); }, expect: [] }
      ]
    },

    /* ------------------------------------------------ 表单校验 */
    {
      name: 'validate.publish 发布表单校验',
      cases: [
        { name: '全部填好 → 通过', run: function () { return V.publish(LOST).ok; }, expect: true },
        { name: '空表单 → 逐项报错（邮箱是选填，不在其中）', run: function () {
            return Object.keys(V.publish({}).errors).sort();
          }, expect: ['category', 'location', 'phone', 'time', 'title', 'type'] },
        { name: '纯空格视为空', run: function () {
            return V.publish(Object.assign({}, LOST, { title: '   ' })).errors.title;
          }, expect: '请填写物品名称' },
        { name: '边界：标题刚好等于上限通过', run: function () {
            return V.publish(Object.assign({}, LOST, { title: '字'.repeat(S.LIMITS.title) })).ok;
          }, expect: true },
        { name: '边界：标题超出一格被拦下', run: function () {
            var r = V.publish(Object.assign({}, LOST, { title: '字'.repeat(S.LIMITS.title + 1) }));
            return [r.ok, /不能超过/.test(r.errors.title)];
          }, expect: [false, true] },
        { name: '描述超长被拦下', run: function () {
            return V.publish(Object.assign({}, LOST, { description: '字'.repeat(S.LIMITS.description + 1) })).ok;
          }, expect: false },
        { name: '非法 type 被拦下', run: function () {
            return !!V.publish(Object.assign({}, LOST, { type: 'hack' })).errors.type;
          }, expect: true },
        { name: '非法 category 被拦下', run: function () {
            return !!V.publish(Object.assign({}, LOST, { category: '外星物品' })).errors.category;
          }, expect: true },
        { name: '联系电话为空要报错；邮箱为空不算错（原型上邮箱没有红星）', run: function () {
            var r = V.publish(Object.assign({}, LOST, { phone: '', email: '' }));
            return [!!r.errors.phone, !!r.errors.email];
          }, expect: [true, false] },
        { name: '只填电话也能通过', run: function () {
            return V.publish(Object.assign({}, LOST, { email: '' })).ok;
          }, expect: true },
        { name: '只填邮箱不通过（联系电话是必填）', run: function () {
            return V.publish(Object.assign({}, LOST, { phone: '' })).ok;
          }, expect: false },
        { name: '电话格式错误被拦下', run: function () {
            return !!V.publish(Object.assign({}, LOST, { phone: 'abc' })).errors.phone;
          }, expect: true },
        { name: '邮箱格式错误被拦下', run: function () {
            return !!V.publish(Object.assign({}, LOST, { email: 'nope' })).errors.email;
          }, expect: true },
        { name: '边界：7 位电话通过、6 位被拦下', run: function () {
            return [V.isPhone('1506666'), V.isPhone('150666')];
          }, expect: [true, false] },
        { name: 'normalize 会 trim 掉首尾空格', run: function () {
            return V.normalize({ title: '  学生证  ', type: 'lost' }).title;
          }, expect: '学生证' },
        { name: 'normalize 缺字段时给出空字符串而不是 undefined', run: function () {
            return V.normalize({}).title;
          }, expect: '' },
        { name: '异常：不传参数不抛异常', run: function () { return V.publish().ok; }, expect: false }
      ]
    },

    /* ------------------------------------------------ 导入校验 */
    {
      name: 'validate.importPayload 导入校验',
      cases: [
        { name: '合法数组通过', run: function () {
            return V.importPayload([LOST]).items.length;
          }, expect: 1 },
        { name: '合法 JSON 文本通过', run: function () {
            return V.importPayload(JSON.stringify([LOST])).ok;
          }, expect: true },
        { name: '备份对象形态 { items: [...] } 也接受', run: function () {
            return V.importPayload({ version: 1, items: [LOST, DONE] }).items.length;
          }, expect: 2 },
        { name: '异常：不是 JSON 文本', run: function () {
            return V.importPayload('{坏掉的').errors[0];
          }, expect: '不是合法的 JSON 文本' },
        { name: '异常：是 JSON 但不是数组',
          run: function () { return V.importPayload('123').ok; }, expect: false },
        { name: '异常：缺字段的记录被跳过并给出原因', run: function () {
            var r = V.importPayload([{ id: 'z' }]);
            return [r.ok, r.skipped, r.errors.length];
          }, expect: [false, 1, 1] },
        { name: '恶意：id 重复的记录被跳过', run: function () {
            var r = V.importPayload([LOST, LOST]);
            return [r.items.length, r.skipped, /重复/.test(r.errors[0])];
          }, expect: [1, 1, true] },
        { name: '缺少 id 的记录被跳过', run: function () {
            var bad = item({ id: '' });
            return V.importPayload([bad]).errors[0].indexOf('缺少 id') !== -1;
          }, expect: true },
        { name: '部分合法时：好的留下，坏的报出来', run: function () {
            var r = V.importPayload([LOST, { id: 'bad', type: 'hack' }]);
            return [r.items.length, r.skipped, r.ok];
          }, expect: [1, 1, true] },
        { name: '异常：空数组不算导入成功',
          run: function () { return V.importPayload([]).ok; }, expect: false }
      ]
    },

    /* ------------------------------------------------ 存储适配器 */
    {
      name: 'storage 适配器（后端注入，无需浏览器）',
      cases: [
        { name: '首次读取会写入种子数据', run: function () {
            var repo = freshRepo();
            var r = repo.read();
            return [r.ok, r.seeded, r.items.length];
          }, expect: [true, true, 1] },
        { name: '写入之后能读回来', run: function () {
            var repo = freshRepo();
            repo.write([LOST, DONE]);
            return repo.read().items.length;
          }, expect: 2 },
        { name: '内存后端的 mode 是 memory', run: function () {
            return freshRepo().mode;
          }, expect: 'memory' },
        { name: '★ 数据损坏时 ok=false 且**不覆盖**原始字符串', run: function () {
            var backend = store.memoryBackend({ broken: '{这不是 JSON' });
            var repo = store.create({ key: 'broken', backend: backend, seed: function () { return [LOST]; } });
            var r = repo.read();
            return [r.ok, backend.getItem('broken')];
          }, expect: [false, '{这不是 JSON'] },
        { name: '★ 容量写满时给出中文原因而不是抛异常', run: function () {
            var backend = {
              store: {},
              getItem: function (k) { return k in this.store ? this.store[k] : null; },
              setItem: function (k, v) {
                if (k === '__lf_probe__') { this.store[k] = v; return; }
                var e = new Error('QuotaExceededError');
                throw e;
              },
              removeItem: function (k) { delete this.store[k]; }
            };
            var repo = store.create({ key: 'full', backend: backend, seed: function () { return []; } });
            var r = repo.write([LOST]);
            return [r.ok, /已满/.test(r.error)];
          }, expect: [false, true] },
        { name: '正常后端会被识别为 localStorage', run: function () {
            var backend = {
              store: {},
              getItem: function (k) { return k in this.store ? this.store[k] : null; },
              setItem: function (k, v) { this.store[k] = String(v); },
              removeItem: function (k) { delete this.store[k]; }
            };
            return store.create({ key: 'k', backend: backend, seed: function () { return []; } }).mode;
          }, expect: 'localStorage' },
        { name: 'update 做读—改—写', run: function () {
            var repo = freshRepo();
            var r = repo.update(function (items) { return items.concat([FOUND]); });
            return [r.ok, r.items.length, repo.read().items.length];
          }, expect: [true, 2, 2] },
        { name: 'reset 回到种子数据', run: function () {
            var repo = freshRepo();
            repo.write([LOST, DONE, FOUND]);
            repo.reset();
            return repo.read().items.length;
          }, expect: 1 },
        { name: '导出文本是合法 JSON 且带元信息', run: function () {
            var repo = freshRepo();
            var parsed = JSON.parse(repo.exportText());
            return [parsed.app, parsed.version, parsed.count, parsed.items.length];
          }, expect: ['campus-lost-and-found', 1, 1, 1] },
        { name: '导出的内容能被自己导入回来', run: function () {
            var repo = freshRepo();
            repo.write([LOST, DONE, FOUND]);
            var text = repo.exportText();
            var other = freshRepo({ backend: store.memoryBackend() });
            var r = other.importText(text);
            return [r.ok, r.items.length];
          }, expect: [true, 3] },
        { name: '导入坏数据会被挡住', run: function () {
            return freshRepo().importText('坏数据').ok;
          }, expect: false },
        { name: '内存后端的订阅返回一个可调用的取消函数', run: function () {
            var off = freshRepo().subscribe(function () {});
            return typeof off;
          }, expect: 'function' },
        { name: 'rawText 能在数据损坏时取回原始字符串', run: function () {
            var backend = store.memoryBackend({ k: '{坏了' });
            var repo = store.create({ key: 'k', backend: backend, seed: function () { return []; } });
            return repo.rawText();
          }, expect: '{坏了' }
      ]
    }
  ];

  root.LF_TESTS = { groups: groups };
})(typeof globalThis !== 'undefined' ? globalThis : this);
