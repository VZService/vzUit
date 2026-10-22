#!/usr/bin/env node
// token 一致性检查
// 用法: node tools/check-tokens.mjs [目录]
// 检查三件事: 用到的变量是否都有定义、是否还有字面量层级、是否还有硬编码白色透明
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SCAN_EXT = new Set(['.css', '.html']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', '.wrangler', 'icons', '.tmp_data']);

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

function main() {
  const root = path.resolve(process.argv[2] || 'src');
  const files = walk(root, []);
  const tokensFile = files.find((f) => f.endsWith('tokens.css'));
  if (!tokensFile) {
    console.error(`没有找到 tokens.css，扫描目录: ${root}`);
    process.exit(2);
  }

  const defined = new Set();
  for (const match of readFileSync(tokensFile, 'utf8').matchAll(/--vz-[a-z0-9-]+\s*:/g)) {
    defined.add(match[0].replace(/\s*:$/, '').trim());
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

    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (/z-index:\s*\d/.test(line)) literalZ.push(`${rel}:${i + 1}  ${line.trim()}`);
      const isTokenDef = /--vz-[a-z0-9-]+\s*:/.test(line);
      if (!isTokenDef && /rgba\(255,\s*255,\s*255,\s*0?\.\d+\)/.test(line)) {
        hardWhite.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
      }
    });
  }

  const missing = [...used.keys()].filter((name) => !defined.has(name));
  const unused = [...defined].filter((name) => !used.has(name));

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

  if (missing.length) process.exit(1);
}

main();
