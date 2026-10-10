/**
 * md-to-html.mjs —— 把 Markdown 转成一个可以直接双击打开的 HTML
 *
 * 为什么需要它：Windows 默认没有 Markdown 阅读器，双击 .md 只会用记事本打开raw 文本。
 * 这里做一个"够用就好"的转换器（标题 / 表格 / 代码块 / 引用 / 列表 / 行内格式），
 * 不引入任何第三方依赖，和项目本身"零依赖"的原则保持一致。
 *
 * 用法：node scripts/md-to-html.mjs <输入.md> <输出.html> [标题]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, titleArg] = process.argv;
if (!inPath || !outPath) {
  console.error('用法：node scripts/md-to-html.mjs <输入.md> <输出.html> [标题]');
  process.exit(1);
}

const md = readFileSync(inPath, 'utf8');
const title = titleArg || '文档';

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** 行内格式：先转义，再依次处理 code / 粗体 / 链接 */
function inline(text) {
  let s = escapeHtml(text);
  const codes = [];
  // 先把行内代码抠出来，避免其中的 * _ [ ] 被当成格式符号
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return '\u0000CODE' + (codes.length - 1) + '\u0000';
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => '<code>' + codes[Number(i)] + '</code>');
  return s;
}

const lines = md.split(/\r?\n/);
const out = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  // 围栏代码块
  if (/^```/.test(line)) {
    const lang = line.slice(3).trim();
    const buf = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
    i++; // 跳过结束的 ```
    out.push('<pre class="code"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '') +
             '><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
    continue;
  }

  // 表格：当前行是 |...| 且下一行是分隔行
  if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
    const head = splitRow(line);
    i += 2;
    const body = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { body.push(splitRow(lines[i])); i++; }
    out.push('<table><thead><tr>' +
      head.map((c) => '<th>' + inline(c) + '</th>').join('') +
      '</tr></thead><tbody>' +
      body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>');
    continue;
  }

  // 标题
  const h = /^(#{1,6})\s+(.*)$/.exec(line);
  if (h) {
    const level = h[1].length;
    const id = 'h-' + h[2].replace(/[^\w\u4e00-\u9fa5]+/g, '-').slice(0, 40);
    out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
    i++;
    continue;
  }

  // 分割线
  if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

  // 引用（含多行合并）
  if (/^\s*>/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      buf.push(lines[i].replace(/^\s*>\s?/, ''));
      i++;
    }
    out.push('<blockquote>' + renderBlocks(buf) + '</blockquote>');
    continue;
  }

  // 列表（连续的 - / * / 数字. 合并成一个列表块）
  if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
    const ordered = /^\s*\d+\.\s+/.test(line);
    const items = [];
    while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
      items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      i++;
    }
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>` + items.map((t) => '<li>' + inline(t) + '</li>').join('') + `</${tag}>`);
    continue;
  }

  // 空行
  if (/^\s*$/.test(line)) { i++; continue; }

  // 普通段落（连续行合并）
  const buf = [];
  while (i < lines.length && !/^\s*$/.test(lines[i]) &&
         !/^(#{1,6}\s|```|\s*\||\s*>|\s*([-*]|\d+\.)\s)/.test(lines[i]) &&
         !/^\s*(---|\*\*\*)\s*$/.test(lines[i])) {
    buf.push(lines[i]);
    i++;
  }
  out.push('<p>' + buf.map(inline).join('<br>') + '</p>');
}

/** 引用块内部允许再出现列表 / 段落 */
function renderBlocks(buf) {
  const html = [];
  let j = 0;
  while (j < buf.length) {
    if (/^\s*([-*]|\d+\.)\s+/.test(buf[j])) {
      const items = [];
      while (j < buf.length && /^\s*([-*]|\d+\.)\s+/.test(buf[j])) {
        items.push(buf[j].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        j++;
      }
      html.push('<ul>' + items.map((t) => '<li>' + inline(t) + '</li>').join('') + '</ul>');
    } else if (/^\s*$/.test(buf[j])) {
      j++;
    } else {
      const para = [];
      while (j < buf.length && !/^\s*$/.test(buf[j]) && !/^\s*([-*]|\d+\.)\s+/.test(buf[j])) {
        para.push(buf[j]);
        j++;
      }
      html.push('<p>' + para.map(inline).join('<br>') + '</p>');
    }
  }
  return html.join('');
}

function splitRow(row) {
  return row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { --brand:#0FA96B; --text:#1F2937; --muted:#6B7688; --line:#E6EBF1; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 20px 80px;
    background: #F4F6F9; color: var(--text);
    font: 15px/1.75 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  }
  main {
    max-width: 900px; margin: 0 auto; background: #fff;
    padding: 48px 52px 64px; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(24,39,75,.07);
  }
  h1 { font-size: 27px; line-height: 1.4; margin: 0 0 22px; padding-bottom: 16px; border-bottom: 2px solid var(--line); }
  h2 { font-size: 21px; margin: 42px 0 14px; padding-left: 12px; border-left: 4px solid var(--brand); }
  h3 { font-size: 17px; margin: 28px 0 10px; color: #2C3A4E; }
  h4, h5, h6 { font-size: 15px; margin: 20px 0 8px; color: var(--muted); }
  p { margin: 12px 0; }
  a { color: var(--brand); text-decoration: none; border-bottom: 1px solid #B7E7D0; }
  a:hover { border-bottom-color: var(--brand); }
  strong { color: #101B2B; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 5px 0; }
  hr { border: 0; border-top: 1px dashed var(--line); margin: 34px 0; }
  code {
    background: #F1F4F8; color: #B5325A; padding: 2px 6px; border-radius: 5px;
    font: 13px/1.5 "Cascadia Mono", Consolas, "Courier New", monospace;
  }
  pre.code {
    background: #1E2530; color: #E6EDF3; padding: 18px 20px; border-radius: 10px;
    overflow-x: auto; margin: 16px 0;
  }
  pre.code code { background: none; color: inherit; padding: 0; font-size: 13px; line-height: 1.65; }
  blockquote {
    margin: 16px 0; padding: 12px 18px; background: #F7FBF9;
    border-left: 4px solid var(--brand); border-radius: 0 8px 8px 0; color: #3D4B5C;
  }
  blockquote p { margin: 6px 0; }
  table { border-collapse: collapse; width: 100%; margin: 18px 0; font-size: 14px; }
  th, td { border: 1px solid var(--line); padding: 9px 12px; text-align: left; vertical-align: top; }
  th { background: #F4F8F6; font-weight: 700; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #FAFCFD; }
  @media (max-width: 720px) {
    body { padding: 16px 10px 40px; }
    main { padding: 24px 18px 40px; border-radius: 10px; }
    h1 { font-size: 22px; }
    table { font-size: 12.5px; }
    th, td { padding: 7px 8px; }
  }
</style>
</head>
<body>
<main>
${out.join('\n')}
</main>
</body>
</html>
`;

writeFileSync(outPath, html, 'utf8');
console.log('已生成：' + outPath + '  （' + html.length + ' 字节）');
