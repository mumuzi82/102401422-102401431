#!/usr/bin/env node
/**
 * run-node.mjs —— 命令行运行单元测试
 *
 * 加载方式是这个项目的一个关键手法：
 *   源码写成**浏览器能直接 <script> 跑的普通脚本**（挂到全局命名空间 LF 上），
 *   这里用 vm.runInThisContext 把**同一批文件**再加载一遍。
 *   于是不需要构建、不需要 import/export、也不需要写"浏览器一套 / Node 一套"的
 *   双份代码（那种写法最大的风险就是两边慢慢长歪）。
 *
 * 用法：
 *   node tests/run-node.mjs
 *   npm test
 *
 * 退出码：全部通过 0，有失败 1（方便接 CI）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** 顺序不能乱：domain 之间互相引用，storage 依赖 domain，用例最后加载 */
const FILES = [
  'src/domain/schema.js',
  'src/domain/text.js',
  'src/domain/lifecycle.js',
  'src/domain/query.js',
  'src/domain/validate.js',
  'src/storage/adapter.js',
  'src/storage/seed.js',
  'tests/runner.js',
  'tests/cases.js'
];

for (const relative of FILES) {
  const code = readFileSync(join(root, relative), 'utf8');
  vm.runInThisContext(code, { filename: relative });
}

if (!globalThis.LF_RUNNER || !globalThis.LF_TESTS) {
  console.error('加载失败：没有拿到 LF_RUNNER 或 LF_TESTS，检查上面的文件清单。');
  process.exit(2);
}

const C = process.stdout.isTTY
  ? { g: '\u001b[32m', r: '\u001b[31m', d: '\u001b[2m', b: '\u001b[1m', o: '\u001b[0m' }
  : { g: '', r: '', d: '', b: '', o: '' };

const started = Date.now();
const result = globalThis.LF_RUNNER.run(globalThis.LF_TESTS.groups);
const cost = Date.now() - started;

console.log('');
console.log(`${C.b}校园失物招领 · 单元测试${C.o}  ${C.d}(表驱动，与 tests/run-browser.html 共用同一份用例)${C.o}`);
console.log('─'.repeat(66));

for (const group of result.groups) {
  console.log(`\n${C.b}${group.name}${C.o}`);
  for (const testCase of group.cases) {
    if (testCase.pass) {
      console.log(`  ${C.g}✔${C.o} ${testCase.name}`);
    } else {
      console.log(`  ${C.r}✖${C.o} ${testCase.name}`);
      if (testCase.detail) console.log(`      ${C.d}${testCase.detail}${C.o}`);
    }
  }
}

console.log('\n' + '─'.repeat(66));
const summary = `用例 ${result.total}   通过 ${result.pass}   失败 ${result.fail}   用时 ${cost}ms`;
console.log(result.fail === 0 ? `${C.g}${summary}${C.o}` : `${C.r}${summary}${C.o}`);

if (result.fail > 0) {
  console.log(`\n${C.r}失败的用例：${C.o}`);
  result.failed.forEach((name) => console.log('  · ' + name));
}

console.log('');
process.exit(result.fail === 0 ? 0 : 1);
