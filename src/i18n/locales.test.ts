import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 两类 i18n 事故 CI 都看不见,因为 t() 的返回值类型上就是 string:
//   1. 只给一个语言包加了 key —— 另一个语言回退成英文/中文原文;
//   2. 两个语言包都没加 —— 界面直接显示 'nav.automation' 这样的原始 key;
//   3. 文案里带 <strong> 之类的标签,却用 t() 渲染 —— 标签被原样显示。
// 下面三个测试分别挡住它们。

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LOCALES_DIR = join(HERE, 'locales');
const SRC_DIR = join(HERE, '..');

type Json = { [key: string]: string | Json };

function loadLocale(name: string): Json {
  return JSON.parse(readFileSync(join(LOCALES_DIR, name), 'utf-8'));
}

/** 把嵌套对象摊平成 'a.b.c' 形式的叶子键。 */
function leafKeys(value: Json, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [path] : leafKeys(child, path);
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(path);
    }
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) {
      return [];
    }
    return [path];
  });
}

/**
 * 静态可解析的 key:t('a.b') 与 <Trans i18nKey="a.b">。
 * t(`a.b_${x}`) 这类模板字面量无法静态判定,由 locale 平价测试兜底
 * ——只要两个语言包的键集一致,动态族就不会只在一边存在。
 */
function staticKeysIn(source: string): string[] {
  const keys: string[] = [];
  const patterns = [
    /\bt\(\s*'([^'`$]+)'/g,
    /\bt\(\s*"([^"`$]+)"/g,
    /i18nKey=\{?\s*["']([^"'`$]+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) keys.push(match[1]);
    }
  }
  return keys;
}

/** 取出 'a.b.c' 对应的叶子值。 */
function valueAt(locale: Json, path: string): string | undefined {
  const found = path
    .split('.')
    .reduce<string | Json | undefined>(
      (node, part) =>
        node && typeof node === 'object' ? node[part] : undefined,
      locale,
    );
  return typeof found === 'string' ? found : undefined;
}

const en = loadLocale('en.json');
const zh = loadLocale('zh-CN.json');

describe('i18n locales', () => {
  it('en 与 zh-CN 的键集完全一致', () => {
    const enKeys = new Set(leafKeys(en));
    const zhKeys = new Set(leafKeys(zh));

    const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key)).sort();
    const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key)).sort();

    expect({ missingInZh, missingInEn }).toEqual({
      missingInZh: [],
      missingInEn: [],
    });
  });

  it('源码里静态引用的 key 在两个语言包里都存在', () => {
    const enKeys = new Set(leafKeys(en));
    const zhKeys = new Set(leafKeys(zh));

    const referenced = new Set(
      sourceFiles(SRC_DIR).flatMap((file) =>
        staticKeysIn(readFileSync(file, 'utf-8')),
      ),
    );

    // 只校验看起来像 i18n key 的引用(带点号的命名空间路径),
    // 避免把恰好叫 t() 的其他调用误判成翻译。
    const namespaced = [...referenced].filter((key) => key.includes('.'));
    const missing = namespaced
      .filter((key) => !enKeys.has(key) || !zhKeys.has(key))
      .sort();

    expect(missing).toEqual([]);
  });

  it('带标签的文案不能走 t(),必须用 <Trans> 渲染', () => {
    // t() 返回的是字符串,React 会把 '<strong>原生代码</strong>' 原样显示出来。
    // 这类文案只能交给 <Trans components={{ strong: <strong /> }} />。
    const markup = leafKeys(en).filter((key) =>
      /<[a-z][a-z0-9]*>/i.test(valueAt(en, key) ?? ''),
    );

    const sources = sourceFiles(SRC_DIR).map((file) =>
      readFileSync(file, 'utf-8'),
    );
    const renderedAsPlainText = markup
      .filter((key) =>
        sources.some(
          (source) =>
            source.includes(`t('${key}')`) || source.includes(`t("${key}")`),
        ),
      )
      .sort();

    expect(renderedAsPlainText).toEqual([]);
  });
});
