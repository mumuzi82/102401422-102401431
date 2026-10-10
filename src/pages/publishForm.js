/**
 * pages/publishForm.js —— 原型第 8 页：寻物发布页（招领发布共用同一张表单）
 *
 * 结构（自上而下）：
 *   顶部栏：返回箭头 + 「寻物消息发布」+ 右侧校徽
 *   「基本信息」+ 卡片（物品名称* ／ 物品类别* ／ 丢失地点* ／ 丢失时间* ／ 相关图片）
 *   「详细信息」卡片（卡片内红色标题 + 多行文本域，占位「具体描述」）
 *   联系方式卡片（联系电话* ／ 邮箱）
 *   「点击发布」按钮（居中，约屏宽 72%）
 * 原型没有底部导航。
 *
 * 关于两张入口卡：原型只画了「寻物发布页」，但发布页上同时有
 * 「我丢失了物品」和「我捡到了物品」两个入口，所以招领走同一张表单，
 * 只把标题与地点/时间的措辞按类型换掉（丢失 ↔ 拾获）。
 * 另外原型右上角有一个铅笔（编辑）图标，指向"编辑自己发布的信息"，
 * 所以这里支持 ?edit=<id> 回填并更新原记录。
 */
(function (root) {
  'use strict';

  var LF = root.LF;
  var ui = LF.ui;
  var parts = ui.parts;
  var dom = ui.dom;
  var S = LF.domain.schema;
  var V = LF.domain.validate;
  var T = LF.domain.text;

  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;

  function labels(type) {
    var lost = type !== S.TYPES.FOUND;
    return {
      title: lost ? '寻物消息发布' : '招领消息发布',
      place: lost ? '丢失地点' : '拾获地点',
      time: lost ? '丢失时间' : '拾获时间',
      placeHint: lost ? '大致描述' : '大致描述'
    };
  }

  function render(params, query) {
    var type = params.type === S.TYPES.FOUND ? S.TYPES.FOUND : S.TYPES.LOST;
    var editing = null;
    if (query && query.edit) {
      var found = LF.app.find(query.edit);
      // 修 bug：只能编辑自己的信息。手改地址塞进别人的 id 时，
      // 之前会把表单回填成"保存修改"，一提交就把别人的标题改掉了。
      // 现在不是自己的就忽略 edit，当成新建处理。
      if (found && LF.app.isMine(found)) {
        editing = found;
        type = found.type;
      }
    }
    var L = labels(type);

    var view = ui.shell.view({ form: true });
    ui.shell.tabbar(null);

    // 顶部栏：返回 + 标题 + 右侧校徽
    var logo = dom.h('img', { class: 'brand-logo', src: 'assets/logo-fzu.png', alt: '福州大学' });
    logo.style.height = '30px';
    ui.shell.appbar({ back: true, title: L.title, right: logo });

    /* ---------------- 基本信息 ---------------- */
    view.appendChild(parts.sectionTitle('基本信息', { brand: true }));

    var basic = dom.h('div', { class: 'form-card' }, [
      parts.formRow({
        label: '物品名称', placeholder: '具体物品名称', required: true,
        name: 'title', onInput: onDirty
      }),
      parts.formRow({
        label: '物品类别', placeholder: '点击选择', required: true,
        name: 'category', tag: 'select', options: S.CATEGORIES, onInput: onDirty
      }),
      parts.formRow({
        label: L.place, placeholder: L.placeHint, required: true,
        name: 'location', onInput: onDirty
      }),
      parts.formRow({
        label: L.time, placeholder: 'XXXX年.XX月.XX日  XX:XX 大概即可', required: true,
        name: 'time', onInput: onDirty
      }),
      imageRow()
    ]);
    view.appendChild(dom.h('div', { class: 'form-block' }, [basic]));

    /* ---------------- 详细信息 ---------------- */
    var detailCard = dom.h('div', { class: 'form-card' }, [
      dom.h('h3', { class: 'form-card-title', text: '详细信息' }),
      dom.h('div', { class: 'form-card-body' }, [
        parts.formRow({ tag: 'textarea', placeholder: '具体描述', name: 'description' })
      ])
    ]);
    view.appendChild(dom.h('div', { class: 'form-block' }, [detailCard]));

    /* ---------------- 联系方式 ---------------- */
    var contactCard = dom.h('div', { class: 'form-card' }, [
      parts.formRow({
        label: '联系电话', placeholder: '用于联系', required: true,
        name: 'phone', type: 'tel', onInput: onDirty
      }),
      parts.formRow({ label: '邮箱', placeholder: '', name: 'email', type: 'email' })
    ]);
    view.appendChild(dom.h('div', { class: 'form-block' }, [contactCard]));

    /* ---------------- 提交 ---------------- */
    var submit = parts.primaryButton(editing ? '保存修改' : '点击发布', function () {
      submitForm(view, type, editing);
    }, { wide: true });
    view.appendChild(dom.h('div', { class: 'actions is-center' }, [submit]));

    if (editing) fill(view, editing);
    view.scrollTop = 0;
  }

  /** 相关图片：点一下选本地图片，选中后行内显示文件名 */
  function imageRow() {
    var input = dom.h('input', {
      type: 'file', accept: 'image/*', class: 'visually-hidden', id: 'imageInput'
    });
    var row = parts.formRow({
      label: '相关图片', placeholder: '点击上传', name: 'image'
    });
    var control = row.querySelector('[data-name="image"]');
    if (control) control.remove();               // 这一行不用输入框，改成只读显示 + 隐藏的 file

    var shown = dom.h('span', {
      class: 'form-control', text: '点击上传', dataset: { name: 'image' }
    });
    shown.style.color = 'var(--muted)';
    row.insertBefore(shown, row.querySelector('.req'));
    row.appendChild(input);
    row.style.cursor = 'pointer';

    row.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES) {
        shown.textContent = '点击上传';
        input.value = '';
        ui.toast.show('图片超过 2MB，换一张小一点的吧');
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        row.dataset.image = String(reader.result);
        shown.textContent = file.name;
        shown.style.color = 'var(--text)';
      };
      reader.onerror = function () { ui.toast.show('读取图片失败'); };
      reader.readAsDataURL(file);
    });
    return row;
  }

  function onDirty() { /* 输入时由 formRow 自行清掉该行的错误提示 */ }

  /** 编辑模式：把已有记录回填到表单 */
  function fill(view, item) {
    setValue(view, 'title', item.title);
    setValue(view, 'category', item.category);
    setValue(view, 'location', item.location);
    setValue(view, 'time', item.time);
    setValue(view, 'description', item.description);
    setValue(view, 'phone', item.phone);
    setValue(view, 'email', item.email);
    if (item.image) {
      var row = view.querySelector('[data-name="image"]') &&
                view.querySelector('[data-name="image"]').closest('.form-row');
      if (row) {
        row.dataset.image = item.image;
        var shown = row.querySelector('.form-control');
        if (shown) { shown.textContent = '已选择图片'; shown.style.color = 'var(--text)'; }
      }
    }
  }

  function setValue(view, name, value) {
    var control = view.querySelector('[data-name="' + name + '"]');
    if (!control) return;
    control.value = value || '';
    if (control.tagName === 'SELECT') control.classList.toggle('has-value', !!control.value);
  }

  function readValue(view, name) {
    var control = view.querySelector('[data-name="' + name + '"]');
    return control ? control.value : '';
  }

  function submitForm(view, type, editing) {
    parts.clearErrors(view);

    // 双保险：渲染时已经判断过一次，提交前再确认这条还是自己的。
    // 不是自己的就当新建，绝不覆盖别人的记录。
    if (editing && !LF.app.isMine(editing)) editing = null;

    var imageRow = view.querySelector('[data-name="image"]');
    var imageHost = imageRow && imageRow.closest('.form-row');
    var image = (imageHost && imageHost.dataset.image) || (editing ? editing.image : '');

    var form = {
      id: editing ? editing.id : '',
      type: type,
      title: readValue(view, 'title'),
      category: readValue(view, 'category'),
      location: readValue(view, 'location'),
      time: readValue(view, 'time'),
      description: readValue(view, 'description'),
      phone: readValue(view, 'phone'),
      email: readValue(view, 'email'),
      image: image,
      status: editing ? editing.status : S.STATUS.ACTIVE,
      createdAt: editing ? editing.createdAt : Date.now(),
      publisher: editing ? editing.publisher : LF.app.profile()
    };

    var checked = V.publish(form);       // 表单校验在领域层，界面只负责把错误摆到对应行
    if (!checked.ok) {
      parts.showErrors(view, checked.errors);
      ui.toast.show('还有必填项没填完，已在对应位置标出');
      return;
    }

    var next = checked.clean;
    next.id = editing ? editing.id : LF.app.newId();
    if (!next.image) next.image = '';

    if (editing) {
      var savedEdit = LF.app.replace(next);
      if (!savedEdit) return;
      ui.router.go('/mine/detail/' + next.id);
      return;
    }

    var saved = LF.app.add(next);
    if (!saved) return;
    ui.router.go('/success', { id: next.id });
  }

  ui.pages = ui.pages || {};
  ui.pages.publishForm = { render: render, MAX_IMAGE_BYTES: MAX_IMAGE_BYTES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
