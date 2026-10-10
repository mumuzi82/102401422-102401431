/**
 * seed.js —— 首次打开时写入的示例数据
 *
 * 前两条就是墨刀原型首页上那两条（电动车钥匙 / 学生证），
 * 连图片都用第一次作业的原始素材，方便老师拿原型逐条对照。
 * 另外六条覆盖不同类别与两种状态，用来演示筛选与统计。
 *
 * 全部为虚构数据，不含任何真实个人信息。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var storage = LF.storage = LF.storage || {};

  function publisher(name, sid) {
    return { name: name, sid: sid, dept: '计算机学院 2024级' };
  }

  function at(iso) { return new Date(iso).getTime(); }

  /**
   * 本机用户档案。
   *
   * 作业明确不要求登录与实名认证，所以这里是一份**本地固定档案**：
   * 个人页展示它；本机发布的信息用它当发布者；据此区分「我的发布」和别人的信息，
   * 也就决定了点开一条信息时进的是「寻物详情页（自己能标记已结束/取消发布）」
   * 还是「信息详情页（只能联系发布者）」。学工号用结对学号，与仓库名对应。
   */
  storage.buildProfile = function buildProfile() {
    return { name: '陈嘉俊', sid: '102401422', dept: '计算机学院 2024级' };
  };

  /**
   * 注意 createdAt 与 time 的区别：
   *   time      事件发生的时间（丢了/捡到的时间，人工填写）
   *   createdAt 这条信息**发布**的时间，发布必然在事件之后
   * 原型首页是「电动车钥匙」在前、「学生证」在后，而两者的事件时间是
   * 16:42 与 17:02（学生证更晚）。按发布时间倒序正好能还原原型的顺序，
   * 两处语义也都不别扭。
   */
  storage.buildSeed = function buildSeed() {
    return [
      {
        id: 'i-ebike-key', type: 'found', category: '钥匙', title: '电动车钥匙',
        location: '东3-310', time: '2026年9月27日 16:42',
        description: '在东3-310 教室捡到一串电动车钥匙，带黑色遥控器，已交到东3 值班室。',
        phone: '15066666666', email: '150666666666@qq.com',
        image: 'assets/items/ebike-key.png',
        status: 'active', publisher: publisher('陈同学', '1024021xx'),
        createdAt: at('2026-09-27T17:30:00+08:00')
      },
      {
        id: 'i-student-card', type: 'lost', category: '证件', title: '学生证',
        location: '东3-201', time: '2026年9月27日 17:02',
        description: '福州大学学生证，红色封面，9 月 27 日下午遗失在东 3 教学楼，捡到的同学麻烦联系，重谢！',
        phone: '15066666666', email: '150666666666@qq.com',
        image: 'assets/items/student-card.jpg',
        // 这条挂在"我"名下，用来演示个人页的「我的发布」与发布者视角的寻物详情页
        status: 'resolved', publisher: storage.buildProfile(),
        createdAt: at('2026-09-27T17:10:00+08:00'),
        updatedAt: at('2026-09-27T18:30:00+08:00')
      },
      {
        id: 'i-campus-card', type: 'lost', category: '证件', title: '校园一卡通',
        location: '紫金楼 1 号食堂二楼', time: '2026年9月26日 09:15',
        description: '吃完早饭发现卡不在兜里，卡套是浅蓝色，背面贴了一张小猫贴纸。',
        phone: '13800006621', email: '', image: '',
        status: 'active', publisher: publisher('吴同学', '1024021xx'),
        createdAt: at('2026-09-26T09:40:00+08:00')
      },
      {
        id: 'i-backpack', type: 'lost', category: '背包', title: '深蓝色双肩包',
        location: '图书馆三楼自习区', time: '2026年9月26日 18:40',
        description: '包里有笔记本和充电器，侧袋插着一把黑色折叠伞。',
        phone: '', email: 'blue-bag@foxmail.com', image: '',
        status: 'active', publisher: publisher('黄同学', '1024021xx'),
        createdAt: at('2026-09-26T19:00:00+08:00')
      },
      {
        id: 'i-dorm-keys', type: 'found', category: '钥匙', title: '一串宿舍钥匙',
        location: '东3-201 教室', time: '2026年9月25日 08:05',
        description: '钥匙串上挂着一个银色小扳手挂件，已交给东3 教学楼值班室保管。',
        phone: '15066666666', email: '', image: '',
        status: 'active', publisher: publisher('郑同学', '1024021xx'),
        createdAt: at('2026-09-25T08:30:00+08:00')
      },
      {
        id: 'i-idcard', type: 'found', category: '证件', title: '身份证',
        location: '校车（旗山校区 → 铜盘校区）', time: '2026年9月24日 12:20',
        description: '在校车座位上捡到一张身份证，姓李，已交到校车队办公室。',
        phone: '15066666666', email: '', image: '',
        status: 'active', publisher: publisher('许同学', '1024021xx'),
        createdAt: at('2026-09-24T12:45:00+08:00')
      },
      {
        id: 'i-earbuds', type: 'lost', category: '耳机', title: '白色蓝牙耳机',
        location: '田径场跑道东侧看台', time: '2026年9月26日 20:10',
        description: '晚上跑步时掉的，充电盒还在，只剩右耳那一只不见了。已经找回来了，谢谢帮忙转发的同学。',
        phone: '13900008812', email: '', image: '',
        status: 'resolved', publisher: publisher('周同学', '1024021xx'),
        createdAt: at('2026-09-26T20:30:00+08:00'),
        updatedAt: at('2026-09-27T10:00:00+08:00')
      },
      {
        id: 'i-bottle', type: 'found', category: '水杯', title: '浅灰色保温杯',
        location: '体育馆羽毛球场 3 号场边', time: '2026年9月25日 15:30',
        description: '杯身贴了一张球队队徽贴纸，已联系到失主并归还。',
        phone: '15066666666', email: '', image: '',
        status: 'resolved', publisher: publisher('何同学', '1024021xx'),
        createdAt: at('2026-09-25T15:50:00+08:00'),
        updatedAt: at('2026-09-25T19:00:00+08:00')
      }
    ];
  };

  storage.SEED_KEY = 'lf.items.v1';
})(typeof globalThis !== 'undefined' ? globalThis : this);
