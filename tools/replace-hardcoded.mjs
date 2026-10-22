#!/usr/bin/env node
// 存量硬编码收编
// 用法: node tools/replace-hardcoded.mjs <文件或目录> [--dry]
// 只替换数值与 token 完全相等的白色透明，保证视觉零变化。
// 0.04 与 0.08 故意不替换：前者在 surface-hover 与 glass-3 之间同值，后者在 border-2 与 glass-8 之间同值，用途判断交给人工。
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAP = [
  ['0.02', 'var(--vz-surface)'],
  ['0.03', 'var(--vz-glass-2)'],
  ['0.05', 'var(--vz-glass-4)'],
  ['0.06', 'var(--vz-border-1)'],
  ['0.10', 'var(--vz-border)'],
  ['0.15', 'var(--vz-border-3)'],
  ['0.32', 'var(--vz-text-disabled)'],
  ['0.48', 'var(--vz-text-tertiary)'],
  ['0.62', 'var(--vz-text-secondary)'],
];

const SKIP_DIR = new Set(['node_modules', '.git', 'dist', '.wrangler', '.tmp_data']);

function buildPattern(alpha) {
  const num = alpha.replace('0.', '0?\\.');
  return new RegExp(`rgba\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*,\\s*${num}\\s*\\)`, 'g');
}

function collect(target, out) {
  const info = statSync(target);
  if (info.isFile()) {
    if (path.extname(target) === '.css') out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) {
    if (SKIP_DIR.has(name)) continue;
    collect(path.join(target, name), out);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('用法: node tools/replace-hardcoded.mjs <文件或目录> [--dry]');
    process.exit(2);
  }

  const files = collect(path.resolve(target), []);
  let totalHits = 0;
  const changed = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    let hits = 0;

    // 逐行处理，token 定义行必须原样跳过，否则会写出 --vz-x: var(--vz-x) 这种自引用
    const next = text
      .split('\n')
      .map((line) => {
        if (/^\s*--vz-[a-z0-9-]+\s*:/.test(line)) return line;
        let out = line;
        for (const [alpha, token] of MAP) {
          const pattern = buildPattern(alpha);
          const found = out.match(pattern);
          if (!found) continue;
          hits += found.length;
          out = out.replace(pattern, token);
        }
        return out;
      })
      .join('\n');

    if (hits > 0) {
      totalHits += hits;
      changed.push(`${path.relative(process.cwd(), file)}  替换 ${hits} 处`);
      if (!dry) writeFileSync(file, next);
    }
  }

  console.log(`${dry ? '[预览] 将替换' : '已替换'} ${totalHits} 处，涉及 ${changed.length} 个文件`);
  for (const row of changed) console.log(`  ${row}`);
}

main();
