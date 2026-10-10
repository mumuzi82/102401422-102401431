/**
 * verify-pages.mjs —— 用 CDP 逐页走查 10 个原型页面
 *
 * 单元测试证明不了"页面真的能用"，所以这里用真实鼠标事件与输入事件，
 * 把 10 个页面按原型的结构逐条断言一遍，并顺手跑通一条完整链路：
 *   发布 → 发布成功页 → 寻物详情页 → 标记已结束
 *
 * 用法：
 *   1) msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\lf-dbg ^
 *        "file:///<项目路径>/index.html"
 *   2) node scripts/verify-pages.mjs 9222 docs/shots
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.argv[2] || 9222);
const SHOT_DIR = process.argv[3] || 'docs/shots';
const BASE = process.argv[4] || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error('页面执行出错：' + JSON.stringify(res.exceptionDetails.exception));
  return res.result.value;
}

const results = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ ok, label });
  console.log(`   ${ok ? '✅' : '❌'} ${label}  实际=${JSON.stringify(actual)}`);
  return ok;
}

async function click(selector) {
  const box = await evaluate(`(function () {
    var el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!box) throw new Error('点不到元素：' + selector);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  await sleep(320);
}

async function fill(selector, value) {
  await evaluate(`(function () {
    var el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  })()`);
  await sleep(150);
}

async function goto(hash) {
  await send('Page.navigate', { url: BASE + '#' + hash });
  await sleep(900);
}

async function shot(name) {
  mkdirSync(SHOT_DIR, { recursive: true });
  const res = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOT_DIR, name), Buffer.from(res.data, 'base64'));
  console.log('   📸 ' + join(SHOT_DIR, name));
}

const tabbarActive = 'Array.prototype.filter.call(document.querySelectorAll(".tabbar-item"), function(b){return b.classList.contains("is-on");}).map(function(b){return b.dataset.nav;})';

async function main() {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.filter((t) => t.type === 'page').find((t) => /index\.html/.test(t.url));
  if (!page) throw new Error('没找到 index.html 标签页');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true });

  /* 清一次旧数据，保证从示例数据开始 */
  await evaluate('localStorage.clear()');

  /* ------------------------------------------------ 1 首页 */
  console.log('\n== 1／10 首页 ==');
  await goto('/home');
  check('校徽加载出来了', await evaluate('document.querySelector(".brand-logo").naturalWidth > 0'), true);
  check('品牌标题', await evaluate('document.querySelector(".brand-title").textContent'), '校园失物招领');
  check('搜索框占位文字', await evaluate('document.querySelector(".searchbox-input").placeholder'), '搜索物品名称');
  check('搜按钮文案', await evaluate('document.querySelector(".search-btn").textContent'), '搜索');
  check('分区标题', await evaluate('document.querySelector(".section-title").textContent'), '近期失物信息');
  check('三个 Tab 文案', await evaluate('Array.prototype.map.call(document.querySelectorAll(".tab"), function(t){return t.textContent;})'),
    ['全部失物', '失物寻找', '失物招领']);
  check('卡片数（8 条示例数据）', await evaluate('document.querySelectorAll(".card").length'), 8);
  check('第一张卡片是电动车钥匙（与原型一致）', await evaluate('document.querySelector(".card").dataset.id'), 'i-ebike-key');
  check('状态标签用作业原文措辞「已找到」',
    await evaluate('document.querySelector(\'.card[data-id="i-student-card"] .js-state\').textContent'), '已找到');
  check('底部导航高亮首页', await evaluate(tabbarActive), ['home']);
  await shot('p01-home.png');

  /* ------------------------------------------------ 2 搜索页面 */
  console.log('\n== 2／10 搜索页面 ==');
  await goto('/search');
  check('有返回箭头', await evaluate('!!document.querySelector(".searchrow-back")'), true);
  check('小标题是「常见物品」', await evaluate('document.querySelector(".section-title").textContent'), '常见物品');
  check('四个常见物品标签', await evaluate('Array.prototype.map.call(document.querySelectorAll(".chip"), function(c){return c.textContent;})'),
    ['身份证', '学生证', '钥匙', '背包']);
  check('底部导航高亮搜索', await evaluate(tabbarActive), ['search']);
  await shot('p02-search.png');

  /* ------------------------------------------------ 3 搜索结果页 */
  console.log('\n== 3／10 搜索结果页 ==');
  await click('.chip');                       // 点「身份证」
  check('URL 带上关键词', await evaluate('location.hash.indexOf("q=") > 0'), true);
  check('标题是「搜索结果」', await evaluate('document.querySelector(".section-title").textContent'), '搜索结果');
  check('有结果条数统计', await evaluate('/共找到 \\d+ 条相关结果/.test(document.querySelector(".section-count").textContent)'), true);
  await goto('/search-result?q=' + encodeURIComponent('学生证'));
  check('搜「学生证」命中 1 条', await evaluate('document.querySelectorAll(".card").length'), 1);
  check('关键词被高亮', await evaluate('document.querySelectorAll("mark").length > 0'), true);
  await shot('p04-search-result.png');
  await goto('/search-result?q=' + encodeURIComponent('不存在的东西'));
  check('搜不到时给一行提示（不是白屏）', await evaluate('!!document.querySelector(".empty")'), true);

  /* ------------------------------------------------ 4 发布页 */
  console.log('\n== 4／10 发布页 ==');
  await goto('/publish');
  check('两张入口卡', await evaluate('Array.prototype.map.call(document.querySelectorAll(".entry-title"), function(e){return e.textContent;})'),
    ['我丢失了物品', '我捡到了物品']);
  check('两张卡的副标题', await evaluate('Array.prototype.map.call(document.querySelectorAll(".entry-sub"), function(e){return e.textContent;})'),
    ['发布寻物消息', '发布招领消息']);
  check('底部导航高亮发布', await evaluate(tabbarActive), ['publish']);
  await shot('p03-publish.png');

  /* ------------------------------------------------ 5 寻物发布页 */
  console.log('\n== 5／10 寻物发布页 ==');
  await click('.entry-card');
  check('顶部栏标题', await evaluate('document.getElementById("appbarTitle").textContent'), '寻物消息发布');
  check('顶部栏右侧有校徽', await evaluate('!!document.querySelector("#appbarExtra .brand-logo")'), true);
  check('区块标题「基本信息」', await evaluate('document.querySelector(".section-title").textContent'), '基本信息');
  check('八个字段的标签', await evaluate(`Array.prototype.map.call(document.querySelectorAll('.form-label'), function(e){return e.textContent;})`),
    ['物品名称', '物品类别', '丢失地点', '丢失时间', '相关图片', '联系电话', '邮箱']);
  check('必填红星共 5 个', await evaluate('document.querySelectorAll(".req").length'), 5);
  check('物品名称的占位文字', await evaluate('document.querySelector(\'[data-name="title"]\').placeholder'), '具体物品名称');
  check('物品类别的占位文字（select 的第一个选项）',
    await evaluate('document.querySelector(\'[data-name="category"]\').options[0].textContent'), '点击选择');
  check('丢失时间的占位文字', await evaluate('document.querySelector(\'[data-name="time"]\').placeholder'), 'XXXX年.XX月.XX日  XX:XX 大概即可');
  check('相关图片的占位文字', await evaluate('document.querySelector(\'[data-name="image"]\').textContent'), '点击上传');
  check('联系电话的占位文字', await evaluate('document.querySelector(\'[data-name="phone"]\').placeholder'), '用于联系');
  check('详细信息是文本域且占位「具体描述」',
    await evaluate('document.querySelector(\'.form-textarea\').placeholder'), '具体描述');
  check('提交按钮文案', await evaluate('document.querySelector(".actions .btn").textContent'), '点击发布');
  check('这一页没有底部导航（与原型一致）', await evaluate('document.getElementById("tabbar").hidden'), true);
  await shot('p08-publish-form.png');

  /* 空表单提交 → 逐项红字提示 */
  await click('.actions .btn');
  check('空表单提交后逐项标红', await evaluate('document.querySelectorAll(".form-row.has-error").length >= 5'), true);
  check('仍是留在表单页（没有跳走）', await evaluate('location.hash.indexOf("/publish/lost") > 0'), true);
  await shot('p08-publish-form-error.png');

  /* 正常填完并提交 */
  await fill('[data-name="title"]', '黑色折叠伞');
  await fill('[data-name="category"]', '雨伞');
  await fill('[data-name="location"]', '图书馆一楼门口');
  await fill('[data-name="time"]', '2026年10月8日 09:30');
  await fill('[data-name="description"]', '伞柄是木头的，伞套是深蓝色。');
  await fill('[data-name="phone"]', '13800001234');
  await click('.actions .btn');

  /* ------------------------------------------------ 6 发布成功页 */
  console.log('\n== 6／10 发布成功页 ==');
  check('跳到发布成功页', await evaluate('location.hash.indexOf("/success") > 0'), true);
  check('文案「发布成功！」', await evaluate('document.querySelector(".success h2").textContent'), '发布成功！');
  check('按钮「查看发布详情」', await evaluate('document.querySelector(".success .btn").textContent'), '查看发布详情');
  check('这一页没有底部导航', await evaluate('document.getElementById("tabbar").hidden'), true);
  await shot('p10-success.png');

  /* ------------------------------------------------ 7 寻物详情页（发布者视角） */
  console.log('\n== 7／10 寻物详情页（发布者视角）==');
  await click('.success .btn');
  check('标题「失物详情信息」', await evaluate('document.getElementById("appbarTitle").textContent'), '失物详情信息');
  check('有编辑铅笔', await evaluate('!!document.querySelector("#appbarExtra .icon-action")'), true);
  check('★ 有返回箭头（原型这一页没有，是补的）', await evaluate('!!document.getElementById("appbarBack")'), true);
  check('两个按钮', await evaluate('Array.prototype.map.call(document.querySelectorAll(".actions .btn"), function(b){return b.textContent;})'),
    ['标记已结束', '取消发布']);
  check('联系电话平铺展示', await evaluate('/联系电话：/.test(document.body.textContent)'), true);
  await shot('p09-my-detail.png');

  const beforeCount = await evaluate('LF.app.items().length');
  await click('.actions .btn');                       // 标记已结束
  check('标记后状态变「已结束」', await evaluate('/已标记为/.test(document.body.textContent) || document.body.textContent.indexOf("已结束") !== -1'), true);
  check('条目没有被删掉', await evaluate('LF.app.items().length'), beforeCount);
  check('按钮变为不可点（已结束）', await evaluate('document.querySelector(".actions .btn").disabled'), true);

  /* ★ 返回按钮真的能退出去（修复前这一页没有任何返回入口） */
  const stayHash = await evaluate('location.hash');
  await click('#appbarBack');
  await sleep(500);
  check('★ 点返回箭头能离开寻物详情页',
    await evaluate(`location.hash !== ${JSON.stringify(stayHash)}`), true);
  console.log('     返回后落在 ' + await evaluate('location.hash'));
  await goto(stayHash.slice(1));                      // 回到这一页，后面的用例继续
  check('回到寻物详情页（顶部栏还在）',
    await evaluate('document.getElementById("appbarTitle").textContent'), '失物详情信息');

  /* 从个人页进来再退一次，确认退到的是个人页 */
  await goto('/mine');
  await click('.card');
  check('从个人页点卡片进的是寻物详情页', await evaluate('location.hash.indexOf("/mine/detail/") > 0'), true);
  await click('#appbarBack');
  await sleep(500);
  check('★ 从个人页进来，返回能回到个人页', await evaluate('location.hash'), '#/mine');

  /* ------------------------------------------------ 8 信息详情页（浏览者视角） */
  console.log('\n== 8／10 信息详情页（浏览者视角）==');
  await goto('/detail/i-ebike-key');
  check('标题「失物详情信息」', await evaluate('document.getElementById("appbarTitle").textContent'), '失物详情信息');
  check('物品卡片三行字段', await evaluate(`Array.prototype.map.call(document.querySelectorAll('.item-line b'), function(b){return b.textContent;})`),
    ['物品名称：', '发布时间：', '当前状态：']);
  check('三行图标字段', await evaluate(`Array.prototype.map.call(document.querySelectorAll('.icon-line b'), function(b){return b.textContent;})`),
    ['物品类型：', '丢失时间：', '丢失地点：']);
  check('有「详细信息」卡片', await evaluate('document.querySelector(".info-card h3").textContent'), '详细信息');
  check('有「发布者信息」卡片', await evaluate('document.querySelector(".pub-head .icon-title-text").textContent'), '发布者信息');
  check('底部主按钮是「联系发布者」', await evaluate('document.querySelector(".action-bar .btn").textContent'), '联系发布者');
  await shot('p05-detail.png');

  /* ------------------------------------------------ 9 联系发布者页面 */
  console.log('\n== 9／10 联系发布者页面 ==');
  await click('.action-bar .btn');
  check('标题「联系发布者」', await evaluate('document.getElementById("appbarTitle").textContent'), '联系发布者');
  check('卡片里有联系电话与邮箱',
    await evaluate(`(function(){var t=document.querySelector('.pub-card').textContent;
      return t.indexOf('联系电话：')!==-1 && t.indexOf('邮箱：')!==-1;})()`), true);
  check('这一页没有底部导航', await evaluate('document.getElementById("tabbar").hidden'), true);
  await shot('p07-contact.png');

  /* ------------------------------------------------ 10 个人页 */
  console.log('\n== 10／10 个人页 ==');
  await goto('/mine');
  check('品牌标题', await evaluate('document.querySelector(".brand-title").textContent'), '校园失物招领');
  check('有齿轮图标', await evaluate('!!document.querySelector(".brand .icon-btn svg")'), true);
  check('「我的」卡有姓名与学工号',
    await evaluate('!!document.querySelector(".mine-name") && !!document.querySelector(".mine-sub")'), true);
  check('有「发布数量」', await evaluate('/发布数量：/.test(document.querySelector(".mine-card-foot").textContent)'), true);
  check('有「我的收藏」入口', await evaluate('document.querySelector(".entry-row-text").textContent'), '我的收藏');
  check('有「我的发布」图标标题', await evaluate('document.querySelector(".icon-title-text").textContent'), '我的发布');
  check('个人页只列自己的信息', await evaluate('document.querySelectorAll(".card").length >= 2'), true);
  check('底部导航高亮我的', await evaluate(tabbarActive), ['mine']);
  await shot('p06-mine.png');

  /* 个人页的卡片应该进「发布者视角」的详情页 */
  await click('.card');
  check('从个人页点卡片进的是寻物详情页（有标记已结束）',
    await evaluate('/标记已结束/.test(document.body.textContent)'), true);

  /* ------------------------------------------------ 越权守卫（修 bug 后补的回归） */
  console.log('\n== 越权守卫：手改地址能不能动别人的信息 ==');
  await goto('/home');
  check('示例数据里 i-ebike-key 不是我的',
    await evaluate('LF.app.isMine(LF.app.find("i-ebike-key"))'), false);

  await goto('/mine/detail/i-ebike-key');
  check('★ 别人的 id 进发布者视角 → 被换成浏览者视角',
    await evaluate('location.hash'), '#/detail/i-ebike-key');
  check('★ 看不到「标记已结束」',
    await evaluate('/标记已结束/.test(document.body.textContent)'), false);
  check('★ 看不到「取消发布」',
    await evaluate('/取消发布/.test(document.body.textContent)'), false);
  check('  看到的是浏览者视角的「联系发布者」',
    await evaluate('!!document.querySelector(".action-bar .btn")'), true);

  await goto('/publish/lost?edit=i-ebike-key');
  check('★ 带别人的 id 来编辑 → 表单不回填',
    await evaluate('document.querySelector(\'[data-name="title"]\').value'), '');
  check('★ 按钮是「点击发布」而不是「保存修改」',
    await evaluate('document.querySelector(".actions .btn").textContent'), '点击发布');

  await goto('/mine/detail/i-student-card');
  check('自己的信息上「标记已结束」还在',
    await evaluate('/标记已结束/.test(document.body.textContent)'), true);
  await click('#appbarExtra .icon-action');
  check('自己的信息能进编辑并回填',
    await evaluate('document.querySelector(\'[data-name="title"]\').value'), '学生证');

  /* ------------------------------------------------ 数据损坏（修 bug 后补的回归） */
  console.log('\n== 本地数据损坏时的表现 ==');
  // 这件事必须整页重载，应用才会重新读取存储
  async function hardGoto(hash) {
    await send('Page.navigate', { url: BASE + '#' + hash });
    await sleep(250);
    await send('Page.reload');
    await sleep(1100);
  }

  await evaluate(`localStorage.setItem('lf.items.v1', '{坏掉的 JSON')`);
  await hardGoto('/home');
  check('★ 首页把错误告诉用户（不再被路由渲染盖掉）',
    await evaluate('/本地数据读取失败/.test(document.body.textContent)'), true);
  check('★ 摊出了原始内容供留底',
    await evaluate('!!document.querySelector(".raw-area") && document.querySelector(".raw-area").value.indexOf("坏掉的 JSON") >= 0'),
    true);
  check('★ 底部导航被隐藏',
    await evaluate('document.getElementById("tabbar").hidden'), true);
  check('★ 损坏的原始字符串还没被覆盖',
    await evaluate(`localStorage.getItem('lf.items.v1')`), '{坏掉的 JSON');
  await shot('p11-corrupt.png');

  await hardGoto('/publish/lost');
  check('★ 读取失败时发布页也进不去（仍显示错误页）',
    await evaluate('/本地数据读取失败/.test(document.body.textContent)'), true);
  await evaluate(`(function(){ try { LF.app.add({id:'sneak'}); } catch(e){} return 1; })()`);
  check('★ 连直接调 add() 也写不进去',
    await evaluate(`localStorage.getItem('lf.items.v1')`), '{坏掉的 JSON');

  await hardGoto('/home');
  await evaluate('window.confirm = function () { return true; };');
  await click('.empty.is-error .btn');
  await sleep(800);
  check('★ 点「恢复示例数据」后回到正常首页',
    await evaluate('document.querySelectorAll(".card").length'), 8);
  check('★ 底部导航回来了',
    await evaluate('document.getElementById("tabbar").hidden'), false);
  await shot('p11-corrupt-recovered.png');

  /* ------------------------------------------------ 收尾 */
  console.log('\n== 附：底部导航四个入口都能走通 ==');
  for (const [nav, hash] of [['home', '/home'], ['search', '/search'], ['publish', '/publish'], ['mine', '/mine']]) {
    await goto(hash);
    if (nav !== 'home') await click(`.tabbar-item[data-nav="${nav}"]`);
    check(`底部「${nav}」能跳到 ${hash}`, await evaluate('location.hash'), '#' + hash);
  }

  /* 桌面视口 */
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1100, deviceScaleFactor: 1, mobile: false });
  await goto('/home');
  check('桌面端手机框不超宽', await evaluate('document.querySelector(".phone").getBoundingClientRect().width <= 402'), true);
  await shot('p01-home-desktop.png');

  /* ------------------------------------------------ 提示条要会自己消失 */
  console.log('\n== 提示条 ==');
  await evaluate(`LF.ui.toast.show('走查用的临时提示')`);
  check('提示条出现了', await evaluate('!!document.querySelector(".toast")'), true);
  await sleep(3400);
  check('★ 3 秒后自动消失（否则会一直盖在页面上）',
    await evaluate('!!document.querySelector(".toast")'), false);

  ws.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n===== 十页走查：${results.length} 项断言，通过 ${results.length - failed.length}，失败 ${failed.length} =====`);
  failed.forEach((f) => console.log('   ❌ ' + f.label));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('❌ ' + e.message); process.exit(1); });
