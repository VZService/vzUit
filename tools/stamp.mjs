#!/usr/bin/env node
// 内容哈希版本戳注入
// 用法: node tools/stamp.mjs <站点根目录> [--dry]
// 占位符写法: <script src="/vzuit.js?v={{HASH:public/vzuit.js}}"></script>
//              const VZUIT_JS_VERSION = '{{HASH:public/vzuit.js}}';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const TEXT_EXT = new Set(['.html', '.htm', '.ts', '.js', '.mjs', '.cjs', '.json']);
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', '.wrangler', '.tmp_data']);
const HASH_LEN = 8;
const PLACEHOLDER = /\{\{HASH:([^}]+)\}\}/g;

function parseArgs(argv) {
  const root = argv.find((a) => !a.startsWith('--'));
  if (!root) {
    console.error('用法: node tools/stamp.mjs <站点根目录> [--dry]');
    process.exit(2);
  }
  return { root: path.resolve(root), dry: argv.includes('--dry') };
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (SKIP_DIR.has(name)) continue;
      walk(full, out);
      continue;
    }
    if (TEXT_EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function hashOf(absPath) {
  const buf = readFileSync(absPath);
  return createHash('sha256').update(buf).digest('hex').slice(0, HASH_LEN);
}

function main() {
  const { root, dry } = parseArgs(process.argv.slice(2));
  if (!existsSync(root)) {
    console.error(`目录不存在: ${root}`);
    process.exit(2);
  }

  const files = walk(root, []);
  const cache = new Map();
  const changed = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('{{HASH:')) continue;

    const next = text.replace(PLACEHOLDER, (_match, rel) => {
      const abs = path.resolve(root, rel.trim());
      if (!existsSync(abs)) {
        console.error(`占位符引用的文件不存在: ${rel.trim()} (出现在 ${path.relative(root, file)})`);
        process.exit(1);
      }
      if (!cache.has(abs)) cache.set(abs, hashOf(abs));
      return cache.get(abs);
    });

    if (next !== text) {
      changed.push(path.relative(root, file));
      if (!dry) writeFileSync(file, next);
    }
  }

  if (changed.length === 0) {
    console.log('没有找到待替换的占位符');
    return;
  }
  console.log(`${dry ? '[预览] 将替换' : '已替换'} ${changed.length} 个文件`);
  for (const f of changed) console.log(`  ${f}`);
}

main();
