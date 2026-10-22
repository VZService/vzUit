#!/usr/bin/env node
// 图标集合成 sprite
// 用法: node tools/build-icons.mjs <图标源目录> [输出文件] [--split]
// 源目录结构: 1-game/dice.svg、8-ui/search.svg 这类分类目录加 svg 文件
// 输出的 symbol id: game-dice、ui-search，跨分类同名不冲突
// --split 时输出两份: icons-ui.svg (功能图标) 与 icons-content.svg (题材图标)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const FALLBACK_VIEWBOX = '0 0 24 24';
const UI_CATEGORIES = new Set(['ui', 'media', 'editing', 'symbols']);

function toSymbol(svgText, id) {
  const match = svgText.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!match) return null;

  const attrText = match[1];
  const inner = match[2];
  const viewBox = (attrText.match(/viewBox="([^"]+)"/i) || [])[1] || FALLBACK_VIEWBOX;

  const cleaned = inner
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<desc>[\s\S]*?<\/desc>/gi, '')
    .replace(/\sfill="(?!none|currentColor)[^"]*"/gi, '')
    .replace(/\sstroke="(?!none|currentColor)[^"]*"/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return `<symbol id="${id}" viewBox="${viewBox}">${cleaned}</symbol>`;
}

function categoryOf(dirName) {
  return dirName.replace(/^\d+-/, '').toLowerCase();
}

function wrapSymbols(symbols) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">',
    ...symbols,
    '</svg>',
    '',
  ].join('\n');
}

function write(file, symbols, label) {
  const out = wrapSymbols(symbols);
  writeFileSync(file, out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
  console.log(`${label}: ${symbols.length} 个图标 -> ${file} (${kb} KB)`);
}

function main() {
  const args = process.argv.slice(2);
  const split = args.includes('--split');
  const positional = args.filter((a) => !a.startsWith('--'));
  const srcDir = positional[0];
  if (!srcDir) {
    console.error('用法: node tools/build-icons.mjs <图标源目录> [输出文件] [--split]');
    process.exit(2);
  }

  const root = path.resolve(srcDir);
  const outFile = positional[1] ? path.resolve(positional[1]) : path.resolve(process.cwd(), 'icons.svg');
  const seen = new Set();
  const uiSymbols = [];
  const contentSymbols = [];

  for (const entry of readdirSync(root).sort()) {
    const catDir = path.join(root, entry);
    if (!statSync(catDir).isDirectory()) continue;
    const category = categoryOf(entry);
    const bucket = UI_CATEGORIES.has(category) ? uiSymbols : contentSymbols;

    for (const file of readdirSync(catDir).sort()) {
      if (!file.toLowerCase().endsWith('.svg')) continue;
      const name = file.replace(/\.svg$/i, '');
      const id = `${category}-${name}`;
      const rel = path.relative(root, path.join(catDir, file));

      if (seen.has(id)) {
        console.warn(`id 重复，跳过: ${id} (${rel})`);
        continue;
      }

      const symbol = toSymbol(readFileSync(path.join(catDir, file), 'utf8'), id);
      if (!symbol) {
        console.warn(`解析失败，跳过: ${rel}`);
        continue;
      }
      seen.add(id);
      bucket.push(symbol);
    }
  }

  const total = uiSymbols.length + contentSymbols.length;
  if (total === 0) {
    console.error('没有生成任何图标，检查源目录结构是否为分类目录加 svg 文件');
    process.exit(1);
  }

  if (!split) {
    write(outFile, [...uiSymbols, ...contentSymbols], '全部');
    return;
  }

  const dir = path.dirname(outFile);
  write(path.join(dir, 'icons-ui.svg'), uiSymbols, 'UI 层');
  write(path.join(dir, 'icons-content.svg'), contentSymbols, '内容层');
}

main();
