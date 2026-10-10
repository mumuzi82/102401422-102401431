/**
 * runner.js —— 极小的表驱动测试运行器
 *
 * 用例是**数据**（tests/cases.js 里的一个数组），运行器是**逻辑**（这个文件）。
 * 于是同一份用例可以有两种跑法：
 *   命令行：node tests/run-node.mjs      —— 交给 CI / 交作业前自检
 *   浏览器：用 Chrome 打开 tests/run-browser.html —— 不装 Node 的同学也能跑
 *
 * 比较用 JSON.stringify 而不是 assert.deepStrictEqual 之类：
 *   一是它只认数据不认原型，跨 iframe / 跨 realm 也不会误判；
 *   二是失败信息里能直接看到"实际"和"期望"两份完整数据，好定位。
 */
(function (root) {
  'use strict';

  function stable(value) {
    if (value === undefined) return '<undefined>';
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  /**
   * 用例格式：
   *   { name: '说明', run: function () { return 实际值; }, expect: 期望值 }
   *   { name: '说明', run: function () { ... }, throws: true }        // 期望抛异常
   *
   * @param {Array} groups [{ name: '分组名', cases: [...] }]
   * @returns {{total:number, pass:number, fail:number, groups:Array, failed:Array}}
   */
  function run(groups) {
    var out = { total: 0, pass: 0, fail: 0, groups: [], failed: [] };

    (groups || []).forEach(function (group) {
      var record = { name: group.name, cases: [] };

      (group.cases || []).forEach(function (testCase) {
        out.total++;
        var result = { name: testCase.name, pass: false, detail: '' };

        try {
          if (testCase.throws) {
            var threw = false;
            try {
              testCase.run();
            } catch (e) {
              threw = true;
            }
            result.pass = threw;
            if (!threw) result.detail = '期望抛出异常，但正常返回了';
          } else {
            var actual = testCase.run();
            var ok = stable(actual) === stable(testCase.expect);
            result.pass = ok;
            if (!ok) {
              result.detail = '实际 ' + stable(actual) + '\n           期望 ' + stable(testCase.expect);
            }
          }
        } catch (e) {
          result.pass = false;
          result.detail = '执行用例时出错：' + (e && e.message ? e.message : e);
        }

        if (result.pass) out.pass++;
        else { out.fail++; out.failed.push(group.name + ' › ' + testCase.name); }
        record.cases.push(result);
      });

      out.groups.push(record);
    });

    return out;
  }

  root.LF_RUNNER = { run: run, stable: stable };
})(typeof globalThis !== 'undefined' ? globalThis : this);
