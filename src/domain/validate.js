/**
 * validate.js —— 表单校验与外部数据导入校验
 *
 * 两件事都是"判断一堆数据合不合法"，只是数据来源不同：
 *   publish(form)      来自用户填的表单
 *   importPayload(raw) 来自用户粘进来的 JSON 文件
 * 放在同一个文件里，是因为它们的错误结构是统一的：{ ok, errors }，
 * errors 的键就是**字段名**，UI 靠"字段名 → 错误槽位"的映射逐项回填红字。
 */
(function (root) {
  'use strict';

  var LF = root.LF = root.LF || {};
  var domain = LF.domain = LF.domain || {};
  var S = domain.schema;
  var T = domain.text;

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(T.text(v));
  }

  function isPhone(v) {
    return /^\d{7,20}$/.test(T.text(v).replace(/[\s-]/g, ''));
  }

  /** 把表单里的字符串全部 trim 一遍，得到一条干净的记录草稿 */
  function normalize(form) {
    var f = form || {};
    var out = S.blank({ id: T.text(f.id) });
    Object.keys(S.FIELDS).forEach(function (key) {
      if (key === 'createdAt') return;
      out[key] = T.text(f[key]);
    });
    out.createdAt = Number(f.createdAt) || Date.now();
    out.status = f.status === S.STATUS.RESOLVED ? S.STATUS.RESOLVED : S.STATUS.ACTIVE;
    out.publisher = f.publisher || null;
    return out;
  }

  /**
   * 发布表单校验。
   * @returns {{ok:boolean, errors:Object, clean:Object}} clean 是 trim 之后的记录
   */
  function publish(form) {
    var f = form || {};
    var clean = normalize(f);
    var errors = {};

    if (S.TYPES.LOST !== f.type && S.TYPES.FOUND !== f.type) {
      errors.type = '请选择信息类型（寻物 / 招领）';
    }
    if (!clean.title) {
      errors.title = '请填写物品名称';
    } else if (clean.title.length > S.LIMITS.title) {
      errors.title = '物品名称不能超过 ' + S.LIMITS.title + ' 个字';
    }
    if (!clean.category) {
      errors.category = '请选择物品类别';
    } else if (S.CATEGORIES.indexOf(clean.category) === -1) {
      errors.category = '请选择有效的物品类别';
    }
    if (!clean.location) {
      errors.location = '请填写丢失 / 拾获地点';
    } else if (clean.location.length > S.LIMITS.location) {
      errors.location = '地点不能超过 ' + S.LIMITS.location + ' 个字';
    }
    if (!clean.time) {
      errors.time = '请填写丢失 / 拾获时间';
    }
    if (clean.description.length > S.LIMITS.description) {
      errors.description = '具体描述不能超过 ' + S.LIMITS.description + ' 个字';
    }

    // 原型寻物发布页上「联系电话」带红色 *（必填）、「邮箱」不带 *（选填）。
    // 这里就照原型来：联系电话必填，邮箱填了才校验格式。
    if (!clean.phone) {
      errors.phone = '请填写联系电话';
    } else if (!isPhone(clean.phone)) {
      errors.phone = '联系电话格式不正确（7~20 位数字）';
    }
    if (clean.email && !isEmail(clean.email)) {
      errors.email = '邮箱格式不正确';
    }

    return { ok: Object.keys(errors).length === 0, errors: errors, clean: clean };
  }

  /**
   * 导入校验：用户可能粘进来一个备份 JSON。
   * 这里要挡住的情况包括：不是 JSON、不是数组、某条记录缺字段、状态值非法、
   * 以及**重复 id**（两条不同内容共用一个 id 会让后续按 id 改状态改错条目）。
   *
   * @param {string|Object} raw JSON 文本或已解析的对象
   * @returns {{ok:boolean, items:Array, errors:Array<string>, skipped:number}}
   */
  function importPayload(raw) {
    var parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return { ok: false, items: [], errors: ['不是合法的 JSON 文本'], skipped: 0 };
      }
    }
    // 允许两种形态：直接的数组，或 { version, items: [...] } 的备份对象
    var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : null);
    if (!list) {
      return { ok: false, items: [], errors: ['内容里没有找到条目数组'], skipped: 0 };
    }

    var errors = [];
    var seen = {};
    var items = [];
    var skipped = 0;

    list.forEach(function (candidate, i) {
      var where = '第 ' + (i + 1) + ' 条';
      var check = S.check(candidate);
      if (!check.ok) {
        errors.push(where + '：' + check.errors.join('、'));
        skipped++;
        return;
      }
      var id = T.text(candidate.id);
      if (!id) {
        errors.push(where + '：缺少 id');
        skipped++;
        return;
      }
      if (seen[id]) {
        errors.push(where + '：id「' + id + '」和前面的重复');
        skipped++;
        return;
      }
      seen[id] = true;
      items.push(normalize(candidate));
    });

    return { ok: items.length > 0, items: items, errors: errors, skipped: skipped };
  }

  domain.validate = {
    isEmail: isEmail,
    isPhone: isPhone,
    normalize: normalize,
    publish: publish,
    importPayload: importPayload
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
