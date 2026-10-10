/**
 * shell.js —— 页面外壳：顶部栏 / 页面容器 / 悬浮底部导航
 *
 * 10 个原型页面共用一份外壳，各页面只管往 #view 里渲染自己的内容，
 * 并声明"我要不要返回箭头、标题是什么、底部导航高亮哪个入口"。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};
  var dom = ui.dom;

  var el = {
    view: document.getElementById('view'),
    appbar: document.getElementById('appbar'),
    back: document.getElementById('appbarBack'),
    title: document.getElementById('appbarTitle'),
    extra: document.getElementById('appbarExtra'),
    tabbar: document.getElementById('tabbar')
  };

  /** 导航入口 → 路由 */
  var NAV_ROUTE = {
    home: '/home',
    search: '/search',
    publish: '/publish',
    mine: '/mine'
  };

  /** 清空并返回页面容器 */
  function view(options) {
    var o = options || {};
    dom.clear(el.view);
    el.view.className = 'view' + (o.form ? ' is-form' : '');
    return el.view;
  }

  /**
   * 配置顶部栏。
   * @param {Object} o { back:boolean, title:string, right:Node, bare:boolean }
   *   bare = 只有返回箭头、没有标题（发布成功页就是这样）
   */
  function appbar(o) {
    var opts = o || {};
    if (!opts.back && !opts.title) { hideAppbar(); return; }

    el.appbar.hidden = false;
    el.appbar.classList.toggle('is-bare', !!opts.bare);
    el.title.textContent = opts.title || '';
    el.back.hidden = !opts.back;
    dom.clear(el.extra);
    if (opts.right) el.extra.appendChild(opts.right);
  }

  function hideAppbar() {
    el.appbar.hidden = true;
    dom.clear(el.extra);
  }

  /** 底部导航：传入口名则显示并高亮，传 null 则隐藏（原型里表单页与详情页没有底部导航） */
  function tabbar(active) {
    if (!active) { el.tabbar.hidden = true; return; }
    el.tabbar.hidden = false;
    Array.prototype.forEach.call(el.tabbar.querySelectorAll('.tabbar-item'), function (btn) {
      btn.classList.toggle('is-on', btn.dataset.nav === active);
      btn.setAttribute('aria-current', btn.dataset.nav === active ? 'page' : 'false');
    });
  }

  // 底部导航点击 → 路由跳转（只绑一次，绑在外壳上）
  el.tabbar.addEventListener('click', function (event) {
    var btn = event.target.closest('.tabbar-item');
    if (!btn) return;
    var route = NAV_ROUTE[btn.dataset.nav];
    if (route) ui.router.go(route);
  });

  el.back.addEventListener('click', function () { ui.router.back(); });

  ui.shell = {
    NAV_ROUTE: NAV_ROUTE,
    view: view,
    appbar: appbar,
    hideAppbar: hideAppbar,
    tabbar: tabbar,
    /** 只改标题，不动返回箭头（详情页切换状态后刷新标题会用不到，留作备用） */
    setTitle: function (text) { el.title.textContent = text; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
