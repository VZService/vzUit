#!/usr/bin/env node
// token 一致性检查
// 用法: node tools/check-tokens.mjs [目录] [--base src/tokens.css]
//
// 查四件事:
//   1. 用到的变量是否都有定义（定义来源：扫描范围内任意 css/html 里的 --vz-* 声明，
//      不再限定必须叫 tokens.css —— 内联 :root 的存量站也能查）
//   2. 字面量 z-index
//   3. 硬编码白色透明
//   4. 给了 --base 时，与基座 tokens.css 的漂移：缺哪些、多哪些、哪些取值不同
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SCAN_EXT = new Set(['.css', '.html']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', '.wrangler', 'icons', '.tmp_data', 'audio-player']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (SKIP_DIR.has(name)) continue;
      walk(full, out);
      continue;
    }
    if (SCAN_EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function definitions(text) {
  const map = new Map();
  for (const m of text.matchAll(/(--vz-[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

function main() {
  const argv = process.argv.slice(2);
  const baseIdx = argv.indexOf('--base');
  const base = baseIdx >= 0 ? path.resolve(argv[baseIdx + 1]) : null;
  const target = argv.find((a, i) => !a.startsWith('--') && i !== baseIdx + 1);
  const root = path.resolve(target || 'src');
  const files = walk(root, []);

  const defined = new Map();
  for (const file of files) {
    for (const [name, value] of definitions(readFileSync(file, 'utf8'))) {
      if (!defined.has(name)) defined.set(name, value);
    }
  }

  const used = new Map();
  const literalZ = [];
  const hardWhite = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = path.relative(process.cwd(), file);

    for (const match of text.matchAll(/var\((--vz-[a-z0-9-]+)/g)) {
      const name = match[1];
      if (!used.has(name)) used.set(name, new Set());
      used.get(name).add(rel);
    }

    text.split('\n').forEach((line, i) => {
      if (/z-index:\s*\d/.test(line) && !/left:\s*-9999/.test(line)) {
        literalZ.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
      }
      const isTokenDef = /--vz-[a-z0-9-]+\s*:/.test(line);
      if (!isTokenDef && /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.\d+\s*\)/.test(line)) {
        hardWhite.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
      }
    });
  }

  const missing = [...used.keys()].filter((name) => !defined.has(name));
  const unused = [...defined.keys()].filter((name) => !used.has(name));

  console.log(`已定义变量 ${defined.size} 个，被引用 ${used.size} 个`);
  console.log(`扫描文件 ${files.length} 个`);

  if (missing.length) {
    console.log(`\n未定义的变量 ${missing.length} 个:`);
    for (const name of missing) console.log(`  ${name}  <- ${[...used.get(name)].join(', ')}`);
  } else {
    console.log('\n未定义的变量: 无');
  }

  if (unused.length) console.log(`\n定义了但没被引用的变量 ${unused.length} 个: ${unused.join(', ')}`);

  console.log(`\n字面量 z-index ${literalZ.length} 处`);
  for (const row of literalZ.slice(0, 20)) console.log(`  ${row}`);

  console.log(`\n硬编码白色透明 ${hardWhite.length} 处`);
  for (const row of hardWhite.slice(0, 15)) console.log(`  ${row}`);

  let drift = 0;
  if (base) {
    const canonical = definitions(readFileSync(base, 'utf8'));
    const miss = [...canonical.keys()].filter((k) => !defined.has(k));
    const extra = [...defined.keys()].filter((k) => !canonical.has(k));
    const diff = [...canonical.keys()].filter((k) => defined.has(k) && defined.get(k) !== canonical.get(k));
    drift = miss.length + diff.length;
    console.log(`\n与基座 ${path.relative(process.cwd(), base)} 比对：基座 ${canonical.size} 项`);
    if (miss.length) console.log(`  缺 ${miss.length} 项: ${miss.join(', ')}`);
    if (extra.length) console.log(`  多 ${extra.length} 项: ${extra.join(', ')}`);
    if (diff.length) {
      console.log(`  取值不同 ${diff.length} 项:`);
      for (const k of diff) console.log(`    ${k}: 站内 ${defined.get(k)} / 基座 ${canonical.get(k)}`);
    }
    if (!miss.length && !diff.length) console.log('  漂移: 无');
  }

  if (missing.length || hardWhite.length || literalZ.length || drift) process.exit(1);
}

main();
