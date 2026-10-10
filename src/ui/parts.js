/**
 * parts.js —— 页面里反复出现的零件
 *
 * 原型的 10 个页面看起来各不相同，但拆开看只有这几个零件在重复：
 * 品牌标题行、搜索控件行、区块标题、三个 Tab、常见物品标签、信息卡片、空状态、表单行、主按钮。
 * 集中在这里定义，页面模块只负责"用哪几个、按什么顺序摆"。
 *
 * 图标全部用 createElementNS 逐个构造，不拼 SVG 字符串 —— 与卡片一样，
 * 页面里不存在"把字符串当 HTML 解析"的路径。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var ui = LF.ui = LF.ui || {};
  var dom = ui.dom;
  var S = LF.domain.schema;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------ 图标 */

  function svg(width, height, attrs) {
    var node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    node.setAttribute('width', width);
    node.setAttribute('height', height);
    node.setAttribute('aria-hidden', 'true');
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function shape(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  /** 线条风格图标：统一描边参数 */
  function lineIcon(width, height, parts) {
    var node = svg(width, height, {
      fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    parts.forEach(function (part) {
      var attrs = Object.assign({}, part[1]);
      if (part[0] === 'path' && attrs.fill === undefined) attrs.fill = 'none';
      node.appendChild(shape(part[0], attrs));
    });
    return node;
  }

  function searchIcon(size) {
    return lineIcon(size, size, [['circle', { cx: 11, cy: 11, r: 6.6 }], ['path', { d: 'm16 16 4.6 4.6' }]]);
  }
  function backIcon(size) { return lineIcon(size, size, [['path', { d: 'M14.5 5 7.5 12l7 7' }]]); }
  function clockIcon(size) {
    return lineIcon(size, size, [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7.5V12l3 2' }]]);
  }
  function pinIcon(size) {
    return lineIcon(size, size, [
      ['path', { d: 'M20 10.5c0 5.5-8 11.5-8 11.5s-8-6-8-11.5a8 8 0 0 1 16 0z' }],
      ['circle', { cx: 12, cy: 10.5, r: 2.8 }]
    ]);
  }
  function tagIcon(size) {
    return lineIcon(size, size, [
      ['path', { d: 'M4 11.5V5.8A1.8 1.8 0 0 1 5.8 4h5.7l8 8-7.5 7.5z' }],
      ['circle', { cx: 8.6, cy: 8.6, r: 1.3 }]
    ]);
  }
  function personIcon(size) {
    return lineIcon(size, size, [
      ['circle', { cx: 12, cy: 8.2, r: 4 }],
      ['path', { d: 'M4.2 20.4c0-3.9 3.5-6.2 7.8-6.2s7.8 2.3 7.8 6.2' }]
    ]);
  }
  function starIcon(size) {
    return lineIcon(size, size, [
      ['path', { d: 'm12 4 2.4 5 5.6.8-4.1 3.9 1 5.5-4.9-2.7-4.9 2.7 1-5.5L4 9.8 9.6 9z' }]
    ]);
  }
  function docIcon(size) {
    return lineIcon(size, size, [
      ['rect', { x: 4.5, y: 4, width: 15, height: 16, rx: 2.5 }],
      ['path', { d: 'M8.5 9h7M8.5 12.5h7M8.5 16h4' }]
    ]);
  }

  /** 举报图标：红色实心圆角三角 + 白色感叹号 */
  function alertIcon(size) {
    var node = svg(size, size, {});
    node.appendChild(shape('path', {
      d: 'M12 3.6 21 19.6H3z', fill: 'currentColor',
      stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }));
    node.appendChild(shape('rect', { x: 11.1, y: 9.6, width: 1.8, height: 5, rx: .9, fill: '#fff' }));
    node.appendChild(shape('rect', { x: 11.1, y: 16, width: 1.8, height: 1.8, rx: .9, fill: '#fff' }));
    return node;
  }

  /** 设置齿轮：实心圆 + 六根齿 + 白心 */
  function gearIcon(size) {
    var node = svg(size, size, {});
    for (var i = 0; i < 6; i++) {
      node.appendChild(shape('rect', {
        x: 10.6, y: 1.4, width: 2.8, height: 5, rx: 1.4,
        fill: 'currentColor', transform: 'rotate(' + (i * 60) + ' 12 12)'
      }));
    }
    node.appendChild(shape('circle', { cx: 12, cy: 12, r: 7.4, fill: 'currentColor' }));
    node.appendChild(shape('circle', { cx: 12, cy: 12, r: 2.8, fill: '#fff' }));
    return node;
  }

  function envelopeIcon(size) {
    var node = svg(size, size, {});
    node.appendChild(shape('rect', { x: 2.5, y: 5, width: 19, height: 14, rx: 2.5, fill: '#BD3124' }));
    node.appendChild(shape('path', {
      d: 'M3.8 6.6 12 12.6l8.2-6', fill: 'none', stroke: '#fff',
      'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    return node;
  }

  function pencilIcon(size) {
    return lineIcon(size, size, [
      ['path', { d: 'M4 20h4l10-10-4-4L4 16z' }],
      ['path', { d: 'm14 6 4 4' }]
    ]);
  }
  function magnifierBig() {
    return lineIcon(26, 26, [['circle', { cx: 11, cy: 11, r: 6.6 }], ['path', { d: 'm16 16 4.6 4.6' }]]);
  }
  function plusRingIcon() {
    return lineIcon(26, 26, [
      ['circle', { cx: 12, cy: 12, r: 9 }],
      ['path', { d: 'M12 7.5v9M7.5 12h9' }]
    ]);
  }
  function checkIcon(size) {
    var node = lineIcon(size, size, [['path', { d: 'M5 13.5l4.5 4.5L19 6.5' }]]);
    node.setAttribute('stroke-width', '2.6');
    return node;
  }

  /* ---------------------------------------------------------- 文本格式 */

  /**
   * 详情页上的时间戳格式：2026.9.27 17:02
   * （首页卡片用的是「2026年9月27日 17:02」，两种写法在原型里都出现过，各按各的来）
   */
  function stamp(ts) {
    var d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '';
    var mm = d.getMinutes();
    return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() +
      ' ' + d.getHours() + ':' + (mm < 10 ? '0' : '') + mm;
  }

  /* ---------------------------------------------------------- 品牌标题行 */

  /**
   * 校徽 + 「校园失物招领」+ 右侧图标。
   * 首页是信封、个人页是齿轮；两者都做成装饰性元素（原型里没有对应的页面，
   * 做成能点的按钮就是点了没反应的死控件）。
   */
  function brand(opts) {
    var o = opts || {};
    var row = dom.h('div', { class: 'brand' }, [
      dom.h('img', { class: 'brand-logo', src: 'assets/logo-fzu.png', alt: '福州大学' }),
      dom.h('h1', { class: 'brand-title', text: '校园失物招领' })
    ]);
    var icon = o.gear ? gearIcon(26) : (o.message ? envelopeIcon(23) : null);
    if (icon) {
      var holder = dom.h('span', { class: 'icon-btn', 'aria-hidden': 'true' });
      holder.appendChild(icon);
      row.appendChild(holder);
    }
    return row;
  }

  /** 顶部栏右侧那枚校徽（05 / 07 / 08 的头部都有） */
  function topbarLogo() {
    var img = dom.h('img', { class: 'brand-logo', src: 'assets/logo-fzu.png', alt: '福州大学' });
    img.style.height = '30px';
    return img;
  }

  /* ------------------------------------------------------ 搜索控件行 */

  function searchRow(opts) {
    var o = opts || {};
    var input = dom.h('input', {
      type: 'search', class: 'searchbox-input', placeholder: '搜索物品名称',
      autocomplete: 'off', 'aria-label': '搜索物品名称'
    });
    input.value = o.value || '';

    var box = dom.h('div', { class: 'searchbox' });
    var glass = searchIcon(15);
    glass.setAttribute('class', 'searchbox-ico');
    box.appendChild(glass);
    box.appendChild(input);

    var children = [];
    if (o.withBack !== false) {
      var back = dom.h('button', { class: 'searchrow-back', type: 'button', 'aria-label': '返回' });
      back.appendChild(backIcon(22));
      back.addEventListener('click', function () { ui.router.back(); });
      children.push(back);
    }
    children.push(box);

    var submit = dom.h('button', { class: 'search-btn', type: 'button', text: '搜索' });
    submit.addEventListener('click', function () { if (o.onSearch) o.onSearch(input.value); });
    children.push(submit);

    var row = dom.h('div', { class: 'searchrow' }, children);
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      input.blur();
      if (o.onSearch) o.onSearch(input.value);
    });
    row.focusInput = function () { input.focus(); };
    return row;
  }

  /* ---------------------------------------------------------- 区块标题 */

  function sectionTitle(text, opts) {
    var o = opts || {};
    return dom.h('h2', {
      class: 'section-title' + (o.brand ? ' is-brand' : ''),
      text: text
    });
  }

  /** 带图标的区块标题：「我的发布」那种（红图标 + 红字） */
  function iconTitle(icon, text) {
    var row = dom.h('div', { class: 'icon-title' });
    var holder = dom.h('span', { class: 'icon-title-ico', 'aria-hidden': 'true' });
    holder.appendChild(icon);
    row.appendChild(holder);
    row.appendChild(dom.h('span', { class: 'icon-title-text', text: text }));
    return row;
  }

  /* -------------------------------------------------------------- Tab */

  function tabs(active, onChange) {
    return dom.h('nav', { class: 'tabs', 'aria-label': '信息类型' },
      ['all', 'lost', 'found'].map(function (value) {
        return dom.h('button', {
          type: 'button',
          class: 'tab' + (value === active ? ' is-on' : ''),
          dataset: { type: value },
          text: S.TAB_LABEL[value],
          onclick: function () { if (onChange) onChange(value); }
        });
      }));
  }

  /* ---------------------------------------------------- 常见物品标签 */

  function chips(words, onPick) {
    return dom.h('div', { class: 'chips' }, words.map(function (word) {
      return dom.h('button', {
        type: 'button', class: 'chip', text: word,
        onclick: function () { if (onPick) onPick(word); }
      });
    }));
  }

  /* ------------------------------------------------------------ 列表 */

  function list(items, keyword, onOpen) {
    var host = dom.h('div', { class: 'list' });
    items.forEach(function (item) {
      var node = ui.card.build(item, keyword);
      node.addEventListener('click', function () { onOpen(item); });
      node.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpen(item);
      });
      host.appendChild(node);
    });
    return host;
  }

  function empty(text) {
    return dom.h('p', { class: 'empty', text: text });
  }

  /* ------------------------------------------------------------ 表单行 */

  function formRow(o) {
    var row = dom.h('div', { class: 'form-row' });

    if (o.tag === 'textarea') {
      row.classList.add('is-column');
      row.appendChild(dom.h('textarea', {
        class: 'form-textarea',
        placeholder: o.placeholder || '',
        dataset: { name: o.name }
      }));
      return row;
    }

    row.appendChild(dom.h('span', { class: 'form-label', text: o.label }));

    var control;
    function clearError() {
      row.classList.remove('has-error');
      var err = row.querySelector('.form-error');
      if (err) err.remove();
    }

    if (o.tag === 'select') {
      control = dom.h('select', { class: 'form-control', dataset: { name: o.name } });
      control.appendChild(dom.h('option', { value: '', text: o.placeholder || '点击选择' }));
      (o.options || []).forEach(function (opt) {
        control.appendChild(dom.h('option', { value: opt, text: opt }));
      });
      control.addEventListener('change', function () {
        control.classList.toggle('has-value', !!control.value);
        clearError();
        if (o.onInput) o.onInput(control.value);
      });
    } else {
      control = dom.h('input', {
        class: 'form-control', type: o.type || 'text',
        placeholder: o.placeholder || '', dataset: { name: o.name }, autocomplete: 'off'
      });
      control.addEventListener('input', function () {
        clearError();
        if (o.onInput) o.onInput(control.value);
      });
    }
    row.appendChild(control);

    if (o.required) row.appendChild(dom.h('span', { class: 'req', text: '*' }));
    return row;
  }

  function showErrors(formHost, errors) {
    Object.keys(errors || {}).forEach(function (name) {
      var control = formHost.querySelector('[data-name="' + name + '"]');
      if (!control) return;
      var row = control.closest('.form-row');
      if (!row) return;
      row.classList.add('has-error');
      if (!row.querySelector('.form-error')) {
        row.appendChild(dom.h('span', { class: 'form-error', text: errors[name] }));
      }
    });
  }

  function clearErrors(formHost) {
    Array.prototype.forEach.call(formHost.querySelectorAll('.form-row.has-error'), function (row) {
      row.classList.remove('has-error');
      var err = row.querySelector('.form-error');
      if (err) err.remove();
    });
  }

  /* ------------------------------------------------------------ 主按钮 */

  function primaryButton(text, onClick, opts) {
    var o = opts || {};
    return dom.h('button', {
      class: 'btn btn-primary' + (o.block ? ' btn-block' : '') + (o.wide ? ' btn-wide' : ''),
      type: o.type || 'button',
      text: text,
      disabled: !!o.disabled,
      onclick: onClick
    });
  }

  ui.parts = {
    brand: brand,
    topbarLogo: topbarLogo,
    searchRow: searchRow,
    sectionTitle: sectionTitle,
    iconTitle: iconTitle,
    tabs: tabs,
    chips: chips,
    list: list,
    empty: empty,
    formRow: formRow,
    showErrors: showErrors,
    clearErrors: clearErrors,
    primaryButton: primaryButton,
    stamp: stamp,
    icons: {
      search: searchIcon, back: backIcon, envelope: envelopeIcon, pencil: pencilIcon,
      magnifierBig: magnifierBig, plusRing: plusRingIcon, check: checkIcon,
      clock: clockIcon, pin: pinIcon, tag: tagIcon, person: personIcon,
      star: starIcon, alert: alertIcon, doc: docIcon, gear: gearIcon
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
