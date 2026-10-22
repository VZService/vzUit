#!/usr/bin/env node
// 白色透明档位归并
// 用法: node tools/normalize-alpha.mjs <文件或目录> [--dry]
//
// 与 replace-hardcoded.mjs 的分工：
//   replace-hardcoded 只处理「与 token 完全同值」的档位，视觉一定零变化；
//   本脚本处理剩下的夹值档位，按语义就近归并，视觉有极轻微差异（≤0.08 alpha）。
//
// 归并口径（specs/01-token.md「白色透明归并表」）：
//   面  0.02 → surface    0.03 → glass-2   0.04 → glass-3    0.05 → glass-4
//       0.08 → glass-8    0.12 → surface-raised
//   悬停 0.04 → surface-hover   0.08 → surface-raised
//   线  0.04 → border-0   0.05 → border-0  0.06 → border-1   0.08 → border-2
//       0.10 → border     0.15 → border-3   悬停下的 0.08 → border-hover
//   字  0.20 / 0.25 / 0.32 → text-disabled
//       0.40 / 0.45 / 0.48 / 0.50 → text-tertiary
//       0.60 / 0.62 / 0.70 / 0.75 → text-secondary
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIR = new Set(['node_modules', '.git', 'dist', '.wrangler', '.tmp_data', 'audio-player']);
const HOVER = /(:hover|\.active|\.open|\.show|:focus|\.selected)/;

const HEX = [
  ['#080b14', 'var(--vz-bg)'],
  ['#0d0f1a', 'var(--vz-deep)'],
  ['#11142a', 'var(--vz-bg-modal)'],
  ['#141828', 'var(--vz-bg-surface)'],
  ['#1a1f33', 'var(--vz-bg-elevated)'],
  ['#eef2f8', 'var(--vz-text)'],
  ['#f3e8ff', 'var(--vz-brand-1)'],
  ['#e9d5ff', 'var(--vz-brand-2)'],
  ['#d8b4fe', 'var(--vz-brand-3)'],
  ['#c4b5fd', 'var(--vz-brand-4)'],
  ['#a78bfa', 'var(--vz-brand-5)'],
  ['#7c3aed', 'var(--vz-primary)'],
  ['#6d28d9', 'var(--vz-primary-2)'],
  ['#5b21b6', 'var(--vz-brand-8)'],
  ['#4f46e5', 'var(--vz-brand-9)'],
  ['#2e1065', 'var(--vz-brand-10)'],
  ['#10b981', 'var(--vz-success)'],
  ['#059669', 'var(--vz-success-2)'],
  ['#38bdf8', 'var(--vz-info)'],
  ['#fb923c', 'var(--vz-warning)'],
  ['#f43f5e', 'var(--vz-danger)'],
  ['#e11d48', 'var(--vz-danger-2)'],
  ['#34d399', 'var(--vz-tag-green)'],
  ['#f472b6', 'var(--vz-tag-pink)'],
  ['#fff', 'var(--vz-white)'],
  ['#ffffff', 'var(--vz-white)'],
];

// 语义先按属性分流：文字走四级文字档，线走边框档，其余（背景、渐变、阴影）走表面档
function pick(alpha, prop, hover) {
  const a = Number.parseFloat(alpha.replace(/^0?\./, '0.'));
  if (/^(color|fill|stroke|caret-color)$/.test(prop)) {
    if (a <= 0.321) return 'var(--vz-text-disabled)';
    if (a <= 0.501) return 'var(--vz-text-tertiary)';
    return 'var(--vz-text-secondary)';
  }
  if (/^(border|outline)/.test(prop)) {
    if (a <= 0.041) return 'var(--vz-border-0)';
    if (a <= 0.061) return 'var(--vz-border-1)';
    if (a <= 0.081) return hover ? 'var(--vz-border-hover)' : 'var(--vz-border-2)';
    if (a <= 0.101) return 'var(--vz-border)';
    return 'var(--vz-border-3)';
  }
  if (a <= 0.021) return 'var(--vz-surface)';
  if (a <= 0.031) return 'var(--vz-glass-2)';
  if (a <= 0.041) return hover ? 'var(--vz-surface-hover)' : 'var(--vz-glass-3)';
  if (a <= 0.061) return 'var(--vz-glass-4)';
  if (a <= 0.081) return hover ? 'var(--vz-surface-raised)' : 'var(--vz-glass-8)';
  if (a <= 0.121) return 'var(--vz-glass-12)';
  return 'var(--vz-glass-15)';
}

function walk(dir, out) {
  const info = statSync(dir);
  if (info.isFile()) {
    if (['.css', '.html'].includes(path.extname(dir))) out.push(dir);
    return out;
  }
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    walk(path.join(dir, name), out);
  }
  return out;
}

// html 只处理 <style> 块内的行，避免动到脚本里的字符串
function inStyle(line, state) {
  if (state.ext !== '.html') return true;
  if (/<style[^>]*>/i.test(line)) state.inside = true;
  const was = state.inside;
  if (/<\/style>/i.test(line)) state.inside = false;
  return was;
}

// 一行里可能有多条声明，逐条取属性名判断语义
function normalizeLine(line, selector) {
  let changed = false;
  const hover = HOVER.test(selector);

  const next = line.replace(/(^|[;{])(\s*)([a-z-]+)(\s*:\s*)([^;{}]+)/g, (whole, lead, sp, prop, colon, value) => {
    let v = value;
    v = v.replace(/(rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*)(0?\.\d+)\s*\)/g, (m, head, alpha) => {
      changed = true;
      return pick(alpha, prop, hover);
    });
    for (const [hex, token] of HEX) {
      const re = new RegExp(`${hex.replace('#', '#')}(?![0-9a-fA-F])`, 'gi');
      if (re.test(v)) {
        v = v.replace(re, token);
        changed = true;
      }
    }
    return v === value ? whole : `${lead}${sp}${prop}${colon}${v}`;
  });

  return { text: next, changed };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('用法: node tools/normalize-alpha.mjs <文件或目录> [--dry]');
    process.exit(2);
  }

  const files = walk(path.resolve(target), []);
  let total = 0;
  const rows = [];

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const lines = readFileSync(file, 'utf8').split('\n');
    const state = { ext: path.extname(file), inside: false };
    let selector = '';
    let touched = 0;

    const out = lines.map((line) => {
      if (!inStyle(line, state)) return line;
      const head = line.split('{')[0];
      if (line.includes('{') && head.trim() && !head.trim().startsWith('/*')) selector = head;
      // 变量定义行原样跳过，否则会写出自引用
      if (/^\s*--vz-[a-z0-9-]+\s*:/.test(line)) return line;
      const r = normalizeLine(line, selector);
      if (r.changed) {
        touched += 1;
        rows.push(`${rel}: ${line.trim().slice(0, 70)}  ->  ${r.text.trim().slice(0, 70)}`);
      }
      return r.text;
    });

    if (touched && !dry) writeFileSync(file, out.join('\n'));
    total += touched;
  }

  for (const row of rows.slice(0, 40)) console.log(row);
  if (rows.length > 40) console.log(`… 另有 ${rows.length - 40} 行`);
  console.log(`\n${dry ? '待改' : '已改'} ${total} 行，文件 ${files.length} 个`);
}

main();
